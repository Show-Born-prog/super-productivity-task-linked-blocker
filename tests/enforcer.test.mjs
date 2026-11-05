import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnforcer} from '../extension/enforcer.mjs';
import {fakeChrome} from './helpers.mjs';

const lease=(domains,status='tracking')=>({version:1,revision:'s:1',issuedAt:10000,expiresAt:16000,status,domains});
test('new navigation rules and an existing forbidden tab are blocked; unrelated browser tabs work',async()=>{
 const chrome=fakeChrome([{id:1,url:'https://youtube.com/watch?private=do-not-log'},{id:2,url:'https://example.org/'}]);
 const e=createEnforcer(chrome,()=>11000);await e.apply(lease(['youtube.com']));
 assert.equal(chrome.inspect().rules[0].action.type,'block');assert.deepEqual(chrome.inspect().rules[0].condition.requestDomains,['youtube.com']);
 assert.equal(chrome.inspect().tabs[0].url,'chrome-extension://test/blocked.html');assert.equal(chrome.inspect().tabs[1].url,'https://example.org/');
 await e.apply(lease([],'stopped'));assert.equal(chrome.inspect().rules.length,0);assert.equal(chrome.inspect().tabs[0].url,'https://youtube.com/watch?private=do-not-log');
});
test('switching into an already-open forbidden tab checks it again and stopping preserves user navigation',async()=>{
 const chrome=fakeChrome([{id:1,url:'https://example.org'}]);const e=createEnforcer(chrome,()=>11000);await e.apply(lease(['youtube.com']));
 await chrome.tabs.update(1,{url:'https://music.youtube.com'});await e.checkTab(1);assert.equal(chrome.inspect().tabs[0].url,'chrome-extension://test/blocked.html');
 await chrome.tabs.update(1,{url:'https://example.org/new'});await e.clear();assert.equal(chrome.inspect().tabs[0].url,'https://example.org/new');
});
test('task switching replaces rules; disconnect, expiry and worker restart clear stale rules',async()=>{
 let now=11000;const chrome=fakeChrome();const e=createEnforcer(chrome,()=>now);
 await e.apply(lease(['youtube.com']));await e.apply(lease(['reddit.com']));assert.deepEqual(chrome.inspect().rules[0].condition.requestDomains,['reddit.com']);
 now=16000;await e.checkTab(1);assert.equal(chrome.inspect().rules.length,0);
 now=11000;await e.apply(lease(['youtube.com']));const restarted=createEnforcer(chrome,()=>now);await restarted.clear();assert.equal(chrome.inspect().rules.length,0);
});
test('DNR failure is an error rather than a false active status',async()=>{
 const chrome=fakeChrome();const e=createEnforcer(chrome,()=>11000);chrome.fail(true);await e.apply(lease(['youtube.com']));assert.equal(e.getState().status,'error');
});

test('idle tab activity and repeated clears do not repeat Chrome API work after initial stale-rule cleanup',async()=>{
 const chrome=fakeChrome([{id:1,url:'https://example.org'}]),calls={read:0,write:0,tab:0};
 for(const [api,key,name] of [[chrome.declarativeNetRequest,'getSessionRules','read'],[chrome.declarativeNetRequest,'updateSessionRules','write'],[chrome.tabs,'get','tab']]){
  const original=api[key];api[key]=async(...args)=>{calls[name]++;return original(...args);};
 }
 // A new worker must remove rules left by its predecessor even when its own state is empty.
 await chrome.declarativeNetRequest.updateSessionRules({removeRuleIds:[],addRules:[{id:1,action:{type:'block'}}]});calls.write=0;
 const e=createEnforcer(chrome,()=>11000);await e.clear();assert.equal(chrome.inspect().rules.length,0);
 assert.deepEqual(calls,{read:1,write:1,tab:0});
 for(let i=0;i<20;i++){await e.clear();await e.checkTab(1);}
 assert.deepEqual(calls,{read:1,write:1,tab:0});
 await e.apply(lease([]));await e.checkTab(1);assert.equal(calls.tab,0,'app-only sessions do not inspect browser URLs');
 await e.apply(lease(['youtube.com']));await chrome.tabs.update(1,{url:'https://youtube.com/'});await e.checkTab(1);
 assert.equal(chrome.inspect().tabs[0].url,'chrome-extension://test/blocked.html');
});
test('failed DNR cleanup is retried rather than cached as a successful idle state',async()=>{
 const chrome=fakeChrome(),e=createEnforcer(chrome,()=>11000);await e.apply(lease(['youtube.com']));
 chrome.fail(true);await e.clear();assert.equal(e.getState().status,'error');assert.equal(chrome.inspect().rules.length,1);
 chrome.fail(false);await e.clear();assert.equal(chrome.inspect().rules.length,0);assert.equal(e.getState().status,'disconnected');
});
