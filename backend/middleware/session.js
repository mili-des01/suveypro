'use strict';

/**
 * Session management using signed, HTTP-only cookies.
 * Deliberately dependency-light and portable — no provider lock-in.
 */

const crypto = require('crypto');
const environment = require('../config/environment');

const COOKIE_NAME = 'surveypro_session';
const MAX_AGE_S = 60 * 60 * 24 * 7; // 7 days

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function sign(payloadB64) {
  return crypto
    .createHmac('sha256', environment.sessionSecret)
    .update(payloadB64)
    .digest('base64url');
}

function createToken(payload) {
  const body = b64url(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + MAX_AGE_S * 1000 }));
  return `${body}.${sign(body)}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;

  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function setSessionCookie(res, payload) {
  const token = createToken(payload);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: environment.env === 'production',
    maxAge: MAX_AGE_S * 1000,
    path: '/'
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: environment.env === 'production', path: '/' });
}

module.exports = { COOKIE_NAME, createToken, verifyToken, setSessionCookie, clearSessionCookie };
