'use strict';

require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',

  databaseUrl: process.env.DATABASE_URL || '',
  sessionSecret: process.env.SESSION_SECRET || 'surveypro-dev-secret',

  storageProvider: (process.env.STORAGE_PROVIDER || 'local').toLowerCase(),

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || ''
  },

  s3: {
    bucket: process.env.S3_BUCKET || '',
    region: process.env.S3_REGION || '',
    accessKey: process.env.S3_ACCESS_KEY || '',
    secretKey: process.env.S3_SECRET_KEY || ''
  },

  email: {
    provider: (process.env.EMAIL_PROVIDER || '').toLowerCase(),
    apiKey: process.env.EMAIL_API_KEY || '',
    from: process.env.EMAIL_FROM || 'SurveyPro <onboarding@resend.dev>',
    adminNotify: process.env.ADMIN_NOTIFY_EMAIL || ''
  }
};

if (config.storageProvider === 'cloudinary' && (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret)) {
  console.warn('[config] STORAGE_PROVIDER=cloudinary but Cloudinary credentials missing — falling back to local storage.');
  config.storageProvider = 'local';
}

if (config.email.provider && !config.email.apiKey) {
  console.warn('[config] EMAIL_PROVIDER set but EMAIL_API_KEY missing — emails will be logged to console.');
  config.email.provider = '';
}

module.exports = config;
