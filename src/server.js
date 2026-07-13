require('dotenv').config();
const app = require('./app');
const config = require('./config');
const pool = require('./db/postgres');
const redis = require('./db/redis');

pool.query('SELECT NOW()')
    .then(() => console.log('✅ PostgreSQL Connected'))
    .catch(err => console.log(err));

redis.on('connect', () => {
    console.log('✅ Redis Connected');
});




app.listen(config.port, () => {
  console.log(`Server is running on http://localhost:${config.port} [${config.nodeEnv}]`);
});