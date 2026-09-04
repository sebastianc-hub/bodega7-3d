# Layouts 3D · Almacenes Argenparts AG

Layouts 3D **editables** de las bodegas de Argenparts (Three.js, sin build ni servidor), publicados en GitHub Pages.

| Liga | Para qué |
|---|---|
| **Visor público (solo lectura):** https://sebastianc-hub.github.io/bodega7-3d/ | Es la liga que se comparte. Cualquiera puede ver y recorrer, nadie puede modificar. |
| **Editor:** https://sebastianc-hub.github.io/bodega7-3d/editor.html | Para David Escalera (Seguridad e Higiene) y quien deba mantener los planos. |

Vistas disponibles (pestañas arriba): **Almacén General 1·2·3·5** completo, **Bodega 1**, **Bodega 2**, **Bodega 3**, **Bodega 5** por separado y **Bodega 7** (edificio independiente, 28.20 × 66.27 m del plano SolidWorks). Las bodegas 1·2·3·5 son recuadros dentro del mismo edificio de 52 × 70 m: lo que se edita en una vista se refleja en las demás.

Se puede abrir una vista directa con `?b=general`, `?b=b1`, `?b=b2`, `?b=b3`, `?b=b5` o `?b=b7`.

## Qué se puede editar

- **Bodegas:** ancho, largo y altura de muros; posición y tamaño de cada bodega dentro del Almacén General.
- **Racks:** nombre, posición, giro, número de módulos, largo de módulo, niveles, altura por nivel, profundidad, color, mercancía. Herramienta **Fila de racks** para crear varios de golpe indicando cantidad y pasillo entre ellos (también racks dobles espalda con espalda).
- **Zonas / áreas** pintadas en piso (con opción de cuarto cerrado con muros), **líneas de piso** y rutas con flecha.
- **Seguridad e higiene:** extintores (número, tipo de agente, capacidad, próxima recarga), botiquines, hidrantes, estaciones de alarma, bolardos, conos, postes de peligro y **señalización NOM-026-STPS-2008** con más de 60 señales de prohibición, obligación, precaución, evacuación/información y contra incendio.
- **Equipo:** cuartos/oficinas, bloques genéricos, tarimas, mesas, montacargas, portones y puertas.
- Todo se **arrastra** en el plano; con `R` gira 90°, flechas mueven 10 cm (con Shift 1 m), `Supr` elimina, `Ctrl+Z` / `Ctrl+Y` deshace y rehace, `Ctrl+D` duplica. El panel derecho permite escribir medidas exactas.
- Vistas Isométrica, **Planta** (ortográfica, ideal para editar) y Frente; capas encendibles; captura PNG.

## Cómo se guarda y se comparte

1. **Borrador local.** Cada cambio se guarda solo en el navegador de quien edita (se recupera al volver a abrir el editor). Nadie más lo ve.
2. **Compartir enlace.** Genera una liga al visor con la versión actual incrustada en la propia URL (unos 9 KB). Quien la reciba la ve tal cual, sin poder editar. Sirve para revisar una propuesta antes de publicarla.
3. **Publicar.** Escribe `data/layouts.json` en este repositorio vía API de GitHub, con lo que la liga pública corta pasa a mostrar esa versión (GitHub Pages tarda 1 a 2 minutos). Pide una sola vez un *token* de GitHub con permiso **Contents: Read and write** sobre este repo; el token se guarda únicamente en ese navegador.
   - Alternativa sin token: **Exportar JSON** y subir el archivo como `data/layouts.json` desde la web de GitHub (*Add file → Upload files*).
4. **Restablecer** descarta el borrador local y recarga lo publicado. **Importar JSON** carga un respaldo.

Prioridad de carga: enlace compartido `#d=…` → borrador local (solo editor) → `data/layouts.json` publicado → valores iniciales de `js/defaults.js`.

## Estructura del repositorio

| Archivo | Contenido |
|---|---|
| `index.html` | Visor público (solo lectura) |
| `editor.html` | Editor |
| `data/layouts.json` | **Layout publicado** (lo que ve el público) |
| `js/catalog.js` | Tipos de elemento, campos editables y catálogo de señalética |
| `js/defaults.js` | Datos iniciales (respaldo si no hay JSON publicado) |
| `js/engine.js` | Escena Three.js: constructores de racks, zonas, señales, cámaras, selección |
| `js/app.js` | Estado, carga/guardado, interfaz de visor y editor, compartir y publicar |
| `css/app.css` | Estilos |

## Formato de datos (resumen)

```json
{
  "version": 2,
  "warehouses": {
    "general": { "W": 52, "D": 70, "H": 9, "kind": "group",
                 "subs": [ { "id": "b1", "name": "Bodega 1", "x": 15, "y": 22, "w": 37, "d": 48 } ] },
    "b7":      { "W": 28.2, "D": 66.27, "H": 9, "kind": "single" }
  },
  "items": [
    { "id": "r-L", "type": "rack", "wh": "general", "sub": "b3", "x": 15, "y": 7.3, "rot": 0,
      "modules": 12, "modLen": 1.05, "levels": 4, "levelH": 0.6, "rackW": 0.95, "label": "Rack L" },
    { "id": "e-01", "type": "extinguisher", "wh": "general", "sub": "b3", "x": 0.6, "y": 9, "num": "E-01", "kind": "PQS", "cap": "9 kg" },
    { "id": "s-01", "type": "sign", "wh": "b7", "x": 18.6, "y": 65.6, "rot": 180, "code": "E01" }
  ]
}
```

Coordenadas en metros; `x` a la derecha y `y` hacia abajo como en el plano, con origen en la esquina superior izquierda del edificio. Los elementos del Almacén General guardan coordenadas del edificio completo y su campo `sub` indica a qué bodega pertenecen (se recalcula según el recuadro que contiene su centro).

## Notas técnicas

- Sin dependencias locales: Three.js r134 y lz-string se cargan desde CDN. Funciona en cualquier navegador moderno, incluido móvil (el visor).
- Cualquiera puede abrir el editor, pero sus cambios se quedan en su navegador. Modificar lo que ve el público requiere el token de GitHub o acceso de escritura al repositorio.
- Para servir en local: `python -m http.server` en la carpeta del repo (abrir con `file://` funciona, pero sin leer `data/layouts.json`).
