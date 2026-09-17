import { _decorator, Component, Node, Graphics, Color, Label, UITransform, Vec3, view, ResolutionPolicy, Mask, resources, input, Input, EventTouch, EventMouse, sys, game, Game, AudioSource, AudioClip, Sprite, SpriteFrame, SubContextView } from 'cc';
import { Arrow, Level, Point, Session, Gesture, canExit, hitArrow, direction, LINE_WIDTH, HEAD_LENGTH, HEAD_WIDTH } from './core/Rules';
import { generateLevel, levelTitle, Generated } from './core/Generator';
import { solarTermForLevel } from './core/SolarTerms';
import { canClaimAdReward, initCloud, loadCloudProgress, markAdReward, mergeProgress, saveCloudProgress } from './core/CloudProgress';
import { initRewardedAd, showRewardedAd } from './core/RewardedAd';
import { reportBestLevel, requestFriendRank } from './core/Leaderboard';
import { ROUTE_STEP, ROUTE_TILE_HEIGHT, ROUTE_TILE_CENTER, routeX, clampRoute, visibleRoute } from './core/Route';
const {ccclass}=_decorator;
const INK='#405634', MUTED='#87916B', BLUE='#78934B', PAPER='#FFFCF5';
const STORAGE_KEY='one-arrow-clear-generator-demo-v1';
const WECHAT_CLOUD_ENV_ID='';
const REWARDED_AD_UNIT_ID='';
const VISUAL_LINE_GAIN=1.62, VISUAL_HEAD_GAIN=1.45;
const C=(s:string)=>new Color().fromHEX(s);
type Button={x:number;y:number;w:number;h:number;run:()=>void};
@ccclass('Main')
export class Main extends Component {
    private root!:Node;private board!:Node;private drawing!:Graphics;private hud!:Node;private overlay!:Node;
    private levels:Level[]=[];private generation:Generator<void,Generated,unknown>|null=null;private generationIndex=0;private generationForeground=false;private page=0;private loadingLabel:Label|null=null;private index=0;private session!:Session;private buttons:Button[]=[];private gesture=new Gesture();
    private scale=1;private fit=1;private pan:Point={x:0,y:0};private pitch=14;private bh=800;private by=-10;private height=1280;
    private busy=false;private modal='';private activeButton:Button|null=null;private hint='';private toast='';private toastTime=0;
    private progressFill:Graphics|null=null;private heartArt:Graphics|null=null;private progress!:Label;private hearts!:Label;private zoomLabel!:Label;private toastLabel!:Label;
    private leaving:{arrow:Arrow;time:number;color:string}|null=null;private wrong:{arrow:Arrow;time:number;color:string;finalRed:boolean;lost:boolean}|null=null;private shakeId='';private shakeTime=0;
    private saved:any={};private sound=true;private music=true;private audio!:AudioSource;private bgmAudio!:AudioSource;private tones:AudioClip[]=[];private bgm:AudioClip|null=null;
    private screen='home';private zoomTrack:Graphics|null=null;private zoomY=0;private sliding=false;
    private loadingCat:Node|null=null;private loadingTime=0;private generationReset=false;
    private adClaimPending=false;
    private cloudEnabled=false;private cloudSyncing=false;private rewardedAdEnabled=false;
    private routeWorld:Node|null=null;private routeScenery:Node|null=null;private routeTiles=new Map<number,Node>();private routeLayer:Node|null=null;private routeOffset=0;private routeHeight=0;private routeButtons:Button[]=[];
    private rankView:SubContextView|null=null;private rankTime=0;
    onLoad(){
        view.setDesignResolutionSize(720,1280,ResolutionPolicy.FIXED_WIDTH);
        this.height=view.getVisibleSize().height;this.bh=Math.max(460,this.height-420);this.by=-5;
        this.root=this.make('Game',this.node);this.root.setPosition(0,0);
        this.audio=this.node.addComponent(AudioSource);this.bgmAudio=this.node.addComponent(AudioSource);this.bgmAudio.loop=true;this.bgmAudio.volume=0.18;
        for(let i=0;i<3;i++)resources.load('audio/tone'+i,AudioClip,(err,clip)=>{if(!err)this.tones[i]=clip;});
        resources.load('audio/bgm',AudioClip,(err,clip)=>{if(!err){this.bgm=clip;this.playMusic();}});
        try{this.saved=JSON.parse(sys.localStorage.getItem(STORAGE_KEY)||'{}');this.sound=this.saved.sound!==false;this.music=this.saved.music!==false;}catch{this.saved={};}
        this.cloudEnabled=initCloud(WECHAT_CLOUD_ENV_ID);this.rewardedAdEnabled=initRewardedAd(REWARDED_AD_UNIT_ID);
        this.panel(this.root,0,0,740,this.height+20,PAPER,0);
        const savedIndex=Number.isSafeInteger(this.saved.index)&&this.saved.index>=0?this.saved.index:0;
        this.index=savedIndex;this.showHome();
        this.syncCloudProgress();
        input.on(Input.EventType.TOUCH_START,this.startTouch,this);input.on(Input.EventType.TOUCH_MOVE,this.moveTouch,this);input.on(Input.EventType.TOUCH_END,this.endTouch,this);input.on(Input.EventType.TOUCH_CANCEL,this.cancelTouch,this);input.on(Input.EventType.MOUSE_WHEEL,this.wheel,this);
        game.on(Game.EVENT_HIDE,this.hide,this);game.on(Game.EVENT_SHOW,this.show,this);view.on('canvas-resize',this.resize,this);
    }
    onDestroy(){input.off(Input.EventType.TOUCH_START,this.startTouch,this);input.off(Input.EventType.TOUCH_MOVE,this.moveTouch,this);input.off(Input.EventType.TOUCH_END,this.endTouch,this);input.off(Input.EventType.TOUCH_CANCEL,this.cancelTouch,this);input.off(Input.EventType.MOUSE_WHEEL,this.wheel,this);game.off(Game.EVENT_HIDE,this.hide,this);game.off(Game.EVENT_SHOW,this.show,this);view.off('canvas-resize',this.resize,this);}
    private resize(){this.height=view.getVisibleSize().height;this.bh=Math.max(300,this.height-510);this.gesture.clear();if(this.screen==='home'){this.showHome();return;}if(this.session){this.buildUI();this.resetView();this.draw();this.updateHUD();}}
    private hide(){this.gesture.clear();this.activeButton=null;this.bgmAudio?.stop();this.save();this.flushCloudProgress();}
    private show(){this.playMusic();}
    private make(name:string,parent:Node,w=720,h=1280){const n=new Node(name);n.layer=1<<25;parent.addChild(n);n.addComponent(UITransform).setContentSize(w,h);return n;}
    private text(parent:Node,s:string,x:number,y:number,size=24,color=INK,width=680):Label{const n=this.make('Text',parent,width,size*1.7);n.setPosition(x,y);const l=n.addComponent(Label);l.string=s;l.fontSize=size;l.lineHeight=size*1.4;l.color=C(color);l.isBold=false;l.overflow=Label.Overflow.SHRINK;l.horizontalAlign=Label.HorizontalAlign.CENTER;l.verticalAlign=Label.VerticalAlign.CENTER;return l;}
    private panel(parent:Node,x:number,y:number,w:number,h:number,color:string,r=20):Graphics{const n=this.make('Panel',parent,w,h);n.setPosition(x,y);const g=n.addComponent(Graphics);g.fillColor=C(color);g.roundRect(-w/2,-h/2,w,h,r);g.fill();return g;}
    private button(parent:Node,label:string,x:number,y:number,w:number,run:()=>void,primary=false,h=62){this.panel(parent,x,y-3,w,h,'#E4E6D9',h/2);this.panel(parent,x,y,w,h,primary?'#AD713D':'#FFF5DD',h/2);this.text(parent,label,x,y,23,primary?'#FFFFFF':INK,w-12);this.buttons.push({x,y,w,h,run});}
    private switchRow(parent:Node,label:string,on:boolean,x:number,y:number,w:number,run:()=>void){
        this.panel(parent,x,y-2,w,64,'#E4E6D9',32);this.panel(parent,x,y,w,64,PAPER,32);
        const text=this.text(parent,label,x-w/2+118,y,23,INK,180);text.horizontalAlign=Label.HorizontalAlign.LEFT;
        const n=this.make('Switch',parent,96,48);n.setPosition(x+w/2-78,y);const g=n.addComponent(Graphics);
        g.fillColor=C(on?BLUE:'#DADFD2');g.roundRect(-45,-23,90,46,23);g.fill();
        g.fillColor=C('#FFFFFF');g.circle(on?22:-22,0,18);g.fill();
        g.strokeColor=C(on?'#6F8663':'#C9D0C2');g.lineWidth=2;g.circle(on?22:-22,0,18);g.stroke();
        this.buttons.push({x,y,w,h:64,run});
    }
    private garden(parent:Node,x:number,y:number,flip=1){
        const n=this.make('Garden',parent,260,170);n.setPosition(x,y);const g=n.addComponent(Graphics);
        g.lineCap=Graphics.LineCap.ROUND;g.lineJoin=Graphics.LineJoin.ROUND;
        const stems=[[-96,-58,-74,8],[-62,-55,-54,28],[-28,-60,-18,10],[16,-58,34,18],[58,-56,78,34],[92,-60,104,6]];
        for(const s of stems){g.strokeColor=C('#8DA66E');g.lineWidth=3;g.moveTo(s[0]*flip,s[1]);g.bezierCurveTo((s[0]+8)*flip,s[1]+24,(s[2]-8)*flip,s[3]-22,s[2]*flip,s[3]);g.stroke();
            g.fillColor=C('#A9BF84');g.ellipse((s[2]-10)*flip,s[3]-18,7,4);g.fill();g.ellipse((s[2]+10)*flip,s[3]-28,8,4);g.fill();}
        const flowers=[[-72,4],[-18,-6],[36,10],[82,24]];
        for(const f of flowers){g.fillColor=C('#FFF2B2');for(let i=0;i<6;i++){const a=i*Math.PI/3;g.ellipse((f[0]+Math.cos(a)*7)*flip,f[1]+Math.sin(a)*7,4,4);g.fill();}g.fillColor=C('#E7A54A');g.circle(f[0]*flip,f[1],3);g.fill();}
        g.fillColor=C('#B9B19D');g.ellipse(-104*flip,-66,30,14);g.fill();g.fillColor=C('#D2CAB8');g.ellipse(-74*flip,-70,24,11);g.fill();
    }

