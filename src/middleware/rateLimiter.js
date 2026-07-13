const redis = require('../db/redis');
const config = require('../config');

async function checkRateLimit(userId, role) {
  const limit = config.rateLimits[role] ?? config.rateLimits.free;

  if (limit === Infinity) {
    return {
      allowed: true,
      limit: 'unlimited',
      remaining: 'unlimited',
      resetAt: null,
    };
  }

  const windowMs = 60 * 60 * 1000;
  const now = Date.now();
  const windowStart = now - windowMs;
  const key = `ratelimit:user:${userId}`;

  await redis.zremrangebyscore(key, 0, windowStart);

  const currentCount = await redis.zcard(key);

  if (currentCount >= limit) {
    const oldestEntry = await redis.zrange(key, 0, 0, 'WITHSCORES');

    const oldestTimestamp = oldestEntry.length
      ? Number(oldestEntry[1])
      : now;

    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: oldestTimestamp + windowMs,
    };
  }

  await redis
    .multi()
    .zadd(key, now, `${now}-${Math.random()}`)
    .expire(key, Math.ceil(windowMs / 1000))
    .exec();

  return {
    allowed: true,
    limit,
    remaining: limit - currentCount - 1,
    resetAt: now + windowMs,
  };
}

module.exports = { checkRateLimit };

function rateLimitMiddleware() {
  return async (req, res, next) => {
    try {
      const { userId, role } = req.user;

      const result = await checkRateLimit(userId, role);

      res.set({
        'X-RateLimit-Limit': result.limit,
        'X-RateLimit-Remaining': result.remaining,
        'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000),
      });

      if (!result.allowed) {
        const retryAfter = Math.ceil(
          (result.resetAt - Date.now()) / 1000
        );

        res.set('Retry-After', retryAfter);

        return res.status(429).json({
          error: 'Rate limit exceeded.',
          code: 'RATE_LIMIT_EXCEEDED',
          limit: result.limit,
          resetAt: new Date(result.resetAt).toISOString(),
        });
      }

      next();

    } catch (err) {
      console.error(err);

      // Redis failure shouldn't bring down the whole API.
      // Allow the request to continue.
      next();
    }
  };
}


module.exports = rateLimitMiddleware;
