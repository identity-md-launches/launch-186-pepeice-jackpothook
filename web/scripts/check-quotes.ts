import { readFile,writeFile } from 'node:fs/promises';
import {createPublicClient,http,parseUnits} from 'viem';
import {poolKey,quoterAbi,playerData} from '../src/protocol';
import type {Deployment} from '../src/config';
const d=JSON.parse(await readFile('../dist/imd-deployment.json','utf8')) as Deployment;
const client=createPublicClient({transport:http(d.network.rpcUrls[0],{timeout:12000,retryCount:0})});
const results=[];
for(const [native,amount] of [[true,'0.001'],[true,'0.005'],[true,'0.01'],[false,'100']] as const){try{const quote=await client.simulateContract({address:d.network.uniswapV4.quoter,abi:quoterAbi,functionName:'quoteExactInputSingle',args:[{poolKey:poolKey(d),zeroForOne:native,exactAmount:parseUnits(amount,18),hookData:playerData(d.contracts[0].address)}],account:d.contracts[0].address});results.push({native,amount,result:quote.result});}catch(e){results.push({native,amount,error:(e as {shortMessage?:string}).shortMessage||String(e)});}}
const text=JSON.stringify({checkedAt:new Date().toISOString(),method:'eth_call only',results},(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n';await writeFile('../docs/frontend/live-quotes.json',text);console.log(text);
