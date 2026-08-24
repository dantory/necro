#!/usr/bin/env python3
"""V-40 자 — 마을 바닥에서 «흙 위에 낱개로 뜬 풀 섬»을 센다.

Wang 바닥은 꼭짓점마다 재질을 뽑는다. 그 뽑기가 소금·후추처럼 흩어지면 풀 한 칸이
혼자 남고, 타일 넉 장이 둥근 모서리를 맞대어 **둥근 초록 네모**가 된다 — 지형이
아니라 스티커로 읽힌다.

재는 법: 사람이 보는 화면(스크린샷) 그대로 [[probe-must-walk-the-real-path]].
  · 풀/흙을 가르는 것은 「초록이 밝은가」가 아니라 **붉은기(r-g)** 다. 바닥 전체의
    r-g 봉우리가 둘이고(0 언저리=풀 · 16~32=흙) 골이 12 다.
  · 타일 한 장은 32px, 화면은 dpr 2 라 **64×64 = 4096px** 이다.
  · 「스티커」 = **한 타일짜리 네모** — 가로·세로가 둘 다 55~100px 이고 그 네모를
    60% 넘게 채운 조각. 이게 눈에 거슬리는 바로 그것이다. 넓이만으로 세면 큰 풀밭이
    소품에 갈려 생긴 조각까지 섞여 들어와 판정이 흐려진다(처음에 그랬다).
  · 300px 미만은 소품 그늘·풀결 얼룩이라 안 센다(바닥 재질이 아니다).
사용법: python3 tools/v40_grassiles.py <screenshot.png>
"""
import sys
from collections import deque
from PIL import Image

TOP, BOT = 60, 1030          # 위 층표시·아래 HUD 를 뺀 바닥
TILE = 64 * 64               # 32px 타일 @dpr2
NOISE, ISLE, SMALL = 300, TILE * 1.5, TILE * 3

path = sys.argv[1]
im = Image.open(path).convert("RGB")
W, H = im.size
px = im.load()
HH = BOT - TOP

def is_grass(c):
    r, g, b = c
    if r + g + b < 90: return False      # 그늘은 재질을 못 읽는다
    return r - g < 12

mask = bytearray(W * HH)
for y in range(TOP, BOT):
    row = (y - TOP) * W
    for x in range(W):
        if is_grass(px[x, y]): mask[row + x] = 1

seen = bytearray(len(mask))
comps = []                       # (넓이, x0, y0, 폭, 높이)
for i in range(len(mask)):
    if mask[i] and not seen[i]:
        q = deque([i]); seen[i] = 1; n = 0
        x0 = y0 = 1 << 30; x1 = y1 = -1
        while q:
            j = q.popleft(); n += 1
            jy, jx = divmod(j, W)
            if jx < x0: x0 = jx
            if jx > x1: x1 = jx
            if jy < y0: y0 = jy
            if jy > y1: y1 = jy
            for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                nx, ny = jx + dx, jy + dy
                if 0 <= nx < W and 0 <= ny < HH:
                    k = ny * W + nx
                    if mask[k] and not seen[k]: seen[k] = 1; q.append(k)
        comps.append((n, x0, y0 + TOP, x1 - x0 + 1, y1 - y0 + 1))

areas = [c[0] for c in comps]
areas.sort(reverse=True)
real = [a for a in areas if a >= NOISE]
isle = [a for a in real if a < ISLE]
stick = [c for c in comps if c[0] >= NOISE and 55 < c[3] < 100 and 55 < c[4] < 100
         and c[0] / (c[3] * c[4]) > 0.6]
total = sum(areas)
print(f"풀 {total/(W*HH)*100:.1f}% · 조각 {len(real)} 개(300px 이상) · 큰 것 {real[:4]}")
print(f"★ 스티커(한 타일짜리 네모) {len(stick)} 개" +
      ("  " + " ".join(f"x{c[1]},y{c[2]}" for c in stick[:6]) if stick else ""))
print(f"  작은 조각(<{ISLE:.0f}px) {len(isle)} 개 — 큰 풀밭이 소품에 갈린 것도 섞인다")
