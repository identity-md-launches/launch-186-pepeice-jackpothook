import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { keccak256, toBytes } from 'viem';
import { canonical } from '../src/canonical.mjs';
const handoff = JSON.parse(await readFile('deployment/handoff.json','utf8'));
const network = JSON.parse(await readFile('deployment/network.json','utf8'));
if (handoff.chainId !== network.network.chainId || Number(network.walletAddChain.chainId) !== handoff.chainId) throw Error('Chain binding mismatch');
await mkdir('public/abi', {recursive:true});
for (const c of handoff.contracts) {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(c.name)) throw Error('Invalid contract name');
  const raw = execFileSync('git',['show',`${handoff.sourceCommit}:docs/abi/${c.name}.json`],{cwd:'..'});
  const abi = JSON.parse(raw);
  if (!Array.isArray(abi) || keccak256(toBytes(canonical(abi))).slice(2) !== c.abiHash) throw Error(`ABI hash mismatch: ${c.name}`);
  await writeFile(`public/abi/${c.name}.json`,raw);
  console.log(`${c.name}: pinned implementation ABI hash verified`);
}
const manifest = { version:1, launchId:handoff.launchId, chainId:handoff.chainId, sourceCommit:handoff.sourceCommit, attestationHash:handoff.attestationHash,
  contracts:handoff.contracts.map(({name,address,abiHash})=>({name,address,abiHash,abiPath:`abi/${name}.json`})),
  assets:[], network:network.network, walletAddChain:network.walletAddChain, pool:handoff.manifest.pool };
await writeFile('public/imd-deployment.json',JSON.stringify(manifest,null,2)+'\n');
