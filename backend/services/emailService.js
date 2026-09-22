'use strict';

/**
 * Email service. Uses Resend when configured; otherwise logs to console
 * so local development works with zero external setup.
 */

const environment = require('../config/environment');

let resend = null;
if (environment.email.provider === 'resend' && environment.email.apiKey) {
  const { Resend } = require('resend');
  resend = new Resend(environment.email.apiKey);
}

function isConfigured() {
  return resend !== null;
}

/**
 * Send an email. Returns { sent, provider, id?, error? }.
 * Never throws — email failures must not break the main flow.
 */
async function sendEmail({ to, subject, html }) {
  if (!to) return { sent: false, provider: 'skipped', error: 'No recipient' };

  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: environment.email.from,
        to: [to],
        subject,
        html
      });
      if (error) {
        console.error(`[email] Resend error (${to}):`, error.message || error);
        return { sent: false, provider: 'resend', error: error.message || String(error) };
      }
      console.log(`[email] Sent via Resend → ${to} | "${subject}" (id: ${data?.id})`);
      return { sent: true, provider: 'resend', id: data?.id };
    } catch (err) {
      // Never let email failures break the main flow
      console.error('[email] Send failed:', err.message);
      return { sent: false, provider: 'resend', error: err.message };
    }
  }

  console.log(`[email:dev] To: ${to} | Subject: ${subject}`);
  return { sent: false, provider: 'console', error: 'Resend not configured' };
}

function wrapHtml(title, bodyHtml) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#20252B;">
    <h2 style="color:#172433;">${title}</h2>
    ${bodyHtml}
    <p style="color:#6B7280;font-size:12px;margin-top:24px;">— SurveyPro · Land Surveying Services</p>
  </div>`;
}

const templates = {
  bookingReceivedAdmin: (b) => ({
    subject: `New survey booking ${b.bookingReference}`,
    html: wrapHtml('New survey booking received', `
      <p><strong>${b.fullName}</strong> requested a <strong>${b.serviceName || 'survey'}</strong>.</p>
      <p>Property: ${b.propertyAddress}, ${b.city}<br>
      Preferred date: ${b.preferredDate || '—'}<br>
      Phone: ${b.phone}<br>
      Email: ${b.email}</p>
      <p>Reference: <strong>${b.bookingReference}</strong></p>`)
  }),
  bookingReceivedClient: (b) => ({
    subject: `We received your survey request (${b.bookingReference})`,
    html: wrapHtml('Booking request received', `
      <p>Hi ${b.fullName},</p>
      <p>Thank you for your survey request. Our team will review it and contact you shortly.</p>
      <p>Your booking reference is <strong>${b.bookingReference}</strong>.</p>`)
  }),
  bookingConfirmed: (b) => ({
    subject: `Your survey appointment is confirmed (${b.bookingReference})`,
    html: wrapHtml('Survey appointment confirmed', `
      <p>Hi ${b.fullName},</p>
      <p>Your <strong>${b.serviceName || 'survey'}</strong> appointment on <strong>${b.preferredDate || 'the agreed date'}</strong> has been confirmed.</p>
      <p>Reference: <strong>${b.bookingReference}</strong></p>`)
  }),
  bookingRescheduled: (b) => ({
    subject: `Your survey appointment was rescheduled (${b.bookingReference})`,
    html: wrapHtml('Survey appointment rescheduled', `
      <p>Hi ${b.fullName},</p>
      <p>Your survey appointment has been rescheduled. Our team will confirm the new date with you.</p>
      <p>Reference: <strong>${b.bookingReference}</strong></p>`)
  }),
  bookingCompleted: (b) => ({
    subject: `Your survey is complete (${b.bookingReference})`,
    html: wrapHtml('Survey completed', `
      <p>Hi ${b.fullName},</p>
      <p>Your survey request has been marked as completed. Thank you for choosing SurveyPro.</p>
      <p>Reference: <strong>${b.bookingReference}</strong></p>`)
  })
};

async function sendTemplate(templateName, data, toOverride) {
  const t = templates[templateName];
  if (!t) return { sent: false, provider: 'skipped', error: `Unknown template: ${templateName}` };
  const { subject, html } = t(data);
  const to = toOverride || data.email;
  return sendEmail({ to, subject, html });
}

module.exports = { sendEmail, sendTemplate, templates, isConfigured, wrapHtml };
