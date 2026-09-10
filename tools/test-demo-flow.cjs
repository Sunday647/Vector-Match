require('./ts-loader.cjs');
const assert=require('assert'),Module=require('module');
const original=Module._load;
const storage=new Map();
Module._load=function(id,...args){if(id==='cc')return {_decorator:{ccclass:()=>T=>T},Component:class{},sys:{localStorage:{setItem:(k,v)=>storage.set(k,v)}}};return original.call(this,id,...args);};
const {Main}=require('../assets/scripts/Main.ts');Module._load=original;
const m=new Main();m.root={};m.overlay={active:false,removeAllChildren(){}};
for(const name of ['buildUI','resetView','draw','updateHUD','showModal','panel'])m[name]=()=>{};
m.text=()=>({string:''});
function finish(){for(let i=0;i<10000&&m.generation;i++)m.update(.016);assert(!m.generation);}
m.openLevel(0);finish();assert.equal(m.session.level.id,'generated-v2-1-contour-v4');assert(m.levels[1]);assert.equal(m.busy,false);
m.openLevel(1);finish();assert.equal(m.session.level.id,'generated-v2-2-contour-v4');
m.openLevel(13);assert(m.generationForeground);finish();assert.equal(m.session.level.id,'generated-v2-14-contour-v4');assert.equal(m.busy,false);
const before=JSON.stringify(m.session.level);m.openLevel(13,true);finish();assert.equal(JSON.stringify(m.session.level),before);
const s=m.session;const {canExit}=require('../assets/scripts/core/Rules.ts');const a=s.level.arrows.find(a=>canExit(a,s.level));s.click(a.id);m.save();m.openLevel(13);finish();assert(m.session.removed.has(a.id));
m.openLevel(2);m.openLevel(14);finish();assert.equal(m.session.level.id,'generated-v2-15-contour-v4');
console.log('PASS demo flow: initial generation, prefetch, far jump, restart, saved progress, replaced generation.');
