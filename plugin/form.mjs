import {normalizeExecutable,normalizeDomain,validateRules} from '../shared/policy.mjs';

export function prepareSettings(rows) {
  const seen=new Set();
  const fail=(message,rowIndex,field,appIndex)=>{throw Object.assign(message instanceof Error?message:new Error(message),{rowIndex,field,appIndex});};
  const rules=rows.map((row,rowIndex)=>{
    if (!row.tagId) fail('validation.selectTag',rowIndex,'tag');
    if (seen.has(row.tagId)) fail('validation.duplicateTag',rowIndex,'tag');
    seen.add(row.tagId);
    let domains;
    try { domains=row.domains.split('\n').map(s=>s.trim()).filter(Boolean).map(normalizeDomain); }
    catch(e) { fail(e,rowIndex,'domains'); }
    const apps=[];
    row.apps.forEach((app,appIndex)=>{
      if (!app.executable.trim()) return;
      try { apps.push({executable:normalizeExecutable(app.executable)}); }
      catch(e) { fail(e,rowIndex,'executable',appIndex); }
    });
    const result={tagId:row.tagId,domains,apps};
    if(row.allowSitesEnabled!==undefined||row.allowedDomains!==undefined){
      result.allowSitesEnabled=row.allowSitesEnabled;
      try { result.allowedDomains=(row.allowedDomains||'').split('\n').map(s=>s.trim()).filter(Boolean).map(normalizeDomain); }
      catch(e) { fail(e,rowIndex,'allowedDomains'); }
    }
    return result;
  });
  return {rules:validateRules(rules)};
}
