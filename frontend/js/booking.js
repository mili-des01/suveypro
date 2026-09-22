'use strict';

/**
 * Booking wizard: 4 steps — information, project, schedule, review.
 * Client-side validation mirrors server validation; files are posted as multipart.
 */

const Booking = {
  step: 1,
  totalSteps: 4,
  files: [],

  init() {
    const form = document.getElementById('booking-form');
    if (!form) return;

    form.addEventListener('submit', (e) => e.preventDefault());
    form.addEventListener('input', (e) => this.clearError(e.target));

    document.getElementById('wizard-next')?.addEventListener('click', () => this.next());
    document.getElementById('wizard-back')?.addEventListener('click', () => this.goTo(this.step - 1));
    document.getElementById('booking-form')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') e.preventDefault();
    });

    const fileInput = document.getElementById('booking-files');
    if (fileInput) {
      fileInput.addEventListener('change', () => this.addFiles(fileInput.files));
    }

    this.goTo(1, true);
    this.loadServices();
  },

  async loadServices() {
    const select = document.getElementById('bf-service');
    if (!select) return;
    try {
      const res = await API.get('/services');
      select.innerHTML = '<option value="">Select a service…</option>' +
        (res.data || []).map((s) => `<option value="${s.id}">${UI.esc(s.name)}</option>`).join('');
    } catch {
      select.innerHTML = '<option value="">Unable to load services</option>';
    }
  },

  goTo(step, silent) {
    if (step < 1 || step > this.totalSteps) return;
    if (!silent && step > this.step && !this.validateStep(this.step)) return;
    this.step = step;

    document.querySelectorAll('.wizard-pane').forEach((p, i) => {
      p.classList.toggle('active', i === step - 1);
    });

    const items = document.querySelectorAll('.wizard-progress li');
    items.forEach((li, i) => {
      const stepEl = li.querySelector('.wizard-step');
      const line = li.querySelector('.wizard-line');
      stepEl.classList.toggle('active', i === step - 1);
      stepEl.classList.toggle('done', i < step - 1);
      if (line) line.classList.toggle('done', i < step - 1);
      const dot = stepEl.querySelector('.step-dot');
      dot.innerHTML = i < step - 1 ? Icons.svg('check') : String(i + 1);
    });

    const reviewBtn = document.getElementById('wizard-next');
    if (reviewBtn) {
      const isLast = step === this.totalSteps;
      reviewBtn.innerHTML = isLast
        ? `${Icons.svg('check')}<span>Submit Request</span>`
        : `Next ${Icons.svg('arrow-right')}`;
    }
    document.querySelector('.wizard-progress')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  next() {
    if (this.step === this.totalSteps) return this.submit();
    this.goTo(this.step + 1);
  },

  validateStep(step) {
    const form = document.getElementById('booking-form');
    UI.clearFieldErrors(form);
    const errors = {};

    if (step === 1) {
      if (!form.fullName.value.trim()) errors.fullName = 'Please enter your full name.';
      else if (form.fullName.value.trim().length > 120) errors.fullName = 'Name is too long.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.value.trim())) errors.email = 'Please enter a valid email address.';
      if (!/^[+()\-.0-9\s]{7,25}$/.test(form.phone.value.trim())) errors.phone = 'Please enter a valid phone number.';
    }

    if (step === 2) {
      if (!form.serviceId.value) errors.serviceId = 'Please choose a survey service.';
      if (!form.propertyAddress.value.trim()) errors.propertyAddress = 'Please enter the property address.';
      if (!form.city.value.trim()) errors.city = 'Please enter the city or area.';
    }

    if (step === 3) {
      if (form.preferredDate.value && form.alternativeDate.value &&
          form.alternativeDate.value < form.preferredDate.value) {
        errors.alternativeDate = 'Alternative date should be after the preferred date.';
      }
    }

    if (Object.keys(errors).length) {
      UI.showFieldErrors(form, errors);
      UI.toast('Please complete the required fields.', 'warning');
      return false;
    }
    return true;
  },

  clearError(input) {
    const field = input.closest('.field');
    if (field) field.classList.remove('has-error');
    input.removeAttribute('aria-invalid');
  },

  addFiles(fileList) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    for (const file of fileList) {
      if (this.files.length >= 5) { UI.toast('Maximum 5 files allowed.', 'warning'); break; }
      if (!allowed.includes(file.type)) { UI.toast(`"${file.name}" is not an allowed type. Use JPG, PNG, WEBP or PDF.`, 'error'); continue; }
      if (file.size > 10 * 1024 * 1024) { UI.toast(`"${file.name}" exceeds the 10 MB limit.`, 'error'); continue; }
      this.files.push(file);
    }
    this.renderFiles();
  },

  removeFile(index) {
    this.files.splice(index, 1);
    this.renderFiles();
  },

  renderFiles() {
    const list = document.getElementById('file-list');
    if (!list) return;
    list.innerHTML = this.files.map((f, i) => `
      <div class="file-item">
        ${Icons.svg('file-text')}
        <span>${UI.esc(f.name)}</span>
        <span class="file-size">${UI.formatBytes(f.size)}</span>
        <button type="button" class="file-remove" aria-label="Remove ${UI.esc(f.name)}" data-index="${i}">${Icons.svg('x')}</button>
      </div>`).join('');
    Icons.render(list);
    list.querySelectorAll('.file-remove').forEach((btn) => {
      btn.addEventListener('click', () => this.removeFile(parseInt(btn.dataset.index, 10)));
    });
  },

  collect() {
    const form = document.getElementById('booking-form');
    return {
      fullName: form.fullName.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      serviceId: form.serviceId.value,
      propertyAddress: form.propertyAddress.value.trim(),
      city: form.city.value.trim(),
      propertyType: form.propertyType.value,
      propertySize: form.propertySize.value.trim(),
      preferredDate: form.preferredDate.value,
      preferredTime: form.preferredTime.value,
      alternativeDate: form.alternativeDate.value,
      description: form.description.value.trim()
    };
  },

  renderReview() {
    const box = document.getElementById('review-summary');
    if (!box) return;
    const d = this.collect();
    const serviceName = document.querySelector(`#bf-service option[value="${d.serviceId}"]`)?.textContent || '—';
    const rows = [
      ['Full Name', d.fullName], ['Email', d.email], ['Phone', d.phone],
      ['Service', serviceName], ['Property Address', d.propertyAddress], ['City / Area', d.city],
      ['Property Type', d.propertyType || '—'], ['Estimated Size', d.propertySize || '—'],
      ['Preferred Date', d.preferredDate || '—'], ['Preferred Time', d.preferredTime || '—'],
      ['Alternative Date', d.alternativeDate || '—'], ['Project Details', d.description || '—'],
      ['Attachments', this.files.length ? `${this.files.length} file(s)` : 'None']
    ];
    box.innerHTML = rows.map(([label, value]) => `
      <div><dt>${UI.esc(label)}</dt><dd>${UI.esc(value)}</dd></div>`).join('');
  },

  async submit() {
    const form = document.getElementById('booking-form');
    const btn = document.getElementById('wizard-next');
    UI.setBusy(btn, true, 'Submitting request…');

    try {
      const fd = new FormData();
      for (const [k, v] of Object.entries(this.collect())) fd.append(k, v);
      for (const f of this.files) fd.append('attachments', f, f.name);

      const res = await API.postForm('/bookings', fd);

      // Show confirmation panel
      document.getElementById('booking-wizard').style.display = 'none';
      const panel = document.getElementById('booking-confirmation');
      panel.style.display = 'block';
      document.getElementById('confirm-name').textContent = res.booking.fullName;
      document.getElementById('confirm-ref').textContent = res.booking.bookingReference;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      UI.setBusy(btn, false);
      if (err.errors) {
        UI.showFieldErrors(form, err.errors);
        this.goTo(1, true);
      }
      UI.toast(err.message || 'Something went wrong while submitting your request.', 'error');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => Booking.init());
window.BookingWizard = Booking;
