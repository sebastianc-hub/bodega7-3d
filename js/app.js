/* ============================================================
   APP · estado, carga/guardado, visor público y editor.
   window.APP_MODE = 'view' | 'edit'
   Prioridad de carga:  enlace compartido (#d=) → borrador local
   (solo editor) → data/layouts.json publicado → js/defaults.js
   ============================================================ */
(function () {
  'use strict';
  const EDIT = (window.APP_MODE || 'view') === 'edit';
  const CAT = window.CATALOG;
  const DRAFT_KEY = 'ag-layouts-draft-v2', PUB_KEY = 'ag-layouts-published-v2';
  const CFG = window.LAYOUT_CONFIG || {};
  const PUBLISH_URL = (CFG.publishUrl || '').trim();
  const VIEWER_URL = 'index.html';

  let DATA = null, SOURCE = '', viewId = 'general', sel = null, tool = null, dirty = false, snapHalf = false;
  const undoStack = [], redoStack = [];
  let engine;

  /* ---------- utilidades DOM ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== undefined && v !== null) e.setAttribute(k, v);
    });
    (children || []).forEach(c => { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  const deepCopy = o => JSON.parse(JSON.stringify(o));
  const uid = () => 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const num = (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; };
  const r2 = v => Math.round(v * 100) / 100;
  const snap = v => { const s = snapHalf ? 0.5 : 0.1; return Math.round(v / s) * s; };
  let toastT; function toast(msg, ms) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms || 2600); }
  function hint(msg) { $('#hint').textContent = msg || defaultHint(); }
  function defaultHint() { return EDIT ? 'Arrastra un elemento para moverlo · clic en vacío y arrastrar: orbitar · rueda: zoom · R gira 90° · Supr elimina · Ctrl+Z deshace' : 'Arrastrar: orbitar · rueda: zoom · clic derecho: desplazar · clic en un elemento: información'; }

  function modal(opts) {
    closeModal();
    const box = el('div', { class: 'modal-box' });
    box.appendChild(el('h3', { text: opts.title }));
    if (opts.body) box.appendChild(typeof opts.body === 'string' ? el('div', { class: 'modal-body', html: opts.body }) : opts.body);
    const row = el('div', { class: 'modal-actions' });
    (opts.buttons || [{ label: 'Cerrar' }]).forEach(b => row.appendChild(el('button', { class: b.primary ? 'primary' : '', text: b.label, onclick: () => { if (!b.onClick || b.onClick() !== false) closeModal(); } })));
    box.appendChild(row);
    const wrap = el('div', { id: 'modal', onclick: e => { if (e.target === wrap && !opts.sticky) closeModal(); } }, [box]);
    document.body.appendChild(wrap); return box;
  }
  function closeModal() { const m = $('#modal'); if (m) m.remove(); }

  /* ---------- datos ---------- */
  function valid(j) { return !!(j && j.warehouses && j.warehouses.general && j.warehouses.b7 && Array.isArray(j.items)); }
  function itemCenter(it) { return it.type === 'zone' ? { x: it.x + it.w / 2, y: it.y + it.d / 2 } : { x: it.x, y: it.y }; }
  function subAt(it) {
    const c = itemCenter(it);
    const s = (DATA.warehouses.general.subs || []).find(s => c.x >= s.x && c.x <= s.x + s.w && c.y >= s.y && c.y <= s.y + s.d);
    return s ? s.id : null;
  }
  function normalize(j) {
    j.version = 2;
    Object.values(j.warehouses).forEach(w => { if (!Array.isArray(w.subs)) w.subs = []; w.H = num(w.H, 9); });
    j.items = j.items.filter(it => it && CAT.TYPES[it.type]);
    j.items.forEach(it => {
      const t = CAT.TYPES[it.type];
      Object.keys(t.defaults).forEach(k => { if (it[k] === undefined) it[k] = t.defaults[k]; });
      if (!it.id) it.id = uid();
      if (!j.warehouses[it.wh]) it.wh = 'general';
      it.x = num(it.x, 0); it.y = num(it.y, 0);
    });
    DATA = j;
    j.items.forEach(it => { if (it.wh === 'general' && it.sub === undefined) it.sub = subAt(it); });
    return j;
  }
  function readHash() {
    const m = location.hash.match(/[#&]d=([^&]+)/); if (!m) return null;
    try { const j = JSON.parse(LZString.decompressFromEncodedURIComponent(m[1])); return valid(j) ? j : null; } catch (e) { return null; }
  }
  async function fetchJSON(url, ms) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms || 9000);
    try { const r = await fetch(url, { cache: 'no-store', signal: ctl.signal }); if (!r.ok) return null; const j = await r.json(); return valid(j) ? j : null; }
    catch (e) { return null; } finally { clearTimeout(t); }
  }
  async function loadData() {
    const shared = readHash(); if (shared) return { data: shared, source: 'shared' };
    if (EDIT) {
      // borrador local con cambios sin publicar: tiene prioridad
      try { const d = localStorage.getItem(DRAFT_KEY); if (d && d !== localStorage.getItem(PUB_KEY)) { const j = JSON.parse(d); if (valid(j)) return { data: j, source: 'draft' }; } } catch (e) { /* ignore */ }
    }
    if (PUBLISH_URL) {
      const j = await fetchJSON(PUBLISH_URL + (PUBLISH_URL.includes('?') ? '&' : '?') + 'action=get&t=' + Date.now(), 12000);
      if (j) return { data: j, source: 'published' };
    }
    const local = await fetchJSON('data/layouts.json?t=' + Date.now());
    if (local) return { data: local, source: 'published' };
    return { data: deepCopy(window.DEFAULT_DATA), source: 'defaults' };
  }
  let saveT; function markDirty() {
    dirty = true; if (!EDIT) return;
    clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(DATA)); SOURCE = 'draft'; renderBadges(); } catch (e) { toast('No se pudo guardar el borrador local'); } }, 250);
    renderStats();
  }
  function pushUndo() { undoStack.push(JSON.stringify(DATA)); if (undoStack.length > 80) undoStack.shift(); redoStack.length = 0; }
  function undo() { if (!undoStack.length) return toast('Nada que deshacer'); redoStack.push(JSON.stringify(DATA)); DATA = JSON.parse(undoStack.pop()); sel = null; rebuild(); markDirty(); }
  function redo() { if (!redoStack.length) return toast('Nada que rehacer'); undoStack.push(JSON.stringify(DATA)); DATA = JSON.parse(redoStack.pop()); sel = null; rebuild(); markDirty(); }

  /* ---------- vistas ---------- */
  function viewList() {
    const g = DATA.warehouses.general;
    return [{ id: 'general', label: 'Almacén General · 1·2·3·5' }]
      .concat(g.subs.slice().sort((a, b) => a.name.localeCompare(b.name, 'es')).map(s => ({ id: s.id, label: s.name })))
      .concat([{ id: 'b7', label: DATA.warehouses.b7.name }]);
  }
  function currentView() {
    if (DATA.warehouses[viewId]) { const w = DATA.warehouses[viewId]; return { W: w.W, D: w.D, H: w.H, name: w.name, subs: w.subs || [], origin: { x: 0, y: 0 }, whId: viewId, sub: null }; }
    const g = DATA.warehouses.general, s = g.subs.find(s => s.id === viewId);
    if (!s) { viewId = 'general'; return currentView(); }
    return { W: s.w, D: s.d, H: g.H, name: s.name, subs: [], origin: { x: s.x, y: s.y }, whId: 'general', sub: s.id };
  }
  function visibleItems() { const v = currentView(); return DATA.items.filter(it => it.wh === v.whId && (v.sub ? it.sub === v.sub : true)); }
  const getItem = id => DATA.items.find(it => it.id === id);

  function rebuild() {
    const v = currentView();
    engine.setLayout(v, visibleItems());
    if (sel && !visibleItems().some(it => it.id === sel)) sel = null;
    engine.select(sel);
    renderTabs(); renderStats(); renderLegend(); renderProps(); renderBadges();
    $('#subtitle').textContent = v.name + ' · ' + v.W.toFixed(2) + ' × ' + v.D.toFixed(2) + ' m';
    try { const u = new URL(location.href); u.searchParams.set('b', viewId); history.replaceState(null, '', u); } catch (e) { /* file:// */ }
  }
  function setView(id) { viewId = id; sel = null; tool = null; rebuild(); engine.setPlan(false); engine.setInitialCamera(); hideInfo(); }

  /* ---------- UI: barra superior ---------- */
  function buildUI() {
    const ui = $('#ui');
    ui.appendChild(el('header', { id: 'topbar' }, [
      el('div', { class: 'brand' }, [
        el('div', { class: 'logo', html: '<img src="img/logo.png" alt="AG" width="34" height="34">' }),
        el('div', {}, [el('h1', { text: EDIT ? 'EDITOR DE LAYOUTS · ARGENPARTS' : 'LAYOUTS 3D · ARGENPARTS' }), el('p', { id: 'subtitle' })]),
      ]),
      el('nav', { id: 'tabs' }),
      el('div', { class: 'spacer' }),
      el('div', { id: 'badges' }),
      el('button', { id: 'panelsToggle', class: 'iconbtn', title: 'Paneles', text: '☰', onclick: () => document.body.classList.toggle('panels-open') }),
    ]));
    if (EDIT) buildToolbar(ui);
    if (EDIT) { ui.appendChild(el('aside', { id: 'palette', class: 'panel' })); ui.appendChild(el('aside', { id: 'props', class: 'panel' })); }
    else ui.appendChild(el('aside', { id: 'legend', class: 'panel' }));
    // capas
    const layers = el('div', { id: 'layers', class: 'panel' }, [el('h2', { text: 'Capas' })]);
    CAT.LAYERS.forEach(l => layers.appendChild(el('label', {}, [el('input', { type: 'checkbox', checked: true, onchange: e => engine.setLayer(l[0], e.target.checked) }), ' ' + l[1]])));
    layers.appendChild(el('label', {}, [el('input', { type: 'checkbox', checked: true, onchange: e => engine.setShadows(e.target.checked) }), ' Sombras']));
    ui.appendChild(layers);
    // vistas
    const views = el('div', { id: 'viewsbar', class: 'panel' });
    [['iso', 'Isométrica'], ['top', 'Planta'], ['front', 'Frente']].forEach(v => views.appendChild(el('button', { 'data-view': v[0], text: v[1], onclick: () => engine.view(v[0]) })));
    if (EDIT) views.appendChild(el('button', { text: '📷 Captura', title: 'Descargar imagen PNG de la vista actual', onclick: screenshot }));
    ui.appendChild(views);
    ui.appendChild(el('div', { id: 'stats', class: 'panel' }));
    ui.appendChild(el('div', { id: 'info', class: 'panel' }, [el('span', { class: 'close', text: '✕', onclick: hideInfo }), el('span', { class: 'tag' }), el('h3'), el('p')]));
    ui.appendChild(el('div', { id: 'hint', text: defaultHint() }));
    ui.appendChild(el('div', { id: 'toast' }));
    ui.appendChild(el('div', { id: 'credit', html: 'Argenparts AG · Layouts logísticos 3D' + (EDIT ? '' : ' · <a href="https://github.com/sebastianc-hub/bodega7-3d" target="_blank" rel="noopener">GitHub</a>') }));
    engine.onCameraMode = plan => { document.querySelectorAll('#viewsbar [data-view]').forEach(b => b.classList.toggle('on', plan ? b.dataset.view === 'top' : false)); };
  }
  function renderTabs() {
    const n = $('#tabs'); n.innerHTML = '';
    viewList().forEach(v => n.appendChild(el('button', { class: v.id === viewId ? 'on' : '', text: v.label, onclick: () => setView(v.id) })));
  }
  function renderBadges() {
    const b = $('#badges'); b.innerHTML = '';
    const map = { shared: ['Versión compartida por enlace', 'warn'], draft: ['Borrador local · sin publicar', 'warn'], published: ['Publicado', 'ok'], defaults: ['Datos iniciales', ''] };
    const m = map[SOURCE] || ['', ''];
    if (m[0]) b.appendChild(el('span', { class: 'badge ' + m[1], text: m[0] }));
    if (!EDIT) b.appendChild(el('span', { class: 'badge', text: 'Solo lectura' }));
  }
  function renderStats() {
    const items = visibleItems(), v = currentView();
    const racks = items.filter(i => i.type === 'rack');
    const st = [
      ['Superficie', (v.W * v.D).toFixed(0) + ' m²'], ['Racks', racks.length],
      ['Módulos', racks.reduce((a, r) => a + (+r.modules || 0), 0)], ['Posiciones', racks.reduce((a, r) => a + (+r.modules || 0) * (+r.levels || 0), 0)],
      ['Extintores', items.filter(i => i.type === 'extinguisher').length], ['Señales', items.filter(i => i.type === 'sign').length],
    ];
    const s = $('#stats'); s.innerHTML = '';
    st.forEach(x => s.appendChild(el('div', {}, [el('span', { class: 'lbl', text: x[0] }), el('b', { text: String(x[1]) })])));
  }

  /* ---------- info ---------- */
  function showInfoFor(id) {
    const it = getItem(id), info = engine.infoOf(id); if (!it || !info) return;
    const box = $('#info'); $('.tag', box).textContent = info.tag; $('h3', box).textContent = info.name;
    $('p', box).innerHTML = info.body + '<br><span class="muted">Posición X ' + (+it.x).toFixed(2) + ' · Y ' + (+it.y).toFixed(2) + ' m</span>';
    box.style.display = 'block';
  }
  function hideInfo() { $('#info').style.display = 'none'; }

  /* ---------- leyenda (visor) ---------- */
  function renderLegend() {
    const lg = $('#legend'); if (!lg) return; lg.innerHTML = '';
    const items = visibleItems();
    const zones = items.filter(i => i.type === 'zone');
    lg.appendChild(el('h2', { text: 'Zonas · clic para ir' }));
    zones.forEach(z => lg.appendChild(el('div', { class: 'zrow', onclick: () => { const c = itemCenter(z); engine.flyToPoint(c.x, c.y, Math.max(8, Math.max(z.w, z.d) * 0.9)); engine.select(z.id); showInfoFor(z.id); } }, [
      el('span', { class: 'chip', style: 'background:' + z.color }), el('span', { class: 'zletter', text: z.k || '' }), el('span', { text: z.name }),
    ])));
    const saf = items.filter(i => ['extinguisher', 'sign', 'firstaid', 'hydrant', 'alarm'].includes(i.type));
    lg.appendChild(el('h2', { text: 'Seguridad e higiene (' + saf.length + ')' }));
    saf.sort((a, b) => a.type.localeCompare(b.type)).forEach(i => {
      const t = CAT.TYPES[i.type]; let name = t.name;
      if (i.type === 'extinguisher') name = 'Extintor ' + (i.num || '') + (i.cap ? ' · ' + i.cap : '');
      if (i.type === 'sign') { const s = CAT.SIGN_BY_CODE[i.code]; name = s ? s.label : i.code; }
      lg.appendChild(el('div', { class: 'zrow', onclick: () => { engine.flyToPoint(i.x, i.y, 7); engine.select(i.id); showInfoFor(i.id); } }, [el('span', { class: 'ico', text: i.type === 'sign' ? '⚠️' : t.icon }), el('span', { text: name })]));
    });
  }

  /* ============================================================
     EDITOR
     ============================================================ */
  function buildToolbar(ui) {
    const tb = el('div', { id: 'toolbar', class: 'panel' });
    const btn = (label, title, fn, cls) => el('button', { text: label, title: title, class: cls || '', onclick: fn });
    tb.append(
      btn('↶ Deshacer', 'Ctrl+Z', undo), btn('↷ Rehacer', 'Ctrl+Y', redo), el('span', { class: 'sep' }),
      btn('⧉ Duplicar', 'Ctrl+D', duplicateSel), btn('⟳ Girar 90°', 'R', () => rotateSel(90)), btn('🗑 Eliminar', 'Supr', deleteSel), el('span', { class: 'sep' }),
      el('label', { class: 'chk', title: 'Ajustar posiciones a múltiplos de 0.5 m' }, [el('input', { type: 'checkbox', onchange: e => { snapHalf = e.target.checked; } }), ' Ajuste 0.5 m']),
      el('span', { class: 'spacer' }),
      btn('🔗 Compartir enlace', 'Genera un enlace de solo lectura con esta versión', share, 'accent'),
      btn('⬇ Exportar JSON', 'Descarga el archivo layouts.json', exportJSON), btn('⬆ Importar JSON', 'Carga un archivo layouts.json', importJSON),
      btn('🚀 Publicar', 'Publica esta versión como la oficial en la liga pública', publish, 'primary'),
      btn('↺ Restablecer', 'Descarta el borrador local y vuelve a la versión publicada', resetDraft),
    );
    ui.appendChild(tb);
  }
  function renderPalette() {
    const p = $('#palette'); if (!p) return; p.innerHTML = '';
    p.appendChild(el('h2', { text: 'Agregar elementos' }));
    CAT.PALETTE.forEach(grp => {
      p.appendChild(el('h3', { text: grp.group }));
      const grid = el('div', { class: 'tools' });
      grp.tools.forEach(tid => {
        if (tid === 'rackrow') grid.appendChild(el('button', { class: 'tool', 'data-tool': 'rackrow', html: '<span>🗄️🗄️</span>Fila de racks', onclick: rackRowDialog }));
        else if (tid === 'sign') grid.appendChild(el('button', { class: 'tool', 'data-tool': 'sign', html: '<span>⚠️</span>Señalización', onclick: signDialog }));
        else { const t = CAT.TYPES[tid]; grid.appendChild(el('button', { class: 'tool', 'data-tool': tid, html: '<span>' + t.icon + '</span>' + t.name, onclick: () => armTool(tid) })); }
      });
      p.appendChild(grid);
    });
    p.appendChild(el('p', { class: 'muted small', text: 'Elige una herramienta y haz clic en el piso para colocar. Zonas y líneas: dos clics (inicio y fin). Esc cancela.' }));
  }
  function armTool(type, extra) {
    tool = Object.assign({ type: type, step: 0, keep: KEEP_TOOLS.includes(type) }, extra || {});
    document.querySelectorAll('#palette .tool').forEach(b => b.classList.toggle('on', b.dataset.tool === type));
    $('#stage').style.cursor = 'crosshair';
    const t = CAT.TYPES[type];
    hint((type === 'zone' || type === 'line') ? 'Clic en el primer punto (esquina / inicio)' : 'Clic en el piso para colocar ' + (t ? t.name.toLowerCase() : type) + (tool.keep ? ' · repite para colocar varios · Esc para terminar' : ' · Esc cancela'));
  }
  function disarm() { tool = null; document.querySelectorAll('#palette .tool').forEach(b => b.classList.remove('on')); $('#stage').style.cursor = ''; hint(); }
  function createItem(type, props) {
    pushUndo();
    const v = currentView();
    const it = Object.assign({ id: uid(), type: type, wh: v.whId, sub: v.sub }, deepCopy(CAT.TYPES[type].defaults), props || {});
    if (v.whId === 'general' && !v.sub) it.sub = subAt(it);
    DATA.items.push(it); engine.addItem(it); select(it.id); markDirty(); return it;
  }
  function placeAt(p) {
    const t = tool; if (!t) return;
    const px = r2(snap(p.x)), py = r2(snap(p.y));
    if (t.type === 'rackrow') { createRackRow(px, py, t.cfg); disarm(); return; }
    if (t.type === 'zone' || t.type === 'line') {
      if (t.step === 0) { t.p1 = { x: px, y: py }; t.step = 1; hint('Clic en el segundo punto (esquina opuesta / fin)'); return; }
      if (t.type === 'zone') {
        const x = Math.min(t.p1.x, px), y = Math.min(t.p1.y, py), w = Math.max(0.5, Math.abs(px - t.p1.x)), d = Math.max(0.5, Math.abs(py - t.p1.y));
        createItem('zone', { x: x, y: y, w: r2(w), d: r2(d) });
      } else createItem('line', { x: t.p1.x, y: t.p1.y, x2: px, y2: py });
      disarm(); return;
    }
    const props = { x: px, y: py };
    if (t.type === 'sign') props.code = t.code;
    createItem(t.type, props);
    if (!t.keep) disarm(); else toast(CAT.TYPES[t.type].name + ' colocado · Esc para terminar');
  }
  const KEEP_TOOLS = ['extinguisher', 'sign', 'bollard', 'cone', 'hazard', 'firstaid', 'hydrant', 'alarm', 'pallet'];

  function signDialog() {
    const body = el('div', { class: 'signgrid' });
    Object.entries(CAT.SIGN_CATS).forEach(([cat, c]) => {
      body.appendChild(el('h4', { text: c.name, style: 'border-left:6px solid ' + c.color }));
      const g = el('div', { class: 'signs' });
      CAT.SIGNS.filter(s => s.cat === cat).forEach(s => g.appendChild(el('button', { class: 'sign', title: s.code, onclick: () => { closeModal(); armTool('sign', { code: s.code, keep: true }); } }, [el('span', { class: 'g', text: s.glyph, style: 'background:' + c.color + (cat === 'A' ? ';color:#111' : ';color:#fff') }), el('span', { text: s.label })])));
      body.appendChild(g);
    });
    modal({ title: 'Elegir señal (NOM-026-STPS)', body: body, buttons: [{ label: 'Cancelar' }] });
  }
  function rackRowDialog() {
    const d = CAT.TYPES.rack.defaults;
    const f = (k, label, val, step, min) => el('label', { class: 'fld' }, [el('span', { text: label }), el('input', { name: k, type: 'number', value: val, step: step || 0.05, min: min === undefined ? 0 : min })]);
    const form = el('form', { class: 'grid2' }, [
      f('count', 'Cantidad de racks', 4, 1, 1), f('aisle', 'Pasillo entre racks (m)', 3.0, 0.1, 0),
      f('modules', 'Módulos por rack', d.modules, 1, 1), f('modLen', 'Largo de módulo (m)', d.modLen, 0.05, 0.5),
      f('levels', 'Niveles', d.levels, 1, 1), f('levelH', 'Altura por nivel (m)', d.levelH, 0.05, 0.3),
      f('rackW', 'Profundidad (m)', d.rackW, 0.05, 0.4),
      el('label', { class: 'fld' }, [el('span', { text: 'Orientación' }), el('select', { name: 'rot' }, [el('option', { value: '0', text: 'A lo largo (vertical en planta)' }), el('option', { value: '90', text: 'A lo ancho (horizontal en planta)' })])]),
      el('label', { class: 'fld' }, [el('span', { text: 'Prefijo de nombre' }), el('input', { name: 'label', type: 'text', value: 'Rack' })]),
      el('label', { class: 'fld' }, [el('span', { text: 'Color' }), el('input', { name: 'color', type: 'color', value: d.color })]),
      el('label', { class: 'fld chk' }, [el('input', { name: 'pairs', type: 'checkbox' }), el('span', { text: 'Racks dobles (espalda con espalda) separados por el pasillo' })]),
    ]);
    modal({
      title: 'Fila de racks', body: form, sticky: true,
      buttons: [{ label: 'Cancelar' }, { label: 'Colocar en el plano', primary: true, onClick: () => {
        const fd = new FormData(form), cfg = {};
        ['count', 'aisle', 'modules', 'modLen', 'levels', 'levelH', 'rackW', 'rot'].forEach(k => { cfg[k] = num(fd.get(k), 0); });
        cfg.label = fd.get('label') || 'Rack'; cfg.color = fd.get('color'); cfg.pairs = !!fd.get('pairs');
        armTool('rackrow', { cfg: cfg }); hint('Clic en el piso: ahí irá el centro del primer rack');
      } }],
    });
  }
  function createRackRow(px, py, cfg) {
    pushUndo();
    const v = currentView(); const n = Math.max(1, Math.round(cfg.count)); const first = [];
    for (let i = 0; i < n; i++) {
      const units = cfg.pairs ? Math.floor(i / 2) * (2 * cfg.rackW + cfg.aisle) + (i % 2) * cfg.rackW : i * (cfg.rackW + cfg.aisle);
      const it = Object.assign({ id: uid(), type: 'rack', wh: v.whId, sub: v.sub }, deepCopy(CAT.TYPES.rack.defaults), {
        modules: cfg.modules, modLen: cfg.modLen, levels: cfg.levels, levelH: cfg.levelH, rackW: cfg.rackW, rot: cfg.rot, color: cfg.color,
        label: cfg.label + ' ' + (i + 1), x: r2(cfg.rot === 90 ? px : px + units), y: r2(cfg.rot === 90 ? py + units : py),
      });
      if (v.whId === 'general' && !v.sub) it.sub = subAt(it);
      DATA.items.push(it); engine.addItem(it); first.push(it.id);
    }
    select(first[0]); markDirty(); toast(n + ' racks colocados');
  }

  function select(id) { sel = id; engine.select(id); renderProps(); if (id) showInfoFor(id); }
  function deleteSel() { if (!sel) return toast('Selecciona un elemento'); pushUndo(); DATA.items = DATA.items.filter(i => i.id !== sel); engine.removeItem(sel); sel = null; renderProps(); hideInfo(); markDirty(); }
  function duplicateSel() {
    const it = getItem(sel); if (!it) return toast('Selecciona un elemento');
    pushUndo(); const c = deepCopy(it); c.id = uid(); c.x = r2(c.x + 1.5); if (c.type === 'line') c.x2 = r2(c.x2 + 1.5);
    if (c.type === 'rack') c.x = r2(it.x + (+it.rackW || 1) + 0.5);
    DATA.items.push(c); engine.addItem(c); select(c.id); markDirty();
  }
  function rotateSel(deg) { const it = getItem(sel); if (!it || CAT.TYPES[it.type].anchor !== 'center') return; pushUndo(); it.rot = ((+it.rot || 0) + deg) % 360; engine.moveItem(it); renderProps(); markDirty(); }
  function nudgeSel(dx, dy) { const it = getItem(sel); if (!it) return; pushUndo(); it.x = r2(it.x + dx); it.y = r2(it.y + dy); if (it.type === 'line') { it.x2 = r2(it.x2 + dx); it.y2 = r2(it.y2 + dy); } afterMove(it); }
  function afterMove(it) { const v = currentView(); if (v.whId === 'general' && !v.sub) it.sub = subAt(it); engine.moveItem(it); renderProps(); markDirty(); }

  /* ---------- panel de propiedades ---------- */
  function renderProps() {
    const p = $('#props'); if (!p) return; p.innerHTML = '';
    const it = getItem(sel);
    if (!it) { renderWarehouseProps(p); return; }
    const t = CAT.TYPES[it.type];
    p.appendChild(el('h2', { html: t.icon + ' ' + t.name }));
    const fields = CAT.FIELDS[it.type] || [];
    const form = el('div', { class: 'form' });
    fields.forEach(f => {
      let input;
      const commit = (val, light) => { pushUndo(); it[f.key] = val; if (light) engine.moveItem(it); else engine.updateItem(it); if (f.key === 'x' || f.key === 'y') { const v = currentView(); if (v.whId === 'general' && !v.sub) it.sub = subAt(it); } markDirty(); showInfoFor(it.id); };
      if (f.type === 'number') input = el('input', { type: 'number', step: f.step || 0.1, min: f.min, max: f.max, value: it[f.key], onchange: e => commit(r2(num(e.target.value, it[f.key])), ['x', 'y', 'rot'].includes(f.key)) });
      else if (f.type === 'text') input = el('input', { type: 'text', value: it[f.key] || '', onchange: e => commit(e.target.value) });
      else if (f.type === 'color') input = el('input', { type: 'color', value: it[f.key] || '#888888', onchange: e => commit(e.target.value) });
      else if (f.type === 'checkbox') input = el('input', { type: 'checkbox', checked: !!it[f.key], onchange: e => commit(e.target.checked) });
      else if (f.type === 'select') { input = el('select', { onchange: e => commit(e.target.value) }); f.options.forEach(o => input.appendChild(el('option', { value: o, text: o, selected: o === it[f.key] ? '' : null }))); }
      else if (f.type === 'sign') {
        input = el('select', { onchange: e => commit(e.target.value) });
        Object.entries(CAT.SIGN_CATS).forEach(([cat, c]) => { const og = el('optgroup', { label: c.name }); CAT.SIGNS.filter(s => s.cat === cat).forEach(s => og.appendChild(el('option', { value: s.code, text: s.glyph + ' ' + s.label, selected: s.code === it[f.key] ? '' : null }))); input.appendChild(og); });
      }
      if (f.type === 'checkbox') form.appendChild(el('label', { class: 'fld chk' }, [input, el('span', { text: f.label })]));
      else form.appendChild(el('label', { class: 'fld' }, [el('span', { text: f.label }), input]));
    });
    p.appendChild(form);
    if (it.type === 'rack') p.appendChild(el('p', { class: 'muted small', text: 'Largo total: ' + (it.modules * it.modLen).toFixed(2) + ' m · Altura: ' + (it.levels * it.levelH).toFixed(2) + ' m · ' + (it.modules * it.levels) + ' posiciones' }));
    if (it.type === 'zone') p.appendChild(el('p', { class: 'muted small', text: 'Superficie: ' + (it.w * it.d).toFixed(1) + ' m²' }));
    const v = currentView();
    if (v.whId === 'general') {
      const subSel = el('select', { onchange: e => { pushUndo(); it.sub = e.target.value || null; markDirty(); if (v.sub && it.sub !== v.sub) { engine.removeItem(it.id); sel = null; renderProps(); toast('Movido a otra bodega'); } } });
      subSel.appendChild(el('option', { value: '', text: 'Área común (túnel, etc.)', selected: !it.sub ? '' : null }));
      DATA.warehouses.general.subs.forEach(s => subSel.appendChild(el('option', { value: s.id, text: s.name, selected: it.sub === s.id ? '' : null })));
      p.appendChild(el('label', { class: 'fld' }, [el('span', { text: 'Pertenece a' }), subSel]));
    }
    p.appendChild(el('div', { class: 'row' }, [
      el('button', { text: '⧉ Duplicar', onclick: duplicateSel }), el('button', { text: '⟳ Girar 90°', onclick: () => rotateSel(90) }), el('button', { class: 'danger', text: '🗑 Eliminar', onclick: deleteSel }),
    ]));
  }
  function renderWarehouseProps(p) {
    const v = currentView(); const wh = DATA.warehouses[v.whId];
    p.appendChild(el('h2', { text: '🏭 ' + v.name }));
    p.appendChild(el('p', { class: 'muted small', text: 'No hay ningún elemento seleccionado. Haz clic en un elemento del plano para editarlo, o modifica aquí la bodega.' }));
    const form = el('div', { class: 'form' });
    const numF = (label, get, set, step, min) => form.appendChild(el('label', { class: 'fld' }, [el('span', { text: label }), el('input', { type: 'number', step: step || 0.1, min: min || 0.5, value: get(), onchange: e => { pushUndo(); set(r2(num(e.target.value, get()))); markDirty(); rebuild(); } })]));
    const txtF = (label, get, set) => form.appendChild(el('label', { class: 'fld' }, [el('span', { text: label }), el('input', { type: 'text', value: get(), onchange: e => { pushUndo(); set(e.target.value); markDirty(); rebuild(); } })]));
    if (!v.sub) {
      txtF('Nombre', () => wh.name, val => { wh.name = val; });
      numF('Ancho total W (m)', () => wh.W, val => { wh.W = val; });
      numF('Largo total D (m)', () => wh.D, val => { wh.D = val; });
      numF('Altura de muros H (m)', () => wh.H, val => { wh.H = val; }, 0.1, 2);
      p.appendChild(form);
      if (wh.kind === 'group') {
        p.appendChild(el('h3', { text: 'Bodegas dentro del edificio' }));
        wh.subs.forEach(s => {
          const f = el('div', { class: 'form subform' });
          const sf = (label, key, step) => f.appendChild(el('label', { class: 'fld' }, [el('span', { text: label }), el(key === 'name' ? 'input' : 'input', { type: key === 'name' ? 'text' : 'number', step: step || 0.1, value: s[key], onchange: e => { pushUndo(); s[key] = key === 'name' ? e.target.value : r2(num(e.target.value, s[key])); DATA.items.forEach(it => { if (it.wh === 'general') it.sub = subAt(it); }); markDirty(); rebuild(); } })]));
          sf('Nombre', 'name'); sf('X (m)', 'x'); sf('Y (m)', 'y'); sf('Ancho (m)', 'w'); sf('Largo (m)', 'd');
          f.appendChild(el('label', { class: 'fld' }, [el('span', { text: 'Color' }), el('input', { type: 'color', value: s.color || '#c0c8d0', onchange: e => { pushUndo(); s.color = e.target.value; markDirty(); rebuild(); } })]));
          p.appendChild(f);
        });
        p.appendChild(el('p', { class: 'muted small', text: 'Los elementos se asignan a la bodega cuyo recuadro contiene su centro. Al mover un recuadro, la asignación se recalcula.' }));
      }
    } else {
      const s = wh.subs.find(s => s.id === v.sub);
      txtF('Nombre', () => s.name, val => { s.name = val; });
      numF('Ancho (m)', () => s.w, val => { s.w = val; });
      numF('Largo (m)', () => s.d, val => { s.d = val; });
      numF('Altura de muros H (m) · todo el edificio', () => wh.H, val => { wh.H = val; }, 0.1, 2);
      p.appendChild(form);
      p.appendChild(el('p', { class: 'muted small', text: 'Esta bodega forma parte del Almacén General. Su posición dentro del edificio se edita desde la vista "Almacén General".' }));
    }
  }

  /* ---------- compartir / exportar / importar / publicar ---------- */
  function shareURL() {
    const u = new URL(VIEWER_URL, location.href); u.search = '?b=' + viewId;
    u.hash = 'd=' + LZString.compressToEncodedURIComponent(JSON.stringify(DATA)); return u.toString();
  }
  function copyText(txt) { return (navigator.clipboard && navigator.clipboard.writeText) ? navigator.clipboard.writeText(txt) : Promise.reject(); }
  function share() {
    const url = shareURL();
    const ta = el('textarea', { class: 'sharebox', readonly: '' }); ta.value = url;
    const body = el('div', {}, [
      el('p', { class: 'muted', html: 'Este enlace abre el <b>visor de solo lectura</b> con exactamente esta versión del layout (viaja dentro del enlace, ' + Math.round(url.length / 1024) + ' KB). Quien lo reciba puede verlo pero no modificarlo.<br>Para que la liga corta <code>' + new URL(VIEWER_URL, location.href).href + '</code> muestre esta versión para todos, usa <b>Publicar</b>.' }),
      ta,
    ]);
    modal({ title: 'Compartir enlace de solo lectura', body: body, buttons: [{ label: 'Abrir visor', onClick: () => { window.open(url, '_blank'); return false; } }, { label: 'Copiar enlace', primary: true, onClick: () => { copyText(url).then(() => toast('Enlace copiado')).catch(() => { ta.select(); document.execCommand('copy'); toast('Enlace copiado'); }); return false; } }, { label: 'Cerrar' }] });
    ta.select();
  }
  function download(name, text, mime) {
    const a = el('a', { href: URL.createObjectURL(new Blob([text], { type: mime || 'application/json' })), download: name }); document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function exportJSON() { DATA.updatedAt = new Date().toISOString(); download('layouts.json', JSON.stringify(DATA, null, 1)); toast('layouts.json descargado'); }
  function importJSON() {
    const inp = el('input', { type: 'file', accept: '.json,application/json' });
    inp.onchange = () => { const f = inp.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { try { const j = JSON.parse(rd.result); if (!valid(j)) throw 0; pushUndo(); normalize(j); sel = null; rebuild(); markDirty(); toast('Layout importado'); } catch (e) { toast('El archivo no es un layouts.json válido'); } }; rd.readAsText(f); };
    inp.click();
  }
  function screenshot() { const a = el('a', { href: engine.screenshot(), download: 'layout-' + viewId + '.png' }); document.body.appendChild(a); a.click(); a.remove(); }
  async function publish() {
    if (!PUBLISH_URL) {
      modal({ title: 'Publicación no configurada', body: '<p>Falta la URL del servicio de publicación en <code>js/config.js</code>.</p><p class="muted">Mientras tanto: <b>Exportar JSON</b> y subir el archivo como <code>data/layouts.json</code> en GitHub, o usar <b>Compartir enlace</b>.</p>' });
      return;
    }
    const pub = new URL(VIEWER_URL, location.href).href;
    const ok = await new Promise(res => modal({
      title: 'Publicar esta versión', sticky: true,
      body: '<p>La versión actual pasará a ser la que ve <b>todo el mundo</b> en la liga pública:</p><p><a href="' + pub + '" target="_blank" rel="noopener">' + pub + '</a></p><p class="muted">La versión anterior queda en el historial del servicio y se puede recuperar.</p>',
      buttons: [{ label: 'Cancelar', onClick: () => res(false) }, { label: 'Publicar ahora', primary: true, onClick: () => res(true) }],
    }));
    if (!ok) return;
    toast('Publicando…', 15000);
    const payload = Object.assign({}, DATA, { updatedAt: new Date().toISOString() });
    if (CFG.publishPin) payload._pin = CFG.publishPin;
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 30000);
      // text/plain evita el preflight CORS; Apps Script redirige y fetch sigue la redirección
      const r = await fetch(PUBLISH_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), redirect: 'follow', signal: ctl.signal });
      clearTimeout(t);
      const res = await r.json().catch(() => ({ ok: false, error: 'Respuesta no válida del servicio (HTTP ' + r.status + ')' }));
      if (!res.ok) throw new Error(res.error || 'Error desconocido');
      DATA.updatedAt = res.updatedAt || payload.updatedAt;
      const saved = JSON.stringify(DATA); localStorage.setItem(DRAFT_KEY, saved); localStorage.setItem(PUB_KEY, saved);
      SOURCE = 'published'; dirty = false; renderBadges();
      modal({ title: 'Publicado ✔', body: '<p>Listo. La liga pública ya muestra esta versión (quien la tenga abierta debe recargar):</p><p><a href="' + pub + '" target="_blank" rel="noopener">' + pub + '</a></p>' });
    } catch (e) {
      modal({ title: 'No se pudo publicar', body: '<p>' + (e.name === 'AbortError' ? 'El servicio tardó demasiado en responder.' : (e.message || e)) + '</p><p class="muted">Tu borrador sigue guardado en este navegador. Puedes reintentar, o usar <b>Compartir enlace</b> / <b>Exportar JSON</b>.</p>' });
    }
  }
  function resetDraft() {
    modal({ title: 'Restablecer', body: '<p>Se descartará el borrador local y se volverá a cargar la versión publicada. Esta acción no se puede deshacer.</p>', buttons: [{ label: 'Cancelar' }, { label: 'Descartar borrador', primary: true, onClick: () => { localStorage.removeItem(DRAFT_KEY); localStorage.removeItem(PUB_KEY); location.hash = ''; location.reload(); } }] });
  }

  /* ---------- interacción con el plano ---------- */
  function bindPointer() {
    const stage = $('#stage');
    let down = null, drag = null;
    stage.addEventListener('pointerdown', e => {
      if (e.button !== 0 || $('#modal')) return;
      down = { x: e.clientX, y: e.clientY, id: engine.pick(e.clientX, e.clientY) };
      if (EDIT && down.id && !tool) {
        const it = getItem(down.id), p = engine.floorPoint(e.clientX, e.clientY);
        if (it && p) { drag = { it: it, p0: p, o: { x: it.x, y: it.y, x2: it.x2, y2: it.y2 }, moved: false }; engine.setControls(false); }
      }
    }, true);
    stage.addEventListener('pointermove', e => {
      if (!drag) return;
      const p = engine.floorPoint(e.clientX, e.clientY); if (!p) return;
      const dx = p.x - drag.p0.x, dy = p.y - drag.p0.y;
      if (!drag.moved) { if (Math.hypot(dx, dy) < 0.05) return; pushUndo(); drag.moved = true; engine.select(drag.it.id); sel = drag.it.id; }
      drag.it.x = r2(snap(drag.o.x + dx)); drag.it.y = r2(snap(drag.o.y + dy));
      if (drag.it.type === 'line') { drag.it.x2 = r2(drag.o.x2 + (drag.it.x - drag.o.x)); drag.it.y2 = r2(drag.o.y2 + (drag.it.y - drag.o.y)); }
      engine.moveItem(drag.it);
    }, true);
    const up = e => {
      if (drag) { engine.setControls(true); if (drag.moved) { afterMove(drag.it); showInfoFor(drag.it.id); drag = null; down = null; return; } drag = null; }
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6; const id = down.id; down = null;
      if (moved) return;
      if (EDIT && tool) { const p = engine.floorPoint(e.clientX, e.clientY); if (p) placeAt(p); return; }
      if (id) { if (EDIT) select(id); else { engine.select(id); showInfoFor(id); } }
      else { if (EDIT) { sel = null; engine.select(null); renderProps(); } else engine.select(null); hideInfo(); }
    };
    stage.addEventListener('pointerup', up, true);
    stage.addEventListener('pointercancel', () => { if (drag) engine.setControls(true); drag = null; down = null; }, true);
    if (EDIT) document.addEventListener('keydown', e => {
      const tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'Escape') { if (tool) disarm(); else { sel = null; engine.select(null); renderProps(); hideInfo(); } closeModal(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { if (sel) { e.preventDefault(); deleteSel(); } }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSel(); }
      else if (e.key.toLowerCase() === 'r' && sel) { rotateSel(e.shiftKey ? -90 : 90); }
      else if (e.key.startsWith('Arrow') && sel) { e.preventDefault(); const s = e.shiftKey ? 1 : 0.1; nudgeSel(e.key === 'ArrowLeft' ? -s : e.key === 'ArrowRight' ? s : 0, e.key === 'ArrowUp' ? -s : e.key === 'ArrowDown' ? s : 0); }
    });
    if (EDIT) window.addEventListener('beforeunload', () => { if (dirty) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(DATA)); } catch (e) { /* ignore */ } } });
  }

  /* ---------- arranque ---------- */
  function fatal(title, html) {
    document.body.innerHTML = '<div class="fatal"><img src="img/logo.png" alt="AG"><h1>' + title + '</h1>' + html +
      '<p class="muted small">Si el problema sigue, manda una captura de esta pantalla a quien administra los layouts. Navegador: ' + navigator.userAgent.replace(/[<>]/g, '') + '</p></div>';
  }
  function webglOK() {
    try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; }
  }
  async function start() {
    if (!window.THREE || !window.THREE.OrbitControls || !window.LZString || !window.Engine) {
      fatal('No se pudieron cargar los componentes de la página', '<p>Faltó descargar parte del código (carpeta <code>vendor/</code> o <code>js/</code>). Suele ser un filtro de red o una descarga incompleta.</p><p>Recarga la página con <b>Ctrl + F5</b>. Si estás en la red de la empresa, prueba con datos del celular para descartar el filtro.</p>');
      return;
    }
    if (!webglOK()) {
      fatal('Este navegador tiene desactivada la aceleración 3D (WebGL)', '<p>La vista 3D necesita WebGL. Para activarlo en Chrome o Edge:</p><ol><li>Escribe <code>chrome://settings/system</code> (o <code>edge://settings/system</code>) en la barra de direcciones.</li><li>Activa <b>"Usar aceleración por hardware cuando esté disponible"</b> y reinicia el navegador.</li><li>Si sigue igual, abre <code>chrome://flags</code>, busca <b>"Override software rendering list"</b> y ponlo en <b>Enabled</b>.</li></ol><p>También pasa en equipos administrados por la empresa con políticas que bloquean WebGL, o al entrar por Escritorio Remoto.</p>');
      return;
    }
    try { engine = window.Engine($('#stage')); }
    catch (e) { fatal('No se pudo iniciar la vista 3D', '<p><code>' + String(e && e.message || e).replace(/[<>]/g, '') + '</code></p><p>Normalmente es WebGL bloqueado por el equipo o por una extensión del navegador. Prueba en una ventana de incógnito o en otro navegador.</p>'); return; }
    window.AGLayouts = { engine: engine, data: () => DATA }; // para depuración desde la consola
    buildUI();
    const res = await loadData();
    normalize(res.data); SOURCE = res.source;
    const q = new URLSearchParams(location.search).get('b');
    if (q && (DATA.warehouses[q] || DATA.warehouses.general.subs.some(s => s.id === q))) viewId = q;
    if (EDIT) renderPalette();
    rebuild(); engine.setInitialCamera();
    bindPointer();
    if (res.source === 'shared' && EDIT) toast('Abriste una versión compartida por enlace. Al editar se guardará como borrador local.', 5000);
    if (res.source === 'draft') toast('Se recuperó tu borrador local (sin publicar).', 4000);
    if (!EDIT && res.source === 'published' && DATA.updatedAt) $('#credit').innerHTML += ' · actualizado ' + new Date(DATA.updatedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
