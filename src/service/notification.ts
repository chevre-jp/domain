import { ACCEPTED, CREATED, NO_CONTENT, OK } from 'http-status';
import * as request from 'request';
import * as validator from 'validator';

import { credentials } from '../credentials';

import * as factory from '../factory';

import { MongoRepository as ActionRepo } from '../repo/action';

export type Operation<T> = () => Promise<T>;

/**
 * 開発者に報告する
 * @see https://notify-bot.line.me/doc/ja/
 */
export function report2developers(subject: string, content: string, imageThumbnail?: string, imageFullsize?: string): Operation<void> {
    return async () => {
        const LINE_NOTIFY_URL = credentials.lineNotify.url;
        const LINE_NOTIFY_ACCESS_TOKEN = credentials.lineNotify.accessToken;
        if (LINE_NOTIFY_URL === undefined) {
            throw new Error('Environment variable LINE_NOTIFY_URL not set');
        }
        if (LINE_NOTIFY_ACCESS_TOKEN === undefined) {
            throw new Error('Environment variable LINE_NOTIFY_ACCESS_TOKEN not set');
        }

        const message = `
env[${process.env.NODE_ENV}]
------------------------
${subject}
------------------------
${content}`
            ;

        // LINE通知APIにPOST
        const formData: any = { message: message };
        if (imageThumbnail !== undefined) {
            if (!validator.isURL(imageThumbnail)) {
                throw new factory.errors.Argument('imageThumbnail', 'imageThumbnail should be URL');
            }

            formData.imageThumbnail = imageThumbnail;
        }
        if (imageFullsize !== undefined) {
            if (!validator.isURL(imageFullsize)) {
                throw new factory.errors.Argument('imageFullsize', 'imageFullsize should be URL');
            }

            formData.imageFullsize = imageFullsize;
        }

        return new Promise<void>((resolve, reject) => {
            request.post(
                {
                    url: LINE_NOTIFY_URL,
                    auth: { bearer: LINE_NOTIFY_ACCESS_TOKEN },
                    form: formData,
                    json: true
                },
                (error, response, body) => {
                    if (error !== null) {
                        reject(error);
                    } else {
                        switch (response.statusCode) {
                            case OK:
                                resolve();
                                break;
                            default:
                                reject(new Error(body.message));
                        }
                    }
                }
            );
        });
    };
}

export function triggerWebhook(params: factory.task.triggerWebhook.IData) {
    return async (repos: {
        action: ActionRepo;
    }) => {
        const action = await repos.action.start(params);
        let result: any = {};

        try {
            if (params.recipient !== undefined
                && params.recipient !== null
                && typeof params.recipient.url === 'string') {
                const url = params.recipient.url;

                await new Promise<void>((resolve, reject) => {
                    request.post(
                        {
                            url: url,
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
                });
            }
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
