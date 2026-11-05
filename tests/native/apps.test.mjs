import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
test('Windows app guard: exact-name forced termination, stop, stale state and legacy payload rejection',{timeout:60000},()=>{
 const env={...process.env,DOTNET_CLI_HOME:path.resolve('.local/dotnet'),DOTNET_CLI_TELEMETRY_OPTOUT:'1',DOTNET_SKIP_FIRST_TIME_EXPERIENCE:'1'};
 const build=spawnSync('dotnet',['build','tests/app-guard/FocusGuard.AppTests.csproj','--configuration','Release','--configfile','NuGet.Config','--nologo','--verbosity','quiet'],{env,windowsHide:true,encoding:'utf8'});
 assert.equal(build.status,0,build.stdout+build.stderr);
 const run=spawnSync(path.resolve('tests/app-guard/bin/Release/net10.0/FocusGuard.AppTests.exe'),[],{windowsHide:true,encoding:'utf8'});
 assert.equal(run.status,0,run.stdout+run.stderr);console.log(run.stdout.trim());
});
