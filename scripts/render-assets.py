from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
source_path = root.parent / 'Soma_Fe/scripts/blender/render_glb_preview.py'
source = source_path.read_text(encoding='utf-8')
source = source.replace('sc.render.resolution_x=900; sc.render.resolution_y=900', 'sc.render.resolution_x=560; sc.render.resolution_y=560')
source = source.replace('sc.render.film_transparent=False', 'sc.render.film_transparent=True\nsc.render.image_settings.color_mode="RGBA"')
destination = root / 'assets/anatomy'
destination.mkdir(parents=True, exist_ok=True)
for filename, side in [('hand_bones.glb','r'),('heart_anatomy.glb',''),('lung_anatomy.glb',''),('liver_anatomy.glb',''),('brainstem_cranial_nerves.glb','')]:
    output = destination / (filename.removesuffix('.glb') + '.png')
    if output.exists():
        continue
    sys.argv=['blender','--',str(root.parent / 'Soma_Fe/public/models' / filename),str(output),'1.0','head','','1.12',side]
    exec(compile(source,str(source_path),'exec'),{'__file__':str(source_path)})
