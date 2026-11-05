import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createEnforcer} from '../extension/enforcer.mjs';
import {fakeChrome} from './helpers.mjs';

const source=(await readFile('extension/worker.mjs','utf8')).replace(/^import .*;\n/,'');
function event(){const listeners=[];return{listeners,addListener:fn=>listeners.push(fn)};}
async function setup(){
 let now=10000;let counter=0;const timers=new Map();const sockets=[];const badges=[];const chrome=fakeChrome([{id:1,url:'https://youtube.com/'}]);
 Object.assign(chrome.tabs,{onActivated:event(),onUpdated:event(),onRemoved:event()});
 chrome.windows={onFocusChanged:event(),WINDOW_ID_NONE:-1};chrome.runtime.id='fixture';chrome.runtime.onMessage=event();
 chrome.action={setBadgeText:v=>badges.push(v.text),setBadgeBackgroundColor:()=>{}};
 chrome.alarms={create:()=>{},onAlarm:event()};
 class Socket{static OPEN=1;static CLOSED=3;constructor(url){this.url=url;this.readyState=1;this.sent=[];sockets.push(this);}send(v){this.sent.push(JSON.parse(v));}close(){this.readyState=3;return this.onclose?.();}}
 vm.runInNewContext(source,{chrome,WebSocket:Socket,createEnforcer:c=>createEnforcer(c,()=>now),Date:{now:()=>now},
  setTimeout:(fn,ms)=>{const id=++counter;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)});
 await new Promise(resolve=>setImmediate(resolve));
 return{chrome,sockets,timers,badges,advance:value=>{now=value;}};
}
const state=()=>({version:1,revision:'test:1',issuedAt:10000,expiresAt:16000,status:'tracking',domains:['youtube.com']});
test('real worker logic acknowledges only applied rules and clears immediately when helper disconnects',async()=>{
 const f=await setup();const socket=f.sockets[0];await socket.onmessage({data:JSON.stringify(state())});
 assert.equal(f.chrome.inspect().rules.length,1);assert.equal(socket.sent.at(-1).protection,'active');
 await socket.close();assert.equal(f.chrome.inspect().rules.length,0);assert.equal(f.badges.at(-1),'!');assert.ok([...f.timers.values()].some(t=>t.ms===1000));
});
test('worker lease timer and alarm watchdog release stale rules without claiming protection',async()=>{
 const f=await setup();const socket=f.sockets[0];await socket.onmessage({data:JSON.stringify(state())});f.advance(16001);
 const expiry=[...f.timers.values()].find(t=>t.ms===6000);assert.ok(expiry);await expiry.fn();assert.equal(f.chrome.inspect().rules.length,0);
 await socket.onmessage({data:JSON.stringify(state())});assert.equal(socket.sent.at(-1).protection,'idle');
 await f.chrome.alarms.onAlarm.listeners[0]();assert.equal(f.chrome.inspect().rules.length,0);
});

test('worker applies version 2 exclusions before acknowledging and clears them on disconnect',async()=>{
 const f=await setup();const socket=f.sockets[0];
 await socket.onmessage({data:JSON.stringify({...state(),version:2,allowedDomains:['music.youtube.com']})});
 assert.deepEqual(f.chrome.inspect().rules[0].condition.excludedRequestDomains,['music.youtube.com']);assert.equal(socket.sent.at(-1).protection,'active');
 await f.chrome.tabs.update(1,{url:'https://music.youtube.com/'});await f.chrome.tabs.onActivated.listeners[0]({tabId:1});await new Promise(resolve=>setImmediate(resolve));assert.equal(f.chrome.inspect().tabs[0].url,'https://music.youtube.com/');
 await socket.close();assert.equal(f.chrome.inspect().rules.length,0);
});

test('unchanged heartbeat keeps acknowledgement and lease but avoids redundant badge updates; idle focus does not query tabs',async()=>{
 const f=await setup();let queries=0;const query=f.chrome.tabs.query;f.chrome.tabs.query=async(...args)=>{queries++;return query(...args);};
 const socket=f.sockets[0];await socket.onmessage({data:JSON.stringify(state())});const baseline=f.badges.length;
 f.advance(11000);
 for(let i=0;i<10;i++)await socket.onmessage({data:JSON.stringify({...state(),issuedAt:11000,expiresAt:17000})});
 assert.equal(f.badges.length,baseline);assert.equal(socket.sent.length,11);assert.equal(socket.sent.at(-1).protection,'active');
 assert.ok([...f.timers.values()].some(t=>t.ms===6000),'lease is renewed without slowing down');
 await socket.onmessage({data:JSON.stringify({...state(),status:'stopped',domains:[]})});queries=0;
 await f.chrome.windows.onFocusChanged.listeners[0](1);assert.equal(queries,0);
 await socket.close();const afterClose=f.badges.length;
 assert.ok([...f.timers.values()].some(t=>t.ms===1000),'fast reconnect is preserved');
 for(let i=0;i<5;i++)await f.chrome.alarms.onAlarm.listeners[0]();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.badges.length,afterClose);assert.equal(f.sockets.length,2,'watchdog and retry do not create parallel live connections');
});
