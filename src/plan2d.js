import { structureSymbol } from './structures2d.js';
import { canopyOptions } from './canopy.js';
import { fencePlan } from './core.js';
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n = v => Number(v.toFixed(3));
export function createPlan(host, callbacks) {
  let project, selected, dragging = null, zoom=1, center={x:0,z:0};
  function point(e) {
    const svg=host.querySelector('svg');
    if(!svg) return {x:0,y:0};
    const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }
  function piece(i) {
    const {w,h,d,kind}=i, x=-w/2,z=-d/2,c=esc(i.color);
    let s='';
    if(kind==='tentM'||kind==='tentF'||kind==='gate') {
      s=structureSymbol(i,esc);
    } else if(kind==='kitchen') {
      const cfg=canopyOptions(i.canopy,h);
      s=`<rect x="${x}" y="${z}" width="${w}" height="${d}" rx=".05" fill="${c}" stroke="#aab8ad" stroke-width=".05"/><path d="M${x} ${z}L0 0L${w/2} ${z}M${x} ${d/2}L0 0L${w/2} ${d/2}" fill="none" stroke="#b2beb3" stroke-width=".035"/>`;
      for(const [side,path] of [['front',`M${x} ${d/2}H${w/2}`],['back',`M${x} ${z}H${w/2}`],['left',`M${x} ${z}V${d/2}`],['right',`M${w/2} ${z}V${d/2}`]]) {
        const type=cfg.walls[side];if(type!=='open')s+=`<path data-wall="${side}" d="${path}" stroke="${type==='window'?'#7caeb6':'#7c8b80'}" stroke-width=".12" ${type==='door'?'stroke-dasharray=".4 .5"':''}/>`;
      }
      for(const a of [-1,1])for(const b of [-1,1]) {s+=`<rect x="${a*w*.48-.04}" y="${b*d*.48-.04}" width=".08" height=".08" fill="#6b787b"/>`;
        if(cfg.guyRopes)s+=`<path d="M${a*w/2} ${b*d/2} ${a*(w/2+.75)} ${b*(d/2+.75)}" stroke="#9c907a" stroke-width=".035"/>`;
      }
    } else if(kind==='bath') {
      s=`<rect x="${x}" y="${z}" width="${w}" height="${d}" rx=".15" fill="${c}"/><path d="M${x} ${z} ${w/2} ${d/2}M${w/2} ${z} ${x} ${d/2}" stroke="#fff" opacity=".28" stroke-width=".06"/><path d="M${-w*.27} ${d/2}h${w*.54}" stroke="#416873" stroke-width=".12"/>`;
    } else if(kind==='gate'||kind==='exit') {
      s=`<rect x="${x}" y="${-Math.max(d,.28)/2}" width="${w}" height="${Math.max(d,.28)}" rx=".1" fill="${c}"/><circle cx="${x}" cy="0" r=".18" fill="#8f653f"/><circle cx="${w/2}" cy="0" r=".18" fill="#8f653f"/>`;
      if(kind==='gate')s+=`<rect x="${-w*.30}" y="-.4" width="${w*.60}" height=".8" rx=".12" fill="#f9efda"/><text y=".12" text-anchor="middle" font-weight="700" fill="#8e6942" font-size=".37">${esc(i.label||'LEGADO')}</text>`;
    } else if(kind==='bin') {
      s=`<circle r="${Math.max(w,d)/2}" fill="${c}"/><circle r="${Math.max(w,d)*.24}" fill="#3c5042" opacity=".7"/>`;
    } else if(kind==='tree') {
      s=`<circle r="${w*.48}" fill="${c}"/><circle cx="${w*.13}" cy="${-d*.1}" r="${w*.34}" fill="#fff" opacity=".12"/><circle r=".16" fill="#7e6346"/>`;
    } else if(kind==='flag') {
      s=`<circle r=".14" fill="#846b4c"/><path d="M0 0V${-d-.35}L${w} ${-d-.35} ${w*.8} .1Z" fill="${c}"/>`;
    } else s=`<rect x="${x}" y="${z}" width="${w}" height="${d}" rx=".06" fill="${c}"/>`;
    const title=esc(i.name);
    const sel=i.id===selected?`<rect x="${x-.35}" y="${z-.35}" width="${w+.7}" height="${d+.7}" rx=".18" fill="none" stroke="#df884e" stroke-width=".12" stroke-dasharray=".35 .2"/><circle cx="${x-.35}" cy="${z-.35}" r=".13" fill="#fff" stroke="#df884e" stroke-width=".08"/>`:'';
    const label=['tentM','tentF','bath','kitchen'].includes(kind)?`<text y="${d/2+.72}" font-size=".54" fill="#566b52" text-anchor="middle" font-weight="500">${title}</text>`:'';
    return `<g data-id="${esc(i.id)}" transform="translate(${n(i.x)} ${n(i.z)}) rotate(${n(-i.yaw)})" style="cursor:grab"><title>${title} · ${w} × ${d} m · alto ${h} m</title>${s}${sel}${label}</g>`;
  }
  function render(p=project, id=selected) {
    project=p;selected=id;
    const W=p.terrain.width,L=p.terrain.length,fence=fencePlan(p),vw=(W+16)/zoom,vh=(L+16)/zoom;
    const horizontal=p.layout!=='back';
    const path=horizontal?`<rect x="${-W/2}" y="-1.3" width="${W}" height="2.6" rx=".3"/>`:`<rect x="-1.3" y="${-L*.28}" width="2.6" height="${L*.78}" rx=".3"/>`;
    const lines=fence.ropes.map(r=>`<path d="M${r.a.x} ${r.a.z} ${r.b.x} ${r.b.z}" stroke="#aa9470" stroke-width=".08"/>`).join('');
    const posts=fence.posts.map(p=>`<circle cx="${p.x}" cy="${p.z}" r=".13" fill="#96724b"/>`).join('');
    host.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${center.x-vw/2} ${center.z-vh/2} ${vw} ${vh}" role="img" aria-label="Plano editable del campamento" style="font-family:system-ui,sans-serif"><defs><pattern id="grid-2d" width="2" height="2" patternUnits="userSpaceOnUse"><path d="M2 0H0V2" fill="none" stroke="#8dab7a" stroke-width=".035" opacity=".28"/></pattern><filter id="ground-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx=".4" dy=".8" stdDeviation=".65" flood-color="#69805a" flood-opacity=".17"/></filter></defs><rect x="${-W/2-.25}" y="${-L/2-.25}" width="${W+.5}" height="${L+.5}" rx=".4" fill="#c7d5ad" filter="url(#ground-shadow)"/><rect x="${-W/2}" y="${-L/2}" width="${W}" height="${L}" fill="url(#grid-2d)"/><g fill="#e4dbbb" opacity=".6">${path}</g><rect x="${-W/2}" y="${-L/2}" width="${W}" height="${L}" rx=".1" fill="none" stroke="#98af83" stroke-width=".08"/>${lines}${posts}<g>${p.items.filter(i=>i.visible).map(piece).join('')}</g><g stroke="#9eae94" stroke-width=".06" fill="none"><path d="M${-W/2} ${L/2+2}v1m0-.5H${W/2}m0-.5v1M${-W/2-2.5} ${-L/2}h1m-.5 0V${L/2}m-.5 0h1"/></g><g fill="#859279" font-size=".7" text-anchor="middle"><text x="0" y="${L/2+3.8}">${W} m</text><text transform="translate(${-W/2-3.1} 0) rotate(-90)">${L} m</text></g></svg>`;
  }
  host.addEventListener('contextmenu',e=>e.preventDefault());
  host.addEventListener('pointerdown',e=>{
    if(e.button!==0&&e.button!==2)return;
    const pos=point(e),id=e.target.closest('[data-id]')?.dataset.id;
    if(e.button===0&&id) {
      callbacks.select(id);
      const item=project.items.find(i=>i.id===id);
      dragging={type:'item',id,pointer:e.pointerId,dx:item.x-pos.x,dz:item.z-pos.y};
    } else {
      if(e.button===0) callbacks.select(null);
      dragging={type:'pan',pointer:e.pointerId,start:pos,center:{...center}};
    }
    host.setPointerCapture(e.pointerId);e.preventDefault();
  });
  host.addEventListener('pointermove',e=>{
    if(!dragging||e.pointerId!==dragging.pointer)return;
    const pos=point(e);
    if(dragging.type==='item')callbacks.drag(dragging.id,pos.x+dragging.dx,pos.y+dragging.dz,false);
    else {center.x+=dragging.start.x-pos.x;center.z+=dragging.start.y-pos.y;render();}
  });
  function stop(e){if(!dragging||e.pointerId!==dragging.pointer)return;
    if(dragging.type==='item')callbacks.endDrag();
    if(host.hasPointerCapture(e.pointerId))host.releasePointerCapture(e.pointerId);dragging=null;
  }
  host.addEventListener('pointerup',stop);host.addEventListener('pointercancel',stop);
  host.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.min(16,Math.max(.6,zoom*(e.deltaY<0?1.1:.9)));render();},{passive:false});
  return {render,focus(id){const i=project.items.find(v=>v.id===id);if(!i)return;center={x:i.x,z:i.z};zoom=Math.min(12,Math.min((project.terrain.width+16)/(i.w+6),(project.terrain.length+16)/(i.d+6)));render();},fit(){zoom=1;center={x:0,z:0};render();},
    async capture(){
      const svg=host.querySelector('svg').cloneNode(true);
      svg.setAttribute('width','1600');svg.setAttribute('height','1200');
      const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));
      try {const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1200;
        const ctx=canvas.getContext('2d');ctx.fillStyle='#e9eee3';ctx.fillRect(0,0,1600,1200);ctx.drawImage(img,0,0);return canvas.toDataURL('image/png');
      }finally{URL.revokeObjectURL(url);}
    }
  };
}
