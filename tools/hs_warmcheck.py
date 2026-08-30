#!/usr/bin/env python3
"""V-160 — «따뜻하게 구웠나»를 눈이 아니라 수로 판정한다.

병수님 2026-08-30 08:33: 「에셋 픽셀랩 써서 제대로 뽑아라」.
지금까지는 찬 회색으로 굽고 화면에서 `PROP_WARM` 필터로 덧칠했다 — 그건 분칠이다.

자: 불투명하고 보이는 픽셀의 평균 **R−B**.
  · 바닥 crypt +3.7 · bone +31.7 · rot +31.2  ← 방이 이 온도다
  · 제 색을 맨 앞에 세워 구운 상자 +47.0 · 화로 +51.8  ← 통한 것들
  · 공용 회색으로 구운 나머지 −8 ~ −27          ← 파랗다
문턱 +20 — 바닥의 따뜻한 쪽(bone/rot)에 닿는 자리. [[floor-far-from-threshold]]

밝기도 같이 본다. 색만 맞추고 어두워지면 «분칠»과 같은 병이다(필터가 밝기를 눌렀다).
"""
import glob, os, sys
from PIL import Image

# ★★ 1차 굽기(09:4x)가 이 자를 «통과»하고도 눈으로 보면 틀렸다 — R−B 를 +47~+79 로
#   올려 놓고 8/9 OK 가 나왔다. 문턱만 있고 **천장이 없었던** 탓이다.
#   목표는 「따뜻하게」가 아니라 **「바닥과 같은 온도로」** 다. 그러니 띠로 잰다:
#       bone +31.7 · rot +31.2 · blood +20.3 · crypt +3.7  → 방의 띠는 대략 +4 ~ +32
#   소품은 바닥보다 조금 더 따뜻해도 되니 위를 +42 까지 연다(상자 +47 은 나무라 예외).
#   밝기도 양쪽으로 막는다 — 어두워지면 탁하고, 밝아지면 어두운 방에서 «떠오른다».
WARM_MIN, WARM_MAX = 12.0, 42.0
# ★ 밝기의 아래쪽은 «옛것 대비»로 재면 안 된다 — **옛것이 틀렸을 때** 틀린 것이 기준이 된다.
#   bones2 옛값 148.9 는 「찬 흰색 해골」이라 목표가 아니다(형제 bones 는 115.3).
#   어두워짐이 진짜 문제인 까닭은 하나뿐이다 — **어두운 바닥에서 안 보이는 것**.
#   그러니 아래쪽은 바닥(crypt 밝기 43.0)과의 거리로 재고, 위쪽만 옛것 대비로 막는다
#   (1차 굽기가 +44~+81% 로 «떠올랐던» 그 자리).
FLOOR_LUM, LUM_MARGIN_MIN = 43.0, 25.0
LUM_RISE_MAX = 0.25
# ★★ 3차에서 이 자가 **분홍 해골을 통과시켰다**(bones2 R−B +24.3 → 「OK」인데 눈으로는 분홍).
#   R−B 만 보면 «붉다»와 «따뜻하다»를 못 가른다 — 갈리는 자리는 **G** 다.
#   돌·뼈 같은 자연색은 G 가 R 과 B 의 가운데쯤에 온다. 분홍/자주는 G 가 그 아래로 꺼진다.
#   [[pixel-verification-calibration]] — 자는 **틀린 표본으로** 맞춘다.
#   ★ 처음엔 (R+B)/2 − G 로 재고 문턱을 10 → 14 로 밀었는데, 멀쩡한 갈색이 자꾸 문턱에
#     붙었다(column2 10.2 · statue 14.1 vs 분홍 20.9). **문턱을 미는 건 답이 아니다** —
#     자를 바꿔야 한다. 갈색과 분홍을 진짜로 가르는 것은 **G 와 B 의 순서**다:
#         분홍 bones2(3차)  G−B = −8.7   ← G 가 B 아래로 꺼진다(자홍)
#         갈색 column2 +9.6 · statue +6.2 · bones +10.9 · urn +12.9
#     흙빛 돌은 R > G > B 로 곧게 내려간다. G 가 B 밑으로 가면 그건 돌색이 아니다.
GB_MIN = 2.0             # G − B 가 이보다 작으면 분홍/자주

def stat(p):
    im = Image.open(p).convert("RGBA"); px = im.load()
    rs = gs = bs = ls = n = 0
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            if a > 24 and lum > 20:
                rs += r; gs += g; bs += b; ls += lum; n += 1
    if not n: return None
    return {"r": rs/n, "g": gs/n, "b": bs/n, "rb": (rs-bs)/n, "lum": ls/n, "n": n}

if __name__ == "__main__":
    new_dir = sys.argv[1] if len(sys.argv) > 1 else "tmp/decorbake_warm"
    old_dir = "assets/decor"
    rows, ok, bad = [], [], []
    for p in sorted(glob.glob(os.path.join(new_dir, "*.png"))):
        k = os.path.basename(p)
        ns = stat(p)
        if not ns: continue
        op = os.path.join(old_dir, k)
        os_ = stat(op) if os.path.exists(op) else None
        drop = (os_["lum"] - ns["lum"]) / os_["lum"] if os_ and os_["lum"] else 0.0
        warm_ok = WARM_MIN <= ns["rb"] <= WARM_MAX
        margin = ns["lum"] - FLOOR_LUM
        sag = ns["g"] - ns["b"]
        verdict = ("분홍" if sag < GB_MIN else
                   "차갑다" if ns["rb"] < WARM_MIN else
                   "너무뜨겁다" if ns["rb"] > WARM_MAX else
                   "바닥에묻힘" if margin < LUM_MARGIN_MIN else
                   "너무밝다" if drop < -LUM_RISE_MAX else "OK")
        rows.append((k, os_["rb"] if os_ else float("nan"), ns["rb"],
                     os_["lum"] if os_ else float("nan"), ns["lum"], drop, margin, sag, verdict))
        (ok if verdict == "OK" else bad).append(k)

    print(f"{'에셋':<16}{'옛R-B':>8}{'새R-B':>8}{'옛밝기':>8}{'새밝기':>8}{'밝기변화':>9}{'바닥대비':>9}{'G-B':>7}  판정")
    for k, orb, nrb, ol, nl, dr, mg, sg, v in rows:
        print(f"{k:<16}{orb:>8.1f}{nrb:>8.1f}{ol:>8.1f}{nl:>8.1f}{-dr*100:>8.1f}%{mg:>9.1f}{sg:>7.1f}  {v}")
    print(f"\n띠: R−B +{WARM_MIN:.0f}~+{WARM_MAX:.0f} (바닥 +4~+32) · "
          f"바닥({FLOOR_LUM:.0f})대비 ≥ +{LUM_MARGIN_MIN:.0f} · 밝기상승 ≤ +{LUM_RISE_MAX*100:.0f}% "
          f"· G−B ≥ {GB_MIN:.0f}")
    print(f"통과 {len(ok)}/{len(rows)}" + (f"  · 물림: {' '.join(bad)}" if bad else ""))
    sys.exit(1 if bad else 0)
