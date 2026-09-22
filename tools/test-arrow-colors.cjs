require('./ts-loader.cjs');const assert=require('assert');const {generateLevel,signature}=require('../assets/scripts/core/Generator.ts');const {balanceArrowColors}=require('../assets/scripts/core/ArrowColors.ts');
const g=generateLevel(4);let r;do{r=g.next();}while(!r.done);const l=r.value.level;assert.equal(l.arrows.length,94);assert.equal(signature(l),'007ed0a3');
const lengths=[0,0,0,0];for(const a of l.arrows)for(let j=1;j<a.points.length;j++)lengths[a.colorBand]+=Math.abs(a.points[j].x-a.points[j-1].x)+Math.abs(a.points[j].y-a.points[j-1].y);
const shares=lengths.map(x=>x/lengths.reduce((a,b)=>a+b));assert(shares.every(x=>x>=.2&&x<=.3));
const bands=l.arrows.map(a=>a.colorBand);balanceArrowColors(l);assert.deepEqual(l.arrows.map(a=>a.colorBand),bands);
const old=l.arrows.map(a=>{const x=a.points.reduce((s,p)=>s+p.x,0)/a.points.length/(l.width-2),y=a.points.reduce((s,p)=>s+p.y,0)/a.points.length/(l.height-2);return y>.73?0:x<.3?1:x>.7?3:2;});
let before=0,after=0;for(let i=0;i<l.arrows.length;i++)for(let j=i+1;j<l.arrows.length;j++)for(const a of l.arrows[i].points)for(const b of l.arrows[j].points)if((a.x-b.x)**2+(a.y-b.y)**2<=4){if(old[i]===old[j])before++;if(bands[i]===bands[j])after++;}
assert(after<before*.6);console.log('PASS stable colors, same geometry, length shares:',shares.map(x=>(x*100).toFixed(1)+'%'),'nearby same-color sample pairs:',before,'->',after);
