import {mkdir,cp,access} from 'node:fs/promises';
try {await access('vendor/three.module.js');}catch{throw new Error('Falta el motor. Ejecuta npm install antes de compilar.');}
await mkdir('dist/site',{recursive:true});
for(const file of ['index.html','src','vendor'])await cp(file,'dist/site/'+file,{recursive:true});
console.log('Sitio estático listo en dist/site. No se ha publicado.');
