import { createEnforcer } from './enforcer.mjs';
const enforcer = createEnforcer(chrome);
let socket;
let expireTimer;
let reconnectTimer;
const ready = enforcer.clear(); // A restarted worker never trusts old session rules.
let badgeText, badgeColor;
function badge(state) {
  const text=state.status === 'disconnected' ? '!' : state.status === 'error' ? 'ERR' : state.domains.length ? String(state.domains.length) : '';
  const color=state.domains.length ? '#287852' : '#8c5723';
  if (text!==badgeText) {chrome.action.setBadgeText({text});badgeText=text;}
  if (color!==badgeColor) {chrome.action.setBadgeBackgroundColor({color});badgeColor=color;}
}
async function connect() {
  await ready;
  clearTimeout(reconnectTimer);
  if (socket && (socket.readyState===WebSocket.OPEN || socket.readyState===WebSocket.CONNECTING)) return;
  socket = new WebSocket('ws://127.0.0.1:47821/state');
  const current = socket;
  socket.onmessage = async event => {
    if (current !== socket) return;
    let input;
    try { input = JSON.parse(event.data); } catch { input = null; }
    try {
      const state = await enforcer.apply(input);
      badge(state);
      clearTimeout(expireTimer);
      if (state.expiresAt > Date.now()) expireTimer = setTimeout(async () => { await enforcer.clear(); badge(enforcer.getState()); }, state.expiresAt - Date.now());
      if (current.readyState === WebSocket.OPEN) current.send(JSON.stringify({ revision: state.revision,
        protection: state.status === 'error' ? 'error' : state.domains.length ? 'active' : 'idle' }));
    } catch { badge({status:'error',domains:[]}); current.close(); }
  };
  socket.onclose = async () => {
    if (current !== socket) return;
    clearTimeout(expireTimer);
    await enforcer.clear(); badge(enforcer.getState());
    reconnectTimer = setTimeout(connect, 1000);
  };
  socket.onerror = () => current.close();
}
chrome.tabs.onActivated.addListener(({ tabId }) => { void ready.then(() => enforcer.checkTab(tabId)); });
chrome.tabs.onUpdated.addListener((id, changes) => { if (changes.url || changes.status === 'complete') void ready.then(() => enforcer.checkTab(id)); });
chrome.tabs.onRemoved.addListener(id => enforcer.removeTab(id));
chrome.windows.onFocusChanged.addListener(async id => {
  if (id === chrome.windows.WINDOW_ID_NONE) return;
  await ready;
  if (!enforcer.getState().domains.length) return;
  for (const tab of await chrome.tabs.query({ active: true, windowId: id })) await enforcer.checkTab(tab.id);
});
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type !== 'status' || sender.id !== chrome.runtime.id) return;
  ready.then(async () => {
    if (enforcer.getState().expiresAt <= Date.now()) await enforcer.clear();
    respond(enforcer.getState());
  });
  return true;
});
// Chrome may suspend a worker. This watchdog provides a bounded fallback on wakeup.
chrome.alarms.create('lease-watchdog', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(async () => {
  await ready;
  if (enforcer.getState().expiresAt <= Date.now()) { await enforcer.clear(); badge(enforcer.getState()); }
  if (!socket || socket.readyState === WebSocket.CLOSED) void connect();
});
void connect();
