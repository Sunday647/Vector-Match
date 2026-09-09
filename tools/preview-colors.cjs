// Design-only comparison; does not mutate game assets.
const fs = require('fs');
const level = require('../assets/resources/levels/dog.json');
const palettes = [
  { title: 'A · 奶杏与蜜桃', note: '温暖 · 接近参考图的暖色关系', colors: ['#E9AF4B','#F4C96B','#F29B75','#E891AA'] },
  { title: 'B · 蜜桃与柔紫', note: '柔甜 · 花瓣与莓果的感觉', colors: ['#E994A5','#F1B4B3','#EEAB7D','#AD93D4'] },
  { title: 'C · 薄荷与奶杏', note: '清新 · 绿意中带一点暖阳', colors: ['#62B89C','#99CFB2','#E9B45F','#EB9CA6'] },
];
const roles = level.arrows.map(a => {
  const p = a.points[Math.floor(a.points.length / 2)];
  // The same spatial regions in each candidate: small upper/right accents,
  // a warm transition near the bottom, and two neighboring body tones.
  if (p.x > 26 && p.y > 29) return 3;
  if (p.y < 12) return 2;
  return (a.colorBand || 0) >= 2 ? 1 : 0;
});
const counts = [0,0,0,0];
level.arrows.forEach((a,i) => { counts[roles[i]] += a.points.length - 1; });
const total = counts.reduce((a,b)=>a+b,0);
const ratios = counts.map(n=>Math.round(n/total*100));
function artwork(palette) {
  return level.arrows.map((a,i) => {
    const ps = a.points.map(p=>({x: p.x*10, y:(48-p.y)*10}));
    const h=ps[ps.length-1], prev=ps[ps.length-2];
    const dx=Math.sign(h.x-prev.x), dy=Math.sign(h.y-prev.y);
    const color=palette.colors[roles[i]];
    const tip=`${h.x+dx*2.5},${h.y+dy*2.5}`;
    const l=`${h.x-dx*2.5-dy*2.7},${h.y-dy*2.5+dx*2.7}`;
    const r=`${h.x-dx*2.5+dy*2.7},${h.y-dy*2.5-dx*2.7}`;
    return `<polyline points="${ps.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/><polygon points="${tip} ${l} ${r}" fill="${color}"/>`;
  }).join('');
}
const panels=palettes.map((p,i)=>`<g transform="translate(${28+i*458},0)"><text x="12" y="53" font-size="23" fill="#4F4943">${p.title}</text><text x="12" y="85" font-size="14" fill="#8B8175">${p.note}</text><g transform="translate(0,115)">${artwork(p)}</g>${p.colors.map((c,j)=>`<rect x="${12+j*105}" y="630" width="92" height="30" rx="10" fill="${c}"/><text x="${12+j*105}" y="683" font-size="13" fill="#766E65">${c}</text>`).join('')}</g>`).join('');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="735" viewBox="0 0 1400 735"><rect width="1400" height="735" fill="#FFFDF8"/><g font-family="PingFang SC,Arial,sans-serif">${panels}<text x="40" y="720" font-size="14" fill="#8B8175">同一关卡 · 同一线宽 · 同一区域分配 · 不加柔光｜按线长占比：${ratios.join(' / ')}%</text></g></svg>`;
fs.mkdirSync('design', {recursive:true});
fs.writeFileSync('design/color-comparison.svg',svg);
fs.writeFileSync('design/color-comparison.html',`<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>箭头配色比较</title><style>body{margin:0;background:#FFFDF8;font-family:sans-serif}img{width:100%;min-width:1000px}p{padding:0 40px;color:#746b62}</style><img src="color-comparison.svg"><p>横向滚动可查看完整对比。三套均为设计候选色，不是传统色原始色值；这里只比较配色，不代表最终图案生成效果。</p></html>`);
console.log('Created design/color-comparison.svg and .html', ratios);
