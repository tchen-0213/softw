const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const multer = require('multer');
const { createImageUpload, validateUploadedImages } = require('../common/uploadSecurity');

const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

async function withUploadServer(callback) {
  const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'softw-d8-upload-'));
  const upload = createImageUpload({ multer, uploadDir, maxFileSize: 32, maxFiles: 1 });
  const app = express();
  app.post('/upload', (req, res, next) => upload.array('images', 1)(req, res, error => {
    if (error) error.status = 400;
    return error ? next(error) : next();
  }), validateUploadedImages, (req, res) => res.status(201).json({ files: req.files.map(file => ({ filename: file.filename, path: file.path })) }));
  app.use((error, req, res, next) => res.status(error.status || 500).json({ message: error.message }));
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  try {
    await callback(`http://127.0.0.1:${server.address().port}`, uploadDir);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(uploadDir, { recursive: true, force: true });
  }
}

function formWith(files) {
  const form = new FormData();
  for (const file of files) form.append('images', new Blob([file.bytes], { type: file.type }), file.name);
  return form;
}

test('D8-UPLOAD-01: 同时校验 MIME、扩展名、内容签名、大小、数量和安全路径', async () => {
  await withUploadServer(async (baseUrl, uploadDir) => {
    const valid = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: formWith([{ bytes: pngHeader, type: 'image/png', name: 'avatar.png' }])
    });
    assert.equal(valid.status, 201);
    const saved = (await valid.json()).files[0];
    assert.match(saved.filename, /^[0-9a-f-]{36}\.png$/);
    assert.equal(path.dirname(path.resolve(saved.path)), path.resolve(uploadDir));

    const mismatch = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: formWith([{ bytes: pngHeader, type: 'image/png', name: 'avatar.jpg' }])
    });
    assert.equal(mismatch.status, 400);

    const spoofed = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: formWith([{ bytes: Buffer.alloc(12), type: 'image/png', name: 'fake.png' }])
    });
    assert.equal(spoofed.status, 400);
    assert.match((await spoofed.json()).message, /文件内容/);

    const oversized = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: formWith([{ bytes: Buffer.concat([pngHeader, Buffer.alloc(64)]), type: 'image/png', name: 'large.png' }])
    });
    assert.equal(oversized.status, 400);

    const tooMany = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: formWith([
        { bytes: pngHeader, type: 'image/png', name: 'one.png' },
        { bytes: pngHeader, type: 'image/png', name: 'two.png' }
      ])
    });
    assert.equal(tooMany.status, 400);
  });
});
