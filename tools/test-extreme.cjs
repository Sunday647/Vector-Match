require('./ts-loader.cjs');
const assert=require('assert'),fs=require('fs');
const {generateLevel}=require('../assets/scripts/core/Generator.ts');
const {validate,blockedBy,canExit,Session}=require('../assets/scripts/core/Rules.ts');
function generate(){const g=generateLevel(2);let r;do{r=g.next();}while(!r.done);return r.value;}
const started=Date.now(),r=generate(),l=r.level;
assert.deepStrictEqual(generate(),r,'deterministic replay');
validate(l);
const edges=l.arrows.map(a=>l.arrows.filter(b=>blockedBy(a,b,l)).map(b=>b.id));
const removed=new Set(),choices=[],solution=[];
while(removed.size<l.arrows.length){
 const legal=l.arrows.filter((a,i)=>!removed.has(a.id)&&edges[i].every(id=>removed.has(id)));
 assert(legal.length>=1&&legal.length<=2,'one or two exits');
 assert(canExit(legal[0],l,removed),'dependency graph must match gameplay');
 choices.push(legal.length);solution.push(legal[0].id);removed.add(legal[0].id);
}
const reverseRemoved=new Set();for(const a of [...l.arrows].reverse()){assert(canExit(a,l,reverseRemoved),'construction order remains a solution');reverseRemoved.add(a.id);}
const turns=l.arrows.map(a=>a.points.slice(2).filter((p,i)=>{
 const q=a.points[i+1],v=a.points[i];return p.x-q.x!==q.x-v.x||p.y-q.y!==q.y-v.y;
}).length);
assert(l.arrows.length>=70);assert(l.arrows.every(a=>a.points.length>=2));
const lengths=l.arrows.map(a=>a.points.length);
const directions=[[1,0],[-1,0],[0,1],[0,-1]].map(([x,y])=>l.arrows.filter(a=>{const p=a.points,h=p.at(-1),t=p.at(-2);return h.x-t.x===x&&h.y-t.y===y;}).length);
assert(directions.every(n=>n/l.arrows.length>=.12&&n/l.arrows.length<=.4),'four head directions without a dominant direction');
assert(turns.filter(n=>n>=2).length/l.arrows.length>.5,'most bodies combine horizontal and vertical runs');
assert(r.coverage>=.96,'global contour coverage');
assert(Math.max(...lengths)>=30&&new Set(lengths).size>=10,'varied long and short paths');
// Explore ALL reachable states, not just one selected solution or peel layers.
const ids=new Map(l.arrows.map((a,i)=>[a.id,i])),bits=l.arrows.map((_,i)=>1n<<BigInt(i));
const deps=edges.map(es=>es.reduce((m,id)=>m|bits[ids.get(id)],0n));
const full=(1n<<BigInt(l.arrows.length))-1n,stack=[0n],visited=new Set();let peak=0;
while(stack.length){const state=stack.pop();if(visited.has(state))continue;visited.add(state);if(state===full)continue;
 const options=bits.map((b,i)=>i).filter(i=>!(state&bits[i])&&(state&deps[i])===deps[i]);
 assert(options.length>=1&&options.length<=2,'all-state frontier bound');peak=Math.max(peak,options.length);
 for(const i of options)stack.push(state|bits[i]);
}
const session=new Session(l),locked=l.arrows[0];
assert.equal(session.click(locked.id),'penalty');assert.equal(session.click(locked.id),'blocked');assert.equal(session.hearts,2);
const old=session.snapshot();old.levelId='generated-v2-3';assert(!new Session(l).restore(old),'old level snapshot must be rejected');
const report={level:3,id:l.id,arrows:l.arrows.length,minSegments:Math.min(...lengths)-1,maxSegments:Math.max(...lengths)-1,directions,minTurns:Math.min(...turns),meanTurns:turns.reduce((a,b)=>a+b,0)/turns.length,
 initialChoices:choices[0],maxChoices:peak,minChoices:Math.min(...choices),verifiedStates:visited.size,
 occupiedCells:lengths.reduce((a,b)=>a+b,0),contourCoverage:r.coverage,signature:r.signature,elapsedMs:Date.now()-started};
fs.writeFileSync('tests/extreme-report.json',JSON.stringify(report,null,2)+'\n');
fs.writeFileSync('/tmp/extreme-board.json',JSON.stringify(l));
console.log(report);
