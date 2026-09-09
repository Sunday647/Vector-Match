export type Point = { x: number; y: number };
export type Arrow = { id: string; points: Point[]; color: string; colorBand?: number };
export type Level = { id: string; version: number; name: string; subtitle: string; width: number; height: number; arrows: Arrow[] };
export const LINE_WIDTH = 0.25;
export const HEAD_WIDTH = 0.54;
export const HEAD_LENGTH = 0.50;
export function direction(a: Arrow): Point {
    const p = a.points, n = p.length;
    return { x: Math.sign(p[n-1].x-p[n-2].x), y: Math.sign(p[n-1].y-p[n-2].y) };
}
type Rect = { l: number; r: number; b: number; t: number };
function segmentBox(p: Point, q: Point, radius: number): Rect {
    return {l: Math.min(p.x,q.x)-radius,r:Math.max(p.x,q.x)+radius,b:Math.min(p.y,q.y)-radius,t:Math.max(p.y,q.y)+radius};
}
function overlap(a: Rect,b: Rect): boolean { return a.l<=b.r && a.r>=b.l && a.b<=b.t && a.t>=b.b; }
function headBox(a: Arrow): Rect {
    const h=a.points[a.points.length-1],d=direction(a);
    return d.x ? {l:h.x-HEAD_LENGTH,r:h.x+HEAD_LENGTH,b:h.y-HEAD_WIDTH/2,t:h.y+HEAD_WIDTH/2}
        : {l:h.x-HEAD_WIDTH/2,r:h.x+HEAD_WIDTH/2,b:h.y-HEAD_LENGTH,t:h.y+HEAD_LENGTH};
}
function obstacleBoxes(a: Arrow): Rect[] {
    return [headBox(a),...a.points.slice(1).map((p,i)=>segmentBox(a.points[i],p,LINE_WIDTH/2))];
}
function exitCorridor(a: Arrow, level: Level): Rect {
    const h=a.points[a.points.length-1], d=direction(a);
    const far={x:h.x+d.x*(level.width+2),y:h.y+d.y*(level.height+2)};
    return segmentBox(h,far,HEAD_WIDTH/2);
}
export function selfBlocked(a: Arrow, level: Level): boolean {
    const corridor=exitCorridor(a,level);
    return a.points.slice(1,-1).some((p,i)=>overlap(corridor,segmentBox(a.points[i],p,LINE_WIDTH/2)));
}
export function blockedBy(a: Arrow, other: Arrow, level: Level): boolean {
    if(a.id===other.id)return false;
    const corridor=exitCorridor(a,level);
    return obstacleBoxes(other).some(b=>overlap(corridor,b));
}
export function canExit(a: Arrow, level: Level, removed: ReadonlySet<string> = new Set()): boolean {
    return !removed.has(a.id) && !selfBlocked(a,level) && !level.arrows.some(b=>!removed.has(b.id)&&blockedBy(a,b,level));
}
export function solve(level: Level): string[] | null {
    const removed=new Set<string>(),result:string[]=[];
    while(result.length<level.arrows.length){
        const a=level.arrows.find(a=>canExit(a,level,removed));
        if(!a)return null;
        removed.add(a.id);result.push(a.id);
    }
    return result;
}
export function validate(level: Level): void {
    if(!Number.isFinite(level.width)||!Number.isFinite(level.height)||level.width<=0||level.height<=0||!level.arrows.length)throw Error('Invalid board');
    const ids=new Set<string>(),occupied=new Set<string>();
    for(const a of level.arrows){
        if(ids.has(a.id)||a.points.length<2)throw Error('Invalid arrow');ids.add(a.id);
        for(let i=0;i<a.points.length;i++){
            const p=a.points[i], key=p.x+','+p.y;
            if(!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<0||p.x>=level.width||p.y<0||p.y>=level.height||occupied.has(key))throw Error('Invalid or overlapping path: '+a.id);
            occupied.add(key);
            if(i&&Math.abs(p.x-a.points[i-1].x)+Math.abs(p.y-a.points[i-1].y)!==1)throw Error('Paths must use unit orthogonal steps');
        }
    }
    if(!solve(level))throw Error('Unsolvable level: '+level.id);
}
export function distanceToSegment(p: Point,a: Point,b: Point): number {
    const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
    return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
export function hitArrow(level: Level,removed: ReadonlySet<string>,p: Point,tolerance: number): string|null {
    const hits=level.arrows.filter(a=>!removed.has(a.id)).map(a=>({id:a.id,d:Math.min(...a.points.slice(1).map((q,i)=>distanceToSegment(p,a.points[i],q)))})).filter(a=>a.d<=tolerance).sort((a,b)=>a.d-b.d);
    if(!hits.length||(hits[1]&&hits[1].d-hits[0].d<0.12))return null;
    return hits[0].id;
}
export type Snapshot={levelId:string;version:number;attemptId:string;removed:string[];penalized:string[];hearts:number;hintUsed:boolean};
export class Session {
    removed=new Set<string>(); penalized=new Set<string>(); hearts=3;hintUsed=false;
    attemptId=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
    constructor(public level: Level){}
    get status(): 'playing'|'won'|'lost' {return this.hearts===0?'lost':this.removed.size===this.level.arrows.length?'won':'playing';}
    click(id:string):'ignored'|'removed'|'penalty'|'blocked'{
        if(this.status!=='playing'||this.removed.has(id))return 'ignored';
        const a=this.level.arrows.find(a=>a.id===id);if(!a)return 'ignored';
        if(canExit(a,this.level,this.removed)){this.removed.add(id);return 'removed';}
        if(this.penalized.has(id))return 'blocked';
        this.penalized.add(id);this.hearts--;return 'penalty';
    }
    snapshot(): Snapshot {return {levelId:this.level.id,version:this.level.version,attemptId:this.attemptId,removed:[...this.removed],penalized:[...this.penalized],hearts:this.hearts,hintUsed:this.hintUsed};}
    restore(s: Snapshot):boolean {
        if(!s||s.levelId!==this.level.id||s.version!==this.level.version||!Array.isArray(s.removed)||!Array.isArray(s.penalized)||typeof s.attemptId!=='string')return false;
        const ids=new Set(this.level.arrows.map(a=>a.id));
        if([...s.removed,...s.penalized].some(id=>!ids.has(id))||new Set(s.removed).size!==s.removed.length||new Set(s.penalized).size!==s.penalized.length||s.penalized.length>3||s.hearts!==3-s.penalized.length)return false;
        // Reject corrupt snapshots that claim a blocked arrow was removed first.
        const remaining=new Set<string>();
        for(const id of s.removed){const a=this.level.arrows.find(a=>a.id===id)!;if(!canExit(a,this.level,remaining))return false;remaining.add(id);}
        this.removed=remaining;this.penalized=new Set(s.penalized);this.hearts=s.hearts;this.hintUsed=!!s.hintUsed;this.attemptId=s.attemptId;return true;
    }
}
export class Gesture {
    points=new Map<number,Point>(); origins=new Map<number,Point>(); cancelled=false;
    start(id:number,p:Point):void {if(!this.points.size)this.cancelled=false;this.points.set(id,p);this.origins.set(id,p);if(this.points.size>1)this.cancelled=true;}
    move(id:number,p:Point):void {const o=this.origins.get(id);if(!o)return;if(Math.hypot(p.x-o.x,p.y-o.y)>9)this.cancelled=true;this.points.set(id,p);}
    end(id:number):boolean {const click=this.points.has(id)&&this.points.size===1&&!this.cancelled;this.points.delete(id);this.origins.delete(id);return click;}
    clear():void {this.points.clear();this.origins.clear();this.cancelled=true;}
}
