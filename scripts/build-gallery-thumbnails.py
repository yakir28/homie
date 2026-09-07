"""Generate gallery-sized WebP assets: python3 scripts/build-gallery-thumbnails.py."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[1]
output = root / 'public/gallery/thumbs'
output.mkdir(parents=True, exist_ok=True)
manifest = {}
for source in sorted((root / 'public/gallery').glob('gallery-*')):
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original).convert('RGB')
        width, height = image.size
        version = hashlib.sha256(source.read_bytes()).hexdigest()[:10]
        variants = []
        for target_height in (240, 480):
            target_width = round(width * target_height / height)
            name = f'{source.stem}-{version}-{target_height}.webp'
            image.resize((target_width, target_height), Image.Resampling.LANCZOS).save(output / name, 'WEBP', quality=72, method=6)
            variants.append((f'/gallery/thumbs/{name}', target_width))
        manifest[f'/gallery/{source.name}'] = {
            'src': variants[0][0],
            'srcSet': ', '.join(f'{url} {w}w' for url, w in variants),
            'width': width,
            'height': height,
        }
(root / 'lib/gallery-thumbnails.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Generated {len(manifest)} gallery thumbnails in two sizes.')
print(f'1x total: {sum(p.stat().st_size for p in output.glob("*-240.webp")):,} bytes')
print(f'2x total: {sum(p.stat().st_size for p in output.glob("*-480.webp")):,} bytes')
