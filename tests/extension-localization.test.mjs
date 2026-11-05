import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import{readFile}from'node:fs/promises';

const localizer=(await readFile('extension/localize.mjs','utf8')).replace(/^export /gm,'');
const popup=(await readFile('extension/popup.mjs','utf8')).replace(/^import .*;\r?\n/gm,'');
const blocked=(await readFile('extension/blocked.mjs','utf8')).replace(/^import .*;\r?\n/gm,'');
async function render(locale,page,state,fail=false){
  const catalog=JSON.parse(await readFile(`dist/extension/_locales/${locale==='zh-TW'?'zh_TW':locale==='fr'?'en':locale}/messages.json`,'utf8'));
  const messages=JSON.parse(await readFile(`locales/${locale==='fr'?'en':locale}.json`,'utf8'));
  const elements={status:{},domains:{children:[],append(value){this.children.push(value);}},'settings-hint':{}};
  const translated=[{dataset:{i18n:'product.name'}},{dataset:{i18n:page==='blocked'?'extension.taskRunning':'product.name'}}];
  const document={documentElement:{},querySelector:selector=>elements[selector.slice(1)],querySelectorAll:()=>translated,createElement:()=>({})};
  const chrome={i18n:{getUILanguage:()=>locale,getMessage(key,substitutions=[]){const entry=catalog[key];return entry?.message.replace(/\$(\w+)\$/g,(_,name)=>{const position=entry.placeholders?.[name]?.content;return position?substitutions[+position.slice(1)-1]:'';})||'';}},runtime:{async sendMessage(message){assert.deepEqual(JSON.parse(JSON.stringify(message)),{type:'status'});if(fail)throw Error('unavailable');return state;}}};
  await vm.runInNewContext(`(async()=>{${localizer}\n${page==='popup'?popup:blocked}})()`,{chrome,document});
  return{elements,document,translated,messages};
}
test('popup localizes all tracking, break, stopped, unknown and failure states without changing domains',async()=>{
 for(const locale of ['ja','en','zh-TW'])for(const[status,domains,key]of[
  ['tracking',['youtube.com'],'extension.blocked'],['tracking',[],'extension.noSites'],['break',[],'extension.break'],
  ['stopped',[],'extension.stopped'],['unknown',[],'extension.unknown'],['error',[],'extension.error'],['disconnected',[],'extension.disconnected']]){
   const result=await render(locale,'popup',{status,domains});assert.equal(result.document.documentElement.lang,locale);assert.equal(result.elements.status.textContent,result.messages[key]);assert.deepEqual(result.elements.domains.children.map(li=>li.textContent),domains);assert.equal(result.translated[0].textContent,result.messages['product.name']);assert.ok(result.elements['settings-hint'].textContent.includes(result.messages['product.name']));assert.doesNotMatch(result.elements['settings-hint'].textContent,/\$name\$/);
 }
 for(const locale of ['ja','en','zh-TW']){const result=await render(locale,'popup',null,true);assert.equal(result.elements.status.textContent,result.messages['extension.unavailable']);}
});
test('blocked page uses only the brief translated heading and unsupported locales fall back to English',async()=>{
 for(const locale of ['ja','en','zh-TW','fr']){const result=await render(locale,'blocked');assert.equal(result.translated[1].textContent,result.messages['extension.taskRunning']);assert.equal(result.document.documentElement.lang,locale==='fr'?'en':locale);}
});
