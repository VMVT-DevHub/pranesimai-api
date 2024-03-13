'use strict';

import moleculer, { Context } from 'moleculer';
import { Service } from 'moleculer-decorators';
import DbConnection from '../mixins/database.mixin';
import { Page } from './pages.service';

import {
  CommonFields,
  CommonPopulates,
  COMMON_DEFAULT_SCOPES,
  COMMON_FIELDS,
  COMMON_SCOPES,
  Table,
} from '../types';
import { QuestionOption } from './questionOptions.service';
import { Survey } from './surveys.service';

export enum QuestionType {
  // value = option.id
  SELECT = 'SELECT',
  RADIO = 'RADIO',

  // value = [11,23] (array of option.id)
  MULTISELECT = 'MULTISELECT',

  // value boolean
  CHECKBOX = 'CHECKBOX',

  // text value
  EMAIL = 'EMAIL',
  INPUT = 'INPUT',
  TEXT = 'TEXT',
  DATE = 'DATE',
  DATETIME = 'DATETIME',

  // todo: not implemented
  FILES = 'FILES',
  LOCATION = 'LOCATION',
}

export interface AuthData {
  relatedQuestion: Question['id'];
}

interface Fields extends CommonFields {
  page: Page['id'];
  survey: Survey['id'];
  required: boolean;
  riskEvaluation: boolean;
  type: QuestionType;
  title?: string;
  hint?: string;
  description?: string;
  nextQuestion?: Question['id'];
  data: AuthData;
  condition?: {
    question: Question['id'];
    value: any;
  };
  options: undefined;
}

interface Populates extends CommonPopulates {
  page: Page;
  survey: Survey;
  options: QuestionOption[];
}

export type Question<
  P extends keyof Populates = never,
  F extends keyof (Fields & Populates) = keyof Fields,
> = Table<Fields, Populates, P, F>;

@Service({
  name: 'questions',

  mixins: [
    DbConnection({
      collection: 'questions',
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

      page: {
        type: 'number',
        columnType: 'integer',
        columnName: 'pageId',
        required: true,
        populate: {
          action: 'pages.resolve',
        },
      },

      survey: {
        type: 'number',
        columnType: 'integer',
        columnName: 'surveyId',
        populate: {
          action: 'surveys.resolve',
        },
      },

      required: 'boolean',
      riskEvaluation: 'boolean',

      type: {
        type: 'string',
        required: true,
        enum: Object.values(QuestionType),
        default: QuestionType.INPUT,
      },

      title: 'string',
      description: 'string',
      hint: 'string',

      data: {
        type: 'object',
      },

      condition: {
        type: 'object',
        properties: {
          question: 'number',
          value: 'any',
        },
      },

      nextQuestion: {
        type: 'number',
        columnType: 'integer',
        columnName: 'nextQuestionId',
        populate: {
          action: 'questions.resolve',
        },
      },

      options: {
        type: 'array',
        virtual: true,
        async populate(ctx: Context, _values: number[], entities: Question[]) {
          const options: QuestionOption[] = await ctx.call('questionOptions.find', {
            query: {
              question: { $in: entities.map((e) => e.id) },
            },
          });

          return entities.map((entity) =>
            options.filter((option) => option.question === entity.id),
          );
        },
      },

      ...COMMON_FIELDS,
    },

    scopes: {
      ...COMMON_SCOPES,
    },

    defaultScopes: [...COMMON_DEFAULT_SCOPES],
  },
})
export default class QuestionsService extends moleculer.Service {}
