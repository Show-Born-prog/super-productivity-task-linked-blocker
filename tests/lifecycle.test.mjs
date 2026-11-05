import test from 'node:test';
import assert from 'node:assert/strict';
import {createController} from '../plugin/controller.mjs';
test('helper is required only for tracking with active targets, idle is intentional and unprotected failures remain visible',async()=>{
 const c=createController({api:{},sessionId:'lifecycle',transport:{loadRules:async()=>[{tagId:'a',domains:['example.org'],apps:[]}],write:async()=>({bridgeConnected:false,browsers:[]})}});
 await c.initialize();assert.equal(c.getState().helperRequired,false);
 await c.currentTaskChange({current:{id:'task',tagIds:['a']}});assert.equal(c.getState().helperRequired,true);assert.equal(c.getState().appProtection.status,'unavailable');
 await c.action({action:'[FocusMode] Start Break'});assert.equal(c.getState().helperRequired,false);assert.equal(c.getState().appProtection.status,'idle');
 await c.action({action:'[FocusMode] Start Session'});assert.equal(c.getState().helperRequired,true);
 await c.currentTaskChange({current:{id:'empty',tagIds:[]}});assert.equal(c.getState().helperRequired,false);
 await c.currentTaskChange({current:null});assert.equal(c.getState().helperRequired,false);
});
