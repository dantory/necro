#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""바닥이 «밋밋»한지 세 축으로 재는 자. (V-176)

    python3 tools/hs_flatruler.py <태그> [<태그2> ...]

★ 왜 축이 셋인가 — 컷을 크게 열어 보고 나서 「밋밋」의 정체가 바뀌었다.
  바닥은 잡티가 없어서 밋밋한 게 아니라 **같은 무늬가 벽지처럼 되풀이돼서** 밋밋하다
  (`crypt_tile.png` 32px 를 Z=1.5 로 깔아 화면 48px 마다 같은 그림이 온다).
  그러니 재야 할 것은 「잡티 양」이 아니라 **「한 칸 밀었을 때 얼마나 똑같은가」**다.
  ★ [[cause-written-in-the-item-is-a-guess]] — 항목엔 「덮는 넓이를 키운다」고만 적혀 있었다.

  ① 덮음%  — 방 안 얼룩의 «불투명 픽셀» 넓이 합 ÷ 방 넓이. PNG 알파를 s 크기로
             세고 map.js 의 a 를 곱한다. 겹침은 안 뺀다(겹치면 이 수가 과대).
  ② 반복   — 바닥만 남긴 조각을 **48px(타일 한 칸) 민 자기 자신**과 견준 상관계수.
             1.00 이면 완벽한 벽지, 0 에 가까울수록 칸이 끊긴 것. 빛의 기울기는
             큰 흐림을 빼서 지운다(안 지우면 밝기 경사가 상관을 1 쪽으로 끌어올린다).
  ③ 결σ    — 그 고역통과 조각의 표준편차. 무늬가 «얼마나 진한가».

  자는 주인공 양옆 두 조각에서 잰다 — 빛이 주인공 중심이라 그를 치우면 방이
  캄캄해지고(첫 판 평균L 6.6), 모듈이라 drawPlayer 를 못 지운다.
"""
import json, os, sys
from PIL import Image, ImageFilter

TILE_PX = 48           # 32px 타일 × HSZ 1.5

def lum_img(im):
    return im.convert("RGB").convert("L")

def cover(tag):
    info = json.load(open(f"tmp/hs_floor_{tag}.json"))
    tot, cache = 0.0, {}
    for d in info["decals"]:
        p = os.path.join("assets", d["img"])
        if not os.path.exists(p): p = os.path.join("hs/assets", d["img"])
        if not os.path.exists(p):
            print(f"   ! 없는 그림 {d['img']}"); continue
        if p not in cache:
            im = Image.open(p).convert("RGBA")
            al = im.split()[3]
            cache[p] = sum(al.getdata())/255.0/(im.size[0]*im.size[1])
        tot += cache[p] * (d["s"]**2) * d["a"]
    return info, 100.0*tot/info["area"]

def boxes(im):
    W, H = im.size; cx, cy = W//2, H//2
    return [im.crop((cx-360, cy-140, cx-120, cy+140)),
            im.crop((cx+120, cy-140, cx+360, cy+140))]

def highpass(c):
    g = lum_img(c)
    lo = g.filter(ImageFilter.GaussianBlur(24))     # 빛의 기울기
    a, b = list(g.getdata()), list(lo.getdata())
    return [a[i]-b[i] for i in range(len(a))], g.size

def corr_shift(v, size, dx, dy):
    w, h = size
    xs, ys = [], []
    for y in range(h-dy):
        for x in range(w-dx):
            xs.append(v[y*w+x]); ys.append(v[(y+dy)*w + x+dx])
    n = len(xs)
    mx, my = sum(xs)/n, sum(ys)/n
    sxy = sum((xs[i]-mx)*(ys[i]-my) for i in range(n))
    sxx = sum((xs[i]-mx)**2 for i in range(n)); syy = sum((ys[i]-my)**2 for i in range(n))
    return sxy/((sxx*syy) ** 0.5) if sxx > 0 and syy > 0 else 0.0

def texture(tag):
    im = Image.open(f"tmp/hs_floor_{tag}.png")
    rep, sds = [], []
    for c in boxes(im):
        v, size = highpass(c)
        rep.append((corr_shift(v, size, TILE_PX, 0) + corr_shift(v, size, 0, TILE_PX)) / 2)
        m = sum(v)/len(v)
        sds.append((sum((t-m)**2 for t in v)/len(v)) ** 0.5)
    return sum(rep)/len(rep), sum(sds)/len(sds)

print(f"{'태그':<10} {'방넓이':>8} {'얼룩':>5} {'덮음%':>7} {'반복':>7} {'결σ':>7}")
for tag in sys.argv[1:]:
    info, cv = cover(tag)
    rep, sd = texture(tag)
    print(f"{tag:<10} {info['area']:>8} {info['n']:>5} {cv:>7.1f} {rep:>7.3f} {sd:>7.2f}")
