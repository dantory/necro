#!/usr/bin/env python3
"""V-47 · 바닥 타일이 «벽지»로 읽히는가를 잰다.
     python3 tools/v47_lattice.py [타일.png ...]      (안 주면 구역 일곱 장 전부)

   ★ 왜 판을 굴리지 않고 **파일**을 재는가 — 물을 것은 「이 바닥이 무늬로 읽히는가」다.
     판을 굴리면 층마다 소품·시체·빛이 달라 잡음만 얹힌다([[same-seed-is-not-same-run]]).
     타일 한 장이면 답이 나온다(잡음 0).

   ★ 두 수를 든다. 벽지의 조건은 「자국이 있다」가 아니라 **「빈 들에 자국 몇 개」**다:
     ① **민무늬%** — 중앙값에서 ±2 안쪽인 화소. 바닥이 통째로 한 색이면 100 에 붙는다.
     ② **잉크%**   — 중앙값에서 10 이상 떨어진 화소. 무늬가 얼마나 깔려 있나.
     눈이 격자를 찾는 것은 ①이 높고 ②가 낮을 때다 — 빈 들이 넓을수록 몇 안 되는
     자국이 **좌표로** 읽힌다.

   ★ **문턱은 양성 표본으로 맞췄다**([[pixel-verification-calibration]]).
     눈으로 봐서 멀쩡한 여섯 장(crypt·abyss·bone·rot·sanctum·blood)이 전부 통과하고
     camp 만 떨어지는 자리에 뒀다 — 바닥과 문턱이 멀찍이 떨어진다
     ([[floor-far-from-threshold]]).
       민무늬 ≤ 88%   (좋은 것 49~84 · camp 95)
       잉크   ≥ 8%    (좋은 것 10.7~28.6 · camp 4.4)

   ★ 셋째 수 **밝은잉크%** 는 판정에 안 쓴다 — 「판때기냐」를 말해 주는 참고값이다.
     camp 은 중앙값 **위**가 한 화소도 없다(밝은잉크 0.0) — 파인 자국만 있고 도드라진
     것이 없으니 «칠판에 분필로 그은 것»이 된다.
"""
import sys
from collections import deque
import numpy as np
from PIL import Image

FLAT_MAX, INK_MIN = 88.0, 8.0
ZONES = ["crypt", "rot", "bone", "camp", "sanctum", "blood", "abyss"]


def measure(path):
    im = Image.open(path).convert("L")
    a = np.asarray(im, dtype=float)
    med = np.median(a)
    d = a - med
    ad = np.abs(d)
    flat = (ad <= 2).mean() * 100
    ink = (ad >= 10).mean() * 100
    bright = (d >= 6).mean() * 100
    # 자국 덩어리 — 타일은 이어 붙으므로 **감싸서** 센다(가장자리 자국이 둘로 갈리면 안 된다)
    m = ad >= 10
    H, W = m.shape
    seen = np.zeros_like(m)
    sizes = []
    for y in range(H):
        for x in range(W):
            if m[y, x] and not seen[y, x]:
                q = deque([(y, x)]); seen[y, x] = True; s = 0
                while q:
                    cy, cx = q.popleft(); s += 1
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = (cy + dy) % H, (cx + dx) % W
                        if m[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True; q.append((ny, nx))
                sizes.append(s)
    sizes.sort(reverse=True)
    return dict(flat=flat, ink=ink, bright=bright, marks=len(sizes),
                med=med, ok=(flat <= FLAT_MAX and ink >= INK_MIN))


def main():
    args = sys.argv[1:] or ["assets/floor/%s_tile.png" % z for z in ZONES]
    print("%-30s %8s %7s %9s %7s %6s  %s"
          % ("타일", "민무늬%", "잉크%", "밝은잉크%", "자국수", "중앙", "판정"))
    bad = []
    for p in args:
        r = measure(p)
        print("%-30s %8.1f %7.1f %9.1f %7d %6.0f  %s"
              % (p, r["flat"], r["ink"], r["bright"], r["marks"], r["med"],
                 "통과" if r["ok"] else "★ 벽지"))
        if not r["ok"]:
            bad.append(p)
    print("\n문턱: 민무늬 ≤ %.0f%% · 잉크 ≥ %.0f%%" % (FLAT_MAX, INK_MIN))
    print("판정: " + ("통과 — 벽지로 읽히는 바닥이 없다" if not bad
                    else "미달 — " + ", ".join(bad)))
    return 0 if not bad else 1


if __name__ == "__main__":
    sys.exit(main())
