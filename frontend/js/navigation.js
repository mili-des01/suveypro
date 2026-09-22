'use strict';

/**
 * Site chrome: sticky header, transparent-over-hero behavior,
 * mobile menu toggle, active nav highlighting.
 */

(function () {
  function initHeader() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    const onScroll = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Mobile menu
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.main-nav');
    if (toggle && nav) {
      toggle.addEventListener('click', () => {
        const open = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && nav.classList.contains('open')) {
          nav.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Active link
    const path = window.location.pathname.replace(/\.html$/, '') || '/';
    document.querySelectorAll('.main-nav .nav-link').forEach((link) => {
      const href = link.getAttribute('href');
      if (href === path || (href !== '/' && path.startsWith(href + '/'))) {
        link.classList.add('active');
      }
    });
  }

  function initFooterYear() {
    const yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  document.addEventListener('DOMContentLoaded', () => {
    Icons.render();
    initHeader();
    initFooterYear();
  });

  window.SurveyNav = { initHeader };
})();
