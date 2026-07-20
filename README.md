# Bodega 7 — Layout 3D Interactivo (Argenparts)

Visor 3D del layout de la Bodega 7, generado a partir del plano
"Lay Out Ag Bodega 7" (SolidWorks, escala 1:200). Todo en escala real (metros).

**Demo:** una vez activado GitHub Pages, la liga queda en
`https://<usuario>.github.io/<repo>/`

## Contenido

- Nave de 28.20 m × 66.27 m con muros translúcidos.
- 6 filas de racks (BB, AA, Y, X, W, V): 5 de 4 niveles y 1 de 3 niveles, 7 módulos de 3 m c/u.
- Zonas A–Z de la leyenda del plano (carga/descarga, embalaje, devoluciones, túnel, talleres, etc.).
- 11 extintores, cotas generales y mercancía simulada en racks.

## Interacción

| Acción | Control |
|---|---|
| Orbitar | Arrastrar con clic izquierdo |
| Zoom | Rueda del mouse / pellizco |
| Desplazar (pan) | Arrastrar con clic derecho |
| Info de zona/rack | Clic sobre el elemento |
| Ir a una zona | Clic en la leyenda izquierda |
| Vistas | Botones Isométrica / Planta / Frente |
| Capas | Casillas (racks, mercancía, zonas, paredes, etiquetas, extintores, cotas) |

## Publicar en GitHub Pages

1. Crear repositorio público (p. ej. `bodega7-3d`).
2. Subir `index.html` y `README.md` a la raíz.
3. Settings → Pages → Source: **Deploy from a branch** → Branch: `main` / `/ (root)` → Save.
4. En 1–2 minutos la liga pública queda activa.

Sin dependencias locales: Three.js se carga desde CDN (jsdelivr). Funciona en cualquier navegador moderno, incluido móvil.

## Notas técnicas

- Coordenadas del plano: origen en esquina superior izquierda, en metros.
- Supuesto: el rack de 3 niveles es la fila **V** (el plano indica cantidad pero no cuál fila). Editable en el arreglo `ROWS` de `index.html`.
- Posiciones de zonas y extintores aproximadas a partir del plano; ajustables en los arreglos `ZONES` y `EXT`.
