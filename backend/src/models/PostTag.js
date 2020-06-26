'use strict';

module.exports = (sequelize, DataTypes) => {
    const PostTag = sequelize.define('PostTag', {});
    return PostTag;
};
