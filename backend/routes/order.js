const express = require('express');
const { 
  createOrder, 
  getUserOrders, 
  getOrderDetail, 
  updateOrderStatus, 
  cancelOrder, 
  payOrder 
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 创建订单（需要登录）
router.post('/', protect, createOrder);

// 获取用户订单列表（需要登录）
router.get('/', protect, getUserOrders);

// 获取订单详情（需要登录）
router.get('/:id', protect, getOrderDetail);

// 更新订单状态（需要登录）
router.put('/:id', protect, updateOrderStatus);

// 取消订单（需要登录）
router.post('/:id/cancel', protect, cancelOrder);

// 支付订单（需要登录）
router.post('/:id/pay', protect, payOrder);

module.exports = router;