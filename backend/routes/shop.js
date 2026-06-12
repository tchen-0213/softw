const express = require('express');
const { getMyShop, updateMyShop, getShopDetail, getShopByUserId } = require('../controllers/shopController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/mine', protect, getMyShop);
router.put('/mine', protect, updateMyShop);
router.get('/user/:userId', getShopByUserId);
router.get('/:id', getShopDetail);

module.exports = router;
