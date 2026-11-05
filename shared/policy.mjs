export const LEASE_MS = 6000;
export const MAX_DOMAINS = 500;
export function needsHelper(state) {
  return state.status === 'tracking' && (state.domains.length > 0 || (state.apps?.length || 0) > 0);
}
export function normalizeExecutable(value) {
  if (typeof value !== 'string') throw new Error('アプリの実行ファイル名を入力してください。');
  const name = value.trim().toLowerCase();
  if (name.length > 150 || !/^.+\.exe$/.test(name) || /[<>:"/\\|?*\x00-\x1f]/.test(name) || name.startsWith('.') ||
      ['super productivity.exe','focusguard.bridge.exe','explorer.exe','winlogon.exe','csrss.exe','dwm.exe','taskmgr.exe'].includes(name)) {
    throw new Error('アプリの.exe名を指定してください。本体・補助機能・Windowsの操作に必要なアプリは指定できません。');
  }
  return name;
}

export function normalizeDomain(value) {
  if (typeof value !== 'string') throw new Error('ドメインを入力してください。');
  const input = value.trim().toLowerCase().replace(/\.$/, '');
  // Accept domains only; credentials, paths, ports and wildcard syntax are errors.
  if (!input || /[\s/:@?#*\\]/.test(input)) throw new Error('URLではなくドメインだけを入力してください。');
  let host;
  try { host = new URL(`https://${input}`).hostname; } catch { throw new Error('ドメインの形式が正しくありません。'); }
  if (host.length > 253 || !host.includes('.') || host.split('.').some(label =>
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) || /^[\d.]+$/.test(host)) {
    throw new Error('有効なサイトのドメインを入力してください。');
  }
  return host;
}

export function validateRules(rules) {
  if (!Array.isArray(rules) || rules.length > 200) throw new Error('タグの設定数が多すぎます。');
  const seen = new Set();
  let total = 0;
  let appTotal = 0;
  let allowedTotal = 0;
  return rules.map(rule => {
    if (!rule || typeof rule.tagId !== 'string' || !rule.tagId || rule.tagId.length > 200 || seen.has(rule.tagId)) {
      throw new Error('タグの指定が正しくないか重複しています。');
    }
    seen.add(rule.tagId);
    if (!Array.isArray(rule.domains)) throw new Error('禁止ドメインの形式が正しくありません。');
    const domains = [...new Set(rule.domains.map(normalizeDomain))].sort();
    total += domains.length;
    if (total > MAX_DOMAINS) throw new Error(`禁止ドメインは合計${MAX_DOMAINS}件までです。`);
    if (rule.apps !== undefined && !Array.isArray(rule.apps)) throw new Error('アプリ設定の形式が正しくありません。');
    const apps = new Set();
    for (const app of rule.apps || []) {
      const executable = normalizeExecutable(app?.executable);
      if (app?.mode !== undefined) throw new Error('現在のアプリ設定は強制終了による遮断のみです。');
      apps.add(executable);
    }
    appTotal += apps.size;
    if (appTotal > 200) throw new Error('アプリ設定は合計200件までです。');
    const result = { tagId: rule.tagId, domains, apps: [...apps].sort().map(executable=>({executable})) };
    if (rule.allowSitesEnabled !== undefined || rule.allowedDomains !== undefined) {
      if (rule.allowSitesEnabled !== undefined && typeof rule.allowSitesEnabled !== 'boolean') throw new Error('許可サイトのオン・オフを確認してください。');
      if (rule.allowedDomains !== undefined && !Array.isArray(rule.allowedDomains)) throw new Error('許可サイトの形式が正しくありません。');
      result.allowSitesEnabled = rule.allowSitesEnabled === true;
      result.allowedDomains = [...new Set((rule.allowedDomains || []).map(normalizeDomain))].sort();
      allowedTotal += result.allowedDomains.length;
      if (allowedTotal > MAX_DOMAINS) throw new Error(`許可サイトは合計${MAX_DOMAINS}件までです。`);
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
  if (!legacy && ![2,3].includes(stored?.version)) throw new Error('設定の形式を確認してください。');
  const original=Array.isArray(stored)?stored:stored.rules;
  const removed=new Set();
  const rules=legacy&&Array.isArray(original)?original.map(rule=>{
    if(rule?.apps!==undefined&&!Array.isArray(rule.apps))throw new Error('アプリ設定の形式が正しくありません。');
    return {...rule,apps:(rule?.apps||[]).flatMap(app=>{
      const executable=normalizeExecutable(app?.executable);
      if(app?.mode==='warn'){removed.add(executable);return [];}
      if(app?.mode!==undefined&&app.mode!=='block')throw new Error('旧アプリ設定の形式を確認してください。');
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
