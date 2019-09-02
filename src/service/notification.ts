import { ACCEPTED, CREATED, NO_CONTENT, OK } from 'http-status';
import * as request from 'request';

import * as factory from '../factory';

import { MongoRepository as ActionRepo } from '../repo/action';

export function triggerWebhook(params: factory.task.triggerWebhook.IData) {
    return async (repos: {
        action: ActionRepo;
    }) => {
        const action = await repos.action.start(params);
        let result: any = {};

        try {
            await new Promise<void>((resolve, reject) => {
                if (params.recipient !== undefined && typeof params.recipient.url === 'string') {
                    request.post(
                        {
                            url: params.recipient.url,
                            body: {
                                data: params.object
                            },
                            json: true
                        },
                        (error, response, body) => {
                            if (error instanceof Error) {
                                reject(error);
                            } else {
                                switch (response.statusCode) {
                                    case OK:
                                    case CREATED:
                                    case ACCEPTED:
                                    case NO_CONTENT:
                                        result = body;
                                        resolve();
                                        break;

                                    default:
                                        reject(body);
                                }
                            }
                        }
                    );
                }
            });
        } catch (error) {
            // actionにエラー結果を追加
            try {
                const actionError = { ...error, message: error.message, name: error.name };
                await repos.action.giveUp({ typeOf: action.typeOf, id: action.id, error: actionError });
            } catch (__) {
                // 失敗したら仕方ない
            }

            throw error;
        }

        await repos.action.complete({ typeOf: action.typeOf, id: action.id, result: result });
    };
}
