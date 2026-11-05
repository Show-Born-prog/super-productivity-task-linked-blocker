import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdir,mkdtemp,readFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import path from 'node:path';
import http from 'node:http';
import {createController} from '../../plugin/controller.mjs';
import {createTransport} from '../../plugin/transport.mjs';
import {createEnforcer} from '../../extension/enforcer.mjs';
import {fakeChrome} from '../helpers.mjs';
import {connect} from './ws-client.mjs';
const require=createRequire(import.meta.url),AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const id='kjlclkomkeagcfgfjhjlmigdnobdiccp',port=49231;
test('Windows real helper: demand start, tag/switch, break/stop exit, restart, rapid toggle, Origin and stale lease',{timeout:60000},async t=>{
 await mkdir('.test-tmp',{recursive:true});const directory=await mkdtemp(path.resolve('.test-tmp/native-'));const children=[];
 const testRequire=name=>name==='child_process'?{spawn:(...args)=>{const child=spawn(...args);children.push(child);return child;}}:require(name);
 const transport=createTransport({executeNodeScript:async({script,args})=>({success:true,result:await new AsyncFunction('args','require',script)(args,testRequire)})},{directory,executable:path.resolve('dist/bridge/FocusGuard.Bridge.exe'),extensionId:id,port});
 const controller=createController({api:{getTasks:async()=>[]},transport,sessionId:'windows-fixture'});
 await transport.saveRules([{tagId:'edit',domains:['youtube.com']},{tagId:'code',domains:['reddit.com']},{tagId:'apps',domains:[],apps:[{executable:'focusguard.nonexistent.exe'}]}]);
 await controller.initialize();assert.equal(controller.getState().helperRequired,false);assert.equal(children.length,0);
 let heartbeat=setInterval(()=>{if(controller.getState().helperRequired)void controller.heartbeat().catch(()=>{});},1000);
 t.after(()=>{clearInterval(heartbeat);for(const child of children)if(child.exitCode===null)child.kill();});
 async function exitWithin(child,limit=3000){const start=Date.now();while(child.exitCode===null&&Date.now()-start<limit)await delay(50);assert.equal(child.exitCode,0,'helper must exit normally without staying resident');return Date.now()-start;}
 async function startHelper(){
  let client,lastError;for(let i=0;i<35;i++){
   await transport.launch();try{client=await connect(port,id);break;}catch(error){lastError=error;await delay(100);}
  }
  assert.ok(client,`real listener must bind after demand launch: ${lastError?.message}`);t.after(()=>client.close());return client;
 }
 const chrome=fakeChrome([{id:1,url:'https://youtube.com/'},{id:2,url:'https://music.youtube.com/'}]),enforcer=createEnforcer(chrome);
 await controller.currentTaskChange({current:{id:'fixture-task',tagIds:['edit']}});
 let client=await startHelper();let child=children.at(-1);
 let snapshot=await client.wait(s=>s.status==='tracking'&&s.domains.includes('youtube.com'));assert.equal(Object.hasOwn(snapshot,'apps'),false);
 await enforcer.apply(snapshot);assert.equal(chrome.inspect().rules.length,1);assert.equal(chrome.inspect().tabs[0].url,'chrome-extension://test/blocked.html');
 assert.equal(snapshot.version,2);assert.deepEqual(snapshot.allowedDomains,[]);assert.equal(chrome.inspect().tabs[1].url,'chrome-extension://test/blocked.html');
 await controller.saveRules(controller.getState().rules.map(r=>r.tagId==='edit'?{...r,allowSitesEnabled:true,allowedDomains:['music.youtube.com']}:r));
 snapshot=await client.wait(s=>s.allowedDomains?.includes('music.youtube.com'));await enforcer.apply(snapshot);
 assert.equal(chrome.inspect().tabs[1].url,'https://music.youtube.com/');assert.equal(chrome.inspect().tabs[0].url,'chrome-extension://test/blocked.html');assert.deepEqual(chrome.inspect().rules[0].condition.excludedRequestDomains,['music.youtube.com']);
 await controller.saveRules(controller.getState().rules.map(r=>({...r,allowSitesEnabled:false})));
 snapshot=await client.wait(s=>s.status==='tracking'&&s.allowedDomains?.length===0);await enforcer.apply(snapshot);assert.equal(chrome.inspect().tabs[1].url,'chrome-extension://test/blocked.html');
 client.send({revision:snapshot.revision,protection:'active'});await delay(700);await controller.heartbeat();assert.equal(controller.getState().bridgeConnected,true);
 const processCount=children.length;await transport.launch();assert.equal(children.length,processCount,'fresh listener must be reused, not duplicated');
 const conflict=spawn(path.resolve('dist/bridge/FocusGuard.Bridge.exe'),['--state-dir',directory,'--extension-id',id,'--port',String(port)],{windowsHide:true,stdio:'ignore'});children.push(conflict);await exitWithin(conflict);
 for(const origin of [null,'https://example.org']) {
  const forbidden=await new Promise((resolve,reject)=>{const req=http.get({hostname:'127.0.0.1',port,path:'/state',headers:origin?{Origin:origin}:{}},r=>{r.resume();resolve(r.statusCode);});req.on('error',reject);});assert.equal(forbidden,403,'missing and foreign Origins remain forbidden');
 }
 await controller.currentTaskChange({current:{id:'fixture-next',tagIds:['code']}});snapshot=await client.wait(s=>s.domains.includes('reddit.com'));await enforcer.apply(snapshot);assert.equal(chrome.inspect().tabs[0].url,'https://youtube.com/');
 await controller.action({action:{type:'[FocusMode] Start Break'}});snapshot=await client.wait(s=>s.status==='break');await enforcer.apply(snapshot);assert.equal(chrome.inspect().rules.length,0);
 console.log(`Break exit: ${await exitWithin(child)} ms after released state observed.`);client.close();
 await controller.action({action:{type:'[FocusMode] Start Session'}});client=await startHelper();child=children.at(-1);await client.wait(s=>s.status==='tracking'&&s.domains.includes('reddit.com'));
 await controller.currentTaskChange({current:null});await client.wait(s=>s.status==='stopped');console.log(`Stop exit: ${await exitWithin(child)} ms after released state observed.`);client.close();
 await controller.currentTaskChange({current:{id:'app-only',tagIds:['apps']}});client=await startHelper();child=children.at(-1);await client.wait(s=>s.status==='tracking'&&s.domains.length===0);
 await controller.currentTaskChange({current:{id:'empty',tagIds:[]}});assert.equal(controller.getState().helperRequired,false);await exitWithin(child);client.close();
 await controller.currentTaskChange({current:{id:'fixture-task',tagIds:['edit']}});client=await startHelper();child=children.at(-1);await client.wait(s=>s.status==='tracking'&&s.domains.includes('youtube.com'));
 await controller.currentTaskChange({current:null});await controller.currentTaskChange({current:{id:'rapid',tagIds:['edit']}});await delay(1200);await controller.heartbeat();
 assert.equal(child.exitCode,null,'rapid stop/start must not strand the active task');assert.equal(children.filter(p=>p.exitCode===null).length,1);
 clearInterval(heartbeat);await controller.currentTaskChange({current:{id:'stale-task',tagIds:['edit']}});
 snapshot=await client.wait(s=>s.status==='disconnected',9000);await enforcer.apply(snapshot);assert.equal(chrome.inspect().rules.length,0);
 await exitWithin(child,12000);client.close();
 console.log('No helper remains after normal stop/break/no-target or stale lease; no real applications were terminated.');
});
