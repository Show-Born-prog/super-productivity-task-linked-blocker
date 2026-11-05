import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createTransport} from '../plugin/transport.mjs';
const require=createRequire(import.meta.url);
test('actual local filesystem transport saves rules and lease, without synced data or tasks',async()=>{
 await mkdir('.test-tmp',{recursive:true});const directory=await mkdtemp(path.resolve('.test-tmp/transport-'));
 const api={executeNodeScript:async ({script,args})=>{try{return{success:true,result:await new (Object.getPrototypeOf(async function(){}).constructor)('args','require',script)(args,require)};}catch{return{success:false};}}};
 const t=createTransport(api,{directory,executable:'',extensionId:''});assert.deepEqual(await t.loadRules(),[]);
 const rules=[{tagId:'fixture',domains:['example.org']}];await t.saveRules(rules);assert.deepEqual(await t.loadRules(),rules);
 await t.write({version:1,revision:'fixture'});assert.equal(JSON.parse(await readFile(path.join(directory,'state.json'),'utf8')).revision,'fixture');
 await assert.rejects(t.launch());
});

test('transient Windows rename conflicts retry the same lease without changing its expiry',async()=>{
 const requests=[];
 const t=createTransport({executeNodeScript:async request=>{
  requests.push(structuredClone(request.args));
  if(requests.length<3)return{success:false,error:'EPERM: operation not permitted, rename fixture'};
  return{success:true,result:{updatedAt:Date.now(),browsers:[]}};
 }},{directory:'fixture',executable:'',extensionId:''});
 const state={version:1,revision:'fixture',issuedAt:1000,expiresAt:7000,status:'stopped',domains:[]};
 await t.write(state);
 assert.equal(requests.length,3);
 for(const args of requests)assert.deepEqual(args[2],state,'retry must not renew an older tracking lease');
});

test('persistent sharing conflicts have bounded retries; unrelated failures are not retried or leaked',async()=>{
 let count=0;
 const t=createTransport({executeNodeScript:async()=>{count++;return{success:false,error:'EBUSY: resource busy, rename private-path'};}},{directory:'fixture'});
 await assert.rejects(t.write({}),e=>!e.message.includes('private-path'));
 assert.equal(count,5);
 count=0;
 const denied=createTransport({executeNodeScript:async()=>{count++;return{success:false,error:'EACCES: permission denied private-path'};}},{directory:'fixture'});
 await assert.rejects(denied.write({}),e=>!e.message.includes('private-path'));
 assert.equal(count,1);
 await assert.rejects(t.saveRules([]));
 assert.equal(count,2,'settings failures are not hidden behind state-write retries');
});
