import {spawnSync} from 'node:child_process';
import {readFile,writeFile,cp,readdir,mkdtemp,rename,rm} from 'node:fs/promises';
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
const temporaryArchive=staging+'.zip';
try {
  const contents=path.join(staging,'task-linked-blocker');
  await cp(path.join(builtDirectory,'site-blocker-extension'),path.join(contents,'site-blocker-extension'),{recursive:true});
  await cp(path.join(builtDirectory,'bridge'),path.join(contents,'site-blocker-extension/bridge'),{recursive:true,filter:file=>!file.endsWith('.pdb')});
  await cp(path.join(builtDirectory,'task-linked-blocker-plugin.zip'),path.join(contents,'task-linked-blocker-plugin.zip'));
  await cp(path.join(root,'HowToInstall.md'),path.join(contents,'HowToInstall.md'));
  await cp(path.join(root,'THIRD_PARTY_NOTICES.md'),path.join(contents,'site-blocker-extension/THIRD_PARTY_NOTICES.md'));
  // Self-contained .NET publish carries its runtime LICENSE/ThirdPartyNotices files.
  const runtimeFiles=await readdir(path.join(contents,'site-blocker-extension/bridge'));
  for(const required of ['coreclr.dll','hostfxr.dll','hostpolicy.dll','System.Private.CoreLib.dll','Microsoft.AspNetCore.dll'])
    if(!runtimeFiles.includes(required))throw new Error('Incomplete self-contained runtime: '+required);
  for(const framework of ['Microsoft.NETCore.App','Microsoft.AspNetCore.App'])for(const notice of ['LICENSE','THIRD-PARTY-NOTICES'])
    if(!(await readFile(path.join(contents,'site-blocker-extension/bridge/licenses',framework+'-'+notice+'.txt'),'utf8')).trim())throw new Error('Missing runtime license notice');
  const pluginCode=await readFile(path.join(builtDirectory,'plugin/plugin.js'),'utf8');
  const config=JSON.parse(pluginCode.match(/const BUILD_CONFIG = (.*);/)[1]);
  if(config.directory||config.executable||pluginCode.includes(JSON.stringify(root).slice(1,-1)))throw new Error('Distribution contains build-machine paths');
  const archive=path.join(root,'dist',`task-linked-blocker-${version}-win-x64.zip`);
  windowsArchive('create',temporaryArchive,staging);
  const names=windowsArchive('inspect',temporaryArchive);
  const topLevel=[...new Set(names.map(name=>name.split('/')[0]))].sort();
  if(JSON.stringify(topLevel)!==JSON.stringify(['task-linked-blocker']))throw new Error('Unexpected top-level distribution files');
  if(JSON.stringify((await readdir(contents)).sort())!==JSON.stringify(['HowToInstall.md','site-blocker-extension','task-linked-blocker-plugin.zip']))throw new Error('Unexpected distribution contents');
  await rename(temporaryArchive,archive);
  const digest=createHash('sha256').update(await readFile(archive)).digest('hex');
  await writeFile(archive+'.sha256',digest+'  '+path.basename(archive)+'\n');
  console.log('Distribution: '+archive+'\nSHA-256: '+digest+'\nNo upload or publication performed.');
} finally {
  // Only remove the temporary directory created by this invocation, inside dist.
  if(path.dirname(staging)!==path.join(root,'dist')||!/^package-[A-Za-z0-9]{6}$/.test(path.basename(staging)))throw new Error('Unsafe package cleanup path');
  await rm(temporaryArchive,{force:true});
  await rm(staging,{recursive:true,force:true});
}
