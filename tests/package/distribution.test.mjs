import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdir,mkdtemp,readFile,writeFile,rename,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {createTransport} from '../../plugin/transport.mjs';
import {createController} from '../../plugin/controller.mjs';
import {createEnforcer} from '../../extension/enforcer.mjs';
import {fakeChrome} from '../helpers.mjs';
import {connect} from '../native/ws-client.mjs';
import {windowsArchive} from '../../scripts/windows-archive.mjs';
const require=createRequire(import.meta.url),AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;

test('distribution checksum and allowlisted archive contain runtime notices and no local settings',async()=>{
 const {version}=JSON.parse(await readFile('package.json','utf8')),archive=`dist/task-linked-blocker-${version}-win-x64.zip`;
 const checksum=await readFile(archive+'.sha256','utf8');assert.equal(checksum.split(' ')[0],createHash('sha256').update(await readFile(archive)).digest('hex'));
 const bytes=await readFile(archive);assert.equal(bytes.readUInt32LE(0),0x04034b50);
 const names=windowsArchive('inspect',archive);
 assert.deepEqual([...new Set(names.map(name=>name.split('/')[0]))].sort(),['HowToInstall.md','extension','super-focus-guard.zip']);
 for(const name of names)assert.ok(/^extension\//.test(name)||['HowToInstall.md','super-focus-guard.zip'].includes(name),'Unexpected archive entry: '+name);
 assert.ok(names.every(name=>!/(?:^|\/)(?:\.local|\.research|\.test-tmp|rules\.json|state\.json|installation\.json)(?:\/|$)/.test(name)));
 for(const framework of ['Microsoft.NETCore.App','Microsoft.AspNetCore.App'])for(const notice of ['LICENSE','THIRD-PARTY-NOTICES'])assert.ok(names.includes('extension/bridge/licenses/'+framework+'-'+notice+'.txt'));
});

test('prebuilt ZIP installs and moves without build paths, preserves rules, and enforces only during tracking',{timeout:60000},async t=>{
 await mkdir('.test-tmp',{recursive:true});const scratch=await mkdtemp(path.resolve('.test-tmp/distribution-'));
 let folder=path.join(scratch,'初回 空白 中文');await mkdir(folder);
 const {version}=JSON.parse(await readFile('package.json','utf8'));
 windowsArchive('extract',`dist/task-linked-blocker-${version}-win-x64.zip`,folder);
 assert.deepEqual((await readdir(folder)).sort(),['HowToInstall.md','extension','super-focus-guard.zip']);
 windowsArchive('extract',path.join(folder,'super-focus-guard.zip'),path.join(scratch,'plugin-check'));
 assert.equal(JSON.parse(await readFile(path.join(scratch,'plugin-check/manifest.json'),'utf8')).version,version);
 const runtime=JSON.parse(await readFile(path.join(folder,'extension/bridge/FocusGuard.Bridge.runtimeconfig.json'),'utf8'));
 assert.ok(runtime.runtimeOptions.includedFrameworks.length>=2);assert.equal(runtime.runtimeOptions.frameworks,undefined,'self-contained runtime must not require a globally installed framework');
 const manifest=JSON.parse(await readFile(path.join(folder,'extension/manifest.json'),'utf8'));assert.equal(manifest.version,version);
 const registration=path.join(scratch,'home/.task-linked-blocker'),directory=path.join(registration,'runtime');
 const legacy=path.join(scratch,'legacy-rules.json');
 const rules={version:3,rules:[{tagId:'test',domains:['example.org'],allowSitesEnabled:true,allowedDomains:['reference.example.org'],apps:[{executable:'focusguard.nonexistent.exe'}]}]};
 await writeFile(legacy,JSON.stringify(rules));
 // Do not consult PATH or the globally installed .NET runtime during this test.
 const env={NODE_ENV:'production',ELECTRON_RUN_AS_NODE:'1',DOTNET_ROOT:path.join(scratch,'no-dotnet'),DOTNET_MULTILEVEL_LOOKUP:'0'};
 const install=(extra=[])=>spawnSync(path.join(folder,'extension/bridge/FocusGuard.Bridge.exe'),['--install','--data-dir',registration,...extra],{windowsHide:true,encoding:'utf8',env});
 const installed=install(['--import-rules',legacy]);assert.equal(installed.status,0,installed.stderr);
 const stored=await readFile(path.join(directory,'rules.json'),'utf8');assert.deepEqual(JSON.parse(stored),rules);
 assert.equal(install(['--import-rules',legacy]).status,1,'setup must never overwrite existing rules');
 assert.equal(await readFile(path.join(directory,'rules.json'),'utf8'),stored);
 const children=[];const testRequire=name=>name==='os'?{homedir:()=>path.join(scratch,'home')}:name==='child_process'?{spawn:(exe,args,options)=>{const child=spawn(exe,args,{...options,env});children.push(child);return child;}}:require(name);
 const api={executeNodeScript:async({script,args})=>{try{return{success:true,result:await new AsyncFunction('args','require',script)(args,testRequire)};}catch{return{success:false};}},getTasks:async()=>[{id:'task',tagIds:['test']}]};
 const extensionId='kjlclkomkeagcfgfjhjlmigdnobdiccp',port=49238;
 const transport=createTransport(api,{extensionId,port}),controller=createController({api,transport,sessionId:'package-test'});
 await controller.initialize();assert.equal(children.length,0,'loading settings must not launch the helper');assert.deepEqual(controller.getState().rules,rules.rules);
 const heartbeat=setInterval(()=>{if(controller.getState().helperRequired)void controller.heartbeat().catch(()=>{});},500);
 t.after(()=>{clearInterval(heartbeat);for(const child of children)if(child.exitCode===null)child.kill();});
 let client;
 const wait=async status=>{try{return await client.wait(s=>s.status===status);}catch(error){throw new Error('Expected '+status+'; helpers='+JSON.stringify(children.map(c=>({pid:c.pid,exit:c.exitCode})))+'; state='+(await readFile(path.join(directory,'state.json'),'utf8'))+'; helper='+(await readFile(path.join(directory,'bridge-status.json'),'utf8')),{cause:error});}};
 async function start(){for(let attempt=0;attempt<50;attempt++){await transport.launch();try{client=await connect(port,extensionId);const opened=client;t.after(()=>opened.close());return;}catch{await delay(100);}}assert.fail('self-contained helper did not bind');}
 async function exit(){for(let attempt=0;attempt<70&&children.at(-1).exitCode===null;attempt++)await delay(50);assert.equal(children.at(-1).exitCode,0);client.close();}
 const chrome=fakeChrome([{id:1,url:'https://example.org/'},{id:2,url:'https://reference.example.org/'}]),enforcer=createEnforcer(chrome);
 await controller.currentTaskChange({current:{id:'task',tagIds:['test']}});await start();
 let snapshot=await wait('tracking');await enforcer.apply(snapshot);
 assert.equal(chrome.inspect().rules.length,1);assert.equal(chrome.inspect().tabs[0].url,'chrome-extension://test/blocked.html');assert.equal(chrome.inspect().tabs[1].url,'https://reference.example.org/');
 await delay(700);assert.equal(install().status,1,'active helper must prevent repointing setup');
 await controller.action({action:{type:'[FocusMode] Start Break'}});snapshot=await wait('break');await enforcer.apply(snapshot);assert.equal(chrome.inspect().rules.length,0);await exit();
 await controller.action({action:{type:'[FocusMode] Start Session'}});await start();await wait('tracking');
 await controller.currentTaskChange({current:null});snapshot=await wait('stopped');await enforcer.apply(snapshot);await exit();assert.equal(chrome.inspect().rules.length,0);
 const moved=path.join(scratch,'移動後 package');await rename(folder,moved);folder=moved;await delay(3100);assert.equal(install().status,0);
 const record=JSON.parse(await readFile(path.join(registration,'installation.json'),'utf8'));assert.equal(record.executable,path.join(folder,'extension/bridge/FocusGuard.Bridge.exe'));assert.equal(await readFile(path.join(directory,'rules.json'),'utf8'),stored);
 await controller.currentTaskChange({current:{id:'task',tagIds:['test']}});await start();await wait('tracking');
 await controller.currentTaskChange({current:null});await wait('stopped');await exit();
 assert.equal(children.length,3,'each work session has one helper and leaves none after stopping');
});
