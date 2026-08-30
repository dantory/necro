#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""V-179 — 옛 pebble / 새 pebble 을 «실제 바닥 위에» 나란히 얹어 눈으로 본다.
자가 통과했다고 끝이 아니다 — ★ [[play-it-before-measuring-it]]
층은 hs_decalcheck.py 와 같다: floorBase(#241f1b + crypt_tile@0.55) → 얼룩 a=0.59 → tint.
"""
import sys, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = (0x24, 0x1f, 0x1b, 255)
A = 0.59
TINT = (94, 66, 42)
TINT_A = 0.26
CELL, SCALE = 200, 3

def floor(w, h):
    bg = Image.new("RGBA", (w, h), BASE)
    t = Image.open(os.path.join(ROOT, "assets/floor/crypt_tile.png")).convert("RGBA")
    tile = Image.new("RGBA", (w, h))
    for y in range(0, h, t.height):
        for x in range(0, w, t.width):
            tile.paste(t, (x, y))
    tile.putalpha(tile.getchannel("A").point(lambda v: int(v * 0.55)))
    return Image.alpha_composite(bg, tile)

def panel(png):
    f = floor(CELL, CELL)
    if png:
        d = Image.open(png).convert("RGBA")
        d.putalpha(d.getchannel("A").point(lambda v: int(v * A)))
        f.alpha_composite(d, ((CELL - d.width) // 2, (CELL - d.height) // 2))
    tint = Image.new("RGBA", (CELL, CELL), TINT + (int(255 * TINT_A),))
    return Image.alpha_composite(f, tint)

if __name__ == "__main__":
    items = [("바닥만", None),
             ("옛 pebble", "assets/decal/pebble.png"),
             ("새 pebble", "assets/decalbake_v179_soft/pebble.png"),
             ("dust(통과)", "assets/decal/dust.png"),
             ("stain(통과)", "assets/decal/stain.png")]
    sheet = Image.new("RGBA", (CELL * len(items), CELL))
    for i, (_, p) in enumerate(items):
        sheet.paste(panel(os.path.join(ROOT, p) if p else None), (i * CELL, 0))
    sheet = sheet.resize((sheet.width * SCALE, sheet.height * SCALE), Image.NEAREST)
    out = os.path.join(ROOT, "tmp/v179_cmp.png")
    sheet.convert("RGB").save(out)
    print("  ".join(n for n, _ in items))
    print(out)
