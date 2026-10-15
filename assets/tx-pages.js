/* TOOSA inner pages (tx-p-* sections): reveal, FAQ search, gallery lightbox, quote carousel, product gallery. No dependencies. */
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
      if (!slides.length) return;
      function go(i) {
        slides.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
        thumbs.forEach(function (t, k) { t.classList.toggle('is-on', k === i); });
      }
      thumbs.forEach(function (t, k) { t.addEventListener('click', function () { go(k); }); });
      go(0);
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

  function init(root) { reveal(root); faq(root); gallery(root); quotes(root); product(root); misc(root); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(document); }); else init(document);
  document.addEventListener('shopify:section:load', function (ev) { init(ev.target); });
})();
