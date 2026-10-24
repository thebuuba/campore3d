import { structureOptions, gatePlan } from './structures.js';
const structureField = id => document.getElementById(id);
export function mountStructureFields() {
  const group=document.createElement('fieldset');group.id='structure-fields';group.className='canopy-fields';group.hidden=true;group.disabled=true;
  group.innerHTML=`<legend id="structure-title">Diseño</legend>
    <div id="dome-fields"><p class="subtle">Domo con varillas cruzadas, suelo oscuro y puerta frontal. Medidas editables; no deducidas de la foto.</p>
    <label class="toggle-row"><span>Puerta abierta</span><input id="dome-open" type="checkbox"></label>
    <label class="toggle-row"><span>Sobretoldo superior</span><input id="dome-fly" type="checkbox"></label>
    <label class="toggle-row"><span>Tensores exteriores</span><input id="dome-guys" type="checkbox"></label>
    <label class="field-label">Color de detalles<input id="dome-accent" type="color" value="#ed8b38"></label></div>
    <div id="portal-fields"><label class="field-label">Estilo<select id="portal-style"><option value="portal">Pórtico Legado · torres y frontón</option><option value="simple">Entrada sencilla · menos madera</option></select></label>
    <label class="toggle-row"><span>Estandartes decorativos</span><input id="portal-banners" type="checkbox"></label>
    <label class="toggle-row"><span>Amarres visibles</span><input id="portal-lashings" type="checkbox"></label>
    <p id="portal-opening" class="subtle"></p><p class="subtle">Modelo conceptual. El paso indicado es geométrico, no una certificación de accesibilidad o estabilidad.</p></div>`;
  structureField('focus-item').before(group);
}
export function syncStructureFields(item) {
  const tent=['tentM','tentF'].includes(item.kind),gate=item.kind==='gate',box=structureField('structure-fields');
  box.hidden=box.disabled=!(tent||gate);if(box.hidden)return;
  const c=structureOptions(item.kind,item.structure);
  structureField('dome-fields').hidden=!tent;structureField('portal-fields').hidden=!gate;
  structureField('structure-title').textContent=tent?'Carpa tipo domo':'Entrada Legado';
  if(tent){structureField('dome-open').checked=c.doorOpen;structureField('dome-fly').checked=c.fly;structureField('dome-guys').checked=c.guyRopes;structureField('dome-accent').value=c.accent;}
  else{structureField('portal-style').value=c.style;structureField('portal-banners').checked=c.banners;structureField('portal-lashings').checked=c.lashings;
    const g=gatePlan(item);structureField('portal-opening').textContent=`Paso central aprox. ${g.opening.toFixed(2)} m · altura libre ${g.clearance.toFixed(2)} m. Ancho total incluye las torres.`;}
}
export function readStructureFields(item) {
  if(['tentM','tentF'].includes(item.kind))item.structure={doorOpen:structureField('dome-open').checked,fly:structureField('dome-fly').checked,guyRopes:structureField('dome-guys').checked,accent:structureField('dome-accent').value};
  if(item.kind==='gate')item.structure={style:structureField('portal-style').value,banners:structureField('portal-banners').checked,lashings:structureField('portal-lashings').checked};
}
