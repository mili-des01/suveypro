'use strict';

/**
 * Vercel serverless entrypoint. Exports the Express app so the
 * platform can wrap it in a Lambda handler (see ../backend/server.js
 * for the same app in long-running/`npm start` mode).
 */

const { app } = require('../backend/server');

module.exports = app;
