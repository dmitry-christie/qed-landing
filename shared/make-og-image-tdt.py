#!/usr/bin/env python3
"""Regenerate a brand's link-preview image (og:image, 1200x630).

    python3 shared/make-og-image-tdt.py               # TDT -> shared/og-image-tdt.png
    python3 shared/make-og-image-tdt.py --brand QED   # QED -> shared/og-image.png
    python3 shared/make-og-image-tdt.py --brand QED --out /tmp/check.png   # compare first

Run it whenever a brand's tagline or city list changes (e.g. a city launches or closes),
or its logo changes, since the text below the logo is baked into the PNG as pixels, not
read from the i18n files at request time. See CLAUDE.md "Social preview images".

Both images share one layout: cream background, white rounded card with an offset dark
shadow, dotted corner accents, logo, bold tagline with a yellow underline, mono city line.
The per-brand numbers in BRANDS keep each image where it was first drawn (the QED ones were
measured off the original hand-made og-image.png), so editing a brand's copy moves nothing else.

Requires: Pillow (`pip install pillow`), rsvg-convert (`brew install librsvg`, TDT logo only)
and HarfBuzz's hb-shape (tagline kerning; Homebrew installs it with librsvg). The two fonts are
downloaded next to this script on first run (gitignored).
"""
import argparse
import json
import struct
import subprocess
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent

W, H = 1200, 630
BG = (251, 246, 234)
BORDER = (31, 26, 20)
YELLOW = (245, 197, 24)
GRAY = (140, 134, 126)

FONTS = {
    "pjs800.ttf": "https://fonts.gstatic.com/s/plusjakartasans/v12/LDIbaomQNQcsA88c7O9yZ4KMCoOg4IA6-91aHEjcWuA_KUnNSg.ttf",
    "jbm700.ttf": "https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8L6tjPQ.ttf",
}

# Each brand's copy and geometry. Dots are (x, y, cols, rows, spacing, radius, colour) of the
# top-left dot. Gaps are vertical: logo bottom -> tagline origin, tagline box -> underline,
# underline top -> city origin. city_track is extra px between the city line's letters.
BRANDS = {
    "TDT": {
        "out": "og-image-tdt.png",
        "tagline": "Tardeos de trivia, hechos como Dios manda.",  # keep in sync with h.foot.tagline (i18n-hub.js)
        # TDT-brand locations only (no Barcelona, which is QED-only); update when a TDT city launches or closes
        "cities": "VALENCIA · MADRID · MURCIA · SANTIAGO DE COMPOSTELA · A CORUÑA",
        "logo": "tardeo",
        "logo_w": 400, "logo_y": 95,
        "card": (90, 65, 1110, 595), "radius": 36, "border": 8, "shadow": 10,
        "dots": [(1120, 30, 6, 6, 20, 3, YELLOW), (20, 430, 7, 7, 20, 3, (245, 197, 24, 90))],
        "tagline_size": 38, "tagline_gap": 24,
        "underline_gap": 22, "underline_h": 6, "underline_r": 3,
        "city_size": 22, "city_track": 0, "city_gap": 24, "city_color": GRAY,
    },
    "QED": {
        "out": "og-image.png",
        "tagline": "Pub quiz nights, done properly.",  # keep in sync with the English h.foot.tagline (index.html)
        # QED (company-wide) locations, same order as the EN h.foot.tagline; "SANTIAGO DE COMPOSTELA" overflows the card
        "cities": "VALENCIA · MADRID · BARCELONA · MURCIA · SANTIAGO · A CORUÑA",
        "logo": "qed",
        "logo_w": 500, "logo_y": 96,
        "card": (90, 64, 1110, 566), "radius": 30, "border": 6, "shadow": 14,
        "dots": [(1010, 28, 11, 10, 17, 3, YELLOW), (20, 460, 10, 9, 17, 3, (255, 214, 178))],
        "tagline_size": 47, "tagline_gap": 2,
        "underline_gap": 17, "underline_h": 8, "underline_r": 4,
        "city_size": 20, "city_track": 1, "city_gap": 25, "city_color": (92, 80, 68),
    },
}


def ensure_fonts():
    for name, url in FONTS.items():
        dest = HERE / name
        if not dest.exists():
            urllib.request.urlretrieve(url, dest)
    return HERE / "pjs800.ttf", HERE / "jbm700.ttf"


def ensure_logo_tight():
    dest = HERE / "tardeo-logo-tight.png"
    if not dest.exists():
        subprocess.run(
            ["rsvg-convert", "-w", "720", str(HERE / "tardeo-logo.svg"), "-o", str(dest)],
            check=True,
        )
    return dest


def units_per_em(font_path):
    data = Path(font_path).read_bytes()
    for i in range(struct.unpack(">H", data[4:6])[0]):
        tag, _, offset, _ = struct.unpack(">4sIII", data[12 + 16 * i:28 + 16 * i])
        if tag == b"head":
            return struct.unpack(">H", data[offset + 18:offset + 20])[0]
    raise SystemExit(f"{font_path}: no head table")


