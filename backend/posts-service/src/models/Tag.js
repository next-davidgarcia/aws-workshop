'use strict';

const { paginate } = require('sequelize-paginate');

module.exports = (sequelize, DataTypes) => {
    const Tag = sequelize.define('Tag', {
        name: DataTypes.STRING,
    }, {
        indexes: [
            {
                unique: true,
                fields: ['name']
            }
        ]
    });

    Tag.associate = (models) => {
        Tag.hasMany(models.PostTag);
    };

    Tag.syncTags = async ({ tags = [] }) => {
        const toAdd = [];
        const sanitized = tags.map((tag) => {
            tag = tag || '';
            return tag.toLowerCase().trim();
        });
        const data = await Tag.findAll({
            where: { name: sanitized },
        });

        const names = data.map((item) => item.name);

        for (let i = 0; i < sanitized.length; i++) {
            const name = sanitized[i];
            if (names.includes(name) === false) {
                toAdd.push({ name });
            }
        }
        if (toAdd.length !== 0) {
            const result = await Tag.bulkCreate(toAdd, { returning: true });
            data.push(...result);
        }
        return data.map((item) => {
            return {
                id: item.id,
                name: item.name,
            };
        });
    };

    paginate(Tag);

    return Tag;
};


