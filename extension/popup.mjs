import {extensionText,localizeExtensionPage} from './localize.mjs';
localizeExtensionPage(document);
const status=document.querySelector('#status');
status.textContent=extensionText('extension.checking');
try {
  const state = await chrome.runtime.sendMessage({ type: 'status' });
  if(typeof state?.connected!=='boolean')throw new Error('Invalid connection status');
  status.textContent=extensionText(state.connected?'extension.connected':'extension.disconnected');
  status.dataset.connection=state.connected?'connected':'disconnected';
} catch {
  status.textContent=extensionText('extension.unavailable');
  status.dataset.connection='error';
}
