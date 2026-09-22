'use strict';

/**
 * Admin dashboard overview page.
 */

(async function () {
  if (!(await Admin.renderShell('dashboard', 'Dashboard'))) return;

  const content = document.getElementById('dashboard-content');
  if (!content) return;

  content.innerHTML = UI.loadingBlock('Loading dashboard…');

  try {
    const res = await API.get('/dashboard/overview');
    const { stats, monthlyBookings, popularServices, recentBookings } = res;

    const maxMonthly = Math.max(...monthlyBookings.map((m) => m.count), 1);
    const maxService = Math.max(...popularServices.map((s) => s.booking_count), 1);

    content.innerHTML = `
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-top"><span class="stat-title">Total Bookings</span>
            <span class="stat-icon">${Icons.svg('clipboard-list')}</span></div>
          <div class="stat-num">${stats.totalBookings}</div>
          <div class="stat-hint">${stats.last30Hint || ''}</div>
        </div>
        <div class="stat-card">
          <div class="stat-top"><span class="stat-title">Pending</span>
            <span class="stat-icon">${Icons.svg('clock')}</span></div>
          <div class="stat-num">${stats.pendingBookings}</div>
          <div class="stat-hint">Awaiting review</div>
        </div>
        <div class="stat-card">
          <div class="stat-top"><span class="stat-title">Completed Jobs</span>
            <span class="stat-icon">${Icons.svg('check-circle')}</span></div>
          <div class="stat-num">${stats.completedBookings}</div>
          <div class="stat-hint">All time</div>
        </div>
        <div class="stat-card">
          <div class="stat-top"><span class="stat-title">Projects</span>
            <span class="stat-icon">${Icons.svg('briefcase')}</span></div>
          <div class="stat-num">${stats.totalProjects}</div>
          <div class="stat-hint">${stats.publishedProjects} published</div>
        </div>
        <div class="stat-card">
          <div class="stat-top"><span class="stat-title">Unread Messages</span>
            <span class="stat-icon">${Icons.svg('inbox')}</span></div>
          <div class="stat-num">${stats.unreadMessages}</div>
          <div class="stat-hint">In contact inbox</div>
        </div>
      </div>

      <div class="grid" style="grid-template-columns:1.4fr 1fr;align-items:start;">
        <div class="panel">
          <div class="panel-head"><div><h2>Booking Activity</h2><div class="panel-sub">New bookings per month — last 6 months</div></div></div>
          <div class="panel-body">
            <div class="chart-bars">
              ${monthlyBookings.map((m) => `
                <div class="chart-bar-col">
                  <span class="chart-bar-value">${m.count}</span>
                  <div class="chart-bar" style="height:${Math.round((m.count / maxMonthly) * 100)}%;"></div>
                  <span class="chart-bar-label">${UI.esc(m.label.split(' ')[0])}</span>
                </div>`).join('')}
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head"><div><h2>Popular Services</h2><div class="panel-sub">Bookings by service</div></div></div>
          <div class="panel-body">
            <div class="hbar-list">
              ${popularServices.map((s) => `
                <div class="hbar-row">
                  <span>${UI.esc(s.name)}</span>
                  <div class="hbar-track"><div class="hbar-fill" style="width:${Math.round((s.booking_count / maxService) * 100)}%;"></div></div>
                  <span class="hbar-count">${s.booking_count}</span>
                </div>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <div><h2>Recent Bookings</h2><div class="panel-sub">Latest survey requests</div></div>
          <a class="btn btn--sm btn--outline" href="/admin/bookings.html">View All ${Icons.svg('arrow-right')}</a>
        </div>
        ${Admin.table(
          [
            { label: 'Reference', render: (b) => `<a href="/admin/booking-details.html?id=${b.id}" style="font-weight:600;color:var(--navy);">${UI.esc(b.bookingReference)}</a>` },
            { label: 'Client', render: (b) => UI.esc(b.fullName) },
            { label: 'Service', render: (b) => UI.esc(b.serviceName || '—') },
            { label: 'Location', render: (b) => UI.esc(b.city) },
            { label: 'Preferred Date', render: (b) => UI.formatDate(b.preferredDate) },
            { label: 'Status', render: (b) => UI.statusBadge(b.status) },
            { label: '', right: true, render: (b) => `<a class="btn btn--sm btn--outline" href="/admin/booking-details.html?id=${b.id}">View</a>` }
          ],
          recentBookings,
          { emptyTitle: 'No bookings yet', emptyMessage: 'New survey requests will appear here.', emptyIcon: 'clipboard-list' }
        )}
      </div>`;
    Icons.render(content);
  } catch (err) {
    content.innerHTML = UI.emptyState('Unable to load dashboard', err.message, 'alert-triangle');
  }
})();
