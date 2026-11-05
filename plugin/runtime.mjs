const api = PluginAPI;
const currentLocale=()=>{try{return api.getCurrentLanguage?.()||'en';}catch{return 'en';}};
const removeNavigationAppearance=typeof document==='undefined'?()=>{}:installNavigationAppearance(document);
const transport = createTransport(api, BUILD_CONFIG);
const controller = createController({ api, transport, sessionId: crypto.randomUUID() });
let timer;
let refreshTimer;
let ready = false;
let unloaded = false;
let launching;
let lastLaunch = 0;

async function synchronize() {
  if (!ready || unloaded) return;
  const state = controller.getState();
  if (state.status === 'tracking') {
    if (!refreshTimer) refreshTimer = setInterval(() => { void dispatch(() => controller.refreshTask()).catch(() => {}); },5000);
  } else { clearInterval(refreshTimer); refreshTimer = undefined; }
  if (!state.helperRequired) { clearInterval(timer); timer = undefined; return; }
  if (!timer) timer = setInterval(() => { void dispatch(() => controller.heartbeat()).catch(() => {}); },1000);
  if (state.bridgeConnected || launching || Date.now()-lastLaunch < 1000) return;
  lastLaunch = Date.now();
  launching = transport.launch().catch(() => false);
  try { await launching; } finally { launching = undefined; }
}
async function dispatch(operation) {
  try { return await operation(); }
  finally { await synchronize(); }
}
api.registerHook('currentTaskChange', p => dispatch(() => controller.currentTaskChange(p)));
api.registerHook('taskUpdate', p => dispatch(() => controller.taskUpdate(p)));
api.registerHook('action', p => dispatch(() => controller.action(p)));
const translatedName=api.translate?.('PLUGIN.NAME');
api.registerHeaderButton({ label: translatedName&&translatedName!=='PLUGIN.NAME'?translatedName:BUILD_CONFIG.name, icon: 'block', onClick: () => api.showIndexHtmlAsView() });
api.registerConfigHandler(() => api.showIndexHtmlAsView());
api.onMessage(async message => {
  if (message?.type === 'locale') return currentLocale();
  if (message?.type === 'status') return { ...controller.getState(), ready, locale:currentLocale(), tags: (await api.getAllTags()).filter(t => t.id !== 'TODAY').map(t => ({id:t.id,title:t.title,icon:t.icon,color:t.color})) };
  if (message?.type === 'save') { await dispatch(() => controller.saveRules(message.rules)); return { ok: true }; }
  if (message?.type === 'reconnect') {
    if (controller.getState().helperRequired) { lastLaunch=0; await dispatch(() => controller.heartbeat()); }
    return { ok: true };
  }
  throw new Error('error.unsupportedOperation');
});
api.onReady(async () => {
  try { await controller.initialize(); } catch { }
  if (unloaded) return;
  ready = true;
  await synchronize();
});
api.onUnload(() => {
  removeNavigationAppearance();
  unloaded = true;
  clearInterval(timer); clearInterval(refreshTimer); ready = false;
  void controller.close().catch(() => {});
});
