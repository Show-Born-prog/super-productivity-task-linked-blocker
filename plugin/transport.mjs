export const FILE_SCRIPT = `
const fs = require('fs');
const path = require('path');
const [directory, operation, data] = args;
fs.mkdirSync(directory, { recursive: true });
const file = path.join(directory, operation === 'rules' ? 'rules.json' : 'state.json');
if (operation === 'load') {
  if (!fs.existsSync(path.join(directory, 'rules.json'))) return [];
  return JSON.parse(fs.readFileSync(path.join(directory, 'rules.json'), 'utf8'));
}
const temp = file + '.tmp';
fs.writeFileSync(temp, JSON.stringify(data), 'utf8');
fs.renameSync(temp, file);
if (operation === 'rules') return true;
try {
  const status = JSON.parse(fs.readFileSync(path.join(directory, 'bridge-status.json'), 'utf8'));
  return status;
} catch { return { browsers: [] }; }
`;

export const LAUNCH_SCRIPT = `
const fs = require('fs');
const path = require('path');
const [directory, executable, extensionId, port] = args;
try {
  const status = JSON.parse(fs.readFileSync(path.join(directory, 'bridge-status.json'), 'utf8'));
  const age = Date.now() - status.updatedAt;
  if (age >= 0 && age < 1500 && status.stopping) return false;
  if (age >= 0 && age < 2000 && !status.stopping) return true;
} catch {}
if (!fs.existsSync(executable)) throw new Error('error.helperMissing');
const pending = path.join(directory,'launch-pending.json');
try {
  if (Date.now()-fs.statSync(pending).mtimeMs < 5000) return false;
  fs.unlinkSync(pending);
} catch (error) { if (error.code !== 'ENOENT') throw error; }
let lock;
try { lock=fs.openSync(pending,'wx'); }
catch (error) { if(error.code==='EEXIST')return false;throw error; }
let child;
try {
child = require('child_process').spawn(executable, ['--state-dir', directory, '--extension-id', extensionId, '--port', String(port)],
  { detached: true, windowsHide: true, stdio: 'ignore' });
fs.writeFileSync(lock,JSON.stringify({pid:child.pid}));
} finally { fs.closeSync(lock); }
await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
child.unref();
return true;
`;

export function createTransport(api, { directory, executable, extensionId, port = 47821 }) {
  async function invoke(script, args) {
    for (let attempt = 0; ; attempt++) {
      const response = await api.executeNodeScript({ script, args, timeout: 5000 });
      if (response?.success) return response.result;
      const reason = typeof response?.error === 'string' ? response.error : '';
      // A Windows reader can briefly deny rename-over-existing. Yield outside
      // the host's Node VM (which has no timers), then retry this SAME lease.
      if (script === FILE_SCRIPT && args[1] === 'state' && attempt < 4 &&
          /\b(?:EPERM|EBUSY)\b/.test(reason) && /\brename\b/.test(reason)) {
        await new Promise(resolve => setTimeout(resolve, 25));
        continue;
      }
      // Never expose raw Node errors: they can contain local paths or inputs.
      throw new Error('error.bridgeConnection');
    }
  }
  return {
    loadRules: () => invoke(FILE_SCRIPT, [directory, 'load']),
    saveRules: rules => invoke(FILE_SCRIPT, [directory, 'rules', rules]),
    write: async snapshot => {
      const response = await invoke(FILE_SCRIPT, [directory, 'state', snapshot]);
      if (!response || response.stopping || !Number.isSafeInteger(response.updatedAt) || Date.now() - response.updatedAt > 2500 || response.updatedAt > Date.now()) return { bridgeConnected: false, browsers: [] };
      return { bridgeConnected: true, browsers: (response.browsers || []).filter(b => b.revision === snapshot.revision && Date.now() - b.updatedAt < 2500),
        appProtection: response.appProtection?.revision === snapshot.revision ? response.appProtection :
          {status:!response.appProtection?'unavailable':response.appProtection.status==='error'?'error':'updating',detail:response.appProtection?.status==='error'?response.appProtection.detail:undefined} };
    },
    launch: () => invoke(LAUNCH_SCRIPT, [directory, executable, extensionId, port])
  };
}
