import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDomain, validateRules, matchesDomain, effectiveState, selectDomains} from '../shared/policy.mjs';

test('domain input normalizes case, trailing dot and IDN, rejects URLs/credentials/ports/wildcards', () => {
  assert.equal(normalizeDomain(' YouTube.COM. '), 'youtube.com');
  assert.equal(normalizeDomain('日本語.jp'), 'xn--wgv71a119e.jp');
  for (const input of ['https://youtube.com','youtube.com/path','foo@youtube.com','*.youtube.com','youtube.com:80','youtube.com?token=secret','127.0.0.1','localhost','-bad.com','a..com']) assert.throws(() => normalizeDomain(input));
});
test('domain boundaries permit unrelated domains and include subdomains only', () => {
  for (const url of ['https://youtube.com/','https://music.youtube.com/','https://YOUTUBE.COM./']) assert.ok(matchesDomain(url,['youtube.com']));
  for (const url of ['https://notyoutube.com/','https://youtube.com.evil.org/','https://example.org/?q=youtube.com','chrome://youtube.com']) assert.equal(matchesDomain(url,['youtube.com']),false);
});
test('multiple real tag IDs combine and deduplicate, no tag has no block list', () => {
  const rules=validateRules([{tagId:'a',domains:['youtube.com','youtube.com']},{tagId:'b',domains:['steamcommunity.com','youtube.com']}]);
  assert.deepEqual(selectDomains(['a','b'],rules),['steamcommunity.com','youtube.com']);
  assert.deepEqual(selectDomains([],rules),[]);
  assert.throws(() => validateRules([{tagId:'a',domains:[]},{tagId:'a',domains:[]}]));
});
test('leases expire; malformed, future, excessive lifetime and break states never block', () => {
  const s={version:1,revision:'a',issuedAt:10000,expiresAt:16000,status:'tracking',domains:['youtube.com']};
  assert.equal(effectiveState(s,11000).domains.length,1);
  for(const changed of [{expiresAt:11000},{issuedAt:15000},{expiresAt:17000},{version:2},{domains:['youtube.com/secret']},{status:'other'}]) assert.deepEqual(effectiveState({...s,...changed},11000).domains,[]);
  assert.deepEqual(effectiveState({...s,status:'break'},11000).domains,[]);
});
