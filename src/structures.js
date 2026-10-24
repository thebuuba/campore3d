/** Reusable, renderer-independent models. All dimensions are provisional metres. */
export function structureOptions(kind, value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Opciones de estructura no válidas.');
  const flag = (name, fallback) => {
    if (value[name] !== undefined && typeof value[name] !== 'boolean') throw new Error('Opción no válida: ' + name);
    return value[name] ?? fallback;
  };
  if (kind === 'tentM' || kind === 'tentF') {
    const accent = value.accent ?? '#ed8b38';
    if (!/^#[a-f0-9]{6}$/i.test(accent)) throw new Error('Color de varillas no válido.');
    return {doorOpen:flag('doorOpen',true), fly:flag('fly',true), guyRopes:flag('guyRopes',false), accent};
  }
  if (kind === 'gate') {
    const style = value.style ?? 'portal';
    if (!['portal','simple'].includes(style)) throw new Error('Diseño de entrada no válido.');
    return {style, banners:flag('banners',true), lashings:flag('lashings',true)};
  }
  return {};
}
/** Rounded-square dome: elevation t in [0,1], angle 0 faces positive Z. */
export function domePoint(w, h, d, angle, t) {
  const y = Math.min(1, Math.max(0, t));
  const r = Math.pow(Math.max(0, 1-y*y), .47);
  const signedRoot = n => Math.sign(n)*Math.pow(Math.abs(n), .52);
  return [w*.49*r*signedRoot(Math.sin(angle)), h*(.035+.93*y), d*.49*r*signedRoot(Math.cos(angle))];
}
export function doorAngle(t) {return .57*Math.sqrt(Math.max(0,1-Math.pow(t/.79,2)));}
/** Single source of truth for both timber meshes and geometric timber inventory. */
export function gatePlan(item) {
  const {w,h,d}=item, cfg=structureOptions('gate',item.structure), segments=[];
  const radius=Math.min(.12,w*.022,h*.035,d*.12);
  const put=(type,a,b,r=radius)=>segments.push({type,a,b,r});
  if (cfg.style==='simple') {
    for (const s of [-1,1]) put('post',[s*w*.45,0,0],[s*w*.45,h*.94,0]);
    put('beam',[-w*.48,h*.83,0],[w*.48,h*.83,0]);
    for (const s of [-1,1]) put('brace',[s*w*.45,h*.50,0],[s*w*.24,h*.82,0],radius*.65);
    return {segments, radius, opening:w*.9-2*radius, clearance:h*.7, style:cfg.style};
  }
  for (const s of [-1,1]) {
    const inner=s*w*.27, outer=s*w*.46;
    for (const x of [inner,outer]) for (const z of [-d*.36,d*.36]) put('post',[x,0,z],[x,h*.84,z]);
    for (const y of [h*.15,h*.64,h*.82]) {
      for (const z of [-d*.36,d*.36]) put('beam',[inner,y,z],[outer,y,z],radius*.75);
      for (const x of [inner,outer]) put('beam',[x,y,-d*.36],[x,y,d*.36],radius*.75);
    }
    // Bracing is in the side towers, never across the passage.
    put('brace',[inner,h*.16,-d*.36],[outer,h*.63,-d*.36],radius*.6);
    put('brace',[outer,h*.16,-d*.36],[inner,h*.63,-d*.36],radius*.6);
    put('brace',[outer,h*.16,-d*.36],[outer,h*.63,d*.36],radius*.6);
  }
  for (const z of [-d*.36,d*.36]) {
    for (const y of [h*.64,h*.82]) put('beam',[-w*.49,y,z],[w*.49,y,z]);
    for (const s of [-1,1]) put('roof',[s*w*.49,h*.82,z],[0,h*.97,z],radius*.8);
  }
  put('roof',[0,h*.97,-d*.36],[0,h*.97,d*.36],radius*.8);
  return {segments,radius,opening:w*.54-2*radius,clearance:h*.64-radius,style:cfg.style};
}
export function gateInventory(item) {
  const {segments}=gatePlan(item);
  return {poles:segments.filter(s=>s.type==='post').length,
    wood:segments.reduce((total,{a,b})=>total+Math.hypot(...a.map((v,i)=>v-b[i])),0)};
}
