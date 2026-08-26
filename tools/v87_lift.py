#!/usr/bin/env python3
"""**V-87 — 어두워서 안 보이는 트리 그림을 «있는 그대로» 끌어올린다.**

`assets/ui/tree/ghoul.png` 는 그림이 없는 게 아니라 **거의 검은 자주색으로 그려져**
있었다(팔레트 25색 · 몸통이 밝기 7~9 · 가장 밝은 점이 79). 칸 바탕이 밝기 9~21 이라
몸통과 바탕이 **같은 색**이고, 잠긴 칸의 `opacity:.55 · grayscale(1)` 를 지나면
사람 눈에는 **빈칸**이 된다(`tools/v87_dimicon.mjs` 로 잰 뜸 4.9 · 봉우리 56 —
이웃 스물여섯 칸 중 봉우리가 85 아래인 것이 이것뿐이다).

그림을 다시 굽지 않고 **밝기 곡선만** 올린다. 까닭:
  · 모양은 멀쩡하다 — 땅에서 솟는 손톱 손이고 「구울 되살리기」에 맞는 그림이다.
  · 다시 구우면 **모양이 바뀐다**(PixelLab 은 같은 그림을 두 번 안 준다). 잃을 것이
    없는 자리에서 굳이 걸 도박이 아니다.
  · 채널마다 같은 감마를 먹이므로 **빛깔(자주)이 남는다** — 회색으로 바래지 않는다.

곡선: `out = clip(255 * (in/255) ** G * M)`  (G=0.42 · M=1.2)
  몸통 8 → 68 · 중간 42 → 143 · 가장 밝은 89 → 197.
투명한 자리(alpha)는 **한 톨도 안 건드린다** — 실루엣이 그대로여야 한다.

    python3 tools/v87_lift.py            # 굽고 옛 그림을 _rejected 로 옮긴다
    python3 tools/v87_lift.py --dry      # 재기만 한다
"""
import sys, os
from PIL import Image

SRC = "assets/ui/tree/ghoul.png"
OLD = "_rejected/tree_ghoul_dark.png"
G, M = 0.42, 1.20
dry = "--dry" in sys.argv


def lum(r, g, b):
    return 0.299 * r + 0.587 * g + 0.114 * b


def stats(im):
    px, vs = im.load(), []
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a > 20:
                vs.append(lum(r, g, b))
    vs.sort()
    return round(sum(vs) / len(vs), 1), round(vs[int(len(vs) * .9)], 1), round(vs[-1], 1)


src = Image.open(SRC).convert("RGBA")
before = stats(src)

out = Image.new("RGBA", src.size)
sp, op = src.load(), out.load()
for y in range(src.height):
    for x in range(src.width):
        r, g, b, a = sp[x, y]
        if a == 0:                       # 투명한 자리는 그대로 둔다
            op[x, y] = (r, g, b, a)
            continue
        op[x, y] = tuple(min(255, round(255 * (c / 255) ** G * M)) for c in (r, g, b)) + (a,)
after = stats(out)

print(f"  {'':10} {'평균':>6} {'p90':>6} {'최대':>6}")
print(f"  {'전':10} {before[0]:>6} {before[1]:>6} {before[2]:>6}")
print(f"  {'후':10} {after[0]:>6} {after[1]:>6} {after[2]:>6}")
if dry:
    print("  (--dry — 안 썼다)")
    sys.exit(0)
os.makedirs(os.path.dirname(OLD), exist_ok=True)
if not os.path.exists(OLD):
    src.save(OLD)                        # 되돌아갈 자리 · DIM_OLD 문이 이걸 쓴다
    print(f"  옛 그림 → {OLD}")
out.save(SRC)
print(f"  새 그림 → {SRC}")
