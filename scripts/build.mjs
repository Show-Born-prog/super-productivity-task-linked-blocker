import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {createStoredZip} from './stored-zip.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
async function readBundledSource(file) {
  const source = await readFile(path.join(root, file), 'utf8');
  return source.replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
}

const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const productName = 'タスク連動ブロッカー';
await mkdir(path.join(dist, 'plugin'), { recursive: true });
await mkdir(path.join(dist, 'extension'), { recursive: true });
let key;
try { key = (await readFile(path.join(root, 'extension/public-key.txt'), 'utf8')).trim(); }
catch {
  key = generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  await writeFile(path.join(root, 'extension/public-key.txt'), key + '\n');
}
const extensionId = [...createHash('sha256').update(Buffer.from(key, 'base64')).digest().subarray(0, 16)]
  .flatMap(n => [n >> 4, n & 15]).map(n => String.fromCharCode(97 + n)).join('');
const config = { directory: path.join(root, '.local/runtime'), executable: path.join(dist, 'bridge/FocusGuard.Bridge.exe'), extensionId, name: productName };
const runtimeModules = ['shared/policy.mjs', 'plugin/controller.mjs', 'plugin/transport.mjs', 'plugin/navigation-appearance.mjs', 'plugin/runtime.mjs'];
let code = `(() => { 'use strict';\nconst BUILD_CONFIG = ${JSON.stringify(config)};\n`;
for (const file of runtimeModules) code += await readBundledSource(file) + '\n';
code += '})();\n';
await writeFile(path.join(dist, 'plugin/plugin.js'), code);
const settingsModules = ['shared/policy.mjs','plugin/form.mjs','plugin/view-refresh.mjs','plugin/native.mjs','plugin/targets.mjs','plugin/autosave.mjs','plugin/rule-menu.mjs','plugin/ui.mjs'];
const uiCode = (await Promise.all(settingsModules.map(readBundledSource))).join('\n');
const nativeNotice=await readFile(path.join(root,'plugin/native/NOTICE.txt'),'utf8');
const nativeCss=await readFile(path.join(root,'plugin/native/components.css'),'utf8');
const packedCss=gzipSync(nativeCss,{level:9}).toString('base64');
const settingsCss=await readFile(path.join(root,'plugin/ui.css'),'utf8');
const productIcon=await readFile(path.join(root,'assets/icon.svg'),'utf8');
const html = (await readFile(path.join(root, 'plugin/index.html'), 'utf8')).replaceAll('__PRODUCT_NAME__',productName).replace('<!--__PRODUCT_ICON__-->',productIcon.replace('<svg','<svg class="product-icon" aria-hidden="true"')).replace('__VERSION__',version).replace('<!--__NATIVE_NOTICE__-->','<!--\n'+nativeNotice+'\n-->').replace('/*__SETTINGS_CSS__*/',settingsCss).replace('__NATIVE_CSS_GZIP__',packedCss).replace('/*__UI__*/','(async()=>{\n'+uiCode+'\n})().catch(()=>{document.getElementById("save-error").hidden=false;document.getElementById("message").textContent="画面を読み込めません。再読み込みしてください。";});');
const indexBytes=Buffer.byteLength(html,'utf8');
if(indexBytes>100000)throw new Error(`index.html exceeds the host limit: ${indexBytes} bytes (build guard: 100000 bytes)`);
await writeFile(path.join(dist, 'plugin/index.html'), html);
await cp(path.join(root,'assets/icon.svg'),path.join(dist,'plugin/icon.svg'));
await cp(path.join(root,'assets/NOTICE.txt'),path.join(dist,'plugin/NOTICE.txt'));
const manifest = { id: 'super-focus-guard', name: productName, version, manifestVersion: 1, minSupVersion: '19.2.0',
  description: '計測中タスクのタグに連動する禁止サイト・Windowsアプリ設定',
  iFrame: true, uiKit: false, hooks: ['currentTaskChange','taskUpdate','action'],
  permissions: ['getTasks','getAllTags','nodeExecution'], author: 'Focus Tools', icon: 'icon.svg', assets: ['index.html','icon.svg','NOTICE.txt'] };
await writeFile(path.join(dist, 'plugin/manifest.json'), JSON.stringify(manifest, null, 2));
await cp(path.join(root, 'extension'), path.join(dist, 'extension'), { recursive: true, filter: s => !s.endsWith('public-key.txt') });
await cp(path.join(root, 'shared/policy.mjs'), path.join(dist, 'extension/policy.mjs'));
await writeFile(path.join(dist, 'extension/enforcer.mjs'), (await readFile(path.join(root,'extension/enforcer.mjs'),'utf8')).replace('../shared/policy.mjs','./policy.mjs'));
for(const file of ['popup.html','blocked.html'])await writeFile(path.join(dist,'extension',file),(await readFile(path.join(root,'extension',file),'utf8')).replaceAll('__PRODUCT_NAME__',productName));
const icons=Object.fromEntries([16,32,48,128].map(size=>[size,`icons/icon${size}.png`]));
await writeFile(path.join(dist, 'extension/manifest.json'), JSON.stringify({
  manifest_version: 3, name: productName, version, minimum_chrome_version: '120', key, icons,
  description: 'Super Productivityの計測中タスクに合わせて禁止サイトを遮断します。',
  permissions: ['declarativeNetRequest', 'tabs', 'alarms'],
  host_permissions: ['http://127.0.0.1/*'],
  background: { service_worker: 'worker.mjs', type: 'module' }, action: { default_popup: 'popup.html', default_icon: icons, default_title: productName },
  content_security_policy: { extension_pages: "script-src 'self'; object-src 'self'; connect-src ws://127.0.0.1:47821" }
}, null, 2));
// ZIP uses store-only entries, avoiding downloaded build dependencies.
const entries = [];
for (const name of ['manifest.json','plugin.js','index.html','icon.svg','NOTICE.txt']) entries.push([name, await readFile(path.join(dist, 'plugin', name))]);
await writeFile(path.join(dist, 'super-focus-guard.zip'), createStoredZip(entries));
const result = spawnSync('dotnet', ['publish','bridge/FocusGuard.Bridge.csproj','--configuration','Release','--output',path.join(dist,'bridge'),'--nologo','--verbosity','quiet','--configfile','NuGet.Config'], {
  cwd: root, windowsHide: true, encoding: 'utf8', env: { ...process.env, DOTNET_CLI_HOME: path.join(root,'.local/dotnet'), DOTNET_CLI_TELEMETRY_OPTOUT:'1', DOTNET_SKIP_FIRST_TIME_EXPERIENCE:'1', DOTNET_GENERATE_ASPNET_CERTIFICATE:'false' }
});
if (result.status !== 0) { console.error(result.stdout, result.stderr); process.exit(1); }
console.log(`ビルド成功\nindex.html: ${indexBytes} / 100000 bytes\nプラグイン: ${path.join(dist,'super-focus-guard.zip')}\n拡張: ${path.join(dist,'extension')}\n拡張ID: ${extensionId}`);
