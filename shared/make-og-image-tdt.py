#!/usr/bin/env python3
"""Regenerate shared/og-image-tdt.png (the TDT link-preview image).

Run this whenever the tagline or city list changes (e.g. a new city launches),
since the text below the logo is baked into the PNG as pixels, not read from
the i18n files at request time. See CLAUDE.md "Social preview images" for when
this needs to run.

Requires: Pillow (`pip install pillow`) and rsvg-convert (`brew install librsvg`).
Run from the shared/ directory: `python3 make-og-image-tdt.py`
"""
import subprocess
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
TAGLINE = "Tardeos de trivia, hechos como Dios manda."  # keep in sync with h.foot.tagline (i18n-hub.js)
CITIES = "VALENCIA · MADRID · MURCIA · SANTIAGO DE COMPOSTELA"  # keep in sync with the city list shown across the site

W, H = 1200, 630
BG = (251, 246, 234)
BORDER = (31, 26, 20)
YELLOW = (245, 197, 24)
GRAY = (140, 134, 126)

FONTS = {
    "pjs800.ttf": "https://fonts.gstatic.com/s/plusjakartasans/v12/LDIbaomQNQcsA88c7O9yZ4KMCoOg4IA6-91aHEjcWuA_KUnNSg.ttf",
    "jbm700.ttf": "https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8L6tjPQ.ttf",
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


def build():
    font_head_path, font_city_path = ensure_fonts()
    logo_path = ensure_logo_tight()

    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img, "RGBA")

    def dot_grid(cx, cy, cols, rows, spacing, r, color):
        for i in range(cols):
            for j in range(rows):
                x, y = cx + i * spacing, cy + j * spacing
                draw.ellipse([x - r, y - r, x + r, y + r], fill=color)

    dot_grid(1120, 30, 6, 6, 20, 3, YELLOW)
    dot_grid(20, 430, 7, 7, 20, 3, (245, 197, 24, 90))

    card = [90, 65, 1110, 595]
    shadow_offset = 10
    draw.rounded_rectangle(
        [card[0] + shadow_offset, card[1] + shadow_offset, card[2] + shadow_offset, card[3] + shadow_offset],
        radius=36, fill=BORDER,
    )
    draw.rounded_rectangle(card, radius=36, fill=(255, 255, 255), outline=BORDER, width=8)

    logo = Image.open(logo_path).convert("RGBA")
    logo_w = 400
    logo_h = int(logo.height * logo_w / logo.width)
    logo_resized = logo.resize((logo_w, logo_h), Image.LANCZOS)
    lx = (W - logo_w) // 2
    ly = 95
    img.paste(logo_resized, (lx, ly), logo_resized)
    logo_bottom = ly + logo_h

    max_text_w = card[2] - card[0] - 100
    size = 38
    font_head = ImageFont.truetype(str(font_head_path), size)
    while True:
        bbox = draw.textbbox((0, 0), TAGLINE, font=font_head)
        tw = bbox[2] - bbox[0]
        if tw <= max_text_w or size <= 24:
            break
        size -= 1
        font_head = ImageFont.truetype(str(font_head_path), size)

    text_y = logo_bottom + 24
    draw.text(((W - tw) / 2, text_y), TAGLINE, font=font_head, fill=(20, 16, 12))
    text_h = bbox[3] - bbox[1]

    uy = text_y + text_h + 22
    draw.rounded_rectangle([(W - 240) / 2, uy, (W + 240) / 2, uy + 6], radius=3, fill=YELLOW)

    font_city = ImageFont.truetype(str(font_city_path), 22)
    bbox2 = draw.textbbox((0, 0), CITIES, font=font_city)
    cw = bbox2[2] - bbox2[0]
    draw.text(((W - cw) / 2, uy + 24), CITIES, font=font_city, fill=GRAY)

    out = HERE / "og-image-tdt.png"
    img.save(out)
    print(f"saved {out} ({img.size[0]}x{img.size[1]})")


if __name__ == "__main__":
    build()
