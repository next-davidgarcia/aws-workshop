const { loadModel, Op, paginator } = require(__dirname + '/../../models');
const Post = loadModel('Post');
const PostTag = loadModel('PostTag');
const Tag = loadModel('PostTag');

module.exports.get = async function(req) {
    try {
        const slug = req.params.slug;
        const post = await Post.get({ slug });
        if (post === null) {
            req.response({ code: 404 });
        } else {
            req.response({ data: post });
        }
    } catch (error) {
        req.error({ error });
    }
};

module.exports.del = async function(req) {
    try {
        const id = req.params.postId;
        let post = await Post.findOne({ where: { id } });
        if (post === null) {
            req.response({ code: 404 });
        } else {
            post = post.toJSON();
            await PostTag.destroy({ where: { PostId: post.id }});
            await Post.destroy({ where: { id: post.id }});
            req.response({ code: 202 });
        }
    } catch (error) {
        req.error({ error });
    }
};

module.exports.list = async function (req, res) {
    try {
        const options = paginator({
            query: req.query,
            filterFields: ['category']
        });
        const { docs, pages, total } = await Post.paginate(options);
        const data = { total, pages, data: docs };
        req.response(data);
    } catch (error) {
        req.error({ error });
    }
};

module.exports.put = async function(req) {
    try {
        const slug = req.params.slug;
        const data = req.body;
        let old = await Post.findOne({ where: { slug }});
        if (old !== null) {
            old = old.toJSON();
            const oldTags = (await PostTag.findAll({ where: { id: old.id }})).map((item) => (item.toJSON()));
            const tags = data.tags || [];
            const remove = oldTags.filter((item) => tags.includes(item.name));
            const post = await Post.update(data, { where: { slug } });
            req.response({ data: post, code: 202 });
        } else {
            req.response({ code: 404 });
        }
    } catch (error) {
        req.error({ error });
    }
};

module.exports.post = async function(req) {
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
