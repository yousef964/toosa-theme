/* TOOSA homepage redesign: hero colour switch, wall builder, drawer story, video gallery. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = function (cents) {
    var n = Math.round(cents) / 100;
    return '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  /* ---- reveal on scroll ---- */
  function initReveal(root) {
    var els = $$('.tx-reveal', root);
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (e) { io.observe(e); });
    // safety net: anything already in view after load, or scrolled past, is shown even if the observer misses it
    var pending = els.slice(), ticking = false;
    function sweep() {
      ticking = false;
      var h = window.innerHeight || 800;
      pending = pending.filter(function (e) {
        if (e.classList.contains('is-in')) return false;
        var r = e.getBoundingClientRect();
        if (r.top < h * 0.95) { e.classList.add('is-in'); return false; }
        return true;
      });
    }
    function onScroll() { if (!ticking && pending.length) { ticking = true; requestAnimationFrame(sweep); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    setTimeout(sweep, 1200);
  }

  /* ---- hero: colour swatches swap the product photo ---- */
  function initHero(sec) {
    var imgs = $$('.tx-hero__img', sec);
    var sw = $$('.tx-swatch', sec);
    var name = $('.tx-swatches__name', sec);
    if (!imgs.length) return;
    function show(key) {
      imgs.forEach(function (im) { im.classList.toggle('is-on', im.dataset.color === key); });
      sw.forEach(function (b) { b.classList.toggle('is-on', b.dataset.color === key); });
      var on = sw.filter(function (b) { return b.dataset.color === key; })[0];
      if (name && on) name.textContent = on.getAttribute('aria-label');
    }
    sw.forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.color); }); });
    var first = (sw[0] && sw[0].dataset.color) || imgs[0].dataset.color;
    show(first);
    // idle auto-cycle until the visitor touches a swatch
    if (sw.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var i = 0, stop = false;
      sw.forEach(function (b) { b.addEventListener('click', function () { stop = true; }); });
      setInterval(function () { if (stop || document.hidden) return; i = (i + 1) % sw.length; show(sw[i].dataset.color); }, 4200);
    }
  }

  /* ---- wall builder ---- */
  var PAL = {
    grey:  { body: '#5b636c', dark: '#444b53', light: '#737b84', edge: '#2f353b' },
    black: { body: '#23272c', dark: '#16191d', light: '#363b41', edge: '#0a0c0e' },
    red:   { body: '#c4242b', dark: '#951b21', light: '#d9444a', edge: '#5e1014' }
  };
  var WOOD = 'url(#txWood)';

  function svgDefs() {
    return '<defs>' +
      '<linearGradient id="txWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9b47a"/><stop offset="1" stop-color="#b98a4f"/></linearGradient>' +
      '<linearGradient id="txSteel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d7dbe0"/><stop offset="1" stop-color="#9aa3ad"/></linearGradient>' +
      '<pattern id="txPeg" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="1.6" fill="rgba(0,0,0,0.55)"/></pattern>' +
      '<linearGradient id="txLed" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffd27a" stop-opacity="0"/><stop offset="0.15" stop-color="#ffd27a"/><stop offset="0.85" stop-color="#ffd27a"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></linearGradient>' +
      '<radialGradient id="txLedGlow" cx="0.5" cy="0" r="0.9"><stop offset="0" stop-color="#ffb347" stop-opacity="0.55"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>' +
      '<filter id="txShadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="18" stdDeviation="14" flood-color="#000" flood-opacity="0.55"/></filter>' +
      '</defs>';
  }
  function rect(x, y, w, h, fill, extra) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '" ' + (extra || '') + '/>'; }
  function drawer(x, y, w, h, c) {
    var g = rect(x, y, w, h, c.body, 'rx="2"') +
      rect(x, y, w, 2, c.light) + rect(x, y + h - 2, w, 2, c.edge) +
      rect(x + w * 0.18, y + h / 2 - 2, w * 0.64, 4, c.dark, 'rx="2"') +
      rect(x + w * 0.18, y + h / 2 - 3, w * 0.64, 2, 'rgba(255,255,255,0.35)', 'rx="1"');
    return g;
  }
  function casters(x, w, y) {
    var out = '';
    [x + 28, x + w - 28].forEach(function (cx) {
      out += '<rect x="' + (cx - 8) + '" y="' + (y - 6) + '" width="16" height="10" fill="#111" rx="2"/>' +
        '<circle cx="' + cx + '" cy="' + (y + 12) + '" r="14" fill="#15181c"/>' +
        '<circle cx="' + cx + '" cy="' + (y + 12) + '" r="8" fill="#2a2f35"/>' +
        '<circle cx="' + cx + '" cy="' + (y + 12) + '" r="3" fill="#6b7480"/>';
    });
    return out;
  }
  function base(x, y, w, h, c, banks) {
    // rolling cabinet: wood top, banks of drawers, casters
    var out = '<g filter="url(#txShadow)">' + rect(x, y, w, h, c.dark, 'rx="4"') + '</g>';
    out += rect(x - 6, y - 12, w + 12, 12, WOOD, 'rx="2"') + rect(x - 6, y - 12, w + 12, 2, 'rgba(255,255,255,0.45)');
    var pad = 10, gy = y + pad, gh = h - pad * 2;
    var cols = banks === 2 ? [[x + pad, (w - pad * 3) * 0.58], [x + pad * 2 + (w - pad * 3) * 0.58, (w - pad * 3) * 0.42]] : [[x + pad, w - pad * 2]];
    cols.forEach(function (col, ci) {
      var rows = ci === 0 ? [0.14, 0.14, 0.2, 0.26, 0.26] : [0.14, 0.14, 0.2, 0.52];
      var cy = gy, gap = 5, avail = gh - gap * (rows.length - 1);
      rows.forEach(function (fr) { var dh = avail * fr; out += drawer(col[0], cy, col[1], dh, c); cy += dh + gap; });
    });
    out += casters(x, w, y + h);
    return out;
  }
  function hutch(x, y, w, h, c, led) {
    // top cabinet row + pegboard back, sits on the base top
    var cabH = h * 0.34;
    var out = rect(x, y + cabH, w, h - cabH, c.dark) + rect(x + 10, y + cabH + 8, w - 20, h - cabH - 8, 'url(#txPeg)');
    out += rect(x + 10, y + cabH + 8, w - 20, h - cabH - 8, c.body, 'opacity="0.0"');
    out += '<g filter="url(#txShadow)">' + rect(x - 4, y, w + 8, cabH, c.body, 'rx="3"') + '</g>';
    var n = 3, cw = (w + 8 - 10 * (n + 1)) / n;
    for (var i = 0; i < n; i++) {
      var cx = x - 4 + 10 + i * (cw + 10);
      out += rect(cx, y + 8, cw, cabH - 16, c.dark, 'rx="2"') + rect(cx, y + 8, cw, 2, c.light) + rect(cx + cw * 0.3, y + cabH - 16, cw * 0.4, 3, c.light, 'rx="1.5"');
    }
    if (led) {
      out += rect(x + 20, y + cabH, w - 40, h - cabH, 'url(#txLedGlow)') + rect(x + 20, y + cabH - 1, w - 40, 3, 'url(#txLed)');
    }
    return out;
  }
  function locker(x, y, w, h, c, dir) {
    var out = '<g filter="url(#txShadow)">' + rect(x, y, w, h, c.dark, 'rx="4"') + '</g>';
    out += rect(x + 7, y + 7, w - 14, h - 14, c.body, 'rx="2"') + rect(x + 7, y + 7, w - 14, 2, c.light);
    var hx = dir < 0 ? x + 16 : x + w - 20;
    out += rect(hx, y + h * 0.45, 4, 28, c.light, 'rx="2"');
    out += rect(x + 7, y + h - 46, w - 14, 32, c.dark, 'rx="2"') + rect(x + w * 0.3, y + h - 31, w * 0.4, 3, c.light, 'rx="1.5"');
    out += casters(x, w, y + h);
    return out;
  }
  function sideDrawers(x, y, w, h, c) {
    var out = '<g filter="url(#txShadow)">' + rect(x, y, w, h, c.dark, 'rx="4"') + '</g>';
    out += rect(x - 4, y - 12, w + 8, 12, WOOD, 'rx="2"');
    var pad = 8, rows = [0.22, 0.22, 0.56], cy = y + pad, avail = h - pad * 2 - 5 * 2;
    rows.forEach(function (fr) { var dh = avail * fr; out += drawer(x + pad, cy, w - pad * 2, dh, c); cy += dh + 5; });
    out += casters(x, w, y + h);
    return out;
  }
  function upperCabs(x, y, w, h, c) {
    var out = '<g filter="url(#txShadow)">' + rect(x, y, w, h, c.body, 'rx="3"') + '</g>';
    var n = 3, cw = (w - 10 * (n + 1)) / n;
    for (var i = 0; i < n; i++) { var cx = x + 10 + i * (cw + 10); out += rect(cx, y + 8, cw, h - 16, c.dark, 'rx="2"') + rect(cx, y + 8, cw, 2, c.light) + rect(cx + cw * 0.3, y + h - 15, cw * 0.4, 3, c.light, 'rx="1.5"'); }
    return out;
  }
  function pegboard(x, y, w, h, c) { return rect(x, y, w, h, c.dark) + rect(x + 8, y + 8, w - 16, h - 16, 'url(#txPeg)'); }

  function renderWall(cfg) {
    // cfg: {system:'ut'|'mm', color, mods:{hutch,locker,drawers,locker2,upper,peg,light}}
    var c = PAL[cfg.color] || PAL.black, m = cfg.mods;
    var W = 980, H = 560, floor = 500;
    var parts = '', x;
    if (cfg.system === 'ut') {
      var bw = 420, bh = 250, lw = 120, dw = 120, hh = 180;
      var total = bw + (m.locker ? lw + 10 : 0) + (m.drawers ? dw + 10 : 0);
      x = (W - total) / 2;
      var by = floor - bh;
      if (m.locker) { parts += locker(x, floor - 440, lw, 440, c, -1); x += lw + 10; }
      if (m.hutch) parts += hutch(x, by - 12 - hh, bw, hh, c, m.light);
      parts += base(x, by, bw, bh, c, 2);
      x += bw + 10;
      if (m.drawers) parts += sideDrawers(x, by, dw, bh, c);
    } else {
      var mw = 560, mh = 250, mlw = 120, uh = 70, ph = 120;
      var tot = mw + (m.locker ? mlw + 10 : 0) + (m.locker2 ? mlw + 10 : 0);
      x = (W - tot) / 2;
      var my = floor - mh;
      if (m.locker) { parts += locker(x, floor - 440, mlw, 440, c, -1); x += mlw + 10; }
      var top = my - 12;
      if (m.peg) { parts += pegboard(x + 10, top - ph, mw - 20, ph, c); top -= ph; }
      if (m.upper) { parts += upperCabs(x - 4, top - uh - 6, mw + 8, uh, c); if (m.light) parts += rect(x + 30, top - 6, mw - 60, 80, 'url(#txLedGlow)') + rect(x + 30, top - 7, mw - 60, 3, 'url(#txLed)'); }
      parts += base(x, my, mw, mh, c, 1);
      x += mw + 10;
      if (m.locker2) parts += locker(x, floor - 440, mlw, 440, c, 1);
    }
    var floorG = '<rect x="0" y="' + (floor + 26) + '" width="' + W + '" height="' + (H - floor - 26) + '" fill="rgba(255,255,255,0.03)"/>' +
      '<line x1="0" y1="' + (floor + 26) + '" x2="' + W + '" y2="' + (floor + 26) + '" stroke="rgba(255,255,255,0.08)"/>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Your TOOSA wall">' + svgDefs() + floorG + parts + '</svg>';
  }

  function initBuilder(sec) {
    var dataEl = $('[data-tx-builder-data]', sec);
    if (!dataEl) return;
    var DATA;
    try { DATA = JSON.parse(dataEl.textContent); } catch (e) { return; }
    var state = { system: DATA.systems[0].id, color: DATA.systems[0].colors[0], mods: {} };
    var stage = $('[data-tx-stage]', sec), sysEl = $('[data-tx-systems]', sec), colEl = $('[data-tx-colors]', sec), modEl = $('[data-tx-mods]', sec);
    var totalEl = $('[data-tx-total]', sec), moEl = $('[data-tx-monthly]', sec), saveEl = $('[data-tx-save]', sec), listEl = $('[data-tx-list]', sec), addBtn = $('[data-tx-add]', sec), dims = $('[data-tx-dims]', sec);
    var months = DATA.months || 24;

    function sys() { return DATA.systems.filter(function (s) { return s.id === state.system; })[0]; }
    function variantFor(item) { return item.variants[state.color] || item.variants['*'] || null; }

    function renderControls() {
      var s = sys();
      sysEl.innerHTML = DATA.systems.map(function (o) { return '<button type="button" data-sys="' + o.id + '" class="' + (o.id === state.system ? 'is-on' : '') + '">' + o.name + '</button>'; }).join('');
      if (s.colors.indexOf(state.color) < 0) state.color = s.colors[0];
      colEl.innerHTML = s.colors.map(function (k) {
        var hex = PAL[k] ? PAL[k].body : '#888';
        return '<button type="button" class="tx-swatch ' + (k === state.color ? 'is-on' : '') + '" data-color="' + k + '" aria-label="' + k.charAt(0).toUpperCase() + k.slice(1) + '" style="--c:' + hex + '"><i></i></button>';
      }).join('');
      modEl.innerHTML = s.modules.map(function (mod) {
        var v = variantFor(mod), ok = v && v.available, on = !!state.mods[mod.id];
        if (!ok && on) { state.mods[mod.id] = 0; on = false; }
        var qty = mod.max > 1 ? '<span class="tx-qty" data-qty="' + mod.id + '"><button type="button" data-d="-1" aria-label="Fewer">−</button><b>' + (state.mods[mod.id] || 0) + '</b><button type="button" data-d="1" aria-label="More">+</button></span>' : '';
        return '<div class="tx-mod ' + (on ? 'is-on' : '') + (ok ? '' : ' is-off') + '" data-mod="' + mod.id + '" role="checkbox" aria-checked="' + on + '" tabindex="0">' +
          '<span class="tx-mod__box"><svg viewBox="0 0 16 16" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3 3 7-7"/></svg></span>' +
          '<span class="tx-mod__name">' + mod.name + '<small>' + (ok ? mod.note : 'Out of stock in this colour') + '</small></span>' +
          '<span class="tx-mod__price">' + (v ? money(v.price) : '') + qty + '</span></div>';
      }).join('');
    }

    function renderTotals() {
      var s = sys(), items = [], total = 0, compare = 0;
      var bv = variantFor(s.base);
      if (bv) { items.push({ name: s.base.name, price: bv.price, id: bv.id, qty: 1 }); total += bv.price; compare += bv.compare || bv.price; }
      s.modules.forEach(function (mod) {
        var q = state.mods[mod.id] || 0; if (!q) return;
        var v = variantFor(mod); if (!v) return;
        items.push({ name: mod.name, price: v.price * q, id: v.id, qty: q }); total += v.price * q; compare += (v.compare || v.price) * q;
      });
      totalEl.textContent = money(total);
      moEl.innerHTML = 'or about <b>' + money(total / months) + '/mo</b> over ' + months + ' months with RBC financing';
      saveEl.textContent = compare > total ? 'You save ' + money(compare - total) + ' vs. regular price' : '';
      listEl.innerHTML = items.map(function (it) { return '<li><span>' + it.name + (it.qty > 1 ? ' × ' + it.qty : '') + '</span><span>' + money(it.price) + '</span></li>'; }).join('');
      addBtn.dataset.items = JSON.stringify(items.map(function (it) { return { id: it.id, quantity: it.qty }; }));
      if (dims) dims.textContent = s.dims || '';
      stage.innerHTML = '<div class="tx-stage__glow"></div>' + renderWall({ system: state.system, color: state.color, mods: state.mods }) + (dims ? '' : '');
    }

    sysEl.addEventListener('click', function (e) { var b = e.target.closest('[data-sys]'); if (!b) return; state.system = b.dataset.sys; state.mods = {}; renderControls(); renderTotals(); });
    colEl.addEventListener('click', function (e) { var b = e.target.closest('[data-color]'); if (!b) return; state.color = b.dataset.color; renderControls(); renderTotals(); });
    function toggle(id, d) {
      var s = sys(), mod = s.modules.filter(function (m) { return m.id === id; })[0]; if (!mod) return;
      var v = variantFor(mod); if (!v || !v.available) return;
      var max = mod.max || 1, cur = state.mods[id] || 0;
      if (typeof d === 'number') cur = Math.max(0, Math.min(max, cur + d)); else cur = cur ? 0 : 1;
      state.mods[id] = cur;
      (mod.excludes || []).forEach(function (ex) { if (cur) state.mods[ex] = 0; });
      renderControls(); renderTotals();
    }
    modEl.addEventListener('click', function (e) {
      var q = e.target.closest('[data-d]'); if (q) { toggle(q.closest('[data-qty]').dataset.qty, +q.dataset.d); return; }
      var m = e.target.closest('[data-mod]'); if (m) toggle(m.dataset.mod);
    });
    modEl.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { var m = e.target.closest('[data-mod]'); if (m) { e.preventDefault(); toggle(m.dataset.mod); } } });

    addBtn.addEventListener('click', function () {
      var items; try { items = JSON.parse(addBtn.dataset.items || '[]'); } catch (e) { items = []; }
      if (!items.length) return;
      addBtn.disabled = true; var old = addBtn.innerHTML; addBtn.textContent = 'Adding to cart…';
      fetch('/cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ items: items }) })
        .then(function (r) { if (!r.ok) throw new Error('cart'); return r.json(); })
        .then(function () { toast('Your setup is in the cart'); window.location.href = '/cart'; })
        .catch(function () { addBtn.disabled = false; addBtn.innerHTML = old; toast('Could not add to cart. Please try again or call 778-939-9494.'); });
    });

    renderControls(); renderTotals();
  }

  var toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'tx-toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('is-on');
    clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.classList.remove('is-on'); }, 3200);
  }

  /* ---- drawer story: drawer slides out as the section scrolls into view ---- */
  function initDrawer(sec) {
    var g = $('[data-tx-slide]', sec), balls = $('[data-tx-balls]', sec), load = $('[data-tx-load]', sec);
    if (!g) return;
    var max = +g.dataset.max || 300, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function update() {
      var r = sec.getBoundingClientRect(), vh = window.innerHeight;
      var p = (vh * 0.85 - r.top) / (r.height * 0.9 + vh * 0.35); // 0 → 1 across the section
      p = Math.max(0, Math.min(1, p));
      var e = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p; // ease in-out
      var d = reduced ? max * 0.75 : max * e;
      g.setAttribute('transform', 'translate(' + d + ' 0)');
      if (balls) balls.setAttribute('transform', 'translate(' + d / 2 + ' 0)');
      if (load) load.style.opacity = e > 0.6 ? 1 : 0;
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  }

  /* ---- video gallery ---- */
  function initVideos(sec) {
    var vids = $$('.tx-vid', sec), more = $('[data-tx-more]', sec);
    vids.forEach(function (card) {
      var v = $('video', card); if (!v) return;
      card.addEventListener('click', function () {
        vids.forEach(function (o) { if (o !== card) { var ov = $('video', o); if (ov && !ov.paused) { ov.pause(); o.classList.remove('is-playing'); } } });
        if (v.paused) { v.controls = true; v.muted = false; v.play(); card.classList.add('is-playing'); } else { v.pause(); card.classList.remove('is-playing'); }
      });
      v.addEventListener('ended', function () { card.classList.remove('is-playing'); v.controls = false; });
    });
    if (more) more.addEventListener('click', function () { vids.forEach(function (c) { c.classList.remove('is-hidden'); }); more.parentNode.removeChild(more); });
  }

  function boot(root) {
    initReveal(root);
    $$('.tx-hero', root).forEach(initHero);
    $$('.tx-builder', root).forEach(initBuilder);
    $$('.tx-drawer', root).forEach(initDrawer);
    $$('.tx-videos', root).forEach(initVideos);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { boot(document); }); else boot(document);
  // Shopify theme editor re-renders sections
  document.addEventListener('shopify:section:load', function (e) { boot(e.target); });
})();
