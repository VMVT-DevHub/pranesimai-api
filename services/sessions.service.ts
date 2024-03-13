'use strict';

import cookie from 'cookie';
import crypto from 'crypto';
import moleculer, { Context } from 'moleculer';
import { Action, Method, Service } from 'moleculer-decorators';
import DbConnection from '../mixins/database.mixin';
import { Survey } from './surveys.service';

import {
  CommonFields,
  CommonPopulates,
  COMMON_DEFAULT_SCOPES,
  COMMON_FIELDS,
  COMMON_SCOPES,
  Table,
  ResponseHeadersMeta,
} from '../types';
import { Response } from './responses.service';
import { MetaSession, RestrictionType } from './api.service';

interface Fields extends CommonFields {
  token: string;
  survey: Survey['id'];
  lastResponse: Response['id'];
  finishedAt: Date;
  canceledAt: Date;
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
      },

      finishedAt: 'date',
      canceledAt: 'date',

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
    rest: 'GET /current',
    auth: RestrictionType.SESSION,
  })
  async current(ctx: Context<unknown, MetaSession>) {
    return ctx.meta.session;
  }

  @Action({
    rest: 'POST /start',
    params: {
      survey: 'number',
    },
  })
  async start(ctx: Context<Partial<Session>, ResponseHeadersMeta>) {
    const survey: Survey<'firstPage'> = await ctx.call('surveys.resolve', {
      id: ctx.params.survey,
      populate: 'firstPage',
      throwIfNotExist: true,
    });

    const token = crypto.randomBytes(64).toString('hex');

    const session: Session = await this.createEntity(ctx, {
      survey: ctx.params.survey,
      token,
    });

    ctx.meta.$responseHeaders = {
      'Set-Cookie': cookie.serialize('vmvt-session-token', session.token, {
        path: '/',
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7, // 1 week
      }),
    };

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

  @Action({
    params: {
      id: 'number',
    },
  })
  async finish(ctx: Context<{ id: Session['id'] }, ResponseHeadersMeta>) {
    await this.updateEntity(ctx, {
      id: ctx.params.id,
      finishedAt: new Date(),
    });

    this.removeCookie(ctx);
  }

  @Action({
    rest: 'POST /cancel',
    auth: RestrictionType.SESSION,
  })
  async cancel(ctx: Context<unknown, MetaSession & ResponseHeadersMeta>) {
    await this.updateEntity(ctx, {
      id: ctx.meta.session.id,
      canceledAt: new Date(),
    });

    this.removeCookie(ctx);
  }

  @Method
  removeCookie(ctx: Context<unknown, ResponseHeadersMeta>) {
    ctx.meta.$responseHeaders = {
      'Set-Cookie': cookie.serialize('vmvt-session-token', '', {
        path: '/',
        httpOnly: true,
        maxAge: 0,
      }),
    };
  }
}
