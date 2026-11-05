export const LEASE_MS = 6000;
export const MAX_DOMAINS = 500;
export function needsHelper(state) {
  return state.status === 'tracking' && (state.domains.length > 0 || (state.apps?.length || 0) > 0);
}
export function normalizeExecutable(value) {
  if (typeof value !== 'string') throw new Error('validation.executableRequired');
  const name = value.trim().toLowerCase();
  if (name.length > 150 || !/^.+\.exe$/.test(name) || /[<>:"/\\|?*\x00-\x1f]/.test(name) || name.startsWith('.') ||
      ['super productivity.exe','focusguard.bridge.exe','explorer.exe','winlogon.exe','csrss.exe','dwm.exe','taskmgr.exe'].includes(name)) {
    throw new Error('validation.executableInvalid');
  }
  return name;
}

export function normalizeDomain(value) {
  if (typeof value !== 'string') throw new Error('validation.domainRequired');
  const input = value.trim().toLowerCase().replace(/\.$/, '');
  // Accept domains only; credentials, paths, ports and wildcard syntax are errors.
  if (!input || /[\s/:@?#*\\]/.test(input)) throw new Error('validation.domainOnly');
  let host;
  try { host = new URL(`https://${input}`).hostname; } catch { throw new Error('validation.domainFormat'); }
  if (host.length > 253 || !host.includes('.') || host.split('.').some(label =>
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) || /^[\d.]+$/.test(host)) {
    throw new Error('validation.domainInvalid');
  }
  return host;
}

export function validateRules(rules) {
  if (!Array.isArray(rules) || rules.length > 200) throw new Error('validation.tagLimit');
  const seen = new Set();
  let total = 0;
  let appTotal = 0;
  let allowedTotal = 0;
  return rules.map(rule => {
    if (!rule || typeof rule.tagId !== 'string' || !rule.tagId || rule.tagId.length > 200 || seen.has(rule.tagId)) {
      throw new Error('validation.tagInvalid');
    }
    seen.add(rule.tagId);
    if (!Array.isArray(rule.domains)) throw new Error('validation.domainsFormat');
    const domains = [...new Set(rule.domains.map(normalizeDomain))].sort();
    total += domains.length;
    if (total > MAX_DOMAINS) throw Object.assign(new Error('validation.domainLimit'),{params:{max:MAX_DOMAINS}});
    if (rule.apps !== undefined && !Array.isArray(rule.apps)) throw new Error('validation.appsFormat');
    const apps = new Set();
    for (const app of rule.apps || []) {
      const executable = normalizeExecutable(app?.executable);
      if (app?.mode !== undefined) throw new Error('validation.blockOnly');
      apps.add(executable);
    }
    appTotal += apps.size;
    if (appTotal > 200) throw new Error('validation.appLimit');
    const result = { tagId: rule.tagId, domains, apps: [...apps].sort().map(executable=>({executable})) };
    if (rule.allowSitesEnabled !== undefined || rule.allowedDomains !== undefined) {
      if (rule.allowSitesEnabled !== undefined && typeof rule.allowSitesEnabled !== 'boolean') throw new Error('validation.allowToggle');
      if (rule.allowedDomains !== undefined && !Array.isArray(rule.allowedDomains)) throw new Error('validation.allowedFormat');
      result.allowSitesEnabled = rule.allowSitesEnabled === true;
      result.allowedDomains = [...new Set((rule.allowedDomains || []).map(normalizeDomain))].sort();
      allowedTotal += result.allowedDomains.length;
      if (allowedTotal > MAX_DOMAINS) throw Object.assign(new Error('validation.allowedLimit'),{params:{max:MAX_DOMAINS}});
    }
    return result;
  });
}

export function selectDomains(tagIds, rules) {
  const ids = new Set(tagIds);
  return [...new Set(rules.filter(r => ids.has(r.tagId)).flatMap(r => r.domains))].sort();
}
export function selectApps(tagIds, rules) {
  const ids = new Set(tagIds); const merged = new Set();
  for (const rule of rules) if (ids.has(rule.tagId)) for (const app of rule.apps || [])
    merged.add(app.executable);
  return [...merged].sort().map(executable=>({executable}));
}
export function selectAllowedDomains(tagIds, rules) {
  const ids = new Set(tagIds);
  return [...new Set(rules.filter(r => ids.has(r.tagId) && r.allowSitesEnabled === true).flatMap(r => r.allowedDomains || []))].sort();
}

// Compatibility only: legacy warning entries must never become forced termination.
export function loadSettings(stored) {
  const legacy=Array.isArray(stored)||stored?.version===1;
  if (!legacy && ![2,3].includes(stored?.version)) throw new Error('validation.settingsFormat');
  const original=Array.isArray(stored)?stored:stored.rules;
  const removed=new Set();
  const rules=legacy&&Array.isArray(original)?original.map(rule=>{
    if(rule?.apps!==undefined&&!Array.isArray(rule.apps))throw new Error('validation.appsFormat');
    return {...rule,apps:(rule?.apps||[]).flatMap(app=>{
      const executable=normalizeExecutable(app?.executable);
      if(app?.mode==='warn'){removed.add(executable);return [];}
      if(app?.mode!==undefined&&app.mode!=='block')throw new Error('validation.legacyAppsFormat');
      return [{executable}];
    })};
  }):original;
  return {rules:validateRules(rules),removedWarningApps:[...removed].sort()};
}

export function matchesDomain(url, domains) {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
    return domains.some(d => host === d || host.endsWith(`.${d}`));
  } catch { return false; }
}

export function effectiveState(snapshot, now = Date.now()) {
  const idle = { status: 'disconnected', domains: [], allowedDomains: [], expiresAt: 0, revision: '' };
  if (!snapshot || ![1,2].includes(snapshot.version) || typeof snapshot.revision !== 'string' ||
      !Number.isSafeInteger(snapshot.issuedAt) || !Number.isSafeInteger(snapshot.expiresAt) ||
      snapshot.issuedAt > now + 1000 || snapshot.expiresAt <= now ||
      snapshot.expiresAt - snapshot.issuedAt > LEASE_MS || snapshot.expiresAt <= snapshot.issuedAt) return idle;
  if (!['tracking', 'stopped', 'break', 'unknown', 'error'].includes(snapshot.status)) return idle;
  try {
    if (!Array.isArray(snapshot.domains) || snapshot.domains.length > MAX_DOMAINS) return idle;
    const domains = [...new Set(snapshot.domains.map(normalizeDomain))].sort();
    if (snapshot.version === 2 && (!Array.isArray(snapshot.allowedDomains) || snapshot.allowedDomains.length > MAX_DOMAINS)) return idle;
    const allowedDomains = snapshot.version === 2 ? [...new Set(snapshot.allowedDomains.map(normalizeDomain))].sort() : [];
    return { status: snapshot.status, domains: snapshot.status === 'tracking' ? domains : [],
      allowedDomains: snapshot.status === 'tracking' ? allowedDomains : [],
      expiresAt: snapshot.expiresAt, revision: snapshot.revision };
  } catch { return idle; }
}

export function isBlockedSite(url, domains, allowedDomains = []) {
  return matchesDomain(url, domains) && !matchesDomain(url, allowedDomains);
}

export function makeDnrRules(domains, allowedDomains = []) {
  return domains.map((domain, index) => ({
    id: index + 1, priority: 1, action: { type: 'block' },
    condition: { requestDomains: [domain], ...(allowedDomains.length ? {excludedRequestDomains: allowedDomains} : {}), resourceTypes: ['main_frame', 'sub_frame'] }
  }));
}
