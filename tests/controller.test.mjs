import test from 'node:test';
import assert from 'node:assert/strict';
import {createController} from '../plugin/controller.mjs';

function setup(overrides={}) {
 const sent=[];
 const controller=createController({api:{getTasks:async()=>[]},sessionId:'session',now:()=>10000,
  transport:{loadRules:async()=>[{tagId:'edit',domains:['youtube.com']},{tagId:'code',domains:['reddit.com']}],saveRules:async()=>{},write:async s=>{sent.push(structuredClone(s));return{browsers:[]};}},...overrides});
 return {controller,sent};
}
test('startup does not infer tracking from a selected or persisted task; start, switch, no-tag, stop',async()=>{
 const {controller:c,sent}=setup(); await c.initialize();
 assert.equal(sent.at(-1).status,'unknown'); assert.deepEqual(sent.at(-1).domains,[]);
 await c.currentTaskChange({current:{id:'a',tagIds:['edit','code']}});
 assert.deepEqual(sent.at(-1).domains,['reddit.com','youtube.com']);
 await c.currentTaskChange({current:{id:'b',tagIds:['code']}});assert.deepEqual(sent.at(-1).domains,['reddit.com']);
 await c.currentTaskChange({current:{id:'c',tagIds:[]}});assert.deepEqual(sent.at(-1).domains,[]);
 await c.currentTaskChange({current:null}); assert.equal(sent.at(-1).status,'stopped');
});
test('tag changes and explicit Focus Mode break suspend and restore, without task mutations',async()=>{
 const {controller:c,sent}=setup();await c.initialize();await c.currentTaskChange({current:{id:'a',tagIds:['edit']}});
 await c.taskUpdate({taskId:'a',task:{id:'a',tagIds:['code']}});assert.deepEqual(sent.at(-1).domains,['reddit.com']);
 await c.action({action:{type:'[FocusMode] Start Break'}});assert.equal(sent.at(-1).status,'break');assert.deepEqual(sent.at(-1).domains,[]);
 await c.heartbeat();assert.deepEqual(sent.at(-1).domains,[]);
 await c.action({action:{type:'[FocusMode] Start Session'}});assert.deepEqual(sent.at(-1).domains,['reddit.com']);
});
test('AFK stop hook releases; old async task read cannot revive a stopped task; unload ends lease',async()=>{
 let finish;const {controller:c,sent}=setup({api:{getTasks:()=>new Promise(resolve=>{finish=resolve;})}});
 await c.initialize();await c.currentTaskChange({current:{id:'a',tagIds:['edit']}});
 const refresh=c.refreshTask();await c.currentTaskChange({current:null});finish([{id:'a',tagIds:['edit']}]);await refresh;
 assert.equal(sent.at(-1).status,'stopped');await c.close();const length=sent.length;await c.heartbeat();assert.equal(sent.length,length);
});
test('local settings failures are reported and do not claim protection',async()=>{
 const {controller:c}=setup({transport:{loadRules:async()=>[],write:async()=>{throw Error('offline');},saveRules:async()=>{throw Error('disk');}}});
 await assert.rejects(c.initialize());assert.equal(c.getState().status,'error');
 await assert.rejects(c.saveRules([{tagId:'x',domains:[]}])) ;assert.deepEqual(c.getState().browsers,[]);
});

test('rapid autosaves stay ordered in the host; a failed write never replaces the last valid rules',async()=>{
 let release;let fail=false;const writes=[];const stored={version:2,rules:[{tagId:'edit',domains:['old.example'],apps:[]}]};
 const {controller:c}=setup({transport:{loadRules:async()=>stored,write:async()=>({browsers:[]}),saveRules:async next=>{writes.push(next);if(writes.length===1)await new Promise(resolve=>{release=resolve;});if(fail)throw Error('disk');}}});
 await c.initialize();const first=c.saveRules([{tagId:'edit',domains:['one.example']}]),second=c.saveRules([{tagId:'edit',domains:['two.example']}]);
 await Promise.resolve();assert.equal(writes.length,1);assert.deepEqual(c.getState().rules[0].domains,['old.example']);
 release();await Promise.all([first,second]);assert.deepEqual(writes.map(w=>w.rules[0].domains[0]),['one.example','two.example']);assert.deepEqual(c.getState().rules[0].domains,['two.example']);
 fail=true;await assert.rejects(c.saveRules([{tagId:'edit',domains:['failed.example']}]));assert.deepEqual(c.getState().rules[0].domains,['two.example']);
});

test('failed initial settings reads cannot be treated as an empty editable configuration',async()=>{
 const {controller:c}=setup({transport:{loadRules:async()=>{throw Error('read');},write:async()=>({}),saveRules:async()=>{}}});
 await assert.rejects(c.initialize());assert.equal(c.getState().settingsLoaded,false);
 const {controller:good}=setup();await good.initialize();assert.equal(good.getState().settingsLoaded,true);
});
test('a task API failure stops renewing active protection until another actual tracking event',async()=>{
 const {controller:c,sent}=setup({api:{getTasks:async()=>{throw Error('unavailable');}}});
 await c.initialize();await c.currentTaskChange({current:{id:'a',tagIds:['edit']}});await c.refreshTask();
 assert.equal(sent.at(-1).status,'error');assert.deepEqual(sent.at(-1).domains,[]);await c.heartbeat();assert.equal(sent.at(-1).status,'unknown');
});

test('unchanged task refreshes keep the browser acknowledgement; real tag changes require a new acknowledgement',async()=>{
 let acknowledged;
 let clock=10000;
 const {controller:c}=setup({now:()=>clock,api:{getTasks:async()=>[{id:'a',tagIds:['code','edit'],timeSpent:2000}]},
  transport:{loadRules:async()=>[{tagId:'edit',domains:['youtube.com']},{tagId:'code',domains:['reddit.com']}],
   write:async s=>({bridgeConnected:true,browsers:s.revision===acknowledged?[{revision:acknowledged,protection:'active'}]:[]})}});
 await c.initialize();await c.currentTaskChange({current:{id:'a',tagIds:['edit','code']}});
 acknowledged=c.getState().revision;await c.heartbeat();assert.equal(c.getState().browsers.length,1);
 clock=11000;
 await c.refreshTask();await c.heartbeat();
 assert.equal(c.getState().revision,acknowledged);assert.equal(c.getState().browsers.length,1);assert.equal(c.getState().expiresAt,17000);
 await c.taskUpdate({taskId:'a',task:{id:'a',tagIds:['code','edit'],title:'Changed title',timeSpent:3000}});
 await c.heartbeat();assert.equal(c.getState().revision,acknowledged);assert.equal(c.getState().browsers.length,1);
 await c.taskUpdate({taskId:'a',task:{id:'a',tagIds:['code']}});
 assert.notEqual(c.getState().revision,acknowledged);assert.deepEqual(c.getState().domains,['reddit.com']);
 assert.equal(c.getState().browsers.length,0,'the previous rules acknowledgement must not confirm changed rules');
 acknowledged=c.getState().revision;await c.heartbeat();assert.equal(c.getState().browsers.length,1);
 await c.refreshTask();assert.notEqual(c.getState().revision,acknowledged);
 assert.deepEqual(c.getState().domains,['reddit.com','youtube.com']);assert.equal(c.getState().browsers.length,0);
});
