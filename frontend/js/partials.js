'use strict';

/**
 * Shared header/footer partials for public pages.
 * Each page includes: <div id="site-header"></div> ... <div id="site-footer"></div>
 * and loads partials.js before navigation.js.
 */

(function () {
  const header = `
  <header class="site-header site-header--transparent">
    <div class="container header-inner">
      <a class="logo" href="/" aria-label="SurveyPro home">
        <img class="logo-mark" src="/assets/logos/logo.svg" alt="" width="34" height="34">
        <span class="logo-text">Survey<span>Pro</span></span>
      </a>
      <nav class="main-nav" id="main-nav" aria-label="Main navigation">
        <a class="nav-link" href="/">Home</a>
        <a class="nav-link" href="/about">About</a>
        <a class="nav-link" href="/services">Services</a>
        <a class="nav-link" href="/portfolio">Portfolio</a>
        <a class="nav-link" href="/recent-jobs">Recent Jobs</a>
        <a class="nav-link" href="/contact">Contact</a>
        <a class="btn btn--accent" href="/booking">Book a Survey</a>
      </nav>
      <button class="nav-toggle" aria-label="Toggle menu" aria-expanded="false" aria-controls="main-nav">
        ${'<i data-lucide="menu"></i>'}
      </button>
    </div>
  </header>`;

  const footer = `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-about">
          <a class="logo" href="/" style="color:#fff;">
            <img class="logo-mark" src="/assets/logos/logo.svg" alt="" width="30" height="30">
            <span class="logo-text">Survey<span>Pro</span></span>
          </a>
          <p style="margin-top:16px;">Professional land surveying services for residential, commercial, construction and infrastructure projects. Precision you can build on.</p>
        </div>
        <div>
          <h4>Company</h4>
          <ul class="footer-links">
            <li><a href="/about">About Us</a></li>
            <li><a href="/portfolio">Portfolio</a></li>
            <li><a href="/recent-jobs">Recent Jobs</a></li>
            <li><a href="/faq">FAQ</a></li>
          </ul>
        </div>
        <div>
          <h4>Services</h4>
          <ul class="footer-links">
            <li><a href="/services">Boundary Survey</a></li>
            <li><a href="/services">Topographical Survey</a></li>
            <li><a href="/services">Construction Survey</a></li>
            <li><a href="/booking">Book a Survey</a></li>
          </ul>
        </div>
        <div>
          <h4>Contact</h4>
          <ul class="footer-links footer-contact" id="footer-contact">
            <li>${'<i data-lucide="map-pin"></i>'}<span id="footer-address">720 Commerce Street, Suite 210, Austin, TX 78701</span></li>
            <li>${'<i data-lucide="phone"></i>'}<span id="footer-phone">+1 (512) 555-0139</span></li>
            <li>${'<i data-lucide="mail"></i>'}<span id="footer-email">info@surveypro.example.com</span></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© <span id="footer-year">2026</span> SurveyPro. All rights reserved.</span>
        <a href="/admin/login.html" class="footer-admin-link" aria-label="Staff login">Licensed Land Surveyors</a>
        
      </div>
    </div>
  </footer>`;

  function inject() {
    const headerSlot = document.getElementById('site-header');
    const footerSlot = document.getElementById('site-footer');
    if (headerSlot) headerSlot.outerHTML = header;
    if (footerSlot) footerSlot.outerHTML = footer;

    // Hydrate contact details from settings (best effort)
    fetch('/api/dashboard/public-stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (!res || !res.stats) return;
      }).catch(() => {});

    fetch('/api/dashboard/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (!res || !res.settings) return;
        const s = res.settings;
        const map = {
          'footer-address': s.contact_address,
          'footer-phone': s.contact_phone,
          'footer-email': s.contact_email
        };
        for (const [id, val] of Object.entries(map)) {
          const el = document.getElementById(id);
          if (el && val) el.textContent = val;
        }
      })
      .catch(() => {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
