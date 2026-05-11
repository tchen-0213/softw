const express = require('express');
const { 
  getProducts, 
  getProductDetail, 
  searchProducts, 
  getRecommendedProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} = require('../controllers/productController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 获取商品列表
router.get('/', getProducts);

// 搜索商品
router.get('/search', searchProducts);

// 获取推荐商品
router.get('/recommended', getRecommendedProducts);

// 获取商品详情
router.get('/:id', getProductDetail);

// 创建商品（需要登录）
router.post('/', protect, createProduct);

// 更新商品（需要登录）
router.put('/:id', protect, updateProduct);

// 删除商品（需要登录）
router.delete('/:id', protect, deleteProduct);

module.exports = router;
