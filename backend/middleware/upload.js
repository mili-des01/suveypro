'use strict';

/**
 * File upload handling via multer (memory storage).
 * Files are validated, then handed to the storage service.
 */

const multer = require('multer');

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
]);

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 5;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES
  },
  fileFilter(req, file, cb) {
    const ext = (file.originalname.match(/\.[^.]+$/) || [''])[0].toLowerCase();
    if (!ALLOWED_MIME.has(file.mimetype) || !ALLOWED_EXT.has(ext)) {
      const err = new Error('Invalid file type. Allowed: JPG, PNG, WEBP, PDF.');
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  }
});

module.exports = { upload, ALLOWED_MIME, ALLOWED_EXT, MAX_FILE_SIZE, MAX_FILES };
