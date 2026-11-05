import {createI18n} from '../shared/i18n.mjs';

let localization;
const bindings=new WeakMap();
export function configureLocalization(messages,locale){localization=createI18n(messages,locale);return localization;}
export function t(key,params){return localization.t(key,params);}
export function bindText(element,key,params={}){return bindTranslation(element,()=>t(key,typeof params==='function'?params():params));}
export function bindTranslation(element,value,attribute){
  const updates=bindings.get(element)||new Map();updates.set(attribute,value);bindings.set(element,updates);
  element.setAttribute('data-localized','');updateTranslation(element);return element;
}
function updateTranslation(element){for(const [attribute,value]of bindings.get(element)||[])if(attribute)element.setAttribute(attribute,value());else element.textContent=value();}
export function refreshTranslations(document){
  document.documentElement.lang=localization.locale;document.documentElement.dir='ltr';
  document.querySelectorAll('[data-localized]').forEach(updateTranslation);
}
