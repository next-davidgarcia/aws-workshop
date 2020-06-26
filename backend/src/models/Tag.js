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
        Tag.belongsToMany(models.Post, { through: models.PostTag });
    };


    paginate(Tag);

    return Tag;
};


