import { createDome, createTimberGate } from './structures3d.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { fencePlan } from './core.js';
import { createCanopy } from './canopy3d.js';
/** Optional renderer: failure leaves the independent editable 2D plan available. */
export function createScene(host, callbacks) {
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e9eee3');
  const camera=new THREE.PerspectiveCamera(42,1,.1,2000);
  const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  host.append(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;
  controls.maxPolarAngle=Math.PI/2.025;controls.minDistance=2;controls.maxDistance=900;
  scene.add(new THREE.HemisphereLight(0xffffff,0xb1bba2,2.3));
  const sun=new THREE.DirectionalLight(0xfff2d6,3.2);sun.position.set(-35,60,40);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);sun.shadow.bias=-.0005;sun.shadow.normalBias=.035;scene.add(sun);
  const standard=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.86,...extra});
  const wood=standard('#ad8055');const ropeMat=standard('#b5a480');
  const grassCanvas=document.createElement('canvas');grassCanvas.width=grassCanvas.height=256;
  const gc=grassCanvas.getContext('2d');gc.fillStyle='#c4d1aa';gc.fillRect(0,0,256,256);
  let seed=13;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<10000;i++){gc.fillStyle=i%2?'#82996518':'#ffffdd28';gc.fillRect(random()*256,random()*256,1,1+random()*2);}
  const grassTexture=new THREE.CanvasTexture(grassCanvas);grassTexture.colorSpace=THREE.SRGBColorSpace;
  grassTexture.wrapS=grassTexture.wrapT=THREE.RepeatWrapping;grassTexture.repeat.set(8,10);
  const grass=standard('#ffffff',{map:grassTexture});
  const shared=new Set([wood,ropeMat,grass]);let environment=new THREE.Group();scene.add(environment);
  const objects=new Map();let project,selection=null,helper=null,environmentKey='',cameraReady=false;
  const cube=(w,h,d,mat,x=0,y=h/2,z=0)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;};
  function bar(a,b,r,mat=wood){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),delta=vb.clone().sub(va);
    const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),8),mat);
    m.position.copy(va.add(vb).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());m.castShadow=true;return m;}
  function roof(w,h,d,mat){const verts=[-w/2,0,-d/2,w/2,0,-d/2,0,h,-d/2,-w/2,0,d/2,w/2,0,d/2,0,h,d/2];
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    g.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,1,2,5,1,5,4,0,1,4,0,4,3]);g.computeVertexNormals();
    const m=new THREE.Mesh(g,mat);m.castShadow=true;m.receiveShadow=true;return m;
  }
  function label(text,width=4,height=.9,bg='#f5ebd4',fg='#6f634b'){
    const c=document.createElement('canvas');c.width=768;c.height=192;const ctx=c.getContext('2d');
    ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#d6804a';ctx.fillRect(0,0,c.width,10);
    ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font=`700 ${Math.min(74,Math.floor(1150/Math.max(text.length,1)))}px sans-serif`;ctx.fillText(text,384,103,715);
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),standard('#ffffff',{map:texture,side:THREE.DoubleSide}));
    return mesh;
  }
  function build(i){const {w,h,d,kind}=i,g=new THREE.Group(),cloth=standard(i.color,{side:THREE.DoubleSide});
    if(kind==='tentM'||kind==='tentF'){
      g.add(createDome(i));
    }else if(kind==='kitchen'){
      g.add(createCanopy(i));
    }else if(kind==='bath'){
      g.add(cube(w,h*.86,d,cloth));const r=roof(w,h*.14,d,cloth);r.position.y=h*.86;g.add(r);
      g.add(cube(w*.58,h*.74,.016,standard('#6d939c'),0,h*.37,d/2+.012));
      g.add(bar([0,.07,d/2+.025],[0,h*.72,d/2+.025],.008,ropeMat));
    }else if(kind==='gate'){
      g.add(createTimberGate(i));
    }else if(kind==='exit'){
      for(const x of [-w/2,w/2])g.add(bar([x,0,0],[x,h,0],.12,cloth));
      const sign=label('SALIDA',Math.min(1.5,w*.65),.38,'#6c9074','#ffffff');sign.position.set(-w/2,h*.83,.14);g.add(sign);
    }else if(kind==='post')g.add(cube(w,h,d,cloth));
    else if(kind==='beam')g.add(cube(w,h,d,cloth));
    else if(kind==='bin'){
      const body=new THREE.Mesh(new THREE.CylinderGeometry(w*.5,w*.41,h*.91,16),cloth);body.position.y=h*.455;body.scale.z=d/w;body.castShadow=true;g.add(body);
      const lid=new THREE.Mesh(new THREE.CylinderGeometry(w*.53,w*.53,h*.09,16),standard('#526b58'));lid.position.y=h*.955;lid.scale.z=d/w;g.add(lid);
    }else if(kind==='table'){
      g.add(cube(w,.09,d,cloth,0,h-.045));for(const x of [-1,1])for(const z of [-1,1])g.add(cube(.08,h-.09,.08,wood,x*w*.4,(h-.09)/2,z*d*.37));
    }else if(kind==='tree'){
      g.add(bar([0,0,0],[0,h*.65,0],.12));for(let k=0;k<3;k++){const m=new THREE.Mesh(new THREE.ConeGeometry(w*.5*(1-k*.18),h*.48,7),cloth);m.position.y=h*(.45+k*.14);m.scale.z=d/w;m.castShadow=true;g.add(m);}
    }else if(kind==='flag'){
      g.add(bar([0,0,0],[0,h,0],.045));g.add(cube(w,h*.18,.02,cloth,w*.49,h*.87,0));
    }
    // Dispose an unused unique cloth material in builders which only use shared materials.
    g.userData.cloth=cloth;return g;
  }
  function dispose(group){group.traverse(o=>{o.geometry?.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats)if(m&&!shared.has(m)){m.map?.dispose();m.dispose();}});group.userData.cloth?.dispose();}
  function drawEnvironment(){
    const key=JSON.stringify([project.terrain,project.layout,project.items.filter(i=>['gate','exit'].includes(i.kind))]);
    if(key===environmentKey)return;environmentKey=key;dispose(environment);scene.remove(environment);environment=new THREE.Group();scene.add(environment);
    const {width:W,length:L,fenceHeight:H}=project.terrain;
    environment.add(cube(W,.20,L,grass,0,-.11));
    const pathmat=standard('#e5d9b9');
    environment.add(project.layout==='back'?cube(2.6,.01,L*.78,pathmat,0,.003,L*.11):cube(W,.01,2.6,pathmat,0,.003,0));
    const lineMat=new THREE.LineBasicMaterial({color:'#92a67c',transparent:true,opacity:.22});
    const points=[];for(let x=-W/2;x<=W/2;x+=2)points.push(x,.015,-L/2,x,.015,L/2);
    for(let z=-L/2;z<=L/2;z+=2)points.push(-W/2,.015,z,W/2,.015,z);
    const grid=new THREE.BufferGeometry();grid.setAttribute('position',new THREE.Float32BufferAttribute(points,3));environment.add(new THREE.LineSegments(grid,lineMat));
    const fence=fencePlan(project);
    for(const p of fence.posts)environment.add(bar([p.x,0,p.z],[p.x,H,p.z],.07));
    for(const r of fence.ropes)environment.add(bar([r.a.x,H*.77,r.a.z],[r.b.x,H*.77,r.b.z],.014,ropeMat));
    const size=Math.max(W,L);sun.shadow.camera.left=sun.shadow.camera.bottom=-size*.65;
    sun.shadow.camera.right=sun.shadow.camera.top=size*.65;sun.shadow.camera.far=400;sun.shadow.camera.updateProjectionMatrix();
  }
  function render(p,id){project=p;selection=id;drawEnvironment();const existing=new Set();
    for(const i of p.items){existing.add(i.id);const key=JSON.stringify([i.kind,i.w,i.h,i.d,i.color,i.label,i.canopy,i.structure]);let record=objects.get(i.id);
      if(!record||record.key!==key){if(record){scene.remove(record.group);dispose(record.group);}const group=build(i);group.userData.id=i.id;scene.add(group);record={group,key};objects.set(i.id,record);}
      record.group.position.set(i.x,i.y,i.z);record.group.rotation.y=i.yaw*Math.PI/180;record.group.visible=i.visible;
    }
    for(const [id,record]of objects)if(!existing.has(id)){scene.remove(record.group);dispose(record.group);objects.delete(id);}
    if(helper){scene.remove(helper);helper.geometry.dispose();helper.material.dispose();helper=null;}
    if(objects.has(selection)){helper=new THREE.BoxHelper(objects.get(selection).group,0xd87847);scene.add(helper);}
    if(!cameraReady){fit();cameraReady=true;}
  }
  function fit(mode='3d'){
    if(!project)return;resize();const W=project.terrain.width,L=project.terrain.length;
    const size=Math.max(W,L)*Math.max(1,1/Math.max(.3,camera.aspect));
    controls.target.set(0,0,0);controls.minDistance=2;
    if(mode==='front'){
      const gate=project.items.find(i=>i.kind==='gate');
      if(gate){const a=gate.yaw*Math.PI/180;camera.position.set(gate.x+Math.sin(a)*10,3.2,gate.z+Math.cos(a)*10);
        controls.target.set(gate.x-Math.sin(a)*12,1.4,gate.z-Math.cos(a)*12);
      }else camera.position.set(0,6,L/2+14);
    }else camera.position.set(size*.72,size*.83,size*.92);
    controls.update();renderer.render(scene,camera);
  }
  function focus(id){const i=project?.items.find(v=>v.id===id);if(!i)return;
    resize();const size=Math.max(i.w,i.h,i.d,2)*Math.max(1,1/Math.max(.4,camera.aspect));
    const a=i.yaw*Math.PI/180,dx=size*.95,dz=size*1.5;
    controls.target.set(i.x,i.y+i.h*.42,i.z);camera.position.set(i.x+Math.cos(a)*dx+Math.sin(a)*dz,i.y+size*.85,i.z-Math.sin(a)*dx+Math.cos(a)*dz);controls.update();renderer.render(scene,camera);}
  const ray=new THREE.Raycaster(),mouse=new THREE.Vector2(),plane=new THREE.Plane(),hit=new THREE.Vector3();let drag=null;
  function point(e){const r=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,camera);}
  renderer.domElement.addEventListener('pointerdown',e=>{
    if(e.button!==0||drag)return;point(e);
    const pick=ray.intersectObjects([...objects.values()].filter(r=>r.group.visible).map(r=>r.group),true)[0];
    if(!pick){callbacks.select(null);return;}let root=pick.object;while(root.parent&&!root.userData.id)root=root.parent;
    const i=project.items.find(i=>i.id===root.userData.id);if(!i)return;
    plane.set(new THREE.Vector3(0,1,0),-i.y);if(!ray.ray.intersectPlane(plane,hit))return;
    drag={id:i.id,pointer:e.pointerId,dx:i.x-hit.x,dz:i.z-hit.z};callbacks.select(i.id);controls.enabled=false;
    renderer.domElement.setPointerCapture(e.pointerId);e.preventDefault();e.stopImmediatePropagation();
  },true);
  renderer.domElement.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.pointer)return;point(e);if(ray.ray.intersectPlane(plane,hit))callbacks.drag(drag.id,hit.x+drag.dx,hit.z+drag.dz,false);});
  function end(e){if(!drag||e.pointerId!==drag.pointer)return;callbacks.endDrag();controls.enabled=true;
    if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);drag=null;}
  window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);
  function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  const observer=new ResizeObserver(resize);observer.observe(host);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();renderer.setAnimationLoop(null);callbacks.error(new Error('Se perdió el contexto gráfico. El plano 2D sigue disponible.'));});
  renderer.setAnimationLoop(()=>{if(host.hidden)return;controls.update();helper?.update();renderer.render(scene,camera);});
  return {render,fit,focus,resize,capture(){renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');},
    dispose(){observer.disconnect();renderer.setAnimationLoop(null);controls.dispose();renderer.dispose();window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',end);}};
}
