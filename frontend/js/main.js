'use strict';

/**
 * Public site dynamic content: services grid, portfolio grid + filters,
 * project detail page, recent jobs, testimonials.
 */

const Main = {
  /* ── Services ── */
  async loadServices() {
    const grid = document.getElementById('services-grid');
    if (!grid) return;
    grid.innerHTML = UI.loadingBlock('Loading services…');

    try {
      const res = await API.get('/services');
      const services = res.data || [];
      if (!services.length) {
        grid.innerHTML = UI.emptyState('No services listed', 'Check back soon.', 'ruler');
        return;
      }
      grid.innerHTML = services.map((s) => `
        <article class="card feature-card">
          <div class="card-body">
            <div class="feature-icon">${Icons.svg(UI.esc(s.icon || 'ruler'))}</div>
            <h3>${UI.esc(s.name)}</h3>
            <p>${UI.esc(s.description || '')}</p>
            <a class="card-link" href="/services#${UI.esc(s.slug)}">Learn more ${Icons.svg('arrow-right')}</a>
          </div>
        </article>`).join('');
      Icons.render(grid);
    } catch {
      grid.innerHTML = UI.emptyState('Unable to load services', 'Please refresh the page to try again.', 'alert-triangle');
    }
  },

  /* ── Portfolio ── */
  portfolioState: { page: 1, category: '', search: '' },

  async loadProjects(reset = false) {
    const grid = document.getElementById('portfolio-grid');
    if (!grid) return;
    if (reset) this.portfolioState.page = 1;
    grid.innerHTML = UI.loadingBlock('Loading projects…');

    const state = this.portfolioState;
    const params = new URLSearchParams();
    params.set('page', state.page);
    params.set('limit', 9);
    if (state.category) params.set('category', state.category);
    if (state.search) params.set('search', state.search);

    try {
      const res = await API.get(`/projects?${params.toString()}`);
      const projects = res.data || [];
      if (!projects.length) {
        grid.innerHTML = UI.emptyState('No projects found', 'Try adjusting the filters.', 'briefcase');
      } else {
        grid.innerHTML = projects.map((p) => `
          <article class="card">
            <a class="card-media" href="/portfolio/${UI.esc(p.slug)}" aria-label="${UI.esc(p.title)}">
              <img src="${UI.esc(p.coverImageUrl || '/assets/images/illustrations/project-default.svg')}"
                   alt="${UI.esc(p.title)} — ${UI.esc(p.location || 'project location')}" loading="lazy">
            </a>
            <div class="card-body">
              <div class="card-meta" style="margin-bottom:10px;">
                <span>${Icons.svg('briefcase')}${UI.esc(Main.categoryLabel(p.category))}</span>
                ${p.featured ? `<span class="badge badge--featured">${Icons.svg('star')}Featured</span>` : ''}
              </div>
              <h3>${UI.esc(p.title)}</h3>
              <p>${UI.esc((p.description || '').slice(0, 110))}${(p.description || '').length > 110 ? '…' : ''}</p>
              <div class="card-meta">
                <span>${Icons.svg('map-pin')}${UI.esc(p.location || '—')}</span>
                <span>${Icons.svg('calendar-days')}${UI.formatDate(p.completionDate)}</span>
              </div>
              <div style="margin-top:14px;">
                <a class="card-link" href="/portfolio/${UI.esc(p.slug)}">View project ${Icons.svg('arrow-right')}</a>
              </div>
            </div>
          </article>`).join('');
      }
      Icons.render(grid);
      UI.renderPagination(document.getElementById('portfolio-pagination'), res, (p) => {
        this.portfolioState.page = p;
        this.loadProjects();
        window.scrollTo({ top: grid.offsetTop - 90, behavior: 'smooth' });
      });
    } catch {
      grid.innerHTML = UI.emptyState('Unable to load projects', 'Please refresh the page to try again.', 'alert-triangle');
    }
  },

  categoryLabel(cat) {
    return { residential: 'Residential', commercial: 'Commercial', construction: 'Construction', land_development: 'Land Development', topographical: 'Topographical', boundary: 'Boundary' }[cat] || cat || '—';
  },

  initPortfolioFilters() {
    const filterBar = document.getElementById('portfolio-filters');
    if (!filterBar) return;
    filterBar.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-category]');
      if (!btn) return;
      filterBar.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      this.portfolioState.category = btn.dataset.category;
      this.loadProjects(true);
    });

    const search = document.getElementById('portfolio-search');
    let debounce;
    if (search) {
      search.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          this.portfolioState.search = search.value.trim();
          this.loadProjects(true);
        }, 300);
      });
    }
  },

  /* ── Project detail ── */
  async loadProjectDetail() {
    const root = document.getElementById('project-detail');
    if (!root) return;
    const slug = window.location.pathname.split('/').pop();
    root.innerHTML = UI.loadingBlock('Loading project…');

    try {
      const res = await API.get(`/projects/${encodeURIComponent(slug)}`);
      const p = res.project;

      document.title = `${p.title} | SurveyPro`;
      const desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute('content', (p.description || '').slice(0, 155));

      root.innerHTML = `
        <div class="breadcrumbs"><a href="/portfolio">Portfolio</a> <span>/</span> <span>${UI.esc(p.title)}</span></div>
        <div class="card-meta" style="margin-bottom:12px;">
          <span class="badge badge--category">${UI.esc(Main.categoryLabel(p.category))}</span>
          <span>${Icons.svg('map-pin')}${UI.esc(p.location || '—')}</span>
          <span>${Icons.svg('calendar-days')}${UI.formatDate(p.completionDate)}</span>
        </div>
        <h1>${UI.esc(p.title)}</h1>
        <img src="${UI.esc(p.coverImageUrl || '/assets/images/illustrations/project-default.svg')}" alt="${UI.esc(p.title)}" style="border-radius:10px;margin:26px 0 8px;aspect-ratio:16/8;object-fit:cover;width:100%;">
        ${p.services && p.services.length ? `<div class="card-meta" style="margin:14px 0 26px;">${p.services.map((s) => `<span class="badge badge--category">${UI.esc(s)}</span>`).join('')}</div>` : ''}
        <div class="grid grid--2" style="margin-top:34px;">
          <div>
            <h3>Overview</h3><p>${UI.esc(p.description || '—')}</p>
          </div>
          <div>
            ${p.challenge ? `<h3>The Challenge</h3><p>${UI.esc(p.challenge)}</p>` : ''}
            ${p.approach ? `<h3>Our Approach</h3><p>${UI.esc(p.approach)}</p>` : ''}
            ${p.result ? `<h3>The Result</h3><p>${UI.esc(p.result)}</p>` : ''}
          </div>
        </div>
        ${p.gallery && p.gallery.length ? `
          <h3 style="margin-top:48px;">Project Gallery</h3>
          <div class="grid grid--3" style="margin-top:18px;">
            ${p.gallery.map((g) => `
              <figure class="card" style="margin:0;">
                <div class="card-media"><img src="${UI.esc(g.imageUrl)}" alt="${UI.esc(g.caption || p.title)}" loading="lazy"></div>
                ${g.caption ? `<figcaption class="card-body" style="padding:12px 16px;font-size:.85rem;color:var(--gray);">${UI.esc(g.caption)}</figcaption>` : ''}
              </figure>`).join('')}
          </div>` : ''}
        <div style="margin-top:52px;text-align:center;">
          <a class="btn btn--primary" href="/booking">Book a Similar Survey ${Icons.svg('arrow-right')}</a>
        </div>`;
      Icons.render(root);
    } catch (err) {
      root.innerHTML = err.status === 404
        ? UI.emptyState('Project not found', 'This project may have been unpublished.', 'briefcase')
        : UI.emptyState('Unable to load project', 'Please refresh the page to try again.', 'alert-triangle');
    }
  },

  /* ── Recent jobs ── */
  async loadRecentJobs() {
    const grid = document.getElementById('recent-jobs-grid');
    if (!grid) return;
    grid.innerHTML = UI.loadingBlock('Loading recent jobs…');
    try {
      const res = await API.get('/recent-jobs?limit=12');
      const jobs = res.data || [];
      if (!jobs.length) {
        grid.innerHTML = UI.emptyState('No recent jobs', 'Check back soon.', 'briefcase');
        return;
      }
      grid.innerHTML = jobs.map((j) => `
        <article class="card">
          <div class="card-media">
            <img src="${UI.esc(j.coverImageUrl || '/assets/images/illustrations/recent-job.svg')}"
                 alt="${UI.esc(j.title)}" loading="lazy">
          </div>
          <div class="card-body">
            <div class="card-meta" style="margin-bottom:10px;">
              <span>${Icons.svg('ruler')}${UI.esc(j.serviceName || 'Survey')}</span>
            </div>
            <h3>${UI.esc(j.title)}</h3>
            <p>${UI.esc((j.description || '').slice(0, 120))}${(j.description || '').length > 120 ? '…' : ''}</p>
            <div class="card-meta">
              <span>${Icons.svg('map-pin')}${UI.esc(j.location || '—')}</span>
              <span>${Icons.svg('calendar-days')}${UI.formatDate(j.jobDate)}</span>
            </div>
          </div>
        </article>`).join('');
      Icons.render(grid);
    } catch {
      grid.innerHTML = UI.emptyState('Unable to load recent jobs', 'Please refresh the page to try again.', 'alert-triangle');
    }
  },

  /* ── Testimonials ── */
  async loadTestimonials() {
    const grid = document.getElementById('testimonials-grid');
    if (!grid) return;
    grid.innerHTML = UI.loadingBlock('Loading testimonials…');
    try {
      const res = await API.get('/testimonials?limit=12');
      const items = res.data || [];
      if (!items.length) {
        grid.closest('.section') ? grid.closest('.section').style.display = 'none' : grid.innerHTML = '';
        return;
      }
      grid.innerHTML = items.map((t) => `
        <figure class="card card--flat" style="margin:0;">
          <div class="card-body">
            ${UI.stars(t.rating)}
            <blockquote style="margin:14px 0;font-size:.95rem;color:var(--slate);">“${UI.esc(t.message)}”</blockquote>
            <figcaption class="card-meta">
              <span>${Icons.svg('users')}<strong style="color:var(--navy);">${UI.esc(t.clientName)}</strong>${t.company ? ` · ${UI.esc(t.company)}` : ''}</span>
            </figcaption>
          </div>
        </figure>`).join('');
      Icons.render(grid);
    } catch {
      grid.innerHTML = '';
    }
  },

  /* ── Trust strip (configurable via settings) ── */
  async loadStats() {
    const strip = document.getElementById('trust-strip');
    if (!strip) return;
    // Settings are fetched from the public stats embedded at boot; try API then fall back
    const defaults = [
      { value: '10+', label: 'Years Experience' },
      { value: '500+', label: 'Projects Completed' },
      { value: '350+', label: 'Clients Served' },
      { value: '15+', label: 'Surveying Services' }
    ];
    let stats = defaults;
    try {
      const res = await fetch('/api/dashboard/public-stats').then((r) => (r.ok ? r.json() : null));
      if (res && res.stats) {
        stats = [
          { value: `${res.stats.years}+`, label: 'Years Experience' },
          { value: `${res.stats.projects}+`, label: 'Projects Completed' },
          { value: `${res.stats.clients}+`, label: 'Clients Served' },
          { value: `${res.stats.services}+`, label: 'Surveying Services' }
        ];
      }
    } catch { /* keep defaults */ }

    strip.innerHTML = stats.map((s) => `
      <div style="text-align:center;">
        <div class="stat-value">${UI.esc(s.value)}</div>
        <div class="stat-label">${UI.esc(s.label)}</div>
      </div>`).join('');
  },

  /* ── Boot by page ── */
  init() {
    const path = window.location.pathname;
    this.loadStats();
    if (document.getElementById('services-grid')) this.loadServices();
    if (document.getElementById('portfolio-grid')) {
      this.initPortfolioFilters();
      this.loadProjects(true);
    }
    if (document.getElementById('project-detail')) this.loadProjectDetail();
    if (document.getElementById('recent-jobs-grid')) this.loadRecentJobs();
    if (document.getElementById('testimonials-grid')) this.loadTestimonials();
  }
};

document.addEventListener('DOMContentLoaded', () => Main.init());
window.Main = Main;
