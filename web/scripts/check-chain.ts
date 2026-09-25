import { readFile, writeFile } from 'node:fs/promises';
import { createPublicClient,http, type Abi } from 'viem';
import type { Deployment } from '../src/config';
import {poolKey,poolId,stateAbi} from '../src/protocol';
const d=JSON.parse(await readFile('../dist/imd-deployment.json','utf8')) as Deployment;
const result:{checkedAt:string;broadcastTransactions:number;attempts:unknown[]}={checkedAt:new Date().toISOString(),broadcastTransactions:0,attempts:[]};
for(const rpc of d.network.rpcUrls){
 try{
  const client=createPublicClient({transport:http(rpc,{timeout:12000,retryCount:0})});
  const chainId=await client.getChainId();
  const codes=await Promise.all(d.contracts.map(async c=>({name:c.name,address:c.address,codeBytes:((await client.getCode({address:c.address}))?.length??2)/2-1})));
  const id=poolId(poolKey(d));
  const slot=await client.readContract({address:d.network.uniswapV4.stateView,abi:stateAbi,functionName:'getSlot0',args:[id]});
  const liquidity=await client.readContract({address:d.network.uniswapV4.stateView,abi:stateAbi,functionName:'getLiquidity',args:[id]});
  const c=d.contracts.find(c=>c.name==='JackpotHook')!;
  const abi=JSON.parse(await readFile(`../dist/${c.abiPath}`,'utf8')) as Abi;
  const pots=await client.readContract({address:c.address,abi,functionName:'pots',args:[id]});
  result.attempts.push({rpc,chainId,codes,poolId:id,slot,liquidity,pots});
 }catch(e){result.attempts.push({rpc,error:(e as {shortMessage?:string;message:string}).shortMessage||(e as Error).message});}
}
const json=JSON.stringify(result,(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n';
await writeFile('../docs/frontend/live-chain.json',json);console.log(json);
