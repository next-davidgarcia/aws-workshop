const config = require(__dirname + '/../config');
const winston = require('winston');
const { v4: uuid } = require('uuid');
const logger = winston.createLogger({
    format: winston.format.json(),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: config.log })
    ]
});


function middleware(req, res, next) {
    const id = req.uuid || uuid();
    const user = req.user || 'not-logged';
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const date = new Date().toUTCString();
    const method = req.method;
    const path = req.originalUrl;
    const base = { id, ip, date, method, path, user };
    req.log = {
        info(message) {
            logger.info({ ...base, message });
        },
        error({ message = false, error = {} }) {
            message = message || error.message;
            logger.error({ ...base, message });
            req.log.debug(error);
        },
        debug(error) {
            if (config.env === 'local') {
                console.error('Debug error', error);
            }
        }
    };
    req.log.info('Request start');
    res.on('finish', () => {
        base.code = res.statusCode;
        req.log.info('Request ended');
    });
    next();
}

module.exports = { middleware, logger };
