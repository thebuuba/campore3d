import { canopyOptions, canopyInventory } from './canopy.js';
/** Pure project model. Units: metres; yaw: degrees; positive Z is the front. */
export const SCHEMA_VERSION = 2;
export const CATALOG = Object.freeze({
  tentM: { name: 'Carpa · varones', short: 'Varones', category: 'camp', icon: 'tent', color: '#668f7b', w: 3.4, h: 2.2, d: 4.2 },
  tentF: { name: 'Carpa · hembras', short: 'Hembras', category: 'camp', icon: 'tent', color: '#d5a274', w: 3.4, h: 2.2, d: 4.2 },
  kitchen: { name: 'Cocina · toldo', short: 'Cocina', category: 'camp', icon: 'kitchen', color: '#f6f5ef', w: 3, h: 3.2, d: 3 },
  bath: { name: 'Baño / vestidor', short: 'Vestidor', category: 'camp', icon: 'bath', color: '#8db1ba', w: 1.5, h: 2.4, d: 1.5 },
  bin: { name: 'Zafacón', short: 'Zafacón', category: 'camp', icon: 'bin', color: '#708572', w: 0.7, h: 1, d: 0.7 },
  gate: { name: 'Entrada Legado', short: 'Entrada', category: 'build', icon: 'gate', color: '#b17a4b', w: 5.5, h: 3.6, d: 0.8 },
  exit: { name: 'Salida secundaria', short: 'Salida', category: 'build', icon: 'exit', color: '#72967b', w: 3, h: 2, d: 0.3 },
  post: { name: 'Poste de madera', short: 'Poste', category: 'build', icon: 'post', color: '#a7774e', w: 0.18, h: 2.5, d: 0.18 },
  beam: { name: 'Travesaño', short: 'Travesaño', category: 'build', icon: 'beam', color: '#a7774e', w: 3, h: 0.18, d: 0.18 },
  table: { name: 'Mesa de trabajo', short: 'Mesa', category: 'camp', icon: 'table', color: '#b9946a', w: 2.2, h: 0.85, d: 0.9 },
  tree: { name: 'Árbol de referencia', short: 'Árbol', category: 'camp', icon: 'tree', color: '#7f9a6b', w: 3, h: 5, d: 3 },
  flag: { name: 'Mástil y bandera', short: 'Bandera', category: 'build', icon: 'flag', color: '#db8350', w: 1.4, h: 4, d: 0.2 }
});
let nextId = 0;
export function uid() { return globalThis.crypto?.randomUUID?.() || `piece-${Date.now()}-${++nextId}`; }
export const copy = value => JSON.parse(JSON.stringify(value));
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export function createItem(kind, overrides = {}) {
  const base = CATALOG[kind];
  if (!Object.hasOwn(CATALOG, kind)) throw new Error('Tipo de pieza desconocido.');
  return { id: uid(), kind, name: base.name, x: 0, y: 0, z: 0, yaw: 0,
    w: base.w, h: base.h, d: base.d, color: base.color, visible: true,
    label: kind === 'gate' ? 'LEGADO' : '', ...overrides,
    ...(kind === 'kitchen' ? {canopy:canopyOptions(overrides.canopy, overrides.h ?? base.h)} : {}) };
}
export function createProject() {
  return arrangeProject({ schemaVersion: SCHEMA_VERSION, name: 'Campamento Legado',
    terrain: { width: 40, length: 60, fenceSpacing: 3, fenceHeight: 1.2 },
    layout: 'back', secondaryExit: false, items: [] });
}
export function arrangeProject(project) {
  const p = copy(project), { width: W, length: L } = p.terrain;
  const angle = p.layout === 'left' ? 90 : p.layout === 'right' ? -90 : 0;
  const a = angle * Math.PI / 180, w = angle ? L : W, l = angle ? W : L;
  p.items = [];
  const add = (kind, x, z, extra = {}) => p.items.push(createItem(kind, {
    x: Math.cos(a) * x + Math.sin(a) * z,
    z: -Math.sin(a) * x + Math.cos(a) * z, yaw: angle, ...extra }));
  // Actual tent dimensions do not shrink when the field becomes smaller.
  // The warning system flags collisions rather than presenting a false safe plan.
  for (let row = 0; row < 3; row++) for (let col = 0; col < 2; col++) {
    const x = w * (0.34 - col * 0.17), z = l * (-0.13 + row * 0.20);
    add('tentM', -x, z, { name: `Varones ${row * 2 + col + 1}` });
    add('tentF', x, z, { name: `Hembras ${row * 2 + col + 1}` });
  }
  add('kitchen', -w * 0.26, -l * 0.35);
  add('bath', w * 0.25, -l * 0.37, { name: 'Vestidor 1' });
  add('bath', w * 0.34, -l * 0.37, { name: 'Vestidor 2' });
  add('gate', 0, l / 2);
  add('bin', -w * 0.09, -l * 0.27);
  add('bin', w * 0.09, -l * 0.27);
  if (p.secondaryExit) add('exit', 0, -l / 2, { yaw: angle + 180 });
  return p;
}
export function setSecondaryExit(project, enabled) {
  const p = copy(project);
  p.secondaryExit = enabled;
  if (!enabled) p.items = p.items.filter(i => i.kind !== 'exit');
  else if (!p.items.some(i => i.kind === 'exit')) {
    const a = p.layout === 'left' ? 90 : p.layout === 'right' ? -90 : 0;
    const length = a ? p.terrain.width : p.terrain.length;
    p.items.push(createItem('exit', { x: -Math.sin(a * Math.PI / 180) * length / 2,
      z: -Math.cos(a * Math.PI / 180) * length / 2, yaw: a + 180 }));
  }
  return p;
}
function finite(v, min, max, field) {
  if (!Number.isFinite(v) || v < min || v > max) throw new Error(`Valor no válido: ${field}.`);
  return v;
}
export function validateProject(input) {
  if (!input || typeof input !== 'object') throw new Error('Proyecto no válido.');
  // Import the earlier standalone HTML's JSON format without executing any code.
  let s = input;
  if (Object.hasOwn(input, 'W') && Array.isArray(input.items)) {
    s = { schemaVersion: 1, name: 'Proyecto importado', layout: input.layout || 'back',
      terrain: { width: input.W, length: input.L, fenceSpacing: 3, fenceHeight: 1.2 },
      items: input.items.map(i => {
        const def = CATALOG[i.kind];
        if (!def) throw new Error('Tipo de pieza antiguo no reconocido.');
        const k = i.scale ?? 1;
        finite(k, 0.2, 5, 'escala antigua');
        return createItem(i.kind, { x: i.x, z: i.z, yaw: (i.rot ?? 0) * 180 / Math.PI,
          w: def.w * k, h: def.h * k, d: def.d * k });
      }) };
  }
  if (![1, SCHEMA_VERSION].includes(s.schemaVersion)) throw new Error('Versión del proyecto no compatible.');
  const t = s.terrain;
  if (!t || !Array.isArray(s.items) || s.items.length > 500) throw new Error('Terreno o cantidad de piezas no válidos.');
  const ids = new Set();
  const items = s.items.map(i => {
    if (!i || !Object.hasOwn(CATALOG, i.kind)) throw new Error('Tipo de pieza no válido.');
    const id = typeof i.id === 'string' && i.id.length < 100 ? i.id : uid();
    if (ids.has(id)) throw new Error('El proyecto contiene identificadores repetidos.');
    ids.add(id);
    return { id, kind: i.kind, name: String(i.name ?? CATALOG[i.kind].name).slice(0, 80),
      label: String(i.label ?? '').slice(0, 40),
      x: finite(i.x, -500, 500, 'X'), y: finite(i.y ?? 0, 0, 30, 'altura sobre el suelo'),
      z: finite(i.z, -500, 500, 'Z'), yaw: finite(i.yaw ?? 0, -3600, 3600, 'rotación'),
      w: finite(i.w, 0.05, 50, 'ancho de pieza'), h: finite(i.h, 0.05, 30, 'alto de pieza'),
      d: finite(i.d, 0.05, 50, 'fondo de pieza'),
      color: /^#[0-9a-f]{6}$/i.test(i.color) ? i.color : CATALOG[i.kind].color,
      visible: i.visible !== false,
      ...(i.kind === 'kitchen' ? {canopy:canopyOptions(i.canopy, i.h)} : {}) };
  });
  return { schemaVersion: SCHEMA_VERSION, name: String(s.name || 'Campamento Legado').slice(0, 80),
    terrain: { width: finite(t.width, 12, 150, 'ancho del campo'),
      length: finite(t.length, 12, 200, 'largo del campo'),
      fenceSpacing: finite(t.fenceSpacing ?? 3, 1, 6, 'espaciado de postes'),
      fenceHeight: finite(t.fenceHeight ?? 1.2, 0.5, 3, 'altura del perímetro') },
    layout: ['back', 'left', 'right'].includes(s.layout) ? s.layout : 'back',
    secondaryExit: items.some(i => i.kind === 'exit'), items };
}
export function footprint(item) {
  const r = item.yaw * Math.PI / 180, c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r));
  return { rx: (item.w * c + item.d * s) / 2, rz: (item.d * c + item.w * s) / 2 };
}
export function warnings(project) {
  const result = [], W = project.terrain.width / 2, L = project.terrain.length / 2;
  const ground = project.items.filter(i => i.visible && i.y < 0.1 &&
    ['tentM', 'tentF', 'bath', 'kitchen', 'bin', 'table'].includes(i.kind));
  for (const i of project.items.filter(i => i.visible && !['gate', 'exit'].includes(i.kind))) {
    const f = footprint(i);
    if (Math.abs(i.x) + f.rx > W + 0.05 || Math.abs(i.z) + f.rz > L + 0.05)
      result.push({ type: 'outside', ids: [i.id], text: `${i.name}: fuera del terreno.` });
  }
  for (let a = 0; a < ground.length; a++) for (let b = a + 1; b < ground.length; b++) {
    const i = ground[a], j = ground[b], f = footprint(i), g = footprint(j);
    if (Math.abs(i.x - j.x) < f.rx + g.rx - 0.03 && Math.abs(i.z - j.z) < f.rz + g.rz - 0.03)
      result.push({ type: 'overlap', ids: [i.id, j.id], text: `Revisar posible cruce: ${i.name} / ${j.name}.` });
  }
  return result;
}
/** Perimeter geometry shared by both viewers and the conceptual material inventory. */
export function fencePlan(project) {
  const { width: W, length: L, fenceSpacing: gap } = project.terrain;
  const openings = project.items.filter(i => i.visible && ['gate', 'exit'].includes(i.kind));
  function isOpen(x, z) {
    return openings.some(i => {
      const a = i.yaw * Math.PI / 180, dx = x - i.x, dz = z - i.z;
      return Math.abs(Math.cos(a) * dx - Math.sin(a) * dz) < i.w / 2 + 0.16 &&
        Math.abs(Math.sin(a) * dx + Math.cos(a) * dz) < Math.max(0.55, i.d / 2);
    });
  }
  const posts = [], ropes = [], seen = new Set();
  for (const [start, end] of [[[-W/2,-L/2],[W/2,-L/2]],[[W/2,-L/2],[W/2,L/2]],
    [[W/2,L/2],[-W/2,L/2]],[[-W/2,L/2],[-W/2,-L/2]]]) {
    const length = Math.hypot(end[0]-start[0],end[1]-start[1]), count = Math.ceil(length / gap);
    let prev = null;
    for (let n = 0; n <= count; n++) {
      const x = start[0] + (end[0]-start[0])*n/count, z = start[1] + (end[1]-start[1])*n/count;
      if (isOpen(x,z)) { prev = null; continue; }
      const key = `${x.toFixed(4)},${z.toFixed(4)}`;
      if (!seen.has(key)) { posts.push({x,z}); seen.add(key); }
      if (prev) {
        const steps = Math.max(2, Math.ceil(Math.hypot(x-prev.x,z-prev.z)/0.15));
        let blocked = false;
        for (let k=1;k<steps;k++) if (isOpen(prev.x+(x-prev.x)*k/steps,prev.z+(z-prev.z)*k/steps)) { blocked=true; break; }
        if (!blocked) ropes.push({a:prev,b:{x,z},length:Math.hypot(x-prev.x,z-prev.z)});
      }
      prev={x,z};
    }
  }
  return { posts, ropes };
}
export function inventory(project) {
  const fence = fencePlan(project), count = {};
  for (const i of project.items.filter(i => i.visible)) count[i.kind] = (count[i.kind] || 0) + 1;
  // Geometric centreline lengths only. Buried lengths, knots and waste are NOT included.
  let poles = fence.posts.length, wood = poles * project.terrain.fenceHeight;
  for (const i of project.items.filter(i => i.visible)) {
    if (i.kind === 'gate') { poles += 2; wood += i.h*2 + i.w*2 + Math.hypot(i.w*0.22,i.h*0.24)*2; }
    if (i.kind === 'exit') { poles += 2; wood += i.h*2; }
    if (i.kind === 'post') { poles += 1; wood += i.h; }
    if (i.kind === 'beam') wood += i.w;
  }
  const canopies = {kits:0, legs:0, wallPanels:0, windowPanels:0, guyRopes:0, tables:0};
  for (const i of project.items.filter(i => i.visible && i.kind === 'kitchen')) {
    const values=canopyInventory(i); for (const key of Object.keys(canopies)) canopies[key]+=values[key];
  }
  return { count, poles, wood, canopies, rope: fence.ropes.reduce((s,r)=>s+r.length,0),
    area: project.terrain.width*project.terrain.length };
}
export function createHistory(initial, limit = 60) {
  let past=[], present=copy(initial), future=[];
  return { get current(){return copy(present);}, get canUndo(){return past.length>0;},get canRedo(){return future.length>0;},
    commit(value){ if(JSON.stringify(value)===JSON.stringify(present))return false;
      past.push(present);if(past.length>limit)past.shift();present=copy(value);future=[];return true; },
    undo(){if(!past.length)return copy(present);future.push(present);present=past.pop();return copy(present);},
    redo(){if(!future.length)return copy(present);past.push(present);present=future.pop();return copy(present);}
  };
}
