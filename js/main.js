/* Ezamazwe Education — shared interactions: nav scroll state, mobile menu, scroll-reveal, contact form */

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

  function initCountUp() {
    var counters = document.querySelectorAll('[data-count-to]');
    if (!counters.length) return;

    function setFinalValue(el) {
      var target = Number(el.getAttribute('data-count-to'));
      var suffix = el.getAttribute('data-suffix') || '';
      el.textContent = target.toLocaleString() + suffix;
    }

    if (reduceMotion || !('IntersectionObserver' in window)) {
      counters.forEach(setFinalValue);
      return;
    }

    function animateCount(el) {
      var target = Number(el.getAttribute('data-count-to'));
      var suffix = el.getAttribute('data-suffix') || '';
      var duration = 1400;
      var start = null;

      function tick(timestamp) {
        if (start === null) start = timestamp;
        var progress = Math.min((timestamp - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var value = Math.round(eased * target);
        el.textContent = value.toLocaleString() + suffix;
        if (progress < 1) {
          requestAnimationFrame(tick);
        }
      }
      requestAnimationFrame(tick);
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    counters.forEach(function (el) { observer.observe(el); });
  }

  function initVideoModal() {
    var cards = document.querySelectorAll('.video-card[data-video-id], .video-card[data-video-src]');
    var modal = document.getElementById('videoModal');
    if (!cards.length || !modal) return;

    var frame = document.getElementById('videoModalFrame');
    var video = document.getElementById('videoModalVideo');
    var closers = modal.querySelectorAll('[data-video-close]');

    function openModal(id, src) {
      if (id) {
        frame.src = 'https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0';
        frame.style.display = '';
        if (video) video.style.display = 'none';
      } else if (src && video) {
        video.src = src;
        video.style.display = '';
        frame.style.display = 'none';
        video.play();
      }
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('video-modal-open');
    }

    function closeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('video-modal-open');
      frame.src = '';
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    }

    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        openModal(card.getAttribute('data-video-id'), card.getAttribute('data-video-src'));
      });
    });

    closers.forEach(function (el) {
      el.addEventListener('click', closeModal);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
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
      console.log('Ezamazwe Education contact form (static demo submission):', Object.fromEntries(data));

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
    initCountUp();
    initVideoModal();
    initContactForm();
  });
})();
