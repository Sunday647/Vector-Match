const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('openDataContext/index.js','utf8');
for(const mode of ['empty','success','failure']){
 const text=[];const ctx={};
 for(const method of ['clearRect','beginPath','moveTo','arcTo','closePath','fill','stroke','save','restore','bezierCurveTo','translate','scale','arc','lineTo','clip','drawImage','fillRect'])ctx[method]=()=>{};
 ctx.fillText=(s)=>text.push(String(s)); // Deliberately no ellipse(), roundRect(), or reset().
 let listener;const wx={onMessage:fn=>listener=fn,getUserInfo:({success})=>success({data:[{openid:'self',nickname:'我'}]}),createImage:()=>({}),getFriendCloudStorage:({success,fail})=>mode==='failure'?fail():success({data:mode==='empty'?[]:[{nickname:'好友',KVDataList:[{key:'level',value:'128'}]}]})};
 vm.runInNewContext(source,{sharedCanvas:{width:640,height:960,getContext:()=>ctx},wx});
 listener({type:'showRank',width:640,height:960,completed:10});
 assert(text.includes('排行榜'));assert(text.includes('排名'));assert(text.includes('我'));assert(text.includes('10'));
 if(mode==='success')assert(text.includes('好友'));
}
console.log('PASS legacy sharedCanvas without ellipse: loading, empty, success, failure, self progress');

const context={sharedCanvas:{getContext:()=>({})},wx:{onMessage(){}}};vm.createContext(context);vm.runInContext(source,context);
const row=(openid,nickname,level,avatarUrl='')=>({openid,nickname,avatarUrl,KVDataList:[{key:'level',value:String(level)}]});
let result=context.mergeRankRows([row('vicky','Vicky',2,'avatar')],2,{openid:'vicky',nickname:'Vicky',avatarUrl:'avatar'});
assert.equal(result.length,1);assert.equal(result[0].nickname,'Vicky');assert(result[0].isSelf);
result=context.mergeRankRows([row('vicky','Vicky',2),row('friend','Vicky',2)],3,{openid:'vicky',nickname:'Vicky'});
assert.equal(result.length,2);assert.equal(context.valueOf(result[0]),3);assert.equal(result.filter(r=>r.isSelf).length,1);
assert.equal(context.mergeRankRows([row('vicky','Vicky',2)],2,null).length,1,'no anonymous duplicate when identity fails');
assert.equal(context.mergeRankRows([],2,null)[0].nickname,'我');
result=context.mergeRankRows([row('vicky','Vicky',2,'avatar')],2,{nickName:'Vicky',avatarUrl:'avatar'});assert.equal(result.length,1);assert(result[0].isSelf);
console.log('PASS rank identity: Vicky dedup, same-name friend preserved, local merge, identity failure and empty fallback');

for(const profile of [{openid:'selfOpenId',nickname:'Vicky',avatarUrl:'avatar'},{openid:'different',nickname:'Vicky',avatarUrl:'avatar'},{openid:'real',nickname:'Vicky',avatarUrl:'avatar'}]){const rows=context.mergeRankRows([row('', 'Vicky',2,'avatar')],2,profile);assert.equal(rows.length,1,'profile must not append to nonempty cloud list');assert(rows[0].isSelf);}
result=context.mergeRankRows([row('cloud-id','Vicky',2,'avatar')],2,{openid:'different-id',nickname:'Vicky',avatarUrl:'avatar'});assert.equal(result.length,1);assert(!result[0].isSelf,'conflicting real identities are not merged');
console.log('PASS regression: selfOpenId alias, missing ID, conflicting IDs never append duplicate Vicky');
