#!/usr/bin/env python3
"""V-47 · 「잿빛 야영터」 바닥 타일을 다시 그린다 (32×32 · 이어 붙는다).
     python3 tools/v47_make_camp.py [나갈곳=assets/floor/camp_tile.png]

   ★ 손이 아니라 **자로 그린다** — V-46 의 `v46_make_bones.py` 와 같은 결이다.
     문턱을 못 넘으면 값만 고쳐 다시 뽑을 수 있어야 한다.

   ★ 무엇이 틀렸었나 — 옛 타일은 **95%가 한 색**이고 자국이 여섯 개뿐인데 그 여섯이
     전부 **중앙값 아래**(밝은잉크 0.0)인 진한 금이었다. 빈 들에 자국 몇 개면 눈이
     그 자국의 **자리**를 외운다 — 32px 마다 같은 금이 서니 바닥이 벽지가 된다.

   ★ 그래서 반대로 짠다. 「자국을 더 그린다」가 아니라 **들을 없앤다**:
     ① 밟아 다진 재 얼룩 — 두 옥타브 **잔** 주파(전면 ±5)      ← 빈 들을 지운다
     ② 결 — 화소마다 ±3                                        ← 매끈한 판때기를 지운다
     ③ 재 무더기 — 밝은 얼룩(+14~20)                           ← **중앙값 위**를 만든다
     ④ 숯 부스러기 — 어두운 점 스물 몇 개(-22~-34)             ← 야영터다움
     ⑤ 금은 **하나만**, 그것도 얕게                            ← 옛 자국의 자리를 안 물려받는다

   ★ **첫 판은 다른 벽지가 됐다** — 큰 얼룩(4칸 저주파 · 반지름 6.5 잿더미)을 넣었더니
     덩어리결이 4.00 으로 튀어(좋은 타일 1.14~2.65) 뒤집어 깔 때 **가로 띠**가 섰다.
     반복 하나를 다른 반복으로 바꾼 셈이다. 눈은 **큰 것의 되풀이**를 먼저 찾는다 —
     그래서 저주파는 깎고 잔결과 부스러기로 채운다.

   ★ **이어 붙어야 한다.** 저주파는 격자 좌표를 감싸 bilinear 로 키우고(주기 = 타일),
     점·금은 좌표에 modulo 를 건다. 안 그러면 타일 이음매에 실선이 생긴다.

   ★ **중앙 밝기는 옛것 그대로 119** — main.js 가 `loadFloor(..., 0.39, "camp", 1.15)` 로
     화면 밝기 48 에 맞춰 놓았다. 재료 밝기를 바꾸면 그 조율이 통째로 어긋난다.
"""
import sys
import numpy as np
from PIL import Image

N = 32
BASE = np.array([139.0, 117.0, 80.0])      # 옛 타일의 중앙 색 — 색은 물려받는다
TARGET_MED = 119.0                          # 옛 타일의 중앙 밝기(L)
rng = np.random.default_rng(4712)


def periodic(g, amp):
    """g×g 격자를 타일 크기로 **감싸서** 키운다 — 주기가 타일과 같아 이어 붙는다."""
    grid = rng.normal(0, 1, (g, g))
    ys = np.arange(N) * g / N
    xs = np.arange(N) * g / N
    y0 = np.floor(ys).astype(int); x0 = np.floor(xs).astype(int)
    fy = (ys - y0)[:, None]; fx = (xs - x0)[None, :]
    y1 = (y0 + 1) % g; x1 = (x0 + 1) % g
    a = grid[np.ix_(y0, x0)]; b = grid[np.ix_(y0, x1)]
    c = grid[np.ix_(y1, x0)]; d = grid[np.ix_(y1, x1)]
    out = (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy
    s = out.std() or 1.0
    return out / s * amp


def blob(v, cy, cx, r, amt, warm=0.0):
    """감싸 놓는 둥근 얼룩 — 가장자리를 부드럽게 떨군다."""
    yy = np.arange(N)[:, None]; xx = np.arange(N)[None, :]
    dy = np.minimum(np.abs(yy - cy), N - np.abs(yy - cy))
    dx = np.minimum(np.abs(xx - cx), N - np.abs(xx - cx))
    d = np.sqrt(dy ** 2 + dx ** 2)
    w = np.clip(1 - d / r, 0, 1) ** 1.5
    v[0] += w * amt
    v[1] += w * amt * (1 - warm * 0.25)
    v[2] += w * amt * (1 - warm * 0.55)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "assets/floor/camp_tile.png"

    # ① 밟아 다진 재 얼룩(저주파 두 옥타브) + ② 결
    v = periodic(8, 2.2) + periodic(16, 2.7) + rng.normal(0, 3.2, (N, N))
    ch = [v.copy(), v.copy() * 0.95, v.copy() * 0.80]      # 어두운 데가 더 차가워지게

    # ③ 재 무더기 — **중앙값 위**를 만드는 것들. 야영터의 식은 잿더미다.
    for _ in range(7):
        blob(ch, rng.uniform(0, N), rng.uniform(0, N), rng.uniform(2.2, 3.6),
             rng.uniform(12, 19), warm=-0.6)              # 재는 회백 — 파랑을 덜 깎는다
    # 불에 그을린 자리 — 넓고 얕은 어둠
    for _ in range(4):
        blob(ch, rng.uniform(0, N), rng.uniform(0, N), rng.uniform(3.0, 4.5),
             rng.uniform(-12, -8), warm=0.8)

    a = np.stack(ch, -1) + BASE

    # ④ 숯 부스러기 — 한두 화소짜리. 감싸서 찍는다.
    for _ in range(26):
        y, x = rng.integers(0, N, 2)
        amt = rng.uniform(-34, -22)
        a[y % N, x % N] += np.array([amt, amt * 0.92, amt * 0.78])
        if rng.random() < 0.45:                            # 절반쯤은 두 화소로 이어 놓는다
            dy, dx = rng.integers(-1, 2, 2)
            a[(y + dy) % N, (x + dx) % N] += np.array([amt, amt * 0.92, amt * 0.78]) * 0.7
    # 재 알갱이 — 밝은 점
    for _ in range(18):
        y, x = rng.integers(0, N, 2)
        amt = rng.uniform(14, 24)
        a[y % N, x % N] += np.array([amt, amt, amt * 0.9])

    # ⑤ 금 하나 — 얕게. 옛 타일의 세 금이 이 자리에서 벽지를 만들었다.
    y, x = rng.integers(0, N, 2)
    for i in range(7):
        y = (y + rng.integers(0, 2)) % N
        x = (x + 1) % N
        a[y, x] += np.array([-17, -15, -12])

    # 중앙 밝기를 옛것에 맞춘다 — 화면 조율(boost 0.39)을 안 건드리려고.
    L = a @ np.array([0.299, 0.587, 0.114])
    a += (TARGET_MED - np.median(L))
    a = np.clip(np.round(a), 0, 255).astype(np.uint8)

    img = Image.fromarray(np.dstack([a, np.full((N, N), 255, np.uint8)]))
    img.save(out)
    print("wrote", out)


if __name__ == "__main__":
    sys.exit(main())
