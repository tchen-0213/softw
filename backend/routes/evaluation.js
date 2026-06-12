const express = require('express');
const { 
  createEvaluation, 
  getProductEvaluations, 
  getUserEvaluations,
  getSellerEvaluations,
  replyEvaluation, 
  approveEvaluation 
} = require('../controllers/evaluationController');
const { protect, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// 创建评价（需要登录）
router.post('/', protect, createEvaluation);

// 获取商品的评价列表
router.get('/product', getProductEvaluations);

// 获取用户的评价历史（需要登录）
router.get('/user', protect, getUserEvaluations);

// 获取卖家收到的评价（需要登录）
router.get('/seller', protect, getSellerEvaluations);

// 回复评价（需要登录）
router.put('/:id/reply', protect, replyEvaluation);

// 审核评价（需要登录）
router.put('/:id/approve', protect, authorizeRoles('admin'), approveEvaluation);

module.exports = router;
