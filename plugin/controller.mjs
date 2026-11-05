import { selectDomains, selectApps, selectAllowedDomains, validateRules, loadSettings, needsHelper, LEASE_MS } from '../shared/policy.mjs';

export function createController({ api, transport, now = Date.now, sessionId }) {
  let task = null;
  let observed = false;
  let inBreak = false;
  let rules = [];
  let settingsLoaded = false;
  let removedWarningApps = [];
  let appProtection = {status:'unavailable'};
  let error = false;
  let closed = false;
  let revision = 0;
  let browserStatus = [];
  let bridgeConnected = false;
  let queue = Promise.resolve();
  let epoch = 0;
  const sameTask = next => task?.id === next?.id &&
    JSON.stringify([...(task?.tagIds || [])].sort()) === JSON.stringify([...(next?.tagIds || [])].sort());
  const enqueue = job => {
    const operation = queue.then(job);
    queue = operation.catch(() => { error = true; browserStatus = []; bridgeConnected = false; appProtection={status:'unavailable'}; });
    return operation;
  };
  const status = () => error ? 'error' : !observed ? 'unknown' : inBreak ? 'break' : task ? 'tracking' : 'stopped';
  function snapshot() {
    const issuedAt = now();
    return { version: 2, revision: `${sessionId}:${revision}`, issuedAt, expiresAt: issuedAt + LEASE_MS,
      status: status(), activeTagIds: status() === 'tracking' ? task?.tagIds || [] : [],
      domains: status() === 'tracking' ? selectDomains(task.tagIds || [], rules) : [],
      allowedDomains: status() === 'tracking' ? selectAllowedDomains(task.tagIds || [], rules) : [],
      apps: status() === 'tracking' ? selectApps(task.tagIds || [], rules) : [] };
  }
  async function publish() {
    if (closed) return;
    const current = snapshot();
    const result = await transport.write(current);
    const required = needsHelper(current);
    browserStatus = required && Array.isArray(result?.browsers) ? result.browsers : [];
    bridgeConnected = required && result?.bridgeConnected === true;
    appProtection = !required ? {status:'idle'} : bridgeConnected ? result?.appProtection || {status:'unavailable'} : {status:'unavailable'};
    error = false;
  }
  return {
    initialize: () => enqueue(async () => {
      ({rules,removedWarningApps}=loadSettings(await transport.loadRules()));
      settingsLoaded = true;
      await publish();
    }),
    currentTaskChange(payload) {
      if (closed) return Promise.resolve();
      epoch++;
      observed = true;
      task = payload?.current ? { id: payload.current.id, tagIds: [...(payload.current.tagIds || [])] } : null;
      error = false;
      revision++;
      return enqueue(publish);
    },
    taskUpdate(payload) {
      if (payload?.taskId !== task?.id) return Promise.resolve();
      if (!payload?.task) return Promise.resolve();
      const next = { id: payload.task.id, tagIds: [...(payload.task.tagIds || [])] };
      if (sameTask(next)) return Promise.resolve();
      task = next;
      revision++;
      return enqueue(publish);
    },
    action(payload) {
      // 19.2.0 emits the action object under `action`, despite its string typing.
      const type = typeof payload?.action === 'object' ? payload.action?.type : payload?.action;
      if (type === '[FocusMode] Start Break') inBreak = true;
      else if (['[FocusMode] Start Session', '[FocusMode] Skip Break', '[FocusMode] Complete Break',
        '[FocusMode] Cancel Session'].includes(type)) inBreak = false;
      else return Promise.resolve();
      revision++;
      return enqueue(publish);
    },
    heartbeat: () => enqueue(publish),
    saveRules(nextRules) {
      const validated = validateRules(nextRules);
      return enqueue(async () => {
        await transport.saveRules({version:3,rules:validated});
        rules = validated; removedWarningApps = []; revision++; await publish();
      });
    },
    async refreshTask() {
      const captured = epoch;
      if (!task) return;
      let tasks;
      try { tasks = await api.getTasks(); }
      catch {
        if (captured !== epoch || closed) return;
        task = null; observed = false; error = true; revision++;
        return enqueue(publish);
      }
      if (captured !== epoch || closed) return;
      const found = tasks.find(t => t.id === task.id && !t.isDone);
      const next = found ? { id: found.id, tagIds: [...(found.tagIds || [])] } : null;
      // Metadata polling does not change the rules the browser acknowledged.
      if (sameTask(next)) return;
      task = next;
      revision++;
      return enqueue(publish);
    },
    getState: () => ({ ...snapshot(), settingsLoaded, rules: structuredClone(rules), browsers: structuredClone(browserStatus), bridgeConnected,
      helperRequired: needsHelper(snapshot()), appProtection: structuredClone(appProtection), removedWarningApps: [...removedWarningApps] }),
    close() {
      closed = true;
      task = null;
      observed = true;
      revision++;
      const stopped = snapshot(); stopped.status = 'stopped'; stopped.domains = [];
      return enqueue(() => transport.write(stopped));
    }
  };
}
