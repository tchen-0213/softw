const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (process.env.NODE_ENV === 'production' && (!secret || secret === 'your-secret-key' || secret === 'please_change_this_secret')) {
    throw new Error('生产环境必须配置安全的 JWT_SECRET');
  }

  return secret || 'your-secret-key';
};

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, getJwtSecret());
      req.user = await User.findByPk(decoded.id, { attributes: { exclude: ['password'] } });
      if (!req.user) {
        return res.status(401).json({ message: '用户不存在或登录已失效' });
      }
      next();
    } catch (error) {
      return res.status(401).json({ message: '无效的认证令牌' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: '未提供认证令牌' });
  }
};

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: '无权执行此操作' });
  }

  return next();
};

module.exports = { getJwtSecret, protect, authorizeRoles };
