// Appearance-only adapters for the host's emitted Material / Collapsible markup.
// No host widgets, services, persistence or Angular runtime are instantiated.
export async function initializeNativeAppearance(document,parent) {
  const anchor=document.getElementById('native-part-styles');
  const css=[];
  try {
    for(const sheet of parent.document.styleSheets){
      const globalFile=sheet.href&&/\/styles[^/]*\.css(?:$|[?#])/.test(sheet.href);
      const globalInline=!sheet.href&&sheet.ownerNode?.textContent.includes('@font-face')&&sheet.ownerNode.textContent.includes('--mat-');
      if(globalFile||globalInline){try{css.push([...sheet.cssRules].map(rule=>rule.cssText).join('\n'));}catch{/* Inaccessible optional stylesheet. */}}
    }
  }catch{/* The injected theme remains a fallback for a restricted parent. */}
  if(css.length){const global=document.createElement('style');global.textContent=css.join('\n');document.head.insertBefore(global,anchor);}
  const encoded=document.getElementById('native-css').textContent.trim();
  const bytes=Uint8Array.from(atob(encoded),character=>character.charCodeAt(0));
  anchor.textContent=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  inheritNativeTheme(document,parent);
}
export function inheritNativeTheme(document,parent) {
  try {
    const style=parent.getComputedStyle(parent.document.body);
    for(let i=0;i<style.length;i++){const key=style[i];if(key.startsWith('--'))document.body.style.setProperty(key,style.getPropertyValue(key));}
    document.body.style.fontFamily=style.fontFamily;
    for(const name of ['isDarkTheme','isLightTheme','isMaterialSymbolsLoaded'])document.body.classList.toggle(name,parent.document.body.classList.contains(name));
  }catch{/* Host-provided theme variables remain available if parent access is restricted. */}
}
export function nativeIcon(name) {
  const icon=document.createElement('mat-icon');icon.className='mat-icon notranslate material-icons mat-ligature-font mat-icon-no-color';icon.setAttribute('aria-hidden','true');icon.textContent=name;return icon;
}
export function buttonLabel(button,value) {button.querySelector('.mdc-button__label').textContent=value;}
export function nativeButton({label,icon,iconOnly=false,id}={}) {
  const button=document.createElement('button');button.type='button';if(id)button.id=id;
  button.className=iconOnly?'mdc-icon-button mat-mdc-icon-button mat-mdc-button-base':'mdc-button mat-mdc-button mat-mdc-button-base';
  button.innerHTML=`<span class="mat-mdc-button-persistent-ripple ${iconOnly?'mdc-icon-button__ripple':'mdc-button__ripple'}"></span><span class="mdc-button__label"></span><span class="mat-focus-indicator"></span><span class="mat-mdc-button-touch-target"></span>`;
  if(icon)button.insertBefore(nativeIcon(icon),button.querySelector('.mdc-button__label'));
  if(iconOnly){button.setAttribute('aria-label',label);button.title=label;}else buttonLabel(button,label);
  return button;
}
export function nativeField(control,label) {
  const field=document.createElement('mat-form-field');
  field.className='mat-mdc-form-field mat-mdc-form-field-appearance-fill mat-form-field-appearance-fill mat-primary native-field '+(control.tagName==='SELECT'?'mat-mdc-form-field-type-mat-native-select':'mat-mdc-form-field-type-mat-input');
  field.innerHTML='<div class="mat-mdc-text-field-wrapper mdc-text-field mdc-text-field--filled mdc-text-field--label-floating"><div class="mat-mdc-form-field-focus-overlay"></div><div class="mat-mdc-form-field-flex"><div class="mat-mdc-form-field-infix"><label class="mdc-floating-label mat-mdc-floating-label mdc-floating-label--float-above"></label></div></div><div class="mdc-line-ripple"></div></div><div class="mat-mdc-form-field-subscript-wrapper mat-mdc-form-field-bottom-align"></div>';
  const caption=field.querySelector('label');caption.textContent=label;caption.htmlFor=control.id;
  control.classList.add('mat-mdc-input-element','mat-mdc-form-field-input-control','mdc-text-field__input');
  field.querySelector('.mat-mdc-form-field-infix').append(control);
  const synchronize=()=>{
    const focused=(field.focusControl||control)===document.activeElement;
    field.classList.toggle('mat-focused',focused);field.classList.toggle('mat-form-field-invalid',control.getAttribute('aria-invalid')==='true');
    field.querySelector('.mdc-text-field').classList.toggle('mdc-text-field--focused',focused);
    const line=field.querySelector('.mdc-line-ripple');line.classList.toggle('mdc-line-ripple--active',focused);
  };
  for(const name of ['focus','blur','input','change'])control.addEventListener(name,synchronize);
  field.syncNative=synchronize;return field;
}
export function nativeTagPicker(select,getTags) {
  const label='タグ';const field=document.createElement('span');field.className='tag-picker';select.hidden=true;
  const trigger=nativeButton({icon:'label_outline',label:'タグを変更',iconOnly:true});trigger.classList.add('native-tag-trigger');
  trigger.id=select.id+'-trigger';trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');
  field.append(select,trigger);field.focusControl=trigger;
  const menu=document.createElement('div');menu.id=select.id+'-menu';menu.className='mat-mdc-menu-panel native-tag-menu';menu.setAttribute('popover','auto');menu.setAttribute('role','menu');menu.setAttribute('aria-label',label);trigger.setAttribute('aria-controls',menu.id);
  const content=document.createElement('div');content.className='mat-mdc-menu-content';menu.append(content);field.append(menu);
  let listeners;
  field.syncNative=()=>trigger.setAttribute('aria-invalid',String(select.getAttribute('aria-invalid')==='true'));
  const synchronize=()=>{const title=getTags().find(tag=>tag.id===select.value)?.title;const caption=title?`${title} のタグを変更`:'タグを選択';trigger.setAttribute('aria-label',caption);trigger.title=caption;field.syncNative();};
  const close=()=>{if(menu.matches(':popover-open'))menu.hidePopover();};
  menu.addEventListener('beforetoggle',event=>{if(event.newState==='closed'){listeners?.abort();trigger.setAttribute('aria-expanded','false');}});
  const open=()=>{
    content.replaceChildren();
    for(const option of select.options){
      if(!option.value)continue;
      const item=document.createElement('button');item.type='button';item.className='mat-mdc-menu-item mat-focus-indicator';item.setAttribute('role','menuitemradio');item.setAttribute('aria-checked',String(option.value===select.value));
      const check=document.createElement('mat-pseudo-checkbox');check.className='mat-pseudo-checkbox mat-pseudo-checkbox-full'+(option.value===select.value?' mat-pseudo-checkbox-checked':'');check.setAttribute('aria-hidden','true');item.append(check);
      const tag=getTags().find(tag=>tag.id===option.value);
      if(tag?.icon){const icon=/^[a-z0-9_]+$/i.test(tag.icon)?nativeIcon(tag.icon):document.createElement('span');icon.textContent=tag.icon;icon.classList.add('tag-icon');if(tag.color)icon.style.color=tag.color;item.append(icon);}
      else{const dot=document.createElement('span');dot.className='tag-dot';if(tag?.color)dot.style.background=tag.color;item.append(dot);}
      const text=document.createElement('span');text.className='mat-mdc-menu-item-text';text.textContent=tag?.title||option.textContent;item.append(text);
      item.addEventListener('click',()=>{select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));close();trigger.focus();});content.append(item);
    }
    if(!content.children.length){const empty=document.createElement('span');empty.className='mat-mdc-menu-item';empty.textContent='タグなし';content.append(empty);}
    menu.showPopover();trigger.setAttribute('aria-expanded','true');
    const rect=field.getBoundingClientRect(),width=menu.offsetWidth;
    menu.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-width-8))+'px';
    menu.style.maxHeight=Math.max(100,window.innerHeight-16)+'px';
    const height=menu.offsetHeight;menu.style.top=Math.max(8,rect.bottom+height>window.innerHeight-8?rect.top-height:rect.bottom)+'px';
    (content.querySelector('[aria-checked="true"]')||content.querySelector('button'))?.focus();
    listeners=new AbortController();window.addEventListener('resize',close,{signal:listeners.signal});document.addEventListener('scroll',event=>{if(!menu.contains(event.target))close();},{capture:true,signal:listeners.signal});
  };
  trigger.addEventListener('click',()=>menu.matches(':popover-open')?close():open());
  trigger.addEventListener('keydown',event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();open();}});
  menu.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();close();trigger.focus();return;}
    if(event.key==='Tab'){close();return;}
    const items=[...content.querySelectorAll('button')],index=items.indexOf(document.activeElement);
    const next=event.key==='ArrowDown'?(index+1)%items.length:event.key==='ArrowUp'?(index-1+items.length)%items.length:event.key==='Home'?0:event.key==='End'?items.length-1:null;
    if(next!==null){event.preventDefault();items[next]?.focus();}
  });
  for(const name of ['focus','blur'])trigger.addEventListener(name,field.syncNative);
  select.addEventListener('change',synchronize);synchronize();return field;
}
export function nativeSection(title,expanded=true) {
  const root=document.createElement('section');root.className='config-section';root.setAttribute('_ngcontent-fg-native-config-page','');
  root.innerHTML='<config-section _nghost-fg-native-config-section><collapsible _nghost-fg-native-collapsible><div class="collapsible-header" _ngcontent-fg-native-collapsible role="button" tabindex="0"><div class="collapsible-title" _ngcontent-fg-native-collapsible></div></div><div class="collapsible-panel" _ngcontent-fg-native-collapsible><div class="form-wrapper" _ngcontent-fg-native-config-section></div></div></collapsible></config-section>';
  const host=root.querySelector('collapsible'),header=root.querySelector('.collapsible-header'),caption=root.querySelector('.collapsible-title'),panel=root.querySelector('.collapsible-panel');
  caption.textContent=title;const arrow=nativeIcon('expand_more');arrow.classList.add('collapsible-expand-icon');arrow.setAttribute('_ngcontent-fg-native-collapsible','');header.prepend(arrow);
  const apply=()=>{host.classList.toggle('isExpanded',expanded);panel.hidden=!expanded;header.setAttribute('aria-expanded',String(expanded));};
  root.expandNative=()=>{expanded=true;apply();};
  const toggle=()=>{expanded=!expanded;apply();if(!expanded)root.querySelectorAll(':popover-open').forEach(menu=>menu.hidePopover());};header.addEventListener('click',event=>{if(!event.target.closest('button,input,select,textarea'))toggle();});
  header.addEventListener('keydown',event=>{if(event.target===header&&(event.key==='Enter'||event.key===' ')){event.preventDefault();toggle();}});apply();
  return {root,header,title:caption,content:root.querySelector('.form-wrapper')};
}
