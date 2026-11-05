export function resolveLocale(value) {
  const locale=String(value||'').toLowerCase().replaceAll('_','-');
  if(locale==='ja'||locale.startsWith('ja-'))return 'ja';
  if(/^zh-(?:tw|hk|mo|hant)(?:-|$)/.test(locale))return 'zh-TW';
  return 'en';
}

export function createI18n(messages,initialLocale='en') {
  let locale=resolveLocale(initialLocale);
  const number=value=>new Intl.NumberFormat(locale).format(value);
  function t(key,params={}) {
    const message=messages[locale]?.[key]??messages.en?.[key]??key;
    return message.replace(/\{(\w+)\}/g,(match,name)=>Object.hasOwn(params,name)
      ? typeof params[name]==='number'?number(params[name]):String(params[name]):match);
  }
  return {
    t,number,get locale(){return locale;},
    setLocale(value){const next=resolveLocale(value),changed=locale!==next;locale=next;return changed;},
    list(values){return values.length?new Intl.ListFormat(locale,{style:'short',type:'unit'}).format(values):t('common.none');},
    error(error){const key=typeof error==='string'?error:error?.message;return t(Object.hasOwn(messages.en,key)?key:'error.operation',error?.params);},
    detail(value){const keys=['app.terminationDenied','app.terminationPending'];const key=keys.find(k=>k===value||messages.ja?.[k]===value);return key?t(key):'';}
  };
}
