const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { protect } = require('../middleware/auth');

const router = express.Router();
const uploadDir = path.join(__dirname, '..', 'uploads');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext || '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('只支持上传图片文件'));
    }

    return cb(null, true);
  }
});

const handleImageUpload = (req, res, next) => {
  upload.array('images', 10)(req, res, (error) => {
    if (error) {
      return res.status(400).json({ message: error.message || '图片上传失败' });
    }

    return next();
  });
};

router.post('/images', protect, handleImageUpload, (req, res) => {
  const urls = (req.files || []).map(file => `/uploads/${file.filename}`);
  res.status(201).json({ urls });
});

module.exports = router;
