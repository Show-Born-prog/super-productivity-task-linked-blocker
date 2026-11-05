import { effectiveState, makeDnrRules, isBlockedSite } from '../shared/policy.mjs';

export function createEnforcer(chrome, now = Date.now) {
  let state = { status: 'disconnected', domains: [], allowedDomains: [], revision: '', expiresAt: 0 };
  let originals = new Map(); // URLs exist only in RAM, never in files or messages.
  let serial = Promise.resolve();
  let rulesKnown = false;
  const blocked = chrome.runtime.getURL('blocked.html');
  function enqueue(job) { serial = serial.then(job, job); return serial; }
  async function protect(tab) {
    if (!tab?.id || !isBlockedSite(tab.pendingUrl || tab.url, state.domains, state.allowedDomains)) return;
    if (now() >= state.expiresAt) return;
    originals.set(tab.id, tab.pendingUrl || tab.url);
    try { await chrome.tabs.update(tab.id, { url: blocked }); }
    catch { originals.delete(tab.id); /* A tab may close between query and update. */ }
  }
  async function restoreAllowed() {
    for (const [id, original] of originals) {
      if (isBlockedSite(original, state.domains, state.allowedDomains)) continue;
      originals.delete(id);
      try { const tab = await chrome.tabs.get(id); if (tab.url === blocked) await chrome.tabs.update(id, { url: original }); } catch { }
    }
  }
  async function apply(snapshot) {
    const next = effectiveState(snapshot, now());
    const signature = JSON.stringify([next.domains,next.allowedDomains]);
    const changed = signature !== JSON.stringify([state.domains,state.allowedDomains]);
    if (!rulesKnown || changed) {
      const previous = await chrome.declarativeNetRequest.getSessionRules();
      try {
        if (previous.length || next.domains.length) await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: previous.map(r => r.id), addRules: makeDnrRules(next.domains,next.allowedDomains) });
        rulesKnown = true;
      } catch {
        rulesKnown = false;
        // If replacement fails, try to remove the previous set, and report failure.
        await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: previous.map(r => r.id), addRules: [] }).catch(() => {});
        state = { status: 'error', domains: [], allowedDomains: [], revision: next.revision, expiresAt: 0 };
        await restoreAllowed();
        return state;
      }
    }
    state = next;
    if (changed) await restoreAllowed();
    // Also stops already-open pages/audio when rules become active.
    if (changed && state.domains.length) for (const tab of await chrome.tabs.query({})) await protect(tab);
    return state;
  }
  return {
    apply: snapshot => enqueue(() => apply(snapshot)),
    clear: () => enqueue(() => apply(null)),
    checkTab: id => enqueue(async () => {
      if (now() >= state.expiresAt) { await apply(null); return; }
      if (!state.domains.length) return;
      try { await protect(await chrome.tabs.get(id)); } catch { }
    }),
    removeTab: id => originals.delete(id),
    getState: () => ({ ...state, domains: [...state.domains], allowedDomains: [...state.allowedDomains] })
  };
}
