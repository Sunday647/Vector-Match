require('./ts-loader.cjs');
const assert=require('assert'),fs=require('fs'),{performance}=require('perf_hooks');
const {generateLevel,chainLimit}=require('../assets/scripts/core/Generator.ts');
const {silhouetteFingerprint,silhouetteSimilarity,SILHOUETTE_LIMIT}=require('../assets/scripts/core/ShapeGrammar.ts');
const {validate,canExit,Session}=require('../assets/scripts/core/Rules.ts');
const {solarTermForLevel}=require('../assets/scripts/core/SolarTerms.ts');
function generate(i){const gen=generateLevel(i);let r;do{r=gen.next();}while(!r.done);return r.value;}
const seen=new Set(),rows=[],samples=[],outlines=[];
const blob=[{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:0,y:1},{x:1,y:1},{x:0,y:2}];
const fp=silhouetteFingerprint(blob);
assert.equal(silhouetteSimilarity(fp,silhouetteFingerprint(blob.map(p=>({x:p.x+10,y:p.y+5})))),1,'translation must not count as new artwork');
assert(silhouetteSimilarity(fp,silhouetteFingerprint(blob.map(p=>({x:2-p.x,y:p.y}))))>.99,'mirror must not count as new artwork');
for(let i=0;i<120;i++){
 const t=performance.now(),r=generate(i),l=r.level;const ms=performance.now()-t;
 const outline=silhouetteFingerprint(l.arrows.flatMap(a=>a.points));
 let renderedSimilarity=0;
 for(let previous=Math.max(0,i-24);previous<i;previous++)renderedSimilarity=Math.max(renderedSimilarity,silhouetteSimilarity(outline,outlines[previous]));
 assert(r.silhouetteSimilarity<SILHOUETTE_LIMIT,'near-identical source silhouette '+i);
 assert(renderedSimilarity<SILHOUETTE_LIMIT,'near-identical filled silhouette '+i);
 outlines.push(outline);
 validate(l);assert(!seen.has(r.signature),'duplicate '+i);seen.add(r.signature);
 const removed=new Set();for(const a of [...l.arrows].reverse()){assert(canExit(a,l,removed),'invalid construction '+i);removed.add(a.id);}
 let maxSolutionChoices=0;
 const s=new Session(l);while(s.status==='playing'){const options=l.arrows.filter(a=>canExit(a,l,s.removed));assert(options.length);assert(options.length<=chainLimit(i),'dependency limit '+i);maxSolutionChoices=Math.max(maxSolutionChoices,options.length);s.click(options[(i+s.removed.size*11)%options.length].id);}assert.equal(s.status,'won');
 if(i<36){assert.deepStrictEqual(generate(i),r,'unstable seed');samples.push({...r,palette:solarTermForLevel(i).colors});}
 const directions=[[1,0],[-1,0],[0,1],[0,-1]].map(([x,y])=>l.arrows.filter(a=>{const p=a.points,h=p[p.length-1],t=p[p.length-2];return h.x-t.x===x&&h.y-t.y===y;}).length);
 assert(directions.every(n=>n>0),'four directions '+i);
 rows.push({level:i+1,arrows:l.arrows.length,coverage:r.coverage,initialExits:r.initialExits,maxSolutionChoices,chainLimit:chainLimit(i),directions,signature:r.signature,ms:Math.round(ms),name:l.name,silhouetteSimilarity:r.silhouetteSimilarity,renderedSimilarity});
}
const times=rows.map(r=>r.ms).sort((a,b)=>a-b);
const report={count:rows.length,duplicateCount:0,p95ms:times[Math.floor(times.length*.95)],minCoverage:Math.min(...rows.map(r=>r.coverage)),maxCoverage:Math.max(...rows.map(r=>r.coverage)),maxRecentSilhouetteSimilarity:Math.max(...rows.map(r=>r.silhouetteSimilarity)),maxRecentRenderedSimilarity:Math.max(...rows.map(r=>r.renderedSimilarity)),rows};
fs.writeFileSync('tests/generator-report.json',JSON.stringify(report,null,2));
fs.writeFileSync('/tmp/arrow-generator-samples.json',JSON.stringify(samples));
console.log(JSON.stringify({...report,rows:undefined},null,2));
console.log('PASS 120 boards: validation, reverse solution, alternate legal order; first 36 deterministic replays; source and filled silhouettes compared across 24 levels, including page boundaries.');
