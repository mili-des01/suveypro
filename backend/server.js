'use strict';

require('./lib/asyncErrors'); // forward async route errors to error middleware

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');

const environment = require('./config/environment');
const apiRoutes = require('./routes');

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

// ── Middleware ───────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // static site uses inline config in JS; keep CSP off for simplicity
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: environment.frontendOrigin,
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Serve local uploads (only used when STORAGE_PROVIDER=local)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d', immutable: false }));

// ── API ──────────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// 404 for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found.' });
});

// ── Static frontend ──────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'frontend'), {
  extensions: ['html'],
  maxAge: '1h',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

// Friendly URL rewrites for the public site (/about → about.html etc.)
app.get(['/', '/about', '/services', '/portfolio', '/recent-jobs', '/booking', '/contact', '/faq'], (req, res, next) => {
  if (req.path === '/') return res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  res.sendFile(path.join(__dirname, '..', 'frontend', `${req.path.slice(1)}.html`), (err) => next(err));
});

// Project detail pages: /portfolio/<slug> → project.html (slug read client-side)
app.get(/^\/portfolio\/.+/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'project.html'));
});

// ── Error handler ────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err);
  if (res.headersSent) return next(err);
  const status = err.status || (err.type === 'entity.too.large' ? 413 : 500);
  res.status(status).json({ success: false, message: err.expose ? err.message : 'Something went wrong. Please try again.' });
});

function start() {
  const server = app.listen(environment.port, () => {
    console.log(`SurveyPro server running on http://localhost:${environment.port} (${environment.env})`);
  });
  return server;
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
