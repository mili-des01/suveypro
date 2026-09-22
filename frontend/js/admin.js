'use strict';

/**
 * Admin core: session guard, sidebar/topbar rendering, shared table/modal helpers.
 */

const Admin = {
  user: null,

  async requireSession() {
    try {
      const res = await API.get('/auth/me');
      this.user = res.user;
      return this.user;
    } catch {
      window.location.href = '/admin/login.html';
      return null;
    }
  },

  allowed(route) {
    const role = this.user && this.user.role;
    if (!role) return false;
    if (role === 'admin') return true;
    if (role === 'manager') return route !== 'users';
    return false; // surveyor/staff: read-only UI (API enforces server-side too)
  },

  async renderShell(active, title) {
    await this.requireSession();
    if (!this.user) return false;
    if (['surveyor', 'staff'].includes(this.user.role)) {
      document.body.innerHTML = `
        <div class="login-page"><div class="login-card" style="text-align:center;">
          <h2 style="margin-bottom:8px;">Limited Access</h2>
          <p style="color:var(--gray);">Your role (${UI.esc(this.user.role)}) has read-only access.
          Please contact an administrator.</p>
          <button class="btn btn--primary" onclick="API.post('/auth/logout').then(()=>location.href='/admin/login.html')">Log Out</button>
        </div></div>`;
      return false;
    }

    document.title = `${title} | SurveyPro Admin`;

    const nav = [
      ['dashboard', 'Dashboard', 'layout-dashboard', '/admin/dashboard.html'],
      ['bookings', 'Bookings', 'clipboard-list', '/admin/bookings.html'],
      ['clients', 'Clients', 'users', '/admin/clients.html'],
      ['projects', 'Projects', 'briefcase', '/admin/projects.html'],
      ['recent-jobs', 'Recent Jobs', 'map', '/admin/recent-jobs.html'],
      ['services', 'Services', 'ruler', '/admin/services.html'],
      ['testimonials', 'Testimonials', 'star', '/admin/testimonials.html'],
      ['messages', 'Messages', 'inbox', '/admin/messages.html'],
      ['users', 'Users', 'shield', '/admin/users.html'],
      ['settings', 'Settings', 'settings', '/admin/settings.html']
    ];

    const initials = (this.user.name || 'A').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    const sidebar = `
      <aside class="admin-sidebar" id="admin-sidebar">
        <a class="sidebar-brand" href="/admin/dashboard.html">
          <img class="logo-mark" src="/assets/logos/logo.svg" alt="">
          <span>Survey<span>Pro</span> Admin</span>
        </a>
        <nav class="sidebar-nav" aria-label="Admin navigation">
          ${nav.map(([key, label, icon, href]) => {
            const locked = (key === 'users' && this.user.role !== 'admin');
            return `<a class="sidebar-link ${key === active ? 'active' : ''}" href="${href}"
                      ${locked ? 'style="opacity:.4;pointer-events:none;" title="Admin only"' : ''}>
                    ${Icons.svg(icon)}<span>${label}</span>
                    ${key === 'bookings' ? '<span class="nav-count" id="nav-pending-count" style="display:none;"></span>' : ''}
                  </a>`;
          }).join('')}
        </nav>
        <div class="sidebar-footer">
          <div class="sidebar-user">
            <div class="sidebar-avatar">${UI.esc(initials)}</div>
            <div class="sidebar-user-info">
              <div class="name">${UI.esc(this.user.name)}</div>
              <div class="role">${UI.esc(this.user.role)}</div>
            </div>
          </div>
          <button class="btn btn--sm btn--ghost-light sidebar-logout" id="admin-logout">
            ${Icons.svg('log-out')}<span>Log Out</span>
          </button>
        </div>
      </aside>`;

    document.body.insertAdjacentHTML('afterbegin', sidebar);

    const main = document.createElement('div');
    main.className = 'admin-main';
    while (document.body.firstChild && document.body.firstChild.id !== 'admin-sidebar') {
      if (document.body.firstChild.nodeType === 1 && document.body.firstChild !== document.querySelector('.admin-sidebar')) {
        main.appendChild(document.body.firstChild);
      } else if (document.body.firstChild.id === 'admin-sidebar') break;
      else document.body.removeChild(document.body.firstChild);
    }
    // Simpler: move all remaining nodes into main
    while (document.body.childNodes.length > 1) {
      const node = document.body.childNodes[1];
      main.appendChild(node);
    }
    document.body.appendChild(main);

    document.getElementById('admin-logout').addEventListener('click', async () => {
      await API.post('/auth/logout');
      window.location.href = '/admin/login.html';
    });

    document.body.classList.add('admin-body');
    Icons.render(); // render sidebar icons

    // Mobile sidebar toggle
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'icon-btn sidebar-toggle';
    toggleBtn.setAttribute('aria-label', 'Toggle sidebar');
    toggleBtn.innerHTML = Icons.svg('menu');
    toggleBtn.addEventListener('click', () => {
      const sb = document.getElementById('admin-sidebar');
      sb.classList.toggle('open');
      if (sb.classList.contains('open')) {
        const overlay = UI.el('div', { class: 'sidebar-overlay', id: 'sidebar-overlay' });
        overlay.addEventListener('click', () => { sb.classList.remove('open'); overlay.remove(); });
        document.body.appendChild(overlay);
      } else {
        document.getElementById('sidebar-overlay')?.remove();
      }
    });
    document.querySelector('.topbar-left')?.prepend(toggleBtn);

    this.refreshPendingCount();
    return true;
  },

  async refreshPendingCount() {
    try {
      const res = await API.get('/dashboard/overview');
      const pending = res.stats.pendingBookings;
      const badge = document.getElementById('nav-pending-count');
      if (badge && pending > 0) {
        badge.textContent = pending;
        badge.style.display = '';
      }
    } catch { /* non-fatal */ }
  },

  confirmDialog(message, onConfirm, { danger = true, confirmText = 'Delete' } = {}) {
    const overlay = UI.el('div', { class: 'modal-overlay open', role: 'dialog', 'aria-modal': 'true' });
    overlay.innerHTML = `
      <div class="modal" style="max-width:420px;">
        <div class="modal-head"><h3>Are you sure?</h3>
          <button class="modal-close" aria-label="Close">${Icons.svg('x')}</button></div>
        <div class="modal-body"><p style="margin:0;">${UI.esc(message)}</p></div>
        <div class="modal-foot">
          <button class="btn btn--outline" data-cancel>Cancel</button>
          <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-ok>${UI.esc(confirmText)}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('.modal-close').onclick = close;
    overlay.querySelector('[data-cancel]').onclick = close;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('[data-ok]').onclick = async () => { close(); await onConfirm(); };
  },

  /* Standard table builder */
  table(columns, rows, { emptyTitle = 'Nothing here yet', emptyMessage = '', emptyIcon = 'inbox' } = {}) {
    if (!rows.length) {
      return `<div class="empty-state">${Icons.svg(emptyIcon)}<h3>${UI.esc(emptyTitle)}</h3><p>${UI.esc(emptyMessage)}</p></div>`;
    }
    return `
      <div class="table-wrap"><table class="table">
        <thead><tr>${columns.map((c) => `<th style="${c.width ? `width:${c.width};` : ''}${c.right ? 'text-align:right;' : ''}">${UI.esc(c.label)}</th>`).join('')}</tr></thead>
        <tbody>
          ${rows.map((row) => `<tr>${columns.map((c) => `<td style="${c.right ? 'text-align:right;' : ''}">${c.render(row)}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table></div>`;
  },

  openModal(title, bodyHtml, { wide = false } = {}) {
    const overlay = UI.el('div', { class: 'modal-overlay open', role: 'dialog', 'aria-modal': 'true' });
    overlay.innerHTML = `
      <div class="modal ${wide ? 'modal--wide' : ''}">
        <div class="modal-head"><h3>${UI.esc(title)}</h3>
          <button class="modal-close" aria-label="Close">${Icons.svg('x')}</button></div>
        <div class="modal-body">${bodyHtml}</div>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('.modal-close').onclick = close;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    Icons.render(overlay);
    return { overlay, close };
  }
};

window.Admin = Admin;