    private homeIcon(parent:Node,kind:'route'|'rank',x:number,y:number){
        const iconNode=this.make('Home icon',parent,66,66);if(!(iconNode as any).setPosition||!(iconNode as any).addComponent)return;iconNode.setPosition(x,y);
        const g=iconNode.addComponent(Graphics);g.lineCap=Graphics.LineCap.ROUND;g.lineJoin=Graphics.LineJoin.ROUND;
        g.fillColor=C('#FFFFFF');g.circle(0,0,30);g.fill();g.strokeColor=C('#DCE6D2');g.lineWidth=3;g.circle(0,0,30);g.stroke();
        if(kind==='route'){
            g.strokeColor=C(BLUE);g.lineWidth=5;g.moveTo(-19,13);g.lineTo(-19,-8);g.lineTo(1,-8);g.lineTo(1,14);g.lineTo(20,14);g.stroke();
            g.fillColor=C(BLUE);g.moveTo(24,14);g.lineTo(12,23);g.lineTo(14,6);g.close();g.fill();
            g.strokeColor=C('#EF967B');g.lineWidth=4;g.moveTo(-22,-19);g.lineTo(4,-19);g.stroke();g.fillColor=C('#EF967B');g.moveTo(7,-19);g.lineTo(-4,-11);g.lineTo(-4,-27);g.close();g.fill();
        }else{
            g.fillColor=C('#FFF3C8');g.roundRect(-21,3,18,22,6);g.fill();g.fillColor=C('#EAF6FF');g.roundRect(-7,-11,18,36,6);g.fill();g.fillColor=C('#FFE2D7');g.roundRect(7,-1,18,26,6);g.fill();
            this.text(iconNode,'1',-12,14,20,'#EF967B',26).isBold=true;
            this.text(iconNode,'2',2,1,20,'#F0BE4E',26).isBold=true;
            this.text(iconNode,'3',16,12,20,BLUE,26).isBold=true;
            g.strokeColor=C(BLUE);g.lineWidth=4;g.roundRect(-25,-24,50,10,5);g.stroke();
        }
    }

