#!/usr/bin/env python3
"""건물 스프라이트에서 **제 바닥(base plate)** 을 잘라낸다.

병수님: "건물이 지형과 너무 동떨어진 느낌인데" → "여전히 떠있어 보이는데".

바로 앞에서 **땅 쪽을 고쳤다** — 발치를 맨땅으로 만들고, 톤을 맞추고, 그늘을 깔았다.
그래도 떠 보였다. 스프라이트를 3배로 확대해 보고서야 이유가 분명해졌다:

  · 상인 = 회색 판석 **다이아몬드**. 둘레에 검은 외곽선이 한 줄 둘러 있다
  · 대장간 = 잔디 위에 흙 **단면이 보이는 지형 덩어리**. 말 그대로 떠 있는 섬이다

두 번째가 결정적이다. 흙 두께가 그려진 블록은 **무슨 짓을 해도 바닥에 안 붙는다** —
우리 땅 위에 또 다른 땅이 얹혀 있으니까. 게다가 그 판이 place() 가 깐 접지 그림자를
통째로 덮어서, 그림자는 그리고 있었지만 **한 번도 보인 적이 없었다.**

그래서 이번엔 **판 자체를 없앤다.** (같은 자리를 두 번 고치게 되면 값이 아니라
구조를 의심한다 — 앞서 하단 UI 이음매에서 배운 것과 같다.)

**어떻게 자르나** — 색으로 훑는 게 아니라 **번져 나가며** 지운다:

  ① 씨앗 = 각 열의 **맨 아래 불투명 픽셀**. 판은 스프라이트 폭을 가로지르므로
     맨 아래는 어디를 찍어도 판이다
  ② 씨앗 색들을 팔레트로 삼아 8방향으로 번진다. 판 위에 **얹힌 것**(통·모루·의자)은
     색이 팔레트 밖이라 번짐이 거기서 멈춘다 — 그래서 소품이 살아남는다
  ③ 검은 외곽선은 **들어가되 지나가지 못하게** 한다. 판의 외곽선과 건물의 외곽선은
     서로 이어져 있어서, 통과를 허용하면 건물 외곽선을 타고 번져 그림을 갉아먹는다
  ④ 마지막으로 **매달린 실**을 턴다 — 이웃이 거의 다 비어 버린 어두운 픽셀은
     판이 사라진 자리에 남은 외곽선 조각이다

원본은 `*_plated.png` 로 남긴다. 되돌릴 수 있어야 실험이다.

  python3 tools/cut_plate.py            # shop forge
  python3 tools/cut_plate.py shop       # 골라서
"""
import os, sys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
TOWN = os.path.join(ROOT, "assets", "town")

TARGETS = ["shop", "forge"]

TOL = 30          # 팔레트와의 색 거리(채널 최대차) — 넘으면 「얹힌 것」으로 본다
DARK = 46         # 이 밝기 아래는 외곽선으로 친다


def luma(p):
    return (p[0] * 299 + p[1] * 587 + p[2] * 114) // 1000


