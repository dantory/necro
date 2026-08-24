# -*- coding: utf-8 -*-
"""벨트 아이콘의 **투명 여백**을 다듬어 칸을 고르게 채우게 한다 (V-36).

   `.slot > i` 는 `background:center/contain` 이라 **64×64 통째로** 칸에 맞춰진다 —
   그림 둘레의 빈 자리까지 같이 맞춰지므로, 여백이 넓은 그림은 칸 안에서 그만큼 작다.
   여기서는 그림을 **제 바깥테로 자르고**, 긴 쪽이 상자의 `--target` 만큼이 되도록
   정사각 판에 다시 앉힌다(그림 자체는 한 픽셀도 안 건드린다 — 판만 갈아 끼운다).

   python3 tools/icon_fit.py assets/ui/icon/burn.png [--target 0.90] [--dry]"""
import sys
from PIL import Image

args = [a for a in sys.argv[1:] if not a.startswith("--")]
opts = {a.split("=")[0]: (a.split("=")[1] if "=" in a else "1") for a in sys.argv[1:] if a.startswith("--")}
target = float(opts.get("--target", 0.90))
dry = "--dry" in opts

for path in args:
    im = Image.open(path).convert("RGBA")
    W, H = im.size
    px = im.load()
    xs = [x for x in range(W) for y in range(H) if px[x, y][3] > 24]
    ys = [y for x in range(W) for y in range(H) if px[x, y][3] > 24]
    if not xs:
        print(f"{path}: 그림이 없다"); continue
    x0, x1, y0, y1 = min(xs), max(xs) + 1, min(ys), max(ys) + 1
    bw, bh = x1 - x0, y1 - y0
    side = max(1, round(max(bw, bh) / target))
    art = im.crop((x0, y0, x1, y1))
    out = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    out.paste(art, ((side - bw) // 2, (side - bh) // 2))
    print(f"{path}: {W}×{H} (그림 {bw}×{bh} · 긴 쪽 {max(bw,bh)/max(W,H):.2f})"
          f" → {side}×{side} (긴 쪽 {max(bw,bh)/side:.2f})")
    if not dry:
        out.save(path)