    private artwork(parent:Node,name:string,x:number,y:number,w:number,h:number,stretch=false){
        const n=this.make(name,parent,w,h);n.setPosition(x,y);const sprite=n.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;
        resources.load(`ui/${name}/spriteFrame`,SpriteFrame,(err,frame)=>{if(!err&&n.isValid){sprite.spriteFrame=frame;const size=frame.originalSize,fit=Math.min(w/size.width,h/size.height);n.getComponent(UITransform)!.setContentSize(stretch?w:size.width*fit,stretch?h:size.height*fit);}});
        return n;
    }
    private forestBackground(){
        this.artwork(this.root,'forest',0,0,720,this.height,true);
        const sign=this.text(this.root,'萌箭消消',274,this.height*.289,23,'#603618',124);sign.isBold=true;sign.node.angle=19;
    }
    private drawHearts(){
        if(!this.heartArt)return;const g=this.heartArt;g.clear();
        for(let i=0;i<3;i++){const x=(i-1)*48;g.fillColor=C(i<this.session.hearts?'#ED9474':'#E7DDCC');g.strokeColor=C(i<this.session.hearts?'#CE765D':'#CCBEA6');g.lineWidth=2;
            g.moveTo(x,-17);g.bezierCurveTo(x-37,5,x-13,34,x,17);g.bezierCurveTo(x+13,34,x+37,5,x,-17);g.close();g.fill();g.stroke();
            if(i<this.session.hearts){g.strokeColor=C('#FFDAC0');g.lineWidth=3;g.moveTo(x-13,12);g.quadraticCurveTo(x-10,20,x-5,16);g.stroke();}}
    }
    private nextLevel(){return Math.max(0,Number(this.saved.completed)||0);}
    private showHome(){
        this.save();this.screen='home';this.modal='';this.busy=false;this.generation=null;this.generationForeground=false;this.leaving=null;this.wrong=null;this.gesture.clear();this.activeButton=null;this.sliding=false;
        this.root.removeAllChildren();this.buttons=[];this.zoomTrack=null;const top=this.height/2;
        this.panel(this.root,0,0,740,this.height+20,PAPER,0);
        this.artwork(this.root,'forest-cat',0,0,720,this.height,true);
        this.button(this.root,'⚙',294,top-150,60,()=>this.showModal('settings'),false,60);
        this.artwork(this.root,'home-title',0,top-this.height*.18,460,142);
        const y=top-this.height*.70;
        this.text(this.root,`已通关${this.nextLevel()}关`,0,top-this.height*.568,25,'#603618',270).isBold=true;
        this.text(this.root,'开始游戏',0,y+15,46,'#603618',500).isBold=true;
        this.text(this.root,`第${this.nextLevel()+1}关`,0,y-29,25,'#603618',250).isBold=true;
        this.buttons.push({x:0,y,w:540,h:this.height*.15,run:()=>this.openLevel(this.nextLevel())});
        const row=top-this.height*.91;
        this.text(this.root,'关卡路线',-153,row,28,'#603618',220).isBold=true;
        this.text(this.root,'排行榜',153,row,28,'#603618',220).isBold=true;
        this.buttons.push({x:-153,y:top-this.height*.88,w:268,h:this.height*.16,run:()=>{this.page=Math.floor(this.nextLevel()/6);this.showModal('levels');}});
        this.buttons.push({x:153,y:top-this.height*.88,w:268,h:this.height*.16,run:()=>this.showModal('rank')});
        this.overlay=this.make('Modal',this.root);this.overlay.active=false;
        this.loadingCat=null;
        if(!this.levels[this.nextLevel()]){this.generation=generateLevel(this.nextLevel());this.generationIndex=this.nextLevel();this.generationForeground=false;}
    }
    private openLevel(index:number,reset=false){
        this.screen='game';
        if(!this.levels[index]){
            if(!this.generation||this.generationIndex!==index)this.generation=generateLevel(index);
            this.generationIndex=index;this.generationForeground=true;this.generationReset=reset;
            this.busy=true;this.buttons=[];this.gesture.clear();this.activeButton=null;
            if(this.overlay){this.overlay.active=true;this.overlay.removeAllChildren();this.panel(this.overlay,0,0,740,this.height+20,PAPER,0);}
            this.loadingTime=0;
            this.loadingCat=this.artwork(this.overlay||this.root,'cat',0,60,260,260);
            this.text(this.overlay||this.root,`第${index+1}关`,0,-110,27,INK);
            this.loadingLabel=this.text(this.overlay||this.root,'小猫正在铺开彩线…',0,-154,20,MUTED);
            return;
        }
        this.generation=null;this.generationForeground=false;this.loadingCat=null;
        this.index=index;this.session=new Session(this.levels[index]);
        if(!reset&&this.saved.attempts?.[this.session.level.id])this.session.restore(this.saved.attempts[this.session.level.id]);
        // Re-entering a finished attempt starts a playable round; only live attempts resume.
        if(this.session.status!=='playing')this.session=new Session(this.levels[index]);
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
        this.bh=Math.max(520,this.height-360);this.by=6;
        this.panel(this.root,0,0,740,this.height+20,PAPER,0);
        this.forestBackground();
        const title=this.text(this.root,`第${this.index+1}关`,0,top-this.height*.112,34,INK);title.isBold=true;
        this.button(this.root,'‹',-294,top-82,56,()=>this.showHome(),false,56);
        this.button(this.root,'Ⅱ',294,top-168,56,()=>this.showModal('pause'),false,56);
        this.hearts=this.text(this.root,'',0,top-this.height*.16,38,'#EF967B',220);
        this.heartArt=this.make('Painted hearts',this.root,190,56).addComponent(Graphics);this.heartArt.node.setPosition(0,top-this.height*.16);
        this.panel(this.root,-20,top-this.height*.205,238,13,'#DCD8BF',7);
        this.progressFill=this.make('Level progress',this.root,238,14).addComponent(Graphics);this.progressFill.node.setPosition(-139,top-this.height*.205);
        this.progress=this.text(this.root,'0%',139,top-this.height*.205,20,INK,70);
        const clip=this.make('Board viewport',this.root,690,this.bh);clip.setPosition(0,this.by);clip.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
        this.board=this.make('Arrow artwork',clip,690,this.bh);this.drawing=this.board.addComponent(Graphics);
        this.hud=this.make('Controls',this.root);const bottom=-top;
        this.toastLabel=this.text(this.hud,'',0,bottom+156,18,MUTED);
        this.panel(this.hud,0,bottom+78,316,66,'#FFF9EBDD',33);
        this.zoomY=bottom+78;
        this.button(this.hud,'−',-120,this.zoomY,48,()=>this.zoom(this.scale/1.35),false,48);
        this.zoomLabel=this.text(this.hud,'100%',0,this.zoomY+30,16,INK,100);
        this.zoomTrack=this.make('Zoom slider',this.hud,210,38).addComponent(Graphics);this.zoomTrack.node.setPosition(0,this.zoomY);
        this.button(this.hud,'＋',120,this.zoomY,48,()=>this.zoom(this.scale*1.35),false,48);
        this.overlay=this.make('Modal',this.root);this.overlay.active=false;
    }
    private resetView(){const l=this.session.level;this.fit=Math.min(650/(l.width*this.pitch),(this.bh-70)/(l.height*this.pitch));this.scale=this.fit;this.pan={x:0,y:12};this.transform();}
    private transform(){this.clampPan();this.board.setScale(this.scale,this.scale,1);this.board.setPosition(this.pan.x,this.pan.y);if(this.zoomLabel)this.zoomLabel.string=Math.round(this.scale/this.fit*100)+'%';if(this.zoomTrack){const g=this.zoomTrack,x=-100+200*(this.scale/this.fit-1)/5;g.clear();g.lineCap=Graphics.LineCap.ROUND;g.lineWidth=5;g.strokeColor=C('#DFE3D5');g.moveTo(-100,0);g.lineTo(100,0);g.stroke();g.strokeColor=C(BLUE);g.moveTo(-100,0);g.lineTo(x,0);g.stroke();g.fillColor=C(BLUE);g.circle(x,0,11);g.fill();}}
    private clampPan(){const l=this.session.level,mx=Math.max(0,(l.width*this.pitch*this.scale-650)/2+45),my=Math.max(0,(l.height*this.pitch*this.scale-this.bh+90)/2);this.pan.x=Math.max(-mx,Math.min(mx,this.pan.x));this.pan.y=Math.max(-my+12,Math.min(my+12,this.pan.y));}
    private zoom(next:number,anchor:Point={x:0,y:this.by}){if(this.modal||this.busy)return;const old=this.scale;this.scale=Math.max(this.fit,Math.min(this.fit*6,next));const ratio=this.scale/old;this.pan={x:anchor.x-(anchor.x-this.pan.x)*ratio,y:anchor.y-this.by-(anchor.y-this.by-this.pan.y)*ratio};this.transform();}
    private pos(p:Point):Point{return{x:(p.x-(this.session.level.width-1)/2)*this.pitch,y:(p.y-(this.session.level.height-1)/2)*this.pitch};}
    private renderArrow(a:Arrow,color:string,offset=0,shake=0){
        const g=this.drawing,dir=direction(a),last=a.points[a.points.length-1];let pts=a.points.map(p=>({...p}));
        if(offset>0){pts.push({x:last.x+dir.x*offset,y:last.y+dir.y*offset});let distance=offset;while(pts.length>1){const len=Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y);if(distance>=len){distance-=len;pts.shift();}else{pts[0]={x:pts[0].x+(pts[1].x-pts[0].x)*distance/len,y:pts[0].y+(pts[1].y-pts[0].y)*distance/len};break;}}}
        if(pts.length<2)return;
        const pixel=pts.map(p=>this.pos(p));g.lineJoin=Graphics.LineJoin.ROUND;g.lineCap=Graphics.LineCap.ROUND;
        g.strokeColor=C(color);g.fillColor=C(color);g.lineWidth=LINE_WIDTH*this.pitch*VISUAL_LINE_GAIN;g.moveTo(pixel[0].x+shake,pixel[0].y);for(let i=1;i<pixel.length;i++)g.lineTo(pixel[i].x+shake,pixel[i].y);g.stroke();
        const h=pixel[pixel.length-1],length=HEAD_LENGTH*this.pitch*VISUAL_HEAD_GAIN,width=HEAD_WIDTH/2*this.pitch*VISUAL_HEAD_GAIN;
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
    private updateHUD(){this.drawHearts();if(this.progressFill){const g=this.progressFill;g.clear();const f=this.session.removed.size/Math.max(1,this.session.level.arrows.length);if(f>0){g.fillColor=C(BLUE);g.roundRect(0,-6,Math.max(12,238*f),12,6);g.fill();}}this.progress.string=`${Math.floor(this.session.removed.size/Math.max(1,this.session.level.arrows.length)*100)}%`;}
    private save(){this.saved.sound=this.sound;this.saved.music=this.music;this.saved.updatedAt=Date.now();if(this.session){this.saved.index=this.index;this.saved.attempts=this.saved.attempts||{};this.saved.attempts[this.session.level.id]=this.session.snapshot();if(this.session.status==='won'){this.saved.wins=this.saved.wins||{};this.saved.wins[this.index]=true;let n=this.nextLevel();while(this.saved.wins[n])n++;this.saved.completed=n;reportBestLevel(n);}}try{sys.localStorage.setItem(STORAGE_KEY,JSON.stringify(this.saved));}catch{this.message('本次进度暂时无法保存');}this.flushCloudProgress();}
    private saveLocalOnly(){this.saved.sound=this.sound;this.saved.music=this.music;this.saved.updatedAt=Date.now();try{sys.localStorage.setItem(STORAGE_KEY,JSON.stringify(this.saved));}catch{this.message('本次进度暂时无法保存');}}
    private syncCloudProgress(){if(!this.cloudEnabled)return;(async()=>{try{const cloud=await loadCloudProgress();const merged=mergeProgress(this.saved,cloud);this.saved=merged;this.sound=merged.sound!==false;this.music=merged.music!==false;this.playMusic();this.saveLocalOnly();reportBestLevel(this.nextLevel());if(merged.pendingCloudSync)await this.flushCloudProgress();if(this.screen==='home')this.showHome();}catch{this.saved.pendingCloudSync=true;this.saveLocalOnly();}})();}
    private async flushCloudProgress(){if(!this.cloudEnabled||this.cloudSyncing)return;this.cloudSyncing=true;try{await saveCloudProgress(this.saved);this.saved.pendingCloudSync=false;this.saveLocalOnly();}catch{this.saved.pendingCloudSync=true;this.saveLocalOnly();}finally{this.cloudSyncing=false;}}
    private playMusic(){if(!this.bgmAudio||!this.bgm)return;if(this.music){if(!this.bgmAudio.playing){this.bgmAudio.clip=this.bgm;this.bgmAudio.play();}}else this.bgmAudio.stop();}
    private toggleSound(){this.sound=!this.sound;this.save();}
    private toggleMusic(){this.music=!this.music;this.playMusic();this.save();}
    private message(s:string){this.toast=s;this.toastTime=3;if(this.toastLabel)this.toastLabel.string=s;}
    private useHint(){if(this.busy||this.session.status!=='playing')return;if(this.session.hintUsed){this.message('本局提示已使用，试着放大观察');return;}const a=this.session.level.arrows.find(a=>canExit(a,this.session.level,this.session.removed));if(!a){this.message('关卡状态异常，请重新挑战');return;}this.session.hintUsed=true;this.hint=a.id;this.save();this.draw();this.message('光圈里的箭头，可以自由离开');}
    private async claimAdHeart(){
        if(this.adClaimPending)return;
        if(!this.session||!canClaimAdReward(this.saved,this.session.level.id)){this.showModal('lost');return;}
        if(!this.rewardedAdEnabled){this.showModal('lost');this.text(this.overlay,'广告暂时不可用，请稍后再试',0,-355*Math.min(1,(this.height-160)/860),18,'#896A48',470);return;}
        const session=this.session,attemptId=session.attemptId;
        this.adClaimPending=true;
        let result;
        try{result=await showRewardedAd();}catch{result='error';}finally{this.adClaimPending=false;}
        // Loading is asynchronous: the player may have left or restarted this round.
        if(this.session!==session||session.attemptId!==attemptId||this.screen!=='game'||this.modal!=='lost'||session.status!=='lost')return;
        if(result==='busy')return;
        if(result==='rewarded'){
            if(!canClaimAdReward(this.saved,session.level.id)){this.showModal('lost');return;}
            this.session.addHeart(3);this.saved=markAdReward(this.saved,this.session.level.id);this.save();this.closeModal();this.updateHUD();this.draw();this.message('爱心 +1，继续慢慢解开');
        }else{
            this.showModal('lost');this.text(this.overlay,result==='closed'?'完整看完广告才会获得爱心':'广告暂时加载失败，请稍后再试',0,-355*Math.min(1,(this.height-160)/860),18,'#896A48',470);
        }
    }
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
    private startTouch(e:EventTouch){const p=this.point(e),id=e.getID();this.gesture.start(id,p);
        if(this.gesture.points.size>1){this.activeButton=null;return;}
        this.activeButton=[...this.buttons].reverse().find(b=>Math.abs(p.x-b.x)<b.w/2&&Math.abs(p.y-b.y)<b.h/2)||null;
        this.sliding=this.screen==='game'&&!this.modal&&!this.busy&&!this.activeButton&&Math.abs(p.x)<116&&Math.abs(p.y-this.zoomY)<24;
        if(this.sliding){this.zoom(this.fit*(1+5*Math.max(0,Math.min(1,(p.x+100)/200))));return;}
        if(this.modal==='levels')return;
        if(!this.activeButton&&!this.inside(p))this.gesture.cancelled=true;
    }
    private moveTouch(e:EventTouch){if(this.modal==='levels'){const p=this.point(e),old=this.gesture.points.get(e.getID());if(!old)return;this.gesture.move(e.getID(),p);if(this.gesture.cancelled){this.activeButton=null;this.routeOffset=clampRoute(this.routeOffset-(p.y-old.y),this.nextLevel());this.renderRoute();}return;}if(!this.session)return;const id=e.getID(),p=this.point(e),old=this.gesture.points.get(id);if(!old)return;
        const before=Array.from(this.gesture.points.values());this.gesture.move(id,p);if(this.screen!=='game'||this.modal||this.busy||this.activeButton)return;
        if(this.sliding){this.zoom(this.fit*(1+5*Math.max(0,Math.min(1,(p.x+100)/200))));return;}
        const after=Array.from(this.gesture.points.values());if(after.length===2){const dist=(ps:Point[])=>Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y);const mid=(ps:Point[])=>({x:(ps[0].x+ps[1].x)/2,y:(ps[0].y+ps[1].y)/2});const b=mid(before),a=mid(after);if(dist(before)>5){this.zoom(this.scale*dist(after)/dist(before),b);this.pan.x+=a.x-b.x;this.pan.y+=a.y-b.y;this.transform();}}
        else if(after.length===1&&this.gesture.cancelled&&this.scale>this.fit*1.01){this.pan.x+=p.x-old.x;this.pan.y+=p.y-old.y;this.transform();}
    }
    private endTouch(e:EventTouch){const p=this.point(e),click=this.gesture.end(e.getID()),button=this.activeButton,sliding=this.sliding;if(!this.gesture.points.size){this.activeButton=null;this.sliding=false;}if(!click||sliding)return;if(button){if(Math.abs(p.x-button.x)<button.w/2&&Math.abs(p.y-button.y)<button.h/2)button.run();}else if(this.screen==='game'&&this.session&&this.inside(p))this.tap(p);}
    private cancelTouch(){this.gesture.clear();this.activeButton=null;this.sliding=false;}
    private wheel(e:EventMouse){if(this.modal==='levels'){this.routeOffset=clampRoute(this.routeOffset+e.getScrollY()*.5,this.nextLevel());this.renderRoute();return;}if(!this.session||this.screen!=='game')return;const p=this.point(e);if(this.inside(p)){this.zoom(this.scale*Math.exp(e.getScrollY()*0.0015),p);}}
    private closeModal(){this.modal='';this.overlay.active=false;if(this.screen==='home'){this.showHome();return;}this.buildUI();this.transform();this.draw();this.updateHUD();}
    private showRankFallback(message='好友数据读取中…'){
        const completed=this.nextLevel();
        this.text(this.overlay,'排行榜',0,230,36,INK).isBold=true;
        this.panel(this.overlay,0,116,560,56,'#E8EACF',18);
        this.text(this.overlay,'排名',-208,116,24,MUTED,90).isBold=true;
        this.text(this.overlay,'玩家',-10,116,24,MUTED,160).isBold=true;
        this.text(this.overlay,'关卡',210,116,24,MUTED,90).isBold=true;
        this.panel(this.overlay,0,34,560,68,'#FFF3D6',18);
        this.text(this.overlay,'1',-208,34,26,'#EF967B',90).isBold=true;
        this.text(this.overlay,'我',65,34,24,INK,100);
        const head=this.make('HomeAvatarHead',this.overlay,18,18);head.setPosition(-10,42);head.addComponent(Graphics).circle(0,0,9);head.getComponent(Graphics)!.fillColor=new Color(170,186,194,255);head.getComponent(Graphics)!.fill();
        const body=this.make('HomeAvatarBody',this.overlay,40,22);body.setPosition(-10,20);const bg=body.addComponent(Graphics);bg.fillColor=new Color(170,186,194,255);bg.roundRect(-20,-8,40,22,11);bg.fill();
        this.text(this.overlay,String(completed),210,34,27,'#EF967B',100).isBold=true;
        this.text(this.overlay,message,0,-58,22,MUTED,480);
    }
    private showRankCanvas(){
        // SubContextView uses a runtime-readonly 640x960 design size.
        // Match it before drawing, then map the entire canvas onto the frame.
        const width=640,height=960;
        const node=this.make('RankCanvas',this.overlay,width,height);node.setPosition(0,-22);
        node.setScale(676/width,845/height,1);
        const rank=node.addComponent(SubContextView);this.rankView=rank;this.rankTime=0;rank.fps=30;
        const ok=requestFriendRank(width,height,this.nextLevel());
        if(!ok){node.destroy();this.rankView=null;this.showRankFallback('当前不是微信环境，先展示本机进度');return;}
        rank.update();
    }

    private showRoute(){
        this.routeOffset=this.nextLevel()*ROUTE_STEP;
        this.routeTiles.clear();
        const top=this.height/2;
        this.routeHeight=this.height-360;
        const clip=this.make('Mountain route viewport',this.overlay,720,this.height+50);clip.setPosition(0,-25);clip.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
        this.routeWorld=this.make('Scrolling mountain',clip,720,this.height);
        this.routeScenery=this.make('Painted scenery',this.routeWorld,720,this.height);
        this.routeLayer=this.make('Visible level nodes',this.routeWorld,720,this.height);
        this.panel(this.overlay,0,top-110,386,86,'#A77943',22);this.panel(this.overlay,0,top-104,386,82,'#F4D7A3',22);
        this.text(this.overlay,'关卡路线',0,top-104,38,'#603618',360).isBold=true;
        this.panel(this.overlay,0,top-173,250,42,'#FFF3D9',18);this.text(this.overlay,`已通关${this.nextLevel()}关`,0,top-173,23,'#603618',240);
        this.button(this.overlay,'‹',-290,top-103,64,()=>this.closeModal(),false,64);
        this.button(this.overlay,'⌖ 回到当前关',0,-top+97,280,()=>{this.routeOffset=this.nextLevel()*ROUTE_STEP;this.renderRoute();},false,56);
        this.panel(this.overlay,0,-top+41,340,32,'#FFF3D9',16);this.text(this.overlay,'上下滑动，继续探索',0,-top+41,19,'#603618',330);
        this.routeButtons=this.buttons.slice();this.renderRoute();
    }
    private renderRoute(){
        if(!this.routeLayer)return;this.routeLayer.removeAllChildren();this.buttons=this.routeButtons.slice();
        const completed=this.nextLevel(),visible=visibleRoute(this.routeOffset,this.routeHeight,completed);
        this.routeWorld!.setPosition(0,-this.routeOffset);
        const firstTile=Math.floor((this.routeOffset-this.height/2+90)/ROUTE_TILE_HEIGHT),lastTile=Math.floor((this.routeOffset+this.height/2+90)/ROUTE_TILE_HEIGHT);
        for(const [key,node] of this.routeTiles)if(key<firstTile||key>lastTile){node.destroy();this.routeTiles.delete(key);}
        for(let tile=firstTile;tile<=lastTile;tile++)if(!this.routeTiles.has(tile))this.routeTiles.set(tile,this.artwork(this.routeScenery!,'mountain',0,tile*ROUTE_TILE_HEIGHT+ROUTE_TILE_CENTER,720,ROUTE_TILE_HEIGHT,true));
        for(const i of visible){const x=routeX(i),y=i*ROUTE_STEP;if(Math.abs(y-this.routeOffset)>this.routeHeight/2-45)continue;
            const current=i===completed,done=i<completed,fill=current?'#F1BE54':done?'#789C51':'#D8D4C4';
            this.panel(this.routeLayer,x,y-4,78,78,'#86613D',39);this.panel(this.routeLayer,x,y,76,76,'#FFF1CA',38);this.panel(this.routeLayer,x,y,64,64,fill,32);
            this.text(this.routeLayer,String(i+1),x,y+(done?-1:0),26,done?'#FFFFFF':'#55452B',66).isBold=true;
            if(done)this.text(this.routeLayer,'✓',x+27,y-26,22,'#FFF7DA',32);
            if(i>completed){const lock=this.make('Locked',this.routeLayer,20,20).addComponent(Graphics);lock.node.setPosition(x+26,y-26);lock.fillColor=C('#796F5A');lock.roundRect(-7,-7,14,12,3);lock.fill();lock.strokeColor=C('#796F5A');lock.lineWidth=3;lock.arc(0,5,5,0,Math.PI);lock.stroke();}
            if(current){const side=x>30?-1:1;
                const cat=this.make('Route companion',this.routeLayer,60,60).addComponent(Graphics);cat.node.setPosition(x+side*100,y+57);cat.fillColor=C('#FFF3D7');cat.moveTo(-23,3);cat.lineTo(-25,28);cat.lineTo(-7,16);cat.lineTo(8,16);cat.lineTo(25,28);cat.lineTo(23,3);cat.close();cat.fill();cat.ellipse(0,0,25,20);cat.fill();cat.fillColor=C('#DE9955');cat.ellipse(-13,7,10,12);cat.fill();cat.strokeColor=C('#60472F');cat.lineWidth=2;cat.moveTo(-14,1);cat.lineTo(-7,-1);cat.moveTo(7,-1);cat.lineTo(14,1);cat.stroke();cat.fillColor=C('#78934B');cat.roundRect(-24,-21,48,9,4);cat.fill();
                this.panel(this.routeLayer,x+side*124,y,156,40,'#FFF0C8',14);this.text(this.routeLayer,'从这里出发',x+side*124,y,20,'#664723',150);}
            if(i<=completed)this.buttons.push({x,y:y-this.routeOffset-25,w:84,h:84,run:()=>this.openLevel(i)});
        }
    }
    private showVictory(){
        const panel=this.make('Victory composition',this.overlay,640,820);const k=Math.min(1,(this.height-160)/820);panel.setScale(k,k,1);
        this.artwork(panel,'victory',0,0,640,820,true);
        this.text(panel,'顺利通关',0,166,46,'#603618',510).isBold=true;
        this.text(panel,`第${this.index+1}关已完成`,0,85,26,'#603618',440).isBold=true;
        // Reconstruct this level's colored silhouette rather than showing an unrelated reward.
        const art=this.make('Completed pattern',panel,300,200).addComponent(Graphics);art.node.setPosition(0,-22);
        const level=this.session.level,unit=Math.min(240/level.width,165/level.height),cells=new Set<string>();
        for(const arrow of level.arrows){art.fillColor=C(this.arrowColor(arrow));for(let j=1;j<arrow.points.length;j++){const a=arrow.points[j-1],b=arrow.points[j],len=Math.abs(b.x-a.x)+Math.abs(b.y-a.y);for(let t=0;t<=len;t++){const x=a.x+Math.sign(b.x-a.x)*t,y=a.y+Math.sign(b.y-a.y)*t,key=x+','+y;if(cells.has(key))continue;cells.add(key);art.circle((x-(level.width-1)/2)*unit,(y-(level.height-1)/2)*unit,unit*.65);art.fill();}}}
        this.text(panel,'又解开了一点美好',0,-140,23,'#735333',420);
        this.text(panel,'下一关',0,-250,35,'#603618',400).isBold=true;this.text(panel,`第${this.index+2}关`,0,-286,22,'#603618',260);
        this.text(panel,'返回主页',0,-351,26,'#603618',300).isBold=true;
        this.buttons.push({x:0,y:-265*k,w:410*k,h:85*k,run:()=>this.openLevel(this.index+1,true)});
        this.buttons.push({x:0,y:-352*k,w:280*k,h:62*k,run:()=>this.showHome()});this.play(2);
    }
    private forestDialog(kind:'lost'|'settings'){
        const k=Math.min(1,(this.height-160)/860),panel=this.make('Forest dialog',this.overlay,640,860);
        panel.setScale(k,k,1);this.artwork(panel,'forest-dialog',0,0,640,860,true);
        const ink='#603618';
        this.text(panel,kind==='lost'?'慢慢来，再试一次':'设置',0,172,kind==='lost'?34:44,ink,440).isBold=true;
        // All hit areas use the same scale as the illustrated composition.
        const hit=(x:number,y:number,w:number,h:number,run:()=>void)=>this.buttons.push({x:x*k,y:y*k,w:w*k,h:h*k,run});
        const wood=(label:string,x:number,y:number,w:number,h:number,run:()=>void,primary=false)=>{
            this.panel(panel,x,y-5,w,h,'#906039',18);this.panel(panel,x,y,w,h,primary?'#E8B55F':'#F3D49B',18);
            const g=this.make('Wood grain',panel,w,h).addComponent(Graphics);g.node.setPosition(x,y);
            g.lineWidth=2;g.strokeColor=C('#FFF0C680');g.roundRect(-w/2+5,-h/2+5,w-10,h-10,14);g.stroke();
            g.strokeColor=C('#B8823830');g.lineWidth=1;
            for(const yy of [-h/2+13,h/2-13]){g.moveTo(-w/2+18,yy);g.bezierCurveTo(-w/4,yy+3,w/4,yy-3,w/2-18,yy);g.stroke();}
            this.text(panel,label,x,y,primary?29:25,ink,w-22).isBold=true;hit(x,y,w,h,run);
        };
        if(kind==='settings'){
            const row=(label:string,on:boolean,y:number,run:()=>void)=>{
                this.panel(panel,0,y-3,470,94,'#C7AB7F',18);this.panel(panel,0,y,470,94,'#F9EBCF',18);
                const l=this.text(panel,label,-57,y,29,ink,170);l.horizontalAlign=Label.HorizontalAlign.LEFT;l.isBold=true;
                const icon=this.make('Audio icon',panel,42,42).addComponent(Graphics);icon.node.setPosition(-190,y);icon.fillColor=C(ink);icon.strokeColor=C(ink);icon.lineWidth=3;
                if(label==='音效'){icon.moveTo(-18,-8);icon.lineTo(-9,-8);icon.lineTo(3,-18);icon.lineTo(3,18);icon.lineTo(-9,8);icon.lineTo(-18,8);icon.close();icon.fill();icon.moveTo(10,-12);icon.bezierCurveTo(22,-6,22,6,10,12);icon.stroke();}
                else{icon.moveTo(-8,-9);icon.lineTo(-8,15);icon.lineTo(15,20);icon.lineTo(15,-4);icon.stroke();icon.ellipse(-14,-11,8,6);icon.fill();icon.ellipse(9,-6,8,6);icon.fill();}
                const g=this.make('Forest switch',panel,108,56).addComponent(Graphics);g.node.setPosition(160,y);
                g.fillColor=C(on?'#718A43':'#AAA28D');g.roundRect(-52,-26,104,52,26);g.fill();g.lineWidth=2;g.strokeColor=C(on?'#455C29':'#7F7562');g.stroke();
                g.fillColor=C('#FFF1D2');g.circle(on?25:-25,0,21);g.fill();g.strokeColor=C('#CBB48B');g.stroke();
                hit(0,y,470,94,run);
            };
            row('音效',this.sound,25,()=>{this.toggleSound();this.showModal('settings');});
            row('背景音乐',this.music,-100,()=>{this.toggleMusic();this.showModal('settings');});
            wood('返回主页',0,-267,380,76,()=>this.showHome(),true);
            this.panel(panel,266,180,58,58,'#718345',29);this.text(panel,'×',266,180,42,'#FFF8E4',54).isBold=true;
            hit(266,180,68,68,()=>this.closeModal());
        }else{
            const g=this.make('Empty hearts',panel,240,64).addComponent(Graphics);g.node.setPosition(0,62);
            for(const x of [-70,0,70]){g.fillColor=C('#E8D6B2');g.strokeColor=C('#B18C60');g.lineWidth=3;g.moveTo(x,-25);g.bezierCurveTo(x-46,3,x-21,43,x,22);g.bezierCurveTo(x+21,43,x+46,3,x,-25);g.close();g.fill();g.stroke();}
            this.text(panel,'爱心用完啦',0,-9,28,ink,440).isBold=true;
            this.text(panel,'补充一颗爱心，继续挑战',0,-51,23,ink,470);
            const eligible=canClaimAdReward(this.saved,this.session.level.id);
            if(eligible){wood('▶  看广告，爱心 +1',0,-133,470,78,()=>this.claimAdHeart(),true);this.text(panel,'保留本局进度，继续游戏',0,-193,20,ink,460);}
            else this.text(panel,'本关爱心补充已用完，再试一次吧',0,-143,22,ink,480);
            wood('再试一次',-125,-266,224,66,()=>this.openLevel(this.index,true));
            wood('返回主页',125,-266,224,66,()=>this.showHome());
            this.text(panel,'重新开始本关',-125,-314,18,'#896A48',220);
        }
    }
    private showModal(kind:string){
        if(this.busy)return;this.modal=kind;this.rankView=null;this.gesture.clear();this.activeButton=null;this.buttons=[];this.overlay.removeAllChildren();this.overlay.active=true;
        this.panel(this.overlay,0,0,740,this.height+20,['rank','won','settings','lost'].includes(kind)?'#27303ACC':PAPER,0);
        if(kind==='levels'){this.showRoute();return;}
        if(kind==='won'){this.showVictory();return;}
        if(kind==='settings'||kind==='lost'){this.forestDialog(kind);return;}
        if(kind==='rank'){
            this.artwork(this.overlay,'forest-rank',0,-22,676,845,true);
        }else{
            this.panel(this.overlay,0,10,610,650,'#FFFFFF',38);
            this.text(this.overlay,kind==='won'?'✦':'···',0,238,46,BLUE);
            const titles:any={settings:'设置',pause:'休息一小会儿',levels:'关卡路线',rank:'好友排行榜',won:'又解开了一点美好',lost:'慢慢来，再试一次',restart:'重新铺开这幅图案？'};
            this.text(this.overlay,titles[kind],0,156,32,INK);
        }
        if(kind==='rank'){
            this.showRankCanvas();
            this.panel(this.overlay,279,259,58,58,'#718345',29);
            this.text(this.overlay,'×',279,259,42,'#FFFFFF',52).isBold=true;
            this.buttons.push({x:279,y:259,w:70,h:70,run:()=>this.closeModal()});
        }else if(kind==='pause'){
            this.text(this.overlay,'缩放和拖动都不会扣心',0,96,21,MUTED);
            this.button(this.overlay,'继续解开',0,18,400,()=>this.closeModal(),true);
            this.button(this.overlay,'重新挑战',0,-67,400,()=>this.showModal('restart'));
            this.switchRow(this.overlay,'音效',this.sound,0,-152,400,()=>{this.toggleSound();this.showModal('pause');});
            this.switchRow(this.overlay,'背景音乐',this.music,0,-224,400,()=>{this.toggleMusic();this.showModal('pause');});
        }else if(kind==='restart'){
            this.text(this.overlay,'本局进度会清空，恢复三颗心',0,77,22,MUTED);
            this.button(this.overlay,'重新开始',0,-20,400,()=>this.openLevel(this.index,true),true);
            this.button(this.overlay,'继续当前挑战',0,-110,400,()=>this.closeModal());
        }else{
            this.text(this.overlay,kind==='won'?'让颜色散去，给自己留一点轻松':'放大看看，下次会更从容',0,77,22,MUTED);
            this.button(this.overlay,kind==='won'?'下一幅风景':'再试一次',0,-20,400,()=>this.openLevel(kind==='won'?this.index+1:this.index,true),true);
            this.button(this.overlay,'返回主页',0,-110,400,()=>this.showHome());
            if(kind==='won')this.play(2);
        }
    }
    update(dt:number){
        if(this.modal==='rank'&&this.rankView){this.rankTime+=dt;if(this.rankTime>0.25){this.rankTime=0;this.rankView.update();}}
        if(this.generationForeground&&this.generation&&this.loadingCat){this.loadingTime+=dt;const t=this.loadingTime;this.loadingCat.angle=Math.sin(t*2.4)*9;this.loadingCat.setPosition(Math.sin(t*1.2)*12,60+Math.sin(t*2.4)*7);const s=1+Math.sin(t*2.4)*.018;this.loadingCat.setScale(s,s,1);}
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
                        if(foreground){this.loadingLabel=null;this.loadingCat=null;this.openLevel(i,this.generationReset);}
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
        if(this.screen==='home'||!this.session||this.generationForeground&&this.generation)return;
        if(this.leaving){this.leaving.time+=dt;if(this.leaving.time>=0.55){this.leaving=null;this.busy=false;if(this.session.status==='won')this.showModal('won');}this.draw();}
        if(this.wrong){this.wrong.time+=dt;if(this.wrong.time>=0.72){const lost=this.wrong.lost;this.wrong=null;this.busy=false;if(lost)this.showModal('lost');}this.draw();}
        if(this.shakeTime>0){this.shakeTime=Math.max(0,this.shakeTime-dt);this.draw();}
        if(this.toastTime>0){this.toastTime-=dt;if(this.toastTime<=0)this.toastLabel.string='';}
    }
}
