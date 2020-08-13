'use strict';

const controller = require(__dirname + '/controller');
const { logged } = require(__dirname + '/../../auth');
const { apiPrefix } = require(__dirname + '/../../config');
const path = apiPrefix + 'auth/';

module.exports = (router) => {
    router.get(path + 'me', logged, controller.me);
    router.post(path + 'login', controller.login);
    router.post(path, controller.post);
};
