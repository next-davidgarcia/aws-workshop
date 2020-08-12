'use strict';

module.exports = (sequelize, DataTypes) => {
    const PostTag = sequelize.define('PostTag', {}, {
        indexes: [
            {
                unique: true,
                fields: ['PostId', 'TagId']
            }
        ]

    });

    PostTag.associate = (models) => {
        PostTag.belongsTo(models.Post);
        PostTag.belongsTo(models.Tag);
    };

    PostTag.syncTags = async({ tags, PostId }) => {
        const promises = [];
        const old = await PostTag.getPostTags({ PostId });
        for (let i = old.length - 1; i >= 0; i--) {
            const tag = old[i];
            const index = tags.indexOf(tag.id);
            if (index === -1) {
                promises.push(PostTag.destroy({ where: { PostId, TagId: tag.id }}));
            } else {
                tags.splice(index, 1);
                old.splice(i, 1);
            }
        }
        if (tags.length !== 0) {
            promises.push(PostTag.bulkCreate(tags.map((TagId) => ({ TagId, PostId }))));
        }
        if (promises.length !== 0) {
            await Promise.all(promises);
        }
    };

    PostTag.getPostTags = async ({ PostId }) => {
        const { loadModel } = require(__dirname + '/../models');
        const Tag = loadModel('Tag');
        const data = await PostTag.findAll({
            where: { PostId },
            include: [{ model: Tag }],
        });
        return data.map((item) => {
           const res = item.toJSON();
           return { name: res.Tag.name, id: res.TagId };
        });
    };

    return PostTag;
};
