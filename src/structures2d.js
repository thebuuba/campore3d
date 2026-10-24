import { structureOptions, gatePlan } from './structures.js';
/** Plan symbols share the same options as the 3D objects; caller escapes text. */
export function structureSymbol(i, escape) {
  const {w,d,kind}=i,c=structureOptions(kind,i.structure),color=escape(i.color);
  if(kind==='tentM'||kind==='tentF'){
    const accent=escape(c.accent);
    let svg=`<rect x="${-w/2}" y="${-d/2}" width="${w}" height="${d}" rx="${Math.min(w,d)*.16}" fill="${color}" stroke="#243e40" stroke-width=".06"/>
    <path d="M${-w*.43} ${-d*.43} Q0 0 ${w*.43} ${d*.43}M${w*.43} ${-d*.43} Q0 0 ${-w*.43} ${d*.43}" fill="none" stroke="${accent}" stroke-width=".075"/>
    <path data-tent-door="${c.doorOpen?'open':'closed'}" d="M${-w*.3} ${d*.46} Q${-w*.28} ${d*.18} 0 ${d*.14} Q${w*.28} ${d*.18} ${w*.3} ${d*.46}Z" fill="${c.doorOpen?'#203237':color}" stroke="${accent}" stroke-width=".045"/>`;
    if(c.fly)svg+=`<path d="M0 ${-d*.20}L${w*.24} 0 0 ${d*.20} ${-w*.24} 0Z" fill="${color}" stroke="#ffffff" stroke-opacity=".25" stroke-width=".04"/>`;
    if(c.guyRopes)for(const a of [-1,1])for(const b of [-1,1])svg+=`<path d="M${a*w*.43} ${b*d*.43}L${a*w*.6} ${b*d*.6}" stroke="#9b8965" stroke-width=".035"/>`;
    return svg;
  }
  if(kind==='gate'){
    const p=gatePlan(i);let svg=p.segments.map(s=>`<path d="M${s.a[0]} ${s.a[2]}L${s.b[0]} ${s.b[2]}" stroke="${color}" stroke-width="${s.r*2}"/>`).join('');
    svg+=`<rect x="${-w*.31}" y="${-Math.max(.35,d*.25)}" width="${w*.62}" height="${Math.max(.7,d*.5)}" rx=".08" fill="#19483e" stroke="#dfb573" stroke-width=".05"/>
    <text y=".12" text-anchor="middle" font-size="${Math.min(.38,w*.07)}" textLength="${w*.54}" lengthAdjust="spacingAndGlyphs" font-weight="700" fill="#fff1d2">${escape(i.label||'LEGADO')}</text>`;
    if(c.banners)for(const s of [-1,1])svg+=`<path d="M${s*w*.365-w*.06} ${d*.4}h${w*.12}v.4l${-w*.06} -.12 ${-w*.06} .12Z" fill="${s<0?'#da7c3e':'#28685b'}"/>`;
    return svg;
  }
  return '';
}
