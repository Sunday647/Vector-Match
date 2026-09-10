// Execute the emitted Cocos modules, including its Babel helpers, rather than
// transpiling the TypeScript again with different compiler assumptions.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const modules=new Map(),cache=new Map();
const context=vm.createContext({console,System:{register(name,deps,declare){
 if(Array.isArray(name)){const wrapper=deps;wrapper(()=>{},{}).execute();return;}
 modules.set(name,{deps,declare});
}}});
for(const file of ['build/wechatgame/src/chunks/bundle.js','build/wechatgame/assets/main/index.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const cc={cclegacy:{_RF:{push(){},pop(){}}},_decorator:{ccclass:()=>T=>T},Component:function Component(){}};
function load(name){
 if(name==='cc')return cc;
 if(cache.has(name))return cache.get(name);
 const mod=modules.get(name);assert(mod,'missing emitted module '+name);const result={};cache.set(name,result);
 const body=mod.declare((k,v)=>typeof k==='string'?result[k]=v:Object.assign(result,k),{});
 mod.deps.forEach((dep,i)=>body.setters[i](load(dep.startsWith('.')?'chunks:///_virtual/'+dep.slice(2):dep)));
 body.execute();return result;
}
const {generateLevel}=load('chunks:///_virtual/Generator.ts');
const rules=load('chunks:///_virtual/Rules.ts');
const expected=JSON.parse(fs.readFileSync('tests/generator-report.json','utf8')).rows;
let level;
for(let index=0;index<12;index++){
 const gen=generateLevel(index);let step;do{step=gen.next();}while(!step.done);
 rules.validate(step.value.level);
 assert.equal(step.value.signature,expected[index].signature,'emitted geometry must match source level '+(index+1));
 if(index===2)level=step.value.level;
}
const session=new rules.Session(level),legal=level.arrows.find(a=>rules.canExit(a,level));
assert.equal(session.click(legal.id),'removed');
const locked=level.arrows.find(a=>!session.removed.has(a.id)&&!rules.canExit(a,level,session.removed));
assert.equal(session.click(locked.id),'penalty');assert.equal(session.click(locked.id),'blocked');
const saved=JSON.parse(JSON.stringify(session.snapshot()));
assert.equal(saved.removed[0],legal.id);assert.equal(saved.penalized[0],locked.id);
assert(new rules.Session(level).restore(saved),'emitted save/restore');
const {Main}=load('chunks:///_virtual/Main.ts'),main=new Main();
main.gesture=new rules.Gesture();main.gesture.start(1,{x:0,y:0});main.gesture.start(2,{x:20,y:0});
main.point=e=>e;main.modal=false;main.busy=false;let zoomed=false;
main.zoom=()=>{zoomed=true;};main.transform=()=>{};main.pan={x:0,y:0};
main.session=session;main.moveTouch({getID:()=>2,x:30,y:0});assert(zoomed,'emitted pinch gesture must read Map values');
console.log('PASS emitted WeChat build: first 12 levels match source geometry and validate; penalties, JSON save/restore, pinch zoom');
