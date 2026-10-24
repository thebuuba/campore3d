import { mountStructureFields, syncStructureFields, readStructureFields } from './structures-ui.js';
import { WALL_SIDES, WALL_TYPES } from './canopy.js';
import { CATALOG, createProject, createItem, validateProject, arrangeProject, setSecondaryExit,
  copy, clamp, warnings, inventory, createHistory } from './core.js';
import { icon, fillIcons } from './icons.js';
import { createPlan } from './plan2d.js';
const $=id=>document.getElementById(id), KEY='legado-studio-v1';
fillIcons();
mountStructureFields();
const wallNames={open:'Abierto', solid:'Cerrado', window:'Con ventana', door:'Con puerta'};
for(const side of WALL_SIDES) for(const type of WALL_TYPES) {const opt=document.createElement('option');opt.value=type;opt.textContent=wallNames[type];$('wall-'+side).append(opt);}
let project=createProject(),startupWarning='';
try {const saved=localStorage.getItem(KEY);if(saved)project=validateProject(JSON.parse(saved));}
catch{startupWarning='No se pudo leer el guardado local. El ejemplo sigue disponible.';}
const history=createHistory(project);
let selected=null,category='camp',engine=null,view='2d',dragStart=null,toastTimer,engineError=null;
let userChoseView=false,loading=true;
const format=n=>new Intl.NumberFormat('es-DO',{maximumFractionDigits:1}).format(n);
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(project));$('save-status').textContent='Guardado local · solo en este navegador';return true;}
  catch{$('save-status').textContent='Sin guardar · exporta una copia JSON';return false;}}
function setProject(next,{record=true}={}){project=validateProject(next);if(record)history.commit(project);
  if(selected&&!project.items.some(i=>i.id===selected))selected=null;persist();render();}
function mutate(fn){const p=copy(project);fn(p);setProject(p);}
function choose(id){selected=id;renderSelection();renderView();renderList();}
function drag(id,x,z){if(!dragStart)dragStart=copy(project);const i=project.items.find(i=>i.id===id);if(!i)return;
  const snap=$('snap').checked;const value=v=>clamp(snap?Math.round(v*2)/2:v,-500,500);
  i.x=value(x);i.z=value(z);renderView();renderSelection();}
