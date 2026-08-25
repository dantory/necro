#!/usr/bin/env python3
"""V-46 자 — 「누운 시체」 그림이 «몸»으로 읽히는가 «문장(紋章)»으로 읽히는가.

  누워 있는 몸은 **한 축을 따라** 길게 눕는다. 방사형 문장은 가운데에서
  사방으로 뻗는다. 그래서 두 수로 가른다:
    ① 이심률 √(λ1/λ2) — 잉크의 주성분 분석. 1.0 이면 동그라미, 클수록 길쭉.
    ② 각도 쏠림 — 중심 둘레 36 칸 각도 히스토그램의 max/mean.
       방사형은 어느 각도에나 고르게 있어 1 에 가깝고, 누운 몸은 두 쪽에 몰린다.

  ★ 자를 **양성 표본으로 먼저 맞췄다.** corpse_small/large 는 눈으로 보면 제대로
    누운 몸인데, 처음 정한 문턱(ecc 1.55 · peak 1.9 · 빈방향 6)은 **그 둘도 떨궜다** —
    자가 아니라 문턱이 틀린 것이다([[floor-far-from-threshold]] ·
    [[silent-zero-is-not-an-observation]]).
    실측: small ecc 1.65/peak 3.68 · large 1.48/2.82 · bones 1.12/1.73.
    그래서 문턱은 **ecc 1.40 · peak 2.50** — 좋은 둘은 여유 있게 넘고 bones 는
    두 수 다 크게 못 미친다. 「빈 방향」은 좋은 둘 사이에서도 3 대 6 으로 갈려
    (small 은 몸이 통짜라 둘레가 안 빈다) **판정에서 뺐다 — 참고로만 찍는다.**

  사용: python3 tools/v46_bones.py [파일...]   (기본: assets/fx/corpse_*.png)
"""
import sys, math, glob
from PIL import Image

def measure(path):
    im = Image.open(path).convert("RGBA")
    W, H = im.size
    px = im.load()
    pts = []
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 40:
                continue
            # 어두운 테는 빼고 **면**만 센다 — 테는 모양을 두 번 세게 만든다
            if r + g + b < 150:
                continue
            pts.append((x + 0.5, y + 0.5))
    if len(pts) < 20:
        return None
    n = len(pts)
    cx = sum(p[0] for p in pts) / n
    cy = sum(p[1] for p in pts) / n
    sxx = sum((p[0] - cx) ** 2 for p in pts) / n
    syy = sum((p[1] - cy) ** 2 for p in pts) / n
    sxy = sum((p[0] - cx) * (p[1] - cy) for p in pts) / n
    tr, det = sxx + syy, sxx * syy - sxy * sxy
    disc = max(0.0, tr * tr / 4 - det) ** 0.5
    l1, l2 = tr / 2 + disc, max(1e-9, tr / 2 - disc)
    ecc = (l1 / l2) ** 0.5
    B = 36
    hist = [0] * B
    for x, y in pts:
        a = math.atan2(y - cy, x - cx)
        hist[int((a + math.pi) / (2 * math.pi) * B) % B] += 1
    mean = n / B
    peak = max(hist) / mean
    # 「빈 방향」— 잉크가 거의 없는 각도 칸의 수. 방사형은 0 에 가깝다
    empty = sum(1 for h in hist if h < mean * 0.25)
    bb = im.getbbox()
    return dict(n=n, ecc=ecc, peak=peak, empty=empty,
                bb="%dx%d" % (bb[2] - bb[0], bb[3] - bb[1]))

files = sys.argv[1:] or [f for f in sorted(glob.glob("assets/fx/corpse_*.png"))
                         if not f.endswith("_old.png")]   # _old 는 자가 쓰는 옛 그림이다
print("%-28s %6s %7s %7s %7s %8s" % ("파일", "면화소", "이심률", "각도쏠림", "빈방향", "크기"))
bad = []
for f in files:
    m = measure(f)
    if not m:
        print("%-28s  (잉크 없음)" % f); bad.append(f); continue
    ok = m["ecc"] >= 1.40 and m["peak"] >= 2.50
    print("%-28s %6d %7.2f %7.2f %7d %8s  %s"
          % (f, m["n"], m["ecc"], m["peak"], m["empty"], m["bb"], "ok" if ok else "MUNJANG"))
    if not ok:
        bad.append(f)
print("판정:", "통과 — 전부 «누운 몸»으로 읽힌다" if not bad
      else "미달 — 문장처럼 읽히는 것: " + ", ".join(bad))
sys.exit(1 if bad else 0)
