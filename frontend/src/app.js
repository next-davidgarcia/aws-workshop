const express = require('express');
express.Router({ strict: true });
const app = new express();
const config = require('./config');
const log = require('./log');
const auth = require('./auth');
const compression = require('compression');
const bodyParser = require('body-parser');
const HTTP_CODES = require('./http_codes');
const path = require('path');

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

    req.error = ({ code = 500, message = false, error = {} }) => {
        if (config.env === 'pro') {
            message = message || HTTP_CODES[code] || 'Internal error';
        } else {
            message = message || error.message || error.name || error.code;
        }
        if (code >= 500) {
            req.log.error({ message, error, code });
        }
        res.status(code).json({ message, code });
    };
    next();
});
app.use(auth.init);
app.use(express.static(__dirname + '/../spa'));

app.get('*', (request, response) => {
    response.sendFile(path.resolve(__dirname + '/../spa', 'index.html'));
});


app.listen(config.port, () => {
    log.logger.info({ date: new Date().toUTCString(), message: `Server running on port ${ config.port }` });
});

module.exports = app;
