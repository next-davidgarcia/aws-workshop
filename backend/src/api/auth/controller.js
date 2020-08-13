const { loadModel, Op, paginator } = require(__dirname + '/../../models');
const { getHash, checkHash, getToken } = require(__dirname + '/../../auth');
const User = loadModel('User');


module.exports.me = async function(req) {
    try {
        const { email } = req.user;
        let user = await User.findOne({ where: { email } });
        if (user === null) {
            req.response({ code: 404 });
        } else {
            user = user.toJSON();
            delete user.password;
            req.response({ data: user });
        }
    } catch (error) {
        req.error({ error });
    }
};

module.exports.login = async function(req) {
    try {
        const { email, password } = req.body;
        let user = await User.findOne({ where: { email } });
        if (user === null) {
            req.response({ code: 404 });
        } else {
            user = user.toJSON();
            const { result } = await checkHash({ text: password, hash: user.password });
            if (result === false) {
                req.response({ code: 401 });
            } else {
                delete user.password;
                const token = getToken({ user });
                req.response({ data: { user, token } });
            }
        }
    } catch (error) {
        req.error({ error });
    }
};

module.exports.post = async function(req, res) {
    try {
        const data = req.body;
        data.password = (await getHash({ text: data.password })).hash;
        const user = (await User.create(data)).toJSON();
        delete user.password;
        req.response({ data: user, code: 201 });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            req.response({ message: 'User exists', code: 412 });
        } else {
            req.error({ error });
        }
    }
};
