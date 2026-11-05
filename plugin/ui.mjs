import {prepareSettings} from './form.mjs';
import {createViewRefresh} from './view-refresh.mjs';
import {initializeNativeAppearance,nativeButton,nativeTagPicker,nativeSection} from './native.mjs';
import {createTargetSection} from './targets.mjs';
import {createAutoSave} from './autosave.mjs';
import {createRuleMenu} from './rule-menu.mjs';

let tags=[],loaded=false,rowSequence=0;
const pending=new Map();
function call(message){
  const messageId=crypto.randomUUID();
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(messageId);reject(Error('接続がタイムアウトしました。'));},8000);
    pending.set(messageId,{resolve,reject,timer});window.parent.postMessage({type:'PLUGIN_MESSAGE',messageId,message},'*');
  });
}
window.addEventListener('message',event=>{
  if(event.source!==window.parent)return;
  const item=pending.get(event.data?.messageId);if(!item)return;
  clearTimeout(item.timer);pending.delete(event.data.messageId);
  if(event.data.type==='PLUGIN_MESSAGE_RESPONSE')item.resolve(event.data.result);
  else item.reject(Error(typeof event.data.error==='string'?event.data.error:'操作に失敗しました。'));
});
const byId=id=>document.getElementById(id);
function text(id,value){const element=byId(id);if(element.textContent!==value)element.textContent=value;}
await initializeNativeAppearance(document,window.parent);
const connection=nativeSection('状態',false);connection.root.id='status-panel';
connection.header.append(nativeButton({id:'reconnect',icon:'refresh',label:'再接続',iconOnly:true}));
connection.content.innerHTML='<dl class="status-rows"><dt>計測</dt><dd id="status" role="status">確認中</dd><dt>タグ</dt><dd id="active">—</dd><dt>サイト</dt><dd id="active-sites">—</dd><dt>許可サイト</dt><dd id="active-allowed-sites">—</dd><dt>アプリ</dt><dd id="active-apps">—</dd><dt>Windows</dt><dd id="bridge">—</dd><dt>ブラウザ</dt><dd id="browser">—</dd><dt>アプリ遮断</dt><dd id="app-protection">—</dd></dl>';
byId('connection').append(connection.root);
const addButton=nativeButton({id:'add',label:'タグを追加',icon:'add'});addButton.classList.replace('mat-mdc-button','mat-mdc-outlined-button');addButton.classList.add('mdc-button--outlined');addButton.disabled=true;byId('add-slot').append(addButton);
const retryButton=nativeButton({id:'retry-save',label:'再試行',icon:'refresh'});byId('retry-slot').append(retryButton);retryButton.hidden=true;
function showError(message,retry=false){byId('save-error').hidden=!message;text('message',message);retryButton.hidden=!retry;}
const autosave=createAutoSave({
  save:data=>call({type:'save',...data}),
  onSaved:()=>{showError('');void viewRefresh.refresh();},
  onError:()=>showError('保存できません。',true)
});
window.addEventListener('pagehide',event=>{if(!event.persisted)autosave.dispose();});
function updateEmpty(){byId('rules-empty').hidden=byId('rules').children.length>0;}
function updateRow(row){
  const select=row.querySelector('.tag-select'),title=tags.find(tag=>tag.id===select.value)?.title;
  const name=title||(select.value?'削除されたタグ':'タグを選択');row.querySelector('.rule-title').textContent=name;row.setAttribute('aria-label',name+' の禁止リスト');row.querySelector('.remove-rule').setAttribute('aria-label',name+' の設定を削除');
}
function addRow(rule={tagId:'',domains:[],apps:[]}){
  const part=nativeSection('タグ'),row=part.root;row.classList.add('rule');part.title.classList.add('rule-title');row.setAttribute('role','group');
  const select=document.createElement('select');select.className='tag-select';select.id='tag-'+(++rowSequence);select.setAttribute('aria-label','禁止リストを設定するタグ');
  select.append(new Option('選択',''));for(const tag of tags)select.append(new Option(tag.title,tag.id));
  if(rule.tagId&&!tags.some(tag=>tag.id===rule.tagId))select.append(new Option('削除されたタグ（ルールを削除してください）',rule.tagId));select.value=rule.tagId;
  const picker=nativeTagPicker(select,()=>tags);part.header.insertBefore(picker,part.title);
  const remove=nativeButton({label:'このタグの設定を削除',icon:'delete',iconOnly:true});remove.classList.add('remove-rule');part.header.append(remove);
  const sites=createTargetSection({title:'サイト',kind:'domain',values:rule.domains,onCommit:requestSave});
  const allowed=createTargetSection({title:'許可するサイト',kind:'domain',values:rule.allowedDomains||[],onCommit:requestSave});
  row.allowSitesEnabled=rule.allowSitesEnabled===true;allowed.root.hidden=!row.allowSitesEnabled;
  part.header.append(createRuleMenu({id:select.id,enabled:row.allowSitesEnabled,onChange:enabled=>{row.allowSitesEnabled=enabled;if(!enabled)allowed.cancelDraft();allowed.root.hidden=!enabled;requestSave();}}));
  const apps=createTargetSection({title:'アプリ',kind:'executable',values:(rule.apps||[]).map(app=>app.executable),onCommit:requestSave});
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
    autosave.invalidate();const row=rows[error.rowIndex];showError((row?row.querySelector('.rule-title').textContent+'：':'')+error.message);
    if(row){row.expandNative();if(error.field==='tag'){const input=row.querySelector('select');input.setAttribute('aria-invalid','true');const picker=input.closest('.tag-picker');picker.syncNative();picker.focusControl.focus();}else(row.targets[error.field==='domains'?'sites':error.field==='allowedDomains'?'allowed':'apps']).focus();}
  }
}
async function updateStatus(){
  try{
    const state=await call({type:'status'});tags=state.tags;
    if(!loaded&&state.ready){
      if(!state.settingsLoaded){showError('設定を読み込めません。本体を再読み込みしてください。');connection.header.classList.add('connection-problem');text('status','読込エラー');return;}
      for(const rule of state.rules)addRow(rule);autosave.setBaseline({rules:state.rules});loaded=true;addButton.disabled=false;updateEmpty();
    }
    const missing=state.helperRequired&&(!state.bridgeConnected||(state.domains.length>0&&!state.browsers.some(browser=>browser.protection==='active'))||((state.apps||[]).length>0&&['unavailable','error'].includes(state.appProtection?.status)));
    byId('status-panel').dataset.state=state.status;connection.header.classList.toggle('connection-problem',!!missing||state.status==='error');
    text('status',({unknown:'未確認',stopped:'停止中',break:'休憩中',tracking:missing?'計測中・未保護':'計測中',error:'更新エラー'})[state.status]||'不明');byId('status').classList.toggle('protection-error',!!missing||state.status==='error');
    byId('status').title=state.status==='unknown'?'タスクを停止して再生してください':'';
    text('active',state.activeTagIds.map(id=>tags.find(tag=>tag.id===id)?.title).filter(Boolean).map(name=>'#'+name).join('、')||'なし');text('active-sites',state.domains.join('、')||'なし');text('active-apps',(state.apps||[]).map(app=>app.executable).join('、')||'なし');
    text('active-allowed-sites',(state.allowedDomains||[]).join('、')||'なし');
    const removed=state.removedWarningApps||[];byId('migration-notice').hidden=!removed.length;text('migration-notice',removed.length?'旧「警告のみ」は除外しました：'+removed.join('、'):'');
    text('bridge',!state.helperRequired?'待機':state.bridgeConnected?'接続済み':'未接続・未保護');byId('bridge').classList.toggle('protection-error',state.helperRequired&&!state.bridgeConnected);byId('reconnect').disabled=!state.helperRequired;
    const protectedCount=state.browsers.filter(browser=>browser.protection==='active').length,errors=state.browsers.filter(browser=>browser.protection==='error').length;
    text('browser',!state.domains.length?'対象なし':errors?'遮断エラー':state.browsers.length?`${state.browsers.length}接続 ／ ${protectedCount}遮断確認`:'未接続・未保護');byId('browser').classList.toggle('protection-error',state.domains.length>0&&(errors>0||!state.browsers.length));
    const app=state.appProtection||{};text('app-protection',({idle:'待機中',updating:'状態を反映中',monitoring:'動作中',error:'対応できない対象があります',unavailable:'未接続・保護できていません'}[app.status]||'未確認')+(app.detail?' ／ '+app.detail:''));byId('app-protection').classList.toggle('protection-error',app.status==='error'||app.status==='unavailable');
  }catch{connection.header.classList.add('connection-problem');text('status','接続エラー');for(const id of ['bridge','browser','app-protection'])text(id,'未確認');}
}
addButton.addEventListener('click',()=>addRow().focus());retryButton.addEventListener('click',requestSave);
byId('reconnect').addEventListener('click',async()=>{try{await call({type:'reconnect'});await viewRefresh.refresh();}catch{showError('再接続できません。');}});
const viewRefresh=createViewRefresh({document,window,refresh:updateStatus});