function endDrag(){if(!dragStart)return;const next=copy(project);dragStart=null;setProject(next);}
const callbacks={select:choose,drag,endDrag,error:err=>{engineError=err;engine=null;showView('2d');showEngineError();}};
const plan=createPlan($('plan2d'),callbacks);
function renderCatalog(){const host=$('catalog');host.replaceChildren();for(const[k,v]of Object.entries(CATALOG)){
  if(v.category!==category)continue;const button=document.createElement('button');button.className='piece';button.dataset.kind=k;button.style.setProperty('--piece',k==='kitchen'?'#8a9c91':v.color);
  button.innerHTML=`<span class="piece-icon">${icon(v.icon)}</span><span>${v.name}</span><small>${v.w} × ${v.d} m</small><span class="add-mark">+</span>`;
  button.addEventListener('click',()=>{if(project.items.length>=500)return toast('Límite de 500 piezas por proyecto.');const i=createItem(k);selected=i.id;
    mutate(p=>{p.items.push(i);p.secondaryExit=p.items.some(a=>a.kind==='exit');});toast(`${v.name} añadido al centro. Arrástralo para colocarlo.`);});host.append(button);
}}
function renderView(){plan.render(project,selected);engine?.render(project,selected);}
function renderSelection(){const i=project.items.find(i=>i.id===selected);$('empty-selection').hidden=!!i;$('item-form').hidden=!i;if(!i)return;
  $('selected-icon').innerHTML=icon(CATALOG[i.kind].icon);$('selected-kind').textContent=CATALOG[i.kind].name;
  for(const field of ['name','x','y','z','w','h','d','yaw','color','label'])$('item-'+field).value=typeof i[field]==='number'?Number(i[field].toFixed(3)):i[field];
  $('gate-label-field').hidden=i.kind!=='gate';
  syncStructureFields(i);
  $('canopy-fields').hidden=i.kind!=='kitchen';$('canopy-fields').disabled=i.kind!=='kitchen';
  if(i.kind==='kitchen') {for(const side of WALL_SIDES)$('wall-'+side).value=i.canopy.walls[side];
    $('canopy-rise').value=i.canopy.roofRise;$('canopy-rise').required=true;
    $('canopy-ropes').checked=i.canopy.guyRopes;$('canopy-table').checked=i.canopy.table;}
  else $('canopy-rise').required=false;
}
function renderList(){const list=$('scene-list');list.replaceChildren();$('object-count').textContent=project.items.length;
  for(const i of project.items){const b=document.createElement('button');b.className='scene-object'+(i.id===selected?' selected':'');b.dataset.id=i.id;
    b.innerHTML=icon(CATALOG[i.kind].icon);const text=document.createElement('span');text.textContent=i.name;b.append(text);b.addEventListener('click',()=>choose(i.id));list.append(b);}
}
function inventoryRows(){const inv=inventory(project);return [
  ['Superficie del campo',format(inv.area)+' m²'],['Postes de madera + perímetro',String(inv.poles)],
  ['Madera geométrica¹',format(inv.wood)+' m'],['Soga de perímetro¹',format(inv.rope)+' m'],
  ['Toldos metálicos (kits)',String(inv.canopies.kits)],['Patas metálicas (incluidas)',String(inv.canopies.legs)],
  ['Paneles de lona',String(inv.canopies.wallPanels)],['Paneles con ventana (incluidos)',String(inv.canopies.windowPanels)],
  ['Cuerdas tensoras del toldo',String(inv.canopies.guyRopes)],['Mesas interiores',String(inv.canopies.tables)],
  ...Object.entries(inv.count).map(([kind,n])=>[CATALOG[kind].name,String(n)]) ];}
function renderInventory(){const host=$('inventory');host.replaceChildren();for(const[label,value]of inventoryRows()){
  const row=document.createElement('div');row.className='inventory-row';const span=document.createElement('span'),strong=document.createElement('strong');span.textContent=label;strong.textContent=value;row.append(span,strong);host.append(row);}}
