import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const publicFiles=new Set(['index.html','style.css','mobile.css','game.js','device-art.js','touch-controls.js','physics.js','physics-core.js','editor.js','puzzle-art.js','level-data.js','levels.js','manifest.json','icon.svg','sw.js']);
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.json':'application/json','.svg':'image/svg+xml','.ttf':'font/ttf'};
http.createServer((req,res)=>{let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400).end();return;}if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}if(file===root)file=path.join(root,'index.html');const relative=path.relative(root,file).replaceAll('\\','/');if(!publicFiles.has(relative)&&!relative.startsWith('assets/')){res.writeHead(404).end('Not found');return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'}).end(data);});}).listen(5173,'0.0.0.0',()=>console.log('CHAIN → http://localhost:5173'));
