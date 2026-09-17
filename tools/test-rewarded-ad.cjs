require('./ts-loader.cjs');const assert=require('assert'),Module=require('module');
const api=require('../assets/scripts/core/RewardedAd.ts');const tick=()=>new Promise(r=>setImmediate(r));
function setup(fail=0){const close=new Set(),error=new Set();let calls=0;const ad={load:()=>Promise.resolve(),show:()=>{calls++;if(calls<=fail){for(const h of error)h({errCode:1004});return Promise.reject(Error('unavailable'));}return Promise.resolve();},onClose:h=>close.add(h),offClose:h=>close.delete(h),onError:h=>error.add(h),offError:h=>error.delete(h)};global.wx={createRewardedVideoAd:()=>ad};api.initRewardedAd('test-only');return {close,error,get calls(){return calls;},end(res){for(const h of [...close])h(res);}};}
(async()=>{
 let a=setup(),p=api.showRewardedAd();assert.equal(await api.showRewardedAd(),'busy');await tick();assert.equal(a.calls,1);a.end({isEnded:true});assert.equal(await p,'rewarded');assert.equal(a.close.size,0);
 a=setup(1);p=api.showRewardedAd();await tick();assert.equal(a.calls,2);assert.equal(a.close.size,1,'retry retains reward listener');a.end({isEnded:true});assert.equal(await p,'rewarded');
 a=setup(2);assert.equal(await api.showRewardedAd(),'error');await tick();assert.equal(a.calls,2);assert.equal(a.close.size,0);assert.equal(a.error.size,0);
 a=setup();p=api.showRewardedAd();await tick();a.end({isEnded:false});assert.equal(await p,'closed');
 a=setup();p=api.showRewardedAd();await tick();for(const h of [...a.error])h({});assert.equal(await p,'error');assert.equal(a.calls,1);
 const old=Module._load;Module._load=function(id,...args){if(id==='cc')return {_decorator:{ccclass:()=>T=>T},Component:class{}};return old.call(this,id,...args);};const {Main}=require('../assets/scripts/Main.ts');Module._load=old;
 for(const stale of ['none','restart','home','quota']){
  a=setup();const m=new Main();let hearts=0,saves=0;const session={attemptId:'one',level:{id:'level'},status:'lost',addHeart(){hearts++;}};m.session=session;m.saved={};m.screen='game';m.modal='lost';m.rewardedAdEnabled=true;m.showModal=m.updateHUD=m.draw=m.message=m.text=()=>{};m.closeModal=()=>{m.modal='';};m.save=()=>saves++;
  p=m.claimAdHeart();await m.claimAdHeart();await tick();assert.equal(a.calls,1);
  if(stale==='restart')m.session={...session,attemptId:'two'};
  if(stale==='home')m.screen='home';
  if(stale==='quota')m.saved=require('../assets/scripts/core/CloudProgress.ts').markAdReward({},'level');
  a.end({isEnded:true});await p;assert.equal(hearts,stale==='none'?1:0);assert.equal(saves,stale==='none'?1:0);assert.equal(m.adClaimPending,false);
 }
 console.log('PASS rewarded ads: single flight, retry with error callback, terminal cleanup, early close, playback error, same-round reward and quota recheck');
})().catch(e=>{console.error(e);process.exitCode=1;});
