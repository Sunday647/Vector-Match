import {Level, Point, validate} from './Rules';

/** Build one contour around a whole-silhouette spanning tree, then cut paths
 * in removal order. A head can turn out of the contour in any of four directions.
 * Each subsequent head ray meets the previous removed path, linking a dependency
 * chain. A per-level restart limit controls the number of chains (two in the
 * third-level challenge). Actual Rules validation is mandatory.
 * The coarse cells construct the global contour; they never bound an arrow. */
export function* generateExtreme(raw:{width:number;height:number;cells:Point[];name:string},rnd:()=>number,options={index:2,chains:2}):Generator<void,{level:Level;coverage:number},unknown>{
// Avoid rounding every barely touched boundary cell outward: that inflation
// made clouds and animal heads look alike after filling. Keep the approved
// third-level geometry, and use half-cell coverage for the shared generator.
const counts=new Map<string,number>();
for(const p of raw.cells){const k=Math.floor(p.x/2)+','+Math.floor(p.y/2);counts.set(k,(counts.get(k)||0)+1);}
const source={...raw,width:Math.ceil(raw.width/2),height:Math.ceil(raw.height/2),cells:Array.from(counts.keys()).filter(k=>options.index===2||counts.get(k)>=2).map(k=>{const [x,y]=k.split(',').map(Number);return{x,y};})},W=source.width*2,H=source.height*2;
const dirs=[[1,0],[-1,0],[0,1],[0,-1]],key=(x,y)=>y*W+x;
function* make():Generator<void,{arrows:{ids:number[];d:number[]}[];coverage:number},unknown>{
const rng=rnd,cells=new Set(source.cells.map(p=>p.y*source.width+p.x)),seen=new Set<number>(),tree:number[][]=[];
function grow(x,y,last){seen.add(y*source.width+x);
 const opts=dirs.map((d,i)=>({d,i,s:rng()+(i===last?.55:0)})).sort((a,b)=>b.s-a.s);
 for(const {d,i} of opts){const nx=x+d[0],ny=y+d[1],c=ny*source.width+nx;if(nx<0||ny<0||nx>=source.width||ny>=source.height||!cells.has(c)||seen.has(c))continue;tree.push([x,y,nx,ny]);grow(nx,ny,i);}}
for(const p of source.cells)if(!seen.has(p.y*source.width+p.x))grow(p.x,p.y,0);
const adj=new Map<number,number[]>();function add(a,b){if(!adj.has(a))adj.set(a,[]);if(!adj.has(b))adj.set(b,[]);adj.get(a).push(b);adj.get(b).push(a);}
function del(a,b){adj.set(a,adj.get(a).filter(v=>v!==b));adj.set(b,adj.get(b).filter(v=>v!==a));}
for(const {x,y} of source.cells){const a=key(2*x,2*y),b=a+1,c=b+W,d=a+W;add(a,b);add(b,c);add(c,d);add(d,a);}
for(let [x,y,nx,ny] of tree){if(nx<x||ny<y){[x,nx]=[nx,x];[y,ny]=[ny,y];}
 if(nx>x){const a=key(2*x+1,2*y),b=a+W,c=a+1,d=c+W;del(a,b);del(c,d);add(a,c);add(b,d);}
 else{const a=key(2*x,2*y+1),b=a+1,c=a+W,d=c+1;del(a,b);del(c,d);add(a,c);add(b,d);}}
// Disconnected details (rain drops, petals) keep their own contours. Never
// connect two components with a fabricated segment across background space.
const cycles:number[][]=[],visited=new Set<number>();
for(const start of Array.from(adj.keys())){if(visited.has(start))continue;const cycle:number[]=[];let cur=start,prev=-1;do{cycle.push(cur);visited.add(cur);const n=adj.get(cur).find(v=>v!==prev);prev=cur;cur=n;}while(cur!==start);cycles.push(cycle);}
const owner=new Int32Array(W*H).fill(-2);for(const cycle of cycles)cycle.forEach(c=>owner[c]=-1);
function ray(c,d){const out=[];for(let x=c%W+d[0],y=Math.floor(c/W)+d[1];x>=0&&y>=0&&x<W&&y<H;x+=d[0],y+=d[1])out.push(key(x,y));return out;}
const arrows:{ids:number[];d:number[]}[]=[];
function candidates(last){
 const found=[];
 for(const cycle of cycles)for(let i=0;i<cycle.length;i++){const c=cycle[i];if(owner[c]!==-1)continue;
 for(const d of dirs){const ahead=ray(c,d);if(ahead.some(v=>owner[v]===-1))continue;if(last>=0&&!ahead.some(v=>owner[v]===last))continue;
 for(const sign of [1,-1]){let ids=[];for(let k=0;k<25;k++){const v=cycle[(i-sign*k+cycle.length*2)%cycle.length];if(owner[v]!==-1)break;ids.push(v);}if(ids.length>=1)found.push({ids:ids.reverse(),d});}
 }}
 return found;
}
let resets=0;while(true){yield;let possible=candidates(arrows.length-1);if(!possible.length&&resets++<options.chains-1)possible=candidates(-1);if(!possible.length)break;const opts=[];
 for(const option of possible)for(const size of [3,5,8,12,18]){const ids=option.ids.slice(-Math.min(size,option.ids.length));ids.forEach(v=>owner[v]=arrows.length);const next=candidates(arrows.length).length;ids.forEach(v=>owner[v]=-1);opts.push({ids,d:option.d,next,score:(next?1000:0)+Math.min(ids.length,8)+rng()*10});}
 opts.sort((a,b)=>b.score-a.score);const chosen=opts[0];chosen.ids.forEach(v=>owner[v]=arrows.length);arrows.push(chosen);
}
return {arrows,coverage:arrows.reduce((s,a)=>s+a.ids.length,0)/cycles.reduce((n,c)=>n+c.length,0)};
}

const result=yield* make();
if(result.coverage<.96)throw Error('Global contour coverage below quality gate');
const arrows=result.arrows.map((a,i)=>{
 const points:Point[]=[];
 for(const c of a.ids){const q={x:c%W*2+1,y:Math.floor(c/W)*2+1};if(points.length){const v=points[points.length-1];points.push({x:(v.x+q.x)/2,y:(v.y+q.y)/2});}points.push(q);}
 const head=points[points.length-1];points.push({x:head.x+a.d[0],y:head.y+a.d[1]});
 const cx=points.reduce((n,p)=>n+p.x,0)/points.length/(W*2),cy=points.reduce((n,p)=>n+p.y,0)/points.length/(H*2);
 return {id:'global-'+i,points,color:'#E9AF4B',colorBand:cy>.73?0:cx<.3?1:cx>.7?3:2};
});
const level:Level={id:`generated-v2-${options.index+1}-contour-v4`,version:4,name:raw.name,subtitle:options.index===2?'极限挑战 · 四向交织':'解开彩线，让小风景慢慢舒展',width:W*2+2,height:H*2+2,arrows:arrows.reverse()};
validate(level);
return {level,coverage:result.coverage};
}
