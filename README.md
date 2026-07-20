# Layouts 3D · Almacenes Argenparts AG

Visores 3D interactivos (Three.js) de los almacenes de Argenparts, publicados en GitHub Pages.

**Liga pública:** `https://sebastianc-hub.github.io/bodega7-3d/`

## Estructura

| Archivo | Contenido |
|---|---|
| `index.html` | Menú de inicio para elegir bodega |
| `almacen-general.html` | Bodegas 1 · 2 · 3 · 5 + Bodega 7 aduanera detallada (pestañas para cambiar) |
| `bodega7.html` | Bodega 7 a escala real del plano SolidWorks (28.20 × 66.27 m) |

## Interacción

Orbitar con arrastre, zoom con rueda o pellizco, pan con clic derecho. En `bodega7.html` además: clic en zonas/racks para ver dimensiones y m², capas encendibles (racks, mercancía, zonas, paredes, etiquetas, extintores, cotas) y vistas Isométrica / Planta / Frente.

## Notas técnicas

- Sin dependencias locales: Three.js se carga desde CDN. Funciona en cualquier navegador moderno, incluido móvil.
- `bodega7.html`: geometría en metros reales; posiciones editables en los arreglos `ZONES`, `ROWS` y `EXT`.
- `almacen-general.html`: layout basado en el "Lay Out AG General" y el Excel de logística; racks A–E de 3 niveles, resto de 4.
- Para agregar otra bodega: crear `bodegaN.html` y añadir su tarjeta en `index.html`.