def kerned_layout(text, font_path, size):
    """Pen x of each character (px from the line origin) and the line's advance width, kerned.

    Pillow built without raqm lays text out with no GPOS kerning, and Plus Jakarta Sans keeps
    all its pairs there, so "properly." drew a detached period. HarfBuzz supplies the kerned
    advances; ligatures are off so there is one glyph per character to draw with Pillow."""
    try:
        run = subprocess.run(
            ["hb-shape", "--output-format=json", "--no-glyph-names", "--features=-liga,-clig,-dlig",
             "-u", ",".join(f"{ord(c):x}" for c in text), str(font_path)],
            capture_output=True, text=True, check=True,
        )
    except FileNotFoundError:
        raise SystemExit("hb-shape not found: brew install harfbuzz (it comes with librsvg)")
    glyphs = json.loads(run.stdout)
    if [g["cl"] for g in glyphs] != list(range(len(text))):
        raise SystemExit(f"hb-shape did not give one glyph per character for {text!r}")
    scale = size / units_per_em(font_path)
    xs, pen = [], 0
    for g in glyphs:
        xs.append((pen + g["dx"]) * scale)
        pen += g["ax"]
    return xs, pen * scale


def load_logo(kind):
    if kind == "tardeo":
        return Image.open(ensure_logo_tight()).convert("RGBA")
    logo = Image.open(HERE / "qed-logo.png").convert("RGBA")  # square icon with transparent margins
    return logo.crop(logo.getchannel("A").getbbox())


def build(brand, out=None):
    cfg = BRANDS[brand]
    font_head_path, font_city_path = ensure_fonts()

    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img, "RGBA")

    def dot_grid(cx, cy, cols, rows, spacing, r, color):
        for i in range(cols):
            for j in range(rows):
                x, y = cx + i * spacing, cy + j * spacing
                draw.ellipse([x - r, y - r, x + r, y + r], fill=color)

    for grid in cfg["dots"]:
        dot_grid(*grid)

    card = cfg["card"]
    shadow_offset = cfg["shadow"]
    draw.rounded_rectangle(
        [card[0] + shadow_offset, card[1] + shadow_offset, card[2] + shadow_offset, card[3] + shadow_offset],
        radius=cfg["radius"], fill=BORDER,
    )
    draw.rounded_rectangle(card, radius=cfg["radius"], fill=(255, 255, 255), outline=BORDER, width=cfg["border"])

    logo = load_logo(cfg["logo"])
    logo_w = cfg["logo_w"]
    logo_h = int(logo.height * logo_w / logo.width)
    logo_resized = logo.resize((logo_w, logo_h), Image.LANCZOS)
    lx = (W - logo_w) // 2
    ly = cfg["logo_y"]
    img.paste(logo_resized, (lx, ly), logo_resized)
    logo_bottom = ly + logo_h

    tagline = cfg["tagline"]
    max_text_w = card[2] - card[0] - 100
    size = cfg["tagline_size"]
    while True:
        font_head = ImageFont.truetype(str(font_head_path), size)
        xs, tw = kerned_layout(tagline, font_head_path, size)
        if tw <= max_text_w or size <= 24:
            break
        size -= 1

    text_y = logo_bottom + cfg["tagline_gap"]
    tx = (W - tw) / 2
    for ch, x in zip(tagline, xs):
        draw.text((tx + x, text_y), ch, font=font_head, fill=(20, 16, 12))
    bbox = draw.textbbox((0, 0), tagline, font=font_head)  # vertical extent only; kerning is horizontal
    text_h = bbox[3] - bbox[1]

    uy = text_y + text_h + cfg["underline_gap"]
    draw.rounded_rectangle(
        [(W - 240) / 2, uy, (W + 240) / 2, uy + cfg["underline_h"]], radius=cfg["underline_r"], fill=YELLOW,
    )

    cities = cfg["cities"]
    font_city = ImageFont.truetype(str(font_city_path), cfg["city_size"])
    track = cfg["city_track"]
    if track:
        cw = sum(font_city.getlength(ch) for ch in cities) + track * (len(cities) - 1)
    else:
        bbox2 = draw.textbbox((0, 0), cities, font=font_city)
        cw = bbox2[2] - bbox2[0]
    if cw > max_text_w:
        raise SystemExit(f"{brand} city line is {cw:.0f}px wide, over the {max_text_w}px the card allows; shorten it")
    cx, cy = (W - cw) / 2, uy + cfg["city_gap"]
    if track:
        for ch in cities:
            draw.text((cx, cy), ch, font=font_city, fill=cfg["city_color"])
            cx += font_city.getlength(ch) + track
    else:
        draw.text((cx, cy), cities, font=font_city, fill=cfg["city_color"])

    out = Path(out) if out else HERE / cfg["out"]
    img.save(out)
    print(f"saved {out} ({img.size[0]}x{img.size[1]})")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--brand", choices=sorted(BRANDS), default="TDT", type=str.upper)
    ap.add_argument("--out", help="write here instead of shared/<brand image> (to compare before overwriting)")
    args = ap.parse_args()
    build(args.brand, args.out)
