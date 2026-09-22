'use strict';

/**
 * Minimal API client for SurveyPro.
 * All requests hit /api/* with JSON or multipart bodies.
 */

const API = {
  async request(path, options = {}) {
    const opts = {
      method: options.method || 'GET',
      headers: {},
      credentials: 'same-origin'
    };

    if (options.body !== undefined) {
      if (options.body instanceof FormData) {
        opts.body = options.body;
      } else {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(options.body);
      }
    }

    const res = await fetch(`/api${path}`, opts);
    let payload = null;
    try { payload = await res.json(); } catch { /* non-JSON */ }

    if (!res.ok) {
      const err = new Error((payload && payload.message) || `Request failed (${res.status})`);
      err.status = res.status;
      err.errors = payload && payload.errors;
      throw err;
    }
    return payload;
  },

  get(path) { return this.request(path); },
  post(path, body) { return this.request(path, { method: 'POST', body }); },
  patch(path, body) { return this.request(path, { method: 'PATCH', body }); },
  put(path, body) { return this.request(path, { method: 'PUT', body }); },
  del(path) { return this.request(path, { method: 'DELETE' }); },

  postForm(path, formData) { return this.request(path, { method: 'POST', body: formData }); },
  patchForm(path, formData) { return this.request(path, { method: 'PATCH', body: formData }); }
};

window.API = API;
