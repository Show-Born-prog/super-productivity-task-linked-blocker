import {nativeButton} from './native.mjs';

// Host Material menu/switch appearance only. Toggle state and persistence belong here.
export function createRuleMenu({id,enabled,onChange}) {
  const root=document.createElement('span');root.className='rule-menu';
  const trigger=nativeButton({label:'タグのオプション',icon:'more_vert',iconOnly:true});trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');
  const menu=document.createElement('div');menu.id=id+'-options';menu.className='mat-mdc-menu-panel native-rule-menu';menu.setAttribute('popover','auto');menu.setAttribute('role','menu');menu.setAttribute('aria-label','タグのオプション');trigger.setAttribute('aria-controls',menu.id);
  const content=document.createElement('div');content.className='mat-mdc-menu-content';
  const entry=document.createElement('div');entry.className='mat-mdc-menu-item mat-focus-indicator';
  const caption=document.createElement('span');caption.className='mat-mdc-menu-item-text';caption.textContent='許可サイトを追加';
  const visual=document.createElement('mat-slide-toggle');visual.className='mat-mdc-slide-toggle mat-accent';
  visual.innerHTML='<div class="mdc-form-field"><span class="mdc-switch"><div class="mat-mdc-slide-toggle-touch-target"></div><span class="mdc-switch__track"></span><span class="mdc-switch__handle-track"><span class="mdc-switch__handle"><span class="mdc-switch__shadow"><span class="mdc-elevation-overlay"></span></span><span class="mdc-switch__ripple"><span class="mat-mdc-slide-toggle-ripple mat-focus-indicator"></span></span><span class="mdc-switch__icons"><svg viewBox="0 0 24 24" class="mdc-switch__icon mdc-switch__icon--on"><path d="M19.69,5.23L8.96,15.96l-4.23-4.23L2.96,13.5l6,6L21.46,7L19.69,5.23z"></path></svg><svg viewBox="0 0 24 24" class="mdc-switch__icon mdc-switch__icon--off"><path d="M20 13H4v-2h16v2z"></path></svg></span></span></span></span></div>';
  // Keep an actual button: the host switch CSS uses :enabled for the handle.
  const oldSwitch=visual.querySelector('.mdc-switch');const item=document.createElement('button');item.type='button';item.className=oldSwitch.className;item.innerHTML=oldSwitch.innerHTML;item.setAttribute('role','menuitemcheckbox');item.setAttribute('aria-label',caption.textContent);oldSwitch.replaceWith(item);
  entry.append(caption,visual);entry.addEventListener('click',event=>{if(!event.target.closest('button'))item.click();});content.append(entry);menu.append(content);root.append(trigger,menu);
  function sync(){item.setAttribute('aria-checked',String(enabled));visual.classList.toggle('mat-mdc-slide-toggle-checked',enabled);for(const name of ['mdc-switch--selected','mdc-switch--checked'])visual.querySelector('.mdc-switch').classList.toggle(name,enabled);visual.querySelector('.mdc-switch').classList.toggle('mdc-switch--unselected',!enabled);}
  item.addEventListener('click',()=>{enabled=!enabled;sync();onChange(enabled);});
  let listeners;
  const close=()=>{if(menu.matches(':popover-open'))menu.hidePopover();};
  menu.addEventListener('beforetoggle',event=>{if(event.newState==='closed'){listeners?.abort();trigger.setAttribute('aria-expanded','false');}});
  // The invoker relationship keeps light-dismiss from closing just before click,
  // which would make a manual click handler reopen the menu on the same press.
  trigger.popoverTargetElement=menu;trigger.popoverTargetAction='toggle';
  menu.addEventListener('toggle',event=>{
    if(event.newState!=='open')return;
    trigger.setAttribute('aria-expanded','true');const rect=trigger.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(rect.right-menu.offsetWidth,window.innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(rect.bottom,window.innerHeight-menu.offsetHeight-8))+'px';item.focus();
    listeners=new AbortController();window.addEventListener('resize',close,{signal:listeners.signal});document.addEventListener('scroll',event=>{if(!menu.contains(event.target))close();},{capture:true,signal:listeners.signal});
  });
  menu.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();trigger.focus();}else if(event.key==='Tab')close();});
  sync();return root;
}
