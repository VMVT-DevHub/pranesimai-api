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
import { Page, PageType } from './pages.service';
import { QuestionOption } from './questionOptions.service';
import { Survey } from './surveys.service';
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
    const nextPageValues: Response['values'] = {};
    const nextQuestionsIds: Array<Question['id']> = [];

    for (const question of response.questions) {
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
        case QuestionType.AUTH:
          option = question.options.find((o) => o.id === value?.option);

          if (!option) {
            errors[question.id] = 'AUTH_OPTION';
            break;
          }

          if (option.data?.auth) {
            if (!value.data?.personalCode || !value.data?.email || !value.data?.fullName) {
              errors[question.id] = 'AUTH_DATA';
              break;
            }

            if (question.data?.relatedQuestion) {
              nextPageValues[question.data.relatedQuestion] = value.data.email;
            }
          }

          if (option.nextQuestion) {
            nextQuestionsIds.push(option.nextQuestion);
          }

          break;

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
    let questions: Array<Question['id']>;

    if (nextQuestionsIds.length) {
      const nextQuestions: Question[] = await ctx.call('questions.resolve', {
        id: nextQuestionsIds,
      });

      if (nextQuestions.length) {
        // TODO: must be one page, if more pages - log error in data
        page = nextQuestions[0].page;

        const pageWithQuestions: Page<'questions'> = await ctx.call('pages.resolve', {
          id: page,
          populate: 'questions',
        });

        if (pageWithQuestions.type === PageType.STATIC) {
          questions = pageWithQuestions.questions.map((q) => q.id);
        } else {
          questions = nextQuestionsIds.filter((qId) =>
            pageWithQuestions.questions.some((q) => q.id === qId),
          );
        }
      }
    }

    if (!questions?.length || !page) {
      const survey: Survey = await ctx.call('surveys.resolve', { id: response.session.survey });
      page = survey.lastPage;
      questions = [];

      await ctx.call('sessions.end', {
        id: response.session.id,
      });
    } else {
      Object.keys(nextPageValues).forEach((qId) => {
        if (!questions.includes(Number(qId))) {
          delete nextPageValues[Number(qId)];
        }
      });
    }
    await this.updateEntity(ctx, {
      id: response.id,
      values,
    });

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
        values: nextPageValues,
        previousResponse: response.id,
      });
    } else {
      await this.updateEntity(ctx, {
        id: nextResponse.id,
        questions,
        values: {
          ...nextResponse.values,
          ...nextPageValues,
        },
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
