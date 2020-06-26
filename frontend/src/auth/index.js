const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const SECRET = 'sea789798ALJDF';
const SECONDS = 3600;

function getToken({ user }) {
    return jwt.sign({
        exp: new Date().getTime() + SECONDS,
        data: user,
    }, SECRET);
}


async function init(req, res, next) {
    req.isLogged = () => req.user !== undefined;
    try {
        const { headers } = req;
        const { authorization } = headers;
        if (authorization !== undefined && authorization.startsWith('Bearer ')) {
            const token = authorization.replace('Bearer ', '');
            const info = jwt.verify(token, SECRET);
            req.user = info.data;
        }
    } catch (e) {
        req.user = undefined;
    }
    next();
}

function logged(req, res, next) {
    if (req.isLogged() === true) {
        next();
    } else {
        req.response({ code: 401 });
    }
}

function getHash({ text }) {
    return new Promise((resolve, reject) => {
        const saltRounds = 10;
        bcrypt.genSalt(saltRounds, (err, salt) => {
            bcrypt.hash(text, salt, (err, hash) => {
                return err ? reject(err) : resolve({ hash });
            });
        });
    });
}

function checkHash({ text, hash }) {
    return new Promise((resolve, reject) => {
        bcrypt.compare(text, hash, (err, result) => {
            return err ? reject(err) : resolve({ result });
        });
    });
}

module.exports = { init, logged, getToken, getHash, checkHash };
