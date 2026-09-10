// Export the same generated geometry and palette used by the game.
require('./ts-loader.cjs');
const fs=require('fs');
const {generateLevel}=require('../assets/scripts/core/Generator.ts');
const {solarTermForLevel}=require('../assets/scripts/core/SolarTerms.ts');
const samples=[];
for(let index=0;index<12;index++){
 const g=generateLevel(index);let step;do{step=g.next();}while(!step.done);
 const term=solarTermForLevel(index);
 samples.push({...step.value,palette:term.colors,term:term.name});
}
fs.writeFileSync('/tmp/arrow-preview-levels.json',JSON.stringify(samples));
console.log('Exported 12 live-generator boards to /tmp/arrow-preview-levels.json');
