/* Ezamazwe — shared interactions: nav scroll state, mobile menu, scroll-reveal, contact form */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initNav() {
    var nav = document.querySelector('.site-nav');
    var toggle = document.querySelector('.nav-toggle');
    var links = document.querySelector('.nav-links');
    if (!nav) return;

    function onScroll() {
      nav.classList.toggle('is-scrolled', window.scrollY > 8);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    if (toggle && links) {
      toggle.addEventListener('click', function () {
        var isOpen = links.classList.toggle('is-open');
        nav.classList.toggle('is-open', isOpen);
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      links.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          links.classList.remove('is-open');
          nav.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var delay = el.getAttribute('data-reveal-delay') || 0;
          setTimeout(function () { el.classList.add('is-visible'); }, Number(delay));
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    items.forEach(function (el) { observer.observe(el); });
  }

  function initStaggerGroups() {
    document.querySelectorAll('[data-reveal-group]').forEach(function (group) {
      var children = group.querySelectorAll('.reveal');
      children.forEach(function (child, i) {
        child.setAttribute('data-reveal-delay', i * 120);
      });
    });
  }

  function initContactForm() {
    var form = document.querySelector('.contact-form');
    if (!form) return;

    // Static form only — no backend is wired up. On submit we simply
    // show a confirmation state locally; nothing is sent anywhere.
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(form);
      console.log('Ezamazwe contact form (static demo submission):', Object.fromEntries(data));

      var success = document.querySelector('.form-success');
      if (success) {
        success.classList.add('is-visible');
        success.setAttribute('tabindex', '-1');
        success.focus();
      }
      form.reset();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initStaggerGroups();
    initReveal();
    initContactForm();
  });
})();
