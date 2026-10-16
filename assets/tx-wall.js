/* TOOSA "Build your wall": real 3D models (three.js bundle in tx-3d.js) with module toggles, finish colours, live dimensions
   and drawers / doors that open (parts named drawer.* / door.* / handle.* inside the GLB files). */
(function () {
  'use strict';
  var T = window.TX3D; if (!T) return;
  var THREE = T.THREE;

  // where each module file sits relative to its base (base files are centred on the floor at the origin).
  // Side modules come as <id>_l / <id>_r; the file is drawn on its native side and mirrored for the other one.
  var PLACE = {
    ut: { base: {}, hutch: {}, locker_l: {}, locker_r: { mirror: true }, drawers_r: {}, drawers_l: { mirror: true } },
    mm: { base: {}, peg: {}, upper: {}, locker_l: { x: -0.209, z: -0.125 }, locker_r: { x: 0.209, z: -0.125, mirror: true } } // lockers sit flush with the drawer fronts
  };
  var PAINT = { grey: '#6a6f77', black: '#1b1c1f', red: '#b8222a' };
  var PART_RE = /^(drawer|door|lid|handle)-([^-]+)(?:-(xmin|xmax|ymax|lift|seam|fold)(\d+)?)?-(\w+)$/; // three.js strips dots from node names, so parts use hyphens; an optional number is the opening angle in degrees
  // the lighting kit: an LED bar under the hutch (Ultra Task) or under the upper cabinets (Mega Max), only when those are on the wall
  var LIGHT = { ut: { y: 1.56, z: 0.12, w: 1.3, needs: ['hutch'] }, mm: { y: 1.395, z: -0.05, w: 1.75, needs: ['peg', 'upper'] } };
  var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  function fileKey(mod) { return mod.replace(/_[lr]$/, ''); }

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
    var hint = document.createElement('div'); hint.className = 'tx-stage__hint'; hint.textContent = (window.matchMedia && matchMedia('(pointer: coarse)').matches) ? 'Two fingers to turn · tap a drawer or door to open it' : 'Drag to look around · click, then scroll to zoom · tap a drawer or door'; stage.appendChild(hint);
    var dims = document.createElement('div'); dims.className = 'tx-stage__dims'; stage.appendChild(dims);
    var load = document.createElement('div'); load.className = 'tx-stage__load'; load.innerHTML = '<i></i><span>Loading 3D model…</span>'; stage.appendChild(load);
    var btns = document.createElement('div'); btns.className = 'tx-stage__btns'; stage.appendChild(btns);
    var openBtn = document.createElement('button'); openBtn.type = 'button'; openBtn.className = 'tx-stage__open'; openBtn.textContent = 'Open everything'; btns.appendChild(openBtn);
    var foamBtn = document.createElement('button'); foamBtn.type = 'button'; foamBtn.className = 'tx-stage__foam'; foamBtn.textContent = 'Foam inserts'; btns.appendChild(foamBtn);
    var reset = document.createElement('button'); reset.type = 'button'; reset.className = 'tx-stage__reset'; reset.textContent = 'Reset view'; btns.appendChild(reset);

    var scene = new THREE.Scene();
    var pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new T.RoomEnvironment(), 0.04).texture; pm.dispose();
    var cam = new THREE.PerspectiveCamera(30, W / H, 0.05, 60);
    var ctl = new T.OrbitControls(cam, renderer.domElement);
    ctl.enableDamping = true; ctl.dampingFactor = 0.08; ctl.enablePan = false; ctl.enableZoom = false; // wheel zoom only after a click, so scrolling the page never gets caught
    ctl.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE }; // one finger scrolls the page, two fingers turn and zoom the model
    renderer.domElement.style.touchAction = 'pan-y'; // OrbitControls sets 'none', which would trap the finger; the page must keep scrolling
    ctl.minPolarAngle = 0.35; ctl.maxPolarAngle = 1.62; ctl.autoRotate = true; ctl.autoRotateSpeed = 0.6; ctl.minDistance = 1.2; ctl.maxDistance = 12;
    var key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(2.5, 4.5, 3); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 4; key.shadow.bias = -0.0005;
    key.shadow.camera.left = -3; key.shadow.camera.right = 3; key.shadow.camera.top = 3; key.shadow.camera.bottom = -1; key.shadow.camera.near = 0.5; key.shadow.camera.far = 14; scene.add(key);
    var fill = new THREE.DirectionalLight(0xdfe7ff, 0.6); fill.position.set(-3, 2, -2); scene.add(fill);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1d22, 0.5));
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.ShadowMaterial({ opacity: 0.42 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    var root = new THREE.Group(); scene.add(root);

    var loader = new T.GLTFLoader(); loader.setMeshoptDecoder(T.MeshoptDecoder);
    var cache = {}, groups = {}, state = { system: null, color: null, mods: {}, open: false }, anims = [], pending = 0, active = true;
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

    // drawers, doors and side handles are separate named meshes: hang each moving part under a pivot at its hinge or slide axis
    function buildParts(obj) {
      obj.updateMatrixWorld(true);
      var byId = {}, handles = { l: [], r: [] };
      obj.traverse(function (o) {
        if (!o.isMesh) return;
        var m = PART_RE.exec(o.name || ''); if (!m) return;
        if (m[1] === 'handle') { (handles[m[2]] || (handles[m[2]] = [])).push(o); return; }
        var key = m[1] === 'lid' ? 'lid:' + m[2] : m[2];
        var p = byId[key] || (byId[key] = { kind: m[1], hinge: m[3] || '', angle: m[4] ? +m[4] : 0, meshes: [] });
        p.meshes.push(o);
      });
      var parts = [], lids = {};
      Object.keys(byId).sort(function (a, b) { return (a.indexOf('lid:') === 0 ? 0 : 1) - (b.indexOf('lid:') === 0 ? 0 : 1); }).forEach(function (id) {
        var p = byId[id], box = new THREE.Box3();
        p.meshes.forEach(function (m) { box.expandByObject(m); });
        if (box.isEmpty()) return;
        var c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
        var at = p.hinge === 'xmin' ? new THREE.Vector3(box.min.x, c.y, box.min.z) : p.hinge === 'xmax' ? new THREE.Vector3(box.max.x, c.y, box.min.z) : (p.hinge === 'ymax' || p.hinge === 'lift' || p.hinge === 'seam') ? new THREE.Vector3(c.x, box.max.y, box.min.z) : p.hinge === 'fold' ? new THREE.Vector3(c.x, box.max.y, box.max.z) : c;
        var pivot = new THREE.Group(); pivot.position.copy(at); obj.add(pivot); pivot.updateMatrixWorld(true);
        p.meshes.forEach(function (m) { pivot.attach(m); });
        if (p.hinge === 'fold' && lids[id]) { lids[id].pivot.attach(pivot); } // the folding panel rides on its lid
        var part = { id: id, kind: p.kind, hinge: p.hinge, pivot: pivot, travel: Math.min(0.5, size.z * 0.8), size: size, open: 0, goal: 0,
          angle: ((p.angle || (p.hinge === 'lift' ? 96 : p.hinge === 'seam' ? 125 : p.hinge === 'fold' ? 150 : p.hinge === 'ymax' ? 83 : 100)) * Math.PI) / 180, lift: size.y * 0.66, back: size.y * 0.3 };
        if (p.kind === 'lid') lids[id.slice(4)] = part;
        if (p.hinge === 'fold' && lids[id]) { part.link = lids[id]; lids[id].link = part; } // a lid and its panel open as one
        if (p.kind === 'drawer') { // a foam insert that rides in the drawer (shown on demand)
          var foam = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.05, size.x - 0.05), 0.03, Math.max(0.05, size.z - 0.07)), foamMaterial());
          foam.position.set(0, -size.y / 2 + 0.05, -0.01); foam.visible = false; foam.castShadow = false; foam.userData.foam = true; pivot.add(foam); part.foam = foam;
        }
        p.meshes.forEach(function (m) { m.userData.part = part; });
        parts.push(part);
      });
      return { parts: parts, handles: handles };
    }
    function applyPart(p) {
      var e = ease(p.open);
      if (p.kind === 'drawer') p.pivot.position.z = p.pivot.userData.z0 + e * p.travel;
      else if (p.hinge === 'lift') { p.pivot.rotation.x = -e * p.angle; p.pivot.position.y = p.pivot.userData.y0 + e * p.lift; p.pivot.position.z = p.pivot.userData.z0 - e * p.back; } // the hutch door rises on its arms and lies over the roof, overhanging the front
      else if (p.hinge === 'ymax' || p.hinge === 'seam') p.pivot.rotation.x = -e * p.angle; // lids and cabinet doors lift up and out; the hutch lid swings up and back over the roof
      else if (p.hinge === 'fold') p.pivot.rotation.x = e * p.angle;          // the hutch's front panel folds in against its lid
      else p.pivot.rotation.y = (p.hinge === 'xmax' ? 1 : -1) * e * p.angle; // hinged doors swing out to the front
    }
    var foamTex = null, foamMat = null;
    function foamMaterial() { // two-tone EVA: red top layer with the tool cut-outs showing the black layer underneath
      if (foamMat) return foamMat;
      var cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512; var g = cv.getContext('2d');
      g.fillStyle = '#b8222a'; g.fillRect(0, 0, 1024, 512);
      function hole(path) { g.fillStyle = '#121212'; g.fill(path); }
      var i, r;
      for (i = 0; i < 9; i++) { r = 22 + (i % 3) * 5; var ph = new Path2D(); ph.arc(90 + i * 105, 110, r, 0, Math.PI * 2); hole(ph); g.fillStyle = '#8a8f96'; g.beginPath(); g.arc(90 + i * 105, 110, r * 0.62, 0, Math.PI * 2); g.fill(); g.fillStyle = '#121212'; g.beginPath(); g.arc(90 + i * 105, 110, r * 0.32, 0, Math.PI * 2); g.fill(); }
      for (i = 0; i < 4; i++) { var y = 230 + i * 62, len = 760 - i * 110; var pw = new Path2D(); pw.roundRect(70, y - 11, len, 22, 11); pw.arc(70 + 8, y, 26, 0, Math.PI * 2); pw.arc(70 + len - 8, y, 22, 0, Math.PI * 2); hole(pw); g.fillStyle = '#9ba1a8'; g.beginPath(); g.roundRect(80, y - 6, len - 20, 12, 6); g.fill(); }
      for (i = 0; i < 3; i++) { var x = 860, y2 = 240 + i * 80; var pp = new Path2D(); pp.roundRect(x, y2 - 20, 120, 40, 12); hole(pp); g.fillStyle = '#2b2f36'; g.beginPath(); g.roundRect(x + 8, y2 - 12, 104, 24, 8); g.fill(); }
      foamTex = new THREE.CanvasTexture(cv); foamTex.colorSpace = THREE.SRGBColorSpace; foamTex.anisotropy = 4;
      foamMat = new THREE.MeshStandardMaterial({ map: foamTex, roughness: 0.95, metalness: 0 });
      return foamMat;
    }
    function setFoam(on) {
      state.foam = on; foamBtn.textContent = on ? 'Remove foam inserts' : 'Foam inserts';
      root.children.forEach(function (g) { (g.userData.parts || []).forEach(function (p) { if (p.foam) p.foam.visible = on; }); });
      if (on) setOpenAll(true); else dirty = true;
    }
    // the LED kit: an emissive bar plus a warm light, built per system, only meaningful under a hutch or upper cabinets
    var lights = {};
    function lightOn(sys) {
      var L = LIGHT[sys]; if (!L) return false;
      return !!state.mods.light && L.needs.every(function (m) { return state.mods[m]; });
    }
    function showLight(sys, on) {
      var L = LIGHT[sys]; if (!L) return;
      if (!lights[sys]) {
        var g = new THREE.Group();
        var bar = new THREE.Mesh(new THREE.BoxGeometry(L.w, 0.018, 0.03), new THREE.MeshStandardMaterial({ color: 0xfff4dc, emissive: 0xfff1c9, emissiveIntensity: 2.4, roughness: 0.4 })); g.add(bar);
        var pl = new THREE.PointLight(0xffe2b0, 4.5, 2.4, 1.6); pl.position.set(0, -0.03, 0.06); g.add(pl);
        var pl2 = new THREE.PointLight(0xffe2b0, 1.6, 1.6, 1.6); pl2.position.set(-L.w * 0.35, -0.03, 0.08); g.add(pl2);
        var pl3 = new THREE.PointLight(0xffe2b0, 1.6, 1.6, 1.6); pl3.position.set(L.w * 0.35, -0.03, 0.08); g.add(pl3);
        g.position.set(0, L.y, L.z); g.userData.light = sys; g.visible = false; scene.add(g); lights[sys] = g;
      }
      lights[sys].visible = on; dirty = true;
    }
    function setOpen(g, on, instant) {
      (g.userData.parts || []).forEach(function (p) { p.goal = on ? 1 : 0; if (instant) { p.open = p.goal; applyPart(p); } });
      dirty = true;
    }
    function applyHandles(g) {
      var h = g.userData.handles; if (!h) return;
      ['l', 'r'].forEach(function (side) { var on = !state.mods['locker_' + side]; (h[side] || []).forEach(function (m) { m.visible = on; }); });
      dirty = true;
    }

    function place(sys, mod, obj) {
      var p = (PLACE[sys] || {})[mod] || {};
      var g = new THREE.Group(); g.add(obj);
      var built = buildParts(obj);
      built.parts.forEach(function (pt) { pt.pivot.userData.z0 = pt.pivot.position.z; pt.pivot.userData.y0 = pt.pivot.position.y; if (pt.foam) pt.foam.visible = !!state.foam; });
      g.userData.parts = built.parts; g.userData.handles = built.handles;
      if (p.mirror) obj.scale.x = -1;
      g.position.set(p.x || 0, p.y || 0, p.z || 0);
      g.updateMatrixWorld(true);
      g.userData.box = new THREE.Box3().setFromObject(g); // closed, at rest: dimensions ignore slide-ins and open drawers
      return g;
    }
    function show(sys, mod, on) {
      var k = gkey(sys, mod), url = (files[sys] || {})[mod] || (files[sys] || {})[fileKey(mod)]; if (!url) return;
      if (groups[k]) { animate(groups[k], on, mod); return; }
      if (!on) return;
      groups[k] = { pending: true };
      loadFile(url).then(function (obj) {
        var g = place(sys, mod, obj.clone());
        g.userData.mod = mod; g.visible = false; root.add(g);
        groups[k] = g; recolor(g); applyHandles(g);
        if (state.open) setOpen(g, true, true);
        animate(g, !!(state.system === sys && (mod === 'base' || state.mods[mod])), mod);
      }).catch(function () { groups[k] = null; });
    }
    function animate(g, on, mod) {
      if (g.pending) return;
      if (g.visible === on && !g.userData.anim) { return; }
      var side = /_l$/.test(mod) ? -1 : /_r$/.test(mod) ? 1 : 0;
      var from = mod === 'hutch' || mod === 'upper' ? new THREE.Vector3(0, 0.35, 0) : mod === 'peg' ? new THREE.Vector3(0, 0, -0.3) : side ? new THREE.Vector3(0.45 * side, 0, 0) : new THREE.Vector3(0, 0, 0);
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
        if (!g.visible || (g.userData.anim && !g.userData.anim.on) || !g.userData.box) return;
        any ? b.union(g.userData.box) : b.copy(g.userData.box); any = true;
      });
      return any ? b : null;
    }
    function frameCamera(instant) {
      var b = bbox(); if (!b) return;
      var size = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
      dims.textContent = fmt(size);
      root.children.forEach(function (g) { (g.userData.parts || []).forEach(function (p) { if (p.kind === 'lid' && p.goal) b.expandByPoint(new THREE.Vector3(c.x, b.max.y + p.size.z * 0.9, b.min.z)); }); }); // an open hutch lid stands above the roof: keep it in frame
      size = b.getSize(new THREE.Vector3()); c = b.getCenter(new THREE.Vector3());
      // frame the bounding sphere so the model stays inside whatever angle it spins to
      var r = size.length() / 2 + 0.05, vfov = (cam.fov * Math.PI) / 180, hfov = 2 * Math.atan(Math.tan(vfov / 2) * cam.aspect);
      var dist = (r / Math.sin(Math.min(vfov, hfov) / 2)) * 0.96;
      camGoal.target.set(c.x, c.y * 0.96, c.z); camGoal.dist = dist;
      camStart = { target: ctl.target.clone(), dist: cam.position.distanceTo(ctl.target) }; camT = instant ? 1 : 0;
      dirty = true;
    }
    function fmt(s) {
      var toIn = function (m) { return Math.round(m / 0.0254); }, toCm = function (m) { return Math.round(m * 100); };
      return toIn(s.x) + '" W × ' + toIn(s.z) + '" D × ' + toIn(s.y) + '" H  ·  ' + toCm(s.x) + ' × ' + toCm(s.z) + ' × ' + toCm(s.y) + ' cm';
    }
    function visibleGroups() {
      return root.children.filter(function (g) { return g.visible && !(g.userData.anim && !g.userData.anim.on) && g.userData.mod; });
    }
    function update(st) {
      var sysChanged = st.system !== state.system;
      state.system = st.system; state.color = st.color; state.mods = Object.assign({}, st.mods);
      Object.keys(groups).forEach(function (k) {
        var g = groups[k]; if (!g || g.pending) return;
        var parts = k.split(':');
        if (parts[0] !== state.system) { if (g.visible) animate(g, false, parts[1]); return; }
        recolor(g); applyHandles(g);
      });
      show(state.system, 'base', true);
      var mods = (cfg.modules || {})[state.system] || Object.keys(files[state.system] || {});
      mods.forEach(function (m) { if (m === 'base' || m === 'light') return; show(state.system, m, !!state.mods[m]); });
      Object.keys(LIGHT).forEach(function (sys) { showLight(sys, sys === state.system && lightOn(sys)); });
      if (sysChanged) { ctl.autoRotate = true; }
      dirty = true;
    }
    function setOpenAll(on) {
      state.open = on; openBtn.textContent = on ? 'Close everything' : 'Open everything';
      visibleGroups().forEach(function (g) { setOpen(g, on); });
      frameCamera();
    }
    openBtn.addEventListener('click', function () { setOpenAll(!state.open); });
    foamBtn.addEventListener('click', function () { setFoam(!state.foam); });

    // tap a drawer or door to open just that one (a drag is a look-around, not a tap)
    var ray = new THREE.Raycaster(), down = null;
    renderer.domElement.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    renderer.domElement.addEventListener('pointerup', function (e) {
      if (!down) return; var d = down; down = null;
      if (Math.abs(e.clientX - d.x) > 6 || Math.abs(e.clientY - d.y) > 6 || performance.now() - d.t > 600) return;
      var r = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), cam);
      var hits = ray.intersectObjects(visibleGroups(), true);
      for (var i = 0; i < hits.length; i++) {
        var o = hits[i].object; if (!o.visible || o.userData.foam) continue;
        var p = o.userData.part; if (p) { p.goal = p.goal ? 0 : 1; if (p.link) { p.link.goal = p.goal; frameCamera(); } dirty = true; }
        break; // the nearest solid thing decides: a cabinet body in front of a drawer is not a tap on the drawer
      }
    });

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
      // drawers and doors easing to their goal
      for (var j = 0; j < root.children.length; j++) {
        var gg = root.children[j]; if (!gg.visible || !gg.userData.parts) continue;
        for (var q = 0; q < gg.userData.parts.length; q++) {
          var p = gg.userData.parts[q]; if (p.open === p.goal) continue;
          p.open = p.goal > p.open ? Math.min(p.goal, p.open + dt / 480) : Math.max(p.goal, p.open - dt / 360);
          applyPart(p); dirty = true;
        }
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
    renderer.domElement.addEventListener('pointerdown', function () { ctl.enableZoom = true; });
    renderer.domElement.addEventListener('pointerleave', function () { ctl.enableZoom = false; });
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
    function setView(x, y, z) { var dir = new THREE.Vector3(x, y, z).normalize(), d = cam.position.distanceTo(ctl.target); cam.position.copy(ctl.target).addScaledVector(dir, d); ctl.autoRotate = false; clearTimeout(idleTimer); dirty = true; }
    return { update: update, resize: resize, open: setOpenAll, foam: setFoam, view: setView };
  }

  window.TXWall = { mount: mount };
})();
