#!/usr/bin/env python3
"""D-40 · 30초를 15칸 시트 한 장으로 — 낱장보다 시트가 눈에 낫다(AGENTS.md).
   python3 tools/d40_sheet.py [A|P11] [out.png]
   칸마다 «몇 초 · 몇 층 · 군세 몇»을 적는다 — 눈이 본 것을 자와 맞대 보려고."""
import json, sys, os
from PIL import Image, ImageDraw

arm = sys.argv[1] if len(sys.argv) > 1 else "A"
out = sys.argv[2] if len(sys.argv) > 2 else f"tmp/d40_sheet_{arm}.png"
meta = json.load(open("tmp/d40_look.json"))[arm]
shots = meta["사진"]
COLS, SCALE, BAR = 5, 0.34, 22
ims = []
for s in shots:
    im = Image.open(s["p"]).convert("RGB")
    im = im.resize((int(im.width * SCALE), int(im.height * SCALE)), Image.LANCZOS)
    ims.append((im, s))
w, h = ims[0][0].size
rows = (len(ims) + COLS - 1) // COLS
sheet = Image.new("RGB", (COLS * w, rows * (h + BAR)), (16, 14, 12))
d = ImageDraw.Draw(sheet)
for i, (im, s) in enumerate(ims):
    x, y = (i % COLS) * w, (i // COLS) * (h + BAR)
    sheet.paste(im, (x, y + BAR))
    d.rectangle([x, y, x + w, y + BAR], fill=(30, 26, 22))
    d.text((x + 6, y + 6), f'{arm}  t={s["t"]:>4}s  floor {s["f"]}  army {s["n"]}', fill=(210, 190, 150))
    d.line([x, y, x, y + h + BAR], fill=(60, 52, 44))
sheet.save(out)
print(out, sheet.size)
