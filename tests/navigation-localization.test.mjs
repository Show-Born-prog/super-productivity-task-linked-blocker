import test from 'node:test';import assert from 'node:assert/strict';
import{installNavigationLocalization}from'../plugin/navigation-localization.mjs';

function fixture(){
 let callback,observed,disconnected=0,locale='ja';
 let node={nodeType:3,nodeValue:'タスク連動ブロッカー'};
 let label={get firstChild(){return node;},get textContent(){return node.nodeValue;},set textContent(value){node.nodeValue=value;}};
 const own={querySelector:selector=>selector.includes('svg#')?{}:label};
 const root={querySelector:selector=>selector.includes('.nav-link')?own:null};
 const document={querySelector:selector=>selector==='magic-side-nav'?root:null};
 class Observer{constructor(fn){callback=fn;}observe(target,options){observed={target,options};}disconnect(){disconnected++;}}
 const names={ja:'タスク連動ブロッカー',en:'Task-linked Blocker','zh-tw':'工作連動封鎖工具'};
 const navigation=installNavigationLocalization(document,()=>names[locale],Observer);
 return{navigation,root,own,get node(){return node;},get label(){return label;},get observed(){return observed;},get disconnected(){return disconnected;},setLocale(value){locale=value;},mutate(){callback([{target:{nodeType:3,parentElement:{closest:()=>own}},addedNodes:[]}]);},foreign(){callback([{target:{nodeType:3,parentElement:{closest:()=>({querySelector:()=>null})}},addedNodes:[]}]);},replace(){node={nodeType:3,nodeValue:names.ja};label={get firstChild(){return node;},get textContent(){return node.nodeValue;}};callback([{target:root,addedNodes:[{nodeType:1,matches:()=>true}]}]);}};
}
test('own sidebar label follows language changes and survives native rerenders without replacing its text node',()=>{
 const f=fixture(),original=f.node;assert.equal(f.node.nodeValue,'タスク連動ブロッカー');assert.equal(f.observed.target,f.root);assert.deepEqual(f.observed.options,{childList:true,subtree:true,characterData:true});
 f.setLocale('en');f.navigation.refresh();assert.equal(f.node.nodeValue,'Task-linked Blocker');assert.equal(f.node,original);
 f.node.nodeValue='タスク連動ブロッカー';f.mutate();assert.equal(f.node.nodeValue,'Task-linked Blocker');
 f.setLocale('zh-tw');f.foreign();assert.equal(f.node.nodeValue,'Task-linked Blocker','unrelated navigation changes must do no translation work');
 f.navigation.refresh();assert.equal(f.node.nodeValue,'工作連動封鎖工具');f.replace();assert.equal(f.node.nodeValue,'工作連動封鎖工具');
 f.navigation.dispose();assert.equal(f.disconnected,1);f.node.nodeValue='unchanged';f.navigation.refresh();assert.equal(f.node.nodeValue,'unchanged');
});
test('missing or restricted sidebar DOM and missing observer cannot interrupt enforcement',()=>{
 assert.doesNotThrow(()=>installNavigationLocalization(undefined,()=>'',undefined).dispose());
 const broken={querySelector(){throw Error('restricted');}};assert.doesNotThrow(()=>installNavigationLocalization(broken,()=>'',undefined).refresh());
});
