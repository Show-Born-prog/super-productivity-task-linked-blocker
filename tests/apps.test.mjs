import test from 'node:test';
import assert from 'node:assert/strict';
import * as policy from '../shared/policy.mjs';
test('app names are normalized, paths and control applications are rejected',()=>{
 assert.equal(policy.normalizeExecutable(' Steam.EXE '),'steam.exe');
 for(const name of ['C:\\Games\\steam.exe','steam','*.exe','explorer.exe','Super Productivity.exe','FocusGuard.Bridge.exe'])assert.throws(()=>policy.normalizeExecutable(name));
});
test('block-only app lists combine and preserve domain-only settings',()=>{
 const rules=policy.validateRules([{tagId:'a',domains:['example.org'],apps:[{executable:'Steam.EXE'}]},{tagId:'b',domains:[],apps:[{executable:'steam.exe'},{executable:'game.exe'}]}]);
 assert.deepEqual(policy.selectApps(['a','b'],rules),[{executable:'game.exe'},{executable:'steam.exe'}]);
 assert.deepEqual(policy.selectApps([],rules),[]);assert.deepEqual(policy.selectDomains(['a'],rules),['example.org']);
 assert.deepEqual(policy.selectApps(['old'],policy.validateRules([{tagId:'old',domains:['example.org']}])),[]);
 assert.throws(()=>policy.validateRules([{tagId:'a',domains:[],apps:[{executable:'steam.exe',mode:'warn'}]}]));
});
test('legacy warning registrations are excluded, never converted to forced termination',()=>{
 const migrated=policy.loadSettings({version:1,rules:[{tagId:'a',domains:['example.org'],apps:[{executable:'steam.exe',mode:'warn'},{executable:'fixture.exe',mode:'block'}]}],appSettings:{warningStyle:'central'}});
 assert.deepEqual(migrated.rules,[{tagId:'a',domains:['example.org'],apps:[{executable:'fixture.exe'}]}]);
 assert.deepEqual(migrated.removedWarningApps,['steam.exe']);
 assert.deepEqual(policy.loadSettings({version:2,rules:migrated.rules}).rules,migrated.rules);
 assert.throws(()=>policy.loadSettings({version:2,rules:[{tagId:'a',domains:[],apps:[{executable:'steam.exe',mode:'warn'}]}]}));
});
