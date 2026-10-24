import * as THREE from 'three';
import { canopyOptions, canopyRoof } from './canopy.js';
/** Modular pop-up canopy, not a product replica or structural model. */
export function createCanopy(item) {
  const {w,h,d}=item, cfg=canopyOptions(item.canopy,h), eave=h-cfg.roofRise;
  const group=new THREE.Group();
  const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...extra});
  const cloth=mat(item.color,{side:THREE.DoubleSide});
  const metal=mat('#b9c2c4',{metalness:.65,roughness:.3});
  const plastic=mat('#5c686b');
  const rope=mat('#b1a78d');
  const glass=mat('#b5d3d9',{side:THREE.DoubleSide,transparent:true,opacity:.24,depthWrite:false});
  function box(a,b,c,material,x=0,y=b/2,z=0) {
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(a,b,c),material);mesh.position.set(x,y,z);
    mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
  }
  function rod(a,b,r,material=metal) {
    const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),6),material);
    mesh.position.copy(from.add(to).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    mesh.castShadow=true;return mesh;
  }
  const radius=Math.min(.026,w*.012,d*.012), inset=radius*2;
  for(const sx of [-1,1])for(const sz of [-1,1]) {
    const x=sx*(w/2-inset),z=sz*(d/2-inset);
    group.add(box(radius*2,eave,radius*2,metal,x,eave/2,z));
    group.add(box(radius*2.6,eave*.43,radius*2.6,metal,x,eave*.215,z));
    group.add(box(radius*6,.035,radius*6,plastic,x,.018,z));
    group.add(box(radius*3,.09,radius*3,plastic,x,eave*.45,z));
    group.add(rod([x,eave,z],[0,h-.04,0],radius*.5));
    if(cfg.guyRopes) {
      const anchor=[sx*(w/2+.75),.02,sz*(d/2+.75)];
      group.add(rod([x,eave-.08,z],anchor,.009,rope));
      group.add(rod(anchor,[anchor[0],.14,anchor[2]],.017,metal));
    }
  }
  const positions=canopyRoof(w,d,cfg.roofRise);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
  const roof=new THREE.Mesh(geometry,cloth);roof.position.y=eave;roof.castShadow=true;roof.receiveShadow=true;group.add(roof);
  const valance=Math.min(.2,eave*.1);
  for(const sign of [-1,1]) {
    group.add(box(w,valance,.015,cloth,0,eave-valance/2,sign*d/2));
    group.add(box(.015,valance,d,cloth,sign*w/2,eave-valance/2,0));
  }
  function wall(span,type) {
    const panel=new THREE.Group(),H=eave-valance*.6;
    // Crossed folding braces remain visible from inside an open side.
    const sections=Math.max(1,Math.ceil(span/1.5));
    for(let k=0;k<sections;k++) {
      const a=-span/2+span*k/sections,b=-span/2+span*(k+1)/sections;
      panel.add(rod([a,eave-.1,-.035],[b,eave-.35,-.035],radius*.48));
      panel.add(rod([a,eave-.35,-.035],[b,eave-.1,-.035],radius*.48));
    }
    if(type==='open')return panel;
    if(type==='solid') {panel.add(box(span,H,.012,cloth,0,H/2));return panel;}
    if(type==='door') {
      const doorway=span*.42,side=(span-doorway)/2,doorH=H*.84;
      panel.add(box(side,H,.012,cloth,-span/2+side/2,H/2));
      panel.add(box(side,H,.012,cloth,span/2-side/2,H/2));
      panel.add(box(doorway,H-doorH,.012,cloth,0,(H+doorH)/2));
      panel.add(box(doorway,.075,.07,cloth,0,doorH));return panel;
    }
    // Clear arched window and white pane divisions, cut out of the cloth.
    const winW=span*.73, bottom=H*.29, top=H*.79, arch=H*.10;
    const shape=new THREE.Shape();shape.moveTo(-span/2,0);shape.lineTo(span/2,0);shape.lineTo(span/2,H);shape.lineTo(-span/2,H);shape.closePath();
    const hole=new THREE.Path();hole.moveTo(-winW/2,bottom);hole.lineTo(-winW/2,top);
    hole.quadraticCurveTo(0,top+arch*2,winW/2,top);hole.lineTo(winW/2,bottom);hole.closePath();shape.holes.push(hole);
    const fabric=new THREE.Mesh(new THREE.ShapeGeometry(shape),cloth);fabric.castShadow=true;panel.add(fabric);
    const windowShape=new THREE.Shape();windowShape.moveTo(-winW/2,bottom);windowShape.lineTo(winW/2,bottom);windowShape.lineTo(winW/2,top);windowShape.quadraticCurveTo(0,top+arch*2,-winW/2,top);windowShape.closePath();
    const pane=new THREE.Mesh(new THREE.ShapeGeometry(windowShape),glass);pane.position.z=.003;panel.add(pane);
    for(let k=1;k<6;k++) {const x=-winW/2+winW*k/6,t=k/6,upper=top+4*arch*t*(1-t);
      panel.add(box(.018,upper-bottom,.018,cloth,x,(upper+bottom)/2,.01));}
    for(const y of [bottom,(bottom+top)/2,top])panel.add(box(winW,.018,.018,cloth,0,y,.01));
    return panel;
  }
  for(const [side,span,x,z,angle] of [['front',w,0,d/2,0],['back',w,0,-d/2,Math.PI],['left',d,-w/2,0,-Math.PI/2],['right',d,w/2,0,Math.PI/2]]) {
    const panel=wall(span,cfg.walls[side]);panel.position.set(x,0,z);panel.rotation.y=angle;group.add(panel);
  }
  if(cfg.table) {
    const tw=w*.65,td=d*.25,th=Math.min(.85,eave*.43),tm=mat('#ac8964');
    group.add(box(tw,.06,td,tm,0,th,-d*.16));
    for(const sx of [-1,1])for(const sz of [-1,1])group.add(box(.04,th,.04,metal,sx*tw*.42,th/2,-d*.16+sz*td*.37));
  }
  return group;
}
