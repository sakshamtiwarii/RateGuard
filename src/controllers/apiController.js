async function health(req, res) {
  res.json({
    status: 'ok',
    user: req.user.email,
    role: req.user.role,
  });
}

async function getData(req, res) {
  res.json({
    message: `Hello ${req.user.email}`,
    role: req.user.role,
    timestamp: new Date().toISOString(),
  });
}

async function getPremiumData(req, res) {
  res.json({
    message: `Hello ${req.user.email}, you have access to premium data!`,
    role: req.user.role,
    timestamp: new Date().toISOString(),
  });
}

module.exports = { health, getData, getPremiumData };