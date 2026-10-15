/* TOOSA inner pages (tx-p-* sections): reveal, counters, timeline, tabs, FAQ search, gallery lightbox, quote carousel, product gallery. No dependencies. */
(function () {
  'use strict';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ---------------------------------------------------------- reveal */
  function reveal(root) {
    var els = $$('.txp-reveal', root).filter(function (e) { return !e.classList.contains('is-in'); });
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    els.forEach(function (e) { io.observe(e); });
    // safety net: anything still hidden after 2.5 s shows
    setTimeout(function () { els.forEach(function (e) { e.classList.add('is-in'); }); }, 2500);
    $$('[data-txp-frame]', root).forEach(function (f) { setTimeout(function () { f.classList.add('is-in'); }, 150); });
  }

  /* ------------------------------------------------------------- faq */
  function faq(root) {
    $$('[data-txp-faq]', root).forEach(function (sec) {
      var items = $$('[data-txp-faq-item]', sec);
      items.forEach(function (item) {
        var q = $('[data-txp-faq-q]', item);
        if (!q) return;
        q.addEventListener('click', function () {
          var open = item.classList.toggle('is-open');
          q.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
      });
      var input = $('[data-txp-faq-search]', sec);
      var clear = $('[data-txp-faq-clear]', sec);
      var empty = $('[data-txp-faq-empty]', sec);
      var groups = $$('.txp-faq__group', sec);
      var nav = $('[data-txp-faq-nav]', sec);
      function norm(s) { return (s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
      function run() {
        var term = norm(input ? input.value : '');
        var box = input ? input.parentNode : null;
        if (box) box.classList.toggle('has-value', !!term);
        var any = false;
        items.forEach(function (item) {
          var text = norm($$('[data-txp-faq-text]', item).map(function (n) { return n.textContent; }).join(' '));
          var hit = !term || text.indexOf(term) !== -1;
          item.classList.toggle('is-hidden', !hit);
          if (hit) any = true;
          if (term && hit) { item.classList.add('is-open'); var q = $('[data-txp-faq-q]', item); if (q) q.setAttribute('aria-expanded', 'true'); }
        });
        groups.forEach(function (g) {
          var visible = $$('[data-txp-faq-item]', g).some(function (i) { return !i.classList.contains('is-hidden'); });
          g.classList.toggle('is-hidden', !visible);
        });
        if (nav) $$('a', nav).forEach(function (a) {
          var target = $(a.getAttribute('href'), sec);
          a.style.display = target && target.classList.contains('is-hidden') ? 'none' : '';
        });
        if (empty) empty.classList.toggle('is-on', !any);
      }
      if (input) {
        input.addEventListener('input', run);
        input.addEventListener('search', run);
      }
      if (clear && input) clear.addEventListener('click', function () { input.value = ''; run(); input.focus(); });
      // active topic in the sticky nav
      if (nav && 'IntersectionObserver' in window) {
        var links = $$('a', nav);
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            links.forEach(function (a) { a.classList.toggle('is-on', a.getAttribute('href') === '#' + en.target.id); });
          });
        }, { rootMargin: '-30% 0px -60% 0px' });
        groups.forEach(function (g) { if (g.id) io.observe(g); });
        links.forEach(function (a) {
          a.addEventListener('click', function (ev) {
            var t = $(a.getAttribute('href'), sec);
            if (!t) return;
            ev.preventDefault();
            window.scrollTo({ top: t.getBoundingClientRect().top + window.pageYOffset - 100, behavior: 'smooth' });
          });
        });
      }
    });
    // generic in-page nav (reading column)
    $$('[data-txp-pagenav]', root).forEach(function (nav) {
      var links = $$('a', nav);
      links.forEach(function (a) {
        a.addEventListener('click', function (ev) {
          var t = document.getElementById((a.getAttribute('href') || '').slice(1));
          if (!t) return;
          ev.preventDefault();
          window.scrollTo({ top: t.getBoundingClientRect().top + window.pageYOffset - 100, behavior: 'smooth' });
        });
      });
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            links.forEach(function (a) { a.classList.toggle('is-on', a.getAttribute('href') === '#' + en.target.id); });
          });
        }, { rootMargin: '-30% 0px -60% 0px' });
        links.forEach(function (a) { var t = document.getElementById((a.getAttribute('href') || '').slice(1)); if (t) io.observe(t); });
      }
    });
  }

  /* --------------------------------------------------------- gallery */
  function gallery(root) {
    $$('[data-txp-gallery]', root).forEach(function (sec) {
      var items = $$('.txp-gal__item', sec);
      var lb = $('[data-txp-lb]', sec);
      var stage = $('[data-txp-lb-stage]', sec);
      var cap = $('[data-txp-lb-cap]', sec);
      var current = -1;
      function visible() { return items.filter(function (i) { return !i.classList.contains('is-hidden'); }); }
      function show(i) {
        var list = visible();
        if (!list.length) return;
        current = (i + list.length) % list.length;
        var it = list[current];
        stage.innerHTML = '';
        if (it.getAttribute('data-txp-kind') === 'video') {
          var v = document.createElement('video');
          v.src = it.getAttribute('data-txp-src'); v.controls = true; v.autoplay = true; v.playsInline = true;
          stage.appendChild(v);
        } else {
          var img = document.createElement('img');
          img.src = it.getAttribute('data-txp-src'); img.alt = it.getAttribute('data-txp-cap') || '';
          stage.appendChild(img);
        }
        var c = it.getAttribute('data-txp-cap') || '';
        cap.innerHTML = '<b>' + (current + 1) + ' / ' + list.length + '</b>' + c.replace(/</g, '&lt;');
      }
      function open(i) { lb.classList.add('is-on'); lb.setAttribute('aria-hidden', 'false'); document.body.classList.add('txp-lb-open'); show(i); }
      function close() { lb.classList.remove('is-on'); lb.setAttribute('aria-hidden', 'true'); document.body.classList.remove('txp-lb-open'); stage.innerHTML = ''; }
      items.forEach(function (it) { it.addEventListener('click', function () { open(visible().indexOf(it)); }); });
      $('[data-txp-lb-close]', sec).addEventListener('click', close);
      $('[data-txp-lb-prev]', sec).addEventListener('click', function () { show(current - 1); });
      $('[data-txp-lb-next]', sec).addEventListener('click', function () { show(current + 1); });
      lb.addEventListener('click', function (ev) { if (ev.target === lb || ev.target === stage) close(); });
      document.addEventListener('keydown', function (ev) {
        if (!lb.classList.contains('is-on')) return;
        if (ev.key === 'Escape') close();
        if (ev.key === 'ArrowLeft') show(current - 1);
        if (ev.key === 'ArrowRight') show(current + 1);
      });
      var sx = 0;
      lb.addEventListener('touchstart', function (ev) { sx = ev.touches[0].clientX; }, { passive: true });
      lb.addEventListener('touchend', function (ev) { var dx = ev.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1)); }, { passive: true });
      $$('[data-txp-filter]', sec).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var f = btn.getAttribute('data-txp-filter');
          $$('[data-txp-filter]', sec).forEach(function (b) { b.classList.toggle('is-on', b === btn); b.setAttribute('aria-selected', b === btn ? 'true' : 'false'); });
          items.forEach(function (it) { it.classList.toggle('is-hidden', f !== 'all' && it.getAttribute('data-txp-kind') !== f); });
        });
      });
    });
  }

  /* ---------------------------------------------------------- quotes */
  function quotes(root) {
    $$('[data-txp-quotes]', root).forEach(function (sec) {
      var track = $('[data-txp-track]', sec);
      var step = function () { var card = $('.txp-quote', track); return card ? card.getBoundingClientRect().width + 18 : 400; };
      var prev = $('[data-txp-prev]', sec), next = $('[data-txp-next]', sec);
      if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
      if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
      $$('[data-txp-play]', sec).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var card = btn.closest('.txp-quote');
          var v = $('video', card);
          if (!v) return;
          $$('video', sec).forEach(function (o) { if (o !== v) { o.pause(); var oc = o.closest('.txp-quote'); if (oc) oc.classList.remove('is-playing'); } });
          card.classList.add('is-playing');
          v.play();
          v.addEventListener('ended', function () { card.classList.remove('is-playing'); }, { once: true });
        });
      });
    });
  }

  /* --------------------------------------------------------- product */
  function product(root) {
    $$('[data-txp-product]', root).forEach(function (sec) {
      var slides = $$('[data-txp-slide]', sec);
      var thumbs = $$('[data-txp-thumb]', sec);
      var main = $('[data-txp-main]', sec);
      var label = $('[data-txp-count-label]', sec);
      if (slides.length < 2) return;
      var i = 0;
      function go(n) {
        i = (n + slides.length) % slides.length;
        slides.forEach(function (sl, k) { sl.classList.toggle('is-on', k === i); });
        thumbs.forEach(function (t, k) { t.classList.toggle('is-on', k === i); if (k === i) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
        if (label) label.textContent = (i + 1) + ' / ' + slides.length;
        var t = thumbs[i];
        if (t && t.scrollIntoView) { try { t.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); } catch (e) { /* older browsers */ } }
      }
      thumbs.forEach(function (t, k) { t.addEventListener('click', function () { go(k); }); });
      var prev = $('[data-txp-prev]', sec), next = $('[data-txp-next]', sec);
      if (prev) prev.addEventListener('click', function () { go(i - 1); });
      if (next) next.addEventListener('click', function () { go(i + 1); });
      if (main) {
        main.addEventListener('keydown', function (ev) {
          if (ev.key === 'ArrowLeft') { ev.preventDefault(); go(i - 1); }
          if (ev.key === 'ArrowRight') { ev.preventDefault(); go(i + 1); }
        });
        var sx = 0, sy = 0;
        main.addEventListener('touchstart', function (ev) { sx = ev.touches[0].clientX; sy = ev.touches[0].clientY; }, { passive: true });
        main.addEventListener('touchend', function (ev) {
          var dx = ev.changedTouches[0].clientX - sx, dy = ev.changedTouches[0].clientY - sy;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(i + (dx < 0 ? 1 : -1));
        }, { passive: true });
      }
      go(0);
    });
  }

  /* ------------------------------------------------------------ tabs */
  function tabs(root) {
    $$('[data-txp-tabs]', root).forEach(function (box) {
      var list = $('[role="tablist"]', box);
      var tabsEl = $$('[role="tab"]', box);
      var panels = $$('[role="tabpanel"]', box);
      if (!tabsEl.length) return;
      var vertical = list && list.getAttribute('aria-orientation') === 'vertical';
      function select(n, focus) {
        tabsEl.forEach(function (t, k) {
          var on = k === n;
          t.classList.toggle('is-on', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
          t.setAttribute('tabindex', on ? '0' : '-1');
          if (on && focus) t.focus();
        });
        panels.forEach(function (p, k) {
          var on = k === n;
          if (on) { p.hidden = false; p.classList.remove('is-on'); void p.offsetWidth; p.classList.add('is-on'); } else { p.hidden = true; p.classList.remove('is-on'); }
        });
        if (list && tabsEl[n] && tabsEl[n].scrollIntoView) { try { tabsEl[n].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); } catch (e) { /* older browsers */ } }
      }
      tabsEl.forEach(function (t, k) {
        t.addEventListener('click', function () { select(k, false); });
        t.addEventListener('keydown', function (ev) {
          var nextKey = vertical ? 'ArrowDown' : 'ArrowRight', prevKey = vertical ? 'ArrowUp' : 'ArrowLeft';
          var n = null;
          if (ev.key === nextKey || (!vertical && ev.key === 'ArrowDown')) n = (k + 1) % tabsEl.length;
          else if (ev.key === prevKey || (!vertical && ev.key === 'ArrowUp')) n = (k - 1 + tabsEl.length) % tabsEl.length;
          else if (ev.key === 'Home') n = 0;
          else if (ev.key === 'End') n = tabsEl.length - 1;
          if (n === null) return;
          ev.preventDefault();
          select(n, true);
        });
      });
      // deep link: #txp-panel-<id> or #txp-tab-<id>
      var hash = location.hash.replace('#', '');
      if (hash) {
        var idx = -1;
        tabsEl.forEach(function (t, k) { if (t.id === hash || t.getAttribute('aria-controls') === hash) idx = k; });
        if (idx > -1) select(idx, false);
      }
    });
  }

  /* -------------------------------------------------------- counters */
  function counters(root) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var els = $$('.txp-count', root).filter(function (e) { return !e.hasAttribute('data-txp-counted'); });
    els.forEach(function (el) {
      el.setAttribute('data-txp-counted', '1');
      var txt = el.textContent.trim();
      var m = txt.match(/^([^\d]*)([\d,]+(?:\.\d+)?)(.*)$/);
      if (!m) return;
      var num = parseFloat(m[2].replace(/,/g, ''));
      if (isNaN(num)) return;
      if (num >= 1900 && num <= 2100 && m[2].indexOf(',') === -1 && m[2].indexOf('.') === -1) return; // a year
      if (reduce) return;
      var dec = (m[2].split('.')[1] || '').length;
      var grouped = m[2].indexOf(',') !== -1;
      function fmt(v) {
        var str = v.toFixed(dec);
        if (grouped) { var parts = str.split('.'); parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); str = parts.join('.'); }
        return m[1] + str + m[3];
      }
      el.textContent = fmt(0);
      function run() {
        var t0 = null, dur = 1400;
        function step(ts) {
          if (!t0) t0 = ts;
          var p = Math.min(1, (ts - t0) / dur);
          var e = 1 - Math.pow(1 - p, 3);
          el.textContent = fmt(num * e);
          if (p < 1) requestAnimationFrame(step); else el.textContent = txt;
        }
        requestAnimationFrame(step);
      }
      if (!('IntersectionObserver' in window)) { el.textContent = txt; return; }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { io.unobserve(el); run(); } });
      }, { threshold: 0.4 });
      io.observe(el);
      setTimeout(function () { if (el.textContent === fmt(0)) { io.unobserve(el); run(); } }, 4000);
    });
  }

  /* -------------------------------------------------------- timeline */
  function timeline(root) {
    $$('[data-txp-timeline]', root).forEach(function (ol) {
      var items = $$('.txp-tl__item', ol);
      var ticking = false;
      function update() {
        ticking = false;
        var r = ol.getBoundingClientRect();
        var focus = window.innerHeight * 0.6;
        var p = (focus - r.top) / Math.max(1, r.height);
        p = Math.max(0, Math.min(1, p));
        ol.style.setProperty('--txp-tl-p', p.toFixed(4));
        items.forEach(function (it) { var ir = it.getBoundingClientRect(); it.classList.toggle('is-past', ir.top + 12 < focus); });
      }
      function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      update();
    });
  }

  /* ------------------------------------------------------------ misc */
  function misc(root) {
    $$('[data-txp-copy]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var url = btn.getAttribute('data-txp-copy');
        var done = function () { btn.classList.add('is-on'); btn.setAttribute('aria-label', 'Link copied'); setTimeout(function () { btn.classList.remove('is-on'); }, 1500); };
        if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, done); else done();
      });
    });
  }

  function init(root) { reveal(root); counters(root); timeline(root); tabs(root); faq(root); gallery(root); quotes(root); product(root); misc(root); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(document); }); else init(document);
  document.addEventListener('shopify:section:load', function (ev) { init(ev.target); });
})();
