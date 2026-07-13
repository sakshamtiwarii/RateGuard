const express = require('express');
const authenticate = require('../middleware/auth');
const { health, getData } = require('../controllers/apiController');
const rateLimitMiddleware = require('../middleware/rateLimiter');
const cacheMiddleware = require('../middleware/cache');

const router = express.Router();

router.use(authenticate);
router.use(rateLimitMiddleware());


router.get('/health', authenticate, health);
router.get('/data', authenticate, cacheMiddleware(60), getData);


module.exports = router;