//response caching middleware in redis

const redis = require('../db/redis');

function cacheMiddleware(ttlSeconds = 60) {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `cache:${req.user.userId}:${req.originalUrl}`;

    try {
      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        res.set('X-Cache', 'HIT');
        return res.json(JSON.parse(cachedData));
      }
    } catch (err) {
      console.error('Cache read error:', err);
    }

    const originalJson = res.json.bind(res);

    res.json = (body) => {
      res.set('X-Cache', 'MISS');

      redis
        .setex(cacheKey, ttlSeconds, JSON.stringify(body))
        .catch((err) => console.error('Cache write error:', err));

      return originalJson(body);
    };

    next();
  };
}

module.exports = cacheMiddleware;