#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""얼룩이 «화면에서» 바닥과 얼마나 벌어지는지 재는 자. (V-174)
브라우저 없이 main.js 의 층을 그대로 다시 쌓는다:

    floorBase  = #241f1b  +  floor/crypt_tile.png @0.55
    decal      = 그 위에 PNG 를 alpha a 로
    floorTint  = rgba(94,66,42,0.26) 를 **둘 다** 위에

★ 재는 것은 **PNG 원본값이 아니라 화면값**이다. 원본으로 재면 분모가 달라 판정이
  뒤집힌다 — ★ [[threshold-and-ruler-must-match]] (V-173 이 그 자리에서 20 을 틀렸다).
"""
import glob, os, sys
from PIL import Image

BASE_HEX = (0x24, 0x1f, 0x1b)
TILE = "assets/floor/crypt_tile.png"
TILE_A = 0.55
TINT = (94, 66, 42, 0.26)
A_LO, A_HI = 0.42, 0.76          # map.js scatter 의 a 범위
LUM_BAND = 8.0                   # 화면 밝기차 허용 폭 (±)

def lum(c): return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
def over(dst, src, a):
    return tuple(dst[i] * (1 - a) + src[i] * a for i in range(3))

def floor_base():
    im = Image.open(TILE).convert("RGBA")
    px = im.load(); rs = gs = bs = n = 0
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            f = (a / 255.0) * TILE_A
            c = over(BASE_HEX, (r, g, b), f)
            rs += c[0]; gs += c[1]; bs += c[2]; n += 1
    return (rs / n, gs / n, bs / n)

def decal_screen(path, base, a_mid):
    """얼룩이 실제로 덮는 자리(알파>0)만 평균 내, 그 자리의 화면색을 돌려준다."""
    im = Image.open(path).convert("RGBA"); px = im.load()
    rs = gs = bs = 0.0; n = 0
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, al = px[x, y]
            if al == 0: continue
            f = (al / 255.0) * a_mid
            c = over(base, (r, g, b), f)
            rs += c[0]; gs += c[1]; bs += c[2]; n += 1
    if not n: return None, 0
    return (rs / n, gs / n, bs / n), n / (im.width * im.height)

def tinted(c):
    return over(c, TINT[:3], TINT[3])

if __name__ == "__main__":
    d = sys.argv[1] if len(sys.argv) > 1 else "assets/decal"
    scale = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0   # 알파 배율(손잡이 시험용)
    a_mid = (A_LO + A_HI) / 2 * scale
    base = floor_base()
    fs = tinted(base)
    print(f"바닥(화면)  밝기 {lum(fs):5.1f} · R−B {fs[0]-fs[2]:+5.1f}   [a={a_mid:.2f}]")
    print(f"{'키':<10} {'덮는율':>6} {'밝기':>7} {'차':>7} {'R−B':>7} {'차':>7}  판정")
    ok = 0; rows = 0
    for p in sorted(glob.glob(os.path.join(d, "*.png"))):
        c, cov = decal_screen(p, base, a_mid)
        if c is None: continue
        cs = tinted(c)
        dl = lum(cs) - lum(fs); drb = (cs[0] - cs[2]) - (fs[0] - fs[2])
        v = "OK" if abs(dl) <= LUM_BAND else ("밝다" if dl > 0 else "어둡다")
        rows += 1; ok += v == "OK"
        print(f"{os.path.basename(p):<10} {cov*100:5.1f}% {lum(cs):7.1f} {dl:+7.1f} "
              f"{cs[0]-cs[2]:7.1f} {drb:+7.1f}  {v}")
    print(f"\n띠: 화면 밝기차 ±{LUM_BAND:.0f} · 통과 {ok}/{rows}")
