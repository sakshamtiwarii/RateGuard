const pool = require('../db/postgres');

function requestLogger(req, res, next) {
  const startTime = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;

    pool.query(
      `INSERT INTO request_logs
       (user_id, ip, endpoint, method, status_code, response_time)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user?.userId || null,
        req.ip,
        req.originalUrl,
        req.method,
        res.statusCode,
        responseTime,
      ]
    ).catch((err) => {
      console.error('Request logging failed:', err);
    });
  });

  next();
}

module.exports = requestLogger;