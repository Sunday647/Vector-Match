import { _decorator, Component, Node, Graphics, Color, Label, UITransform, Vec3, view, ResolutionPolicy, Mask, resources, input, Input, EventTouch, EventMouse, sys, game, Game, AudioSource, AudioClip } from 'cc';
import { Arrow, Level, Point, Session, Gesture, canExit, hitArrow, direction, LINE_WIDTH, HEAD_LENGTH, HEAD_WIDTH } from './core/Rules';
import { generateLevel, levelTitle, Generated } from './core/Generator';
import { solarTermForLevel } from './core/SolarTerms';
const {ccclass}=_decorator;
const INK='#344C65', MUTED='#8498AC', BLUE='#428EE8', PAPER='#FFFDF8';
const STORAGE_KEY='one-arrow-clear-generator-demo-v1';
const C=(s:string)=>new Color().fromHEX(s);
type Button={x:number;y:number;w:number;h:number;run:()=>void};
@ccclass('Main')
export class Main extends Component {
    private root!:Node;private board!:Node;private drawing!:Graphics;private hud!:Node;private overlay!:Node;
    private levels:Level[]=[];private generation:Generator<void,Generated,unknown>|null=null;private generationIndex=0;private generationForeground=false;private page=0;private loadingLabel:Label|null=null;private index=0;private session!:Session;private buttons:Button[]=[];private gesture=new Gesture();
    private scale=1;private fit=1;private pan:Point={x:0,y:0};private pitch=14;private bh=800;private by=-10;private height=1280;
    private busy=false;private modal='';private activeButton:Button|null=null;private hint='';private toast='';private toastTime=0;
    private progress!:Label;private hearts!:Label;private zoomLabel!:Label;private toastLabel!:Label;
    private leaving:{arrow:Arrow;time:number;color:string}|null=null;private wrong:{arrow:Arrow;time:number;color:string;finalRed:boolean;lost:boolean}|null=null;private shakeId='';private shakeTime=0;
    private saved:any={};private sound=true;private audio!:AudioSource;private tones:AudioClip[]=[];
    onLoad(){
        view.setDesignResolutionSize(720,1280,ResolutionPolicy.FIXED_WIDTH);
        this.height=view.getVisibleSize().height;this.bh=Math.max(460,this.height-420);this.by=-5;
        this.root=this.make('Game',this.node);this.root.setPosition(0,0);
        this.audio=this.node.addComponent(AudioSource);
        for(let i=0;i<3;i++)resources.load('audio/tone'+i,AudioClip,(err,clip)=>{if(!err)this.tones[i]=clip;});
        try{this.saved=JSON.parse(sys.localStorage.getItem(STORAGE_KEY)||'{}');this.sound=this.saved.sound!==false;}catch{this.saved={};}
        this.panel(this.root,0,0,740,this.height+20,PAPER,0);
        const savedIndex=Number.isSafeInteger(this.saved.index)&&this.saved.index>=0?this.saved.index:0;
        this.openLevel(savedIndex);
        input.on(Input.EventType.TOUCH_START,this.startTouch,this);input.on(Input.EventType.TOUCH_MOVE,this.moveTouch,this);input.on(Input.EventType.TOUCH_END,this.endTouch,this);input.on(Input.EventType.TOUCH_CANCEL,this.cancelTouch,this);input.on(Input.EventType.MOUSE_WHEEL,this.wheel,this);
        game.on(Game.EVENT_HIDE,this.hide,this);view.on('canvas-resize',this.resize,this);
    }
    onDestroy(){input.off(Input.EventType.TOUCH_START,this.startTouch,this);input.off(Input.EventType.TOUCH_MOVE,this.moveTouch,this);input.off(Input.EventType.TOUCH_END,this.endTouch,this);input.off(Input.EventType.TOUCH_CANCEL,this.cancelTouch,this);input.off(Input.EventType.MOUSE_WHEEL,this.wheel,this);game.off(Game.EVENT_HIDE,this.hide,this);view.off('canvas-resize',this.resize,this);}
    private resize(){this.height=view.getVisibleSize().height;this.bh=Math.max(460,this.height-420);if(this.session){this.gesture.clear();this.buildUI();this.resetView();this.draw();}}
    private hide(){this.gesture.clear();this.activeButton=null;this.save();}
    private make(name:string,parent:Node,w=720,h=1280){const n=new Node(name);n.layer=1<<25;parent.addChild(n);n.addComponent(UITransform).setContentSize(w,h);return n;}
    private text(parent:Node,s:string,x:number,y:number,size=24,color=INK,width=680):Label{const n=this.make('Text',parent,width,size*1.7);n.setPosition(x,y);const l=n.addComponent(Label);l.string=s;l.fontSize=size;l.lineHeight=size*1.4;l.color=C(color);l.isBold=false;l.overflow=Label.Overflow.SHRINK;l.horizontalAlign=Label.HorizontalAlign.CENTER;l.verticalAlign=Label.VerticalAlign.CENTER;return l;}
    private panel(parent:Node,x:number,y:number,w:number,h:number,color:string,r=20):Graphics{const n=this.make('Panel',parent,w,h);n.setPosition(x,y);const g=n.addComponent(Graphics);g.fillColor=C(color);g.roundRect(-w/2,-h/2,w,h,r);g.fill();return g;}
    private button(parent:Node,label:string,x:number,y:number,w:number,run:()=>void,primary=false,h=62){this.panel(parent,x,y-3,w,h,primary?'#C8DCF5':'#E4EBF3',h/2);this.panel(parent,x,y,w,h,primary?BLUE:'#FFFFFF',h/2);this.text(parent,label,x,y,23,primary?'#FFFFFF':INK,w-12);this.buttons.push({x,y,w,h,run});}
    private openLevel(index:number,reset=false){
        if(!this.levels[index]){
            this.generation=generateLevel(index);this.generationIndex=index;this.generationForeground=true;
            this.busy=true;this.buttons=[];this.gesture.clear();this.activeButton=null;
            if(this.overlay){this.overlay.active=true;this.overlay.removeAllChildren();this.panel(this.overlay,0,0,740,this.height+20,PAPER,0);}
            this.loadingLabel=this.text(this.overlay||this.root,`正在生成第${index+1}关 · ${levelTitle(index)}…`,0,0,24,INK);
            return;
        }
        this.generation=null;this.generationForeground=false;
        this.index=index;this.session=new Session(this.levels[index]);
        if(!reset&&this.saved.attempts?.[this.session.level.id])this.session.restore(this.saved.attempts[this.session.level.id]);
        this.hint='';this.busy=false;this.leaving=null;this.wrong=null;this.shakeTime=0;this.modal='';this.gesture.clear();this.activeButton=null;
        this.buildUI();this.resetView();this.draw();this.updateHUD();this.save();
        if(this.session.status!=='playing')this.showModal(this.session.status);
        if(!this.levels[index+1]){this.generation=generateLevel(index+1);this.generationIndex=index+1;this.generationForeground=false;}

    }
    private arrowColor(a:Arrow):string{
        const palette=solarTermForLevel(this.index).colors;
        return palette[Math.max(0,Math.min(3,a.colorBand||0))];
    }
    private buildUI(){
        this.root.removeAllChildren();this.buttons=[];const top=this.height/2;
        this.panel(this.root,0,0,740,this.height+20,PAPER,0);
        const title=this.text(this.root,`第${this.index+1}关`,0,top-65,32,INK);title.isBold=true;
        this.button(this.root,'Ⅱ',290,top-91,62,()=>this.showModal('pause'));
        this.hearts=this.text(this.root,'♥  ♥  ♥',0,top-112,28,'#F16B7F',180);
        this.text(this.root,`${solarTermForLevel(this.index).name} · ${this.levels[this.index]?.name||''}`,0,top-149,24,INK);
        this.progress=this.text(this.root,'',0,top-185,18,MUTED);
        const clip=this.make('Board viewport',this.root,660,this.bh);clip.setPosition(0,this.by);clip.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
        this.board=this.make('Arrow artwork',clip,660,this.bh);this.drawing=this.board.addComponent(Graphics);
        this.hud=this.make('Controls',this.root);const bottom=-top;
        this.toastLabel=this.text(this.hud,'沿箭头方向移出 · 双指放大看得更清楚',0,bottom+186,20,MUTED);
        this.button(this.hud,'−',-230,bottom+119,66,()=>this.zoom(this.scale/1.35));
        this.panel(this.hud,0,bottom+119,330,62,'#EAF1FA',31);
        this.zoomLabel=this.text(this.hud,'100%',-72,bottom+119,22,BLUE,120);
        this.button(this.hud,'查看全图',64,bottom+119,184,()=>{this.resetView();this.draw();},false,54);
        this.button(this.hud,'＋',230,bottom+119,66,()=>this.zoom(this.scale*1.35));
        this.button(this.hud,this.session.hintUsed?'提示已用':'找个出口',-160,bottom+43,220,()=>this.useHint(),true,58);
        this.button(this.hud,'图案手册',160,bottom+43,220,()=>{this.page=Math.floor(this.index/6);this.showModal('levels');},false,58);
        this.overlay=this.make('Modal',this.root);this.overlay.active=false;
    }
    private resetView(){const l=this.session.level;this.fit=Math.min(590/(l.width*this.pitch),(this.bh-60)/(l.height*this.pitch));this.scale=this.fit;this.pan={x:0,y:0};this.transform();}
    private transform(){this.clampPan();this.board.setScale(this.scale,this.scale,1);this.board.setPosition(this.pan.x,this.pan.y);if(this.zoomLabel)this.zoomLabel.string=Math.round(this.scale/this.fit*100)+'%';}
    private clampPan(){const l=this.session.level,mx=Math.max(0,(l.width*this.pitch*this.scale-600)/2+40),my=Math.max(0,(l.height*this.pitch*this.scale-this.bh+80)/2);this.pan.x=Math.max(-mx,Math.min(mx,this.pan.x));this.pan.y=Math.max(-my,Math.min(my,this.pan.y));}
    private zoom(next:number,anchor:Point={x:0,y:this.by}){if(this.modal||this.busy)return;const old=this.scale;this.scale=Math.max(this.fit,Math.min(this.fit*6,next));const ratio=this.scale/old;this.pan={x:anchor.x-(anchor.x-this.pan.x)*ratio,y:anchor.y-this.by-(anchor.y-this.by-this.pan.y)*ratio};this.transform();}
    private pos(p:Point):Point{return{x:(p.x-(this.session.level.width-1)/2)*this.pitch,y:(p.y-(this.session.level.height-1)/2)*this.pitch};}
    private renderArrow(a:Arrow,color:string,offset=0,shake=0){
        const g=this.drawing,dir=direction(a),last=a.points[a.points.length-1];let pts=a.points.map(p=>({...p}));
        if(offset>0){pts.push({x:last.x+dir.x*offset,y:last.y+dir.y*offset});let distance=offset;while(pts.length>1){const len=Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y);if(distance>=len){distance-=len;pts.shift();}else{pts[0]={x:pts[0].x+(pts[1].x-pts[0].x)*distance/len,y:pts[0].y+(pts[1].y-pts[0].y)*distance/len};break;}}}
        if(pts.length<2)return;
        const pixel=pts.map(p=>this.pos(p));g.lineJoin=Graphics.LineJoin.ROUND;g.lineCap=Graphics.LineCap.ROUND;
        g.strokeColor=C(color);g.fillColor=C(color);g.lineWidth=LINE_WIDTH*this.pitch;g.moveTo(pixel[0].x+shake,pixel[0].y);for(let i=1;i<pixel.length;i++)g.lineTo(pixel[i].x+shake,pixel[i].y);g.stroke();
        const h=pixel[pixel.length-1],length=HEAD_LENGTH*this.pitch,width=HEAD_WIDTH/2*this.pitch;
        g.moveTo(h.x+dir.x*length/2+shake,h.y+dir.y*length/2);g.lineTo(h.x-dir.x*length/2-dir.y*width+shake,h.y-dir.y*length/2+dir.x*width);g.lineTo(h.x-dir.x*length/2+dir.y*width+shake,h.y-dir.y*length/2-dir.x*width);g.close();g.fill();
    }
    private wrongMotion(t:number):{offset:number;shake:number}{
        if(t<0.16)return {offset:0.82*(1-Math.pow(1-t/0.16,3)),shake:0};
        if(t<0.32){const p=(t-0.16)/0.16;return {offset:0.82*(1-p)+0.1*Math.sin(p*Math.PI),shake:0};}
        if(t<0.62){const p=(t-0.32)/0.30;return {offset:0,shake:Math.sin(p*Math.PI*4)*4*(1-p)};}
        return {offset:0,shake:0};
    }
    private draw(){if(!this.drawing)return;this.drawing.clear();for(const a of this.session.level.arrows){if(this.session.removed.has(a.id)||this.wrong?.arrow.id===a.id)continue;const color=this.session.penalized.has(a.id)?'#ED475D':this.arrowColor(a);
        if(a.id===this.hint){const h=this.pos(a.points[a.points.length-1]);this.drawing.strokeColor=C('#7ABCE9');this.drawing.lineWidth=2/this.scale;this.drawing.circle(h.x,h.y,13/this.scale);this.drawing.stroke();}
        this.renderArrow(a,color,0,a.id===this.shakeId?Math.sin(this.shakeTime*65)*3*this.shakeTime:0);
    }
    if(this.wrong){const m=this.wrongMotion(this.wrong.time);const color=this.wrong.time>=0.62&&this.wrong.finalRed?'#ED475D':this.wrong.color;this.renderArrow(this.wrong.arrow,color,m.offset,m.shake);}
    if(this.leaving){const a=this.leaving.arrow;const length=a.points.length-1;const d=direction(a),h=a.points[a.points.length-1];const exit=d.x>0?this.session.level.width-h.x:d.x<0?h.x+1:d.y>0?this.session.level.height-h.y:h.y+1;this.renderArrow(a,this.leaving.color,(length+exit+2)*Math.min(1,this.leaving.time/0.55));}}
    private updateHUD(){this.hearts.string=Array.from({length:3},(_,i)=>i<this.session.hearts?'♥':'♡').join(' ');this.progress.string=`${this.session.level.subtitle}  ·  ${this.session.removed.size}/${this.session.level.arrows.length}`;}
    private save(){if(!this.session)return;this.saved.index=this.index;this.saved.sound=this.sound;this.saved.attempts={};this.saved.attempts[this.session.level.id]=this.session.snapshot();try{sys.localStorage.setItem(STORAGE_KEY,JSON.stringify(this.saved));}catch{this.message('本次进度暂时无法保存');}}
    private message(s:string){this.toast=s;this.toastTime=3;if(this.toastLabel)this.toastLabel.string=s;}
    private useHint(){if(this.busy||this.session.status!=='playing')return;if(this.session.hintUsed){this.message('本局提示已使用，试着放大观察');return;}const a=this.session.level.arrows.find(a=>canExit(a,this.session.level,this.session.removed));if(!a){this.message('关卡状态异常，请重新挑战');return;}this.session.hintUsed=true;this.hint=a.id;this.save();this.draw();this.message('光圈里的箭头，可以自由离开');}
    private tap(p:Point){if(this.busy||this.modal||this.session.status!=='playing')return;const local={x:(p.x-this.pan.x)/this.scale/this.pitch+(this.session.level.width-1)/2,y:(p.y-this.by-this.pan.y)/this.scale/this.pitch+(this.session.level.height-1)/2};
        const id=hitArrow(this.session.level,this.session.removed,local,Math.min(0.48,14/(this.scale*this.pitch)));if(!id){this.message('可以放大一点，让箭头更好点');return;}
        const arrow=this.session.level.arrows.find(a=>a.id===id)!;const baseColor=this.arrowColor(arrow);const result=this.session.click(id);this.save();this.updateHUD();
        if(result==='removed'){this.busy=true;this.leaving={arrow,time:0,color:this.session.penalized.has(id)?'#ED475D':baseColor};if(this.hint===id)this.hint='';this.play(0);}
        else if(result==='penalty'||result==='blocked'){this.busy=true;this.shakeId='';this.shakeTime=0;this.wrong={arrow,time:0,color:result==='blocked'?'#ED475D':baseColor,finalRed:result==='penalty',lost:this.session.hearts===0};this.play(1);this.message(result==='penalty'?'这根线暂时被挡住了，标红后重复点不再扣心':'这根红线仍被挡住，再找找其他出口');}
        this.draw();
    }
    private play(i:number){if(this.sound&&this.tones[i])this.audio.playOneShot(this.tones[i],0.3);}
    private point(e:EventTouch|EventMouse):Point {const p=e.getUILocation();const q=this.node.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(p.x,p.y));return{x:q.x,y:q.y};}
    private inside(p:Point){return Math.abs(p.x)<330&&Math.abs(p.y-this.by)<this.bh/2;}
    private startTouch(e:EventTouch){if(!this.session)return;const p=this.point(e),id=e.getID();this.gesture.start(id,p);
        if(this.gesture.points.size>1){this.activeButton=null;return;}
        this.activeButton=[...this.buttons].reverse().find(b=>Math.abs(p.x-b.x)<b.w/2&&Math.abs(p.y-b.y)<b.h/2)||null;
        if(!this.activeButton&&!this.inside(p))this.gesture.cancelled=true;
    }
    private moveTouch(e:EventTouch){if(!this.session)return;const id=e.getID(),p=this.point(e),old=this.gesture.points.get(id);if(!old)return;
        const before=Array.from(this.gesture.points.values());this.gesture.move(id,p);if(this.modal||this.busy||this.activeButton)return;
        const after=Array.from(this.gesture.points.values());if(after.length===2){const dist=(ps:Point[])=>Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y);const mid=(ps:Point[])=>({x:(ps[0].x+ps[1].x)/2,y:(ps[0].y+ps[1].y)/2});const b=mid(before),a=mid(after);if(dist(before)>5){this.zoom(this.scale*dist(after)/dist(before),b);this.pan.x+=a.x-b.x;this.pan.y+=a.y-b.y;this.transform();}}
        else if(after.length===1&&this.gesture.cancelled&&this.scale>this.fit*1.01){this.pan.x+=p.x-old.x;this.pan.y+=p.y-old.y;this.transform();}
    }
    private endTouch(e:EventTouch){const p=this.point(e),click=this.gesture.end(e.getID()),button=this.activeButton;if(!this.gesture.points.size)this.activeButton=null;if(!click)return;if(button){if(Math.abs(p.x-button.x)<button.w/2&&Math.abs(p.y-button.y)<button.h/2)button.run();}else if(this.inside(p))this.tap(p);}
    private cancelTouch(){this.gesture.clear();this.activeButton=null;}
    private wheel(e:EventMouse){if(!this.session)return;const p=this.point(e);if(this.inside(p)){this.zoom(this.scale*Math.exp(e.getScrollY()*0.0015),p);}}
    private closeModal(){this.modal='';this.overlay.active=false;this.buildUI();this.transform();this.draw();this.updateHUD();}
    private showModal(kind:string){
        if(this.busy)return;this.modal=kind;this.gesture.clear();this.activeButton=null;this.buttons=[];this.overlay.removeAllChildren();this.overlay.active=true;
        const bg=this.panel(this.overlay,0,0,740,this.height+20,'#EAF2FC',0);bg.fillColor=new Color(234,242,252,245);
        this.panel(this.overlay,0,10,610,650,'#FFFFFF',38);
        this.text(this.overlay,kind==='won'?'✦':'···',0,238,46,BLUE);
        const titles:any={pause:'休息一小会儿',levels:'挑一幅小风景',won:'又解开了一点美好',lost:'慢慢来，再试一次',restart:'重新铺开这幅图案？'};
        this.text(this.overlay,titles[kind],0,156,32,INK);
        if(kind==='levels'){
            this.text(this.overlay,`参数图案试玩 · 第 ${this.page*6+1}—${this.page*6+6} 关`,0,108,20,MUTED);
            for(let row=0;row<6;row++){
                const i=this.page*6+row;
                this.button(this.overlay,`${i+1}  ${solarTermForLevel(i).name} · ${levelTitle(i)}`,0,53-row*49,450,()=>this.openLevel(i),i===this.index,42);
            }
            this.button(this.overlay,'上一页',-188,-251,155,()=>{this.page=Math.max(0,this.page-1);this.showModal('levels');},false,45);
            this.button(this.overlay,'返回',0,-251,155,()=>this.closeModal(),false,45);
            this.button(this.overlay,'下一页',188,-251,155,()=>{this.page++;this.showModal('levels');},false,45);
        }else if(kind==='pause'){
            this.text(this.overlay,'缩放和拖动都不会扣心',0,96,21,MUTED);
            this.button(this.overlay,'继续解开',0,18,400,()=>this.closeModal(),true);
            this.button(this.overlay,'重新挑战',0,-67,400,()=>this.showModal('restart'));
            this.button(this.overlay,this.sound?'声音：开启':'声音：关闭',0,-152,400,()=>{this.sound=!this.sound;this.save();this.showModal('pause');});
        }else if(kind==='restart'){
            this.text(this.overlay,'本局进度会清空，恢复三颗心',0,77,22,MUTED);
            this.button(this.overlay,'重新开始',0,-20,400,()=>this.openLevel(this.index,true),true);
            this.button(this.overlay,'继续当前挑战',0,-110,400,()=>this.closeModal());
        }else{
            this.text(this.overlay,kind==='won'?'让颜色散去，给自己留一点轻松':'放大看看，下次会更从容',0,77,22,MUTED);
            this.button(this.overlay,kind==='won'?'下一幅风景':'再试一次',0,-20,400,()=>this.openLevel(kind==='won'?this.index+1:this.index,true),true);
            this.button(this.overlay,'图案手册',0,-110,400,()=>{this.page=Math.floor(this.index/6);this.showModal('levels');});
            if(kind==='won')this.play(2);
        }
    }
    update(dt:number){
        if(this.generation){
            const start=Date.now();
            try{
                do{
                    const result=this.generation.next();
                    if(result.done){
                        const i=this.generationIndex,foreground=this.generationForeground;
                        this.levels[i]=result.value.level;this.generation=null;
                        // Keep only the nearby playable boards; regenerate others from their index.
                        for(const k of Object.keys(this.levels))if(Math.abs(Number(k)-i)>6)delete this.levels[Number(k)];
                        if(foreground){this.loadingLabel=null;this.openLevel(i);}
                        break;
                    }
                }while(Date.now()-start<5);
            }catch(error){
                this.generation=null;
                console.error('Level generation failed',error);
                if(this.generationForeground){
                    if(this.loadingLabel)this.loadingLabel.string='这幅图案没铺好，点下方重新生成';
                    this.busy=false;
                    this.button(this.overlay||this.root,'重新生成',0,-90,260,()=>this.openLevel(this.generationIndex),true);
                }
            }
        }
        if(!this.session||this.generationForeground&&this.generation)return;
        if(this.leaving){this.leaving.time+=dt;if(this.leaving.time>=0.55){this.leaving=null;this.busy=false;if(this.session.status==='won')this.showModal('won');}this.draw();}
        if(this.wrong){this.wrong.time+=dt;if(this.wrong.time>=0.72){const lost=this.wrong.lost;this.wrong=null;this.busy=false;if(lost)this.showModal('lost');}this.draw();}
        if(this.shakeTime>0){this.shakeTime=Math.max(0,this.shakeTime-dt);this.draw();}
        if(this.toastTime>0){this.toastTime-=dt;if(this.toastTime<=0)this.toastLabel.string='沿箭头方向移出 · 双指放大看得更清楚';}
    }
}
