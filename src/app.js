const express = require('express');
const app = express();
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const requestLogger = require('./middleware/requestLogger');


app.use(express.json());
app.use('/api' ,requestLogger);

app.use('/auth', authRoutes);
app.use('/api', apiRoutes);


app.get('/', (req, res) => {
  res.send('RateGuard API is running.');
});

module.exports = app;