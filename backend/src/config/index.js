const path = __dirname + '/../../env/.env.' + process.env.NODE_ENV;
require('dotenv').config({ path });

const env = process.env;

const config = {
    env: env.NODE_ENV,
    port: env.PORT,
    log: env.LOG,
    apiPrefix: env.API_PREFIX,
    store: {
        options: {
            host: env.DB_HOST,
            dialect: "mysql",
            username: env.DB_USER,
            port: env.DB_PORT,
            password: env.DB_PASSWORD,
            database: env.DB_NAME,
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
