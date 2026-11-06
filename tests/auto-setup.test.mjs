import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {SETUP_SCRIPT,LAUNCH_SCRIPT,createTransport} from '../plugin/transport.mjs';
const require=createRequire(import.meta.url),AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const id='kjlclkomkeagcfgfjhjlmigdnobdiccp',key='fixture-public-key';
function fixture(){
 fs.mkdirSync('.test-tmp',{recursive:true});const home=fs.mkdtempSync(path.resolve('.test-tmp/auto-setup-'));
 const directory=path.join(home,'.task-linked-blocker/runtime'),folder=path.join(home,'展開先 空白/extension');
 fs.mkdirSync(path.join(folder,'bridge'),{recursive:true});fs.writeFileSync(path.join(folder,'bridge/FocusGuard.Bridge.exe'),'fixture');
 fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify({key,manifest_version:3,background:{service_worker:'worker.mjs'}}));
 const prefs=(browser='Google/Chrome',profile='Default',value=folder)=>{
  const target=path.join(home,'AppData/Local',browser,'User Data',profile);fs.mkdirSync(target,{recursive:true});
  fs.writeFileSync(path.join(target,'Secure Preferences'),JSON.stringify({unrelated:'private fixture value',extensions:{settings:{[id]:{path:value}}}}));
 };
 const reads=[];const modules=name=>name==='child_process'?assert.fail('setup must not launch the helper'):name==='os'?{homedir:()=>home}:name==='fs'?new Proxy(fs,{get(target,property){if(property==='readFileSync')return(file,...args)=>{reads.push(file);return fs.readFileSync(file,...args);};return target[property];}}):require(name);
 const setup=force=>new AsyncFunction('args','require',SETUP_SCRIPT)([directory,id,key,null,!!force],modules);
 return{home,directory,folder,prefs,setup,reads,registration:path.join(directory,'../installation.json')};
}
test('enable-time setup discovers only this extension and records its helper without starting a process or changing rules',async()=>{
 const f=fixture();f.prefs();fs.mkdirSync(f.directory,{recursive:true});const rules='[{"tagId":"keep","domains":["example.org"]}]';fs.writeFileSync(path.join(f.directory,'rules.json'),rules);
 assert.equal(await f.setup(true),true);assert.deepEqual(JSON.parse(fs.readFileSync(f.registration,'utf8')),{version:1,executable:path.join(f.folder,'bridge/FocusGuard.Bridge.exe')});
 assert.equal(fs.readFileSync(path.join(f.directory,'rules.json'),'utf8'),rules);assert.doesNotMatch(fs.readFileSync(f.registration,'utf8'),/private fixture|unrelated/);
 f.reads.length=0;const before=fs.statSync(f.registration).mtimeMs;assert.equal(await f.setup(false),true);assert.equal(fs.statSync(f.registration).mtimeMs,before);assert.ok(f.reads.every(file=>!file.endsWith('Secure Preferences')),'normal task starts reuse the registration');
});
test('missing extension is retried automatically after loading it and invalid unrelated locations are not accepted',async()=>{
 const f=fixture();assert.equal(await f.setup(true),false);assert.equal(fs.existsSync(f.registration),false);
 f.prefs();fs.writeFileSync(path.join(f.folder,'manifest.json'),JSON.stringify({key:'other-extension',manifest_version:3,background:{service_worker:'worker.mjs'}}));
 assert.equal(await f.setup(true),false);assert.equal(fs.existsSync(f.registration),false);
 fs.writeFileSync(path.join(f.folder,'manifest.json'),JSON.stringify({key,manifest_version:3,background:{service_worker:'worker.mjs'}}));
 assert.equal(await f.setup(false),true);
});
test('Edge and numbered profiles can provide the location; active protection is never repointed',async()=>{
 const f=fixture();f.prefs('Microsoft/Edge','Profile 2');assert.equal(await f.setup(true),true);
 const old=path.join(f.home,'old/FocusGuard.Bridge.exe');fs.mkdirSync(path.dirname(old),{recursive:true});fs.writeFileSync(old,'fixture');fs.writeFileSync(f.registration,JSON.stringify({version:1,executable:old}));
 fs.writeFileSync(path.join(f.directory,'bridge-status.json'),JSON.stringify({updatedAt:Date.now()}));
 assert.equal(await f.setup(true),true);assert.equal(JSON.parse(fs.readFileSync(f.registration,'utf8')).executable,old);
 fs.writeFileSync(path.join(f.directory,'bridge-status.json'),JSON.stringify({updatedAt:1}));assert.equal(await f.setup(true),true);assert.equal(JSON.parse(fs.readFileSync(f.registration,'utf8')).executable,path.join(f.folder,'bridge/FocusGuard.Bridge.exe'));
});

test('successful initialization adds no setup calls on task starts; a launch failure allows rediscovery',async()=>{
 let setups=0,launches=0,fail=false;
 const transport=createTransport({executeNodeScript:async({script})=>{
  if(script===SETUP_SCRIPT){setups++;return{success:true,result:true};}
  assert.equal(script,LAUNCH_SCRIPT);launches++;
  return fail?{success:false}:{success:true,result:true};
 }},{extensionId:id,extensionKey:key});
 await transport.prepare(true);await transport.launch();await transport.launch();
 assert.equal(setups,1);assert.equal(launches,2);
 fail=true;await assert.rejects(transport.launch(),/error.bridgeConnection/);
 fail=false;await transport.launch();assert.equal(setups,2);
});
