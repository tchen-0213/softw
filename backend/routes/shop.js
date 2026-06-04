const express = require('express');
const { getMyShop, updateMyShop, getShopDetail } = require('../controllers/shopController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/mine', protect, getMyShop);
router.put('/mine', protect, updateMyShop);
router.get('/:id', getShopDetail);

module.exports = router;
