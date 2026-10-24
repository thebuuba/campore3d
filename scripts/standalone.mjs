import {readFile,writeFile,mkdir} from 'node:fs/promises';
const strip=source=>source.replace(/^import [\s\S]*?;\n/gm,'').replace(/^export /gm,'');
let html=await readFile('index.html','utf8');
const css=await readFile('src/styles.css','utf8');
const read=async name=>strip(await readFile(`src/${name}.js`,'utf8'));
const engine="import * as THREE from 'three';\nimport {OrbitControls} from 'three/addons/controls/OrbitControls.js';\n"+
  await read('canopy')+'\n'+await read('core')+'\n'+await read('canopy3d')+'\n'+await read('scene3d')+'\nexport {createScene};';
const engineURL='data:text/javascript;base64,'+Buffer.from(engine).toString('base64');
let code='';for(const file of ['canopy','core','icons','plan2d','app'])code+='\n'+await read(file);
code=code.replace("import('./scene3d.js')",`import(${JSON.stringify(engineURL)})`);
html=html.replace('./vendor/three.module.js','https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js')
  .replace('"./vendor/"','"https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/"')
  .replace('<link rel="stylesheet" href="./src/styles.css">',()=>`<style>${css}</style>`)
  .replace('<script type="module" src="./src/app.js"></script>',()=>`<script type="module">${code}</script>`);
await mkdir('dist',{recursive:true});await writeFile('dist/legado-studio.html',html);
console.log('Creado dist/legado-studio.html. El plano es local; solo esta edición portátil utiliza CDN para 3D.');
