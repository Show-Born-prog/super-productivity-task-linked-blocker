export function fakeChrome(tabs = []) {
  const store = new Map(tabs.map(tab => [tab.id, { ...tab }]));
  let rules = [];
  let failRules = false;
  return {
    runtime: { getURL: name => 'chrome-extension://test/' + name },
    declarativeNetRequest: {
      getSessionRules: async () => structuredClone(rules),
      updateSessionRules: async ({ removeRuleIds, addRules }) => {
        if (failRules) throw new Error('DNR unavailable');
        rules = rules.filter(r => !removeRuleIds.includes(r.id)).concat(addRules);
      }
    },
    tabs: {
      query: async () => [...store.values()].map(t => ({ ...t })),
      get: async id => { if (!store.has(id)) throw new Error('closed'); return { ...store.get(id) }; },
      update: async (id, changes) => { if (!store.has(id)) throw new Error('closed'); store.set(id, { ...store.get(id), ...changes }); }
    },
    inspect: () => ({ rules: structuredClone(rules), tabs: [...store.values()] }),
    fail: value => { failRules = value; }
  };
}
