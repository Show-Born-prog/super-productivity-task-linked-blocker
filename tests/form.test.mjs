import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareSettings} from '../plugin/form.mjs';
test('blank app drafts are ignored and no removed warning settings are saved',()=>{
 const result=prepareSettings([{tagId:'b',domains:'example.org\n',apps:[{executable:''},{executable:' Steam.EXE '}]}]);
 assert.deepEqual(result,{rules:[{tagId:'b',domains:['example.org'],apps:[{executable:'steam.exe'}]}]});
});
test('form errors identify tag row and app field without partial saving',()=>{
 assert.throws(()=>prepareSettings([{tagId:'b',domains:'example.org',apps:[{executable:'C:\\steam.exe'}]}]),e=>e.rowIndex===0&&e.appIndex===0&&e.field==='executable');
 assert.throws(()=>prepareSettings([{tagId:'b',domains:'https://example.org',apps:[]}]),e=>e.rowIndex===0&&e.field==='domains');
 assert.throws(()=>prepareSettings([{tagId:'b',domains:'',apps:[]},{tagId:'b',domains:'',apps:[]}]),e=>e.rowIndex===1&&e.field==='tag');
 assert.throws(()=>prepareSettings([{tagId:'',domains:'',apps:[]}]),e=>e.rowIndex===0&&e.field==='tag');
});
