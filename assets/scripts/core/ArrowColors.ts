import { Level } from './Rules';

// Preserve each seasonal palette's hue family; increase saturation and separate
// the pale transition color from the cream background. Cache per 24-term cycle.
const palettes=new Map<number,readonly string[]>();
export function advancedPalette(index:number,base:readonly string[]):readonly string[]{
    const key=index%24,cached=palettes.get(key);if(cached)return cached;
    const result=key===4?['#CA861F','#E9AD54','#DD629A','#9562CD']:base.map(hex=>{
        const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(...rgb),min=Math.min(...rgb),d=max-min;
        const light=(max+min)/2;
        let hue=0;if(d)hue=(max===rgb[0]?(rgb[1]-rgb[2])/d+(rgb[1]<rgb[2]?6:0):max===rgb[1]?(rgb[2]-rgb[0])/d+2:(rgb[0]-rgb[1])/d+4)/6;
        const sat=Math.min(.82,(d?d/(1-Math.abs(2*light-1)):0)+.20),l=Math.max(.44,Math.min(.64,light-.10));
        const chroma=(1-Math.abs(2*l-1))*sat,x=chroma*(1-Math.abs(hue*6%2-1)),m=l-chroma/2;
        const values=hue<1/6?[chroma,x,0]:hue<2/6?[x,chroma,0]:hue<3/6?[0,chroma,x]:hue<4/6?[0,x,chroma]:hue<5/6?[x,0,chroma]:[chroma,0,x];
        return '#'+values.map(v=>Math.round((v+m)*255).toString(16).padStart(2,'0')).join('');
    });
    palettes.set(key,result);return result;
}

export function balanceArrowColors(level:Level):void {
    const n=level.arrows.length,lengths:number[]=[],cells=new Map<string,number>();
    const samples:{x:number;y:number;i:number}[]=[];
    level.arrows.forEach((a,i)=>{
        let length=0;const seen=new Set<string>();
        for(let j=1;j<a.points.length;j++){
            const p=a.points[j-1],q=a.points[j],d=Math.abs(q.x-p.x)+Math.abs(q.y-p.y);length+=d;
            for(let t=0;t<=d;t++){const x=p.x+Math.sign(q.x-p.x)*t,y=p.y+Math.sign(q.y-p.y)*t,k=x+','+y;
                if(!seen.has(k)){seen.add(k);cells.set(k,i);samples.push({x,y,i});}}
        }
        lengths.push(length);
    });
    const edges=Array.from({length:n},()=>new Map<number,number>());
    for(const p of samples)for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){
        if(!dx&&!dy||dx*dx+dy*dy>4)continue;
        const j=cells.get((p.x+dx)+','+(p.y+dy));if(j===undefined||j===p.i)continue;
        edges[p.i].set(j,(edges[p.i].get(j)||0)+1);
    }
    const total=lengths.reduce((a,b)=>a+b,0),target=total/4,loads=[0,0,0,0],bands=Array(n).fill(-1);
    const degree=edges.map(e=>Array.from(e.values()).reduce((a,b)=>a+b,0));
    const order=Array.from({length:n},(_,i)=>i).sort((a,b)=>degree[b]-degree[a]||lengths[b]-lengths[a]||a-b);
    for(const i of order){
        let best=0,score=Infinity;
        for(let c=0;c<4;c++){
            let conflict=0;edges[i].forEach((weight,j)=>{if(bands[j]===c)conflict+=weight;});
            const next=loads[c]+lengths[i];
            const value=conflict/Math.max(1,degree[i])+0.35*next/target+20*Math.max(0,next/total-.30);
            if(value<score){score=value;best=c;}
        }
        bands[i]=best;loads[best]+=lengths[i];
    }
    level.arrows.forEach((a,i)=>{a.colorBand=bands[i];});
}
