'use strict';

import moleculer, { Context } from 'moleculer';
import { Action, Method, Service } from 'moleculer-decorators';
import DbConnection from '../mixins/database.mixin';
import { Session } from './sessions.service';
import { Question, QuestionType } from './questions.service';

import {
  CommonFields,
  CommonPopulates,
  COMMON_DEFAULT_SCOPES,
  COMMON_FIELDS,
  COMMON_SCOPES,
  Table,
} from '../types';
import { Page } from './pages.service';
import { QuestionOption } from './questionOptions.service';
import { MetaSession, RestrictionType } from './api.service';

interface Fields extends CommonFields {
  session: Session['id'];
  page: Page['id'];
  previousResponse: Response['id'];
  questions: Array<Question['id']>;
  values: Record<Question['id'], any>;
}

interface Populates extends CommonPopulates {
  session: Session;
  page: Page;
  previousResponse: Response;
  questions: Array<Question<'options'>>;
}

export type Response<
  P extends keyof Populates = never,
  F extends keyof (Fields & Populates) = keyof Fields,
> = Table<Fields, Populates, P, F>;

@Service({
  name: 'responses',
  mixins: [
    DbConnection({
      collection: 'responses',
      rest: false,
    }),
  ],
  settings: {
    fields: {
      id: {
        type: 'number',
        columnType: 'integer',
        primaryKey: true,
        secure: true,
      },

      session: {
        type: 'number',
        columnType: 'integer',
        columnName: 'sessionId',
        required: true,
        populate: {
          action: 'sessions.resolve',
        },
      },

      page: {
        type: 'number',
        columnType: 'integer',
        columnName: 'pageId',
        required: true,
        populate: {
          action: 'pages.resolve',
        },
      },

      previousResponse: {
        type: 'number',
        columnType: 'integer',
        columnName: 'previousResponseId',
        populate: {
          action: 'responses.resolve',
        },
      },

      questions: {
        type: 'array',
        items: 'number',
        populate: {
          action: 'questions.resolve',
          params: {
            populate: 'options',
          },
        },
      },

      values: {
        type: 'object',
        default: () => ({}),
      },

      ...COMMON_FIELDS,
    },

    scopes: {
      ...COMMON_SCOPES,

      async session(q: any, ctx: Context<unknown, MetaSession>) {
        if (!ctx?.meta?.session) return q;

        return {
          ...q,
          session: ctx.meta.session.id,
        };
      },
    },

    defaultScopes: [...COMMON_DEFAULT_SCOPES, 'session'],
  },
  actions: {
    get: {
      rest: 'GET /:id',
      auth: RestrictionType.SESSION,
    },
  },
})
export default class ResponsesService extends moleculer.Service {
  @Action({
    rest: 'POST /:id/respond',
    auth: RestrictionType.SESSION,
    params: {
      id: 'number|convert',
      values: {
        type: 'record',
        key: 'number|convert',
        value: 'any',
      },
    },
  })
  async respond(ctx: Context<{ id: Response['id']; values: Response['values'] }>) {
    const response: Response<'questions' | 'session'> = await this.resolveEntities(
      ctx,
      {
        id: ctx.params.id,
        populate: 'questions,session',
      },
      {
        throwIfNotExist: true,
      },
    );

    const { values } = ctx.params;
    const errors: Record<string | number, string> = {};
    let nextQuestionsIds: Array<Question['id']> = [];

    for (const question of response.questions) {
      // reset next questions array, so only last question decides next page question(s)
      nextQuestionsIds = [];

      if (question.nextQuestion) {
        nextQuestionsIds.push(question.nextQuestion);
      }

      const value = values[question.id];

      if (!value) {
        if (
          question.required &&
          (!question.condition || values[question.condition.question] === question.condition.value)
        ) {
          errors[question.id] = 'REQUIRED';
        }

        continue;
      }

      let option: QuestionOption;

      switch (question.type) {
        case QuestionType.RADIO:
        case QuestionType.SELECT:
          option = question.options.find((o) => o.id === value);

          if (!option) {
            errors[question.id] = 'OPTION';
            break;
          }

          if (option.nextQuestion) {
            nextQuestionsIds.push(option.nextQuestion);
          }

          break;

        case QuestionType.CHECKBOX:
          if (typeof value !== 'boolean') {
            errors[question.id] = 'BOOLEAN';
          }

          break;

        case QuestionType.MULTISELECT:
          if (!Array.isArray(value)) {
            errors[question.id] = 'ARRAY';
          } else {
            for (const item of value) {
              option = question.options.find((o) => o.id === item);

              if (!option) {
                errors[question.id] = 'OPTION';
                break;
              }

              if (option.nextQuestion) {
                nextQuestionsIds.push(option.nextQuestion);
              }
            }
          }

          break;

        case QuestionType.FILES:
          // TODO
          break;

        case QuestionType.EMAIL:
          // TODO
          break;

        case QuestionType.LOCATION:
          // TODO
          break;
      }
    }

    if (Object.keys(errors).length) {
      return { errors };
    }

    let page: Page['id'];
    const questions: Array<Question['id']> = [];

    if (nextQuestionsIds.length) {
      const nextQuestions: Question[] = await ctx.call('questions.resolve', {
        id: nextQuestionsIds,
      });

      if (nextQuestions.length) {
        // TODO: must be the same page on all questions, if not - log error in database
        page = nextQuestions[0].page;

        const { questions: pageQuestions }: Page<'questions'> = await ctx.call('pages.resolve', {
          id: page,
          populate: 'questions',
        });

        // TODO: infinity loop possible if database has error
        function traverseNextQuestions(questionId: Question['id']) {
          const question = pageQuestions.find((q) => q.id === questionId);
          if (!question) return;

          questions.push(questionId);

          if (question.nextQuestion) {
            traverseNextQuestions(question.nextQuestion);
          }

          if (question.options?.length) {
            for (const option of question.options) {
              if (option.nextQuestion) {
                traverseNextQuestions(option.nextQuestion);
              }
            }
          }
        }

        for (const questionId of nextQuestionsIds) {
          traverseNextQuestions(questionId);
        }
      }
    }

    await this.updateEntity(ctx, {
      id: response.id,
      values,
    });

    if (!questions?.length || !page) {
      await ctx.call('sessions.finish', {
        id: response.session.id,
      });

      return {
        nextResponse: null,
      };
    }

    let nextResponse: Response = await this.findEntity(ctx, {
      query: {
        session: response.session.id,
        page,
      },
    });

    if (!nextResponse) {
      nextResponse = await this.createEntity(ctx, {
        session: response.session.id,
        page,
        questions,
        previousResponse: response.id,
      });
    } else {
      await this.updateEntity(ctx, {
        id: nextResponse.id,
        questions,
        previousResponse: response.id,
      });
    }

    await ctx.call('sessions.update', {
      id: response.session.id,
      lastResponse: nextResponse.id,
    });

    return {
      nextResponse: nextResponse.id,
    };
  }

  @Method
  async checkScopeAuthority(
    _ctx: Context<unknown, MetaSession>,
    scopeName: string,
    operation: 'add' | 'remove',
  ) {
    if (scopeName === 'session') {
      // do NOT allow to remove the scope
      if (operation === 'remove') {
        return false;
      }
    }

    // Allow add/remove other scopes by default and by request
    return true;
  }
}
