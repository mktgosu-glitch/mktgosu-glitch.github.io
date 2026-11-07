/* THE SONGYEOL — interactions */
(function () {
  'use strict';
  var doc = document;
  var header = doc.querySelector('[data-header]');
  var toggle = doc.querySelector('[data-menu-toggle]');
  var mobileNav = doc.getElementById('mobile-nav');

  /* Header state on scroll */
  function onScroll() {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 24);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Mobile navigation */
  function setMenu(open) {
    if (!toggle || !mobileNav) return;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    header.classList.toggle('is-open', open);
    mobileNav.hidden = !open;
    var label = toggle.querySelector('.sr-only');
    if (label) label.textContent = open ? label.dataset.closeLabel : label.dataset.openLabel;
  }
  if (toggle) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    mobileNav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setMenu(false);
    });
  }

  /* Reveal on scroll */
  var revealEls = doc.querySelectorAll('.reveal, .reveal-img');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el, i) {
      var parent = el.parentElement;
      var siblings = parent ? Array.prototype.indexOf.call(parent.children, el) : 0;
      el.style.transitionDelay = Math.min(siblings, 5) * 70 + 'ms';
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* Menu page: category bar scrollspy */
  var mnTabs = doc.querySelector('[data-mn-tabs]');
  if (mnTabs && 'IntersectionObserver' in window) {
    var mnLinks = mnTabs.querySelectorAll('[data-mn-tab]');
    var mnSet = function (id) {
      mnLinks.forEach(function (a) {
        if (a.dataset.mnTab === id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    };
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) mnSet(en.target.id); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    doc.querySelectorAll('[data-mn-section]').forEach(function (s) { spy.observe(s); });
  }

  /* Contact tabs & forms */
  var panel = doc.querySelector('[data-contact]');
  if (!panel) return;
  var tabs = panel.querySelectorAll('[data-tab]');
  var forms = panel.querySelectorAll('[data-form]');

  function showTab(name) {
    tabs.forEach(function (t) {
      var active = t.dataset.tab === name;
      t.setAttribute('aria-selected', active ? 'true' : 'false');
      t.tabIndex = active ? 0 : -1;
    });
    forms.forEach(function (f) { f.hidden = f.dataset.form !== name; });
  }
  showTab(panel.dataset.defaultTab || 'reservation');
  tabs.forEach(function (t) {
    t.addEventListener('click', function () { showTab(t.dataset.tab); });
  });

  /* CTAs that preselect a tab / service */
  doc.querySelectorAll('[data-book]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var href = btn.getAttribute('href') || '';
      if (href.charAt(0) !== '#') return;
      showTab(btn.dataset.book);
      var idx = btn.dataset.serviceIndex;
      if (idx !== undefined) {
        var sel = panel.querySelector('[data-form="reservation"] [data-service]');
        if (sel && sel.options[idx]) sel.selectedIndex = Number(idx);
      }
    });
  });
  if (location.hash === '#contact' && /partnership|franchise/.test(location.search)) showTab('partnership');
  var svc = /[?&]service=(\d+)/.exec(location.search);
  if (svc) {
    showTab('reservation');
    var svcSel = panel.querySelector('[data-form="reservation"] [data-service]');
    if (svcSel && svcSel.options[Number(svc[1])]) svcSel.selectedIndex = Number(svc[1]);
  }

  function validate(form) {
    var ok = true;
    form.querySelectorAll('[required]').forEach(function (el) {
      var bad = el.type === 'checkbox' ? !el.checked : !el.value.trim();
      if (!bad && el.type === 'email') bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());
      var target = el.type === 'checkbox' ? el.closest('.consent') : el;
      target.classList.toggle('is-invalid', bad);
      if (bad && ok) { el.focus(); ok = false; }
    });
    return ok;
  }

  forms.forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = form.querySelector('.form-status');
      var btn = form.querySelector('button[type="submit"]');
      status.className = 'form-status';
      status.textContent = '';
      if (!validate(form)) return;
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = String(v).trim(); });
      btn.disabled = true;
      btn.textContent = btn.dataset.sending;
      var cfg = window.SONGYEOL_FORM;
      var req;
      if (cfg && cfg.action) {
        var body = new URLSearchParams();
        Object.keys(cfg.entries).forEach(function (k) { if (data[k]) body.append(cfg.entries[k], data[k]); });
        req = fetch(cfg.action, { method: 'POST', mode: 'no-cors', body: body });
      } else {
        req = fetch('/api/inquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res; });
      }
      req.then(function () {
        status.classList.add('is-ok');
        status.textContent = status.dataset.ok;
        form.reset();
      }).catch(function () {
        status.classList.add('is-err');
        status.textContent = status.dataset.err;
      }).finally(function () {
        btn.disabled = false;
        btn.textContent = btn.dataset.label;
      });
    });
    form.querySelectorAll('input, textarea, select').forEach(function (el) {
      el.addEventListener('input', function () {
        el.classList.remove('is-invalid');
        var c = el.closest('.consent');
        if (c) c.classList.remove('is-invalid');
      });
    });
  });
})();
