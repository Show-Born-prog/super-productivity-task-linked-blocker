import {prepareSettings} from './form.mjs';
import {createViewRefresh} from './view-refresh.mjs';
import {initializeNativeAppearance,nativeButton,nativeTagPicker,nativeSection} from './native.mjs';
import {createTargetSection} from './targets.mjs';
import {createAutoSave} from './autosave.mjs';
import {createRuleMenu} from './rule-menu.mjs';
import {configureLocalization,t,bindText,bindTranslation,refreshTranslations} from './localization.mjs';

let tags=[],loaded=false,rowSequence=0;
const pending=new Map();
function call(message){
  const messageId=crypto.randomUUID();
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(messageId);reject(Error('error.timeout'));},8000);
    pending.set(messageId,{resolve,reject,timer});window.parent.postMessage({type:'PLUGIN_MESSAGE',messageId,message},'*');
  });
}
window.addEventListener('message',event=>{
  if(event.source!==window.parent)return;
  const item=pending.get(event.data?.messageId);if(!item)return;
  clearTimeout(item.timer);pending.delete(event.data.messageId);
  if(event.data.type==='PLUGIN_MESSAGE_RESPONSE')item.resolve(event.data.result);
  else item.reject(Error(typeof event.data.error==='string'?event.data.error:'error.operation'));
});
const byId=id=>document.getElementById(id);
function text(id,value){const element=byId(id);if(element.textContent!==value)element.textContent=value;}
const encodedMessages=byId('locale-messages').textContent.trim();
const messageBytes=Uint8Array.from(atob(encodedMessages),character=>character.charCodeAt(0));
const messages=JSON.parse(await new Response(new Blob([messageBytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
let initialLocale='en';try{initialLocale=await call({type:'locale'});}catch{}
const i18n=configureLocalization(messages,initialLocale);
bindText(byId('product-name'),'product.name');bindText(document.querySelector('title'),'product.name');bindText(byId('rules-empty'),'ui.noRules');
await initializeNativeAppearance(document,window.parent);
const connection=nativeSection(t('ui.status'),false);connection.root.id='status-panel';bindText(connection.title,'ui.status');
const reconnect=nativeButton({id:'reconnect',icon:'refresh',label:t('ui.reconnect'),iconOnly:true});for(const attribute of ['aria-label','title'])bindTranslation(reconnect,()=>t('ui.reconnect'),attribute);connection.header.append(reconnect);
const statusRows=document.createElement('dl');statusRows.className='status-rows';
for(const[id,key]of[['status','status.trackingLabel'],['active','status.tagsLabel'],['active-sites','status.sitesLabel'],['active-allowed-sites','status.allowedLabel'],['active-apps','status.appsLabel'],['bridge','status.windowsLabel'],['browser','status.browserLabel'],['app-protection','status.appProtectionLabel']]){
  const label=document.createElement('dt'),value=document.createElement('dd');bindText(label,key);value.id=id;value.textContent='—';if(id==='status'){value.setAttribute('role','status');value.textContent=t('common.checking');}statusRows.append(label,value);
}connection.content.append(statusRows);
byId('connection').append(connection.root);
const addButton=nativeButton({id:'add',label:t('ui.addTag'),icon:'add'});bindText(addButton.querySelector('.mdc-button__label'),'ui.addTag');addButton.classList.replace('mat-mdc-button','mat-mdc-outlined-button');addButton.classList.add('mdc-button--outlined');addButton.disabled=true;byId('add-slot').append(addButton);
const retryButton=nativeButton({id:'retry-save',label:t('common.retry'),icon:'refresh'});bindText(retryButton.querySelector('.mdc-button__label'),'common.retry');byId('retry-slot').append(retryButton);retryButton.hidden=true;
function showError(key,retry=false,params={}){byId('save-error').hidden=!key;bindText(byId('message'),key,params);retryButton.hidden=!retry;}
const autosave=createAutoSave({
  save:data=>call({type:'save',...data}),
  onSaved:()=>{showError('');void viewRefresh.refresh();},
  onError:()=>showError('error.save',true)
});
window.addEventListener('pagehide',event=>{if(!event.persisted)autosave.dispose();});
function updateEmpty(){byId('rules-empty').hidden=byId('rules').children.length>0;}
function updateRow(row){
  const select=row.querySelector('.tag-select'),title=tags.find(tag=>tag.id===select.value)?.title;
  const name=()=>title||t(select.value?'ui.deletedTag':'ui.selectTag');bindTranslation(row.querySelector('.rule-title'),name);bindTranslation(row,()=>t('ui.ruleName',{name:name()}),'aria-label');bindTranslation(row.querySelector('.remove-rule'),()=>t('ui.removeRule',{name:name()}),'aria-label');
}
function addRow(rule={tagId:'',domains:[],apps:[]}){
  const part=nativeSection(t('ui.tag')),row=part.root;row.classList.add('rule');part.title.classList.add('rule-title');row.setAttribute('role','group');
  const select=document.createElement('select');select.className='tag-select';select.id='tag-'+(++rowSequence);bindTranslation(select,()=>t('ui.chooseRuleTag'),'aria-label');
  const emptyOption=new Option(t('ui.selection'),'');bindText(emptyOption,'ui.selection');select.append(emptyOption);for(const tag of tags)select.append(new Option(tag.title,tag.id));
  if(rule.tagId&&!tags.some(tag=>tag.id===rule.tagId)){const missing=new Option(t('ui.deletedTagOption'),rule.tagId);bindText(missing,'ui.deletedTagOption');select.append(missing);}select.value=rule.tagId;
  const picker=nativeTagPicker(select,()=>tags);part.header.insertBefore(picker,part.title);
  const remove=nativeButton({label:t('ui.removeThisRule'),icon:'delete',iconOnly:true});bindTranslation(remove,()=>t('ui.removeThisRule'),'title');remove.classList.add('remove-rule');part.header.append(remove);
  const sites=createTargetSection({title:'ui.sites',kind:'domain',values:rule.domains,onCommit:requestSave});
  const allowed=createTargetSection({title:'ui.allowedSites',kind:'domain',values:rule.allowedDomains||[],onCommit:requestSave});
  row.allowSitesEnabled=rule.allowSitesEnabled===true;allowed.root.hidden=!row.allowSitesEnabled;
  part.header.append(createRuleMenu({id:select.id,enabled:row.allowSitesEnabled,onChange:enabled=>{row.allowSitesEnabled=enabled;if(!enabled)allowed.cancelDraft();allowed.root.hidden=!enabled;requestSave();}}));
  const apps=createTargetSection({title:'ui.apps',kind:'executable',values:(rule.apps||[]).map(app=>app.executable),onCommit:requestSave});
  row.targets={sites,allowed,apps};part.content.append(sites.root,allowed.root,apps.root);byId('rules').append(row);
  remove.addEventListener('click',()=>{row.querySelectorAll(':popover-open').forEach(menu=>menu.hidePopover());sites.dispose();allowed.dispose();apps.dispose();row.remove();updateEmpty();requestSave();});
  select.addEventListener('change',()=>{updateRow(row);requestSave();});updateRow(row);updateEmpty();return picker.focusControl;
}
function requestSave(){
  if(!loaded)return;
  // A new, completely empty tag row is a draft, not an instruction to erase rules.
  const rows=[...byId('rules').children].filter(row=>row.querySelector('select').value||row.allowSitesEnabled||row.targets.sites.getValues().length||row.targets.allowed.getValues().length||row.targets.apps.getValues().length);
  document.querySelectorAll('.tag-select[aria-invalid]').forEach(input=>{input.removeAttribute('aria-invalid');input.closest('.tag-picker').syncNative();});
  try{
    const data=prepareSettings(rows.map(row=>({tagId:row.querySelector('select').value,domains:row.targets.sites.getValues().join('\n'),allowSitesEnabled:row.allowSitesEnabled,allowedDomains:row.targets.allowed.getValues().join('\n'),apps:row.targets.apps.getValues().map(executable=>({executable}))})));
    showError('');void autosave.submit(data);
  }catch(error){
    autosave.invalidate();const row=rows[error.rowIndex];if(row)showError('ui.rowError',false,()=>({name:row.querySelector('.rule-title').textContent,message:i18n.error(error)}));else showError(error.message,false,error.params);
    if(row){row.expandNative();if(error.field==='tag'){const input=row.querySelector('select');input.setAttribute('aria-invalid','true');const picker=input.closest('.tag-picker');picker.syncNative();picker.focusControl.focus();}else(row.targets[error.field==='domains'?'sites':error.field==='allowedDomains'?'allowed':'apps']).focus();}
  }
}
async function updateStatus(){
  try{
    const state=await call({type:'status'});tags=state.tags;
    if(i18n.setLocale(state.locale))refreshTranslations(document);
    if(!loaded&&state.ready){
      if(!state.settingsLoaded){showError('error.loadSettings');connection.header.classList.add('connection-problem');text('status',t('status.loadError'));return;}
      for(const rule of state.rules)addRow(rule);autosave.setBaseline({rules:state.rules});loaded=true;addButton.disabled=false;updateEmpty();
    }
    const missing=state.helperRequired&&(!state.bridgeConnected||(state.domains.length>0&&!state.browsers.some(browser=>browser.protection==='active'))||((state.apps||[]).length>0&&['unavailable','error'].includes(state.appProtection?.status)));
    byId('status-panel').dataset.state=state.status;connection.header.classList.toggle('connection-problem',!!missing||state.status==='error');
    text('status',t(({unknown:'status.unknown',stopped:'status.stopped',break:'status.break',tracking:missing?'status.unprotected':'status.tracking',error:'status.error'})[state.status]||'common.unknown'));byId('status').classList.toggle('protection-error',!!missing||state.status==='error');
    byId('status').title=state.status==='unknown'?t('status.restartHint'):'';
    text('active',i18n.list(state.activeTagIds.map(id=>tags.find(tag=>tag.id===id)?.title).filter(Boolean).map(name=>'#'+name)));text('active-sites',i18n.list(state.domains));text('active-apps',i18n.list((state.apps||[]).map(app=>app.executable)));
    text('active-allowed-sites',i18n.list(state.allowedDomains||[]));
    const removed=state.removedWarningApps||[];byId('migration-notice').hidden=!removed.length;bindText(byId('migration-notice'),removed.length?'ui.legacyRemoved':'',()=>({apps:i18n.list(removed)}));
    text('bridge',t(!state.helperRequired?'status.standby':state.bridgeConnected?'status.connected':'status.disconnected'));byId('bridge').classList.toggle('protection-error',state.helperRequired&&!state.bridgeConnected);byId('reconnect').disabled=!state.helperRequired;
    const protectedCount=state.browsers.filter(browser=>browser.protection==='active').length,errors=state.browsers.filter(browser=>browser.protection==='error').length;
    text('browser',!state.domains.length?t('status.noSites'):errors?t('status.blockError'):state.browsers.length?t('status.browsers',{connected:state.browsers.length,protected:protectedCount}):t('status.disconnected'));byId('browser').classList.toggle('protection-error',state.domains.length>0&&(errors>0||!state.browsers.length));
    const app=state.appProtection||{},appStatus=t(({idle:'app.idle',updating:'app.updating',monitoring:'app.monitoring',error:'app.error',unavailable:'app.unavailable'})[app.status]||'status.unknown'),detail=i18n.detail(app.detail);text('app-protection',detail?t('app.withDetail',{status:appStatus,detail}):appStatus);byId('app-protection').classList.toggle('protection-error',app.status==='error'||app.status==='unavailable');
  }catch{connection.header.classList.add('connection-problem');text('status',t('status.connectionError'));for(const id of ['bridge','browser','app-protection'])text(id,t('status.unknown'));}
}
addButton.addEventListener('click',()=>addRow().focus());retryButton.addEventListener('click',requestSave);
byId('reconnect').addEventListener('click',async()=>{try{await call({type:'reconnect'});await viewRefresh.refresh();}catch{showError('error.reconnect');}});
refreshTranslations(document);
const viewRefresh=createViewRefresh({document,window,refresh:updateStatus});
