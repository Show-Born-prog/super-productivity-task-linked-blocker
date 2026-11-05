import test from 'node:test';
import assert from 'node:assert/strict';
import {createViewRefresh} from '../plugin/view-refresh.mjs';

function setup(hidden=false, refresh=async()=>{}) {
 const document=new EventTarget();document.hidden=hidden;
 const window=new EventTarget(),timers=new Map();let sequence=0,calls=0;
 const view=createViewRefresh({document,window,refresh:async()=>{calls++;await refresh();},
  setInterval:(fn,ms)=>{const id=++sequence;timers.set(id,{fn,ms});return id;},clearInterval:id=>timers.delete(id)});
 return {view,document,window,timers,get calls(){return calls;},
  visibility:hidden=>{document.hidden=hidden;document.dispatchEvent(new Event('visibilitychange'));}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('visible settings refresh immediately and every 1500ms; hidden settings do not poll and resume immediately',async()=>{
 const f=setup();await settle();assert.equal(f.calls,1);assert.equal(f.timers.size,1);
 const tick=[...f.timers.values()][0];assert.equal(tick.ms,1500);await tick.fn();await settle();assert.equal(f.calls,2);
 f.visibility(true);assert.equal(f.timers.size,0);await f.view.refresh();assert.equal(f.calls,2);
 f.visibility(false);await settle();assert.equal(f.calls,3);assert.equal(f.timers.size,1);
 f.window.dispatchEvent(new Event('pagehide'));assert.equal(f.timers.size,0);
 f.window.dispatchEvent(new Event('pageshow'));await settle();assert.equal(f.calls,4);
 f.view.dispose();assert.equal(f.timers.size,0);f.visibility(false);await settle();assert.equal(f.calls,4);
});
test('initially hidden settings wait for visibility and share a single pending refresh',async()=>{
 let complete;const f=setup(true,()=>new Promise(resolve=>complete=resolve));await settle();assert.equal(f.calls,0);assert.equal(f.timers.size,0);
 f.visibility(false);await settle();assert.equal(f.calls,1);
 const a=f.view.refresh(),b=f.view.refresh();[...f.timers.values()][0].fn();await settle();assert.equal(f.calls,1);
 f.visibility(true);complete();await Promise.all([a,b]);assert.equal(f.timers.size,0);
 f.visibility(false);await settle();assert.equal(f.calls,2);complete();await settle();f.view.dispose();
});
test('a failed request does not prevent later refresh or restart polling while hidden',async()=>{
 let fail=true;const f=setup(false,async()=>{if(fail)throw new Error('fixture failure');});await settle();assert.equal(f.calls,1);
 fail=false;await f.view.refresh();assert.equal(f.calls,2);f.visibility(true);await settle();assert.equal(f.timers.size,0);f.view.dispose();
});
