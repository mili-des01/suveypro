'use strict';

/**
 * Server-side validation helpers. Every API write path validates here —
 * frontend validation is a convenience, never the gate.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+()\-.-\s0-9]{7,25}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isNonEmptyString(v, max = 255) {
  return typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max;
}

function isEmail(v) {
  return typeof v === 'string' && v.length <= 180 && EMAIL_RE.test(v.trim());
}

function isPhone(v) {
  return typeof v === 'string' && PHONE_RE.test(v.trim());
}

function isDate(v) {
  if (typeof v !== 'string' || !DATE_RE.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

function isRating(v) {
  return Number.isInteger(v) && v >= 1 && v <= 5;
}

function clampInt(v, min, max, fallback) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Validate booking submission payload. Returns { valid, errors, data }. */
function validateBooking(body) {
  const errors = {};
  const data = {};

  if (isNonEmptyString(body.fullName, 120)) data.fullName = body.fullName.trim();
  else errors.fullName = 'Please enter your full name.';

  if (isEmail(body.email)) data.email = body.email.trim().toLowerCase();
  else errors.email = 'Please enter a valid email address.';

  if (isPhone(body.phone)) data.phone = body.phone.trim();
  else errors.phone = 'Please enter a valid phone number.';

  if (isNonEmptyString(body.propertyAddress, 300)) data.propertyAddress = body.propertyAddress.trim();
  else errors.propertyAddress = 'Please enter the property address.';

  if (isNonEmptyString(body.city, 120)) data.city = body.city.trim();
  else errors.city = 'Please enter the city or area.';

  if (body.serviceId !== undefined && body.serviceId !== null && body.serviceId !== '') {
    const n = parseInt(body.serviceId, 10);
    if (!Number.isNaN(n) && n > 0) data.serviceId = n;
    else errors.serviceId = 'Please choose a survey service.';
  } else if (body.serviceSlug) {
    data.serviceSlug = String(body.serviceSlug).slice(0, 140);
  } else {
    errors.serviceId = 'Please choose a survey service.';
  }

  if (isNonEmptyString(body.propertyType, 60)) data.propertyType = body.propertyType.trim();
  if (isNonEmptyString(body.propertySize, 60)) data.propertySize = body.propertySize.trim();

  if (body.preferredDate) {
    if (isDate(body.preferredDate)) data.preferredDate = body.preferredDate;
    else errors.preferredDate = 'Preferred date must be a valid date.';
  }
  if (isNonEmptyString(body.preferredTime, 20)) data.preferredTime = body.preferredTime.trim();
  if (body.alternativeDate) {
    if (isDate(body.alternativeDate)) data.alternativeDate = body.alternativeDate;
    else errors.alternativeDate = 'Alternative date must be a valid date.';
  }

  if (body.description) {
    if (typeof body.description === 'string' && body.description.length <= 4000) data.description = body.description.trim();
    else errors.description = 'Description must be under 4000 characters.';
  }

  return { valid: Object.keys(errors).length === 0, errors, data };
}

/** Validate contact message payload. */
function validateMessage(body) {
  const errors = {};
  const data = {};

  if (isNonEmptyString(body.name, 120)) data.name = body.name.trim();
  else errors.name = 'Please enter your name.';

  if (isEmail(body.email)) data.email = body.email.trim().toLowerCase();
  else errors.email = 'Please enter a valid email address.';

  if (body.phone) {
    if (isPhone(body.phone)) data.phone = body.phone.trim();
    else errors.phone = 'Please enter a valid phone number.';
  }

  if (isNonEmptyString(body.subject, 200)) data.subject = body.subject.trim();
  if (isNonEmptyString(body.message, 4000)) data.message = body.message.trim();
  else errors.message = 'Please enter a message.';

  return { valid: Object.keys(errors).length === 0, errors, data };
}

/** Validate admin project payload. */
function validateProject(body, { partial = false } = {}) {
  const errors = {};
  const data = {};

  if (body.title !== undefined || !partial) {
    if (isNonEmptyString(body.title, 180)) data.title = body.title.trim();
    else errors.title = 'Project title is required.';
  }
  if (body.category !== undefined || !partial) {
    const cat = String(body.category || '');
    if (['residential', 'commercial', 'construction', 'land_development', 'topographical', 'boundary'].includes(cat)) data.category = cat;
    else errors.category = 'Please choose a valid category.';
  }
  if (body.services !== undefined) {
    if (Array.isArray(body.services)) data.services = body.services.map((s) => String(s).slice(0, 120)).slice(0, 12);
    else if (typeof body.services === 'string') data.services = body.services.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (body.completionDate) {
    if (isDate(body.completionDate)) data.completionDate = body.completionDate;
    else errors.completionDate = 'Completion date must be a valid date.';
  }
  if (body.featured !== undefined) data.featured = body.featured === true || body.featured === 'true';
  if (body.published !== undefined) data.published = body.published === true || body.published === 'true';

  for (const key of ['location', 'description', 'challenge', 'approach', 'result', 'coverImageUrl', 'coverImageKey']) {
    if (body[key] !== undefined) {
      if (typeof body[key] === 'string') {
        if (body[key].length > 8000) errors[key] = 'Value too long.';
        else data[key] = body[key].trim() || null;
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors, data };
}

module.exports = {
  isEmail, isPhone, isDate, isRating, isNonEmptyString, clampInt,
  validateBooking, validateMessage, validateProject
};
