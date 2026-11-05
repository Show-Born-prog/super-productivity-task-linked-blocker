// Only this plugin's native navigation row. No host settings or data are touched.
export function installNavigationAppearance(document) {
  try {
    if(!document?.head)return()=>{};
    const id='task-linked-blocker-navigation-style';document.getElementById(id)?.remove();
    const style=document.createElement('style');style.id=id;
    const row='nav-item .nav-link:has(plugin-icon svg#task-linked-blocker-icon)';
    // Material projects its own icons outside the text wrapper. Custom plugin
    // icons remain inside it, so flatten only our wrapper to match that layout.
    style.textContent=`${row} > .mat-mdc-menu-item-text{display:contents}
${row} plugin-icon.nav-icon{margin:0;margin-inline-end:var(--mat-menu-item-spacing,16px)}
${row} plugin-icon svg#task-linked-blocker-icon{transform:scale(.75);transform-origin:center}`;
    document.head.append(style);return()=>style.remove();
  }catch{return()=>{};}
}
