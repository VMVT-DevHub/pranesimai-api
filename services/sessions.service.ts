'use strict';

import crypto from 'crypto';
import moleculer, { Context } from 'moleculer';
import { Action, Service } from 'moleculer-decorators';
import DbConnection from '../mixins/database.mixin';
import { Survey } from './surveys.service';

import {
  CommonFields,
  CommonPopulates,
  COMMON_DEFAULT_SCOPES,
  COMMON_FIELDS,
  COMMON_SCOPES,
  Table,
} from '../types';
import { Response } from './responses.service';

interface Fields extends CommonFields {
  token: string;
  survey: Survey['id'];
  lastResponse: Response['id'];
  finishedAt: Date;
}

interface Populates extends CommonPopulates {
  survey: Survey;
  lastResponse: Response;
}

export type Session<
  P extends keyof Populates = never,
  F extends keyof (Fields & Populates) = keyof Fields,
> = Table<Fields, Populates, P, F>;

@Service({
  name: 'sessions',

  mixins: [
    DbConnection({
      collection: 'sessions',
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

      survey: {
        type: 'number',
        columnType: 'integer',
        columnName: 'surveyId',
        required: true,
        populate: {
          action: 'surveys.resolve',
        },
      },

      lastResponse: {
        type: 'number',
        columnType: 'integer',
        columnName: 'lastResponseId',
        populate: {
          action: 'responses.resolve',
        },
      },

      token: {
        type: 'string',
        set() {
          return crypto.randomBytes(64).toString('hex');
        },
      },

      finishedAt: 'date',

      ...COMMON_FIELDS,
    },

    scopes: {
      ...COMMON_SCOPES,
    },

    defaultScopes: [...COMMON_DEFAULT_SCOPES],
  },
})
export default class SessionsService extends moleculer.Service {
  @Action({
    rest: 'POST /start',
  })
  async start(ctx: Context<Partial<Session>>) {
    const survey: Survey<'firstPage'> = await ctx.call('surveys.resolve', {
      id: ctx.params.survey,
      populate: 'firstPage',
      throwIfNotExist: true,
    });

    const session: Session = await this.createEntity(ctx);

    const lastResponse: Response = await ctx.call('responses.create', {
      session: session.id,
      page: survey.firstPage.id,
      questions: survey.firstPage.questions.map((question) => question.id),
    });

    return this.updateEntity(ctx, {
      id: session.id,
      lastResponse: lastResponse.id,
    });
  }
}