def cut(name):
    src = os.path.join(TOWN, name + ".png")
    keep = os.path.join(TOWN, name + "_plated.png")
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    px = im.load()
    if not os.path.exists(keep):
        im.save(keep)

    # ── ① 씨앗 ── 각 열의 맨 아래 불투명 픽셀. 맨 아래 한 줄은 외곽선이라 어두우니
    #    **몇 픽셀 위까지** 함께 씨앗으로 잡아야 판의 진짜 색이 들어온다.
    seeds = []
    for x in range(w):
        for y in range(h - 1, -1, -1):
            if px[x, y][3] > 40:
                for dy in range(0, 5):
                    if y - dy >= 0 and px[x, y - dy][3] > 40:
                        seeds.append((x, y - dy))
                break
    if not seeds:
        print(f"  {name}: 판을 못 찾음"); return

    # ── ②③ 번짐 ── **온 색을 기준으로** 한 칸씩 번진다(고정 팔레트가 아니라).
    #    판석의 밝은 이음매처럼 색이 서서히 변하는 곳도 따라간다. 대신 어두운
    #    외곽선은 **들어가되 지나가지 못하므로** 건물 쪽으로는 넘어가지 못한다.
    gone = [[False] * h for _ in range(w)]
    stack = []
    for (x, y) in seeds:
        if not gone[x][y]:
            gone[x][y] = True; stack.append((x, y))
    while stack:
        x, y = stack.pop()
        if luma(px[x, y]) < DARK:
            continue                                  # 외곽선 — 여기서 멈춘다
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                nx, ny = x + dx, y + dy
                if not (0 <= nx < w and 0 <= ny < h) or gone[nx][ny]:
                    continue
                q, p = px[nx, ny], px[x, y]
                if q[3] <= 40:
                    continue
                near = max(abs(q[i] - p[i]) for i in range(3)) <= TOL
                if near or luma(q) < DARK:
                    gone[nx][ny] = True; stack.append((nx, ny))

    n = 0
    for x in range(w):
        for y in range(h):
            if gone[x][y]:
                px[x, y] = (0, 0, 0, 0); n += 1

    # ── ④ 매달린 실 ── 판이 사라진 자리에 남은 외곽선 조각
    for _ in range(4):
        drop = []
        for x in range(w):
            for y in range(h):
                p = px[x, y]
                if p[3] <= 40 or luma(p) >= DARK:
                    continue
                empty = 0
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        if dx == dy == 0: continue
                        nx, ny = x + dx, y + dy
                        if not (0 <= nx < w and 0 <= ny < h) or px[nx, ny][3] <= 40:
                            empty += 1
                if empty >= 5:
                    drop.append((x, y))
        if not drop:
            break
        for (x, y) in drop:
            px[x, y] = (0, 0, 0, 0); n += 1

    # ── ④' 갇힌 풀 ── 외곽선에 둘러싸여 번짐이 못 들어간 잔디 조각이 남는다.
    #    두 건물 어디에도 **초록은 없다**(나무는 갈색, 돌은 회색, 차양은 노랑) —
    #    그러니 초록으로 기우는 픽셀은 남김없이 판의 잔해다.
    for x in range(w):
        for y in range(h):
            p = px[x, y]
            if p[3] > 40 and p[1] > p[0] + 12 and p[1] > p[2] + 12:
                px[x, y] = (0, 0, 0, 0); n += 1

    # ── ⑤ 부스러기와 실루엣 테두리 ── 판이 사라지면 두 가지가 남는다:
    #    **낱알**(길에 박혀 있던 자갈 몇 픽셀)과 **판의 윗면 테두리**(가늘고 긴 선).
    #    덩어리로 묶어서 본다 — 작으면 낱알이고, 넓게 퍼졌는데 속이 비었으면 선이다.
    #    (소품은 작아도 속이 꽉 차 있어서 살아남는다.)
    seen = [[False] * h for _ in range(w)]
    for sx in range(w):
        for sy in range(h):
            if seen[sx][sy] or px[sx, sy][3] <= 40:
                continue
            comp, st = [], [(sx, sy)]
            seen[sx][sy] = True
            while st:
                x, y = st.pop(); comp.append((x, y))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h and not seen[nx][ny] \
                           and px[nx, ny][3] > 40:
                            seen[nx][ny] = True; st.append((nx, ny))
            xs = [c[0] for c in comp]; ys = [c[1] for c in comp]
            bw, bh = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
            fill = len(comp) / (bw * bh)
            if len(comp) < 24 or (fill < 0.12 and bw + bh > 60):
                for (x, y) in comp:
                    px[x, y] = (0, 0, 0, 0); n += 1

    im.save(src)
    rows = [y for y in range(h) if any(px[x, y][3] > 40 for x in range(w))]
    print(f"  {name}: {n}px 지움 · 남은 세로 {rows[0]}~{rows[-1]} (원래 0~{h-1})")


if __name__ == "__main__":
    only = [a for a in sys.argv[1:] if not a.startswith("--")] or TARGETS
    for n in only:
        cut(n)
