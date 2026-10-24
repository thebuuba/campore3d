import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
let failed=false;
for(const dir of ['src','scripts','tests'])for(const file of await readdir(dir))if(/\.(m?js)$/.test(file)){
  const r=spawnSync(process.execPath,['--check',`${dir}/${file}`],{stdio:'inherit'});if(r.status!==0)failed=true;
}
process.exitCode=failed?1:0;if(!failed)console.log('Sintaxis JavaScript válida.');
