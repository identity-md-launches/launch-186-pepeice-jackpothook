import { readdir,readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import {keccak256,toBytes} from 'viem';
import {canonical} from '../src/canonical.mjs';
const d=JSON.parse(await readFile('../dist/imd-deployment.json','utf8'));
const h=JSON.parse(await readFile('deployment/handoff.json','utf8'));
const n=JSON.parse(await readFile('deployment/network.json','utf8'));
for(const field of ['version','launchId','chainId','sourceCommit','attestationHash'])assert.deepEqual(d[field],h[field]);
assert.deepEqual(d.network,n.network);assert.deepEqual(d.walletAddChain,n.walletAddChain);assert.deepEqual(d.pool,h.manifest.pool);
assert.deepEqual(d.contracts.map(({abiPath,...rest})=>rest),h.contracts.map(({name,address,abiHash})=>({name,address,abiHash})));
for(const c of d.contracts){assert(!c.abiPath.includes('..'));const abi=JSON.parse(await readFile(`../dist/${c.abiPath}`,'utf8'));assert.equal(keccak256(toBytes(canonical(abi))).slice(2),c.abiHash);}
async function walk(dir,prefix=''){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){assert(!e.isSymbolicLink());if(e.isDirectory())out.push(...await walk(`${dir}/${e.name}`,prefix+e.name+'/'));else if(prefix+e.name!=='imd-deployment.json')out.push(prefix+e.name);}return out.sort();}
assert.deepEqual(d.assets.map(a=>a.path).sort(),await walk('../dist'));assert(d.assets.length<=128);
let bytes=0;for(const a of d.assets){assert(/^[a-zA-Z0-9_./-]+$/.test(a.path)&&!a.path.startsWith('/')&&!a.path.split('/').includes('..'));const b=await readFile(`../dist/${a.path}`);bytes+=b.length;assert(b.length<=8388608);assert.equal(createHash('sha256').update(b).digest('hex'),a.sha256);}
assert(bytes<30*1024*1024);
console.log(`PASS: exact handoff, network, pinned ABI hashes, ${d.assets.length} assets, ${bytes} export bytes.`);
