const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.user = await User.findByPk(decoded.id, { attributes: { exclude: ['password'] } });
      next();
    } catch (error) {
      res.status(401).json({ message: '无效的认证令牌' });
    }
  }

  if (!token) {
    res.status(401).json({ message: '未提供认证令牌' });
  }
};

module.exports = { protect };