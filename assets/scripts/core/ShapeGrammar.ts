import { Point } from './Rules';

export const SILHOUETTE_LIMIT = 0.82;
const SIZE=32;
type Mask=(x:number,y:number)=>boolean;
export type Silhouette={seed:number;width:number;height:number;cells:Point[];variant:number;name:string;fingerprint:number[];similarity:number};
const titles=[
 ['蓬蓬云','小云下雨','月亮枕着云','云朵叠叠乐','风吹流云','彩虹与云'],
 ['坐着的小猫','伸懒腰小猫','猫咪探头','散步的小猫','团成球的小猫','小猫摘星'],
 ['一颗爱心','两颗心靠近','长翅膀的心','爱心气球','心意礼物','爱心发芽'],
 ['坐着的小兔','跃起的小兔','兔兔探头','垂耳小兔','月亮上的兔','小兔抱萝卜'],
 ['一朵小花','郁金香','花朵盛开','三朵小花','窗台盆花','花开枝头'],
 ['坐着的小狗','散步的小狗','狗狗探头','小狗的家','伸懒腰小狗','蜷睡的小狗'],
];
const ellipse=(x:number,y:number,cx:number,cy:number,rx:number,ry:number)=>((x-cx)/rx)**2+((y-cy)/ry)**2<=1;
function polygon(x:number,y:number,ps:number[][]):boolean{let c=false;for(let i=0,j=ps.length-1;i<ps.length;j=i++){const a=ps[i],b=ps[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}
function grammar(motif:number,v:number):Mask {
 return (x,y)=>{
  const e=(cx:number,cy:number,rx:number,ry:number)=>ellipse(x,y,cx,cy,rx,ry);
  const p=(ps:number[][])=>polygon(x,y,ps);
  const seg=(ax:number,ay:number,bx:number,by:number,r:number)=>{const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));return (x-ax-t*dx)**2+(y-ay-t*dy)**2<=r*r;};
  const heart=(cx:number,cy:number,s:number)=>{const u=(x-cx)/s,w=(y-cy)/s;return ellipse(u,w,-.30,.24,.34,.34)||ellipse(u,w,.30,.24,.34,.34)||polygon(u,w,[[-.63,.20],[.63,.20],[.48,-.18],[0,-.73],[-.48,-.18]]);};
  const cloud=(cx:number,cy:number,s:number)=>e(cx,cy-.08*s,.72*s,.27*s)||e(cx-.38*s,cy+.10*s,.30*s,.30*s)||e(cx+.02*s,cy+.21*s,.35*s,.38*s)||e(cx+.43*s,cy+.03*s,.29*s,.27*s);
  const bloom=(cx:number,cy:number,s:number,n=5)=>{let yes=e(cx,cy,.22*s,.22*s);for(let i=0;i<n;i++){const a=Math.PI/2+i*2*Math.PI/n;yes=yes||e(cx+Math.cos(a)*.29*s,cy+Math.sin(a)*.29*s,.22*s,.22*s);}return yes;};
  const catHead=(cx:number,cy:number,s:number)=>e(cx,cy,.42*s,.31*s)||p([[cx-.4*s,cy+.06*s],[cx-.38*s,cy+.56*s],[cx-.1*s,cy+.29*s],[cx+.12*s,cy+.29*s],[cx+.39*s,cy+.55*s],[cx+.42*s,cy+.04*s]]);
  const rabbitHead=(cx:number,cy:number,s:number)=>e(cx,cy,.32*s,.27*s)||e(cx-.17*s,cy+.39*s,.11*s,.35*s)||e(cx+.16*s,cy+.41*s,.105*s,.35*s);
  const dogHead=(cx:number,cy:number,s:number)=>e(cx,cy,.33*s,.32*s)||e(cx-.34*s,cy-.07*s,.17*s,.35*s)||e(cx+.34*s,cy-.07*s,.17*s,.35*s)||e(cx,cy-.19*s,.26*s,.16*s);
  if(motif===0){
   if(v===0)return cloud(0,-.04,1.1);
   if(v===1)return cloud(0,.40,1)||seg(-.48,-.19,-.59,-.60,.10)||seg(0,-.30,-.11,-.82,.10)||seg(.48,-.19,.36,-.61,.10);
   if(v===2)return (e(.02,.19,.58,.67)&&!e(.26,.40,.46,.52))||cloud(.28,-.44,.78);
   if(v===3)return cloud(-.28,.50,.72)||cloud(.24,-.13,.84)||cloud(-.26,-.63,.53);
   if(v===4)return cloud(-.32,.22,.67)||seg(-.10,.26,.83,.26,.095)||seg(-.38,-.13,.61,-.13,.10)||seg(-.69,-.49,.30,-.49,.08);
   return (e(0,.01,.78,.79)&&!e(0,.01,.51,.55)&&y>-.03)||cloud(-.51,-.39,.54)||cloud(.48,-.39,.54);
  }
  if(motif===1){
   if(v===0)return catHead(-.09,.34,.95)||e(.01,-.30,.41,.49)||e(.52,-.36,.12,.38)||seg(.10,-.70,.51,-.62,.12)||e(-.23,-.73,.22,.12);
   if(v===1)return catHead(-.49,-.02,.72)||e(.09,-.39,.58,.24)||seg(-.46,-.57,-.77,-.59,.09)||seg(.55,-.40,.72,.62,.105);
   if(v===2)return catHead(0,-.15,1.65);
   if(v===3)return catHead(-.49,.36,.65)||e(.06,.13,.48,.17)||seg(-.27,.03,-.46,-.72,.085)||seg(.35,.04,.54,-.64,.085)||seg(.47,.18,.71,.74,.085);
   if(v===4)return (e(.08,-.19,.74,.55)&&!e(.23,-.17,.34,.24))||catHead(-.40,.23,.64);
   return catHead(-.29,.03,.76)||e(-.16,-.43,.37,.33)||seg(.02,-.28,.35,.34,.12)||seg(-.46,-.59,-.77,-.19,.12)||bloom(.45,.61,.50,5);
  }
  if(motif===2){
   if(v===0)return heart(0,.03,1.25);
   if(v===1)return heart(-.33,.28,.82)||heart(.34,-.26,.84);
   if(v===2)return heart(0,-.02,.80)||p([[-.27,.10],[-.90,.60],[-.78,.05],[-.54,-.33],[-.25,-.29]])||p([[.27,.10],[.90,.60],[.78,.05],[.54,-.33],[.25,-.29]]);
   if(v===3)return heart(-.02,.36,.87)||seg(0,-.24,.17,-.46,.055)||seg(.17,-.46,-.11,-.71,.055)||seg(-.11,-.71,.06,-.88,.055);
   if(v===4)return heart(-.22,.57,.48)||heart(.23,.57,.48)||p([[-.38,.19],[.38,.19],[.38,-.86],[-.38,-.86]])||p([[-.48,.19],[-.48,.34],[.48,.34],[.48,.19]]);
   return heart(0,.40,.77)||seg(0,-.17,0,-.81,.07)||e(-.23,-.43,.29,.14)||e(.23,-.63,.29,.14);
  }
  if(motif===3){
   if(v===0)return rabbitHead(0,.15,1)||e(.02,-.38,.40,.39)||e(-.23,-.73,.24,.115)||e(.25,-.73,.24,.115);
   if(v===1)return e(.12,-.09,.48,.29)||e(-.49,.12,.28,.25)||seg(-.55,.24,-.80,.72,.095)||seg(-.38,.24,-.31,.79,.10)||seg(-.13,-.22,-.65,-.58,.10)||seg(.40,-.13,.79,-.44,.11)||e(.64,.08,.14,.14);
   if(v===2)return rabbitHead(0,-.31,1.40);
   if(v===3)return e(0,.29,.37,.30)||e(-.53,.10,.22,.37)||e(.53,.10,.22,.37)||e(0,-.37,.30,.36)||e(0,-.72,.40,.10);
   if(v===4)return (e(.04,-.13,.76,.73)&&!e(.32,.14,.63,.60))||rabbitHead(-.22,.08,.77);
   return rabbitHead(-.34,.20,.87)||e(-.30,-.41,.32,.34)||p([[.16,.26],[.66,.09],[.20,-.81]])||seg(.39,.19,.32,.57,.09)||seg(.43,.23,.68,.51,.08);
  }
  if(motif===4){
   if(v===0)return bloom(0,.38,.94,6)||seg(0,-.04,0,-.83,.075)||e(-.21,-.48,.28,.12)||e(.21,-.25,.28,.13);
   if(v===1)return p([[-.57,.68],[-.24,.40],[0,.80],[.24,.40],[.57,.68],[.48,.07],[.25,-.17],[-.25,-.17],[-.48,.07]])||seg(0,-.14,0,-.84,.075)||p([[0,-.74],[-.48,-.33],[-.42,-.71],[0,-.85]]);
   if(v===2)return bloom(0,0,1.70,5);
   if(v===3)return bloom(-.48,.26,.64,5)||bloom(0,.63,.57,5)||bloom(.48,.22,.62,5)||seg(-.47,.08,0,-.74,.06)||seg(0,.42,0,-.74,.06)||seg(.48,.03,0,-.74,.06)||p([[-.41,-.44],[.41,-.44],[.19,-.87],[-.19,-.87]]);
   if(v===4)return bloom(0,.43,.81,6)||seg(0,.07,0,-.34,.07)||e(-.29,-.16,.32,.13)||e(.27,-.07,.27,.13)||p([[-.51,-.32],[.51,-.32],[.37,-.85],[-.37,-.85]]);
   return seg(-.69,-.76,.47,.72,.07)||bloom(-.40,-.10,.58,5)||bloom(.25,.39,.61,5)||e(.20,-.42,.38,.14)||e(-.40,.40,.24,.12);
  }
  if(v===0)return dogHead(0,.37,.91)||e(0,-.28,.37,.43)||e(-.24,-.73,.21,.115)||e(.23,-.73,.21,.115)||seg(.30,-.50,.66,-.09,.09);
  if(v===1)return dogHead(-.50,.25,.63)||e(.05,-.10,.53,.24)||seg(-.27,-.20,-.35,-.70,.105)||seg(.37,-.21,.53,-.68,.105)||seg(.51,-.02,.81,.41,.095);
  if(v===2)return dogHead(0,.09,1.57);
  if(v===3)return p([[-.83,.03],[0,.86],[.83,.03],[.69,.03],[.69,-.77],[-.69,-.77],[-.69,.03]])&&!dogHead(0,-.42,.70);
  if(v===4)return dogHead(-.49,-.28,.66)||e(.10,-.12,.51,.26)||seg(.43,-.26,.55,-.76,.095)||seg(-.19,-.35,-.68,-.69,.095)||seg(.53,.03,.74,.54,.10);
  return (e(.12,-.35,.71,.31)&&!e(.24,-.25,.24,.12))||dogHead(-.48,-.12,.56);
 };
}

