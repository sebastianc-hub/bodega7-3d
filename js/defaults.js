/* ============================================================
   DATOS POR DEFECTO · se usan cuando no hay data/layouts.json
   publicado ni borrador local. Coordenadas en metros:
   x → derecha, y → abajo (como en el plano). Origen: esquina
   superior izquierda de cada edificio.
   Bodegas 1·2·3·5 comparten el edificio "general" (52 × 70 m);
   cada una es un recuadro (sub) dentro de él.
   ============================================================ */
(function (g) {
  'use strict';

  const R = (id, sub, label, x, y, modules, levels, color, extra) => Object.assign(
    { id, type: 'rack', wh: 'general', sub, label, x, y, rot: 0, modules, levels, modLen: 1.05, levelH: 0.6, rackW: 0.95, color, cargo: true }, extra || {});
  const Z = (id, sub, k, name, x, y, w, d, color, paint, extra) => Object.assign(
    { id, type: 'zone', wh: 'general', sub, k, name, x, y, w, d, color, paint: paint || '', room: false, h: 3 }, extra || {});
  const EXT = (wh, sub, id, num, x, y, cap) => ({ id, type: 'extinguisher', wh, sub, num, x, y, rot: 0, kind: 'PQS (polvo químico seco)', cap: cap || '6 kg', recarga: '' });
  const SG = (wh, sub, id, code, x, y, rot) => ({ id, type: 'sign', wh, sub, code, x, y, rot: rot || 0, h: 2.2 });

  const CB = '#2f6bb0', CB2 = '#3d7ab3', CE = '#5a9e3f', CK = '#4a7fb5';

  const items = [
    /* ───────── Almacén general · zonas ───────── */
    Z('z-b3', 'b3', 'PV', 'Producto para Venta', 14, 0, 13, 19, '#9db5cf', 'PROD. VENTA'),
    Z('z-b5', 'b5', 'PT', 'Producto Terminado', 27, 0, 25, 19, '#8fa8c6', 'PROD. TERMINADO'),
    Z('z-rc', 'b5', 'RC', 'Recibo / Tarimas', 46, 15, 6, 4, '#c8dfcc', 'RECIBO'),
    Z('z-tn', null, 'TN', 'Túnel principal', 0, 19, 52, 3, '#c3c8cd', 'TÚNEL'),
    Z('z-b2', 'b2', 'B2B', 'Venta B2B', 0, 22, 15, 26, '#a9bedb', 'B2B'),
    Z('z-en', 'b2', 'EN', 'Envío / Salida', 0, 25, 4, 12, '#c8dfcc', 'ENVÍO'),
    Z('z-ms', 'b2', 'MS', 'Mesas de Soluciones', 0, 44, 7, 4, '#e4d8a4', 'MESAS'),
    Z('z-mq', 'b2', 'MQ', 'Maquila', 3, 48, 12, 10, '#c8dfcc', 'MAQUILA'),
    Z('z-az', 'b2', 'AZ', 'Autozone', 0, 48, 3, 10, '#e4cfc0', 'AZ'),
    Z('z-ad', 'b2', 'AD', 'Admin / Comedor / Lockers', 0, 58, 15, 12, '#ccd3dc', 'ADMIN'),
    Z('z-ec', 'b1', 'EC', 'Ecommerce', 20, 22, 14, 14, '#c4d8bc', 'ECOMMERCE'),
    Z('z-mk', 'b1', 'MK', 'Marketing', 28, 24, 6, 7, '#e4cfc0', 'MKT'),
    Z('z-ro', 'b1', 'RO', 'Racks Online / Drop', 20, 35, 12, 4, '#e9e2c4', 'ONLINE · DROP'),
    Z('z-ml', 'b1', 'ML', 'MELI / Amazon / Shopify', 22, 38, 16, 20, '#cfe0c8', 'MELI · AMAZON · SHOPIFY'),
    Z('z-ta', 'b1', 'TA', 'Taller', 30, 48, 6, 6, '#e4d8a4', 'TALLER'),

    /* ───────── Almacén general · racks ───────── */
    R('r-L', 'b3', 'Rack L', 15, 7.3, 12, 4, CB),
    R('r-S', 'b3', 'Rack S', 20, 7.3, 12, 4, CB),
    R('r-T', 'b3', 'Rack T', 22, 7.3, 12, 4, CB),
    R('r-O', 'b5', 'Rack O', 29, 6.25, 10, 4, CB2),
    R('r-P', 'b5', 'Rack P', 34, 7.3, 12, 4, CB2),
    R('r-N', 'b5', 'Rack N', 36, 7.3, 12, 4, CB2),
    R('r-M', 'b5', 'Rack M', 41, 6.78, 11, 4, CB2, { rackW: 1.0 }),
    R('r-R', 'b5', 'Rack R', 46, 5.2, 8, 4, CB2),
    R('r-K', 'b2', 'Rack K', 4, 26.15, 6, 4, CK),
    R('r-H', 'b2', 'Rack H', 1, 40.25, 10, 4, CK),
    R('r-I', 'b2', 'Rack I', 5, 38.3, 12, 4, CK),
    R('r-J', 'b2', 'Rack J', 7, 38.3, 12, 4, CK),
    R('r-F', 'b2', 'Rack F', 11, 37.25, 10, 4, CK),
    R('r-D', 'b1', 'Rack D', 17, 29.83, 13, 3, CE),
    R('r-E', 'b1', 'Rack E', 22, 25.63, 5, 3, CE),
    R('r-C', 'b1', 'Rack C', 24, 35.25, 10, 3, CE),
    R('r-B', 'b1', 'Rack B', 26, 35.25, 10, 3, CE),
    R('r-A', 'b1', 'Rack A · MELI Full', 29, 36.3, 12, 3, CE, { rackW: 1.1 }),

    /* ───────── Almacén general · equipo ───────── */
    { id: 'q-m1', type: 'table', wh: 'general', sub: 'b2', label: 'Mesa 1', x: 3.2, y: 45.6, w: 2.2, d: 1.5, rot: 0 },
    { id: 'q-m2', type: 'table', wh: 'general', sub: 'b2', label: 'Mesa 2', x: 5.7, y: 45.6, w: 2.2, d: 1.5, rot: 0 },
    { id: 'q-em', type: 'box', wh: 'general', sub: 'b2', label: 'Emplayadora', x: 13.8, y: 38.8, w: 1.6, d: 1.6, h: 2.4, color: '#333a44', rot: 0 },
    { id: 'q-ta', type: 'box', wh: 'general', sub: 'b1', label: 'Taller', x: 32.5, y: 49.5, w: 3, d: 3, h: 1.1, color: '#7b6b47', rot: 0 },
    { id: 'q-of', type: 'room', wh: 'general', sub: 'b2', label: 'Oficinas', x: 3.5, y: 62.75, w: 5, d: 3.5, h: 2.6, roof: true, color: '#e8e8e6', rot: 0 },
    { id: 'q-lk', type: 'box', wh: 'general', sub: 'b2', label: 'Lockers', x: 8.75, y: 62.5, w: 3.5, d: 3, h: 1.8, color: '#8090a0', rot: 0 },
    { id: 'q-co', type: 'box', wh: 'general', sub: 'b2', label: 'Comedor', x: 5, y: 66.75, w: 8, d: 3.5, h: 0.9, color: '#9092a0', rot: 0 },
    { id: 'l-1', type: 'line', wh: 'general', sub: 'b2', x: 15, y: 22, x2: 15, y2: 48, width: 0.12, color: '#e8b90c', arrow: false },
    { id: 'l-2', type: 'line', wh: 'general', sub: 'b1', x: 34, y: 22, x2: 34, y2: 58, width: 0.12, color: '#e8b90c', arrow: false },

    /* ───────── Almacén general · seguridad (propuesta inicial) ───────── */
    EXT('general', 'b3', 'e-01', 'E-01', 0.6, 9, '9 kg'),
    EXT('general', 'b3', 'e-02', 'E-02', 13.5, 0.7),
    EXT('general', 'b3', 'e-03', 'E-03', 26.4, 9),
    EXT('general', 'b5', 'e-04', 'E-04', 39, 0.7),
    EXT('general', 'b5', 'e-05', 'E-05', 51.4, 9, '9 kg'),
    EXT('general', 'b5', 'e-06', 'E-06', 45, 18.4),
    EXT('general', 'b2', 'e-07', 'E-07', 0.6, 30),
    EXT('general', 'b2', 'e-08', 'E-08', 0.6, 47),
    EXT('general', 'b2', 'e-09', 'E-09', 14.4, 57),
    EXT('general', 'b2', 'e-10', 'E-10', 8, 69.4),
    EXT('general', 'b1', 'e-11', 'E-11', 16, 30),
    EXT('general', 'b1', 'e-12', 'E-12', 34.6, 36),
    EXT('general', 'b1', 'e-13', 'E-13', 51.4, 45, '9 kg'),
    EXT('general', 'b1', 'e-14', 'E-14', 30, 69.4),
    EXT('general', 'b1', 'e-15', 'E-15', 51.4, 60),
    SG('general', 'b2', 's-01', 'E01', 2, 69.6, 0),
    SG('general', 'b1', 's-02', 'E01', 50, 69.6, 0),
    SG('general', 'b2', 's-03', 'E01', 0.5, 35, 90),
    SG('general', null, 's-04', 'O01', 26, 19.4, 0),
    SG('general', 'b2', 's-05', 'O01', 1, 22.6, 180),
    SG('general', null, 's-06', 'A01', 22, 21.6, 180),
    SG('general', 'b1', 's-07', 'A01', 40, 22.6, 180),
    SG('general', 'b1', 's-08', 'E06', 48, 67, 0),
    SG('general', 'b2', 's-09', 'E07', 6.5, 60.4, 0),
    SG('general', 'b2', 's-10', 'P01', 13, 22.6, 180),
    SG('general', 'b3', 's-11', 'A05', 23.2, 12, 90),
    SG('general', 'b5', 's-12', 'P08', 32, 2, 90),
    SG('general', 'b1', 's-13', 'E03', 40, 69.6, 0),
    { id: 'fa-1', type: 'firstaid', wh: 'general', sub: 'b2', label: 'Botiquín', x: 5.5, y: 60.4, rot: 0 },
    { id: 'al-1', type: 'alarm', wh: 'general', sub: 'b2', x: 14.6, y: 23.5, rot: 90 },
    { id: 'al-2', type: 'alarm', wh: 'general', sub: 'b1', x: 26, y: 37.4, rot: 0 },

    /* ═════════ BODEGA 7 (28.20 × 66.27 m · plano SolidWorks) ═════════ */
    { id: 'b7-zA', type: 'zone', wh: 'b7', sub: null, k: 'A', name: 'Zona de Carga y Descarga', x: 18.2, y: 55.3, w: 10.0, d: 10.97, color: '#f4f5f6', paint: 'CARGA Y DESCARGA', room: false, h: 3 },
    { id: 'b7-zB', type: 'zone', wh: 'b7', sub: null, k: 'B', name: 'Taller de Fotografía', x: 0, y: 36, w: 2.0, d: 5.0, color: '#cfc3a6', paint: '', room: true, h: 3 },
    { id: 'b7-zC', type: 'zone', wh: 'b7', sub: null, k: 'C', name: 'Baño', x: 13.55, y: 60.8, w: 4.65, d: 5.47, color: '#cfc3a6', paint: '', room: true, h: 3 },
    { id: 'b7-zD', type: 'zone', wh: 'b7', sub: null, k: 'D', name: 'Taller de MKT', x: 5.13, y: 55.3, w: 8.42, d: 10.97, color: '#c4b696', paint: '', room: true, h: 3 },
    { id: 'b7-zE', type: 'zone', wh: 'b7', sub: null, k: 'E', name: 'Control de Calidad / Desarrollos / Catalogación', x: 0, y: 55.3, w: 5.13, d: 10.97, color: '#cfc3a6', paint: '', room: true, h: 3 },
    { id: 'b7-zF', type: 'zone', wh: 'b7', sub: null, k: 'F', name: 'Zona de Embalaje', x: 4.5, y: 26, w: 8.0, d: 8.0, color: '#e2c94e', paint: 'EMBALAJE', room: false, h: 3 },
    { id: 'b7-zG', type: 'zone', wh: 'b7', sub: null, k: 'G', name: 'Almacén / Racks', x: 1.0, y: 0.5, w: 26.2, d: 23.5, color: '#b9c8d8', paint: '', room: false, h: 3 },
    { id: 'b7-zH', type: 'zone', wh: 'b7', sub: null, k: 'H', name: 'Cocina', x: 13.55, y: 55.3, w: 4.65, d: 5.5, color: '#cfc3a6', paint: '', room: true, h: 3 },
    { id: 'b7-zI', type: 'zone', wh: 'b7', sub: null, k: 'I', name: 'Túnel', x: 2.0, y: 0.5, w: 3.0, d: 22.0, color: '#d3ca4a', paint: 'TÚNEL', room: false, h: 3 },
    { id: 'b7-zZ', type: 'zone', wh: 'b7', sub: null, k: 'Z', name: 'Devoluciones', x: 16.5, y: 26, w: 2.0, d: 4.0, color: '#94a5c6', paint: 'DEV.', room: false, h: 3 },

    { id: 'b7-rBB', type: 'rack', wh: 'b7', sub: null, label: 'Rack BB', x: 6.5, y: 11.5, rot: 0, modules: 7, modLen: 3.0, levels: 4, levelH: 1.5, rackW: 1.1, color: CB, cargo: true },
    { id: 'b7-rAA', type: 'rack', wh: 'b7', sub: null, label: 'Rack AA', x: 10.0, y: 11.5, rot: 0, modules: 7, modLen: 3.0, levels: 4, levelH: 1.5, rackW: 1.1, color: CB, cargo: true },
    { id: 'b7-rY', type: 'rack', wh: 'b7', sub: null, label: 'Rack Y', x: 11.4, y: 11.5, rot: 0, modules: 7, modLen: 3.0, levels: 4, levelH: 1.5, rackW: 1.1, color: CB, cargo: true },
    { id: 'b7-rX', type: 'rack', wh: 'b7', sub: null, label: 'Rack X', x: 16.2, y: 11.5, rot: 0, modules: 7, modLen: 3.0, levels: 4, levelH: 1.5, rackW: 1.1, color: CB, cargo: true },
    { id: 'b7-rW', type: 'rack', wh: 'b7', sub: null, label: 'Rack W', x: 17.6, y: 11.5, rot: 0, modules: 7, modLen: 3.0, levels: 4, levelH: 1.5, rackW: 1.1, color: CB, cargo: true },
    { id: 'b7-rV', type: 'rack', wh: 'b7', sub: null, label: 'Rack V', x: 22.4, y: 11.5, rot: 0, modules: 7, modLen: 3.0, levels: 3, levelH: 1.53, rackW: 1.1, color: CB, cargo: true },

    // líneas de pasillo entre racks
    ...[8.2, 13.8, 19.9, 24.6].flatMap((a, i) => [
      { id: 'b7-la' + i, type: 'line', wh: 'b7', sub: null, x: a - 1.05, y: 1, x2: a - 1.05, y2: 23, width: 0.08, color: '#e8b90c', arrow: false },
      { id: 'b7-lb' + i, type: 'line', wh: 'b7', sub: null, x: a + 1.05, y: 1, x2: a + 1.05, y2: 23, width: 0.08, color: '#e8b90c', arrow: false },
    ]),

    // 11 extintores del plano
    ...[[6, 2], [12, 4.5], [9.5, 12], [15, 15.5], [21, 9], [24.5, 17], [3.5, 27.5], [9, 31.5], [13.8, 39], [19, 45.5], [2.5, 61.5]]
      .map((p, i) => EXT('b7', null, 'b7-e' + (i + 1), 'B7-' + String(i + 1).padStart(2, '0'), p[0], p[1])),

    { id: 'b7-g1', type: 'gate', wh: 'b7', sub: null, x: 20.5, y: 66.05, w: 3.6, h: 4.2, rot: 0 },
    { id: 'b7-g2', type: 'gate', wh: 'b7', sub: null, x: 25.1, y: 66.05, w: 3.6, h: 4.2, rot: 0 },
    ...[[18.6, 64.6], [22.4, 64.6], [23.2, 64.6], [27.0, 64.6]].map((p, i) => ({ id: 'b7-bo' + i, type: 'bollard', wh: 'b7', sub: null, x: p[0], y: p[1] })),

    SG('b7', null, 'b7-s01', 'E01', 18.6, 65.6, 180),
    SG('b7', null, 'b7-s02', 'E01', 27.6, 65.6, 180),
    SG('b7', null, 'b7-s03', 'O01', 19, 54.8, 0),
    SG('b7', null, 'b7-s04', 'A01', 18, 50, 90),
    SG('b7', null, 'b7-s05', 'P01', 13.2, 60.5, 90),
    SG('b7', null, 'b7-s06', 'E06', 27.4, 50, 270),
    SG('b7', null, 'b7-s07', 'E07', 3.2, 54.8, 0),
    SG('b7', null, 'b7-s08', 'A05', 6.5, 24.4, 0),
    SG('b7', null, 'b7-s09', 'A05', 17, 24.4, 0),
    SG('b7', null, 'b7-s10', 'P08', 22.4, 24.4, 0),
    SG('b7', null, 'b7-s11', 'A07', 14.5, 30, 90),
    SG('b7', null, 'b7-s12', 'E04', 14.5, 45, 90),
    { id: 'b7-fa', type: 'firstaid', wh: 'b7', sub: null, label: 'Botiquín', x: 2.2, y: 54.8, rot: 0 },
    { id: 'b7-al', type: 'alarm', wh: 'b7', sub: null, x: 13.6, y: 54.8, rot: 0 },
    { id: 'b7-fk', type: 'forklift', wh: 'b7', sub: null, x: 24, y: 58.5, rot: 180 },
    { id: 'b7-p1', type: 'pallet', wh: 'b7', sub: null, x: 20, y: 57.5, boxes: 3, color: '#b5854f', rot: 0 },
    { id: 'b7-p2', type: 'pallet', wh: 'b7', sub: null, x: 21.5, y: 57.5, boxes: 2, color: '#c49a6c', rot: 0 },
    { id: 'b7-p3', type: 'pallet', wh: 'b7', sub: null, x: 17.2, y: 28.5, boxes: 2, color: '#a87b4a', rot: 0 },
  ];

  g.DEFAULT_DATA = {
    version: 2,
    updatedAt: '2026-09-04T00:00:00Z',
    warehouses: {
      general: {
        id: 'general', name: 'Almacén General · Bodegas 1·2·3·5', kind: 'group', W: 52, D: 70, H: 9,
        subs: [
          { id: 'b3', name: 'Bodega 3', x: 0,  y: 0,  w: 27, d: 19, color: '#9db5cf' },
          { id: 'b5', name: 'Bodega 5', x: 27, y: 0,  w: 25, d: 19, color: '#8fa8c6' },
          { id: 'b2', name: 'Bodega 2', x: 0,  y: 22, w: 15, d: 48, color: '#a9bedb' },
          { id: 'b1', name: 'Bodega 1', x: 15, y: 22, w: 37, d: 48, color: '#c4d8bc' },
        ],
      },
      b7: { id: 'b7', name: 'Bodega 7', kind: 'single', W: 28.2, D: 66.27, H: 9, subs: [] },
    },
    items,
  };
})(typeof window !== 'undefined' ? window : globalThis);
