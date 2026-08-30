#!/usr/bin/env python3
"""구운 얼룩을 **바닥에 스미게** 마무리한다 (V-173).

★ 첫 판의 전제가 틀렸다. `create_map_object` 에 `background_image` 를 줘도 결과는
  «바닥+얼룩» 한 판이 **아니다** — 바닥은 «결 맞추기» 힌트로만 쓰이고 돌아오는 것은
  여전히 **투명 여백을 두른 오려낸 판**이다(네 장 다 네 귀퉁이 알파 0). 그래서
  「배경과 견줘 알파를 얻는다」는 방법은 성립하지 않는다.

남는 진짜 결함은 하나 — **반투명이 한 픽셀도 없다**(여섯 판 전부 0.0%). 픽셀 아트는
원래 반투명을 안 쓰므로 **굽기로는 못 얻는다.** 그런데 얼룩은 정의상 「가장자리가
스미며 사라지는 것」이라 이게 없으면 오려 붙인 판으로 보인다.

그러니 **가장자리만 깎는다** — 색은 한 픽셀도 안 건드린다(병수님이 금한 «칠하기»가
아니다. 칠하는 것은 색이고, 여기서 손대는 것은 **꼴**이다).

  python3 tools/pixellab/decal_extract.py assets/decal
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
from decal import floor_bg  # noqa

import base64, io
from PIL import Image, ImageFilter

FEATHER = 2.2        # 가장자리를 이만큼 흐린다 — 여기서 반투명이 생긴다
ALPHA_MAX = 232      # 완전 불투명은 피한다 — 얼룩은 바닥을 «물들이는» 것이다
DEC_A = 0.59         # `map.js` scatter 의 a (0.42~0.76) 한가운데 — 화면 합성용


def floor_stats():
    b = Image.open(io.BytesIO(base64.b64decode(floor_bg(64, 64)))).convert("RGB")
    p = list(b.getdata()); n = len(p)
    r = sum(q[0] for q in p) / n; g = sum(q[1] for q in p) / n; bl = sum(q[2] for q in p) / n
    return r, g, bl


def finish(path, out_path):
    im = Image.open(path).convert("RGBA")
    a = im.getchannel("A")
    # 알파를 흐려 가장자리를 스미게 한다. 색(RGB)은 그대로 둔다.
    a = a.point(lambda v: min(v, ALPHA_MAX))
    a = a.filter(ImageFilter.GaussianBlur(FEATHER))
    out = im.copy(); out.putalpha(a)
    out.save(out_path)
    return out


def measure(im, label, fr, fg, fb):
    d = list(im.getdata()); n = len(d)
    op = [p for p in d if p[3] > 200]
    soft = sum(1 for p in d if 20 < p[3] < 200) / n * 100
    if not op:
        print(f"  {label}: 불투명 없음  반투명 {soft:.1f}%"); return
    m = len(op)
    r = sum(p[0] for p in op) / m; g = sum(p[1] for p in op) / m; b = sum(p[2] for p in op) / m
    # 화면에서 실제로 보이는 값 — 바닥 위에 a 로 얹었을 때
    sr = fr * (1 - DEC_A) + r * DEC_A; sg = fg * (1 - DEC_A) + g * DEC_A; sb = fb * (1 - DEC_A) + b * DEC_A
    fbr = (fr + fg + fb) / 3
    print(f"  {label}: 원본 밝기 {(r+g+b)/3:5.1f} R-B {r-b:+5.1f} │ "
          f"화면 밝기 {(sr+sg+sb)/3:5.1f} (바닥 {fbr:.1f}, 차 {(sr+sg+sb)/3-fbr:+5.1f}) │ 반투명 {soft:4.1f}%")


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "assets/decal"
    src = src if os.path.isabs(src) else os.path.join(ROOT, src)
    dst = src.rstrip("/") + "_soft"
    os.makedirs(dst, exist_ok=True)
    fr, fg, fb = floor_stats()
    print(f"바닥 floorBase: 밝기 {(fr+fg+fb)/3:.1f}  R-B {fr-fb:+.1f}   (얼룩은 a≈{DEC_A} 로 얹힌다)\n")
    for f in sorted(os.listdir(src)):
        if not f.endswith(".png"):
            continue
        before = Image.open(os.path.join(src, f)).convert("RGBA")
        measure(before, f[:-4] + " (전)", fr, fg, fb)
        after = finish(os.path.join(src, f), os.path.join(dst, f))
        measure(after, f[:-4] + " (후)", fr, fg, fb)
        print()
    print(f"══ {dst}")
