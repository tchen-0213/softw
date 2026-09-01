const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const MIME_BY_EXTENSION = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp']
]);

function createImageUpload({ multer, uploadDir, maxFileSize = 5 * 1024 * 1024, maxFiles = 10 }) {
  const safeRoot = path.resolve(uploadDir);
  fs.mkdirSync(safeRoot, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, callback) => callback(null, safeRoot),
    filename: (req, file, callback) => {
      const extension = path.extname(file.originalname || '').toLowerCase();
      const filename = `${randomUUID()}${extension}`;
      const destination = path.resolve(safeRoot, filename);
      if (!destination.startsWith(`${safeRoot}${path.sep}`)) {
        return callback(Object.assign(new Error('上传路径不安全'), { status: 400 }));
      }
      return callback(null, filename);
    }
  });

  return multer({
    storage,
    limits: { fileSize: maxFileSize, files: maxFiles, fields: 10, parts: maxFiles + 10 },
    fileFilter: (req, file, callback) => {
      const originalName = String(file.originalname || '');
      const normalizedName = originalName.replace(/\\/g, '/');
      const extension = path.extname(normalizedName).toLowerCase();
      const expectedMime = MIME_BY_EXTENSION.get(extension);
      if (path.basename(normalizedName) !== normalizedName || !expectedMime || file.mimetype !== expectedMime) {
        return callback(Object.assign(new Error('文件扩展名与 MIME 类型必须匹配 jpg、png、gif 或 webp'), { status: 400 }));
      }
      return callback(null, true);
    }
  });
}

function matchesSignature(buffer, mimeType) {
  if (mimeType === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === 'image/gif') return ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'));
  if (mimeType === 'image/webp') return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  return false;
}

async function validateUploadedImages(req, res, next) {
  try {
    for (const file of req.files || []) {
      const handle = await fs.promises.open(file.path, 'r');
      const header = Buffer.alloc(12);
      try {
        await handle.read(header, 0, header.length, 0);
      } finally {
        await handle.close();
      }
      if (!matchesSignature(header, file.mimetype)) {
        const error = new Error('文件内容与声明的图片类型不匹配');
        error.status = 400;
        throw error;
      }
    }
    return next();
  } catch (error) {
    await Promise.all((req.files || []).map(file => fs.promises.rm(file.path, { force: true }).catch(() => {})));
    return next(error);
  }
}

module.exports = { createImageUpload, matchesSignature, MIME_BY_EXTENSION, validateUploadedImages };
