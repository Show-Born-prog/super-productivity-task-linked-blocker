import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {randomUUID,createHash} from 'node:crypto';
import {readFile,mkdir,mkdtemp} from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;

test('packaged settings fit the installed host index limit and native CSS round-trips without alteration',async()=>{
 const html=await readFile('dist/plugin/index.html','utf8');
 assert.ok(Buffer.byteLength(html,'utf8')<=100000,'oversized settings must never be offered for installation');
 const packed=html.match(/<script id="native-css" type="application\/gzip">([^<]+)<\/script>/);
 assert.ok(packed);assert.equal(gunzipSync(Buffer.from(packed[1],'base64')).toString('utf8'),await readFile('plugin/native/components.css','utf8'));
});

test('renamed distributions retain their IDs and include usable native SVG and Chrome PNG icons',async()=>{
 const name='Task-linked Blocker',plugin=JSON.parse(await readFile('dist/plugin/manifest.json','utf8')),extension=JSON.parse(await readFile('dist/extension/manifest.json','utf8'));
 assert.equal(plugin.name,name);assert.equal(extension.name,'__MSG_product_name__');assert.equal(plugin.id,'super-focus-guard');
 const id=[...createHash('sha256').update(Buffer.from(extension.key,'base64')).digest().subarray(0,16)].flatMap(n=>[n>>4,n&15]).map(n=>String.fromCharCode(97+n)).join('');assert.equal(id,'kjlclkomkeagcfgfjhjlmigdnobdiccp');
 const zip=await readFile('dist/super-focus-guard.zip'),entries=new Map();let offset=0;
 while(zip.readUInt32LE(offset)===0x04034b50){const size=zip.readUInt32LE(offset+18),length=zip.readUInt16LE(offset+26),extra=zip.readUInt16LE(offset+28),start=offset+30+length+extra;entries.set(zip.subarray(offset+30,offset+30+length).toString(),zip.subarray(start,start+size));offset=start+size;}
 const nativeSvg=entries.get(plugin.icon)?.toString()||'';assert.match(nativeSvg,/<svg/);assert.ok(entries.has('NOTICE.txt'),'the reused icon license must ship with the plugin');
 for(const shape of nativeSvg.match(/<(?:circle|path)\b[^>]*>/g)||[])assert.match(shape,/fill="none"/,'host sidebar sets fill on the SVG root; each outline shape must override inherited fill');
 for(const size of [16,32,48,128]){const icon=await readFile('dist/extension/'+extension.icons[size]);assert.equal(icon.subarray(1,4).toString(),'PNG');assert.equal(icon.readUInt32BE(16),size);assert.equal(icon.readUInt32BE(20),size);assert.equal(extension.action.default_icon[size],extension.icons[size]);}
 for(const file of ['dist/plugin/index.html','dist/extension/popup.html','dist/extension/blocked.html']){const html=await readFile(file,'utf8');assert.ok(html.includes(name));assert.doesNotMatch(html,/集中ガード|__PRODUCT_NAME__/);}
});

