const express = require('express');
const { 
  createOrder, 
  getUserOrders, 
  getSellerOrders,
  getOrderDetail, 
  updateOrderStatus, 
  cancelOrder, 
  payOrder,
  shipOrder,
  confirmOrder
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 创建订单（需要登录）
router.post('/', protect, createOrder);

// 获取用户订单列表（需要登录）
router.get('/', protect, getUserOrders);

// 获取卖家订单列表（需要登录）
router.get('/seller', protect, getSellerOrders);

// 获取订单详情（需要登录）
router.get('/:id', protect, getOrderDetail);

// 更新订单状态（需要登录）
router.put('/:id', protect, updateOrderStatus);

// 取消订单（需要登录）
router.post('/:id/cancel', protect, cancelOrder);

// 支付订单（需要登录）
router.post('/:id/pay', protect, payOrder);

// 卖家发货（需要登录）
router.post('/:id/ship', protect, shipOrder);

// 买家确认收货（需要登录）
router.post('/:id/confirm', protect, confirmOrder);

module.exports = router;
