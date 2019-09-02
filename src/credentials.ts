/**
 * 外部サービスを使用するための認証情報
 */
export const credentials = {
    lineNotify: {
        url: <string>process.env.LINE_NOTIFY_URL,
        accessToken: <string>process.env.LINE_NOTIFY_ACCESS_TOKEN
    },
    sendGrid: {
        apiKey: <string>process.env.SENDGRID_API_KEY
    }
};
