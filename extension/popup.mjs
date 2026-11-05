try {
  const state = await chrome.runtime.sendMessage({ type: 'status' });
  document.querySelector('#status').textContent = state.status === 'tracking'
    ? state.domains.length ? 'サイト遮断中' : '計測中・禁止サイトの指定なし'
    : ({break:'休憩中・遮断解除',stopped:'計測停止中・遮断解除',unknown:'計測状態が未確認です。タスクを停止して再生してください。',error:'遮断を適用できません。保護できていません。'})[state.status] || '未接続・サイトを保護できていません。';
  for (const domain of state.domains) { const li = document.createElement('li'); li.textContent = domain; document.querySelector('#domains').append(li); }
} catch { document.querySelector('#status').textContent = '拡張機能に接続できません。保護できていません。'; }
