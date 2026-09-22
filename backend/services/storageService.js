'use strict';

/**
 * Storage service — pluggable file storage backend.
 *  - local      : backend/uploads (dev default)
 *  - cloudinary : via official SDK
 *  - s3         : S3-compatible endpoint via fetch + SigV4 is omitted;
 *                 set STORAGE_PROVIDER=cloudinary or use local for now.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const environment = require('../config/environment');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');

function ensureUploadRoot() {
  if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
}

function safeName(original) {
  const ext = path.extname(original).toLowerCase();
  const base = path.basename(original, path.extname(original))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'file';
  return `${base}-${crypto.randomBytes(5).toString('hex')}${ext}`;
}

/** Validate an uploaded file. Throws Error with .status on failure. */
function validateFile(file) {
  if (!file) {
    const e = new Error('No file provided.');
    e.status = 400;
    throw e;
  }
  if (file.size > 10 * 1024 * 1024) {
    const e = new Error('File exceeds the 10 MB size limit.');
    e.status = 400;
    throw e;
  }
  return true;
}

/**
 * Store a validated multer file.
 * Returns { storageProvider, storageKey, fileUrl, originalFilename, mimeType, fileSize }.
 */
async function storeFile(file, folder = 'misc') {
  validateFile(file);
  const filename = safeName(file.originalname);

  if (environment.storageProvider === 'cloudinary') {
    const { v2: cloudinary } = require('cloudinary');
    cloudinary.config({
      cloud_name: environment.cloudinary.cloudName,
      api_key: environment.cloudinary.apiKey,
      api_secret: environment.cloudinary.apiSecret
    });
    const b64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const res = await cloudinary.uploader.upload(b64, {
      folder: `surveypro/${folder}`,
      resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'image'
    });
    return {
      storageProvider: 'cloudinary',
      storageKey: res.public_id,
      fileUrl: res.secure_url,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size
    };
  }

  // Local storage (default)
  ensureUploadRoot();
  const dir = path.join(UPLOAD_ROOT, folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, filename);
  await fs.promises.writeFile(dest, file.buffer);
  return {
    storageProvider: 'local',
    storageKey: `${folder}/${filename}`,
    fileUrl: `/uploads/${folder}/${filename}`,
    originalFilename: file.originalname,
    mimeType: file.mimetype,
    fileSize: file.size
  };
}

/** Best-effort delete (local only). */
async function deleteFile(storageKey, provider = environment.storageProvider) {
  if (provider !== 'local') return; // cloud objects intentionally left for audit purposes
  const full = path.join(UPLOAD_ROOT, storageKey);
  if (full.startsWith(UPLOAD_ROOT) && fs.existsSync(full)) {
    await fs.promises.unlink(full).catch(() => {});
  }
}

module.exports = { storeFile, deleteFile, validateFile, safeName };