test('distribution has no warning UI, notification sender or Windows Desktop runtime dependency',async()=>{
 const html=await readFile('dist/plugin/index.html','utf8');
 assert.doesNotMatch(html,/id="(?:warning-style|grace|repeat)"/);
 assert.doesNotMatch(await readFile('dist/plugin/plugin.js','utf8'),/api\.notify\(/);
 const config=JSON.parse(await readFile('dist/bridge/FocusGuard.Bridge.runtimeconfig.json','utf8'));
 assert.equal(config.runtimeOptions.frameworks.some(f=>f.name==='Microsoft.WindowsDesktop.App'),false);
});

test('all distribution components retain the complete appearance and icon license notices',async()=>{
 const appearance=await readFile('plugin/native/NOTICE.txt','utf8'),icon=await readFile('assets/NOTICE.txt','utf8');
 const expected=appearance+'\n---\n\n'+icon;
 for(const component of ['plugin','extension','bridge'])assert.equal(await readFile(`dist/${component}/NOTICE.txt`,'utf8'),expected);
 const html=await readFile('dist/plugin/index.html','utf8');assert.ok(html.includes(appearance));
 const zip=await readFile('dist/super-focus-guard.zip');let offset=0,notice;
 while(zip.readUInt32LE(offset)===0x04034b50){const size=zip.readUInt32LE(offset+18),length=zip.readUInt16LE(offset+26),extra=zip.readUInt16LE(offset+28),start=offset+30+length+extra;
  if(zip.subarray(offset+30,offset+30+length).toString()==='NOTICE.txt')notice=zip.subarray(start,start+size).toString();offset=start+size;}
 assert.equal(notice,expected);
 for(const text of ['Copyright (c) 2018 Johannes Millan','Copyright (c) 2026 Google LLC.','Copyright (c) 2026 Lucide Icons and Contributors'])assert.ok(notice.includes(text));
});

test('packaged plugin initializes, receives actual API-shaped hooks, exposes Japanese UI data and cleans up',async()=>{
 await mkdir('.test-tmp',{recursive:true});const directory=await mkdtemp(path.resolve('.test-tmp/plugin-'));
 const hooks=new Map();const intervals=new Map();let onReady,onUnload,onMessage,header;let index=0;let sharingConflict=false;
 const api={getCurrentLanguage:()=> 'ja',translate:key=>key==='PLUGIN.NAME'?'タスク連動ブロッカー':key,registerHook:(name,fn)=>hooks.set(name,fn),registerHeaderButton:value=>{header=value;},registerConfigHandler:()=>{},
  onMessage:fn=>{onMessage=fn;},onReady:fn=>{onReady=fn;},onUnload:fn=>{onUnload=fn;},
  getTasks:async()=>[{id:'fixture-task',tagIds:['fixture-tag']}],getAllTags:async()=>[{id:'fixture-tag',title:'試験用',icon:'label_outline',color:'#0088aa'}],showSnack:()=>{},
  executeNodeScript:async ({script,args})=>{
   if(script.includes("require('child_process')")) return{success:true,result:true}; // No process launches in this unit test.
   if(args[1]==='state'&&!sharingConflict){sharingConflict=true;return{success:false,error:'EPERM: operation not permitted, rename fixture'};}
   return{success:true,result:await new AsyncFunction('args','require',script)([directory,...args.slice(1)],require)};
  }};
 const code=await readFile('dist/plugin/plugin.js','utf8');
 vm.runInNewContext(code,{PluginAPI:api,URL,crypto:{randomUUID},structuredClone,setTimeout,setInterval:(fn)=>{const id=++index;intervals.set(id,fn);return id;},clearInterval:id=>intervals.delete(id)});
 await onReady();let state=await onMessage({type:'status'});assert.equal(state.status,'unknown');assert.equal(sharingConflict,true);
 assert.equal(header.label,'タスク連動ブロッカー');assert.equal(header.icon,'block');
 assert.equal(await onMessage({type:'locale'}),'ja');assert.equal(state.locale,'ja');
 await hooks.get('languageChange')({newLanguage:'en'});assert.equal((await onMessage({type:'status'})).status,'unknown');assert.equal(intervals.size,0,'language changes must not start tracking or background timers');
 await onMessage({type:'save',rules:[{tagId:'fixture-tag',domains:['youtube.com'],allowSitesEnabled:true,allowedDomains:['music.youtube.com']}]});
 await hooks.get('currentTaskChange')({current:{id:'fixture-task',tagIds:['fixture-tag']},previous:null});
 state=await onMessage({type:'status'});assert.equal(state.status,'tracking');assert.deepEqual(Array.from(state.domains),['youtube.com']);
 assert.equal(state.version,2);assert.deepEqual(Array.from(state.allowedDomains),['music.youtube.com']);
 const stored=JSON.parse(await readFile(path.join(directory,'rules.json'),'utf8'));assert.equal(stored.version,3);assert.deepEqual(stored.rules[0].allowedDomains,['music.youtube.com']);
 assert.equal(state.tags[0].title,'試験用');assert.equal(state.tags[0].icon,'label_outline');assert.equal(state.tags[0].color,'#0088aa');assert.equal(intervals.size,2);
 await hooks.get('action')({action:{type:'[FocusMode] Start Break'}});assert.equal(intervals.size,0,'break has no background polling');
 await hooks.get('action')({action:{type:'[FocusMode] Start Session'}});assert.equal(intervals.size,2);
 await hooks.get('currentTaskChange')({current:null});assert.equal(intervals.size,0,'stop has no background polling');
 onUnload();await new Promise(resolve=>setImmediate(resolve));assert.equal(intervals.size,0);
 assert.equal(JSON.parse(await readFile(path.join(directory,'state.json'),'utf8')).status,'stopped');
});

test('idle initialization, idle reconnect and unconfigured tasks never launch a helper',async()=>{
 let onReady,onUnload,onMessage;let launches=0;let writes=0;const hooks=new Map(),timers=new Map();let sequence=0;
 const api={registerHook:(name,fn)=>hooks.set(name,fn),registerHeaderButton:()=>{},registerConfigHandler:()=>{},
  onReady:fn=>onReady=fn,onUnload:fn=>onUnload=fn,onMessage:fn=>onMessage=fn,getAllTags:async()=>[],showSnack:()=>{},
  executeNodeScript:async({script,args})=>{
   if(script.includes("require('child_process')")){launches++;return{success:true,result:true};}
   if(args[1]==='load')return{success:true,result:[]};
   if(args[1]==='state')writes++;
   return{success:true,result:{browsers:[]}};
  }};
 vm.runInNewContext(await readFile('dist/plugin/plugin.js','utf8'),{PluginAPI:api,URL,crypto:{randomUUID},structuredClone,setTimeout,
  setInterval:fn=>{const id=++sequence;timers.set(id,fn);return id;},clearInterval:id=>timers.delete(id)});
 await onReady();assert.equal(launches,0);assert.equal(timers.size,0);assert.equal(writes,1);
 await onMessage({type:'reconnect'});assert.equal(launches,0);assert.equal(timers.size,0);
 await hooks.get('currentTaskChange')({current:{id:'unconfigured',tagIds:['later']}});
 assert.equal(launches,0);assert.equal(timers.size,1,'only task metadata refresh is needed without rules');
 await onMessage({type:'save',rules:[{tagId:'later',domains:['example.org']}]});assert.equal(launches,1);assert.equal(timers.size,2,'adding active rules starts protection');
 await onMessage({type:'save',rules:[]});assert.equal(timers.size,1,'removing active rules stops the heartbeat');
 await hooks.get('currentTaskChange')({current:null});assert.equal(timers.size,0);onUnload();
});

test('stop and unload during an in-flight launch cannot restore background timers',async()=>{
 const hooks=new Map(),timers=new Map();let onReady,onUnload,finishLaunch,index=0;
 const api={registerHook:(name,fn)=>hooks.set(name,fn),registerHeaderButton:()=>{},registerConfigHandler:()=>{},onMessage:()=>{},
  onReady:fn=>onReady=fn,onUnload:fn=>onUnload=fn,showSnack:()=>{},executeNodeScript:async({script,args})=>{
   if(script.includes("require('child_process')"))return new Promise(resolve=>finishLaunch=()=>resolve({success:true,result:true}));
   if(args[1]==='load')return{success:true,result:[{tagId:'a',domains:['example.org']}]};
   return{success:true,result:{browsers:[]}};
  }};
 vm.runInNewContext(await readFile('dist/plugin/plugin.js','utf8'),{PluginAPI:api,URL,crypto:{randomUUID},structuredClone,setTimeout,
  setInterval:fn=>{const id=++index;timers.set(id,fn);return id;},clearInterval:id=>timers.delete(id)});
 await onReady();const starting=hooks.get('currentTaskChange')({current:{id:'task',tagIds:['a']}});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(typeof finishLaunch,'function');assert.equal(timers.size,2);
 await hooks.get('currentTaskChange')({current:null});assert.equal(timers.size,0);onUnload();finishLaunch();await starting;
 assert.equal(timers.size,0);
});
test('unloading during cold initialization never starts a helper or leaks heartbeat timers',async()=>{
 let onReady,onUnload,completeLoad;let timerCount=0,launches=0;
 const api={registerHook:()=>{},registerHeaderButton:()=>{},registerConfigHandler:()=>{},onMessage:()=>{},
  onReady:fn=>{onReady=fn;},onUnload:fn=>{onUnload=fn;},showSnack:()=>{},
  executeNodeScript:async ({script,args})=>{
   if(script.includes("require('child_process')")){launches++;return{success:true,result:true};}
   if(args[1]==='load')return new Promise(resolve=>{completeLoad=resolve;});
   return{success:true,result:{browsers:[]}};
  }};
 vm.runInNewContext(await readFile('dist/plugin/plugin.js','utf8'),{PluginAPI:api,URL,crypto:{randomUUID},structuredClone,
  setInterval:()=>{timerCount++;},clearInterval:()=>{}});
 const initialization=onReady();await new Promise(resolve=>setImmediate(resolve));onUnload();
 completeLoad({success:true,result:[]});await initialization;await new Promise(resolve=>setImmediate(resolve));
 assert.equal(timerCount,0);assert.equal(launches,0);
});
