export const SETUP_SCRIPT = String.raw`
const fs = require('fs');
const path = require('path');
const home = require('os').homedir();
const [configuredDirectory, extensionId, extensionKey, configuredHelper, force] = args;
const directory = configuredDirectory || path.join(home, '.task-linked-blocker', 'runtime');
if (configuredHelper) return fs.existsSync(configuredHelper);
const registration = path.join(directory, '..', 'installation.json');
const validHelper = value => typeof value === 'string' && path.isAbsolute(value) && /^[a-z]:/i.test(value) && path.basename(value) === 'FocusGuard.Bridge.exe' && fs.existsSync(value) && fs.statSync(value).isFile();
function helperFromProfile(root, profile) {
  const preferences = path.join(root, profile, 'Secure Preferences');
  if (fs.statSync(preferences).size > 32 * 1024 * 1024) return;
  const folder = JSON.parse(fs.readFileSync(preferences, 'utf8')).extensions?.settings?.[extensionId]?.path;
  if (typeof folder !== 'string' || !path.isAbsolute(folder) || !/^[a-z]:/i.test(folder)) return;
  const manifestFile = path.join(folder, 'manifest.json');
  if (fs.statSync(manifestFile).size > 128 * 1024) return;
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  if (!extensionKey || manifest.key !== extensionKey || manifest.manifest_version !== 3 || manifest.background?.service_worker !== 'worker.mjs') return;
  const executable = path.join(folder, 'bridge', 'FocusGuard.Bridge.exe');
  if (validHelper(executable)) return executable;
}
function registerHelper(executable) {
  fs.mkdirSync(directory, {recursive:true});
  const temporary = registration + '.' + process.pid + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify({version:1, executable}), 'utf8');
  fs.renameSync(temporary, registration);
}
let previous;
try { const item = JSON.parse(fs.readFileSync(registration, 'utf8')); if (item.version === 1 && validHelper(item.executable)) previous = item.executable; } catch {}
if (previous && !force) return true;
if (previous) {
  try {
    const status = JSON.parse(fs.readFileSync(path.join(directory, 'bridge-status.json'), 'utf8'));
    const age = Date.now() - status.updatedAt;
    if (age >= 0 && age < 3000 && !status.stopping) return true;
  } catch {}
}
// Read only installation metadata for our extension; never history, cookies or account files.
const browsers = ['Google/Chrome', 'Microsoft/Edge', 'BraveSoftware/Brave-Browser', 'Vivaldi'];
for (const browser of browsers) {
  const root = path.join(home, 'AppData', 'Local', browser, 'User Data');
  let profiles;
  try { profiles = fs.readdirSync(root, {withFileTypes:true}).filter(entry => entry.isDirectory() && /^(Default|Profile \d+)$/.test(entry.name)).slice(0,64); } catch { continue; }
  for (const profile of profiles) {
    try {
      const executable = helperFromProfile(root, profile.name);
      if (!executable) continue;
      if (executable !== previous) registerHelper(executable);
      return true;
    } catch {}
  }
}
return !!previous;
`;

export const FILE_SCRIPT = `
const fs = require('fs');
const path = require('path');
const [, operation, data] = args;
const directory = args[0] || path.join(require('os').homedir(), '.task-linked-blocker', 'runtime');
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
const [, configuredExecutable, extensionId, port] = args;
const directory = args[0] || path.join(require('os').homedir(), '.task-linked-blocker', 'runtime');
try {
  const status = JSON.parse(fs.readFileSync(path.join(directory, 'bridge-status.json'), 'utf8'));
  const age = Date.now() - status.updatedAt;
  if (age >= 0 && age < 1500 && status.stopping) return false;
  if (age >= 0 && age < 2000 && !status.stopping) return true;
} catch {}
let executable = configuredExecutable;
if (!executable) {
  const installation = JSON.parse(fs.readFileSync(path.join(directory, '..', 'installation.json'), 'utf8'));
  if (installation.version !== 1 || typeof installation.executable !== 'string') throw new Error('error.helperMissing');
  executable = installation.executable;
}
if (!path.isAbsolute(executable) || path.basename(executable) !== 'FocusGuard.Bridge.exe' || !fs.existsSync(executable)) throw new Error('error.helperMissing');
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

export function createTransport(api, { directory, executable, extensionId, extensionKey, port = 47821 }) {
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
  let prepared = false;
  const prepare = async force => {
    if (prepared && !force) return true;
    prepared = await invoke(SETUP_SCRIPT, [directory, extensionId, extensionKey, executable, !!force]);
    return prepared;
  };
  return {
    prepare,
    loadRules: () => invoke(FILE_SCRIPT, [directory, 'load']),
    saveRules: rules => invoke(FILE_SCRIPT, [directory, 'rules', rules]),
    write: async snapshot => {
      const response = await invoke(FILE_SCRIPT, [directory, 'state', snapshot]);
      if (!response || response.stopping || !Number.isSafeInteger(response.updatedAt) || Date.now() - response.updatedAt > 2500 || response.updatedAt > Date.now()) return { bridgeConnected: false, browsers: [] };
      return { bridgeConnected: true, browsers: (response.browsers || []).filter(b => b.revision === snapshot.revision && Date.now() - b.updatedAt < 2500),
        appProtection: response.appProtection?.revision === snapshot.revision ? response.appProtection :
          {status:!response.appProtection?'unavailable':response.appProtection.status==='error'?'error':'updating',detail:response.appProtection?.status==='error'?response.appProtection.detail:undefined} };
    },
    launch: async () => {
      await prepare(false);
      try { return await invoke(LAUNCH_SCRIPT, [directory, executable, extensionId, port]); }
      catch (error) { prepared = false; throw error; }
    }
  };
}
