import json,sys
from PIL import Image,ImageDraw
level=json.load(open(sys.argv[1])); points=[p for a in level['arrows'] for p in a['points']]
left=min(p['x'] for p in points);top=max(p['y'] for p in points);scale=12;margin=30
image=Image.new('RGB',((max(p['x'] for p in points)-left)*scale+2*margin,(top-min(p['y'] for p in points))*scale+2*margin),'#FFFDF8')
draw=ImageDraw.Draw(image)
for arrow in level['arrows']:
    path=[(margin+(p['x']-left)*scale,margin+(top-p['y'])*scale) for p in arrow['points']]
    color=['#E9AF4B','#F4C96B','#F29B75','#E891AA'][arrow.get('colorBand',0)]
    draw.line(path,fill=color,width=3,joint='curve')
    x,y=path[-1];dx=(x-path[-2][0])/scale;dy=(y-path[-2][1])/scale
    draw.polygon([(x+dx*3,y+dy*3),(x-dx*3-dy*3.24,y-dy*3+dx*3.24),(x-dx*3+dy*3.24,y-dy*3-dx*3.24)],fill=color)
image.save(sys.argv[2])
