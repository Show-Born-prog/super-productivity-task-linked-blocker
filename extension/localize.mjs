export function extensionText(key,substitutions){return chrome.i18n.getMessage(key.replaceAll('.','_'),substitutions);}
export function localizeExtensionPage(document) {
  const locale=chrome.i18n.getUILanguage().toLowerCase().replaceAll('_','-');
  document.documentElement.lang=locale.startsWith('ja')?'ja':/^zh-(tw|hant)/.test(locale)?'zh-TW':'en';
  document.documentElement.dir='ltr';
  document.querySelectorAll('[data-i18n]').forEach(element=>{element.textContent=extensionText(element.dataset.i18n);});
}
