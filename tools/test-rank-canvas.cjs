const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('openDataContext/index.js','utf8');
for(const mode of ['empty','success','failure']){
 const text=[];const ctx={};
 for(const method of ['clearRect','beginPath','moveTo','arcTo','closePath','fill','stroke','save','restore','bezierCurveTo','translate','scale','arc','lineTo','clip','drawImage','fillRect'])ctx[method]=()=>{};
 ctx.fillText=(s)=>text.push(String(s)); // Deliberately no ellipse(), roundRect(), or reset().
 let listener;const wx={onMessage:fn=>listener=fn,createImage:()=>({}),getFriendCloudStorage:({success,fail})=>mode==='failure'?fail():success({data:mode==='empty'?[]:[{nickname:'好友',KVDataList:[{key:'level',value:'128'}]}]})};
 vm.runInNewContext(source,{sharedCanvas:{width:640,height:960,getContext:()=>ctx},wx});
 listener({type:'showRank',width:640,height:960,completed:10});
 assert(text.includes('排行榜'));assert(text.includes('排名'));assert(text.includes('我'));assert(text.includes('10'));
 if(mode==='success')assert(text.includes('好友'));
}
console.log('PASS legacy sharedCanvas without ellipse: loading, empty, success, failure, self progress');
