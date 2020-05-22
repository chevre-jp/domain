/**
 * 外部サービスを使用するための認証情報
 */
export const credentials = {
    coa: {
        endpoint: <string>process.env.COA_ENDPOINT,
        refreshToken: <string>process.env.COA_REFRESH_TOKEN
    },
    lineNotify: {
        url: <string>process.env.LINE_NOTIFY_URL,
        accessToken: <string>process.env.LINE_NOTIFY_ACCESS_TOKEN
    },
    pecorino: {
        authorizeServerDomain: <string>process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN,
        clientId: <string>process.env.PECORINO_CLIENT_ID,
        clientSecret: <string>process.env.PECORINO_CLIENT_SECRET,
        endpoint: <string>process.env.PECORINO_ENDPOINT
    }
};
