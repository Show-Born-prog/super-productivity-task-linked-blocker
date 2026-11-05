import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import{readFile}from'node:fs/promises';

const localizer=(await readFile('extension/localize.mjs','utf8')).replace(/^export /gm,'');
const popup=(await readFile('extension/popup.mjs','utf8')).replace(/^import .*;\r?\n/gm,'');
const blocked=(await readFile('extension/blocked.mjs','utf8')).replace(/^import .*;\r?\n/gm,'');
async function render(locale,page,state,fail=false){
  const catalog=JSON.parse(await readFile(`dist/extension/_locales/${locale==='zh-TW'?'zh_TW':locale==='fr'?'en':locale}/messages.json`,'utf8'));
  const messages=JSON.parse(await readFile(`locales/${locale==='fr'?'en':locale}.json`,'utf8'));
  const elements={status:{dataset:{}}};
  const translated=[{dataset:{i18n:'product.name'}},{dataset:{i18n:page==='blocked'?'extension.taskRunning':'product.name'}}];
  const document={documentElement:{},querySelector:selector=>elements[selector.slice(1)],querySelectorAll:()=>translated,createElement:()=>({})};
  const chrome={i18n:{getUILanguage:()=>locale,getMessage(key,substitutions=[]){const entry=catalog[key];return entry?.message.replace(/\$(\w+)\$/g,(_,name)=>{const position=entry.placeholders?.[name]?.content;return position?substitutions[+position.slice(1)-1]:'';})||'';}},runtime:{async sendMessage(message){assert.deepEqual(JSON.parse(JSON.stringify(message)),{type:'status'});if(fail==='pending')return new Promise(()=>{});if(fail)throw Error('unavailable');return state;}}};
  const operation=vm.runInNewContext(`(async()=>{${localizer}\n${page==='popup'?popup:blocked}})()`,{chrome,document});if(fail!=='pending')await operation;
  return{elements,document,translated,messages};
}
test('popup shows a localized quiet identity and transport connection status independent of blocking or task state',async()=>{
 for(const locale of ['ja','en','zh-TW'])for(const connected of [true,false])for(const status of ['tracking','break','stopped','unknown','error','disconnected']){
   const state={connected,status,domains:['example.org']};
   const result=await render(locale,'popup',state);assert.equal(result.translated[1].textContent,result.messages['product.name']);assert.equal(result.document.documentElement.lang,locale);assert.equal(result.elements.status.textContent,result.messages[connected?'extension.connected':'extension.disconnected']);assert.equal(result.elements.status.dataset.connection,connected?'connected':'disconnected');assert.deepEqual(state,{connected,status,domains:['example.org']});
 }
 for(const locale of ['ja','en','zh-TW'])for(const[invalid,fail]of[[null,true],[null,false],[{},false],[{connected:'true'},false]]){const result=await render(locale,'popup',invalid,fail);assert.equal(result.elements.status.textContent,result.messages['extension.unavailable']);assert.equal(result.elements.status.dataset.connection,'error');}
 for(const locale of ['ja','en','zh-TW']){const result=await render(locale,'popup',null,'pending');assert.equal(result.elements.status.textContent,result.messages['extension.checking']);}
 const html=await readFile('extension/popup.html','utf8');assert.doesNotMatch(html,/<h1\b|<ul\b|id="(?:domains|settings-hint)"/);assert.match(html,/class="identity"/);assert.match(html,/icons\/icon16\.png/);assert.match(html,/role="status"/);
});
test('blocked page uses only the brief translated heading and unsupported locales fall back to English',async()=>{
 for(const locale of ['ja','en','zh-TW','fr']){const result=await render(locale,'blocked');assert.equal(result.translated[1].textContent,result.messages['extension.taskRunning']);assert.equal(result.document.documentElement.lang,locale==='fr'?'en':locale);}
});
