'use strict';

const controller = require(__dirname + '/controller');
const { logged } = require(__dirname + '/../../auth');
const { apiPrefix } = require(__dirname + '/../../config');
const path = apiPrefix + 'check/';

module.exports = (router) => {
    router.get(path, controller.check);
};
