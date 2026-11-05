import test from 'node:test';
import assert from 'node:assert/strict';
import * as policy from '../shared/policy.mjs';
import {createController} from '../plugin/controller.mjs';
import {createEnforcer} from '../extension/enforcer.mjs';
import {prepareSettings} from '../plugin/form.mjs';
import {fakeChrome} from './helpers.mjs';

const rule={tagId:'music',domains:['youtube.com'],apps:[{executable:'fixture.exe'}],allowSitesEnabled:true,allowedDomains:['music.youtube.com']};
const lease=allowedDomains=>({version:2,revision:'test:1',issuedAt:10000,expiresAt:16000,status:'tracking',domains:['youtube.com'],allowedDomains});

test('allowed sites normalize, persist while disabled, merge with allow priority and retain old settings',()=>{
 const rules=policy.validateRules([{...rule,allowedDomains:['MUSIC.YOUTUBE.COM.','music.youtube.com']},{tagId:'other',domains:['music.youtube.com']}]);
 assert.deepEqual(rules[0].allowedDomains,['music.youtube.com']);
 assert.deepEqual(policy.selectAllowedDomains(['music','other'],rules),['music.youtube.com']);
 assert.deepEqual(policy.selectAllowedDomains(['other'],rules),[]);
 const disabled=policy.validateRules([{...rule,allowSitesEnabled:false}]);
 assert.deepEqual(disabled[0].allowedDomains,['music.youtube.com']);assert.deepEqual(policy.selectAllowedDomains(['music'],disabled),[]);
 assert.deepEqual(policy.loadSettings({version:3,rules:disabled}).rules,disabled);
 assert.deepEqual(policy.loadSettings({version:2,rules:[{tagId:'old',domains:['youtube.com'],apps:[]}]}).rules,[{tagId:'old',domains:['youtube.com'],apps:[]}]);
 for(const invalid of [{allowedDomains:['https://music.youtube.com']},{allowSitesEnabled:'true'},{allowedDomains:'music.youtube.com'}])assert.throws(()=>policy.validateRules([{...rule,...invalid}]));
 assert.throws(()=>policy.validateRules([{...rule,allowedDomains:Array.from({length:501},(_,i)=>`sub${i}.example.org`)}]));
});

test('form saves allowed list and toggle without losing sites or apps',()=>{
 const saved=prepareSettings([{...rule,domains:'youtube.com',allowedDomains:'MUSIC.YOUTUBE.COM\n',allowSitesEnabled:false}]);
 assert.deepEqual(saved.rules[0],{...rule,allowSitesEnabled:false});
 assert.throws(()=>prepareSettings([{...rule,domains:'youtube.com',allowedDomains:'https://music.youtube.com'}]),e=>e.field==='allowedDomains'&&e.rowIndex===0);
});

test('matching and DNR share domain-boundary exclusions; malformed new leases release protection',()=>{
 assert.equal(policy.isBlockedSite('https://music.youtube.com/', ['youtube.com'],['music.youtube.com']),false);
 assert.equal(policy.isBlockedSite('https://sub.music.youtube.com/', ['youtube.com'],['music.youtube.com']),false);
 for(const url of ['https://youtube.com/','https://www.youtube.com/','https://notmusic.youtube.com/'])assert.equal(policy.isBlockedSite(url,['youtube.com'],['music.youtube.com']),true);
 assert.equal(policy.isBlockedSite('https://music.youtube.com.evil.org/',['youtube.com'],['music.youtube.com']),false);
 assert.deepEqual(policy.makeDnrRules(['youtube.com'],['music.youtube.com'])[0].condition.excludedRequestDomains,['music.youtube.com']);
 assert.deepEqual(policy.effectiveState(lease(['music.youtube.com']),11000).allowedDomains,['music.youtube.com']);
 for(const allowedDomains of [undefined,'music.youtube.com',['https://bad.example']])assert.deepEqual(policy.effectiveState(lease(allowedDomains),11000).domains,[]);
 assert.deepEqual(policy.effectiveState({...lease(['music.youtube.com']),status:'break'},11000).allowedDomains,[]);
});

test('an allowed-site change restores existing tabs, reblocks when disabled, and does not churn unchanged DNR',async()=>{
 const chrome=fakeChrome([{id:1,url:'https://music.youtube.com/'},{id:2,url:'https://www.youtube.com/'},{id:3,url:'https://example.org/'}]);
 const e=createEnforcer(chrome,()=>11000);await e.apply(lease([]));assert.equal(chrome.inspect().tabs[0].url,'chrome-extension://test/blocked.html');
 await e.apply(lease(['music.youtube.com']));assert.equal(chrome.inspect().tabs[0].url,'https://music.youtube.com/');assert.equal(chrome.inspect().tabs[1].url,'chrome-extension://test/blocked.html');
 await e.checkTab(1);assert.equal(chrome.inspect().tabs[0].url,'https://music.youtube.com/');
 let writes=0;const original=chrome.declarativeNetRequest.updateSessionRules;chrome.declarativeNetRequest.updateSessionRules=async v=>{writes++;return original(v);};
 await e.apply({...lease(['music.youtube.com']),revision:'test:2'});assert.equal(writes,0);
 await e.apply(lease([]));assert.equal(chrome.inspect().tabs[0].url,'chrome-extension://test/blocked.html');
 await e.clear();assert.equal(chrome.inspect().rules.length,0);assert.equal(chrome.inspect().tabs[0].url,'https://music.youtube.com/');
});

test('controller carries only active-tag exceptions and clears them on break/stop; live toggles preserve apps',async()=>{
 let saved;const c=createController({api:{},now:()=>10000,sessionId:'allow',transport:{loadRules:async()=>({version:3,rules:[rule,{tagId:'other',domains:['music.youtube.com']}]}),saveRules:async s=>saved=s,write:async()=>({browsers:[]})}});
 await c.initialize();await c.currentTaskChange({current:{id:'task',tagIds:['music','other']}});
 assert.equal(c.getState().version,2);assert.deepEqual(c.getState().allowedDomains,['music.youtube.com']);assert.deepEqual(c.getState().apps,rule.apps);
 await c.saveRules([{...rule,allowSitesEnabled:false}]);assert.equal(saved.version,3);assert.deepEqual(c.getState().allowedDomains,[]);assert.deepEqual(c.getState().apps,rule.apps);
 await c.saveRules([rule]);assert.deepEqual(c.getState().allowedDomains,['music.youtube.com']);
 await c.action({action:'[FocusMode] Start Break'});assert.deepEqual(c.getState().allowedDomains,[]);
 await c.action({action:'[FocusMode] Start Session'});assert.deepEqual(c.getState().allowedDomains,['music.youtube.com']);
 await c.currentTaskChange({current:null});assert.deepEqual(c.getState().allowedDomains,[]);
});
