const User = require('../models/User');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../middleware/auth');

// 生成JWT令牌
const generateToken = (id) => {
  return jwt.sign({ id }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''));

const validateRegisterPayload = ({ username, password, phone, email }) => {
  if (!String(username || '').trim()) {
    return '用户名不能为空';
  }
  if (!isValidEmail(email)) {
    return '邮箱格式不正确';
  }
  if (!String(phone || '').trim()) {
    return '手机号不能为空';
  }
  if (String(password || '').length < 6) {
    return '密码长度不能少于6位';
  }
  return null;
};

// 用户注册
exports.register = async (req, res) => {
  const { username, password, phone, email } = req.body;
  const validationError = validateRegisterPayload(req.body);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const userExists = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }]
      }
    });
    if (userExists) {
      return res.status(400).json({ message: '用户已存在' });
    }

    const user = await User.create({
      username,
      password,
      phone,
      email
    });

    res.status(201).json({
      _id: user.id,
      username: user.username,
      nickname: user.nickname,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      creditLevel: user.creditLevel,
      creditScore: user.creditScore,
      role: user.role,
      token: generateToken(user.id)
    });
  } catch (error) {
    res.status(500).json({ message: '注册失败', error: error.message });
  }
};

// 用户登录
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!isValidEmail(email) || !password) {
    return res.status(400).json({ message: '邮箱或密码格式不正确' });
  }

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: '用户不存在' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: '密码错误' });
    }

    res.json({
      _id: user.id,
      username: user.username,
      nickname: user.nickname,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      creditLevel: user.creditLevel,
      creditScore: user.creditScore,
      role: user.role,
      token: generateToken(user.id)
    });
  } catch (error) {
    res.status(500).json({ message: '登录失败', error: error.message });
  }
};

exports._internal = {
  isValidEmail,
  validateRegisterPayload
};

// 获取用户信息
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: '获取用户信息失败', error: error.message });
  }
};

// 更新用户信息
exports.updateUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const { nickname, avatar, gender, birthday, phone, email } = req.body;

    if (email && email !== user.email) {
      const emailExists = await User.findOne({
        where: {
          email,
          id: { [Op.ne]: user.id }
        }
      });
      if (emailExists) {
        return res.status(400).json({ message: '邮箱已被使用' });
      }
    }

    await user.update({
      nickname: nickname || user.nickname,
      avatar: avatar || user.avatar,
      gender: gender || user.gender,
      birthday: birthday || user.birthday,
      phone: phone || user.phone,
      email: email || user.email
    });

    const safeUser = user.toJSON();
    delete safeUser.password;
    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ message: '更新用户信息失败', error: error.message });
  }
};

// 修改密码
exports.updatePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({ message: '旧密码错误' });
    }

    await user.update({ password: newPassword });

    res.json({ message: '密码修改成功' });
  } catch (error) {
    res.status(500).json({ message: '修改密码失败', error: error.message });
  }
};
