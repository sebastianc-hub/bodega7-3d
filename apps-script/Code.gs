/**
 * Servicio de publicación · Layouts 3D Argenparts AG
 * ---------------------------------------------------
 * Web app de Google Apps Script que guarda la versión publicada del layout
 * (data JSON) en las Script Properties del proyecto, con historial de las
 * últimas versiones. No requiere token de GitHub ni credenciales en el editor.
 *
 * Implementar como: Aplicación web · Ejecutar como: yo · Acceso: cualquier persona.
 *
 *   GET  ?action=get            → JSON del layout publicado (o {ok:false} si no hay)
 *   GET  ?action=meta           → {ok, updatedAt, size, history:[…]}
 *   GET  ?action=get&ts=<iso>   → una versión del historial
 *   POST (text/plain, body JSON) → guarda como nueva versión publicada
 *
 * Clave opcional: si en Propiedades del script existe PIN, el POST debe traer
 * el mismo valor en el campo "_pin" del JSON. Sin PIN, cualquiera con la URL
 * puede publicar (la URL solo la conoce el editor).
 */
var CHUNK = 6000;      // caracteres por propiedad (límite 9 KB por valor)
var HISTORY_MAX = 8;   // versiones anteriores que se conservan

function doGet(e) {
  var p = (e && e.parameter) || {};
  var action = p.action || 'get';
  if (action === 'meta') return out_(meta_());
  if (action === 'get' && p.ts) {
    var old = read_('h' + p.ts);
    return out_(old ? JSON.parse(old) : { ok: false, error: 'Versión no encontrada' });
  }
  var cur = read_('cur');
  return out_(cur ? JSON.parse(cur) : { ok: false, error: 'Todavía no hay un layout publicado' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var body = e && e.postData && e.postData.contents;
    if (!body) return out_({ ok: false, error: 'Cuerpo vacío' });
    var data;
    try { data = JSON.parse(body); } catch (err) { return out_({ ok: false, error: 'JSON inválido' }); }
    if (!data || !data.warehouses || !Array.isArray(data.items)) return out_({ ok: false, error: 'No parece un layout válido' });
    var pin = PropertiesService.getScriptProperties().getProperty('PIN');
    if (pin && String(data._pin || '') !== pin) return out_({ ok: false, error: 'Clave de publicación incorrecta' });
    delete data._pin;
    data.updatedAt = new Date().toISOString();
    var str = JSON.stringify(data);
    if (str.length > 300000) return out_({ ok: false, error: 'El layout es demasiado grande (' + str.length + ' caracteres)' });

    // la versión actual pasa al historial
    var prev = read_('cur');
    if (prev) {
      var prevTs = ((JSON.parse(prev) || {}).updatedAt) || new Date().toISOString();
      write_('h' + prevTs, prev);
      var hist = history_();
      hist.unshift({ ts: prevTs, size: prev.length });
      while (hist.length > HISTORY_MAX) { var drop = hist.pop(); erase_('h' + drop.ts); }
      PropertiesService.getScriptProperties().setProperty('history', JSON.stringify(hist));
    }
    write_('cur', str);
    return out_({ ok: true, updatedAt: data.updatedAt, size: str.length });
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

/* ---------- almacenamiento por trozos en Script Properties ---------- */
function write_(key, str) {
  var P = PropertiesService.getScriptProperties();
  var n = Math.ceil(str.length / CHUNK), props = {};
  for (var i = 0; i < n; i++) props[key + '_' + i] = str.substr(i * CHUNK, CHUNK);
  props[key + '_n'] = String(n);
  var oldN = parseInt(P.getProperty(key + '_n') || '0', 10);
  P.setProperties(props);
  for (var j = n; j < oldN; j++) P.deleteProperty(key + '_' + j);
}
function read_(key) {
  var P = PropertiesService.getScriptProperties();
  var n = parseInt(P.getProperty(key + '_n') || '0', 10);
  if (!n) return null;
  var parts = [];
  for (var i = 0; i < n; i++) parts.push(P.getProperty(key + '_' + i) || '');
  return parts.join('');
}
function erase_(key) {
  var P = PropertiesService.getScriptProperties();
  var n = parseInt(P.getProperty(key + '_n') || '0', 10);
  for (var i = 0; i < n; i++) P.deleteProperty(key + '_' + i);
  P.deleteProperty(key + '_n');
}
function history_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('history') || '[]'); } catch (e) { return []; }
}
function meta_() {
  var cur = read_('cur');
  var d = cur ? JSON.parse(cur) : null;
  return { ok: !!cur, updatedAt: d ? d.updatedAt : null, size: cur ? cur.length : 0, history: history_() };
}
function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
