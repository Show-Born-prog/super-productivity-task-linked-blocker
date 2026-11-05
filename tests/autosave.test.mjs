import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutoSave} from '../plugin/autosave.mjs';

const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const value=domain=>({rules:[{tagId:'a',domains:[domain],apps:[]}]});

test('autosave posts every distinct committed snapshot immediately; baseline and duplicates do not write',async()=>{
  const calls=[],pending=[];const saver=createAutoSave({save:data=>{calls.push(data);const d=deferred();pending.push(d);return d.promise;}});
  saver.setBaseline(value('old.example'));await saver.submit(value('old.example'));assert.equal(calls.length,0);
  const next=value('new.example'),first=saver.submit(next);next.rules[0].domains[0]='mutated.example';
  const duplicate=saver.submit(value('new.example'));assert.equal(calls.length,1);assert.deepEqual(calls[0],value('new.example'));
  const second=saver.submit(value('third.example'));assert.equal(calls.length,2,'the host must receive the latest commit before the old acknowledgement');
  pending[0].resolve();pending[1].resolve();await Promise.all([first,duplicate,second]);
});
test('obsolete acknowledgements cannot clear a newer error or report an old failure',async()=>{
  const pending=[],events=[];const saver=createAutoSave({save:()=>{const d=deferred();pending.push(d);return d.promise;},onSaved:()=>events.push('saved'),onError:()=>events.push('error')});
  const old=saver.submit(value('old.example')),latest=saver.submit(value('latest.example'));
  pending[1].reject(Error('disk'));await latest;assert.deepEqual(events,['error']);
  pending[0].resolve();await old;assert.deepEqual(events,['error']);
  const retry=saver.submit(value('latest.example'));assert.equal(pending.length,3);pending[2].resolve();await retry;assert.deepEqual(events,['error','saved']);
  await saver.submit(value('latest.example'));assert.equal(pending.length,3);
});
test('reverting during a pending save is sent; invalid edits and disposal suppress stale UI callbacks',async()=>{
  const pending=[],calls=[],events=[];const saver=createAutoSave({save:data=>{calls.push(data);const d=deferred();pending.push(d);return d.promise;},onSaved:()=>events.push('saved'),onError:()=>events.push('error')});
  saver.setBaseline(value('a.example'));const b=saver.submit(value('b.example')),a=saver.submit(value('a.example'));assert.equal(calls.length,2);
  saver.invalidate();pending[0].reject(Error('stale'));pending[1].resolve();await Promise.all([b,a]);assert.deepEqual(events,[]);
  const valid=saver.submit(value('a.example'));assert.equal(calls.length,3);saver.dispose();pending[2].resolve();await valid;assert.deepEqual(events,[]);
});
