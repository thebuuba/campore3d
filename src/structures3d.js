import * as THREE from 'three';
import { structureOptions, domePoint, doorAngle, gatePlan } from './structures.js';
const fabric = color => new THREE.MeshStandardMaterial({color,roughness:.94,side:THREE.DoubleSide});
function structureMesh(geometry, material) {const m=new THREE.Mesh(geometry,material);m.castShadow=true;m.receiveShadow=true;return m;}
function structureTube(points,r,material) {
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  return structureMesh(new THREE.TubeGeometry(curve,Math.max(8,points.length*2),r,6,false),material);
}
function structureBar(a,b,r,material) {
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),v=end.clone().sub(start);
  const m=structureMesh(new THREE.CylinderGeometry(r*.92,r,v.length(),10),material);
  m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return m;
}
/** Smooth indexed patches keep the silhouette curved rather than cone-like. */
function structurePatch(fn,material,nu=24,nv=20) {
  const points=[],indices=[];
  for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++)points.push(...fn(i/nu,j/nv));
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+1,c=a+nu+1;indices.push(a,c,b,b,c,c+1);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.setIndex(indices);geometry.computeVertexNormals();return structureMesh(geometry,material);
}
export function createDome(item) {
  const {w,h,d}=item,c=structureOptions(item.kind,item.structure),g=new THREE.Group();g.name='Carpa domo';
  const cloth=fabric(item.color),front=fabric(new THREE.Color(item.color).multiplyScalar(1.14)),dark=fabric('#202e32');
  const accent=fabric(c.accent),pole=new THREE.MeshStandardMaterial({color:'#b7c5c7',metalness:.55,roughness:.4});
  const point=(a,t)=>domePoint(w,h,d,a,t),edge=.88;
  // Back and side fabric; front is built around a real doorway, not a black painted triangle.
  g.add(structurePatch((u,v)=>point(edge+u*(Math.PI*2-2*edge),v),cloth,40,24));
  for(const sign of [-1,1])g.add(structurePatch((u,v)=>{
    const cut=doorAngle(v);return point(sign*(cut+(edge-cut)*u),v);
  },front,12,24));
  if(!c.doorOpen){const door=structurePatch((u,v)=>point((u*2-1)*doorAngle(v*.79),v*.79),front,18,20);door.name='Puerta cerrada';g.add(door);}
  const sill=.035*h;
  const floor=structureMesh(new THREE.BoxGeometry(w*.96,h*.026,d*.96),dark);floor.position.y=sill;g.add(floor);
  g.add(structurePatch((u,v)=>point(u*Math.PI*2,v*.055),dark,48,2));
  // Door piping follows the curved dome surface. The opening remains clear.
  const doorPoints=[];
  for(let j=0;j<=24;j++)doorPoints.push(point(-doorAngle(j/24*.79),j/24*.79));
  for(let j=23;j>=0;j--)doorPoints.push(point(doorAngle(j/24*.79),j/24*.79));
  const pipe=structureTube(doorPoints,Math.min(w,h)*.006,accent);pipe.name='Cremallera frontal';g.add(pipe);
  if(c.doorOpen){const flap=structurePatch((u,v)=>{
    const a=doorAngle(v*.76)+.03+u*.10;const p=point(a,v*.76);p[2]+=.012;return p;
  },front,3,18);flap.name='Puerta recogida';g.add(flap);}
  for(const angle of [Math.PI/4,-Math.PI/4]){
    const arch=[];
    for(let j=0;j<=40;j++){const phi=j/40*Math.PI,t=Math.sin(phi);const p=point(j<=20?angle:angle+Math.PI,t);p[1]+=h*.012;arch.push(p);}
    g.add(structureTube(arch,Math.min(w,h)*.009,pole));
    for(const start of [3,12,25,34])g.add(structureTube(arch.slice(start,start+4),Math.min(w,h)*.014,accent));
  }
  if(c.fly){const cap=structurePatch((u,v)=>{
    const p=point(u*Math.PI*2,.83+v*.17);p[0]*=1.04;p[2]*=1.04;p[1]+=h*.032;return p;
  },cloth,32,8);cap.name='Sobretoldo';g.add(cap);}
  if(c.guyRopes){const rope=fabric('#bdac84');for(const a of [Math.PI/4,3*Math.PI/4,5*Math.PI/4,7*Math.PI/4]){
    const p=point(a,.22),s=point(a,0);s[0]*=1.2;s[2]*=1.2;s[1]=.015;g.add(structureBar(p,s,.008,rope));}}
  return g;
}
function gateSign(text,w,h) {
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#143e3b';ctx.fillRect(0,0,1024,256);ctx.strokeStyle='#e9b570';ctx.lineWidth=8;ctx.strokeRect(16,16,992,224);
  ctx.fillStyle='#f9f0d8';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`800 ${Math.min(144,1400/Math.max(text.length,1))}px sans-serif`;ctx.fillText(text,512,123,920);
  ctx.font='500 24px sans-serif';ctx.fillStyle='#e9b570';ctx.fillText('B I C A M P O R E E',512,213);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  return structureMesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:tex,side:THREE.DoubleSide,roughness:.85}));
}
function gatePennant(w,h,color) {
  const shape=new THREE.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(w/2,-h);shape.lineTo(0,-h*.85);shape.lineTo(-w/2,-h);shape.closePath();
  return structureMesh(new THREE.ShapeGeometry(shape),fabric(color));
}
export function createTimberGate(item) {
  const {w,h,d}=item,c=structureOptions('gate',item.structure),plan=gatePlan(item),g=new THREE.Group();g.name='Pórtico Legado';
  const wood=fabric(item.color),endgrain=fabric(new THREE.Color(item.color).multiplyScalar(.75)),rope=fabric('#d7bc86');
  for(const segment of plan.segments){const m=structureBar(segment.a,segment.b,segment.r,wood);m.name='Madera · '+segment.type;g.add(m);}
  const portal=c.style==='portal',frontZ=portal?d*.36:0;
  // Headboard is above the opening; no ground crossbar obstructs passage.
  const sign=gateSign(item.label||'LEGADO',w*(portal?.58:.76),h*.145);
  if(sign){sign.position.set(0,h*(portal?.735:.78),frontZ+plan.radius*1.2);g.add(sign);}
  if(portal){const triangle=new THREE.Shape();triangle.moveTo(-w*.27,h*.845);triangle.lineTo(0,h*.94);triangle.lineTo(w*.27,h*.845);triangle.closePath();
    const crest=structureMesh(new THREE.ShapeGeometry(triangle),fabric('#275b50'));crest.position.z=frontZ;g.add(crest);
    for(const s of [-1,1])g.add(structureBar([s*w*.14,h*.85,frontZ+.012],[0,h*.91,frontZ+.012],plan.radius*.2,rope));}
  if(c.banners)for(const s of [-1,1]){
    const x=s*w*(portal?.365:.45),top=h*.58,bw=w*(portal?.125:.11),bh=h*.35;
    const banner=gatePennant(bw,bh,s<0?'#da7c3e':'#28685b');banner.position.set(x,top,frontZ+plan.radius*1.3);g.add(banner);
    const chevron=new THREE.Shape();chevron.moveTo(-bw*.30,-bh*.29);chevron.lineTo(0,-bh*.13);chevron.lineTo(bw*.30,-bh*.29);chevron.lineTo(0,-bh*.44);chevron.closePath();
    const emblem=structureMesh(new THREE.ShapeGeometry(chevron),fabric('#f9ead0'));emblem.position.copy(banner.position);emblem.position.z+=.012;g.add(emblem);
  }
  if(c.lashings)for(const x of portal?[-w*.46,-w*.27,w*.27,w*.46]:[-w*.45,w*.45])for(const y of portal?[h*.64,h*.82]:[h*.83]){
    const points=[];for(let j=0;j<=60;j++){const a=j/60*Math.PI*8;points.push([x+Math.cos(a)*plan.radius*1.18,y+(j/60-.5)*plan.radius*2,frontZ+Math.sin(a)*plan.radius*1.18]);}
    g.add(structureTube(points,plan.radius*.10,rope));
  }
  // Small dark end caps make the timber construction legible at close range.
  for(const s of plan.segments.filter(s=>s.type==='post')){const cap=structureMesh(new THREE.CylinderGeometry(s.r*.9,s.r*.9,.01,10),endgrain);cap.position.set(...s.b);g.add(cap);}
  return g;
}
