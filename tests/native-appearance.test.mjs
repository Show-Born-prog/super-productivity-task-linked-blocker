import test from 'node:test';
import assert from 'node:assert/strict';
import {inheritNativeTheme} from '../plugin/native.mjs';

test('appearance copies the host Material theme and loaded-icon flag without touching host settings',()=>{
 const copied=new Map(),classes=new Map();
 const document={body:{style:{setProperty:(key,value)=>copied.set(key,value)},classList:{toggle:(key,value)=>classes.set(key,value)}}};
 const values={'--mat-button-text-label-text-color':'rgb(20, 30, 40)','--c-primary':'rgb(40, 80, 120)',color:'rgb(1, 2, 3)'};
 const style=Object.assign(Object.keys(values),{getPropertyValue:key=>values[key],fontFamily:'Host font'});
 const parent={getComputedStyle:()=>style,document:{body:{classList:{contains:key=>key==='isDarkTheme'||key==='isMaterialSymbolsLoaded'}}}};
 inheritNativeTheme(document,parent);
 assert.deepEqual([...copied.keys()],['--mat-button-text-label-text-color','--c-primary']);
 assert.equal(document.body.style.fontFamily,'Host font');assert.equal(classes.get('isDarkTheme'),true);
 assert.equal(classes.get('isMaterialSymbolsLoaded'),true,'icons must not stay hidden after the host font has loaded');
 assert.deepEqual(Object.keys(values),['--mat-button-text-label-text-color','--c-primary','color']);
});
test('unavailable parent appearance does not crash the plugin view',()=>{
 const parent={getComputedStyle:()=>{throw new Error('restricted parent');}};
 assert.doesNotThrow(()=>inheritNativeTheme({body:{}},parent));
});
