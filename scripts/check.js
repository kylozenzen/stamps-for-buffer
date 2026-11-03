import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
async function check(dir) {
 for (const entry of await readdir(dir, {withFileTypes:true})) {
  const path = `${dir}/${entry.name}`;
  if (entry.isDirectory()) await check(path);
  else if (path.endsWith('.js')) { const result=spawnSync(process.execPath,['--check',path],{stdio:'inherit'}); if(result.status) process.exit(result.status); }
 }
}
for (const dir of ['server','netlify/functions','scripts','test']) await check(dir);
for(const name of ['demo-data','utils','api','auth','ui','app']){const result=spawnSync(process.execPath,['--check',`js/${name}.js`],{stdio:'inherit'});if(result.status)process.exit(result.status);}
console.log('Active JavaScript syntax checks passed (unused legacy trees excluded).');
