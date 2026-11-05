import {normalizeDomain,normalizeExecutable} from '../shared/policy.mjs';
import {nativeButton} from './native.mjs';

export function createTargetSection({title,kind,values,onCommit}) {
  const section=document.createElement('section');section.className='target-section';
  const header=document.createElement('div');header.className='target-heading';
  const label=document.createElement('span');label.textContent=title+' ';
  const count=document.createElement('span');count.className='target-count';label.append(count);
  const add=nativeButton({label:title+'を追加',icon:'add',iconOnly:true});header.append(label,add);
  const list=document.createElement('div');list.className='target-list';list.setAttribute('role','list');list.setAttribute('aria-label',title);section.append(header,list);
  const records=new Map();let draft,disposed=false;
  const scope=element=>{element.setAttribute('_ngcontent-fg-native-task','');return element;};
  const getValues=()=>[...list.children].map(row=>records.get(row)?.value).filter(value=>typeof value==='string');
  const refresh=()=>{list.classList.toggle('empty-section',list.children.length===0);count.textContent=`(${getValues().length})`;};
  function remove(record){records.delete(record.row);record.row.remove();refresh();}
  function shell(value){
    const row=document.createElement('task');row.className='target-row';row.setAttribute('_nghost-fg-native-task','');row.setAttribute('role','listitem');
    const wrapper=scope(document.createElement('div'));wrapper.className='inner-wrapper';const line=scope(document.createElement('div'));line.className='first-line';wrapper.append(line);row.append(wrapper);list.append(row);
    const record={row,line,wrapper,value};records.set(row,record);return record;
  }
  function render(record){
    record.row.classList.remove('entry-row');record.error?.remove();record.line.replaceChildren();
    const text=document.createElement('span');text.className='target-label';text.textContent=record.value;text.tabIndex=0;text.setAttribute('role','button');text.setAttribute('aria-label',record.value+'を編集');
    text.addEventListener('click',()=>edit(record));text.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();edit(record);}});
    const trash=nativeButton({label:record.value+'を削除',icon:'delete',iconOnly:true});trash.classList.add('row-remove');trash.addEventListener('click',()=>{remove(record);onCommit();});record.line.append(text,trash);
  }
  function edit(existing){
    if(disposed)return;
    if(draft){draft.input.focus();return;}
    const record=existing||shell();const previous=record.value;record.row.classList.add('entry-row');record.line.replaceChildren();
    const input=document.createElement('input');input.className='entry-input';input.placeholder=kind==='domain'?'example.com':'app.exe';input.value=previous||'';input.setAttribute('aria-label',title+'を入力');input.autocomplete='off';input.spellcheck=false;
    const error=document.createElement('p');error.className='entry-error';error.id='entry-error-'+crypto.randomUUID();error.setAttribute('role','alert');error.hidden=true;input.setAttribute('aria-describedby',error.id);record.error=error;record.wrapper.append(error);
    const events=new AbortController();let closed=false;
    draft={input,abort:()=>events.abort(),cancel:()=>finish(false)};
    const finish=commit=>{
      if(closed||disposed)return false;
      let candidate=previous;
      if(commit&&input.value.trim()){
        try{
          candidate=(kind==='domain'?normalizeDomain:normalizeExecutable)(input.value);
          if([...records.values()].some(other=>other!==record&&other.value===candidate))throw Error('すでに登録されています。');
        }catch(e){input.setAttribute('aria-invalid','true');error.textContent=e.message;error.hidden=false;return false;}
      }
      closed=true;events.abort();draft=undefined;
      if(candidate===undefined)remove(record);else{record.value=candidate;render(record);refresh();}
      if(candidate!==previous)onCommit();return true;
    };
    const done=nativeButton({label:'追加・確定',icon:'check',iconOnly:true}),cancel=nativeButton({label:'キャンセル',icon:'close',iconOnly:true});
    done.addEventListener('click',()=>{if(finish(true))add.focus();else input.focus();});cancel.addEventListener('click',()=>{finish(false);add.focus();});
    input.addEventListener('input',()=>{input.removeAttribute('aria-invalid');error.hidden=true;});
    input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();if(finish(true))add.focus();}else if(event.key==='Escape'){event.preventDefault();finish(false);add.focus();}});
    record.line.addEventListener('focusout',event=>{
      if(record.line.contains(event.relatedTarget))return;
      if(event.relatedTarget?.closest('.remove-rule')?.closest('.rule')===section.closest('.rule'))return;
      finish(true);
    },{signal:events.signal});record.line.append(input,done,cancel);input.focus();
  }
  for(const value of values)render(shell(value));refresh();add.addEventListener('click',()=>edit());
  return {root:section,getValues,focus:()=>add.focus(),cancelDraft:()=>draft?.cancel(),dispose(){disposed=true;draft?.abort();}};
}
