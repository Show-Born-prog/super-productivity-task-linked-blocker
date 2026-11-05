// Development-only extraction of appearance CSS. Does not execute or change the host application.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
const packagePath=process.argv[2]||path.join(process.env.LOCALAPPDATA,'Programs/Super Productivity/resources/app.asar');
const asar=await readFile(packagePath);const header=JSON.parse(asar.subarray(16,16+asar.readUInt32LE(12)).toString()),base=8+asar.readUInt32LE(4);
const browser=header.files['.tmp'].files['angular-dist'].files.browser.files;
const sources=new Map();for(const [name,e]of Object.entries(browser)){if(!name.endsWith('.js.map'))continue;const map=JSON.parse(asar.subarray(base+Number(e.offset),base+Number(e.offset)+e.size).toString());(map.sources||[]).forEach((file,i)=>{if(file.includes('@angular/material/fesm2022/')&&map.sourcesContent?.[i])sources.set(file.split('/').at(-1),map.sourcesContent[i]);});}
const entries=browser;
function quoted(source,start){const quote=source[start];let i=start+1;for(;i<source.length;i++){if(source[i]==='\\'){i++;continue;}if(source[i]===quote)break;}const literal=source.slice(start,i+1);if(literal.includes('${'))throw Error('dynamic CSS literal');return{value:quote==='"'?JSON.parse(literal):vm.runInNewContext(literal),end:i+1};}
function styleArrays(source,limit=Infinity){const results=[];let index=0;while((index=source.indexOf('styles:',index))>=0){let at=index+7;while(/\s/.test(source[at]))at++;if(source[at]!=='['){index=at;continue;}let text='',i=at+1;while(i<source.length&&source[i]!==']'){
 if(/[\s,]/.test(source[i])){i++;continue;}
 if(['"',"'",'`'].includes(source[i])){const v=quoted(source,i);text+=v.value+'\n';i=v.end;continue;}
 const match=/^\w+/.exec(source.slice(i));if(!match)throw Error('unsupported style expression');const name=match[0];const assignment=new RegExp('(?:const|let|var)\\s+'+name+'\\s*=\\s*"').exec(source);if(!assignment)throw Error('style constant not found: '+name);const start=assignment.index+assignment[0].length-1;const v=quoted(source,start);text+=v.value+'\n';i+=name.length;
 }results.push(text);if(results.length>=limit)break;index=i+1;}return results;}
const files=['button.mjs','_icon-button-chunk.mjs','_form-field-chunk.mjs','input.mjs','select.mjs','icon.mjs','menu.mjs','_pseudo-checkbox-chunk.mjs','slide-toggle.mjs'];
const parts=[];for(const name of files){const source=sources.get(name);const css=styleArrays(source,name==='button.mjs'?1:Infinity);parts.push('/* Angular Material: '+name+' */\n'+css.join('\n'));console.log(name,css.length,css.join('').length);}
// Read the installed ASAR directly to retain the host component's actual compiled styles.
for(const selector of ['collapsible','config-section','config-form','config-page','task'])for(const [name,e]of Object.entries(entries)){if(!name.endsWith('.js'))continue;const source=asar.subarray(base+Number(e.offset),base+Number(e.offset)+e.size).toString();const index=source.indexOf('selectors:[["'+selector+'"]]');if(index<0)continue;const rest=source.slice(index);const style=rest.indexOf('styles:[');if(style<0)continue;const css=styleArrays(rest.slice(style),1)[0];parts.push('/* Super Productivity '+selector+'; only the Angular scope placeholder is bound locally. */\n'+css.replaceAll('%COMP%','fg-native-'+selector));console.log(selector,css.length);break;}
const output='plugin/native';await mkdir(output,{recursive:true});
const css=parts.join('\n');await writeFile(path.join(output,'components.css'),css);console.log('Component styles written:',Buffer.byteLength(css),'bytes. Review against the installed host before releasing.');
