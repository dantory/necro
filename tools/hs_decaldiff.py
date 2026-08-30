#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""얼룩이 «서로 다른가»를 재는 자. (V-179)

여태 자 둘은 얼룩을 **바닥과** 견주기만 했다(밝기 · 꼴). 그러다 보니 «바닥에 잘
녹아든 것»만 통과하고, **통과한 것끼리 똑같아지는 것**은 아무도 안 봤다.
V-179 가 컷을 열어 보고서야 걸렸다 — `stain`·`dust`·새 `pebble` 셋이 다 같은
「부드러운 검은 얼룩」이었다. 자는 그때도 셋 다 OK 를 냈다.
★ [[threshold-and-ruler-must-match]] — 과녁이 「바닥에 녹아듦」 하나뿐이면
  그 축의 끝은 «전부 같은 얼룩» 이다.

  IoU  : 알파 실루엣 겹침. **0.7 이 넘으면 같은 그림 취급.**
  속 결: 이웃 픽셀 밝기차 평균. 선(crack)은 크고, 번진 얼룩은 작다.
"""
import itertools, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DUP = 0.70

def feat(p):
    im = Image.open(p).convert("RGBA").resize((64, 64), Image.BILINEAR)
    px = im.load()
    a = [px[x, y][3] / 255 for y in range(64) for x in range(64)]
    l = [0.299 * px[x, y][0] + 0.587 * px[x, y][1] + 0.114 * px[x, y][2]
         for y in range(64) for x in range(64)]
    g = [abs(l[y * 64 + x] - l[y * 64 + x + 1]) + abs(l[y * 64 + x] - l[(y + 1) * 64 + x])
         for y in range(63) for x in range(63) if px[x, y][3] > 25]
    return a, sum(1 for v in a if v > 0.1) / len(a), (sum(g) / len(g) if g else 0.0)

if __name__ == "__main__":
    args = sys.argv[1:] or ["assets/decal/stain.png", "assets/decal/crack.png",
                            "assets/decal/dust.png"]
    F = {}
    for p in args:
        ap = p if os.path.isabs(p) else os.path.join(ROOT, p)
        F[os.path.basename(p)[:-4]] = feat(ap)
    print(f"{'키':<12} {'덮음':>7} {'속 결':>8}")
    for k, (_, cov, g) in F.items():
        print(f"{k:<12} {cov * 100:6.1f}% {g:7.2f}")
    print(f"\n실루엣 겹침(IoU) — {DUP} 넘으면 «같은 그림»")
    bad = 0
    for x, y in itertools.combinations(F, 2):
        ax, ay = F[x][0], F[y][0]
        iou = sum(min(p, q) for p, q in zip(ax, ay)) / sum(max(p, q) for p, q in zip(ax, ay))
        mark = "  ★ 겹침" if iou > DUP else ""
        bad += iou > DUP
        print(f"  {x:<12} vs {y:<12} {iou:5.3f}{mark}")
    print(f"\n겹치는 짝 {bad}")
