// The host stores a translated menu label once, without an update API.
// Observe only its sidebar, never the task view, and touch only our own label.
export function installNavigationLocalization(document,getLabel,Observer=typeof MutationObserver==='undefined'?undefined:MutationObserver) {
  const marker='svg#task-linked-blocker-icon';
  let scope,observer,disposed=false;
  function ownMutation(record) {
    const element=record.target.nodeType===1?record.target:record.target.parentElement;
    if(element?.closest?.('nav-item')?.querySelector(marker))return true;
    return [...record.addedNodes].some(node=>node.nodeType===1&&(node.matches?.(marker)||node.querySelector?.(marker)));
  }
  function refresh() {
    if(disposed)return;
    try {
      const sidebar=document?.querySelector('magic-side-nav');
      if(!sidebar)return;
      if(scope!==sidebar){
        observer?.disconnect();scope=sidebar;
        if(Observer){observer=new Observer(records=>{if(records.some(ownMutation))refresh();});observer.observe(scope,{childList:true,subtree:true,characterData:true});}
      }
      const label=scope.querySelector(`nav-item .nav-link:has(plugin-icon ${marker})`)?.querySelector('.nav-label');
      const translated=getLabel();
      if(!label||typeof translated!=='string'||!translated||label.textContent.trim()===translated)return;
      // Retain Angular's text node so its bindings and teardown stay intact.
      if(label.firstChild?.nodeType===3)label.firstChild.nodeValue=translated;
      else label.textContent=translated;
    }catch{/* Optional appearance access must never interrupt task enforcement. */}
  }
  refresh();
  return {refresh,dispose(){disposed=true;observer?.disconnect();observer=undefined;scope=undefined;}};
}
