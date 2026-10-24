/** Copy the pinned, installed Three.js package. Never download scripts at runtime. */
import {mkdir, copyFile, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
try {
  const pkg=JSON.parse(await readFile(path.join(root,'node_modules/three/package.json'),'utf8'));
  if(pkg.version!=='0.160.1') throw new Error('Versión de Three.js inesperada: '+pkg.version);
  await mkdir(path.join(root,'vendor/controls'),{recursive:true});
  for(const [src,dst] of [['build/three.module.js','three.module.js'],['examples/jsm/controls/OrbitControls.js','controls/OrbitControls.js'],['LICENSE','LICENSE']])
    await copyFile(path.join(root,'node_modules/three',src),path.join(root,'vendor',dst));
  console.log('Motor local listo. Ejecuta npm run dev.');
} catch(e) {console.error('No se pudo preparar Three.js. Ejecuta npm install. '+e.message);process.exitCode=1;}
