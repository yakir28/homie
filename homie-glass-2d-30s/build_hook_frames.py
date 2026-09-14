from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "hook"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1080, 1440
BG = (248, 248, 246, 255)
BLACK = (15, 15, 16, 255)
GRAY = (138, 138, 142, 255)
FONT_PATH = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
HOUSE_PATH = ROOT.parent / "homie-launch-video-30s/keyframes/01-listing-still.png"


def font(size: int):
    return ImageFont.truetype(FONT_PATH, size=size)


def canvas():
    im = Image.new("RGBA", (W, H), BG)
    d = ImageDraw.Draw(im)
    for x in range(0, W, 90):
        d.line((x, 0, x, H), fill=(222, 222, 220, 34), width=1)
    for y in range(0, H, 90):
        d.line((0, y, W, y), fill=(222, 222, 220, 34), width=1)
    return im


def glass_panel(im, box, radius=36, fill=(255, 255, 255, 132)):
    x0, y0, x1, y1 = box
    shadow = Image.new("RGBA", im.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((x0 + 2, y0 + 18, x1 + 2, y1 + 18), radius, fill=(0, 0, 0, 48))
    shadow = shadow.filter(ImageFilter.GaussianBlur(26))
    im.alpha_composite(shadow)
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.rounded_rectangle(box, radius, fill=fill, outline=(255, 255, 255, 220), width=3)
    ld.rounded_rectangle((x0 + 2, y0 + 2, x1 - 2, y1 - 2), radius - 2, outline=(155, 155, 160, 90), width=1)
    im.alpha_composite(layer)


def house_card(im, box):
    src = Image.open(HOUSE_PATH).convert("RGB")
    crop = src.crop((302, 305, 715, 1100))
    x0, y0, x1, y1 = box
    target_w, target_h = x1 - x0, y1 - y0
    crop.thumbnail((target_w, target_h), Image.Resampling.LANCZOS)
    px = x0 + (target_w - crop.width) // 2
    py = y0 + (target_h - crop.height) // 2
    mask = Image.new("L", (target_w, target_h), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, target_w - 1, target_h - 1), 32, fill=255)
    card = Image.new("RGBA", (target_w, target_h), (255, 255, 255, 0))
    card.paste(crop.resize((target_w, target_h), Image.Resampling.LANCZOS), (0, 0))
    card.putalpha(mask)
    im.alpha_composite(card, (x0, y0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle(box, 32, outline=(255, 255, 255, 230), width=4)
    d.rounded_rectangle((x0 - 1, y0 - 1, x1 + 1, y1 + 1), 34, outline=(150, 150, 155, 90), width=1)


def center_text(d, text, y, size, fill=BLACK):
    f = font(size)
    box = d.textbbox((0, 0), text, font=f)
    x = (W - (box[2] - box[0])) // 2
    d.text((x, y), text, font=f, fill=fill, anchor="la")


def footer(d, idx):
    d.text((54, 1372), f"0{idx}", font=font(22), fill=GRAY)
    d.line((94, 1388, 1026, 1388), fill=(155, 155, 160, 90), width=1)


# Frame 1: CREATING
im = canvas()
d = ImageDraw.Draw(im)
center_text(d, "CREATING", 92, 176)
glass_panel(im, (72, 438, 1008, 1248), radius=46)
house_card(im, (338, 560, 742, 1110))
d.text((102, 470), "HOME WALKTHROUGH VIDEO", font=font(28), fill=GRAY)
footer(d, 1)
im.convert("RGB").save(OUT / "01-creating.png", quality=96)


# Frame 2: HOME
im = canvas()
glass_panel(im, (94, 180, 986, 1260), radius=54, fill=(255, 255, 255, 108))
d = ImageDraw.Draw(im)
center_text(d, "HOME", 314, 282)
house_card(im, (390, 700, 690, 1108))
d.line((160, 1186, 920, 1186), fill=(20, 20, 20, 100), width=2)
footer(d, 2)
im.convert("RGB").save(OUT / "02-home.png", quality=96)


# Frame 3: WALKTHROUGH
im = canvas()
d = ImageDraw.Draw(im)
center_text(d, "WALK", 126, 238)
center_text(d, "THROUGH", 366, 168)
glass_panel(im, (52, 610, 1028, 830), radius=44, fill=(255, 255, 255, 154))
d.text((88, 655), "ONE SIMPLE FLOW", font=font(50), fill=BLACK)
for i, x in enumerate((118, 330, 542, 754)):
    house_card(im, (x, 900, x + 180, 1148))
footer(d, 3)
im.convert("RGB").save(OUT / "03-walkthrough.png", quality=96)


# Frame 4: VIDEOS with the property image clipped inside the letters.
im = canvas()
d = ImageDraw.Draw(im)
mask = Image.new("L", (W, H), 0)
md = ImageDraw.Draw(mask)
f = font(244)
tb = md.textbbox((0, 0), "VIDEOS", font=f)
tx = (W - (tb[2] - tb[0])) // 2
ty = 380
md.text((tx, ty), "VIDEOS", font=f, fill=255)
src = Image.open(HOUSE_PATH).convert("RGB").crop((302, 305, 715, 1100)).resize((W, H))
photo_fill = Image.new("RGBA", (W, H), (0, 0, 0, 0))
photo_fill.paste(src, (0, 0))
photo_fill.putalpha(mask)
im.alpha_composite(photo_fill)
d = ImageDraw.Draw(im)
d.text((tx, ty), "VIDEOS", font=f, fill=(0, 0, 0, 0), stroke_width=3, stroke_fill=BLACK)
glass_panel(im, (78, 716, 1002, 1000), radius=42, fill=(255, 255, 255, 118))
d.text((122, 786), "BUILT FROM PROPERTY PHOTOS", font=font(43), fill=BLACK)
footer(d, 4)
im.convert("RGB").save(OUT / "04-videos.png", quality=96)


# Frame 5: HAS NEVER BEEN
im = canvas()
d = ImageDraw.Draw(im)
glass_panel(im, (104, 390, 976, 1018), radius=52, fill=(255, 255, 255, 118))
center_text(d, "HAS", 466, 168)
center_text(d, "NEVER BEEN", 654, 112)
d.ellipse((510, 870, 570, 930), fill=(255, 255, 255, 165), outline=(135, 135, 140, 95), width=2)
footer(d, 5)
im.convert("RGB").save(OUT / "05-has-never-been.png", quality=96)


# Frame 6: THIS EASY
im = canvas()
d = ImageDraw.Draw(im)
d.text((-18, 128), "THIS", font=font(310), fill=BLACK)
d.text((-26, 430), "EASY.", font=font(302), fill=BLACK)
glass_panel(im, (58, 786, 1022, 1018), radius=46, fill=(255, 255, 255, 142))
d.text((104, 838), "CHOOSE  ·  DROP  ·  GENERATE", font=font(42), fill=BLACK)
house_card(im, (662, 1032, 984, 1340))
footer(d, 6)
im.convert("RGB").save(OUT / "06-this-easy.png", quality=96)

print(OUT)
