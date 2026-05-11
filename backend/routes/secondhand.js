const express = require('express');
const { 
  getProducts, 
  getProductDetail, 
  searchProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} = require('../controllers/productController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 获取二手商品列表
router.get('/', (req, res, next) => {
  // 添加过滤条件，只返回二手商品
  req.query.isSecondhand = true;
  next();
}, getProducts);

// 搜索二手商品
router.get('/search', (req, res, next) => {
  // 添加过滤条件，只搜索二手商品
  req.query.isSecondhand = true;
  next();
}, searchProducts);

// 获取二手商品详情
router.get('/:id', getProductDetail);

// 发布二手商品（需要登录）
router.post('/', protect, (req, res, next) => {
  // 设置为二手商品
  req.body.isSecondhand = true;
  next();
}, createProduct);

// 更新二手商品（需要登录）
router.put('/:id', protect, updateProduct);

// 删除二手商品（需要登录）
router.delete('/:id', protect, deleteProduct);

module.exports = router;
