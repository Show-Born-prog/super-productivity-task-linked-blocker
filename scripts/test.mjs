import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const dir = process.argv[2] === 'native' ? 'tests/native' : 'tests';
const files = (await readdir(dir)).filter(f => f.endsWith('.test.mjs')).map(f => `${dir}/${f}`);
const result = spawnSync(process.execPath,['--test',...files],{stdio:'inherit',windowsHide:true});
process.exit(result.status ?? 1);
