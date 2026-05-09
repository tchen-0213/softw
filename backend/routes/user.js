const express = require('express');
const { register, login, getUserProfile, updateUserProfile, updatePassword } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 注册
router.post('/register', register);

// 登录
router.post('/login', login);

// 获取用户信息（需要登录）
router.get('/profile', protect, getUserProfile);

// 更新用户信息（需要登录）
router.put('/profile', protect, updateUserProfile);

// 修改密码（需要登录）
router.put('/password', protect, updatePassword);

module.exports = router;