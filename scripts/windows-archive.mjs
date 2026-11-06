import {spawnSync} from 'node:child_process';
import path from 'node:path';

// Match Windows ZIP APIs. Paths are data in the environment, never PowerShell source.
export function windowsArchive(operation,archive,directory='.'){
 const script=String.raw`
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$archive = $env:TASK_BLOCKER_ARCHIVE_FILE
$directory = $env:TASK_BLOCKER_ARCHIVE_DIRECTORY
switch ($env:TASK_BLOCKER_ARCHIVE_OPERATION) {
 'create' {
   $zip = [System.IO.Compression.ZipFile]::Open($archive, [System.IO.Compression.ZipArchiveMode]::Create)
   try {
     foreach ($file in Get-ChildItem -LiteralPath $directory -Recurse -File) {
       $name = $file.FullName.Substring($directory.Length + 1).Replace('\', '/')
       [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $name, [System.IO.Compression.CompressionLevel]::Optimal)
     }
   } finally { $zip.Dispose() }
 }
 'extract' { [System.IO.Compression.ZipFile]::ExtractToDirectory($archive, $directory) }
 'inspect' {
   $zip = [System.IO.Compression.ZipFile]::OpenRead($archive)
   try { ConvertTo-Json -Compress -InputObject @($zip.Entries | ForEach-Object { $_.FullName }) }
   finally { $zip.Dispose() }
 }
 default { throw 'Unknown archive operation' }
}
`;
 const result=spawnSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command','-'],{
   input:script+'\n\n',encoding:'utf8',windowsHide:true,timeout:120000,
   env:{...process.env,TASK_BLOCKER_ARCHIVE_OPERATION:operation,TASK_BLOCKER_ARCHIVE_FILE:path.resolve(archive),TASK_BLOCKER_ARCHIVE_DIRECTORY:path.resolve(directory)}
 });
 if(result.status!==0)throw new Error('Windows ZIP '+operation+' failed: '+(result.stderr||result.error?.message||result.status));
 return operation==='inspect'?JSON.parse(result.stdout.trim()):undefined;
}
