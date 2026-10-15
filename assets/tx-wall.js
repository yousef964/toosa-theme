/* TOOSA "Build your wall": real 3D models (three.js bundle in tx-3d.js) with module toggles, finish colours and live dimensions. */
(function () {
  'use strict';
  var T = window.TX3D; if (!T) return;
  var THREE = T.THREE;

  // where each module file sits relative to its base (base files are centred on the floor at the origin)
  var PLACE = {
    ut: { base: {}, hutch: {}, locker: {}, drawers: {} },
    mm: { base: {}, peg: {}, upper: {}, locker: { x: -0.256 }, locker2: { x: 0.256, rotY: Math.PI } }
  };
  var PAINT = { grey: '#6a6f77', black: '#1b1c1f', red: '#b8222a' };
  var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

  function mount(stage, cfg) {
    var files = cfg.files || {};
    stage.innerHTML = '';
    stage.classList.add('is-3d'); // the CSS aspect ratio applies from here, so measure after it
    var W = stage.clientWidth || 800, H = stage.clientHeight || Math.round(W * 0.75);
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = 'tx-stage__canvas';
    stage.appendChild(renderer.domElement);
    var hint = document.createElement('div'); hint.className = 'tx-stage__hint'; hint.textContent = 'Drag to look around · pinch or scroll to zoom'; stage.appendChild(hint);
    var dims = document.createElement('div'); dims.className = 'tx-stage__dims'; stage.appendChild(dims);
    var load = document.createElement('div'); load.className = 'tx-stage__load'; load.innerHTML = '<i></i><span>Loading 3D model…</span>'; stage.appendChild(load);
    var reset = document.createElement('button'); reset.type = 'button'; reset.className = 'tx-stage__reset'; reset.textContent = 'Reset view'; stage.appendChild(reset);

    var scene = new THREE.Scene();
    var pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new T.RoomEnvironment(), 0.04).texture; pm.dispose();
    var cam = new THREE.PerspectiveCamera(30, W / H, 0.05, 60);
    var ctl = new T.OrbitControls(cam, renderer.domElement);
    ctl.enableDamping = true; ctl.dampingFactor = 0.08; ctl.enablePan = false; ctl.minPolarAngle = 0.35; ctl.maxPolarAngle = 1.62; ctl.autoRotate = true; ctl.autoRotateSpeed = 0.6; ctl.minDistance = 1.2; ctl.maxDistance = 12;
    var key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(2.5, 4.5, 3); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 4; key.shadow.bias = -0.0005;
    key.shadow.camera.left = -3; key.shadow.camera.right = 3; key.shadow.camera.top = 3; key.shadow.camera.bottom = -1; key.shadow.camera.near = 0.5; key.shadow.camera.far = 14; scene.add(key);
    var fill = new THREE.DirectionalLight(0xdfe7ff, 0.6); fill.position.set(-3, 2, -2); scene.add(fill);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1d22, 0.5));
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.ShadowMaterial({ opacity: 0.42 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    var root = new THREE.Group(); scene.add(root);

    var loader = new T.GLTFLoader(); loader.setMeshoptDecoder(T.MeshoptDecoder);
    var cache = {}, groups = {}, state = { system: null, color: null, mods: {} }, anims = [], pending = 0, active = true;
    var camGoal = { target: new THREE.Vector3(0, 0.6, 0), dist: 4 }, camStart = null, camT = 1, dirty = true, idleTimer = 0;

    function paintColor(k) { return PAINT[k] || PAINT.grey; }
    function recolor(g) { g.traverse(function (o) { if (o.isMesh && o.material && /paint/.test(o.material.name)) o.material.color.set(paintColor(state.color)); }); }
    function loadFile(url) {
      if (cache[url]) return cache[url];
      pending++; load.hidden = false;
      cache[url] = new Promise(function (res, rej) {
        loader.load(url, function (g) {
          g.scene.traverse(function (o) {
            if (o.isMesh) {
              o.castShadow = true; o.receiveShadow = true;
              o.material = o.material.clone(); // own copy per module so colours never leak between files
              if (/paint/.test(o.material.name)) { o.material.roughness = 0.5; o.material.metalness = 0.2; }
            }
          });
          res(g.scene);
        }, undefined, rej);
      }).then(function (s) { pending--; if (!pending) load.hidden = true; return s; }, function (e) { pending--; if (!pending) load.hidden = true; throw e; });
      return cache[url];
    }
    function gkey(sys, mod) { return sys + ':' + mod; }
    function place(sys, mod, obj) {
      var p = (PLACE[sys] || {})[mod] || {};
      var g = new THREE.Group(); g.add(obj);
      if (p.rotY) obj.rotation.y = p.rotY;
      g.position.set(p.x || 0, p.y || 0, p.z || 0);
      return g;
    }
    function show(sys, mod, on) {
      var k = gkey(sys, mod), url = (files[sys] || {})[mod]; if (!url) return;
      if (groups[k]) { animate(groups[k], on, mod); return; }
      if (!on) return;
      groups[k] = { pending: true };
      loadFile(url).then(function (obj) {
        var g = place(sys, mod, obj.clone());
        g.userData.mod = mod; g.visible = false; root.add(g);
        groups[k] = g; recolor(g);
        animate(g, !!(state.system === sys && (mod === 'base' || state.mods[mod])), mod);
      }).catch(function () { groups[k] = null; });
    }
    function animate(g, on, mod) {
      if (g.pending) return;
      if (g.visible === on && !g.userData.anim) { return; }
      var from = mod === 'hutch' || mod === 'upper' ? new THREE.Vector3(0, 0.35, 0) : mod === 'peg' ? new THREE.Vector3(0, 0, -0.3) : mod === 'locker' ? new THREE.Vector3(-0.45, 0, 0) : mod === 'locker2' || mod === 'drawers' ? new THREE.Vector3(0.45, 0, 0) : new THREE.Vector3(0, 0, 0);
      var base = g.userData.base || (g.userData.base = g.position.clone());
      if (!active) { // stage scrolled away (phones): no frames run, so land on the end state at once
        g.position.copy(base); g.scale.setScalar(1); g.visible = on; delete g.userData.anim; dirty = true; frameCamera(true); return;
      }
      g.visible = true;
      g.userData.anim = { t: 0, on: on, from: from, base: base, dur: on ? 520 : 320 };
      anims.push(g); dirty = true;
      frameCamera();
    }
    function bbox() {
      var b = new THREE.Box3(), any = false;
      root.children.forEach(function (g) {
        if (!g.visible || (g.userData.anim && !g.userData.anim.on)) return;
        var bb = new THREE.Box3().setFromObject(g); if (bb.isEmpty()) return;
        bb.min.sub(g.position); bb.max.sub(g.position); bb.translate(g.userData.base || g.position); // ignore slide-in offsets
        any ? b.union(bb) : b.copy(bb); any = true;
      });
      return any ? b : null;
    }
    function frameCamera(instant) {
      var b = bbox(); if (!b) return;
      var size = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
      // frame the bounding sphere so the model stays inside whatever angle it spins to
      var r = size.length() / 2 + 0.05, vfov = (cam.fov * Math.PI) / 180, hfov = 2 * Math.atan(Math.tan(vfov / 2) * cam.aspect);
      var dist = (r / Math.sin(Math.min(vfov, hfov) / 2)) * 0.96;
      camGoal.target.set(c.x, c.y * 0.96, c.z); camGoal.dist = dist;
      camStart = { target: ctl.target.clone(), dist: cam.position.distanceTo(ctl.target) }; camT = instant ? 1 : 0;
      dims.textContent = fmt(size);
      dirty = true;
    }
    function fmt(s) {
      var toIn = function (m) { return Math.round(m / 0.0254); }, toCm = function (m) { return Math.round(m * 100); };
      return toIn(s.x) + '" W × ' + toIn(s.z) + '" D × ' + toIn(s.y) + '" H  ·  ' + toCm(s.x) + ' × ' + toCm(s.z) + ' × ' + toCm(s.y) + ' cm';
    }
    function update(st) {
      var sysChanged = st.system !== state.system;
      state = { system: st.system, color: st.color, mods: Object.assign({}, st.mods) };
      Object.keys(groups).forEach(function (k) {
        var g = groups[k]; if (!g || g.pending) return;
        var parts = k.split(':');
        if (parts[0] !== state.system) { if (g.visible) animate(g, false, parts[1]); return; }
        recolor(g);
      });
      show(state.system, 'base', true);
      var mods = (cfg.modules || {})[state.system] || Object.keys(files[state.system] || {});
      mods.forEach(function (m) { if (m === 'base') return; show(state.system, m, !!state.mods[m]); });
      if (sysChanged) { ctl.autoRotate = true; }
      dirty = true;
    }
    // initial camera
    cam.position.set(2.6, 1.3, 3.6); ctl.target.set(0, 0.6, 0); ctl.update();
    var last = performance.now();
    function tick(now) {
      if (!active) return;
      requestAnimationFrame(tick);
      var dt = Math.min(50, now - last); last = now;
      // module slide-ins
      for (var i = anims.length - 1; i >= 0; i--) {
        var g = anims[i], a = g.userData.anim; if (!a) { anims.splice(i, 1); continue; }
        a.t = Math.min(1, a.t + dt / a.dur);
        var e = ease(a.t), k = a.on ? 1 - e : e;
        g.position.copy(a.base).addScaledVector(a.from, k);
        var s = a.on ? 0.92 + 0.08 * e : 1 - 0.08 * e; g.scale.setScalar(s);
        if (a.t >= 1) { g.position.copy(a.base); g.scale.setScalar(1); g.visible = a.on; delete g.userData.anim; anims.splice(i, 1); }
        dirty = true;
      }
      if (camT < 1) {
        camT = Math.min(1, camT + dt / 900); var e2 = ease(camT);
        var tgt = camStart.target.clone().lerp(camGoal.target, e2), d = camStart.dist + (camGoal.dist - camStart.dist) * e2;
        var dir = cam.position.clone().sub(ctl.target).normalize();
        ctl.target.copy(tgt); cam.position.copy(tgt).addScaledVector(dir, d);
        dirty = true;
      }
      if (ctl.update() || dirty || ctl.autoRotate) { renderer.render(scene, cam); dirty = false; }
    }
    requestAnimationFrame(tick);
    ctl.addEventListener('start', function () { ctl.autoRotate = false; clearTimeout(idleTimer); });
    ctl.addEventListener('end', function () { clearTimeout(idleTimer); idleTimer = setTimeout(function () { ctl.autoRotate = true; }, 7000); });
    reset.addEventListener('click', function () {
      var dir = new THREE.Vector3(0.62, 0.3, 0.7).normalize(); var d = cam.position.distanceTo(ctl.target);
      cam.position.copy(ctl.target).addScaledVector(dir, d); frameCamera(); ctl.autoRotate = true;
    });
    function resize() {
      var w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); dirty = true;
    }
    window.addEventListener('resize', resize);
    if ('ResizeObserver' in window) new ResizeObserver(function () { resize(); }).observe(stage);
    requestAnimationFrame(resize);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { var vis = en[0].isIntersecting; if (vis && !active) { active = true; last = performance.now(); requestAnimationFrame(tick); } else if (!vis) active = false; }, { threshold: 0.02 }).observe(stage);
    }
    return { update: update, resize: resize };
  }

  window.TXWall = { mount: mount };
})();
