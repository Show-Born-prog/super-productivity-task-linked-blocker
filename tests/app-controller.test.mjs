import test from 'node:test';
import assert from 'node:assert/strict';
import {createController} from '../plugin/controller.mjs';
test('legacy domains survive block-only save and app rules pause on break/stop',async()=>{
 let stored=[{tagId:'tag',domains:['example.org']}];const sent=[];
 const transport={loadRules:async()=>stored,saveRules:async v=>{stored=structuredClone(v);},write:async v=>{sent.push(v);return{bridgeConnected:true,browsers:[],appProtection:{status:'idle'}};}};
 const c=createController({api:{},transport,sessionId:'apps',now:()=>10000});await c.initialize();
 await c.saveRules([{...c.getState().rules[0],apps:[{executable:'fixture.exe'}]}]);
 assert.equal(stored.version,3);assert.deepEqual(stored.rules[0].domains,['example.org']);assert.equal(Object.hasOwn(stored,'appSettings'),false);
 const loaded=createController({api:{},transport,sessionId:'restored',now:()=>10000});await loaded.initialize();assert.deepEqual(loaded.getState().rules,stored.rules);
 await c.currentTaskChange({current:{id:'task',tagIds:['tag']}});assert.deepEqual(sent.at(-1).apps,[{executable:'fixture.exe'}]);assert.equal(Object.hasOwn(sent.at(-1),'appSettings'),false);
 await c.action({action:'[FocusMode] Start Break'});assert.deepEqual(sent.at(-1).apps,[]);
 await c.currentTaskChange({current:null});assert.deepEqual(sent.at(-1).apps,[]);
});
test('old warning rules and events cannot start blocking or send notifications',async()=>{
 const notices=[];let stored={version:1,rules:[{tagId:'tag',domains:['example.org'],apps:[{executable:'steam.exe',mode:'warn'}]}]};
 const c=createController({api:{notify:async n=>notices.push(n)},sessionId:'migration',now:()=>10000,transport:{loadRules:async()=>stored,saveRules:async v=>stored=v,write:async()=>({bridgeConnected:true,appEvent:{kind:'warn'}})}});
 await c.initialize();await c.currentTaskChange({current:{id:'task',tagIds:['tag']}});await c.heartbeat();
 assert.deepEqual(c.getState().apps,[]);assert.deepEqual(c.getState().domains,['example.org']);assert.deepEqual(c.getState().removedWarningApps,['steam.exe']);assert.equal(notices.length,0);
 await c.saveRules(c.getState().rules);assert.deepEqual(c.getState().removedWarningApps,[]);assert.equal(stored.version,3);
});