function render(){
  $('project-name').value=project.name;$('terrain-w').value=project.terrain.width;$('terrain-l').value=project.terrain.length;
  $('fence-gap').value=project.terrain.fenceSpacing;$('fence-height').value=project.terrain.fenceHeight;
  $('layout').value=project.layout;$('secondary-exit').checked=project.secondaryExit;
  $('undo').disabled=!history.canUndo;$('redo').disabled=!history.canRedo;
  $('area-label').textContent=`${project.terrain.width} × ${project.terrain.length} m · ${format(project.terrain.width*project.terrain.length)} m²`;
  const tents=project.items.filter(i=>['tentM','tentF'].includes(i.kind)).length;
  $('count-label').textContent=`${tents} carpas · ${project.items.length} piezas`;
  const issues=warnings(project);$('warnings-btn').textContent=issues.length?`${issues.length} revisiones pendientes`:'Sin cruces detectados · revisar diseño';
  $('warnings-btn').style.color=issues.length?'#b07938':'';
  renderSelection();renderList();renderInventory();renderView();
}
function showView(mode){
  if(mode!=='2d'&&!engine){toast(loading?'El motor 3D todavía está cargando. Puedes usar el plano.':'El 3D no está disponible; el plano sigue siendo editable.');return;}
  view=mode;$('canvas3d').hidden=mode==='2d';$('plan2d').hidden=mode!=='2d';
  for(const id of ['view2d','view3d','viewfront'])$(id).classList.toggle('active',id==='view'+mode);
  if(mode!=='2d'){engine.render(project,selected);engine.resize();engine.fit(mode==='front'?'front':'3d');}
  $('interaction-hint').textContent=mode==='2d'?'Arrastra piezas · Rueda: zoom · Fondo: desplazar · R: girar':'Arrastra el fondo: orbitar · Rueda: zoom · Arrastra piezas: mover';
}
function showEngineError(){loading=false;$('engine-status').textContent='Plano 2D · sin motor 3D';$('viewer-message').hidden=false;
  $('viewer-message').textContent='El 3D no cargó. Puedes seguir diseñando en este plano. Ejecuta «npm install» en la carpeta del proyecto y vuelve a abrirlo con «npm run dev». El plano funciona sin el motor.';
}
function download(blob,name){const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function undo(){project=history.undo();if(!project.items.some(i=>i.id===selected))selected=null;persist();render();}
function redo(){project=history.redo();if(!project.items.some(i=>i.id===selected))selected=null;persist();render();}
function duplicate(){const i=project.items.find(i=>i.id===selected);if(!i)return;if(project.items.length>=500)return toast('Límite de 500 piezas.');
  const v=createItem(i.kind,{...i,id:createItem(i.kind).id,name:i.name+' · copia',x:i.x+2,z:i.z+2});selected=v.id;mutate(p=>p.items.push(v));}
function remove(){if(!selected)return;const id=selected;selected=null;mutate(p=>{p.items=p.items.filter(i=>i.id!==id);p.secondaryExit=p.items.some(i=>i.kind==='exit');});}
$('undo').onclick=undo;$('redo').onclick=redo;$('duplicate').onclick=duplicate;$('remove').onclick=remove;
$('project-name').onchange=()=>mutate(p=>p.name=$('project-name').value.trim()||'Campamento Legado');
$('save').onclick=()=>toast(persist()?'Guardado en este navegador. Exporta JSON para tener una copia independiente.':'No se pudo guardar localmente. Usa Exportar proyecto.');
$('export').onclick=()=>download(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),'legado-studio-proyecto.json');
$('import-btn').onclick=()=>$('import').click();
$('import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{
  if(file.size>2_000_000)throw new Error('El proyecto supera 2 MB.');const next=validateProject(JSON.parse(await file.text()));
  if(confirm('¿Abrir este proyecto? Podrás recuperar el actual con Deshacer.')){selected=null;setProject(next);plan.fit();engine?.fit();toast('Proyecto abierto.');}
}catch(err){toast('No se pudo abrir: '+err.message);}finally{e.target.value='';}};
$('resize').onclick=()=>{try{mutate(p=>{p.terrain.width=Number($('terrain-w').value);p.terrain.length=Number($('terrain-l').value);});plan.fit();engine?.fit();toast('Terreno actualizado. Las piezas conservan su tamaño y posición; revisa los límites.');}catch(err){toast(err.message);}};
$('fence-apply').onclick=()=>{try{mutate(p=>{p.terrain.fenceSpacing=Number($('fence-gap').value);p.terrain.fenceHeight=Number($('fence-height').value);});}catch(err){toast(err.message);}};
$('arrange').onclick=()=>{if(confirm('¿Reemplazar la distribución por el ejemplo? Podrás deshacer este cambio.')){
  const p=copy(project);p.layout=$('layout').value;selected=null;setProject(arrangeProject(p));plan.fit();engine?.fit();toast('Distribución adaptada. Revisa pasillos, límites y separaciones.');}};
