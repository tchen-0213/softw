const User = require('../models/User');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');

// 生成JWT令牌
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d'
  });
};

// 用户注册
exports.register = async (req, res) => {
  const { username, password, phone, email } = req.body;

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
      email: user.email,
      token: generateToken(user.id)
    });
  } catch (error) {
    res.status(500).json({ message: '注册失败', error: error.message });
  }
};

// 用户登录
exports.login = async (req, res) => {
  const { email, password } = req.body;

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
      email: user.email,
      token: generateToken(user.id)
    });
  } catch (error) {
    res.status(500).json({ message: '登录失败', error: error.message });
  }
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

    const { nickname, avatar, gender, birthday } = req.body;
    await user.update({
      nickname: nickname || user.nickname,
      avatar: avatar || user.avatar,
      gender: gender || user.gender,
      birthday: birthday || user.birthday
    });

    res.json(user);
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