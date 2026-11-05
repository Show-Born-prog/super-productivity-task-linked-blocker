import {extensionText,localizeExtensionPage} from './localize.mjs';
localizeExtensionPage(document);
document.querySelector('#settings-hint').textContent=extensionText('extension.settingsHint',[extensionText('product.name')]);
try {
  const state = await chrome.runtime.sendMessage({ type: 'status' });
  document.querySelector('#status').textContent = state.status === 'tracking'
    ? extensionText(state.domains.length?'extension.blocked':'extension.noSites')
    : extensionText(({break:'extension.break',stopped:'extension.stopped',unknown:'extension.unknown',error:'extension.error'})[state.status]||'extension.disconnected');
  for (const domain of state.domains) { const li = document.createElement('li'); li.textContent = domain; document.querySelector('#domains').append(li); }
} catch { document.querySelector('#status').textContent = extensionText('extension.unavailable'); }
