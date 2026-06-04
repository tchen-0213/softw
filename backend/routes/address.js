const express = require('express');
const { getAddresses, replaceAddresses } = require('../controllers/addressController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getAddresses);
router.put('/', protect, replaceAddresses);

module.exports = router;
