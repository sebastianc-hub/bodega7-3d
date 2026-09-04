/* ============================================================
   ENGINE · escena Three.js dirigida por datos.
   Recibe un "layout" {W,D,H,name,subs,origin} y una lista de
   items; construye un Group por item para poder moverlos y
   reconstruirlos de forma individual.
   Coordenadas de plano (x der, y abajo) → mundo: X = x - W/2,
   Z = y - D/2 (el root se desplaza -W/2, -D/2).
   ============================================================ */
window.Engine = function (container) {
  'use strict';
  const T = THREE;
  const CAT = window.CATALOG;

  /* ---------- Renderer / escena ---------- */
  const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  const scene = new T.Scene();
  scene.background = new T.Color(0xeef1f4);

  const persp = new T.PerspectiveCamera(45, 1, 0.1, 1200);
  const ortho = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 800);
  ortho.up.set(0, 0, -1);
  let camera = persp;

  const ctlP = new T.OrbitControls(persp, renderer.domElement);
  ctlP.enableDamping = true; ctlP.dampingFactor = 0.08;
  ctlP.maxPolarAngle = Math.PI / 2 - 0.01; ctlP.minDistance = 2; ctlP.maxDistance = 400;
  const ctlO = new T.OrbitControls(ortho, renderer.domElement);
  ctlO.enableRotate = false; ctlO.screenSpacePanning = true; ctlO.enabled = false;
  ctlO.mouseButtons = { LEFT: T.MOUSE.PAN, MIDDLE: T.MOUSE.DOLLY, RIGHT: T.MOUSE.PAN };
  ctlO.touches = { ONE: T.TOUCH.PAN, TWO: T.TOUCH.DOLLY_PAN };
  ctlO.minZoom = 0.3; ctlO.maxZoom = 12;

  scene.add(new T.HemisphereLight(0xffffff, 0x9aa2aa, 0.55));
  const sun = new T.DirectionalLight(0xffffff, 1.1);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004;
  scene.add(sun); scene.add(sun.target);
  const fill = new T.DirectionalLight(0xdfe8f2, 0.35); fill.position.set(-45, 35, -35); scene.add(fill);

  const ground = new T.Mesh(new T.PlaneGeometry(900, 900), new T.MeshStandardMaterial({ color: 0xdadee2, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; ground.receiveShadow = true; scene.add(ground);
  const gridFar = new T.GridHelper(900, 180, 0xc8ced4, 0xd3d8dd); gridFar.position.y = -0.04; scene.add(gridFar);

  const root = new T.Group(); scene.add(root);
  const shellG = new T.Group(), itemsG = new T.Group(); root.add(shellG, itemsG);

  /* ---------- Materiales compartidos ---------- */
  const M = {
    slab: new T.MeshStandardMaterial({ color: 0x8f959b, roughness: 0.9 }),
    floor: new T.MeshStandardMaterial({ color: 0xa9aeb3, roughness: 0.9 }),
    wall: new T.MeshStandardMaterial({ color: 0xc9d2da, roughness: 0.85, transparent: true, opacity: 0.14, depthWrite: false }),
    part: new T.MeshStandardMaterial({ color: 0x9fb0c2, roughness: 0.85, transparent: true, opacity: 0.22, depthWrite: false }),
    post: new T.MeshStandardMaterial({ color: 0x1a4f8f, roughness: 0.55, metalness: 0.35 }),
    brace: new T.MeshStandardMaterial({ color: 0xb4bcc2, roughness: 0.5, metalness: 0.5 }),
    beam: new T.MeshStandardMaterial({ color: 0xe46c0a, roughness: 0.5, metalness: 0.3 }),
    deck: new T.MeshStandardMaterial({ color: 0xcdd3d8, roughness: 0.6, metalness: 0.4 }),
    pallet: new T.MeshStandardMaterial({ color: 0xa58352, roughness: 0.95 }),
    red: new T.MeshStandardMaterial({ color: 0xc21807, roughness: 0.4, metalness: 0.2 }),
    dark: new T.MeshStandardMaterial({ color: 0x222831, roughness: 0.6 }),
    grey: new T.MeshStandardMaterial({ color: 0x666d75, roughness: 0.6, metalness: 0.3 }),
    yellow: new T.MeshStandardMaterial({ color: 0xe8b90c, roughness: 0.6 }),
    white: new T.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.6 }),
    green: new T.MeshStandardMaterial({ color: 0x00702a, roughness: 0.6 }),
    roomWall: new T.MeshStandardMaterial({ color: 0xcfc3a6, roughness: 0.9 }),
    roomCap: new T.MeshStandardMaterial({ color: 0xb9b09c, roughness: 0.9 }),
    edge: new T.LineBasicMaterial({ color: 0x4a5866 }),
    dim: new T.LineBasicMaterial({ color: 0x5b6a78 }),
    dimCone: new T.MeshBasicMaterial({ color: 0x5b6a78 }),
  };
  const kraft = [0xb5854f, 0xc49a6c, 0xa87b4a, 0xcaa273].map(c => new T.MeshStandardMaterial({ color: c, roughness: 0.92 }));
  const own = mat => { mat.userData.own = true; return mat; };
  const std = (color, extra) => own(new T.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.65, metalness: 0.15 }, extra || {})));
  const col = c => new T.Color(typeof c === 'string' ? c : (c || 0x888888));

  /* ---------- Utilidades geométricas ---------- */
  function edges(mesh) {
    const e = new T.LineSegments(new T.EdgesGeometry(mesh.geometry), M.edge);
    e.position.copy(mesh.position); e.rotation.copy(mesh.rotation); return e;
  }
  function box(w, h, d, mat, x, y, z, shadow) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x || 0, y || 0, z || 0);
    if (shadow !== false) { m.castShadow = true; m.receiveShadow = true; }
    return m;
  }
  function cyl(rt, rb, h, mat, x, y, z, seg) {
    const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 16), mat);
    m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; return m;
  }
  function flat(w, d, mat, x, z, y) {
    const m = new T.Mesh(new T.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2; m.position.set(x || 0, y || 0.04, z || 0); return m;
  }
  function paintedLine(x1, z1, x2, z2, wd, color, h) {
    const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz) || 0.01;
    const m = new T.Mesh(new T.PlaneGeometry(wd, len), own(new T.MeshBasicMaterial({ color: col(color) })));
    m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(dx, dz);
    m.position.set((x1 + x2) / 2, h || 0.045, (z1 + z2) / 2);
    return m;
  }
  function border(g, x, z, w, d, color, wd, h) {
    g.add(paintedLine(x, z, x + w, z, wd, color, h)); g.add(paintedLine(x, z + d, x + w, z + d, wd, color, h));
    g.add(paintedLine(x, z, x, z + d, wd, color, h)); g.add(paintedLine(x + w, z, x + w, z + d, wd, color, h));
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function textSprite(text, o) {
    o = o || {};
    const fs = o.fontSize || 56, pad = 24;
    const cv = document.createElement('canvas'); let ctx = cv.getContext('2d');
    ctx.font = '600 ' + fs + 'px Segoe UI, Arial';
    cv.width = Math.ceil(ctx.measureText(text).width + pad * 2); cv.height = Math.ceil(fs + pad * 1.4);
    ctx = cv.getContext('2d');
    ctx.fillStyle = o.bg || 'rgba(255,255,255,0.93)'; ctx.strokeStyle = o.border || 'rgba(70,90,110,0.6)'; ctx.lineWidth = 3;
    roundRect(ctx, 2, 2, cv.width - 4, cv.height - 4, 14); ctx.fill(); ctx.stroke();
    ctx.font = '600 ' + fs + 'px Segoe UI, Arial'; ctx.fillStyle = o.color || '#20303f';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, cv.width / 2, cv.height / 2 + 2);
    const tex = new T.CanvasTexture(cv); tex.anisotropy = 4;
    const sp = new T.Sprite(own(new T.SpriteMaterial({ map: tex, depthTest: false })));
    const s = o.scale || 1; sp.scale.set(1.1 * (cv.width / cv.height) * s, 1.1 * s, 1);
    sp.userData.sub = 'labels'; sp.renderOrder = 10;
    return sp;
  }
  function floorText(txt, sub, w, d, color) {
    const res = 80, cv = document.createElement('canvas');
    cv.width = Math.max(140, Math.round(w * res)); cv.height = Math.max(140, Math.round(d * res));
    const ctx = cv.getContext('2d');
    ctx.fillStyle = color || 'rgba(40,55,70,0.8)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const big = Math.min(cv.width / (Math.max(txt.length, 1) * 0.62), cv.height * (sub ? 0.4 : 0.55));
    ctx.font = '700 ' + big + 'px Segoe UI, Arial';
    ctx.fillText(txt, cv.width / 2, sub ? cv.height / 2 - big * 0.28 : cv.height / 2);
    if (sub) {
      const fs = Math.min(big * 0.5, cv.width / (sub.length * 0.62));
      ctx.font = '600 ' + fs + 'px Segoe UI, Arial'; ctx.fillText(sub, cv.width / 2, cv.height / 2 + big * 0.45);
    }
    const tex = new T.CanvasTexture(cv); tex.anisotropy = 8;
    const m = new T.Mesh(new T.PlaneGeometry(w, d), own(new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.055; return m;
  }

  /* ---------- Texturas de señales (cache) ---------- */
  const signTexCache = {};
  function signTexture(code) {
    if (signTexCache[code]) return signTexCache[code];
    const s = CAT.SIGN_BY_CODE[code] || { cat: 'A', label: code, glyph: '❗' };
    const c = CAT.SIGN_CATS[s.cat];
    const S = 512, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#ffffff'; roundRect(ctx, 0, 0, S, S, 28); ctx.fill();
    ctx.lineWidth = 8; ctx.strokeStyle = '#2b3642'; roundRect(ctx, 4, 4, S - 8, S - 8, 26); ctx.stroke();
    const cx = S / 2, cy = S * 0.4, r = S * 0.3;
    const glyphFont = '900 ' + Math.round(S * 0.3) + 'px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",Segoe UI,Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (c.shape === 'circle' || c.shape === 'circle-bar') {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      if (c.shape === 'circle') { ctx.fillStyle = c.color; ctx.fill(); }
      else { ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = S * 0.045; ctx.strokeStyle = c.color; ctx.stroke(); }
      ctx.font = glyphFont; ctx.fillStyle = c.shape === 'circle' ? '#fff' : '#111';
      ctx.fillText(s.glyph, cx, cy + S * 0.01);
      if (c.shape === 'circle-bar') {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = 'rgba(208,2,27,0.85)'; ctx.fillRect(-r, -S * 0.022, r * 2, S * 0.044); ctx.restore();
      }
    } else if (c.shape === 'triangle') {
      ctx.beginPath(); ctx.moveTo(cx, cy - r * 1.05); ctx.lineTo(cx + r * 1.15, cy + r * 0.85); ctx.lineTo(cx - r * 1.15, cy + r * 0.85); ctx.closePath();
      ctx.fillStyle = c.color; ctx.fill(); ctx.lineWidth = S * 0.03; ctx.strokeStyle = '#111'; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.font = '900 ' + Math.round(S * 0.24) + 'px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",Segoe UI,Arial';
      ctx.fillStyle = '#111'; ctx.fillText(s.glyph, cx, cy + r * 0.25);
    } else {
      ctx.fillStyle = c.color; roundRect(ctx, S * 0.12, S * 0.08, S * 0.76, S * 0.62, 20); ctx.fill();
      ctx.font = glyphFont; ctx.fillStyle = '#fff'; ctx.fillText(s.glyph, cx, cy);
    }
    // franja de texto
    ctx.fillStyle = '#111'; ctx.textBaseline = 'middle';
    const words = s.label.toUpperCase().split(' '); const lines = []; let cur = '';
    ctx.font = '800 ' + Math.round(S * 0.085) + 'px Segoe UI, Arial';
    words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > S * 0.86 && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur);
    lines.slice(0, 2).forEach((ln, i) => ctx.fillText(ln, cx, S * 0.8 + (i - (Math.min(lines.length, 2) - 1) / 2) * S * 0.1));
    const tex = new T.CanvasTexture(cv); tex.anisotropy = 8;
    signTexCache[code] = tex; return tex;
  }
  function signPanel(code, size, y) {
    const g = new T.Group();
    const mat = own(new T.MeshBasicMaterial({ map: signTexture(code), transparent: true }));
    const a = new T.Mesh(new T.PlaneGeometry(size, size), mat); a.position.set(0, y, 0.015);
    const b = new T.Mesh(new T.PlaneGeometry(size, size), mat); b.position.set(0, y, -0.015); b.rotation.y = Math.PI;
    const back = box(size + 0.02, size + 0.02, 0.02, M.grey, 0, y, 0, false);
    g.add(a, b, back); return g;
  }

  /* ---------- Semilla determinista por item (mercancía estable) ---------- */
  function seeded(str) {
    let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    let s = (h >>> 0) % 233279 + 1;
    return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }

  /* ============================================================
     CONSTRUCTORES DE ITEMS · cada uno devuelve un Group local
     ============================================================ */
  const B = {};

  B.rack = function (it) {
    const g = new T.Group();
    const ML = +it.modLen || 1.05, RW = +it.rackW || 1, LH = +it.levelH || 0.6, N = Math.max(1, Math.round(+it.modules || 1)), LV = Math.max(1, Math.round(+it.levels || 1));
    const len = N * ML, H = LV * LH, heavy = ML >= 2, PT = heavy ? 0.09 : 0.06;
    const shelfMat = std(col(it.color), { roughness: 0.5, metalness: 0.35 });
    const postGeo = new T.BoxGeometry(PT, H + 0.1, PT);
    for (let m = 0; m <= N; m++) {
      const z = m * ML - len / 2;
      [-1, 1].forEach(s => {
        const p = new T.Mesh(postGeo, M.post); p.position.set(s * (RW / 2 - PT / 2), (H + 0.1) / 2, z); p.castShadow = true; g.add(p);
      });
      if (heavy) for (let k = 0.35; k < H; k += 1.2) g.add(box(RW - PT, 0.05, 0.05, M.brace, 0, k, z, false));
    }
    const shelfGeo = new T.BoxGeometry(RW - PT, heavy ? 0.12 : 0.045, ML - PT);
    const beamGeo = new T.BoxGeometry(0.08, 0.14, ML - PT - 0.02);
    for (let lv = 0; lv < LV; lv++) {
      if (heavy && lv === 0) continue;
      for (let mb = 0; mb < N; mb++) {
        const z = mb * ML + ML / 2 - len / 2, y = lv * LH + 0.02;
        if (heavy) {
          [-1, 1].forEach(s => { const bm = new T.Mesh(beamGeo, M.beam); bm.position.set(s * (RW / 2 - 0.06), y, z); bm.castShadow = true; g.add(bm); });
          const dk = new T.Mesh(new T.BoxGeometry(RW - 0.12, 0.03, ML - PT - 0.02), M.deck); dk.position.set(0, y + 0.085, z); g.add(dk);
        } else {
          const sh = new T.Mesh(shelfGeo, shelfMat); sh.position.set(0, y, z); sh.castShadow = true; sh.receiveShadow = true; g.add(sh);
        }
      }
    }
    if (it.cargo !== false) {
      const rnd = seeded(String(it.id));
      const cargo = new T.Group(); cargo.userData.sub = 'cargo';
      for (let lv = 0; lv < LV; lv++) for (let mb = 0; mb < N; mb++) {
        const z = mb * ML + ML / 2 - len / 2;
        if (heavy) {
          const yBase = lv === 0 ? 0.02 : lv * LH + 0.02 + 0.1;
          const slots = Math.max(1, Math.floor(ML / 1.35));
          for (let k = 0; k < slots; k++) {
            if (rnd() > 0.8) continue;
            const pz = z + (k - (slots - 1) / 2) * (ML / slots);
            const pal = new T.Mesh(new T.BoxGeometry(RW - 0.1, 0.13, 1.2), M.pallet); pal.position.set(0, yBase + 0.065, pz); cargo.add(pal);
            if (rnd() < 0.9) {
              const bh = Math.min(LH - 0.35, 0.55 + rnd() * 0.35);
              const bx = new T.Mesh(new T.BoxGeometry(RW - 0.18, bh, 1.08), kraft[Math.floor(rnd() * 4)]); bx.position.set(0, yBase + 0.13 + bh / 2, pz); bx.castShadow = true; cargo.add(bx);
            }
          }
        } else if (rnd() > 0.26) {
          const bh = LH * 0.55, bl = ML * 0.4 + rnd() * ML * 0.12, bw = (RW - PT) * 0.55;
          const bx = new T.Mesh(new T.BoxGeometry(bw, bh, bl), kraft[Math.floor(rnd() * 4)]);
          bx.position.set((rnd() - 0.5) * (RW - PT) * 0.25, lv * LH + 0.045 + bh / 2, z + (rnd() - 0.5) * ML * 0.2); bx.castShadow = true; cargo.add(bx);
        }
      }
      g.add(cargo);
    }
    if (it.label) { const lb = textSprite(it.label, { fontSize: 40, scale: 0.55, color: '#fff', bg: 'rgba(15,98,172,0.95)', border: 'rgba(10,60,110,0.8)' }); lb.position.set(0, H + 0.8, 0); g.add(lb); }
    g.userData.info = { tag: 'RACK', name: it.label || 'Rack', body: LV + ' niveles · ' + N + ' módulos de ' + ML.toFixed(2) + ' m<br>Largo ' + len.toFixed(2) + ' m · Profundidad ' + RW.toFixed(2) + ' m · Altura ' + H.toFixed(2) + ' m<br>' + (N * LV) + ' posiciones' };
    return g;
  };

  B.zone = function (it) {
    const g = new T.Group();
    const w = Math.max(0.2, +it.w || 1), d = Math.max(0.2, +it.d || 1);
    const fl = flat(w, d, std(col(it.color), { roughness: 0.85 }), w / 2, d / 2, 0.03); fl.receiveShadow = true; g.add(fl);
    border(g, 0, 0, w, d, it.room ? '#8a949e' : '#e8b90c', it.room ? 0.05 : 0.09);
    const txt = it.paint || (it.room ? it.k : ''), sub = null;
    if (txt) { const tw = Math.min(w * 0.9, 11), td = Math.min(d * 0.55, tw * 0.5 + 1.2); const ft = floorText(txt, sub, tw, td); ft.position.set(w / 2, 0.055, d / 2); g.add(ft); }
    if (it.room) {
      const h = +it.h || 3, t = 0.14;
      [[w, h, t, w / 2, h / 2, t / 2], [w, h, t, w / 2, h / 2, d - t / 2], [t, h, d, t / 2, h / 2, d / 2], [t, h, d, w - t / 2, h / 2, d / 2]].forEach(p => {
        const m = box(p[0], p[1], p[2], M.roomWall, p[3], p[4], p[5]); g.add(m); g.add(edges(m));
        g.add(box(p[0] + 0.02, 0.07, p[2] + 0.02, M.roomCap, p[3], h + 0.035, p[5], false));
      });
    }
    const lb = textSprite((it.k ? it.k + ' · ' : '') + (it.name || 'Zona'), { fontSize: 40, scale: 0.6 }); lb.position.set(w / 2, it.room ? (+it.h || 3) + 0.9 : 1.9, d / 2); g.add(lb);
    g.userData.info = { tag: it.k || 'ZONA', name: it.name || 'Zona', body: 'Dimensiones: ' + w.toFixed(2) + ' m × ' + d.toFixed(2) + ' m<br>Superficie: ' + (w * d).toFixed(1) + ' m²' + (it.room ? '<br>Cuarto cerrado · muros ' + (+it.h || 3).toFixed(1) + ' m' : '') };
    return g;
  };

  B.line = function (it) {
    const g = new T.Group();
    const dx = (+it.x2 || 0) - (+it.x || 0), dz = (+it.y2 || 0) - (+it.y || 0), wd = +it.width || 0.1;
    g.add(paintedLine(0, 0, dx, dz, wd, it.color, 0.05));
    if (it.arrow) {
      const len = Math.hypot(dx, dz) || 1, ux = dx / len, uz = dz / len, aw = Math.max(wd * 4, 0.5);
      const shape = new T.Shape(); shape.moveTo(0, aw * 1.2); shape.lineTo(-aw / 2, 0); shape.lineTo(aw / 2, 0);
      const head = new T.Mesh(new T.ShapeGeometry(shape), own(new T.MeshBasicMaterial({ color: col(it.color) })));
      head.rotation.x = -Math.PI / 2; head.rotation.z = -Math.atan2(ux, uz) + Math.PI;
      head.position.set(dx - ux * aw * 1.2, 0.052, dz - uz * aw * 1.2); g.add(head);
    }
    g.userData.info = { tag: 'LÍNEA', name: 'Línea de piso', body: 'Largo ' + Math.hypot(dx, dz).toFixed(2) + ' m · ancho ' + wd.toFixed(2) + ' m' + (it.arrow ? '<br>Ruta / flecha direccional' : '') };
    return g;
  };

  B.extinguisher = function (it) {
    const g = new T.Group();
    g.add(cyl(0.11, 0.11, 0.5, M.red, 0, 0.32, 0, 14));
    g.add(cyl(0.035, 0.05, 0.09, M.dark, 0, 0.61, 0, 10));
    const hose = box(0.03, 0.25, 0.03, M.dark, 0.11, 0.42, 0, false); g.add(hose);
    g.add(flat(0.75, 0.75, own(new T.MeshBasicMaterial({ color: 0xc21807, transparent: true, opacity: 0.5 })), 0, 0, 0.05));
    g.add(cyl(0.02, 0.02, 1.9, M.grey, 0, 0.95, -0.25, 8));
    g.add(signPanel('F01', 0.42, 1.65).translateZ(-0.25));
    if (it.num) { const lb = textSprite(String(it.num), { fontSize: 34, scale: 0.4, color: '#fff', bg: 'rgba(194,24,7,0.95)', border: 'rgba(120,10,0,0.9)' }); lb.position.set(0, 2.15, -0.25); g.add(lb); }
    g.userData.info = { tag: 'EXTINTOR', name: 'Extintor ' + (it.num || ''), body: (it.kind || '') + (it.cap ? ' · ' + it.cap : '') + (it.recarga ? '<br>Próxima recarga: ' + it.recarga : '') };
    return g;
  };

  B.sign = function (it) {
    const g = new T.Group(); const h = +it.h || 2.2;
    g.add(cyl(0.025, 0.025, h, M.grey, 0, h / 2, 0, 8));
    g.add(cyl(0.12, 0.14, 0.04, M.grey, 0, 0.02, 0, 12));
    g.add(signPanel(it.code, 0.6, h - 0.3));
    const s = CAT.SIGN_BY_CODE[it.code] || { label: it.code, cat: 'A' };
    g.userData.info = { tag: (CAT.SIGN_CATS[s.cat] || {}).name || 'Señal', name: s.label, body: 'Señalización ' + (CAT.SIGN_CATS[s.cat] || {}).name + ' · código ' + it.code + '<br>Altura del poste ' + h.toFixed(1) + ' m' };
    return g;
  };

  B.firstaid = function (it) {
    const g = new T.Group();
    g.add(box(0.52, 0.62, 0.22, M.green, 0, 1.25, 0));
    g.add(box(0.09, 0.42, 0.03, M.white, 0, 1.25, 0.12, false)); g.add(box(0.36, 0.09, 0.03, M.white, 0, 1.25, 0.12, false));
    g.add(box(0.08, 0.95, 0.08, M.grey, 0, 0.47, 0, false));
    g.userData.info = { tag: 'BOTIQUÍN', name: it.label || 'Botiquín de primeros auxilios', body: 'Equipo de primeros auxilios' };
    return g;
  };
  B.hydrant = function () {
    const g = new T.Group();
    g.add(cyl(0.12, 0.13, 0.8, M.red, 0, 0.4, 0, 14)); g.add(cyl(0.14, 0.14, 0.08, M.red, 0, 0.84, 0, 14));
    g.add(box(0.14, 0.12, 0.14, M.red, 0.16, 0.55, 0, false)); g.add(box(0.14, 0.12, 0.14, M.red, -0.16, 0.55, 0, false));
    g.userData.info = { tag: 'HIDRANTE', name: 'Hidrante', body: 'Toma de agua contra incendio' };
    return g;
  };
  B.alarm = function () {
    const g = new T.Group();
    g.add(box(0.06, 1.4, 0.06, M.grey, 0, 0.7, 0, false));
    g.add(box(0.16, 0.22, 0.1, M.red, 0, 1.35, 0.03));
    const st = new T.Mesh(new T.SphereGeometry(0.06, 10, 10), std(0xff3b1f, { emissive: 0xff2200, emissiveIntensity: 0.8 })); st.position.set(0, 1.62, 0.03); g.add(st);
    g.userData.info = { tag: 'ALARMA', name: 'Estación manual de alarma', body: 'Alarma contra incendio' };
    return g;
  };
  B.bollard = function () {
    const g = new T.Group();
    g.add(cyl(0.075, 0.085, 1.0, M.yellow, 0, 0.5, 0, 12)); g.add(cyl(0.08, 0.08, 0.09, M.dark, 0, 0.72, 0, 12));
    g.userData.info = { tag: 'BOLARDO', name: 'Bolardo de protección', body: 'Protección contra impacto' };
    return g;
  };
  B.cone = function () {
    const g = new T.Group();
    g.add(cyl(0.01, 0.16, 0.5, std(0xe85d04), 0, 0.27, 0, 12)); g.add(cyl(0.1, 0.12, 0.06, M.white, 0, 0.17, 0, 12));
    g.userData.info = { tag: 'CONO', name: 'Cono de seguridad', body: 'Señalamiento temporal' };
    return g;
  };
  B.hazard = function () {
    const g = new T.Group();
    for (let i = 0; i < 9; i++) g.add(box(0.28, 0.16, 0.28, i % 2 ? M.dark : M.yellow, 0, 0.08 + i * 0.16, 0, false));
    g.userData.info = { tag: 'POSTE', name: 'Poste de peligro', body: 'Franja amarillo / negro' };
    return g;
  };

  B.room = function (it) {
    const g = new T.Group(); const w = +it.w || 3, d = +it.d || 3, h = +it.h || 2.8, t = 0.1;
    const wm = std(col(it.color || '#e8e8e6'));
    [[w, h, t, 0, h / 2, -d / 2 + t / 2], [w, h, t, 0, h / 2, d / 2 - t / 2], [t, h, d, -w / 2 + t / 2, h / 2, 0], [t, h, d, w / 2 - t / 2, h / 2, 0]].forEach(p => { const m = box(p[0], p[1], p[2], wm, p[3], p[4], p[5]); g.add(m); g.add(edges(m)); });
    if (it.roof !== false) { const rf = box(w + 0.1, 0.06, d + 0.1, own(new T.MeshStandardMaterial({ color: 0xd4d6d8, transparent: true, opacity: 0.45 })), 0, h, 0, false); g.add(rf); }
    g.add(box(0.9, 2.05, 0.05, M.dark, -w / 2 + 0.65, 1.02, d / 2 - t / 2 + 0.03, false));
    if (it.label) { const lb = textSprite(it.label, { fontSize: 36, scale: 0.55 }); lb.position.set(0, h + 0.6, 0); g.add(lb); }
    g.userData.info = { tag: 'CUARTO', name: it.label || 'Cuarto', body: w.toFixed(1) + ' × ' + d.toFixed(1) + ' m · altura ' + h.toFixed(1) + ' m · ' + (w * d).toFixed(1) + ' m²' };
    return g;
  };
  B.box = function (it) {
    const g = new T.Group(); const w = +it.w || 1, d = +it.d || 1, h = +it.h || 1;
    const m = box(w, h, d, std(col(it.color), { roughness: 0.8 }), 0, h / 2, 0); g.add(m); g.add(edges(m));
    if (it.label) { const lb = textSprite(it.label, { fontSize: 36, scale: 0.5 }); lb.position.set(0, h + 0.55, 0); g.add(lb); }
    g.userData.info = { tag: 'EQUIPO', name: it.label || 'Equipo', body: w.toFixed(1) + ' × ' + d.toFixed(1) + ' m · altura ' + h.toFixed(1) + ' m' };
    return g;
  };
  B.pallet = function (it) {
    const g = new T.Group(); const n = Math.max(0, Math.round(+it.boxes || 0));
    g.add(box(1.2, 0.12, 1.0, M.pallet, 0, 0.06, 0));
    const bm = std(col(it.color || '#b5854f'), { roughness: 0.9 });
    for (let j = 0; j < n; j++) g.add(box(1.1, 0.32, 0.88, bm, 0, 0.12 + 0.16 + j * 0.32, 0));
    g.userData.info = { tag: 'TARIMA', name: 'Tarima con carga', body: n + ' camas de cajas' };
    return g;
  };
  B.table = function (it) {
    const g = new T.Group(); const w = +it.w || 1.4, d = +it.d || 0.7;
    g.add(box(w, 0.05, d, std(0xc8b480), 0, 0.88, 0));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(p => g.add(box(0.05, 0.85, 0.05, M.grey, p[0] * (w / 2 - 0.05), 0.425, p[1] * (d / 2 - 0.05), false)));
    if (it.label) { const lb = textSprite(it.label, { fontSize: 34, scale: 0.45 }); lb.position.set(0, 1.3, 0); g.add(lb); }
    g.userData.info = { tag: 'MESA', name: it.label || 'Mesa de trabajo', body: w.toFixed(1) + ' × ' + d.toFixed(1) + ' m' };
    return g;
  };
  B.forklift = function () {
    const g = new T.Group();
    g.add(box(1.05, 0.75, 1.85, std(0x1b2330), 0, 0.55, 0));
    g.add(box(0.92, 0.65, 0.38, std(0x2a3442), 0, 0.5, 1.12));
    [[-0.44, -0.22], [0.44, -0.22], [-0.44, 0.64], [0.44, 0.64]].forEach(p => g.add(box(0.055, 0.88, 0.055, std(0xc09a10), p[0], 1.0, p[1], false)));
    g.add(box(0.88, 0.05, 0.9, std(0x2a3442), 0, 1.43, 0.21, false));
    [-0.31, 0.31].forEach(mx => g.add(box(0.07, 2.2, 0.09, M.brace, mx, 1.25, -1.06)));
    [-0.22, 0.22].forEach(fx => g.add(box(0.12, 0.06, 1.3, M.brace, fx, 0.2, -1.72)));
    [[-0.52, -0.58], [-0.52, 0.64], [0.52, -0.58], [0.52, 0.64]].forEach(p => { const w = cyl(0.22, 0.22, 0.18, M.dark, p[0], 0.24, p[1], 18); w.rotation.z = Math.PI / 2; g.add(w); });
    const lb = textSprite('Montacargas', { fontSize: 34, scale: 0.45 }); lb.position.set(0, 2.5, -0.3); g.add(lb);
    g.userData.info = { tag: 'EQUIPO', name: 'Montacargas', body: 'Equipo de carga' };
    return g;
  };
  B.gate = function (it) {
    const g = new T.Group(); const w = +it.w || 3.6, h = +it.h || 4.2;
    g.add(box(w + 0.3, 0.2, 0.2, M.grey, 0, h + 0.1, 0));
    const n = Math.floor(h / 0.42);
    for (let s = 0; s < n; s++) g.add(box(w, 0.4, 0.06, std(s % 2 ? 0xb9c1c9 : 0xc7cfd6, { metalness: 0.5, roughness: 0.45 }), 0, 0.22 + s * 0.42, 0, false));
    [-1, 1].forEach(s => g.add(box(0.1, h, 0.12, M.grey, s * (w / 2 + 0.08), h / 2, 0, false)));
    g.userData.info = { tag: 'PORTÓN', name: 'Portón / cortina', body: w.toFixed(1) + ' m de ancho · ' + h.toFixed(1) + ' m de alto' };
    return g;
  };
  B.door = function () {
    const g = new T.Group();
    g.add(box(1.2, 0.1, 0.08, M.grey, 0, 2.25, 0, false));
    [-0.56, 0.56].forEach(px => g.add(box(0.08, 2.2, 0.08, M.grey, px, 1.1, 0, false)));
    g.add(box(1.0, 2.1, 0.05, std(0x8b6914), 0, 1.05, 0));
    g.userData.info = { tag: 'PUERTA', name: 'Puerta', body: 'Acceso peatonal' };
    return g;
  };

  /* ============================================================
     ESTADO · layout, items, capas, selección
     ============================================================ */
  let layout = null;
  const groups = new Map();
  const layers = {}; CAT.LAYERS.forEach(l => { layers[l[0]] = true; });
  let selHelper = null, selId = null;

  function dispose(obj) {
    obj.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      mats.forEach(m => { if (m.userData && m.userData.own) { if (m.map) m.map.dispose(); m.dispose(); } });
    });
  }
  function anchorOf(it) { return (CAT.TYPES[it.type] || {}).anchor || 'center'; }
  function place(g, it) {
    const ox = layout.origin.x, oy = layout.origin.y;
    g.position.set((+it.x || 0) - ox, 0.02, (+it.y || 0) - oy);
    g.rotation.y = anchorOf(it) === 'center' ? -T.MathUtils.degToRad(+it.rot || 0) : 0;
  }
  function applyLayers(g) {
    const layer = g.userData.layer;
    g.visible = layers[layer] !== false;
    g.traverse(o => { if (o.userData.sub) o.visible = layers[o.userData.sub] !== false; });
  }
  function buildItem(it) {
    const fn = B[it.type]; if (!fn) return null;
    const g = fn(it);
    g.userData.itemId = it.id; g.userData.layer = (CAT.TYPES[it.type] || {}).layer || 'equip';
    g.traverse(o => { o.userData.itemId = it.id; });
    place(g, it); applyLayers(g);
    return g;
  }

  /* ---------- Cascarón: losa, piso, cuadrícula, muros, cotas, sub-bodegas ---------- */
  function buildShell() {
    const { W, D, H, subs } = layout;
    const slab = box(W + 1.2, 0.12, D + 1.2, M.slab, W / 2, -0.04, D / 2); slab.receiveShadow = true; shellG.add(slab, edges(slab));
    const fl = flat(W, D, M.floor, W / 2, D / 2, 0.01); fl.receiveShadow = true; shellG.add(fl);
    const grid = new T.Group(); grid.userData.layer = 'grid';
    for (let qx = 1; qx < W; qx += 1) grid.add(paintedLine(qx, 0, qx, D, qx % 5 === 0 ? 0.05 : 0.025, qx % 5 === 0 ? 0x97a0a8 : 0xb6bcc2, 0.02));
    for (let qz = 1; qz < D; qz += 1) grid.add(paintedLine(0, qz, W, qz, qz % 5 === 0 ? 0.05 : 0.025, qz % 5 === 0 ? 0x97a0a8 : 0xb6bcc2, 0.02));
    for (let ax = 0; ax <= W; ax += 5) { const t = floorText('X' + ax, null, 1.6, 0.9, 'rgba(70,85,100,0.75)'); t.position.set(ax, 0.03, -1.0); grid.add(t); }
    for (let az = 0; az <= D; az += 5) { const t = floorText('Y' + az, null, 1.6, 0.9, 'rgba(70,85,100,0.75)'); t.position.set(-1.1, 0.03, az); grid.add(t); }
    shellG.add(grid);
    border(shellG, 0, 0, W, D, 0x30404e, 0.16, 0.03);
    const walls = new T.Group(); walls.userData.layer = 'walls'; const t = 0.26;
    [[W + 2 * t, H, t, W / 2, H / 2, -t / 2], [W + 2 * t, H, t, W / 2, H / 2, D + t / 2], [t, H, D, -t / 2, H / 2, D / 2], [t, H, D, W + t / 2, H / 2, D / 2]].forEach(p => {
      const m = box(p[0], p[1], p[2], M.wall, p[3], p[4], p[5], false); walls.add(m, edges(m));
    });
    // sub-bodegas: tinte de piso, muros divisorios, rótulo
    const subsG = new T.Group(); subsG.userData.layer = 'zones';
    const labels = new T.Group(); labels.userData.layer = 'labels';
    (subs || []).forEach(s => {
      const tint = flat(s.w, s.d, own(new T.MeshBasicMaterial({ color: col(s.color || '#c0c8d0'), transparent: true, opacity: 0.28, depthWrite: false })), s.x + s.w / 2, s.y + s.d / 2, 0.02); subsG.add(tint);
      border(subsG, s.x, s.y, s.w, s.d, 0x30404e, 0.12, 0.028);
      const ft = floorText(s.name.toUpperCase(), null, Math.min(s.w * 0.7, 9), 1.5, 'rgba(30,45,60,0.55)'); ft.position.set(s.x + Math.min(s.w * 0.7, 9) / 2 + 0.5, 0.032, s.y + 1.3); subsG.add(ft);
      [[s.x, s.y, s.x + s.w, s.y], [s.x, s.y + s.d, s.x + s.w, s.y + s.d], [s.x, s.y, s.x, s.y + s.d], [s.x + s.w, s.y, s.x + s.w, s.y + s.d]].forEach(e => {
        const onPerim = (Math.abs(e[1] - e[3]) < 1e-6 && (Math.abs(e[1]) < 0.05 || Math.abs(e[1] - D) < 0.05)) || (Math.abs(e[0] - e[2]) < 1e-6 && (Math.abs(e[0]) < 0.05 || Math.abs(e[0] - W) < 0.05));
        if (onPerim) return;
        const horiz = Math.abs(e[1] - e[3]) < 1e-6;
        const m = box(horiz ? Math.abs(e[2] - e[0]) : 0.18, H * 0.75, horiz ? 0.18 : Math.abs(e[3] - e[1]), M.part, (e[0] + e[2]) / 2, H * 0.375, (e[1] + e[3]) / 2, false);
        walls.add(m, edges(m));
      });
      const lb = textSprite(s.name.toUpperCase(), { fontSize: 46, scale: 0.9, color: '#fff', bg: 'rgba(32,48,63,0.92)', border: 'rgba(0,0,0,0.5)' }); lb.position.set(s.x + s.w / 2, H * 0.75 + 1.2, s.y + s.d / 2); labels.add(lb);
    });
    shellG.add(walls, subsG, labels);
    const dims = new T.Group(); dims.userData.layer = 'dims';
    dimArrow(dims, [0, 0.12, -2.6], [W, 0.12, -2.6], W.toFixed(2) + ' m');
    dimArrow(dims, [-2.6, 0.12, 0], [-2.6, 0.12, D], D.toFixed(2) + ' m');
    shellG.add(dims);
    shellG.children.forEach(c => { if (c.userData.layer) c.visible = layers[c.userData.layer] !== false; });
    sun.position.set(W / 2 + Math.max(W, D) * 0.8, Math.max(W, D) * 1.1, D / 2 + Math.max(W, D) * 0.4);
    sun.target.position.set(W / 2, 0, D / 2);
    const R = Math.max(W, D) * 0.8;
    sun.shadow.camera.left = -R; sun.shadow.camera.right = R; sun.shadow.camera.top = R; sun.shadow.camera.bottom = -R; sun.shadow.camera.far = Math.max(W, D) * 4; sun.shadow.camera.updateProjectionMatrix();
  }
  function dimArrow(g, p1, p2, label) {
    const a = new T.Vector3(...p1), b = new T.Vector3(...p2);
    g.add(new T.Line(new T.BufferGeometry().setFromPoints([a, b]), M.dim));
    const dir = b.clone().sub(a).normalize();
    [[a, dir], [b, dir.clone().negate()]].forEach(pr => {
      const cone = new T.Mesh(new T.ConeGeometry(0.16, 0.55, 8), M.dimCone);
      cone.position.copy(pr[0].clone().addScaledVector(pr[1], 0.28)); cone.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), pr[1]); g.add(cone);
    });
    const t = textSprite(label, { fontSize: 42, scale: 0.8 }); t.userData.sub = null; t.position.set((a.x + b.x) / 2, 0.7, (a.z + b.z) / 2); g.add(t);
  }

  /* ---------- API pública ---------- */
  const api = {};
  api.setLayout = function (lay, items) {
    layout = lay;
    api.select(null);
    while (shellG.children.length) { const c = shellG.children.pop(); dispose(c); }
    groups.forEach(g => dispose(g)); groups.clear();
    while (itemsG.children.length) itemsG.children.pop();
    root.position.set(-lay.W / 2, 0, -lay.D / 2);
    buildShell();
    items.forEach(it => api.addItem(it));
    fitOrtho();
  };
  api.addItem = function (it) {
    const g = buildItem(it); if (!g) return;
    groups.set(it.id, g); itemsG.add(g);
  };
  api.updateItem = function (it) {
    const old = groups.get(it.id);
    if (old) { itemsG.remove(old); dispose(old); groups.delete(it.id); }
    api.addItem(it);
    if (selId === it.id) api.select(it.id);
  };
  api.moveItem = function (it) {
    const g = groups.get(it.id); if (!g) return;
    place(g, it); if (selHelper && selId === it.id) selHelper.update();
  };
  api.removeItem = function (id) {
    const g = groups.get(id); if (!g) return;
    if (selId === id) api.select(null);
    itemsG.remove(g); dispose(g); groups.delete(id);
  };
  api.setLayer = function (name, on) {
    layers[name] = !!on;
    groups.forEach(g => applyLayers(g));
    shellG.children.forEach(c => { if (c.userData.layer) c.visible = layers[c.userData.layer] !== false; });
  };
  api.setShadows = function (on) { renderer.shadowMap.enabled = !!on; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); };
  api.select = function (id) {
    if (selHelper) { scene.remove(selHelper); selHelper.geometry.dispose(); selHelper = null; }
    selId = id;
    const g = id ? groups.get(id) : null;
    if (g) { selHelper = new T.BoxHelper(g, 0xff6a00); selHelper.material.depthTest = false; selHelper.renderOrder = 20; scene.add(selHelper); }
  };
  api.infoOf = function (id) { const g = groups.get(id); return g ? g.userData.info : null; };

  const ray = new T.Raycaster(), ndc = new T.Vector2(), plane = new T.Plane(new T.Vector3(0, 1, 0), 0), hitV = new T.Vector3();
  function setRay(cx, cy) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.x = ((cx - r.left) / r.width) * 2 - 1; ndc.y = -((cy - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ndc, camera);
  }
  function visibleChain(o) { while (o) { if (o.visible === false) return false; o = o.parent; } return true; }
  api.pick = function (cx, cy) {
    setRay(cx, cy);
    const hits = ray.intersectObjects(itemsG.children, true);
    for (const h of hits) { if (h.object.userData.itemId && visibleChain(h.object)) return h.object.userData.itemId; }
    return null;
  };
  api.floorPoint = function (cx, cy) {
    setRay(cx, cy);
    if (!ray.ray.intersectPlane(plane, hitV)) return null;
    return { x: hitV.x + layout.W / 2 + layout.origin.x, y: hitV.z + layout.D / 2 + layout.origin.y };
  };
  api.setControls = function (on) { (camera === persp ? ctlP : ctlO).enabled = !!on; };

  /* ---------- Cámaras ---------- */
  let fly = null;
  function flyTo(pos, tgt) {
    if (camera !== persp) api.setPlan(false);
    fly = { p0: persp.position.clone(), p1: new T.Vector3(...pos), t0: ctlP.target.clone(), t1: new T.Vector3(...tgt), k: 0, start: performance.now(), dur: 700 };
  }
  api.view = function (name) {
    const { W, D, H } = layout, R = Math.max(W, D);
    if (name === 'top') { api.setPlan(true); return; }
    if (name === 'front') flyTo([0, H * 0.9, D / 2 + R * 0.5], [0, 2.5, D * 0.05]);
    else flyTo([R * 0.85, R * 0.62, R * 1.0], [0, 0.8, 0]);
  };
  api.flyToPoint = function (x, y, dist) {
    const wx = x - layout.origin.x - layout.W / 2, wz = y - layout.origin.y - layout.D / 2, d = dist || 12;
    flyTo([wx + d, d * 0.9, wz + d * 1.05], [wx, 0.5, wz]);
  };
  function fitOrtho() {
    if (!layout) return;
    const r = container.getBoundingClientRect(), aspect = Math.max(0.1, r.width / Math.max(1, r.height));
    // margen extra arriba (barras de la interfaz) y a los lados (paneles)
    const halfH = Math.max(layout.D / 2 * 1.4, (layout.W / 2 * 1.9) / aspect), halfW = halfH * aspect;
    ortho.left = -halfW; ortho.right = halfW; ortho.top = halfH; ortho.bottom = -halfH; ortho.zoom = 1;
    const shift = -halfH * 0.12;
    ortho.position.set(0, 200, shift); ortho.lookAt(0, 0, shift); ortho.updateProjectionMatrix();
    ctlO.target.set(0, 0, shift); ctlO.update();
  }
  api.setPlan = function (on) {
    if (on) { fitOrtho(); camera = ortho; ctlP.enabled = false; ctlO.enabled = true; }
    else { camera = persp; ctlO.enabled = false; ctlP.enabled = true; }
    if (api.onCameraMode) api.onCameraMode(on);
  };
  api.isPlan = () => camera === ortho;
  api.setInitialCamera = function () {
    const R = Math.max(layout.W, layout.D);
    persp.position.set(R * 0.85, R * 0.62, R * 1.0); ctlP.target.set(0, 0.8, 0); ctlP.update();
  };
  api.screenshot = () => renderer.domElement.toDataURL('image/png');
  api.debug = () => ({ cam: persp.position.toArray(), target: ctlP.target.toArray(), fly: fly, plan: camera === ortho });

  function resize() {
    const r = container.getBoundingClientRect(); const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
    persp.aspect = w / h; persp.updateProjectionMatrix();
    if (layout) { const z = ortho.zoom; fitOrtho(); ortho.zoom = z; ortho.updateProjectionMatrix(); }
  }
  new ResizeObserver(resize).observe(container); resize();

  (function animate() {
    requestAnimationFrame(animate);
    if (fly) {
      fly.k = Math.min(1, (performance.now() - fly.start) / fly.dur); const k = fly.k, s = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      persp.position.lerpVectors(fly.p0, fly.p1, s); ctlP.target.lerpVectors(fly.t0, fly.t1, s);
      if (k >= 1) fly = null;
    }
    if (camera === persp) ctlP.update(); else ctlO.update();
    if (selHelper) selHelper.update();
    renderer.render(scene, camera);
  })();

  api.domElement = renderer.domElement;
  return api;
};