$('secondary-exit').onchange=()=>setProject(setSecondaryExit(project,$('secondary-exit').checked));
$('item-form').onsubmit=e=>{e.preventDefault();try{mutate(p=>{const i=p.items.find(i=>i.id===selected);if(!i)return;
  for(const field of ['x','y','z','w','h','d','yaw'])i[field]=Number($('item-'+field).value);
  i.name=$('item-name').value.trim()||CATALOG[i.kind].name;i.color=$('item-color').value;i.label=$('item-label').value;
  readStructureFields(i);
  if(i.kind==='kitchen')i.canopy={roofRise:Number($('canopy-rise').value), walls:Object.fromEntries(WALL_SIDES.map(side=>[side,$('wall-'+side).value])), guyRopes:$('canopy-ropes').checked, table:$('canopy-table').checked};
});toast('Pieza actualizada.');}catch(err){toast(err.message);}};
$('focus-item').onclick=()=>{if(!selected)return;if(view==='2d')plan.focus(selected);else engine?.focus(selected);};
$('select-gate').onclick=()=>{const gate=project.items.find(i=>i.kind==='gate');if(gate)choose(gate.id);else toast('Agrega una entrada desde la biblioteca Estructuras.');};
for(const button of document.querySelectorAll('[data-category]'))button.onclick=()=>{category=button.dataset.category;document.querySelectorAll('[data-category]').forEach(b=>b.classList.toggle('active',b===button));renderCatalog();};
for(const button of document.querySelectorAll('[data-inspector]'))button.onclick=()=>{const materials=button.dataset.inspector==='materials';$('properties-view').hidden=materials;$('materials-view').hidden=!materials;document.querySelectorAll('[data-inspector]').forEach(b=>b.classList.toggle('active',b===button));};
$('view2d').onclick=()=>{userChoseView=true;showView('2d');};$('view3d').onclick=()=>{userChoseView=true;showView('3d');};$('viewfront').onclick=()=>{userChoseView=true;showView('front');};
$('fit').onclick=()=>view==='2d'?plan.fit():engine?.fit(view);
$('capture').onclick=async()=>{try{const data=view==='2d'?await plan.capture():engine.capture();const a=document.createElement('a');a.href=data;a.download='legado-studio-vista.png';a.click();toast('Imagen exportada.');}catch(err){toast('No se pudo exportar la imagen: '+err.message);}};
$('export-materials').onclick=()=>{const cell=s=>'"'+String(s).replaceAll('"','""')+'"';
  const rows=[['Elemento','Cantidad aproximada'],...inventoryRows(),['¹ Alcance','Longitudes geométricas. No incluyen amarres, enterramiento, refuerzos ni desperdicio. No es un cálculo estructural.']];
  download(new Blob(['\uFEFF'+rows.map(r=>r.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}),'legado-inventario-conceptual.csv');};
$('warnings-btn').onclick=()=>{const list=$('warnings-list');list.replaceChildren();const issues=warnings(project);
  for(const issue of issues){const div=document.createElement('div');div.className='warning-row';div.textContent=issue.text;list.append(div);}
  if(!issues.length){const div=document.createElement('div');div.className='ok-row';div.textContent='No se detectaron cruces geométricos ni piezas fuera de límites. Esto no certifica la seguridad del campamento.';list.append(div);}
  $('warnings-dialog').showModal();};$('close-dialog').onclick=()=>$('warnings-dialog').close();
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)||document.activeElement.isContentEditable||$('warnings-dialog').open)return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){e.preventDefault();duplicate();}
  else if(e.key==='Delete'&&selected){e.preventDefault();remove();}
  else if(e.key.toLowerCase()==='r'&&selected)mutate(p=>{const i=p.items.find(i=>i.id===selected);i.yaw=(i.yaw+15)%360;});
  else if(e.key==='Escape')choose(null);
});
renderCatalog();render();showView('2d');if(startupWarning)toast(startupWarning);
// Start with a fully functional 2D editor, then progressively enable Three.js.
const loadingNotice=setTimeout(()=>{if(loading){$('engine-status').textContent='Plano listo · esperando 3D';$('viewer-message').hidden=false;$('viewer-message').textContent='El motor 3D tarda en cargar. Mientras tanto, este plano es editable.';}},8000);
import('./scene3d.js').then(({createScene})=>{
  engine=createScene($('canvas3d'),callbacks);engine.render(project,selected);loading=false;clearTimeout(loadingNotice);
  $('engine-status').textContent='Motor 3D listo';$('viewer-message').hidden=true;if(!userChoseView)showView('3d');
}).catch(err=>{clearTimeout(loadingNotice);engineError=err;console.warn('Motor 3D no disponible:',err.message);showEngineError();});
