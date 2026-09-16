require('./ts-loader.cjs');
const assert=require('assert');
const {ROUTE_STEP,routeX,visibleRoute,clampRoute}=require('../assets/scripts/core/Route.ts');
for(const completed of [0,10,100,2999]){
 const offset=completed*ROUTE_STEP,nodes=visibleRoute(offset,920,completed);
 assert(nodes.includes(completed),'current level must be in initial viewport');
 assert(nodes.length<12,'render only a bounded visible window');
 assert(nodes.every((n,i)=>n>=0&&(!i||n===nodes[i-1]+1)),'one sequential node per level');
 assert.equal(clampRoute(-100,completed),0);
 assert(clampRoute(1e9,completed)>offset);
 assert(nodes.every(n=>Math.abs(routeX(n))<=210));
}
console.log('PASS mountain route: current position, continuous numbering, bounded rendering through level 3000, scroll limits');

for(const index of [14,499,2999,9999]){const offset=index*ROUTE_STEP;assert.equal(clampRoute(offset,2),offset);assert(visibleRoute(offset,920,2).includes(index));}
console.log('PASS low-progress user can browse beyond 14 through 500, 3000 and 10000');
