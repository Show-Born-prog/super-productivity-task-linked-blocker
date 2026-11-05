import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';import{gunzipSync}from'node:zlib';
test('plugin and Chrome distribute matching three-language catalogs without new permissions',async()=>{
 const plugin=JSON.parse(await readFile('dist/plugin/manifest.json','utf8')),extension=JSON.parse(await readFile('dist/extension/manifest.json','utf8'));
 assert.deepEqual(plugin.i18n.languages,['en','ja','zh-tw']);assert.equal(extension.default_locale,'en');assert.deepEqual(extension.permissions,['declarativeNetRequest','tabs','alarms']);assert.deepEqual(plugin.permissions,['getTasks','getAllTags','nodeExecution']);
 const html=await readFile('dist/plugin/index.html','utf8');const packed=html.match(/<script id="locale-messages" type="application\/gzip">([^<]+)<\/script>/);assert.ok(packed);const embedded=JSON.parse(gunzipSync(Buffer.from(packed[1],'base64')));
 for(const locale of ['en','ja','zh-TW']){
  const source=JSON.parse(await readFile(`locales/${locale}.json`,'utf8'));assert.deepEqual(embedded[locale],source);
  const host=locale==='zh-TW'?'zh-tw':locale;assert.ok(plugin.assets.includes(`i18n/${host}.json`));const native=JSON.parse(await readFile(`dist/plugin/i18n/${host}.json`,'utf8'));assert.equal(native.PLUGIN.NAME,source['product.name']);assert.equal(native.PLUGIN.DESCRIPTION,source['product.description']);
  const chrome=JSON.parse(await readFile(`dist/extension/_locales/${locale==='zh-TW'?'zh_TW':locale}/messages.json`,'utf8'));assert.equal(chrome.product_name.message,source['product.name']);assert.equal(chrome.extension_taskRunning.message,source['extension.taskRunning']);assert.equal(chrome.extension_connected.message,source['extension.connected']);assert.equal(chrome.extension_settingsHint,undefined,'removed popup explanations must not remain in distribution catalogs');
  if(locale==='zh-TW'){assert.equal(chrome.product_name.message,'工作連動封鎖工具');assert.equal(chrome.extension_taskRunning.message,'工作進行中');}
 }
 assert.match(await readFile('dist/extension/blocked.html','utf8'),/<h1 data-i18n="extension.taskRunning">Task in progress<\/h1>/);
});
