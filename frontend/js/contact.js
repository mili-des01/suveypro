'use strict';

/**
 * Contact page: form submission.
 */

(function () {
  function init() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      UI.clearFieldErrors(form);

      const btn = form.querySelector('button[type="submit"]');
      UI.setBusy(btn, true, 'Sending message…');

      try {
        const payload = {
          name: form.name.value.trim(),
          email: form.email.value.trim(),
          phone: form.phone.value.trim(),
          subject: form.subject.value.trim(),
          message: form.message.value.trim()
        };
        await API.post('/messages', payload);
        UI.formAlert(form, 'Your message has been sent. We will get back to you shortly.', 'success');
        UI.toast('Message sent successfully.', 'success');
        form.reset();
      } catch (err) {
        if (err.errors) UI.showFieldErrors(form, err.errors);
        UI.formAlert(form, err.message || 'Unable to send your message. Please try again.', 'error');
      } finally {
        UI.setBusy(btn, false);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
