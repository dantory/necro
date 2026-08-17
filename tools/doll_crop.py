#!/usr/bin/env python3
"""페이퍼 돌에 쓸 인물 그림을 **투명한 여백만큼 잘라** 굽는다.

까닭: 걷기 스프라이트(92×92)는 8방향 격자에 맞춘 상자라 인물이 **34×63** 만 차지한다
(나머지 75%가 투명). 그대로 창에 걸면 인물이 **칸 하나보다 작아** 보여 페이퍼 돌로
안 읽힌다 — D2 는 인물이 슬롯 여섯을 거느릴 만큼 크다.
여백을 잘라 두면 CSS 가 `height:100%` 하나로 세 줄을 꽉 채운다(세로는 슬롯이 정하므로
창은 한 톨도 안 커진다).

    python3 tools/doll_crop.py            # 기본: south.png → assets/ui/doll_necro.png
"""
import sys, pathlib
from PIL import Image

SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "assets/char/necro/south.png")
OUT = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "assets/ui/doll_necro.png")

im = Image.open(SRC).convert("RGBA")
box = im.getbbox()
if not box:
    raise SystemExit(f"{SRC}: 전부 투명하다 — 자를 것이 없다")
out = im.crop(box)
OUT.parent.mkdir(parents=True, exist_ok=True)
out.save(OUT)
print(f"{SRC} {im.size} → {OUT} {out.size} (bbox {box})")
