from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

root = Path('/home/user/spa_operational_pwa/public/icons')
root.mkdir(parents=True, exist_ok=True)

for size in (192, 512):
    img = Image.new('RGB', (size, size), '#20352e')
    d = ImageDraw.Draw(img)
    inset = size // 8
    d.rounded_rectangle((inset, inset, size-inset, size-inset), radius=size//7, fill='#dbf0d7')
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', size//5)
    except Exception:
        font = ImageFont.load_default()
    text = 'SPA'
    bbox = d.textbbox((0,0), text, font=font)
    tw = bbox[2]-bbox[0]
    th = bbox[3]-bbox[1]
    d.text(((size-tw)/2, (size-th)/2 - size*0.02), text, font=font, fill='#20352e')
    img.save(root / f'icon-{size}.png')