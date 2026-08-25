#!/usr/bin/env python3
"""V-46 — `assets/fx/corpse_bones.png` 을 다시 그린다.

  옛 그림은 **해골을 가운데 놓고 뼈를 사방으로 부챗살처럼** 펼친 문장(紋章)이었다.
  위에서 내려다본 판에 눕히면 「무너진 몸」이 아니라 「바닥에 박은 훈장」으로 읽힌다
  (tools/v46_bones.py: 이심률 1.12 · 각도쏠림 1.73 · 면화소 1333 — 다른 두 장의 4.5배).

  다시 그리는 원칙 셋:
    ① **한 축을 따라 눕힌다** — 머리 · 갈비 · 골반 · 다리뼈가 왼쪽에서 오른쪽으로 간다.
       (그리는 쪽이 rot 을 무작위로 걸므로 축 방향 자체는 아무래도 좋다. 축이 **있다는
       것**이 중요하다.)
    ② **잉크를 줄인다** — 뼈는 판에서 가장 밝은 것이라 넓으면 그것만 보인다.
       (다만 **너무 가늘면 긁힌 자국**이 된다. 첫 판이 그랬다 — 1:1 로 찍어 보고
       대를 1.25 배 굵혔다. 그래도 옛 그림의 3분의 1 이다.)
    ③ **어두운 테를 두르고 면은 두 단으로** — V-45 의 뼛조각과 같은 결
       (테가 있어야 갈색 바닥 위에서 형태가 산다).

  사용: python3 tools/v46_make_bones.py [out.png]
"""
import sys, math
from PIL import Image

N = 64
OUT = sys.argv[1] if len(sys.argv) > 1 else "assets/fx/corpse_bones.png"

LINE = (5, 3, 3, 255)
LIT  = (246, 245, 245, 255)
MAIN = (226, 219, 210, 255)
MID  = (183, 169, 147, 255)
DARK = (150, 135, 112, 255)
HOLE = (21, 3, 28, 255)      # 눈구멍 — 옛 그림에도 있던 보랏빛 검정

fill = {}      # (x,y) -> color
def put(x, y, c):
    x, y = int(round(x)), int(round(y))
    if 0 <= x < N and 0 <= y < N:
        fill[(x, y)] = c

def disc(cx, cy, r, c):
    for y in range(int(cy - r) - 1, int(cy + r) + 2):
        for x in range(int(cx - r) - 1, int(cx + r) + 2):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                put(x, y, c)

def bar(x0, y0, x1, y1, w, c):
    """굵은 선 — 뼈대 하나."""
    L = max(1, int(math.hypot(x1 - x0, y1 - y0) * 3))
    for i in range(L + 1):
        t = i / L
        disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w / 2, c)

def bone(x0, y0, x1, y1, w=2.0, knob=1.35):
    """양 끝에 마디가 붙은 긴 뼈. 마디는 **작게** — 크면 아령이 된다(V-45 에서 겪었다)."""
    bar(x0, y0, x1, y1, w, MAIN)
    dx, dy = x1 - x0, y1 - y0
    d = max(1e-6, math.hypot(dx, dy)); nx, ny = -dy / d, dx / d
    for (ex, ey) in ((x0, y0), (x1, y1)):
        disc(ex + nx * w * 0.42, ey + ny * w * 0.42, w * knob / 2, MAIN)
        disc(ex - nx * w * 0.42, ey - ny * w * 0.42, w * knob / 2, MAIN)

def arc(cx, cy, r, a0, a1, w=1.6):
    """갈비 한 대."""
    steps = 26
    for i in range(steps + 1):
        a = a0 + (a1 - a0) * i / steps
        disc(cx + math.cos(a) * r, cy + math.sin(a) * r * 0.72, w / 2, MAIN)

# ══ 왼쪽: 두개골 (조금 기울여 — 똑바로 놓으면 다시 문장이 된다) ══
SK = (16.0, 33.5)
disc(SK[0], SK[1], 6.2, MAIN)
disc(SK[0] + 4.0, SK[1] + 3.0, 4.2, MAIN)          # 턱 쪽으로 늘인다
for (ox, oy) in ((-1.6, -1.4), (2.2, 0.2)):        # 눈구멍 둘 — 기울여 박는다
    disc(SK[0] + ox, SK[1] + oy, 1.7, HOLE)
put(SK[0] + 0.4, SK[1] + 2.4, HOLE)                # 코
put(SK[0] + 1.2, SK[1] + 2.4, HOLE)
for i in range(4):                                  # 이빨 — 턱금 하나면 해골로 읽힌다
    put(SK[0] + 2.0 + i * 1.6, SK[1] + 5.4 + i * 0.5, HOLE)

# ══ 가운데: 등뼈 + 갈비 (축을 따라 · 좌우로 짧게) ══
bar(24.5, 34.0, 35.0, 32.8, 2.5, MID)
# ★ 처음엔 위·아래 갈비를 같은 길이로 세 대씩 넣었더니 **사다리(가로 눈금)** 로 읽혔다.
#   길이를 층지게 주고 아래쪽을 짧게 눌러 **가슴통**이 되게 한다.
for i, cx in enumerate((26.8, 30.0, 33.2)):
    r = 5.6 - i * 1.0
    arc(cx, 33.6, r, -2.45, -0.90, 2.3)             # 위쪽 갈비 — 길다
    arc(cx, 34.2, r * 0.62, 0.95, 2.30, 2.1)        # 아래쪽 갈비 — 땅에 눌렸다

# ══ 오른쪽: 골반 + 다리뼈 둘 (조금 벌려 눕힌다) ══
bar(37.5, 33.5, 41, 33.5, 5.2, MID)
# 다리 하나는 **꺾여 있다** — 나란히 두 대면 다시 문장이 된다
bone(42, 31.0, 49.5, 27.8, 2.9)
bone(49.5, 27.8, 55, 30.5, 2.7)
bone(42, 36.0, 53, 40.0, 2.9)
# 팔뼈 하나는 몸에서 떨어져 나가 위에 걸쳐 눕는다 — 「무너졌다」가 읽힌다
bone(24.5, 26.5, 34.5, 24.2, 2.4)

# ══ 테 두르기 · 면 두 단 ══
img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
px = img.load()
for (x, y), c in fill.items():
    px[x, y] = c
# 그림자/빛 — 왼쪽 위가 트였으면 밝게, 오른쪽 아래가 트였으면 어둡게
shade = {}
for (x, y), c in fill.items():
    if c is HOLE:
        continue
    if (x - 1, y - 1) not in fill:
        shade[(x, y)] = LIT
    elif (x + 1, y + 1) not in fill:
        shade[(x, y)] = DARK
    elif (x + 1, y) not in fill or (x, y + 1) not in fill:
        shade[(x, y)] = MID
for (x, y), c in shade.items():
    px[x, y] = c
# 테는 **바깥 한 겹**만 — V-44 에서 배운 대로 판때기가 아니라 테여야 한다
for y in range(N):
    for x in range(N):
        if (x, y) in fill:
            continue
        if any((x + dx, y + dy) in fill for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1),
                                                       (1, 1), (1, -1), (-1, 1), (-1, -1))):
            px[x, y] = LINE

img.save(OUT)
bb = img.getbbox()
print("wrote", OUT, img.size, "bbox", bb, "%dx%d" % (bb[2] - bb[0], bb[3] - bb[1]))
