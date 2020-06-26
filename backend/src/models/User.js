'use strict';

const { paginate } = require('sequelize-paginate');

module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        email: DataTypes.STRING,
        name: DataTypes.STRING,
        surname: DataTypes.STRING,
        password: DataTypes.STRING,
    }, {
        indexes: [
            {
                unique: true,
                fields: ['email']
            }
        ]
    });
    User.associate = (models) => {
        User.hasMany(models.Post);
    };

    paginate(User);
    return User;
};
