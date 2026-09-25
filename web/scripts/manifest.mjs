import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
async function walk(dir, prefix='') {
  const out=[];
  for(const e of await readdir(dir,{withFileTypes:true})) {
    const path=prefix+e.name;
    if(e.isSymbolicLink()) throw Error('No symlinks in export');
    if(e.isDirectory()) out.push(...await walk(`${dir}/${e.name}`,`${path}/`));
    else if(path!=='imd-deployment.json') out.push(path);
  }
  return out.sort();
}
const paths=await walk('../dist');
if(paths.length>128) throw Error('Too many assets');
let total=0;
const assets=await Promise.all(paths.map(async path=>{
 const bytes=await readFile(`../dist/${path}`); total+=bytes.length;
 if(bytes.length>8388608) throw Error('Asset too large');
 return {path,sha256:createHash('sha256').update(bytes).digest('hex')};
}));
if(total>30*1024*1024) throw Error('Export body budget exceeded');
const manifest=JSON.parse(await readFile('public/imd-deployment.json','utf8'));
manifest.assets=assets;
await writeFile('../dist/imd-deployment.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Final manifest: ${assets.length} assets; ${total} bytes`);
