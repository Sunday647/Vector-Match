"""Render actual exported level geometry, using the game's warm background.
Usage: python3 tools/render-levels.py /tmp/arrow-preview-levels.json
"""
import json, math, sys
from PIL import Image, ImageDraw, ImageFont

samples = json.load(open(sys.argv[1]))[:12]
factor = 2
width, height = 1560, 2280
canvas = Image.new('RGB', (width*factor, height*factor), '#FFFDF8')
draw = ImageDraw.Draw(canvas)
font_path = '/System/Library/Fonts/STHeiti Medium.ttc'
def text(x, y, value, size, color='#36516A'):
    draw.text((x*factor,y*factor),value,font=ImageFont.truetype(font_path,size*factor),fill=color)

text(48, 28, '一箭清空 · 前 12 关', 36)
text(48, 82, '全图路径 / 四向交错 / 实际关卡生成结果', 19, '#8091A1')
for index, sample in enumerate(samples):
    col, row = index % 3, index // 3
    x, y = 30+col*510, 135+row*530
    level, palette = sample['level'], sample['palette']
    text(x+18,y+10,f"第 {index+1} 关 · {level['name']}",23)
    text(x+18,y+48,f"{sample['term']} · {len(level['arrows'])} 根箭头",17,'#8091A1')
    points=[p for a in level['arrows'] for p in a['points']]
    left,right=min(p['x'] for p in points),max(p['x'] for p in points)
    bottom,top=min(p['y'] for p in points),max(p['y'] for p in points)
    scale=min(445/(right-left+2),410/(top-bottom+2))
    ox=x+245-(right-left)*scale/2
    oy=y+295+(top-bottom)*scale/2
    for arrow in level['arrows']:
        path=[((ox+(p['x']-left)*scale)*factor,(oy-(p['y']-bottom)*scale)*factor) for p in arrow['points']]
        color=palette[arrow.get('colorBand',0)]
        draw.line(path,fill=color,width=max(1,round(.25*scale*factor)),joint='curve')
        hx,hy=path[-1];px,py=path[-2]
        dx,dy=(hx-px)/(scale*factor),(hy-py)/(scale*factor)
        size=.5*scale*factor; wing=.27*scale*factor
        draw.polygon([(hx+dx*size,hy+dy*size),(hx-dx*size-dy*wing,hy-dy*size+dx*wing),(hx-dx*size+dy*wing,hy-dy*size-dx*wing)],fill=color)
canvas.resize((width,height),Image.Resampling.LANCZOS).save('design/generated-shape-review.png')
print('Updated design/generated-shape-review.png')
