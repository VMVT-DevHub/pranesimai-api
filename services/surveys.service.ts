'use strict';

import moleculer from 'moleculer';
import { Method, Service } from 'moleculer-decorators';
import DbConnection from '../mixins/database.mixin';

import {
  CommonFields,
  CommonPopulates,
  COMMON_DEFAULT_SCOPES,
  COMMON_FIELDS,
  COMMON_SCOPES,
  Table,
} from '../types';
import { Page } from './pages.service';

interface Fields extends CommonFields {
  title: string;
  description: string;
  icon: string;
  firstPage: Page['id'];
  lastPage: Page['id'];
}

interface Populates extends CommonPopulates {
  firstPage: Page<'questions'>;
  lastPage: Page<'questions'>;
}

export type Survey<
  P extends keyof Populates = never,
  F extends keyof (Fields & Populates) = keyof Fields,
> = Table<Fields, Populates, P, F>;

@Service({
  name: 'surveys',

  mixins: [
    DbConnection({
      collection: 'surveys',
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

      title: 'string',
      description: 'string',
      icon: 'string',

      firstPage: {
        type: 'number',
        columnType: 'integer',
        columnName: 'firstPageId',
        required: true,
        populate: {
          action: 'pages.resolve',
          params: {
            populate: 'questions',
          },
        },
      },

      lastPage: {
        type: 'number',
        columnType: 'integer',
        columnName: 'lastPageId',
        required: true,
        populate: {
          action: 'pages.resolve',
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
export default class SurveysService extends moleculer.Service {}
