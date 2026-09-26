import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { keccak256, toBytes } from 'viem';
import { canonical } from '../src/canonical.mjs';
import { POOL, walletAddChain } from '../src/chain.mjs';
import assert from 'node:assert/strict';
const handoff = JSON.parse(await readFile('deployment/handoff.json','utf8'));
const network = JSON.parse(await readFile('deployment/network.json','utf8'));
if (handoff.chainId !== network.network.chainId) throw Error('Chain binding mismatch');
if (network.walletAddChain) assert.deepEqual(walletAddChain(network.network), network.walletAddChain, 'Derived wallet chain differs from the platform network file');
for (const field of ['pairedCurrency','fee','tickSpacing']) assert.equal(String(handoff.manifest.pool[field]).toLowerCase(), String(POOL[field]).toLowerCase(), `Pool ${field} differs from the deployed launch`);
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
  assets:[], network:network.network };
await writeFile('public/imd-deployment.json',JSON.stringify(manifest,null,2)+'\n');
