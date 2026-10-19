from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

folder = Path(__file__).resolve().parents[1] / 'assets'
font_path = Path('C:/Windows/Fonts/segoeuib.ttf')
font = ImageFont.truetype(str(font_path) if font_path.exists() else 'DejaVuSans-Bold.ttf', 610)
foreground = Image.new('RGBA', (1024,1024), (0,0,0,0))
draw = ImageDraw.Draw(foreground)
box = draw.textbbox((0,0), 's', font=font)
x = (1024-(box[2]-box[0]))//2-45
y = (1024-(box[3]-box[1]))//2-box[1]-15
draw.text((x,y), 's', fill='#F4F6F9', font=font)
draw.ellipse((664,636,741,713), fill='#A8C8FF')
foreground.save(folder / 'adaptive-icon.png')
background = Image.new('RGBA', (1024,1024), '#18232E')
background.alpha_composite(foreground)
background.convert('RGB').save(folder / 'icon.png')
background.resize((64,64),Image.Resampling.LANCZOS).save(folder / 'favicon.png')
print('Created Soma application icons.')
