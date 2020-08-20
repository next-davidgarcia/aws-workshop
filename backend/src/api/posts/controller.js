const { loadModel } = require(__dirname + '/../../models');
const Post = loadModel('Post');

module.exports.get = async (req) => {
    try {
        const id = req.params.postId;
        const post = await Post.getBySlugOrId({ IdOrSlug: id });
        req.response({ data: post });
    } catch (error) {
        req.error({ error });
    }
};

module.exports.del = async (req) => {
    try {
        const id = parseInt(req.params.postId);
        await Post.deletePost({ id });
        req.response({ code: 202 });
    } catch (error) {
        req.error({ error });
    }
};

module.exports.list = async (req) => {
    try {
        const data = await Post.listPost({ query: req.query });
        req.response(data);
    } catch (error) {
        req.error({ error });
    }
};

module.exports.put = async (req) => {
    try {
        const id = parseInt(req.params.postId);
        const data = req.body;
        const post = await Post.updatePost({ data, id });
        req.response({ data: post, code: 202 });
    } catch (error) {
        req.error({ error });
    }
};

module.exports.post = async (req) => {
    try {
        const data = req.body;
        data.UserId = req.user.id;
        const post = await Post.addPost({ data });
        req.response({ data: post, code: 201 });
    } catch (error) {
        console.log(error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            req.response({ code: 412, message: 'Duplicated Slug' });
        } else {
            req.error({ error });
        }
    }
};
