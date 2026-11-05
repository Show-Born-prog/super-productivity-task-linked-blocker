// Local appearance review only. No connection to the plugin, rules or helper.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {openSync,readSync,closeSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root=fileURLToPath(new URL('../',import.meta.url));
const asarPath=process.argv[2]||path.join(process.env.LOCALAPPDATA,'Programs/Super Productivity/resources/app.asar');
const handle=openSync(asarPath,'r'),prefix=Buffer.alloc(16);readSync(handle,prefix,0,16,0);
const encodedHeader=Buffer.alloc(prefix.readUInt32LE(12));readSync(handle,encodedHeader,0,encodedHeader.length,16);
const header=JSON.parse(encodedHeader),base=8+prefix.readUInt32LE(4);
const entries=header.files['.tmp'].files['angular-dist'].files.browser.files;
const bytes=entry=>{const result=Buffer.alloc(entry.size);readSync(handle,result,0,result.length,base+Number(entry.offset));return result;};
process.once('exit',()=>closeSync(handle));
const common=Object.entries(entries).find(([name])=>/^styles.*\.css$/.test(name));
if(!common)throw Error('Installed host stylesheet not found');
let taskCss;
for(const [name,entry]of Object.entries(entries)){
  if(!name.endsWith('.js'))continue;
  const source=bytes(entry).toString(),selector=source.indexOf('selectors:[["task"]]');
  if(selector<0)continue;
  const start=source.indexOf('styles:[',selector)+8,quote=source[start];
  let end=start+1;for(;end<source.length;end++){if(source[end]==='\\'){end++;continue;}if(source[end]===quote)break;}
  const literal=source.slice(start,end+1);if(!['"',"'",'`'].includes(quote)||literal.includes('${'))throw Error('Unsupported host CSS literal');
  taskCss=vm.runInNewContext(literal).replaceAll('%COMP%','fg-preview-task');break;
}
if(!taskCss)throw Error('Installed task styles not found');
const routes=new Map([
  ['/identity', ['preview/identity.html','text/html; charset=utf-8']],
  ...['ban.svg','shield-ban.svg','tag-off.svg','LICENSE-lucide.txt','LICENSE-tabler.txt'].map(name=>['/identity-icons/'+name,['preview/identity-icons/'+name,name.endsWith('.svg')?'image/svg+xml':'text/plain; charset=utf-8']]),
  ['/', ['preview/index.html','text/html; charset=utf-8']],
  ['/preview.mjs',['preview/preview.mjs','text/javascript; charset=utf-8']],
  ['/preview.css',['preview/preview.css','text/css; charset=utf-8']],
  ['/native.mjs',['plugin/native.mjs','text/javascript; charset=utf-8']],
  ['/native.css',['plugin/native/components.css','text/css; charset=utf-8']],
]);
const server=http.createServer(async(req,res)=>{
  try{
    if(req.method!=='GET'){res.writeHead(405);res.end();return;}
    const url=new URL(req.url,'http://127.0.0.1:47823');let body,type;
    if(url.pathname==='/host.css'){body=bytes(common[1]);type='text/css; charset=utf-8';}
    else if(url.pathname==='/task.css'){body=taskCss;type='text/css; charset=utf-8';}
    else if(url.pathname.startsWith('/media/')){
      const name=url.pathname.slice(7),entry=entries.media.files[name];
      if(!entry||!/^[\w.-]+\.(woff2?|ttf|otf)$/.test(name)){res.writeHead(404);res.end();return;}
      body=bytes(entry);type=name.endsWith('woff2')?'font/woff2':'font/ttf';
    }else if(routes.has(url.pathname)){
      const [file,mime]=routes.get(url.pathname);body=await readFile(path.join(root,file));type=mime;
    }else{res.writeHead(404);res.end();return;}
    res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);
  }catch{res.writeHead(500);res.end('Preview unavailable');}
});
server.listen(47823,'127.0.0.1',()=>console.log('Appearance preview: http://127.0.0.1:47823/ (Ctrl+C to stop)'));
