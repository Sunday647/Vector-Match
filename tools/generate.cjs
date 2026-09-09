require('./ts-loader.cjs');
const fs=require('fs');const {canExit,solve,validate}=require('../assets/scripts/core/Rules.ts');
function random(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
const dirs=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}], key=p=>p.x+','+p.y;
const ell=(x,y,cx,cy,rx,ry)=>((x-cx)/rx)**2+((y-cy)/ry)**2<=1;
function poly(x,y,ps){let c=false;for(let i=0,j=ps.length-1;i<ps.length;j=i++){const a=ps[i],b=ps[j];if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}
const specs=[
{id:'cloud',name:'云朵散步',subtitle:'让每一缕颜色，找到自己的出口',width:25,height:19,seed:34,mask:(x,y)=>ell(x,y,7,8,6,5)||ell(x,y,12,11,6,6)||ell(x,y,18,8,5,5)||poly(x,y,[[5,4],[20,4],[20,10],[5,10]])},
{id:'cat',name:'午后小猫',subtitle:'把小小的心事，一根根解开',width:43,height:51,seed:921,mask:(x,y)=>poly(x,y,[[14,3],[35,3],[38,6],[37,20],[33,26],[33,33],[37,40],[33,48],[25,44],[19,45],[12,49],[10,40],[9,36],[12,30],[17,27],[16,15],[13,9]])||ell(x,y,10,7,9,4)||poly(x,y,[[1,7],[1,20],[4,23],[7,22],[5,19],[5,9]])},
{id:'dog',name:'小狗来信',subtitle:'慢慢来，总有一条路能走出去',width:43,height:49,seed:425,mask:(x,y)=>ell(x,y,23,13,12,11)||ell(x,y,23,33,12,10)||ell(x,y,11,33,5,10)||ell(x,y,35,33,5,10)||poly(x,y,[[15,4],[15,21],[20,23],[22,4]])||poly(x,y,[[25,4],[25,23],[30,21],[32,4]])||poly(x,y,[[11,10],[5,16],[3,23],[6,25],[8,18],[15,15]])}
];
// The generator owns geometry and its outer-to-inner band. Runtime chooses the
// actual four colors from the current level's solar-term palette.
const previewColors=['#B6A014','#ECD452','#FFEE6F','#FFF799'];
function layerMap(cells,allowed){const layers={},queue=[];for(const p of cells){if(dirs.some(v=>!allowed.has(key({x:p.x+v.x,y:p.y+v.y})))){layers[key(p)]=0;queue.push(p);}}for(let i=0;i<queue.length;i++){const p=queue[i],base=layers[key(p)];for(const v of dirs){const n={x:p.x+v.x,y:p.y+v.y},k=key(n);if(allowed.has(k)&&layers[k]===undefined){layers[k]=base+1;queue.push(n);}}}return layers;}
function make(spec,seed){const rnd=random(seed),level={id:spec.id,version:2,name:spec.name,subtitle:spec.subtitle,width:spec.width,height:spec.height,arrows:[]},cells=[];for(let y=1;y<spec.height-1;y++)for(let x=1;x<spec.width-1;x++)if(spec.mask(x,y))cells.push({x,y});const allowed=new Set(cells.map(key)),used=new Set(),layers=layerMap(cells,allowed);
let failures=0;
while(failures<1600){
 const free=cells.filter(p=>!used.has(key(p)));if(free.length<2)break;
 const h=free[Math.floor(rnd()*free.length)],d=dirs[Math.floor(rnd()*4)];
 let prev={x:h.x-d.x,y:h.y-d.y};if(!allowed.has(key(prev))||used.has(key(prev))){failures++;continue;}
 const points=[h,prev],local=new Set(points.map(key));let last={x:-d.x,y:-d.y},target=4+Math.floor(rnd()*(spec.id==='cloud'?13:17));
 while(points.length<target){const q=points[points.length-1];const options=dirs.filter(v=>{const n={x:q.x+v.x,y:q.y+v.y};return allowed.has(key(n))&&!used.has(key(n))&&!local.has(key(n));});if(!options.length)break;
 let v=options.find(v=>v.x===last.x&&v.y===last.y);if(!v||rnd()<0.46)v=options[Math.floor(rnd()*options.length)];prev={x:q.x+v.x,y:q.y+v.y};points.push(prev);local.add(key(prev));last=v;
 }
 const depth=points.reduce((sum,p)=>sum+(layers[key(p)]||0),0)/points.length;
 const a={id:'a'+level.arrows.length,points:points.reverse(),color:previewColors[0],_depth:depth};
 if(!canExit(a,{...level,arrows:[...level.arrows,a]})){failures++;continue;}
 level.arrows.push(a);points.forEach(p=>used.add(key(p)));failures=0;
}
const depths=level.arrows.map(a=>a._depth),minDepth=Math.min(...depths),maxDepth=Math.max(...depths);
for(const a of level.arrows){a.colorBand=Math.max(0,Math.min(3,Math.round((a._depth-minDepth)/Math.max(0.001,maxDepth-minDepth)*3)));a.color=previewColors[a.colorBand];delete a._depth;}
return {level,coverage:used.size/cells.length,seed};}
const report=[];
for(const spec of specs){let best;for(let trial=0;trial<7;trial++){const r=make(spec,spec.seed+trial);if(!best||r.coverage>best.coverage)best=r;}validate(best.level);const solution=solve(best.level);fs.writeFileSync('assets/resources/levels/'+spec.id+'.json',JSON.stringify(best.level));report.push({id:spec.id,arrows:best.level.arrows.length,coverage:best.coverage,seed:best.seed,solution,initialExits:best.level.arrows.filter(a=>canExit(a,best.level)).length});}
fs.writeFileSync('tests/level-report.json',JSON.stringify(report,null,2));console.log(report.map(({solution,...r})=>r));
