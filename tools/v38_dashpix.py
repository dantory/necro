# -*- coding: utf-8 -*-
"""V-38 자의 뒷단 — 「예고 점선의 획이 얼마나 «픽셀»인가」를 잰다.

   ★ 밝기 차만 보면 안 된다 — 바탕이 자리마다 다르면 같은 획도 ΔL 이 다르게 나온다.
     알파 합성은 L_켬 = (1-a·c)·L_끔 + a·c·L_색 이므로, **덮은 정도** c 를 되풀 수 있다:
         c = |L_켬 − L_끔| / (a · |L_색 − L_끔|)
     c 는 바탕을 나눠 없앴으므로 어느 자리에서든 「이 픽셀이 얼마나 칠해졌나」다.

   내는 값:
     n      = 획에 든 픽셀 수 (c ≥ 0.15)
     blur   = 그중 **반쯤 칠해진** 것의 비율 (0.15 ≤ c < 0.85) — 벡터 안티에일리어싱의 번짐
     solid  = 꽉 칠해진 것의 비율 (c ≥ 0.85)
   픽셀로 찍은 점선은 정수 자리·정수 크기라 blur 가 0 에 가깝고,
   `setLineDash` 로 그은 매끈한 선은 가장자리마다 반투명 띠가 생겨 blur 가 크다.

   ★ **획이 지나는 띠 안만 본다.** 판을 얼려도 `draw()` 는 벽시계로 돌아 횃불·기운·
     떠오르는 숫자가 두 사진 사이에 바뀐다 — 그 픽셀까지 세면 「반쯤 칠해진 것」이
     엉뚱하게 불어난다(처음 잰 값 blur 0.76 이 그것이었다). 고리의 기하를 받아
     정규반지름 0.93~1.07 안만 센다.

   python3 tools/v38_dashpix.py <on.png> <off.png> <#rrggbb> <alpha> <cx> <cy> <rx> <ry> <dpr>"""
import sys, json
from PIL import Image

on  = Image.open(sys.argv[1]).convert("RGB")
off = Image.open(sys.argv[2]).convert("RGB")
col = sys.argv[3].lstrip("#")
a   = float(sys.argv[4])
cx, cy, rx, ry, dpr = (float(v) for v in sys.argv[5:10])
assert on.size == off.size, "두 사진 크기가 다르다"
W, H = on.size
pa, pb = on.load(), off.load()
lum = lambda c: 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]
Lc = lum((int(col[0:2],16), int(col[2:4],16), int(col[4:6],16)))

n = blur = solid = 0
y0, y1 = max(0, int((cy - ry*1.07)*dpr)), min(H, int((cy + ry*1.07)*dpr) + 1)
x0, x1 = max(0, int((cx - rx*1.07)*dpr)), min(W, int((cx + rx*1.07)*dpr) + 1)
for y in range(y0, y1):
    for x in range(x0, x1):
        u = (x/dpr - cx)/rx; v = (y/dpr - cy)/ry
        d = (u*u + v*v) ** 0.5
        if d < 0.93 or d > 1.07: continue       # 획이 지나는 띠 밖은 안 센다
        A, B = pa[x, y], pb[x, y]
        if A == B: continue
        Lb = lum(B)
        den = a * abs(Lc - Lb)
        if den < 12: continue              # 바탕이 획 색과 거의 같은 자리 — 나눗셈이 못 믿을 곳
        c = abs(lum(A) - Lb) / den
        if c < 0.15: continue
        n += 1
        if c < 0.85: blur += 1
        else: solid += 1
print(json.dumps({"n": n,
                  "blur": round(blur/n, 4) if n else None,
                  "solid": round(solid/n, 4) if n else None}, ensure_ascii=False))
