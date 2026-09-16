const KEY = 'level';
const canvas = sharedCanvas;
const ctx = canvas.getContext('2d');
const imageCache = Object.create(null);
let lastRows = [];
let lastCompleted = 0;
let selfProfile=null;let requestVersion=0;

function clear(){ctx.clearRect(0,0,canvas.width,canvas.height);}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function fillRound(x,y,w,h,r,c){ctx.fillStyle=c;roundRect(x,y,w,h,r);ctx.fill();}
function strokeRound(x,y,w,h,r,c,l=4){ctx.strokeStyle=c;ctx.lineWidth=l;roundRect(x,y,w,h,r);ctx.stroke();}
function valueOf(item){const kv=(item.KVDataList||[]).find(v=>v.key===KEY);const n=Number(kv&&kv.value);return Number.isFinite(n)?Math.max(0,Math.floor(n)):0;}
function nameOf(item){return item.nickname || (item.isSelfFallback?'我':'微信好友');}
function selfRow(completed){return {...(selfProfile||{}),nickname:selfProfile&&(selfProfile.nickName||selfProfile.nickname)||'我',isSelfFallback:true,KVDataList:[{key:KEY,value:String(Math.max(0,Number(completed)||0))}]};}
function ellipsis(text,max){text=String(text||'');return text.length>max?text.slice(0,max)+'…':text;}
function drawTrophy(cx,cy){ctx.save();ctx.lineJoin='round';ctx.lineCap='round';ctx.shadowColor='rgba(220,150,24,.28)';ctx.shadowBlur=12;ctx.shadowOffsetY=5;ctx.strokeStyle='#FFFFFF';ctx.lineWidth=9;ctx.fillStyle='#FFC52F';roundRect(cx-48,cy-30,96,58,17);ctx.fill();ctx.stroke();ctx.strokeStyle='#FFB12A';ctx.lineWidth=11;ctx.beginPath();ctx.moveTo(cx-47,cy-12);ctx.bezierCurveTo(cx-78,cy-18,cx-78,cy+24,cx-45,cy+15);ctx.stroke();ctx.beginPath();ctx.moveTo(cx+47,cy-12);ctx.bezierCurveTo(cx+78,cy-18,cx+78,cy+24,cx+45,cy+15);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#F2AC26';roundRect(cx-11,cy+28,22,31,7);ctx.fill();roundRect(cx-41,cy+55,82,16,8);ctx.fill();ctx.fillStyle='#FFE999';ctx.font='bold 31px sans-serif';ctx.textAlign='center';ctx.fillText('★',cx,cy+9);ctx.restore();}
// Cubic curves work on the legacy WeChat sharedCanvas; ellipse is unavailable there.
function leaf(x,y,flip=1){ctx.save();ctx.translate(x,y);ctx.scale(flip,1);ctx.fillStyle='#8A9C58';ctx.beginPath();ctx.moveTo(-18,8);ctx.bezierCurveTo(-16,-10,8,-18,18,-8);ctx.bezierCurveTo(13,7,-6,15,-18,8);ctx.fill();ctx.fillStyle='#B7BE78';ctx.beginPath();ctx.moveTo(10,-15);ctx.bezierCurveTo(17,-25,34,-18,34,-7);ctx.bezierCurveTo(24,-3,14,-7,10,-15);ctx.fill();ctx.restore();}
function drawHeader(){ctx.fillStyle='#603618';ctx.font='bold 44px sans-serif';ctx.textAlign='center';ctx.fillText('排行榜',355,212);}
const TABLE={left:72,width:496,rank:116,avatar:204,name:246,score:500,headerY:296,rowY:322,rowHeight:82,rowStep:88};
function drawShell(){clear();drawHeader();ctx.fillStyle='#594D38';ctx.font='bold 25px sans-serif';ctx.textAlign='center';ctx.fillText('排名',TABLE.rank,TABLE.headerY);ctx.textAlign='left';ctx.fillText('玩家',TABLE.name,TABLE.headerY);ctx.textAlign='center';ctx.fillText('关卡',TABLE.score,TABLE.headerY);}
function requestAvatar(url){if(!url||imageCache[url])return;const img=wx.createImage();imageCache[url]=img;img.onload=()=>drawList(lastRows,lastCompleted);img.onerror=()=>{};img.src=url;}
function drawDefaultAvatar(x,y,item){ctx.save();ctx.beginPath();ctx.arc(x,y,26,0,Math.PI*2);ctx.fillStyle='#EDF1F3';ctx.fill();ctx.strokeStyle='#D4DEE3';ctx.lineWidth=3;ctx.stroke();ctx.beginPath();ctx.arc(x,y,25,0,Math.PI*2);ctx.clip();ctx.beginPath();ctx.arc(x,y-8,8,0,Math.PI*2);ctx.fillStyle='#AEBBC2';ctx.fill();ctx.beginPath();ctx.arc(x,y+22,20,Math.PI*1.1,Math.PI*1.9);ctx.lineTo(x+18,y+25);ctx.lineTo(x-18,y+25);ctx.closePath();ctx.fillStyle='#AEBBC2';ctx.fill();ctx.restore();}
function drawAvatar(item,x,y){const url=item.avatarUrl;if(url){requestAvatar(url);const img=imageCache[url];if(img&&img.width){ctx.save();ctx.beginPath();ctx.arc(x,y,26,0,Math.PI*2);ctx.clip();ctx.drawImage(img,x-26,y-26,52,52);ctx.restore();ctx.beginPath();ctx.arc(x,y,27,0,Math.PI*2);ctx.strokeStyle='#FFD65C';ctx.lineWidth=3;ctx.stroke();return;}}drawDefaultAvatar(x,y,item);}
function rowColors(item,i){if(item.isSelfFallback)return ['#E3EBCB','#405B35','#CBDCA7'];if(i===0)return ['#F5D995','#795728','#E9C576'];if(i===1)return ['#E8EDD9','#52674B','#D5DFC3'];if(i===2)return ['#F4DFCA','#895B3D','#E7C7AA'];return ['#F7EEDC','#6F6247','#EBDFC7'];}
function drawRow(item,rankIndex,displayIndex){const y=TABLE.rowY+displayIndex*TABLE.rowStep,cy=y+TABLE.rowHeight/2;fillRound(TABLE.left,y,TABLE.width,TABLE.rowHeight,16,(item.isSelf||item.isSelfFallback)?'#D3E3C9':displayIndex%2?'#F7E6CD':'#FCF0DC');if(rankIndex<3){ctx.beginPath();ctx.arc(TABLE.rank,cy,19,0,Math.PI*2);ctx.fillStyle=['#F4CE69','#CDDDE0','#E8B386'][rankIndex];ctx.fill();}ctx.fillStyle='#473E30';ctx.font='bold 26px sans-serif';ctx.textAlign='center';ctx.fillText(String(rankIndex+1),TABLE.rank,cy+9);drawAvatar(item,TABLE.avatar,cy);ctx.fillStyle='#473E30';ctx.font='bold 25px sans-serif';ctx.textAlign='left';ctx.fillText(ellipsis(nameOf(item),7),TABLE.name,cy+9);ctx.textAlign='center';ctx.fillText(String(valueOf(item)),TABLE.score,cy+9);}
function userId(item){const id=item&&(item.openid||item.openId)||'';return id==='selfOpenId'?'':id;}
function avatarKey(url){return String(url||'').replace(/(qlogo\.cn\/[^?]+)\/(0|46|64|96|100|132)(?:\?.*)?$/, '$1');}
function mergeRankRows(list,completed,profile){
 const rows=[],seen=new Set();
 for(const item of list||[]){const id=userId(item);if(id&&seen.has(id))continue;if(id)seen.add(id);rows.push({...item});}
 let index=-1;const id=userId(profile);
 if(id)index=rows.findIndex(item=>userId(item)===id);
 // Older runtimes may omit self openid: require both nickname AND avatar,
 // and exactly one match. Equal scores/nicknames alone never identify a user.
 if(index<0&&profile&&profile.avatarUrl&&(profile.nickName||profile.nickname)){
  const matches=rows.map((item,i)=>({item,i})).filter(({item})=>(!id||!userId(item))&&avatarKey(item.avatarUrl)===avatarKey(profile.avatarUrl)&&item.nickname===(profile.nickName||profile.nickname));
  if(matches.length===1)index=matches[0].i;
 }
 if(index>=0){const item=rows[index];item.isSelf=true;item.KVDataList=[{key:KEY,value:String(Math.max(completed,valueOf(item)))}];}

 else if(!rows.length){rows.push({...selfRow(completed),...(profile||{}),nickname:profile&&(profile.nickName||profile.nickname)||'我',isSelf:true});}
 rows.sort((a,b)=>valueOf(b)-valueOf(a));return rows;
}
function drawList(list,completed){lastRows=list||[];lastCompleted=completed;drawShell();const all=mergeRankRows(list,completed,selfProfile);all.slice(0,6).forEach((item,i)=>drawRow(item,i,i));if(!list||!list.length){ctx.fillStyle='#8BA080';ctx.font='20px sans-serif';ctx.textAlign='center';ctx.fillText('暂无好友数据，先展示你的进度',canvas.width/2,TABLE.rowY+TABLE.rowHeight+52);}}
function drawLoading(completed){drawShell();ctx.fillStyle='#8BA080';ctx.font='bold 24px sans-serif';ctx.textAlign='center';ctx.fillText('正在读取好友数据…',canvas.width/2,TABLE.rowY+TABLE.rowHeight+52);drawRow(selfRow(completed),0,0);}
function drawError(completed){drawShell();ctx.fillStyle='#8BA080';ctx.font='bold 24px sans-serif';ctx.textAlign='center';ctx.fillText('排行榜暂时不可用，先展示你的进度',canvas.width/2,TABLE.rowY+TABLE.rowHeight+52);drawRow(selfRow(completed),0,0);}
wx.onMessage(message=>{
 if(!message||message.type!=='showRank')return;
 const version=++requestVersion;canvas.width=message.width||640;canvas.height=message.height||960;
 const completed=Math.max(0,Number(message.completed)||0);selfProfile=null;lastRows=[];lastCompleted=completed;drawLoading(completed);
 let friends=null,failed=false,profileReady=false;
 const finish=()=>{if(version!==requestVersion||!profileReady||friends===null)return;if(failed)drawError(completed);else drawList(friends,completed);};
 const profileDone=profile=>{if(version!==requestVersion||profileReady)return;selfProfile=profile;profileReady=true;finish();};
 if(typeof wx.getUserInfo==='function'){
  try{wx.getUserInfo({openIdList:['selfOpenId'],success:res=>profileDone((res.data||res.userInfoList||[])[0]||res.userInfo||null),fail:()=>profileDone(null)});}catch{profileDone(null);}
  if(typeof setTimeout==='function')setTimeout(()=>profileDone(null),3000);
 }else profileDone(null);
 wx.getFriendCloudStorage({keyList:[KEY],success:res=>{if(version!==requestVersion)return;friends=res.data||[];finish();},fail:()=>{if(version!==requestVersion)return;friends=[];failed=true;finish();}});
});
