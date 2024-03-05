'use strict';

import moleculer from 'moleculer';
import { Service } from 'moleculer-decorators';
import DbConnection from '../mixins/database.mixin';
import { Question } from './questions.service';

import {
  CommonFields,
  CommonPopulates,
  COMMON_DEFAULT_SCOPES,
  COMMON_FIELDS,
  COMMON_SCOPES,
  Table,
} from '../types';

export interface DataAuthOption {
  auth: boolean;
}

interface Fields extends CommonFields {
  question: Question['id'];
  nextQuestion: Question['id'];
  title: string;
  description: string;
  hint: string;
  icon: string;
  data?: DataAuthOption;
}

interface Populates extends CommonPopulates {
  question: Question;
  nextQuestion: Question;
}

export type QuestionOption<
  P extends keyof Populates = never,
  F extends keyof (Fields & Populates) = keyof Fields,
> = Table<Fields, Populates, P, F>;

@Service({
  name: 'questionOptions',

  mixins: [
    DbConnection({
      collection: 'questionOptions',
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

      question: {
        type: 'number',
        columnType: 'integer',
        columnName: 'questionId',
        required: true,
        populate: {
          action: 'questions.resolve',
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

      title: 'string',
      description: 'string',
      hint: 'string',
      icon: 'string',
      data: 'any',

      ...COMMON_FIELDS,
    },

    scopes: {
      ...COMMON_SCOPES,
    },

    defaultScopes: [...COMMON_DEFAULT_SCOPES],
  },
})
export default class QuestionOptionsService extends moleculer.Service {}
