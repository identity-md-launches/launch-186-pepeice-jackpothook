import {type Page} from '@playwright/test';
import { readFileSync } from 'node:fs';
import {decodeFunctionData,encodeFunctionResult,encodeEventTopics,encodeAbiParameters,parseAbiParameters,toHex,type Hex,type Address,type Abi} from 'viem';
import {poolId,poolKey,quoterAbi,routerAbi,permitAbi,stateAbi,rollFor} from '../src/protocol';
import type {Deployment} from '../src/config';
export const d=JSON.parse(readFileSync('../dist/imd-deployment.json','utf8')) as Deployment;
export const player='0x0000000000000000000000000000000000001234' as Address;
const token=d.contracts.find(c=>c.name==='PepeIce')!;const hook=d.contracts.find(c=>c.name==='JackpotHook')!;
const tokenAbi=JSON.parse(readFileSync(`../dist/${token.abiPath}`,'utf8')) as Abi;const hookAbi=JSON.parse(readFileSync(`../dist/${hook.abiPath}`,'utf8')) as Abi;
const id=poolId(poolKey(d));
export async function fixture(page:Page,{wallet=true,wrong=false,poor=false,roll=77,missingCode=false}={}){
 const calls:{method:string;params:unknown[]}[]=[];const sent:{address:string;functionName:string;args:readonly unknown[];value:bigint}[]=[];
 let block=100n;let hashSeed=0n;while(rollFor(toHex(hashSeed,{size:32}),id,0n)!==roll)hashSeed++;
 const futureHash=toHex(hashSeed,{size:32});let ticket=false;let drawn=false;let permit=0n;let allowance=0n;let tankAllowance=0n;let tank=0n;
 let ice=poor?0n:100000n*10n**18n;let eth=poor?0n:10n**18n;let reject=false;let revert=false;let dropLogs=false;
 const receipts=new Map<string,unknown>();
 function log(eventName:string,args:Record<string,unknown>,data:Hex,hash:Hex){return {address:hook.address,topics:encodeEventTopics({abi:hookAbi,eventName,args}),data,blockNumber:'0x64',blockHash:toHex(100,{size:32}),transactionHash:hash,transactionIndex:'0x0',logIndex:'0x0',removed:false};}
 const rpc=async(method:string,params:unknown[]=[]):Promise<unknown>=>{
  calls.push({method,params});
  if(method==='eth_chainId')return toHex(d.chainId);
  if(method==='eth_blockNumber')return toHex(block);
  if(method==='eth_getCode')return missingCode?'0x':'0x60006000';
  if(method==='eth_getBalance')return toHex(eth);
  if(method==='eth_getTransactionReceipt')return receipts.get(params[0] as string)||null;
  if(method==='eth_getBlockByNumber')return {number:toHex(block),hash:futureHash,parentHash:toHex(0,{size:32}),timestamp:toHex(Math.floor(Date.now()/1000)),gasLimit:'0x1c9c380',gasUsed:'0x0',baseFeePerGas:'0x1',transactions:[],miner:player,difficulty:'0x0',extraData:'0x',nonce:'0x0000000000000000',size:'0x0',transactionsRoot:toHex(0,{size:32}),stateRoot:toHex(0,{size:32}),receiptsRoot:toHex(0,{size:32}),logsBloom:toHex(0,{size:256}),sha3Uncles:toHex(0,{size:32}),uncles:[]};
  if(method==='eth_getLogs')return ticket?[log('TicketIssued',{poolId:id,ticketId:0n,player},encodeAbiParameters(parseAbiParameters('address,uint256,uint256'),[token.address,10n**18n,100n]),toHex(1000,{size:32}))]:[];
  if(method==='eth_call'||method==='eth_sendTransaction'){
   const tx=params[0] as {to:Address;data:Hex;value?:Hex};const address=tx.to.toLowerCase();
   const abi=address===token.address?tokenAbi:address===hook.address?hookAbi:address===d.network.uniswapV4.quoter?quoterAbi:address===d.network.uniswapV4.stateView?stateAbi:address===d.network.uniswapV4.permit2?permitAbi:routerAbi;
   const decoded=decodeFunctionData({abi,data:tx.data});const fn=decoded.functionName;const args=decoded.args||[];
   if(method==='eth_sendTransaction'){
    if(reject)throw {code:4001,message:'User rejected the request'};
    sent.push({address,functionName:fn,args,value:BigInt(tx.value||0)});const hash=toHex(1000+sent.length,{size:32});let logs:unknown[]=[];
    if(fn==='approve'&&address===token.address){if((args[0] as string).toLowerCase()===hook.address)tankAllowance=args[1] as bigint;else allowance=args[1] as bigint;}
    if(fn==='approve'&&address===d.network.uniswapV4.permit2)permit=args[2] as bigint;
    if(fn==='fillTank'){tank+=args[1] as bigint;ice-=(args[1] as bigint)*10n**19n;logs=[log('TankFilled',{poolId:id,player},encodeAbiParameters(parseAbiParameters('uint256'),[args[1] as bigint]),hash)];}
    if(fn==='execute'){ticket=true;logs=[log('TicketIssued',{poolId:id,ticketId:0n,player},encodeAbiParameters(parseAbiParameters('address,uint256,uint256'),[token.address,10n**18n,100n]),hash)];}
    if(fn==='draw'){drawn=true;logs=[log('Drawn',{poolId:id,ticketId:0n,player},encodeAbiParameters(parseAbiParameters('uint256,uint256,uint256'),[BigInt(roll),9n*10n**15n,2250n*10n**18n]),hash)];}
    if(dropLogs)logs=[];
    receipts.set(hash,{transactionHash:hash,transactionIndex:'0x0',blockHash:toHex(100,{size:32}),blockNumber:'0x64',from:player,to:address,cumulativeGasUsed:'0x10000',gasUsed:'0x10000',contractAddress:null,logs,logsBloom:toHex(0,{size:256}),status:'0x1',effectiveGasPrice:'0x1',type:'0x2'});return hash;
   }
   if(revert&&fn==='execute')throw {code:3,message:'execution reverted: SlippageTooHigh'};
   const results:Record<string,unknown>={poolManager:d.network.uniswapV4.poolManager,decimals:18,balanceOf:ice,ICE_PER_PEE:10n**19n,pots:[10n**16n,(2500n+tank*10n)*10n**18n],getSlot0:[1000n*2n**96n,138162,0,3000],getLiquidity:10n**22n,quoteExactInputSingle:[(args[0] as {zeroForOne:boolean})?.zeroForOne?980n*10n**18n:98000000000000n,180000n],ticket:{player,currency:token.address,fee:10n**18n,blockNumber:100n,drawn},nextTicketId:ticket?1n:0n};
   if(fn==='allowance')results.allowance=address===token.address?((args[1] as string).toLowerCase()===hook.address?tankAllowance:allowance):[permit,Math.floor(Date.now()/1000)+3600,0];
   if(fn==='approve'&&address===token.address)results.approve=true;
   return encodeFunctionResult({abi,functionName:fn,result:results[fn]});
  }
  throw {code:-32601,message:`Unmocked RPC: ${method}`};
 };
 await page.route(/https:\/\/(ethereum-sepolia-rpc\.publicnode\.com|rpc\.sepolia\.ethpandaops\.io|sepolia\.rpc\.sentio\.xyz)/,async route=>{
  const body=route.request().postDataJSON();
  const respond=async(req:{method:string;params:unknown[];id:number})=>{try{return {jsonrpc:'2.0',id:req.id,result:await rpc(req.method,req.params)};}catch(error){return {jsonrpc:'2.0',id:req.id,error};}};
  const result=Array.isArray(body)?await Promise.all(body.map(respond)):await respond(body);
  await route.fulfill({contentType:'application/json',body:JSON.stringify(result)});
 });
 if(wallet)await page.addInitScript(({player,chain,wrong,rpcUrl})=>{
  let chainId=wrong?'0x1':chain;let added=!wrong;let connected=false;const listeners:Record<string,((value:unknown)=>void)[]>={};
  const provider={isMetaMask:true,on:(name:string,fn:(value:unknown)=>void)=>{(listeners[name]??=[]).push(fn);},removeListener:(name:string,fn:(value:unknown)=>void)=>{listeners[name]=(listeners[name]||[]).filter(f=>f!==fn);},request:async({method,params}:{method:string;params?:unknown[]})=>{
   if(method==='eth_chainId')return chainId;
   if(method==='eth_requestAccounts'){connected=true;return [player];}
   if(method==='eth_accounts')return connected?[player]:[];
   if(method==='wallet_switchEthereumChain'){if(!added)throw {code:4902,message:'Unknown chain'};chainId=chain;(listeners.chainChanged||[]).forEach(fn=>fn(chainId));return null;}
   if(method==='wallet_addEthereumChain'){(window as unknown as {addedChain:unknown}).addedChain=params?.[0];added=true;return null;}
   if(method==='wallet_watchAsset')return true;
   if(method==='wallet_requestPermissions')return [{parentCapability:'eth_accounts'}];
   const r=await fetch(rpcUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});const body=await r.json();if(body.error)throw body.error;return body.result;
  }};
  Object.defineProperty(window,'ethereum',{value:provider});
 },{player,chain:toHex(d.chainId),wrong,rpcUrl:d.network.rpcUrls[0]});
 return {calls,sent,get tank(){return tank;},setBlock:(n:bigint)=>{block=n;},reject:()=>{reject=true;},revert:()=>{revert=true;},dropLogs:()=>{dropLogs=true;}};
}
