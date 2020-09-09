const path = __dirname + '/../../env/.env.' + process.env.NODE_ENV;
require('dotenv').config({ path });

const env = process.env;

const config = {
    env: env.NODE_ENV,
    port: env.APP_PORT,
    log: env.APP_LOG,
    apiPrefix: env.API_PREFIX,
    store: {
        options: {
            host: env.APP_DB_HOST,
            dialect: "mysql",
            username: env.APP_DB_USR,
            port: env.APP_DB_PORT,
            password: env.APP_DB_PASSWD,
            database: env.APP_DB_SCHEME,
            connectionLimit: 10,
            pool: {
                max: 5,
                min: 0,
                acquire: 30000,
                idle: 10000
            },
            logging: false,
        },
    },
};

module.exports = config;
