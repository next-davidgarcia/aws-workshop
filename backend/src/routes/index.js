const router = require('express').Router();

require('../api/posts')(router);
require('../api/auth')(router);

module.exports = router;
