'use strict';

/**
 * Shared UI helpers: toasts, date formatting, status badges, DOM utils.
 */

const UI = {
  /* ── Toasts ── */
  toast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      container.setAttribute('role', 'status');
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }
    const icons = { success: 'check-circle', error: 'alert-triangle', warning: 'alert-triangle', info: 'info' };
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.innerHTML = `${Icons.svg(icons[type] || 'info')}<span></span>`;
    el.querySelector('span').textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 300ms ease';
      setTimeout(() => el.remove(), 320);
    }, 4200);
  },

  /* ── DOM utils ── */
  esc(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  },

  el(tag, attrs = {}, html = '') {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (html) node.innerHTML = html;
    return node;
  },

  /* ── Formatting ── */
  formatDate(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  },

  formatDateTime(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) +
      ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  },

  formatBytes(bytes) {
    if (bytes == null) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  },

  /* ── Domain labels ── */
  categoryLabel(cat) {
    return { residential: 'Residential', commercial: 'Commercial', construction: 'Construction', land_development: 'Land Development', topographical: 'Topographical', boundary: 'Boundary' }[cat] || cat || '—';
  },

  /* ── Badges (icon + color + text — never color alone) ── */
  statusBadge(status) {
    const map = {
      pending: { icon: 'clock', label: 'Pending' },
      confirmed: { icon: 'check', label: 'Confirmed' },
      assigned: { icon: 'users', label: 'Assigned' },
      in_progress: { icon: 'loader-circle', label: 'In Progress' },
      completed: { icon: 'check-circle', label: 'Completed' },
      rescheduled: { icon: 'calendar-days', label: 'Rescheduled' },
      cancelled: { icon: 'x', label: 'Cancelled' },
      rejected: { icon: 'x', label: 'Rejected' },
      published: { icon: 'check-circle', label: 'Published' },
      draft: { icon: 'file-text', label: 'Draft' },
      unread: { icon: 'bell', label: 'Unread' },
      read: { icon: 'mail', label: 'Read' },
      replied: { icon: 'send', label: 'Replied' },
      archived: { icon: 'inbox', label: 'Archived' }
    };
    const meta = map[status] || { icon: 'info', label: status };
    return `<span class="badge badge--${UI.esc(status)}">${Icons.svg(meta.icon)}${UI.esc(meta.label)}</span>`;
  },

  stars(rating) {
    const r = parseInt(rating, 10) || 0;
    let html = '<span class="stars" aria-label="' + r + ' out of 5 stars">';
    for (let i = 1; i <= 5; i++) {
      html += `<span class="${i <= r ? '' : 'star--off'}" style="display:inline-flex">${Icons.svg('star')}</span>`;
    }
    return html + '</span>';
  },

  /* ── Loading / empty states ── */
  loadingBlock(text = 'Loading…') {
    return `<div class="loading-block">${Icons.svg('loader-circle')}<span>${UI.esc(text)}</span></div>`;
  },

  emptyState(title, message, icon = 'inbox') {
    return `<div class="empty-state">${Icons.svg(icon)}<h3>${UI.esc(title)}</h3><p>${UI.esc(message || '')}</p></div>`;
  },

  /* ── Pagination ── */
  renderPagination(container, { page, total, limit }, onPage) {
    if (!container) return;
    const pages = Math.max(1, Math.ceil(total / limit));
    if (pages <= 1) { container.innerHTML = ''; return; }

    container.innerHTML = '';
    const prev = UI.el('button', { type: 'button', 'aria-label': 'Previous page' });
    prev.textContent = '‹';
    prev.disabled = page <= 1;
    prev.onclick = () => onPage(page - 1);
    container.appendChild(prev);

    const start = Math.max(1, page - 2);
    const end = Math.min(pages, start + 4);
    for (let p = start; p <= end; p++) {
      const b = UI.el('button', { type: 'button' });
      b.textContent = p;
      if (p === page) b.classList.add('active');
      b.onclick = () => onPage(p);
      container.appendChild(b);
    }

    const next = UI.el('button', { type: 'button', 'aria-label': 'Next page' });
    next.textContent = '›';
    next.disabled = page >= pages;
    next.onclick = () => onPage(page + 1);
    container.appendChild(next);

    const info = UI.el('span', { class: 'page-info' });
    info.textContent = `Page ${page} of ${pages} · ${total} record${total === 1 ? '' : 's'}`;
    container.appendChild(info);
  },

  /* ── Form helpers ── */
  clearFieldErrors(form) {
    form.querySelectorAll('.field.has-error').forEach((f) => f.classList.remove('has-error'));
    form.querySelectorAll('[aria-invalid]').forEach((f) => f.removeAttribute('aria-invalid'));
    form.querySelectorAll('.form-alert').forEach((a) => a.remove());
  },

  showFieldErrors(form, errors) {
    UI.clearFieldErrors(form);
    if (!errors) return;
    for (const [name, msg] of Object.entries(errors)) {
      const input = form.querySelector(`[name="${name}"]`);
      if (!input) continue;
      const field = input.closest('.field') || input.closest('div');
      if (field) {
        field.classList.add('has-error');
        let err = field.querySelector('.field-error');
        if (!err) {
          err = document.createElement('div');
          err.className = 'field-error';
          field.appendChild(err);
        }
        err.textContent = msg;
      }
      input.setAttribute('aria-invalid', 'true');
    }
    const firstInvalid = form.querySelector('[aria-invalid="true"]');
    if (firstInvalid) firstInvalid.focus();
  },

  formAlert(form, message, type = 'error') {
    const old = form.querySelector('.form-alert');
    if (old) old.remove();
    const alert = UI.el('div', { class: `alert alert--${type} form-alert`, role: 'alert' });
    alert.innerHTML = `${Icons.svg(type === 'success' ? 'check-circle' : 'alert-triangle')}<span>${UI.esc(message)}</span>`;
    form.prepend(alert);
  },

  setBusy(button, busy, busyText) {
    if (!button) return;
    if (busy) {
      button.dataset.originalHtml = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `${Icons.svg('loader-circle')}<span>${UI.esc(busyText || 'Working…')}</span>`;
    } else {
      button.disabled = false;
      if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
    }
  }
};

window.UI = UI;
