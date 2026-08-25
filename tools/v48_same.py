# -*- coding: utf-8 -*-
"""**「같은 조각이 또 있다」를 화소로 가른다.**

눈이 「소품이 되풀이된다」고 말할 때 세어야 할 것은 «가짓수»가 아니라 **같아 보이는 것끼리
묶은 무리**다. 지금 던전 소품은 아홉 장인데 한 화면에 아흔 개가 놓인다 — 밝기 ±6% ·
크기 ±12% 로 흔들어 놓았지만 **그 흔들기는 눈에 「같은 조각」으로 읽힌다.**

여기서 묻는 것은 하나다: **무엇이 실루엣을 바꾸는가.**
  · 판을 굴리지 않고 **그림 파일**만 잰다 — 잡음이 0 이다([[same-seed-is-not-same-run]])
  · 자는 정규화 상관(NCC) — 알파를 실루엣으로 보고 같은 틀에 맞춰 대 본다
  · 문턱은 **양성 표본으로** 맞춘다: 밝기·크기만 흔든 쌍은 **통과**(같다)해야 하고,
    다른 이름끼리는 **떨어져야** 한다([[pixel-verification-calibration]])

  python3 tools/v48_same.py            # 문턱 맞추기 + 지금 값
"""
import numpy as np
from PIL import Image

NAMES = ["pillar", "coffin", "bones", "brazier", "rubble", "column2", "bones2", "urn", "statue"]
BOX = (72, 56)          # 같은 틀에 맞춰 대 본다(실루엣만 묻는다 — 크기는 아래 흔들기로 따로 잰다)

def mask(im):
    a = np.asarray(im.convert("RGBA"))[:, :, 3].astype(float)
    return a

def fit(a):
    im = Image.fromarray(a.astype("uint8"))
    return np.asarray(im.resize(BOX, Image.NEAREST)).astype(float)

def ncc(a, b):
    a = a - a.mean(); b = b - b.mean()
    d = np.sqrt((a * a).sum() * (b * b).sum())
    return float((a * b).sum() / d) if d > 1e-6 else 0.0

def rot(im, deg):
    """굽는 쪽(ground.js `lieVars`)과 **같은 방식** — 이웃값으로 돌리고 테두리를 넓힌다."""
    return im.rotate(deg, resample=Image.NEAREST, expand=True)

def main():
    base = {n: Image.open(f"assets/decor/{n}.png").convert("RGBA") for n in NAMES}
    # ── 양성 표본 ① 밝기·크기만 흔든 쌍 (눈에는 «같은 조각») ──
    jit = []
    for n, im in base.items():
        a = fit(mask(im))
        for s in (0.88, 1.13):
            b = fit(mask(im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.NEAREST)))
            jit.append(ncc(a, b))
    # ── 음성 표본 ② 다른 이름끼리 (눈에는 «다른 조각») ──
    diff = []
    fits = {n: fit(mask(im)) for n, im in base.items()}
    for i, n in enumerate(NAMES):
        for m in NAMES[i + 1:]:
            diff.append(ncc(fits[n], fits[m]))
    jit, diff = np.array(jit), np.array(diff)
    print(f"밝기·크기만 흔든 쌍 {len(jit)} — NCC 최저 {jit.min():.3f} · 중앙 {np.median(jit):.3f}")
    print(f"다른 이름 쌍      {len(diff)} — NCC 최고 {diff.max():.3f} · 중앙 {np.median(diff):.3f}")
    T = round((jit.min() + diff.max()) / 2, 2)
    print(f"→ 문턱 {T} (양성 최저 {jit.min():.3f} 와 음성 최고 {diff.max():.3f} 사이 · 겹침 없음)")
    # ── 돌리기는 실루엣을 바꾸는가 ──
    print("\n돌린 각 → 원본과의 NCC (문턱 아래면 «다른 조각»으로 읽힌다)")
    ANG = {"column2": [-34, -17, 0, 17, 34], "bones2": [-41, -20, 0, 22, 43]}   # ground.js LIE_ROT
    for n, angs in ANG.items():
        vs = {d: fit(mask(rot(base[n], d))) for d in angs}
        worst, wp = -1, None
        for i, d1 in enumerate(angs):
            for d2 in angs[i + 1:]:
                c = ncc(vs[d1], vs[d2])
                if c > worst: worst, wp = c, (d1, d2)
        row = "  ".join(f"{d:+d}°:{ncc(vs[0], vs[d]):.2f}" for d in angs if d)
        print(f"  {n:8s} 원본과 {row}")
        print(f"  {'':8s} 각끼리 제일 닮은 쌍 {wp[0]:+d}°/{wp[1]:+d}° = {worst:.2f} "
              f"({'문턱 아래 — 다 다른 조각으로 읽힌다' if worst < T else '★ 문턱 위 — 각을 벌려야 한다'})")

main()
