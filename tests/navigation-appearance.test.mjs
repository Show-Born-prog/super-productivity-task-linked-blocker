import test from 'node:test';import assert from 'node:assert/strict';
import{installNavigationAppearance}from'../plugin/navigation-appearance.mjs';

test('own navigation stylesheet is scoped, replaced safely and removed on unload',()=>{
 const nodes=new Map();const document={head:{append:el=>nodes.set(el.id,el)},getElementById:id=>nodes.get(id),createElement:()=>{const el={};el.remove=()=>{if(nodes.get(el.id)===el)nodes.delete(el.id);};return el;}};
 const first=installNavigationAppearance(document);assert.equal(nodes.size,1);const css=[...nodes.values()][0].textContent;
 for(const selector of css.split('\n').map(line=>line.split('{')[0]))assert.ok(selector.includes('svg#task-linked-blocker-icon'),'styles must affect only this plugin icon row');
 const second=installNavigationAppearance(document);assert.equal(nodes.size,1);first();assert.equal(nodes.size,1,'old unload must not remove a replacement stylesheet');second();assert.equal(nodes.size,0);
});
test('a missing or restricted host DOM cannot stop task enforcement',()=>{
 assert.doesNotThrow(()=>installNavigationAppearance(undefined)());assert.doesNotThrow(()=>installNavigationAppearance({get head(){throw Error('restricted');}})());
});
