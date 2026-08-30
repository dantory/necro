#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""얼룩의 **꼴**을 재는 자. (V-175)

V-174 가 밝기 자를 화면 기준으로 고쳐 재니 일곱 중 여섯이 ±8 안이었다 — **색은 이미
문제가 아니다.** 그런데도 셋(`crack`·`pebble`·`mud`)이 「얹힌 접시」로 보였다.
눈으로는 단숨에 갈렸는데(`tmp/v174_decal_sheet.png`) **재는 자가 없어서** 여섯 판을
색으로만 다퉜다. ★ [[cause-written-in-the-item-is-a-guess]]

여기서 재는 것은 실루엣 하나다 — **얼마나 «타원 판»에 가까운가.**

  fill   불투명 픽셀 / 제 외접타원 넓이 .... 꽉 찬 판이면 1.0 에 붙는다
  comp   둘레²/(4π·넓이) ..................... 원이면 1.0, 너덜하면 커진다
  radσ   무게중심→테두리 반지름의 흔들림 .... 원이면 0, 너덜하면 커진다

판정 띠는 **눈으로 통과시킨 둘**(dust·stain)이 정한다 — 자를 먼저 세우고 그 자로
나머지를 잰다. ★ [[floor-far-from-threshold]]

  python3 tools/hs_decalshape.py assets/decal [더 볼 폴더 ...]
"""
import math, os, sys
from PIL import Image

A_ON = 128           # 이 알파부터 «있는 픽셀»로 본다


def mask(path):
    im = Image.open(path).convert("RGBA")
    px = im.load(); w, h = im.size
    m = [[px[x, y][3] >= A_ON for x in range(w)] for y in range(h)]
    return m, w, h


def shape(path):
    m, w, h = mask(path)
    pts = [(x, y) for y in range(h) for x in range(w) if m[y][x]]
    if len(pts) < 20:
        return None
    n = len(pts)
    cx = sum(p[0] for p in pts) / n; cy = sum(p[1] for p in pts) / n
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    bw = max(xs) - min(xs) + 1; bh = max(ys) - min(ys) + 1
    ell = math.pi * (bw / 2) * (bh / 2)          # 외접상자에 든 타원
    fill = n / ell if ell else 0

    # 둘레 — 네 이웃 중 하나라도 비면 테두리
    per = 0
    for x, y in pts:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx >= w or ny >= h or not m[ny][nx]:
                per += 1; break
    comp = per * per / (4 * math.pi * n) if n else 0

    # 각도 36칸으로 나눠 가장 먼 테두리 반지름 — 그 흔들림
    edge = []
    for x, y in pts:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx >= w or ny >= h or not m[ny][nx]:
                edge.append((x, y)); break
    rad = [0.0] * 36
    for x, y in edge:
        a = math.atan2(y - cy, x - cx)
        k = int((a + math.pi) / (2 * math.pi) * 36) % 36
        r = math.hypot(x - cx, y - cy) / math.sqrt(bw * bh) * 2   # 크기로 정규화
        rad[k] = max(rad[k], r)
    got = [r for r in rad if r > 0]
    mu = sum(got) / len(got)
    rsg = math.sqrt(sum((r - mu) ** 2 for r in got) / len(got)) / mu if mu else 0
    return fill, comp, rsg, n


if __name__ == "__main__":
    dirs = sys.argv[1:] or ["assets/decal"]
    rows = []
    for d in dirs:
        for f in sorted(os.listdir(d)):
            if not f.endswith(".png"): continue
            s = shape(os.path.join(d, f))
            if s: rows.append((f"{os.path.basename(d)}/{f[:-4]}", *s))
    ref = [r for r in rows if r[0].endswith(("/dust", "/stain")) and r[0].startswith("decal/")]
    print(f"{'':28} {'fill':>6} {'comp':>6} {'radσ':>6}   판정")
    lo = min(r[2] for r in ref) if ref else 0
    print(f"  기준(눈으로 통과한 둘): comp ≥ {lo:.2f}\n")
    for name, fill, comp, rsg, n in rows:
        ok = "○" if comp >= lo * 0.85 else "● 접시"
        print(f"{name:28} {fill:6.2f} {comp:6.2f} {rsg:6.2f}   {ok}")
