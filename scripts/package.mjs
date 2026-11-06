import {spawnSync} from 'node:child_process';
import {readFile,writeFile,cp,readdir,mkdtemp,rename} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {windowsArchive} from './windows-archive.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const {version}=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
const built=spawnSync(process.execPath,['scripts/build.mjs','--portable'],{cwd:root,stdio:'inherit',windowsHide:true});
if(built.status!==0)process.exit(built.status??1);
const builtDirectory=path.join(root,'dist/portable');
// Stage only named distribution components, never the source checkout or local settings.
const staging=await mkdtemp(path.join(root,'dist/package-'));
await cp(path.join(builtDirectory,'extension'),path.join(staging,'extension'),{recursive:true});
await cp(path.join(builtDirectory,'bridge'),path.join(staging,'extension/bridge'),{recursive:true,filter:file=>!file.endsWith('.pdb')});
await cp(path.join(builtDirectory,'super-focus-guard.zip'),path.join(staging,'super-focus-guard.zip'));
await cp(path.join(root,'distribution/Setup.cmd'),path.join(staging,'extension/Setup.cmd'));
await cp(path.join(root,'HowToInstall.md'),path.join(staging,'HowToInstall.md'));
await cp(path.join(root,'THIRD_PARTY_NOTICES.md'),path.join(staging,'extension/THIRD_PARTY_NOTICES.md'));
// Self-contained .NET publish carries its runtime LICENSE/ThirdPartyNotices files.
const runtimeFiles=await readdir(path.join(staging,'extension/bridge'));
for(const required of ['coreclr.dll','hostfxr.dll','hostpolicy.dll','System.Private.CoreLib.dll','Microsoft.AspNetCore.dll'])
  if(!runtimeFiles.includes(required))throw new Error('Incomplete self-contained runtime: '+required);
for(const framework of ['Microsoft.NETCore.App','Microsoft.AspNetCore.App'])for(const notice of ['LICENSE','THIRD-PARTY-NOTICES'])
  if(!(await readFile(path.join(staging,'extension/bridge/licenses',framework+'-'+notice+'.txt'),'utf8')).trim())throw new Error('Missing runtime license notice');
const pluginCode=await readFile(path.join(builtDirectory,'plugin/plugin.js'),'utf8');
const config=JSON.parse(pluginCode.match(/const BUILD_CONFIG = (.*);/)[1]);
if(config.directory||config.executable||pluginCode.includes(JSON.stringify(root).slice(1,-1)))throw new Error('Distribution contains build-machine paths');
const archive=path.join(root,'dist',`task-linked-blocker-${version}-win-x64.zip`);
const temporaryArchive=staging+'.zip';
windowsArchive('create',temporaryArchive,staging);
const names=windowsArchive('inspect',temporaryArchive);
const topLevel=[...new Set(names.map(name=>name.split('/')[0]))].sort();
if(JSON.stringify(topLevel)!==JSON.stringify(['HowToInstall.md','extension','super-focus-guard.zip']))throw new Error('Unexpected top-level distribution files');
await rename(temporaryArchive,archive);
const digest=createHash('sha256').update(await readFile(archive)).digest('hex');
await writeFile(archive+'.sha256',digest+'  '+path.basename(archive)+'\n');
console.log('Distribution: '+archive+'\nSHA-256: '+digest+'\nNo upload or publication performed.');
