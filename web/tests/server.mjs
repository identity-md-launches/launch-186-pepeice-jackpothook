import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('../dist');
createServer(async(req,res)=>{try{let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/ipfs\/test\//,'/');if(path.endsWith('/'))path+='index.html';const file=resolve(root,'.'+path);if(!file.startsWith(root+'/'))throw Error('path');const bytes=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.mp3':'audio/mpeg','.woff2':'font/woff2','.webp':'image/webp'})[extname(file)]||'application/octet-stream');res.end(bytes);}catch{res.writeHead(404);res.end('Not found');}}).listen(4173,'127.0.0.1');
