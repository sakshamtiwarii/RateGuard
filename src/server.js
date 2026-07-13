const app = require('./app');
const config = require('./config');
require('dotenv').config();
const pool = require('./db/postgres');
const redis = require('./db/redis');

module.exports ={
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 3000,

    databaseUrl: process.env.DATABASE_URL,
    redisHost: process.env.REDIS_HOST,
    redisPort: parseInt(process.env.REDIS_PORT)
}

pool.query('SELECT NOW()')
    .then(() => console.log('✅ PostgreSQL Connected'))
    .catch(err => console.log(err));

redis.on('connect', () => {
    console.log('✅ Redis Connected');
});




app.listen(config.port, () => {
  console.log(`Server is running on http://localhost:${config.port} [${config.nodeEnv}]`);
});