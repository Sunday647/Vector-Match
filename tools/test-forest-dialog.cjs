require('./ts-loader.cjs');
const assert=require('assert'),Module=require('module'),original=Module._load;
Module._load=function(id,...args){if(id==='cc')return {_decorator:{ccclass:()=>T=>T},Component:class{},Label:{HorizontalAlign:{LEFT:0}},Color:class{fromHEX(s){return s;}}};return original.call(this,id,...args);};
const {Main}=require('../assets/scripts/Main.ts');Module._load=original;
for(const height of [900,1280,1560]){
 const m=new Main(),labels=[];m.height=height;m.overlay={};m.saved={};m.session={level:{id:'first'}};
 m.make=()=>({setScale(){},addComponent:()=>new Proxy({node:{setPosition(){}}},{get:(t,k)=>k in t?t[k]:()=>{}})});
 m.artwork=()=>{};m.panel=()=>{};m.text=(p,s)=>{labels.push(s);return {};};
 let action='';m.showHome=()=>action='home';m.closeModal=()=>action='close';m.openLevel=(i,reset)=>{assert(reset);action='retry';};m.claimAdHeart=()=>action='ad';m.showModal=()=>{};
 m.toggleSound=()=>{m.sound=!m.sound;};m.toggleMusic=()=>{m.music=!m.music;};
 m.buttons=[];m.forestDialog('settings');assert.equal(m.buttons.length,4);
 const oldMusic=m.music;m.buttons[0].run();assert.equal(m.sound,false);assert.equal(m.music,oldMusic);
 m.buttons[1].run();assert.equal(m.music,false);m.buttons[2].run();assert.equal(action,'home');m.buttons[3].run();assert.equal(action,'close');
 const k=Math.min(1,(height-160)/860);assert.equal(m.buttons[3].x,266*k);
 m.buttons=[];m.forestDialog('lost');assert.equal(m.buttons.length,3);m.buttons[0].run();assert.equal(action,'ad');m.buttons[1].run();assert.equal(action,'retry');m.buttons[2].run();assert.equal(action,'home');
 assert(labels.includes('保留本局进度，继续游戏'));
 const {markAdReward}=require('../assets/scripts/core/CloudProgress.ts');m.saved=markAdReward({},'first');m.buttons=[];m.forestDialog('lost');assert.equal(m.buttons.length,2,'no duplicate ad claim after reward');
 for(const b of m.buttons)assert(Math.abs(b.y)+b.h/2<height/2,'buttons fit short and tall screens');
}
console.log('PASS forest dialogs: independent switches, close/home, ad/restart distinction, claimed reward, scaled touch areas');
