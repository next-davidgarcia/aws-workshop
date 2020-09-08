const express = require('express');
const app = new express();
const config = require('./config');
const log = require('./log');
const auth = require('./auth');
const compression = require('compression');
const cors = require('cors');
const bodyParser = require('body-parser');
const routes = require('./routes');
const HTTP_CODES = require('./http_codes');

app.use(cors());
app.use(compression());
app.use(bodyParser.json());
app.use(log.middleware);
app.use((req, res, next) => {
    req.response = ({ data = false, code = 200, pages = undefined, total = undefined, headers = {}, message = false }) => {
       if (data === false) {
           res.status(code).json({ code, message: message || HTTP_CODES[code] });
       } else {
           res.status(code).json({ data, message: message || HTTP_CODES[code], pages, total, code });
       }
    };

    req.error = ({ error = {}, message = false, code = false }) => {
        code = code || error.code || 500;
        if (config.env === 'pro') {
            message = message || error.public || HTTP_CODES[code] || 'Internal error';
        } else {
            message = message || error.public || error.message || error.name || error.code;
        }
        if (code >= 500) {
            req.log.error({ message, error, code });
        }
        res.status(code).json({ message, code });
    };

    next();
});
app.use(auth.init);
app.use(routes);

app.listen(config.port, () => {
    log.logger.info({ date: new Date().toUTCString(), message: `Server running on port ${ config.port }` });
});

module.exports = app;
