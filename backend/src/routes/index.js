const router = require('express').Router();

require('../api/posts')(router);
require('../api/auth')(router);
require('../api/check')(router);


module.exports = router;
