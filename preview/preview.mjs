import {nativeButton,nativeSection,nativeTagPicker} from '/native.mjs';

// Preview data only. Autosaved to its own browser key; never connects to the plugin or helper.
const tags=[{id:'a',title:'Software development'},{id:'b',title:'FG-検証B'}];
const samples=[{tagId:'a',domains:['youtube.com'],apps:[]},{tagId:'b',domains:['example.org'],apps:['discord.exe','steam.exe']}];
const $=id=>document.getElementById(id);
const saveError=message=>{$('message').textContent=message;$('message').hidden=!message;};
const storageKey='focus-guard:appearance-preview:v1';
function loadPreview(){
  try{const saved=JSON.parse(localStorage.getItem(storageKey));if(Array.isArray(saved)&&saved.every(rule=>typeof rule?.tagId==='string'&&Array.isArray(rule.domains)&&Array.isArray(rule.apps)&&[...rule.domains,...rule.apps].every(value=>typeof value==='string')))return saved;}catch{/* The sample remains available when browser storage is unavailable. */}
  return samples;
}
const changed=()=>{
  if(document.querySelector('.entry-row'))return;
  const rules=[...$('rules').children].map(row=>{const sections=row.querySelectorAll('.target-section');return{tagId:row.querySelector('select').value,domains:[...sections[0].querySelectorAll('.target-label')].map(e=>e.textContent),apps:[...sections[1].querySelectorAll('.target-label')].map(e=>e.textContent)};});
  try{const value=JSON.stringify(rules);if(localStorage.getItem(storageKey)!==value)localStorage.setItem(storageKey,value);saveError('');}
  catch{saveError('保存できません');}
};
const scope=element=>{element.setAttribute('_ngcontent-fg-preview-task','');return element;};

function targetSection(title,values,placeholder){
  const section=document.createElement('section');section.className='target-section';
  const header=document.createElement('div');header.className='target-heading';
  const label=document.createElement('span');label.textContent=title+' ';
  const count=document.createElement('span');count.className='target-count';label.append(count);
  const add=nativeButton({label:title+'を追加',icon:'add',iconOnly:true});header.append(label,add);
  const list=document.createElement('div');list.className='target-list';list.setAttribute('role','list');list.setAttribute('aria-label',title);section.append(header,list);
  let draft;
  const refresh=()=>{list.classList.toggle('empty-section',list.children.length===0);count.textContent=`(${list.querySelectorAll('.target-row:not(.entry-row)').length})`;};
  function shell(){
    const row=document.createElement('task');row.className='target-row';row.setAttribute('_nghost-fg-preview-task','');row.setAttribute('role','listitem');
    const wrapper=scope(document.createElement('div'));wrapper.className='inner-wrapper';const line=scope(document.createElement('div'));line.className='first-line';wrapper.append(line);row.append(wrapper);list.append(row);return{row,line};
  }
  function edit(existing){
    if(draft){draft.focus();return;}
    const original=existing?.textContent||'';const item=existing?{row:existing.closest('task'),line:existing.closest('.first-line')}:shell();
    const previous=[...item.line.childNodes];item.line.replaceChildren();item.row.classList.add('entry-row');
    const input=document.createElement('input');input.className='entry-input';input.placeholder=placeholder;input.value=original;input.setAttribute('aria-label',title+'を入力');draft=input;
    const done=nativeButton({label:'追加・確定',icon:'check',iconOnly:true});const cancel=nativeButton({label:'キャンセル',icon:'close',iconOnly:true});
    let closed=false;const editEvents=new AbortController();
    const end=commit=>{
      if(closed)return;closed=true;editEvents.abort();
      if(commit&&input.value.trim()){const value=input.value.trim(),next=item.row.nextSibling;item.row.remove();const added=addValue(value);if(next)list.insertBefore(added,next);}
      else if(existing){item.line.replaceChildren(...previous);item.row.classList.remove('entry-row');}
      else item.row.remove();draft=undefined;refresh();changed();
    };
    done.addEventListener('click',()=>{end(true);add.focus();});cancel.addEventListener('click',()=>{end(false);add.focus();});input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();end(true);add.focus();}if(event.key==='Escape'){end(false);add.focus();}});item.line.addEventListener('focusout',event=>{if(!item.line.contains(event.relatedTarget))end(true);},{signal:editEvents.signal});item.line.append(input,done,cancel);input.focus();
  }
  function addValue(value){
    const {row,line}=shell();const text=document.createElement('span');text.className='target-label';text.textContent=value;text.tabIndex=0;text.setAttribute('role','button');text.setAttribute('aria-label',value+'を編集');text.addEventListener('click',()=>edit(text));text.addEventListener('keydown',event=>{if(event.key==='Enter')edit(text);});
    const remove=nativeButton({label:value+'を削除',icon:'delete',iconOnly:true});remove.classList.add('row-remove');remove.addEventListener('click',()=>{row.remove();changed();refresh();});line.append(text,remove);return row;
  }
  for(const value of values)addValue(value);refresh();add.addEventListener('click',()=>edit());
  return {root:section};
}

function addRule(rule){
  const part=nativeSection('タグ');part.root.classList.add('rule');part.title.classList.add('rule-title');
  const select=document.createElement('select');select.id='tag-'+crypto.randomUUID();select.className='tag-select';
  select.append(new Option('選択',''));for(const tag of tags)select.append(new Option(tag.title,tag.id));select.value=rule.tagId;
  const picker=nativeTagPicker(select,()=>tags);part.header.insertBefore(picker,part.title);
  const remove=nativeButton({label:'このタグの設定を削除',icon:'delete',iconOnly:true});remove.addEventListener('click',()=>{part.root.querySelectorAll(':popover-open').forEach(menu=>menu.hidePopover());part.root.remove();changed();});part.header.append(remove);
  const update=()=>{part.title.textContent=tags.find(tag=>tag.id===select.value)?.title||'タグを選択';};
  const sites=targetSection('サイト',rule.domains,'example.com'),apps=targetSection('アプリ',rule.apps,'app.exe');part.content.append(sites.root,apps.root);select.addEventListener('change',()=>{update();changed();});update();$('rules').append(part.root);
}

for(const sample of loadPreview())addRule(sample);
const addTag=nativeButton({label:'タグを追加',icon:'add'});addTag.classList.replace('mat-mdc-button','mat-mdc-outlined-button');addTag.classList.add('mdc-button--outlined');addTag.addEventListener('click',()=>{addRule({tagId:'',domains:[],apps:[]});changed();});$('add-slot').append(addTag);
const theme=nativeButton({label:'明暗を切替',icon:'dark_mode',iconOnly:true});theme.addEventListener('click',()=>{const dark=document.body.classList.toggle('isDarkTheme');document.body.classList.toggle('isLightTheme',!dark);});$('theme-slot').append(theme);
const state=nativeSection('状態',false);state.root.id='status-panel';const detail=document.createElement('p');detail.className='status-detail';detail.textContent='計測：停止中 ／ Windows：待機 ／ ブラウザ：対象なし';state.content.append(detail);$('connection').append(state.root);
