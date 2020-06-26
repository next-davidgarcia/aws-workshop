const path = __dirname + '/../../env/.env.' + process.env.NODE_ENV;
require('dotenv').config({ path });

const env = process.env;

const config = {
    env: env.NODE_ENV,
    port: env.PORT,
    log: env.LOG,
};

module.exports = config;
