import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {createStoredZip} from './stored-zip.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const portable = process.argv.includes('--portable');
const dist = path.join(root, 'dist', ...(portable ? ['portable'] : []));
async function readBundledSource(file) {
  const source = await readFile(path.join(root, file), 'utf8');
  return source.replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
}

const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const messages=Object.fromEntries(await Promise.all(['en','ja','zh-TW'].map(async locale=>[locale,JSON.parse(await readFile(path.join(root,'locales',locale+'.json'),'utf8'))])));
const productName = messages.en['product.name'];
await mkdir(path.join(dist, 'plugin'), { recursive: true });
await mkdir(path.join(dist, 'site-blocker-extension'), { recursive: true });
let key;
try { key = (await readFile(path.join(root, 'extension/public-key.txt'), 'utf8')).trim(); }
catch {
  key = generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  await writeFile(path.join(root, 'extension/public-key.txt'), key + '\n');
}
const extensionId = [...createHash('sha256').update(Buffer.from(key, 'base64')).digest().subarray(0, 16)]
  .flatMap(n => [n >> 4, n & 15]).map(n => String.fromCharCode(97 + n)).join('');
const config = { ...(!portable ? {directory: path.join(root, '.local/runtime')} : {}), extensionId, extensionKey:key, name: productName };
const runtimeModules = ['shared/policy.mjs', 'plugin/controller.mjs', 'plugin/transport.mjs', 'plugin/navigation-appearance.mjs', 'plugin/navigation-localization.mjs', 'plugin/runtime.mjs'];
let code = `(() => { 'use strict';\nconst BUILD_CONFIG = ${JSON.stringify(config)};\n`;
for (const file of runtimeModules) code += await readBundledSource(file) + '\n';
code += '})();\n';
await writeFile(path.join(dist, 'plugin/plugin.js'), code);
const settingsModules = ['shared/i18n.mjs','plugin/localization.mjs','shared/policy.mjs','plugin/form.mjs','plugin/view-refresh.mjs','plugin/native.mjs','plugin/targets.mjs','plugin/autosave.mjs','plugin/rule-menu.mjs','plugin/ui.mjs'];
const uiCode = (await Promise.all(settingsModules.map(readBundledSource))).join('\n');
const nativeNotice=await readFile(path.join(root,'plugin/native/NOTICE.txt'),'utf8');
const distributionNotice=nativeNotice+'\n---\n\n'+await readFile(path.join(root,'assets/NOTICE.txt'),'utf8');
const nativeCss=await readFile(path.join(root,'plugin/native/components.css'),'utf8');
const packedCss=gzipSync(nativeCss,{level:9}).toString('base64');
const settingsCss=await readFile(path.join(root,'plugin/ui.css'),'utf8');
const productIcon=await readFile(path.join(root,'assets/icon.svg'),'utf8');
const html = (await readFile(path.join(root, 'plugin/index.html'), 'utf8')).replaceAll('__PRODUCT_NAME__',productName).replace('<!--__PRODUCT_ICON__-->',productIcon.replace('<svg','<svg class="product-icon" aria-hidden="true"')).replace('__VERSION__',version).replace('<!--__NATIVE_NOTICE__-->','<!--\n'+nativeNotice+'\n-->').replace('/*__SETTINGS_CSS__*/',settingsCss).replace('__NATIVE_CSS_GZIP__',packedCss).replace('__LOCALE_MESSAGES_GZIP__',gzipSync(JSON.stringify(messages),{level:9}).toString('base64')).replace('/*__UI__*/','(async()=>{\n'+uiCode+'\n})().catch(()=>{document.getElementById("save-error").hidden=false;document.getElementById("message").textContent='+JSON.stringify(messages.en['error.loadUI'])+';});');
const indexBytes=Buffer.byteLength(html,'utf8');
if(indexBytes>100000)throw new Error(`index.html exceeds the host limit: ${indexBytes} bytes (build guard: 100000 bytes)`);
await writeFile(path.join(dist, 'plugin/index.html'), html);
await cp(path.join(root,'assets/icon.svg'),path.join(dist,'plugin/icon.svg'));
await writeFile(path.join(dist,'plugin/NOTICE.txt'),distributionNotice);
const manifest = { id: 'super-focus-guard', name: productName, version, manifestVersion: 1, minSupVersion: '19.2.0',
  description: messages.en['product.description'],
  iFrame: true, uiKit: false, hooks: ['currentTaskChange','taskUpdate','action','languageChange'],
  permissions: ['getTasks','getAllTags','nodeExecution'], author: 'Focus Tools', icon: 'icon.svg', i18n:{languages:['en','ja','zh-tw']}, assets: ['index.html','icon.svg','NOTICE.txt','i18n/en.json','i18n/ja.json','i18n/zh-tw.json'] };
