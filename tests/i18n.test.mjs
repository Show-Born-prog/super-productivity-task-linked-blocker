import test from 'node:test';import assert from 'node:assert/strict';import {readFile,readdir}from'node:fs/promises';
import{createI18n,resolveLocale}from'../shared/i18n.mjs';
import{prepareSettings}from'../plugin/form.mjs';
const locales=['en','ja','zh-TW'];const messages=Object.fromEntries(await Promise.all(locales.map(async locale=>[locale,JSON.parse(await readFile(`locales/${locale}.json`,'utf8'))])));
test('all three catalogs have matching nonempty keys and interpolation parameters',()=>{
  const keys=Object.keys(messages.en).sort();
  for(const locale of locales){assert.deepEqual(Object.keys(messages[locale]).sort(),keys);for(const key of keys){assert.equal(typeof messages[locale][key],'string');assert.ok(messages[locale][key].trim());assert.deepEqual((messages[locale][key].match(/\{\w+\}/g)||[]).sort(),(messages.en[key].match(/\{\w+\}/g)||[]).sort(),`${locale}: ${key}`);}}
});
test('locale aliases, English fallback, safe interpolation and number formatting',()=>{
  for(const alias of ['ja','ja-JP','ja_JP'])assert.equal(resolveLocale(alias),'ja');
  for(const alias of ['zh-tw','zh_TW','zh-Hant','zh-Hant-TW','zh-HK','zh-MO'])assert.equal(resolveLocale(alias),'zh-TW');
  for(const alias of ['en-GB','fr',undefined,'zh','zh-CN','zh-Hans'])assert.equal(resolveLocale(alias),'en');
  const i18n=createI18n(messages,'ja');assert.equal(i18n.t('extension.taskRunning'),'タスク進行中');assert.equal(i18n.setLocale('en-GB'),true);assert.equal(i18n.t('extension.taskRunning'),'Task in progress');assert.equal(i18n.setLocale('en-US'),false);
  assert.equal(i18n.t('ui.editTarget',{value:'$& <tag> {name}'}),'Edit $& <tag> {name}');assert.equal(i18n.t('ui.count',{count:1000}),'(1,000)');assert.equal(i18n.t('ui.count',{count:0}),'(0)');
  assert.equal(createI18n({...messages,ja:{}},'ja').t('extension.taskRunning'),'Task in progress');assert.equal(i18n.t('missing.key'),'missing.key');
});
test('known errors and old helper details localize without exposing raw errors',()=>{
  for(const locale of locales){const i18n=createI18n(messages,locale);assert.equal(i18n.error(new Error('validation.domainOnly')),messages[locale]['validation.domainOnly']);assert.equal(i18n.error(new Error('private-path secret')),messages[locale]['error.operation']);assert.equal(i18n.detail(messages.ja['app.terminationDenied']),messages[locale]['app.terminationDenied']);assert.equal(i18n.detail('app.terminationPending'),messages[locale]['app.terminationPending']);}
});
test('validation keeps its field location and limit parameters in every language',()=>{
  for(const locale of locales){const i18n=createI18n(messages,locale);assert.throws(()=>prepareSettings([{tagId:'tag',domains:'https://example.org',apps:[]}]),error=>error.field==='domains'&&error.rowIndex===0&&i18n.error(error)===messages[locale]['validation.domainOnly']);}
  assert.throws(()=>prepareSettings([{tagId:'tag',domains:Array.from({length:501},(_,i)=>`${i}.example.org`).join('\n'),apps:[]}]),error=>error.message==='validation.domainLimit'&&error.params.max===500);
});
test('runtime sources contain no Japanese UI literals and reference existing translation keys',async()=>{
  const sources=[];for(const directory of ['plugin','extension','shared','bridge'])for(const name of await readdir(directory))if(/\.(?:mjs|html|cs)$/.test(name))sources.push([directory+'/'+name,await readFile(directory+'/'+name,'utf8')]);
  for(const[file,source]of sources){assert.doesNotMatch(source,/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u,file);for(const match of source.matchAll(/['"]((?:ui|status|app|validation|common|product|error|extension)\.[A-Za-z]\w+)['"]/g)){
    if(match[1]==='app.exe')continue; // Executable input example, not a translation key.
    assert.ok(Object.hasOwn(messages.en,match[1]),`${file}: ${match[1]}`);
  }}
});
