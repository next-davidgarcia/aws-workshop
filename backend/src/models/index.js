const fs = require('fs');
const path = require('path');
const { Sequelize, Op } = require('sequelize');
const basename = path.basename(__filename);
const config = require(__dirname + '/../config');
const sequelize = new Sequelize(config.store.options);
const db = loadModels();

function listModelsFiles() {
    return fs
        .readdirSync(__dirname)
        .filter(file => {
            return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
        });
}

function loadModels() {
    const models = {};
    const nm = [];
    const files = listModelsFiles();
    files.forEach(file => {
        const model = sequelize.import(path.join(__dirname, file));
        models[model.name] = model;
        nm.push(model.name);
    });

    nm.forEach(modelName => {
        if (models[modelName].associate) {
            models[modelName].associate(models);
        }
    });

    return models;
}

function loadModel (name) {
    return db[name];
}

function doOrder ({ query = {}, order = [] }) {
    const value = query.order;
    if (value !== undefined) {
        if (value.startsWith('-')) {
            order.push([value.substr(1), 'DESC']);
        } else {
            order.push([value, 'ASC']);
        }
    }
    return order;
}

function createQuery ({ query = {}, filterFields = [], searchFields = [], where = {}, pageSize = 25 }) {
    const options = doPaginator({ query, pageSize });
    options.where = where || {}; options.order = [];
    doWhere({ query, where: options.where, filterFields, searchFields });
    doOrder({ query, order: options.order });
    return options;
}

function doWhere ({ query = {}, where = {}, filterFields = [], searchFields = []}) {
    if (filterFields.length !== 0) {
        filterFields.forEach(field => {
            if (query[field] !== undefined) {
                where[field] = query[field];
            }
        });
    }
    if (searchFields.length !== undefined && query.search !== undefined) {
        const term = '%' + query.search + '%';
        const or = [];
        searchFields.forEach(field => {
            or.push({ [field] : { [Op.like] : term } });
        });
        where[Op.or] = or;
    }
    return where;
}

function doPaginator({ query, pageSize = 25 }) {
    const page = parseInt(query.paginationKey || query.page || 1);
    const limit = parseInt(query.pageSize || pageSize);
    const offset = page * limit - limit;
    return {
        limit,
        offset
    };
}


function paginator ({ query, filterFields = [], attributes = [], pageSize = 25, searchFields = [], where = {} }) {
    const options = {
        page: parseInt(query.paginationKey || query.page || 1),
        paginate: parseInt(query.pageSize || query.size || pageSize),
        order: [],
        where
    };

    if (attributes.length !== 0) {
        options.attributes = attributes;
    }
    doWhere({ query, filterFields, searchFields, where: options.where });
    doOrder({ query, order: options.order });

    return options;
}

async function install () {
    let fails = 0;
    let last = false;
    let tries = 0;
    const files = listModelsFiles();
    while (files.length > 0 && tries++ < 100) {
        fails = 0;
        for (var i = files.length - 1; i >= 0; i--) {
            const file = files[i];
            const name = file.replace('.js', '');
            try {
                if (db[name] !== undefined) {
                    await db[name].sync({ alter: true });
                    files.splice(i, 1);
                }
            } catch (e) {
                last = e;
                fails++;
            }
        }
    }
    console.log('Fin. Número de fallos: ', fails, last);
    return !!fails;
}

async function transaction (fns = []) {
    return sequelize.transaction(async t => {
        const results = [];
        for (let i=0; i<fns.length; i++) {
            const fn = fns[i];
            results.push(await fn(t, ...results));
        }
        return results;
    });
}

// @ts-ignore
function sanitizeMdl() {
    return (req, res, next) => {
        for (let param in req.query) {
            const value = req.query[param];
            if (value === 'true') {
                req.query[param] = true;
            } else if (value === 'false') {
                req.query[param] = false;
            } else if (value === 'null') {
                req.query[param] = null;
            }
        }

        next();
    };
}

module.exports = { db, sequelize, Sequelize, loadModel, install, Op, paginator, transaction, sanitizeMdl, createQuery };
