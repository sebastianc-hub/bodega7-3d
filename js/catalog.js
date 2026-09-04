/* ============================================================
   CATÁLOGO · tipos de elemento, señalética (NOM-026-STPS) y
   campos editables. Compartido por visor y editor.
   ============================================================ */
(function (g) {
  'use strict';

  /* ---------- Señalética (colores y formas según NOM-026-STPS-2008) ---------- */
  const SIGN_CATS = {
    P: { name: 'Prohibición',           color: '#d0021b', shape: 'circle-bar' },
    O: { name: 'Obligación',            color: '#0b57d0', shape: 'circle' },
    A: { name: 'Precaución / riesgo',   color: '#f5c400', shape: 'triangle' },
    E: { name: 'Evacuación e información', color: '#00913a', shape: 'rect' },
    F: { name: 'Contra incendio',       color: '#d0021b', shape: 'rect' },
  };

  const SIGNS = [
    // Prohibición
    { code: 'P01', cat: 'P', label: 'No fumar',                       glyph: '🚬' },
    { code: 'P02', cat: 'P', label: 'Prohibido el paso',              glyph: '🚶' },
    { code: 'P03', cat: 'P', label: 'Solo personal autorizado',       glyph: '🪪' },
    { code: 'P04', cat: 'P', label: 'No usar celular',                glyph: '📱' },
    { code: 'P05', cat: 'P', label: 'No comer ni beber',              glyph: '🍔' },
    { code: 'P06', cat: 'P', label: 'No estacionarse',                glyph: '🚗' },
    { code: 'P07', cat: 'P', label: 'Prohibido encender fuego',       glyph: '🔥' },
    { code: 'P08', cat: 'P', label: 'No subir a los racks',           glyph: '🧗' },
    { code: 'P09', cat: 'P', label: 'No pasar bajo carga suspendida', glyph: '🏗️' },
    { code: 'P10', cat: 'P', label: 'Montacargas solo personal certificado', glyph: '🚜' },
    { code: 'P11', cat: 'P', label: 'No obstruir',                    glyph: '📦' },
    { code: 'P12', cat: 'P', label: 'No correr',                      glyph: '🏃' },
    // Obligación
    { code: 'O01', cat: 'O', label: 'EPP obligatorio',                glyph: '🦺' },
    { code: 'O02', cat: 'O', label: 'Uso de casco',                   glyph: '⛑️' },
    { code: 'O03', cat: 'O', label: 'Chaleco reflejante',             glyph: '🦺' },
    { code: 'O04', cat: 'O', label: 'Calzado de seguridad',           glyph: '🥾' },
    { code: 'O05', cat: 'O', label: 'Uso de guantes',                 glyph: '🧤' },
    { code: 'O06', cat: 'O', label: 'Lentes de seguridad',            glyph: '🥽' },
    { code: 'O07', cat: 'O', label: 'Protección auditiva',            glyph: '🎧' },
    { code: 'O08', cat: 'O', label: 'Uso de faja lumbar',             glyph: '🧍' },
    { code: 'O09', cat: 'O', label: 'Lavarse las manos',              glyph: '🧼' },
    { code: 'O10', cat: 'O', label: 'Uso de cubrebocas',              glyph: '😷' },
    { code: 'O11', cat: 'O', label: 'Cinturón en montacargas',        glyph: '🚜' },
    { code: 'O12', cat: 'O', label: 'Registrarse al entrar',          glyph: '📝' },
    // Precaución
    { code: 'A01', cat: 'A', label: 'Tránsito de montacargas',        glyph: '🚜' },
    { code: 'A02', cat: 'A', label: 'Riesgo eléctrico',               glyph: '⚡' },
    { code: 'A03', cat: 'A', label: 'Piso resbaloso',                 glyph: '💧' },
    { code: 'A04', cat: 'A', label: 'Carga suspendida',               glyph: '🏗️' },
    { code: 'A05', cat: 'A', label: 'Caída de objetos',               glyph: '📦' },
    { code: 'A06', cat: 'A', label: 'Materiales apilados',            glyph: '🗄️' },
    { code: 'A07', cat: 'A', label: 'Velocidad máx. 10 km/h',         glyph: '🔟' },
    { code: 'A08', cat: 'A', label: 'Cuidado con el escalón',         glyph: '🪜' },
    { code: 'A09', cat: 'A', label: 'Alta temperatura',               glyph: '🌡️' },
    { code: 'A10', cat: 'A', label: 'Riesgo de atrapamiento',         glyph: '⚙️' },
    { code: 'A11', cat: 'A', label: 'Peligro en general',             glyph: '❗' },
    { code: 'A12', cat: 'A', label: 'Materiales inflamables',         glyph: '🔥' },
    { code: 'A13', cat: 'A', label: 'Altura limitada',                glyph: '↕️' },
    { code: 'A14', cat: 'A', label: 'Capacidad máx. del rack',        glyph: '⚖️' },
    { code: 'A15', cat: 'A', label: 'Cruce de peatones',              glyph: '🚶' },
    // Evacuación / información
    { code: 'E01', cat: 'E', label: 'Salida de emergencia',           glyph: '🚪' },
    { code: 'E02', cat: 'E', label: 'Ruta de evacuación ←',           glyph: '⬅️' },
    { code: 'E03', cat: 'E', label: 'Ruta de evacuación →',           glyph: '➡️' },
    { code: 'E04', cat: 'E', label: 'Ruta de evacuación ↑',           glyph: '⬆️' },
    { code: 'E05', cat: 'E', label: 'Ruta de evacuación ↓',           glyph: '⬇️' },
    { code: 'E06', cat: 'E', label: 'Punto de reunión',               glyph: '👥' },
    { code: 'E07', cat: 'E', label: 'Primeros auxilios / botiquín',   glyph: '➕' },
    { code: 'E08', cat: 'E', label: 'Regadera de emergencia',         glyph: '🚿' },
    { code: 'E09', cat: 'E', label: 'Lavaojos',                       glyph: '👁️' },
    { code: 'E10', cat: 'E', label: 'Escalera de emergencia',         glyph: '🪜' },
    { code: 'E11', cat: 'E', label: 'Zona segura',                    glyph: '🛡️' },
    { code: 'E12', cat: 'E', label: 'Camilla',                        glyph: '🛏️' },
    { code: 'E13', cat: 'E', label: 'Teléfono de emergencia',         glyph: '📞' },
    { code: 'E14', cat: 'E', label: 'Paso peatonal',                  glyph: '🚶' },
    { code: 'E15', cat: 'E', label: 'Zona de descarga',               glyph: '🚚' },
    { code: 'E16', cat: 'E', label: 'Zona de tarimas',                glyph: '🪵' },
    // Contra incendio
    { code: 'F01', cat: 'F', label: 'Extintor',                       glyph: '🧯' },
    { code: 'F02', cat: 'F', label: 'Hidrante',                       glyph: '🚰' },
    { code: 'F03', cat: 'F', label: 'Alarma contra incendio',         glyph: '🔔' },
    { code: 'F04', cat: 'F', label: 'Manguera contra incendio',       glyph: '🪢' },
    { code: 'F05', cat: 'F', label: 'Detector de humo',               glyph: '💨' },
    { code: 'F06', cat: 'F', label: 'Escalera contra incendio',       glyph: '🪜' },
    { code: 'F07', cat: 'F', label: 'Equipo contra incendio',         glyph: '🔥' },
  ];
  const SIGN_BY_CODE = {};
  SIGNS.forEach(s => { SIGN_BY_CODE[s.code] = s; });

  const EXT_TYPES = ['PQS (polvo químico seco)', 'CO2', 'Agua a presión', 'Espuma AFFF', 'Clase K', 'Halotrón / agente limpio'];

  /* ---------- Tipos de elemento ---------- */
  // layer: capa a la que pertenece · anchor: 'center' | 'corner' | 'start'
  const TYPES = {
    rack:         { name: 'Rack / estantería',   icon: '🗄️', layer: 'racks',  anchor: 'center',
                    defaults: { modules: 8, modLen: 1.05, levels: 4, levelH: 0.6, rackW: 1.0, rot: 0, label: 'Rack', color: '#2f6bb0', cargo: true } },
    zone:         { name: 'Zona / área',         icon: '⬜', layer: 'zones',  anchor: 'corner',
                    defaults: { w: 6, d: 6, name: 'Zona', k: 'Z', color: '#c8dfcc', paint: '', room: false, h: 3 } },
    line:         { name: 'Línea de piso',       icon: '➖', layer: 'marks',  anchor: 'start',
                    defaults: { x2: 0, y2: 6, width: 0.1, color: '#e8b90c', arrow: false } },
    extinguisher: { name: 'Extintor',            icon: '🧯', layer: 'safety', anchor: 'center',
                    defaults: { num: '', kind: EXT_TYPES[0], cap: '6 kg', recarga: '', rot: 0 } },
    sign:         { name: 'Señalización',        icon: '⚠️', layer: 'signs',  anchor: 'center',
                    defaults: { code: 'A01', rot: 0, h: 2.2 } },
    firstaid:     { name: 'Botiquín',            icon: '➕', layer: 'safety', anchor: 'center', defaults: { rot: 0, label: 'Botiquín' } },
    hydrant:      { name: 'Hidrante',            icon: '🚰', layer: 'safety', anchor: 'center', defaults: { rot: 0 } },
    alarm:        { name: 'Alarma / estación manual', icon: '🔔', layer: 'safety', anchor: 'center', defaults: { rot: 0 } },
    bollard:      { name: 'Bolardo',             icon: '🟡', layer: 'safety', anchor: 'center', defaults: {} },
    cone:         { name: 'Cono',                icon: '🔶', layer: 'safety', anchor: 'center', defaults: {} },
    hazard:       { name: 'Poste de peligro',    icon: '🟨', layer: 'safety', anchor: 'center', defaults: {} },
    room:         { name: 'Cuarto / oficina',    icon: '🏠', layer: 'equip',  anchor: 'center',
                    defaults: { w: 4, d: 3, h: 2.8, label: 'Oficina', roof: true, rot: 0, color: '#e8e8e6' } },
    box:          { name: 'Equipo / bloque',     icon: '📦', layer: 'equip',  anchor: 'center',
                    defaults: { w: 2, d: 1, h: 1, color: '#8090a0', label: 'Equipo', rot: 0 } },
    pallet:       { name: 'Tarima con carga',    icon: '🪵', layer: 'equip',  anchor: 'center', defaults: { boxes: 2, color: '#b5854f', rot: 0 } },
    table:        { name: 'Mesa de trabajo',     icon: '🛠️', layer: 'equip',  anchor: 'center', defaults: { w: 1.4, d: 0.7, label: 'Mesa', rot: 0 } },
    forklift:     { name: 'Montacargas',         icon: '🚜', layer: 'equip',  anchor: 'center', defaults: { rot: 0 } },
    gate:         { name: 'Portón / cortina',    icon: '🚧', layer: 'equip',  anchor: 'center', defaults: { w: 3.6, h: 4.2, rot: 0 } },
    door:         { name: 'Puerta',              icon: '🚪', layer: 'equip',  anchor: 'center', defaults: { rot: 0 } },
  };

  /* ---------- Campos editables por tipo ---------- */
  const F = (key, label, type, extra) => Object.assign({ key, label, type }, extra || {});
  const POS = [F('x', 'X (m)', 'number', { step: 0.1 }), F('y', 'Y (m)', 'number', { step: 0.1 })];
  const ROT = F('rot', 'Rotación (°)', 'number', { step: 15 });
  const FIELDS = {
    rack: [
      F('label', 'Nombre', 'text'),
      ...POS, ROT,
      F('modules', 'Módulos (tramos)', 'number', { step: 1, min: 1, max: 60 }),
      F('modLen', 'Largo de módulo (m)', 'number', { step: 0.05, min: 0.5, max: 6 }),
      F('levels', 'Niveles', 'number', { step: 1, min: 1, max: 12 }),
      F('levelH', 'Altura por nivel (m)', 'number', { step: 0.05, min: 0.3, max: 3 }),
      F('rackW', 'Profundidad (m)', 'number', { step: 0.05, min: 0.4, max: 3 }),
      F('color', 'Color', 'color'),
      F('cargo', 'Mostrar mercancía', 'checkbox'),
    ],
    zone: [
      F('k', 'Clave', 'text'), F('name', 'Nombre', 'text'),
      ...POS,
      F('w', 'Ancho (m)', 'number', { step: 0.1, min: 0.2 }), F('d', 'Largo (m)', 'number', { step: 0.1, min: 0.2 }),
      F('color', 'Color de piso', 'color'),
      F('paint', 'Texto pintado en piso', 'text'),
      F('room', 'Es cuarto cerrado (muros)', 'checkbox'),
      F('h', 'Altura de muros (m)', 'number', { step: 0.1, min: 1, max: 6 }),
    ],
    line: [
      F('x', 'Inicio X', 'number', { step: 0.1 }), F('y', 'Inicio Y', 'number', { step: 0.1 }),
      F('x2', 'Fin X', 'number', { step: 0.1 }), F('y2', 'Fin Y', 'number', { step: 0.1 }),
      F('width', 'Ancho (m)', 'number', { step: 0.02, min: 0.02, max: 3 }),
      F('color', 'Color', 'color'),
      F('arrow', 'Flecha al final (ruta)', 'checkbox'),
    ],
    extinguisher: [
      F('num', 'Número / ID', 'text'),
      F('kind', 'Tipo de agente', 'select', { options: EXT_TYPES }),
      F('cap', 'Capacidad', 'text'),
      F('recarga', 'Próxima recarga', 'text'),
      ...POS, ROT,
    ],
    sign: [
      F('code', 'Señal', 'sign'),
      ...POS, ROT,
      F('h', 'Altura del poste (m)', 'number', { step: 0.1, min: 0.5, max: 6 }),
    ],
    firstaid: [F('label', 'Nombre', 'text'), ...POS, ROT],
    hydrant: [...POS, ROT],
    alarm: [...POS, ROT],
    bollard: [...POS],
    cone: [...POS],
    hazard: [...POS],
    room: [
      F('label', 'Nombre', 'text'), ...POS, ROT,
      F('w', 'Ancho (m)', 'number', { step: 0.1, min: 0.5 }), F('d', 'Largo (m)', 'number', { step: 0.1, min: 0.5 }),
      F('h', 'Altura (m)', 'number', { step: 0.1, min: 1 }),
      F('color', 'Color', 'color'), F('roof', 'Con techo', 'checkbox'),
    ],
    box: [
      F('label', 'Nombre', 'text'), ...POS, ROT,
      F('w', 'Ancho (m)', 'number', { step: 0.1, min: 0.1 }), F('d', 'Largo (m)', 'number', { step: 0.1, min: 0.1 }),
      F('h', 'Altura (m)', 'number', { step: 0.1, min: 0.1 }),
      F('color', 'Color', 'color'),
    ],
    pallet: [...POS, ROT, F('boxes', 'Camas de cajas', 'number', { step: 1, min: 0, max: 8 }), F('color', 'Color', 'color')],
    table: [F('label', 'Nombre', 'text'), ...POS, ROT, F('w', 'Ancho (m)', 'number', { step: 0.1, min: 0.3 }), F('d', 'Fondo (m)', 'number', { step: 0.1, min: 0.3 })],
    forklift: [...POS, ROT],
    gate: [...POS, ROT, F('w', 'Ancho (m)', 'number', { step: 0.1, min: 1 }), F('h', 'Altura (m)', 'number', { step: 0.1, min: 2 })],
    door: [...POS, ROT],
  };

  // Paleta del editor (orden de aparición)
  const PALETTE = [
    { group: 'Estructura', tools: ['rack', 'rackrow', 'zone', 'line', 'room', 'box'] },
    { group: 'Seguridad e higiene', tools: ['extinguisher', 'sign', 'firstaid', 'hydrant', 'alarm', 'bollard', 'cone', 'hazard'] },
    { group: 'Equipo y mobiliario', tools: ['pallet', 'table', 'forklift', 'gate', 'door'] },
  ];

  const LAYERS = [
    ['racks', 'Racks'], ['cargo', 'Mercancía'], ['zones', 'Zonas'], ['marks', 'Líneas de piso'],
    ['equip', 'Equipo y mobiliario'], ['safety', 'Seguridad'], ['signs', 'Señalización'],
    ['walls', 'Paredes'], ['labels', 'Etiquetas'], ['dims', 'Cotas'], ['grid', 'Cuadrícula'],
  ];

  g.CATALOG = { SIGN_CATS, SIGNS, SIGN_BY_CODE, EXT_TYPES, TYPES, FIELDS, PALETTE, LAYERS };
})(typeof window !== 'undefined' ? window : globalThis);