await mkdir(path.join(dist,'plugin/i18n'),{recursive:true});
for(const locale of manifest.i18n.languages){const catalog=messages[locale==='zh-tw'?'zh-TW':locale];await writeFile(path.join(dist,'plugin/i18n',locale+'.json'),JSON.stringify({PLUGIN:{NAME:catalog['product.name'],DESCRIPTION:catalog['product.description']}}));}
await writeFile(path.join(dist, 'plugin/manifest.json'), JSON.stringify(manifest, null, 2));
await cp(path.join(root, 'extension'), path.join(dist, 'site-blocker-extension'), { recursive: true, filter: s => !s.endsWith('public-key.txt') });
await writeFile(path.join(dist, 'site-blocker-extension/NOTICE.txt'),distributionNotice);
await cp(path.join(root, 'shared/policy.mjs'), path.join(dist, 'site-blocker-extension/policy.mjs'));
await writeFile(path.join(dist, 'site-blocker-extension/enforcer.mjs'), (await readFile(path.join(root,'extension/enforcer.mjs'),'utf8')).replace('../shared/policy.mjs','./policy.mjs'));
for(const file of ['popup.html','blocked.html'])await writeFile(path.join(dist, 'site-blocker-extension',file),(await readFile(path.join(root,'extension',file),'utf8')).replaceAll('__PRODUCT_NAME__',productName).replace('__BLOCKED_MESSAGE__',messages.en['extension.taskRunning']).replace('__CHECKING__',messages.en['extension.checking']));
for(const [locale,catalog]of Object.entries(messages)){
  const directory=path.join(dist, 'site-blocker-extension/_locales',locale==='zh-TW'?'zh_TW':locale);await mkdir(directory,{recursive:true});
  const entries=Object.entries(catalog).filter(([key])=>key.startsWith('extension.')||key.startsWith('product.')).map(([key,message])=>{
    const params=[...new Set([...message.matchAll(/\{(\w+)\}/g)].map(match=>match[1]))];
    return[key.replaceAll('.','_'),{message:message.replace(/\{(\w+)\}/g,(_,name)=>'$'+name+'$'),...(params.length?{placeholders:Object.fromEntries(params.map((name,index)=>[name,{content:'$'+(index+1)}]))}:{})}];
  });await writeFile(path.join(directory,'messages.json'),JSON.stringify(Object.fromEntries(entries),null,2));
}
const icons=Object.fromEntries([16,32,48,128].map(size=>[size,`icons/icon${size}.png`]));
await writeFile(path.join(dist, 'site-blocker-extension/manifest.json'), JSON.stringify({
  manifest_version: 3, name: '__MSG_product_name__', default_locale:'en', version, minimum_chrome_version: '120', key, icons,
  description: '__MSG_product_description__',
  permissions: ['declarativeNetRequest', 'tabs', 'alarms'],
  host_permissions: ['http://127.0.0.1/*'],
  background: { service_worker: 'worker.mjs', type: 'module' }, action: { default_popup: 'popup.html', default_icon: icons, default_title: '__MSG_product_name__' },
  content_security_policy: { extension_pages: "script-src 'self'; object-src 'self'; connect-src ws://127.0.0.1:47821" }
}, null, 2));
// ZIP uses store-only entries, avoiding downloaded build dependencies.
const entries = [];
for (const name of ['manifest.json','plugin.js',...manifest.assets]) entries.push([name, await readFile(path.join(dist, 'plugin', name))]);
await writeFile(path.join(dist, 'task-linked-blocker-plugin.zip'), createStoredZip(entries));
const result = spawnSync('dotnet', ['publish','bridge/FocusGuard.Bridge.csproj','--configuration','Release','--output',path.join(dist,'bridge'),'--nologo','--verbosity','quiet',...(portable ? ['--runtime','win-x64','--self-contained','true','--source','https://api.nuget.org/v3/index.json','-p:DebugType=None','-p:DebugSymbols=false'] : ['--configfile','NuGet.Config'])], {
  cwd: root, windowsHide: true, encoding: 'utf8', env: { ...process.env, DOTNET_CLI_HOME: path.join(root,'.local/dotnet'), DOTNET_CLI_TELEMETRY_OPTOUT:'1', DOTNET_SKIP_FIRST_TIME_EXPERIENCE:'1', DOTNET_GENERATE_ASPNET_CERTIFICATE:'false' }
});
if (result.status !== 0) { console.error(result.stdout, result.stderr); process.exit(1); }
await writeFile(path.join(dist,'bridge/NOTICE.txt'),distributionNotice);
if(!portable)await cp(path.join(dist,'bridge'),path.join(dist, 'site-blocker-extension/bridge'),{recursive:true,filter:file=>!file.endsWith('.pdb')});
if(portable){
  const runtime=JSON.parse(await readFile(path.join(dist,'bridge/FocusGuard.Bridge.runtimeconfig.json'),'utf8'));
  const assets=JSON.parse(await readFile(path.join(root,'bridge/obj/project.assets.json'),'utf8'));
  const packageFolder=Object.keys(assets.packageFolders)[0];
  await mkdir(path.join(dist,'bridge/licenses'),{recursive:true});
  for(const framework of runtime.runtimeOptions.includedFrameworks){
    const source=path.join(packageFolder,framework.name.toLowerCase()+'.runtime.win-x64',framework.version);
    for(const [file,label]of [['LICENSE.txt','LICENSE'],['THIRD-PARTY-NOTICES.TXT','THIRD-PARTY-NOTICES']])
      await cp(path.join(source,file),path.join(dist,'bridge/licenses',framework.name+'-'+label+'.txt'));
  }
}
console.log(`ビルド成功\nindex.html: ${indexBytes} / 100000 bytes\nプラグイン: ${path.join(dist,'task-linked-blocker-plugin.zip')}\n拡張: ${path.join(dist, 'site-blocker-extension')}\n拡張ID: ${extensionId}`);