// Fit with uniform scale: preserve aspect ratio, remove translation and padding.
// The mirror comparison stops a flipped silhouette from passing as a new pose.
export function silhouetteFingerprint(cells:Point[]):number[]{
 const xs=cells.map(p=>p.x),ys=cells.map(p=>p.y),minX=Math.min(...xs),minY=Math.min(...ys),w=Math.max(...xs)-minX+1,h=Math.max(...ys)-minY+1,scale=(SIZE-2)/Math.max(w,h),bits=Array(SIZE*SIZE).fill(0);
 for(const p of cells){const l=1+(SIZE-2-w*scale)/2+(p.x-minX)*scale,b=1+(SIZE-2-h*scale)/2+(p.y-minY)*scale;for(let y=Math.floor(b);y<Math.ceil(b+scale);y++)for(let x=Math.floor(l);x<Math.ceil(l+scale);x++)if(x>=0&&x<SIZE&&y>=0&&y<SIZE)bits[y*SIZE+x]=1;}
 return bits;
}
export function silhouetteSimilarity(a:number[],b:number[]):number{
 let best=0;
 for(const mirror of [false,true]){let overlap=0,union=0;for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const aa=a[y*SIZE+x],bb=b[y*SIZE+(mirror?SIZE-1-x:x)];if(aa&&bb)overlap++;if(aa||bb)union++;}best=Math.max(best,overlap/Math.max(1,union));}
 return best;
}
function candidate(index:number,variant:number):Silhouette{
 const seed=(Math.imul(index+1,0x45d9f3b)^0x23af8301)>>>0;
 const rnd=(shift:number)=>((seed>>>shift)&255)/255;
 const sx=.92+rnd(0)*.06,sy=.92+rnd(8)*.06,lean=(rnd(16)-.5)*.04;
 const motif=index%6,width=39,height=43,mask=grammar(motif,variant),cells:Point[]=[];
 for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++)if(mask((x/(width-1)*2-1)/sx-lean,(y/(height-1)*2-1)/sy))cells.push({x,y});
 return {seed,width,height,cells,variant,name:titles[motif][variant],fingerprint:silhouetteFingerprint(cells),similarity:0};
}
// Compare every silhouette in the previous 24 levels across themes, including
// page/block boundaries. A deterministic rolling recipe schedule also compares
// the rounded contour masks. The grammar remains finite.
const cache=new Map<number,Silhouette>();
const routeFingerprints=new Map<number,number[]>();
let scheduledThrough=-1;
// Match the coarsening used by the shared contour layout before accepting a
// recipe. Raw masks alone underestimate similarity after grid rounding.
function routeFingerprint(s:Silhouette,index:number):number[] {
 const counts=new Map<string,number>();
 for(const p of s.cells){const k=Math.floor(p.x/2)+','+Math.floor(p.y/2);counts.set(k,(counts.get(k)||0)+1);}
 const points:Point[]=[];
 for(const k of Array.from(counts.keys()))if(index===2||counts.get(k)>=2){
  const [x,y]=k.split(',').map(Number);
  for(let dy=0;dy<4;dy++)for(let dx=0;dx<4;dx++)points.push({x:x*4+dx,y:y*4+dy});
 }
 return silhouetteFingerprint(points);
}
export function shapeForLevel(index:number):Silhouette{
 if(!Number.isSafeInteger(index)||index<0)throw Error('Invalid level index');
 const cached=cache.get(index);if(cached)return cached;
 // Rebuild the deterministic schedule for an old uncached jump. The rolling
 // cache bounds memory and never makes a recipe depend on the player's history.
 if(index<=scheduledThrough){cache.clear();routeFingerprints.clear();scheduledThrough=-1;}
 for(let current=scheduledThrough+1;current<=index;current++){
  const cycle=Math.floor(current/6),base=(cycle+Math.floor(cycle/6))%6;
  let selected:Silhouette|null=null,selectedRoute:number[]=[];
  for(let attempt=0;attempt<6;attempt++){
   const s=candidate(current,(base+attempt)%6),route=routeFingerprint(s,current);
   let routeSimilarity=0;
   for(let previous=Math.max(0,current-24);previous<current;previous++){
    s.similarity=Math.max(s.similarity,silhouetteSimilarity(s.fingerprint,cache.get(previous)!.fingerprint));
    routeSimilarity=Math.max(routeSimilarity,silhouetteSimilarity(route,routeFingerprints.get(previous)!));
   }
   if(s.similarity<SILHOUETTE_LIMIT&&routeSimilarity<.80){selected=s;selectedRoute=route;break;}
  }
  if(!selected)throw Error('Silhouette grammar needs a more distinct pose at level '+(current+1));
  cache.set(current,selected);routeFingerprints.set(current,selectedRoute);scheduledThrough=current;
  if(cache.size>96){const oldest=cache.keys().next().value!;cache.delete(oldest);routeFingerprints.delete(oldest);}
 }
 return cache.get(index)!;
}
