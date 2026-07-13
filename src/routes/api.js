const express = require('express');
const authenticate = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { health, getData, getPremiumData } = require('../controllers/apiController');
const rateLimitMiddleware = require('../middleware/rateLimiter');
const cacheMiddleware = require('../middleware/cache');

const router = express.Router();

router.use(authenticate);
router.use(rateLimitMiddleware());

router.get('/health', health);
router.get('/data', cacheMiddleware(60), getData);
router.get('/premium', requireRole('pro', 'admin'), getPremiumData);

module.exports = router;