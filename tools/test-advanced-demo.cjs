require('./ts-loader.cjs');
const assert=require('assert'),fs=require('fs');
const {generateLevel}=require('../assets/scripts/core/Generator.ts');
const {Session,canExit,validate}=require('../assets/scripts/core/Rules.ts');
const {isAdvancedLevel}=require('../assets/scripts/core/ShapeGrammar.ts');
const {advancedPalette}=require('../assets/scripts/core/ArrowColors.ts');
const {solarTermForLevel}=require('../assets/scripts/core/SolarTerms.ts');
const baseline=require('../tests/generator-report.json').rows;
function generate(i){const g=generateLevel(i);let s;do{s=g.next();}while(!s.done);return s.value;}
for(let i=0;i<15;i++){
 const r=generate(i),l=r.level;
 if(!isAdvancedLevel(i)){assert.equal(r.signature,baseline[i].signature,'ordinary geometry changed at '+(i+1));assert.equal(l.width,82);assert.equal(l.height,90);continue;}
 assert.equal(l.width,114);assert.equal(l.height,126);assert(l.arrows.length>0);validate(l);
 const s=new Session(l);while(s.status==='playing'){const a=l.arrows.find(a=>!s.removed.has(a.id)&&canExit(a,l,s.removed));assert(a);s.click(a.id);}assert.equal(s.status,'won');
 assert(!new Session(l).restore({levelId:'generated-v2-5-contour-v4',version:4,attemptId:'old',hearts:3,removed:[],penalized:[],hintUsed:false}));
 for(const h of [900,1280,1560]){const bh=Math.max(460,h-420),fit=Math.min(650/(l.width*14),(bh-70)/(l.height*14));assert(l.width*14*fit<=650.001);assert(l.height*14*fit<=bh-70+.001);}
 assert.equal(generate(i).signature,r.signature);
 if(i===4)fs.writeFileSync('tests/advanced-demo.json',JSON.stringify({level:5,width:l.width,height:l.height,arrows:l.arrows.length,signature:r.signature,coverage:r.coverage},null,2)+'\n');
 assert(advancedPalette(i,solarTermForLevel(i).colors).every(c=>/^#[0-9a-f]{6}$/i.test(c)));
 console.log('Advanced level '+(i+1)+':',l.width,l.height,l.arrows.length,r.signature);
}
console.log('PASS demo: increased arrows, solvable, fits one screen, old save rejected; ordinary grids unchanged, 5/10/15 upgraded');
