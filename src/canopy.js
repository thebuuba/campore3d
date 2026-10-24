/** Kitchen canopy configuration. Reference shape only; not manufacturer specifications. */
export const WALL_SIDES = ['front', 'back', 'left', 'right'];
export const WALL_TYPES = ['open', 'solid', 'window', 'door'];
export function canopyOptions(value = {}, height = 3.2) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Configuración de toldo no válida.');
  const maxRise = Math.min(2, height * 0.45);
  const roofRise = value.roofRise ?? Math.min(0.85, maxRise);
  if (!Number.isFinite(roofRise) || roofRise <= 0 || roofRise > maxRise) throw new Error('La altura del techo debe ser positiva y no superar el 45% del alto total (máximo 2 m).');
  const source = value.walls === undefined ? {front:'open', back:'solid', left:'window', right:'window'} : value.walls;
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('Paredes del toldo no válidas.');
  const walls = {};
  for (const side of WALL_SIDES) {
    const type = source[side] ?? 'open';
    if (!WALL_TYPES.includes(type)) throw new Error('Tipo de pared no válido.');
    walls[side] = type;
  }
  for (const key of ['guyRopes', 'table']) if (value[key] !== undefined && typeof value[key] !== 'boolean') throw new Error('Opción de toldo no válida: ' + key);
  return {roofRise, walls, guyRopes:value.guyRopes ?? true, table:value.table ?? true};
}
/** Four hip roof surfaces. No bottom face: the underside remains open. */
export function canopyRoof(w, d, rise) {
  const ridge = Math.max(0, (w - d) / 2);
  const ridgeZ = Math.max(0, (d - w) / 2);
  const a = [-w/2,0,-d/2], b = [w/2,0,-d/2], c = [w/2,0,d/2], e = [-w/2,0,d/2];
  const r1 = [-ridge,rise,-ridgeZ], r2 = [ridge,rise,ridgeZ];
  if (w >= d) return [a,r1,r2,a,r2,b, b,r2,c, c,r2,r1,c,r1,e, e,r1,a].flat();
  return [a,r1,b, b,r1,r2,b,r2,c, c,r2,e, e,r2,r1,e,r1,a].flat();
}
export function canopyInventory(item) {
  const cfg = canopyOptions(item.canopy, item.h);
  return {kits:1, legs:4, wallPanels:WALL_SIDES.filter(s=>cfg.walls[s]!=='open').length,
    windowPanels:WALL_SIDES.filter(s=>cfg.walls[s]==='window').length,
    guyRopes:cfg.guyRopes?4:0, tables:cfg.table?1:0};
}
