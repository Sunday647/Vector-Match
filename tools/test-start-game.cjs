require('./ts-loader.cjs');
const assert=require('assert'),Module=require('module'),original=Module._load;
Module._load=function(id,...args){if(id==='cc')return {_decorator:{ccclass:()=>T=>T},Component:class{},sys:{localStorage:{setItem(){}}}};return original.call(this,id,...args);};
const {Main}=require('../assets/scripts/Main.ts');Module._load=original;
const {Session}=require('../assets/scripts/core/Rules.ts');
const level={id:'resume-test',version:1,width:8,height:8,arrows:[0,1,2,3].map(i=>({id:String(i),color:'#000',points:[{x:0,y:i*2},{x:1,y:i*2}]}))};
function setup(){const m=new Main();m.settingsIcon=()=>{};m.root={removeAllChildren(){}};m.make=()=>({active:false,removeAllChildren(){}});m.panel=m.artwork=()=>{};m.text=()=>({});m.button=()=>{};m.buildUI=m.resetView=m.draw=m.updateHUD=()=>{};m.showModal=kind=>assert.fail('unexpected modal '+kind);m.levels=[level,level];return m;}
// Follow the actual failure -> home (save) -> start button path.
const m=setup();m.session=new Session(level);m.session.hearts=0;m.session.penalized=new Set(['0','1','2']);m.session.removed.add('3');m.session.hintUsed=true;
m.showHome();assert.equal(m.saved.attempts[level.id].hearts,0);m.buttons.find(b=>b.w===540).run();
assert.equal(m.screen,'game');assert.equal(m.modal,'');assert.equal(m.session.status,'playing');assert.equal(m.session.hearts,3);assert.equal(m.session.removed.size,0);assert.equal(m.session.penalized.size,0);assert.equal(m.session.hintUsed,false);assert.equal(m.saved.attempts[level.id].hearts,3);assert.equal(m.session.click('0'),'removed','board is immediately playable');
// App relaunch with a saved loss must behave identically.
const n=setup();n.saved={attempts:{[level.id]:{...m.session.snapshot(),removed:[],penalized:['0','1','2'],hearts:0}}};n.showHome();n.buttons.find(b=>b.w===540).run();assert.equal(n.session.status,'playing');assert.equal(n.session.hearts,3);
// Do not erase a live attempt, including the one remaining heart.
const p=setup();p.session=new Session(level);p.session.removed.add('0');p.session.penalized=new Set(['1','2']);p.session.hearts=1;p.session.hintUsed=true;const attempt=p.session.attemptId;
p.showHome();p.buttons.find(b=>b.w===540).run();assert.equal(p.session.hearts,1);assert(p.session.removed.has('0'));assert.equal(p.session.penalized.size,2);assert(p.session.hintUsed);assert.equal(p.session.attemptId,attempt);
console.log('PASS start game: saved failure restarts with 3 hearts, fresh launch works, live attempt resumes and board accepts input');
