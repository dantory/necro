#!/usr/bin/env python3
# V-219 — 화살 에셋이 어두운 바닥에서 읽히는가를 픽셀 밝기로 잰다.
# 밝기 = 0.2126R + 0.7152G + 0.0722B (Rec.709 상대 휘도, 감마 무시한 근사).
# 눈금: ㉠ 화살 불투명 픽셀 밝기 «중앙» ≥ 바닥평균×1.5(=91)  ㉡ 밝기<40 픽셀 비율 ≤ 15%
import sys
from PIL import Image

def lum_px(r, g, b):
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def measure(path, alpha_min=200):
    im = Image.open(path).convert("RGBA")
    lums = []
    for r, g, b, a in im.getdata():
        if a >= alpha_min:
            lums.append(lum_px(r, g, b))
    lums.sort()
    return im.size, lums

def stat(lums):
    if not lums:
        return None
    n = len(lums)
    med = lums[n // 2]
    mean = sum(lums) / n
    p10hi = lums[int(n * 0.9)]
    dark = sum(1 for x in lums if x < 40) / n * 100
    return dict(n=n, mean=round(mean, 1), median=round(med, 1),
               top10=round(p10hi, 1), dark_pct=round(dark, 1),
               lo=round(lums[0], 1), hi=round(lums[-1], 1))

if __name__ == "__main__":
    args = sys.argv[1:]
    # 바닥은 전체 픽셀 평균(불투명 타일). 화살은 불투명 픽셀만.
    floor = args[0] if args else "assets/floor/bone_tile.png"
    fim = Image.open(floor).convert("RGBA")
    fl = [lum_px(r, g, b) for r, g, b, a in fim.getdata() if a >= 200]
    fmean = sum(fl) / len(fl)
    print(f"바닥 {floor}  평균밝기 {fmean:.1f}  (눈금선 ×1.5 = {fmean*1.5:.1f})")
    shots = args[1:] if len(args) > 1 else ["assets/fx/foeshot.png"]
    for sp in shots:
        size, lums = measure(sp)
        s = stat(lums)
        if not s:
            print(f"  {sp}: 불투명 픽셀 없음")
            continue
        g1 = "통과 ✔" if s["median"] >= fmean * 1.5 else "미달 ✘"
        g2 = "통과 ✔" if s["dark_pct"] <= 15 else "미달 ✘"
        print(f"  {sp} {size}  불투명 {s['n']}px")
        print(f"    ㉠ 밝기중앙 {s['median']} (≥{fmean*1.5:.1f}) → {g1}   평균 {s['mean']}·상위10% {s['top10']}·범위 {s['lo']}~{s['hi']}")
        print(f"    ㉡ 밝기<40 비율 {s['dark_pct']}% (≤15%) → {g2}")
