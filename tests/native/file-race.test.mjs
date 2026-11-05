import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdir,mkdtemp,readFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import path from 'node:path';
import {createTransport} from '../../plugin/transport.mjs';

const require=createRequire(import.meta.url);
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;

test('Windows helper read conflicts do not fail plugin state publication', {timeout:25000}, async t=>{
 await mkdir('.test-tmp',{recursive:true});
 const directory=await mkdtemp(path.resolve('.test-tmp/file-race-'));
 const snapshot=()=>{const now=Date.now();return {version:1,revision:'file-race-fixture',issuedAt:now,expiresAt:now+6000,status:'tracking',domains:['example.org'],padding:'x'.repeat(220000)};};
 let conflicts=0;
 const transport=createTransport({executeNodeScript:async({script,args})=>{
  try{return{success:true,result:await new AsyncFunction('args','require',script)(args,require)};}
  catch(e){if(e.code==='EPERM'||e.code==='EBUSY')conflicts++;return{success:false,error:e.message};}
 }},{directory});
 await transport.write(snapshot());
 const child=spawn(path.resolve('dist/bridge/FocusGuard.Bridge.exe'),['--state-dir',directory,'--extension-id','a'.repeat(32),'--port','49232'],{windowsHide:true,stdio:'ignore'});
 t.after(()=>{if(child.exitCode===null)child.kill();});
 let started=false;
 for(let i=0;i<50;i++){
  try{const status=JSON.parse(await readFile(path.join(directory,'bridge-status.json'),'utf8'));if(status.pid===child.pid){started=true;break;}}catch{}
  await delay(100);
 }
 assert.ok(started,'the isolated real helper must be running');
 const failures={};let writes=0;
 const deadline=Date.now()+15000;
 while(Date.now()<deadline){
  try{await transport.write(snapshot());writes++;}
  catch{failures.publication=(failures.publication||0)+1;}
  await delay(2);
 }
 const status=JSON.parse(await readFile(path.join(directory,'bridge-status.json'),'utf8'));
 assert.ok(Date.now()-status.updatedAt<2500,'helper reads must stay live during writes');
 assert.ok(writes>100,'exercise repeated real file replacements rather than a single write');
 assert.deepEqual(failures,{},'temporary helper reads must not cause a failed state publication');
 console.log(`Atomic state publication: ${writes} writes, ${conflicts} sharing conflicts recovered.`);
});
