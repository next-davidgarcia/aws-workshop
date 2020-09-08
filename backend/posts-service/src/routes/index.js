const router = require('express').Router();

require('../api/posts')(router);

module.exports = router;
