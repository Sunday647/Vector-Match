import { Level, canExit } from './Rules';
import { shapeForLevel } from './ShapeGrammar';
import { generateExtreme } from './ExtremeChallenge';

export const GENERATOR_VERSION = 4;
export function random(seed: number): () => number {
    return () => {seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
}
export function levelTitle(index: number): string {return shapeForLevel(index).name;}
export type Generated = {level: Level; coverage: number; signature: string; initialExits: number; seed: number; variant: number; silhouette:number[]; silhouetteSimilarity:number};
export function signature(level:Level):string {
    // Geometry only: changing title, level number, or colors cannot evade this.
    const value=JSON.stringify([level.width,level.height,level.arrows.map(a=>a.points.map(p=>[p.x,p.y])).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]);
    let h=2166136261;for(let i=0;i<value.length;i++)h=Math.imul(h^value.charCodeAt(i),16777619);
    return ('00000000'+(h>>>0).toString(16)).slice(-8);
}

// A shared route layout with separate dependency limits for the onboarding
// and normal levels. Level 3 retains the audited two-choice challenge.
export function chainLimit(index:number):number {
    return index===2?2:index===0?10:index===1?8:[6,8,4,6,8,4][index%6];
}
export function* generateLevel(index:number):Generator<void,Generated,unknown> {
    if(!Number.isSafeInteger(index)||index<0)throw Error('Invalid level index');
    const s=shapeForLevel(index);yield;
    let lastError:Error|null=null;
    for(let trial=0;trial<(index===2?1:8);trial++){
        const seed=index===2?102:s.seed+trial*7919;
        try {
            const {level,coverage}=yield* generateExtreme(s,random(seed),{index,chains:chainLimit(index)});
            return {level,coverage,seed,variant:s.variant,silhouette:s.fingerprint,
                silhouetteSimilarity:s.similarity,signature:signature(level),
                initialExits:level.arrows.filter(a=>canExit(a,level)).length};
        } catch(error) {
            lastError=error instanceof Error?error:new Error(String(error));
            yield;
        }
    }
    throw new Error('Global contour generation failed for level '+(index+1)+': '+lastError?.message);
}
