'use strict';

const controller = require(__dirname + '/controller');
const { logged } = require(__dirname + '/../../auth');
const { apiPrefix } = require(__dirname + '/../../config');
const path = apiPrefix + 'posts/';

module.exports = (router) => {
    router.get(path + ':postId', controller.get);
    router.get(path, controller.list);
    // router.get(path,logged, controller.list);
    router.post(path, logged, controller.post);
    router.put(path + ':postId', logged, controller.put);
    router.delete(path + ':postId', logged, controller.del);
};
