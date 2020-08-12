'use strict';

const controller = require(__dirname + '/controller');
const { logged } = require(__dirname + '/../../auth');
const { apiPrefix } = require(__dirname + '/../../config');
const path = apiPrefix + 'posts/';

module.exports = (router) => {
    router.get(path + ':postId', controller.get);
    router.get(path, controller.list);
    router.post(path, controller.post);
    router.put(path + ':postId', controller.put);
    router.delete(path + ':postId', controller.del);
};
