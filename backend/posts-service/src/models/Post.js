'use strict';

const { paginate } = require('sequelize-paginate');
const { CustomError } = require(__dirname + '/../lib');

module.exports = (sequelize, DataTypes) => {
    const Post = sequelize.define('Post', {
        slug: DataTypes.STRING,
        image: DataTypes.STRING,
        title: DataTypes.STRING,
        description: DataTypes.STRING,
        text: DataTypes.TEXT,
    }, {
        indexes: [
            {
                unique: true,
                fields: ['slug']
            }
        ]

    });
    Post.associate = (models) => {
        Post.belongsTo(models.User);
        Post.hasMany(models.PostTag);
    };

    paginate(Post);

    Post.getBySlugOrId = async ({ IdOrSlug }) => {
        const { loadModel } = require(__dirname + '/../models');
        // const PostTag = loadModel('PostTag');
        const where = isNaN(IdOrSlug) ? { slug: IdOrSlug } : { id: parseInt(IdOrSlug) };
        const data = await Post.findOne({ where });
        if (data !== null) {
            const post = data.toJSON();
            //comment in order to use tags-microservice
            // post.tags = (await PostTag.getPostTags({ PostId: post.id })).map(({ name }) => name);
            return post;
        } else {
            throw CustomError('Not found', 404);
        }
    };

    Post.updateTags = async ({ tags, id }) => {
        const { loadModel } = require(__dirname + '/../models');
        const Tag = loadModel('Tag');
        const PostTag = loadModel('PostTag');
        const updatedTags = await Tag.syncTags({ tags });
        const tagsIds = updatedTags.map((tag) => tag.id);
        await PostTag.syncTags({ tags: tagsIds, PostId: id });
        return updatedTags.map((item) => item.name);
    };

    Post.deletePost = async({ id }) => {
        const { loadModel } = require(__dirname + '/../models');
        const PostTag = loadModel('PostTag');
        const post = await Post.findOne({ where: { id } });
        if (post === null) {
            throw CustomError('Not found', 404);
        } else {
            await PostTag.destroy({ where: { PostId: id }});
            await Post.destroy({ where: { id }});
        }
    };

    Post.addPost = async ({ data }) => {
        console.log('el post', data);
        data.slug = sanitizeSlug(data.title);
        console.log('el slug', data.slug);
        const tags = data.tags || [];
        delete data.tags;
        const model = await Post.create(data);
        const post = model.toJSON();
        post.tags = await Post.updateTags({ tags, id: model.id });
        return post;
    };

    Post.updatePost = async ({ id, data }) => {
        const post = await Post.findOne({ where: { id: parseInt(id) } });
        if (post !== null) {
            const tags = data.tags || [];
            delete data.tags;
            delete data.slug;
            delete data.UserId;
            delete data.id;
            await post.update(data);
            const updatedTags = await Post.updateTags({ tags, id });
            return { ...post.toJSON(), tags: updatedTags };
        } else {
            throw CustomError('Not found', 404);
        }
    };

    Post.listPost = async ({ query, filterFields = [] }) => {
        const { paginator, loadModel } = require(__dirname + '/../models');
        // const PostTag = loadModel('PostTag');
        const options = paginator({
            query,
            filterFields,
        });
        const { docs, pages, total } = await Post.paginate(options);
        const data = { total, pages, data: [] };
        for (let i = 0; i < docs.length; i++) {
            const post = docs[i].toJSON();
            //comentar para obtener los tags del microservicio
            // post.tags = (await PostTag.getPostTags({ PostId: post.id })).map(({ name }) => name);
            data.data.push(post);
        }
        return data;
    };

    return Post;
};

function sanitizeSlug(string = '') {
    const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;';
    const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------';
    const p = new RegExp(a.split('').join('|'), 'g');

    return string.toString().toLowerCase().trim()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
        .replace(/&/g, '-and-') // Replace & with 'and'
        .replace(/[^\w\-]+/g, '') // Remove all non-word characters
        .replace(/\-\-+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start of text
        .replace(/-+$/, '') // Trim - from end of text
}
