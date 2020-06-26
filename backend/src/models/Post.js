'use strict';

const { paginate } = require('sequelize-paginate');

module.exports = (sequelize, DataTypes) => {
    const Post = sequelize.define('Post', {
        slug: DataTypes.STRING,
        image: DataTypes.STRING,
        title: DataTypes.STRING,
        description: DataTypes.STRING,
        text: DataTypes.STRING,
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
        Post.belongsToMany(models.Tag, { through: models.PostTag });
    };

    paginate(Post);

    Post.get = async ({ slug }) => {
        const { loadModel } = require(__dirname + '/../models');
        const PostTag = loadModel('PostTag');
        const Tag = loadModel('Tag');
        const data = await Post.findOne({
            where: { slug },
            include: [{ model: PostTag, include: [Tag]}],
        });
        return data;
    };

    Post.addPost = async ({ data }) => {
        const { loadModel } = require(__dirname + '/../models');
        data.tags = data.tags || [];
        const Tag = loadModel('Tag');
        const model = await Post.create(data, {
            include: [ { model: Tag, ignoreDuplicates: true } ],
        });
        if (data.tags.length !== 0) {
            const tags = await Tag.bulkCreate(data.tags.map((name) => ({ name })), {
                ignoreDuplicates: true,
            });
            await model.setTags(tags, { through: { ignoreDuplicates: true, fields: ['id', 'name'] }}); // The default value is false, but p1 overrides that.
        }
        const post = model.toJSON();
        post.tags = data.tags;
        // if (tags.length !== 0) {
        //     const names = tags.map((item) => ({ name: item }));
        //     const result = await Tag.bulkCreate(names, {
        //         ignoreDuplicates: true,
        //     });
        //     console.log(result);
        //     post.tags = tags;
        // }
        return post;
    };


    return Post;
};
