const jwt = require('jsonwebtoken');
const config = require('../config');

function generateAccessToken(payload) {
  return jwt.sign(payload, config.accessTokenSecret, {
    expiresIn: config.accessTokenExpiry,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.accessTokenSecret);
}

// generate refresh token 

function generateRefreshToken(payload) {
  return jwt.sign(payload, config.refreshTokenSecret, {
    expiresIn: config.refreshTokenExpiry,
  });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, config.refreshTokenSecret);
}

module.exports = {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
};
