#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""얼룩이 **동그란 접시**로 나오는 진짜 까닭 — 조리법이 아니라 «틀»이다. (V-175)

V-173 이 `background_image` + `inpainting` 을 켤 때 마스크를 `{"type":"oval"}` 로 줬다.
`inpainting` 은 스키마가 말하듯 **「그림의 어디에 그릴지」를 정하는 것**이다. 타원을
주면 굽는 쪽은 그 타원을 채운다 — **원형 실루엣은 조리법이 못 이기는 «틀»이었다.**
여섯 판이 색을 다투는 동안 꼴은 매번 틀이 정하고 있었다. ★ [[knob-that-does-nothing]]

스키마에 길이 있다: `type` 은 `"oval" | "rectangle" | "mask"` — **`mask` 는 내가 그린
틀을 그대로 받는다.** 그러니 타원 대신 **너덜너덜한 유기적 얼룩 꼴**을 만들어 넣는다.
그러면 「원형이 아닌 것」을 낱말로 빌 필요가 없다 —
★ [[pixellab-side-attack-failures]] 의 「부정어로는 못 막는다」를 틀로 푼 것.

꼴은 씨앗으로 못박는다 — 같은 열쇠는 늘 같은 틀이 나온다([[seed-the-probe]]).
"""
import math, random, zlib
from PIL import Image, ImageDraw, ImageFilter


def ragged_mask(w, h, seed, lobes=7, coverage=0.55):
    """겹친 타원 여러 개를 **길을 따라** 늘어놓아 팔다리 달린 얼룩 꼴을 만든다.

    한 개의 타원이면 원이 된다. 크기가 다른 것을 **어긋나게 겹치면** 테두리가
    울퉁불퉁해지고 «판»으로 안 읽힌다. 마지막에 살짝 흐렸다 다시 자르면
    계단 모양 각이 깎여 자연스러운 테가 된다.
    """
    rnd = random.Random(seed)
    m = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(m)
    cx, cy = w / 2, h / 2
    # 반지름 기준 — 덮을 넓이에서 거꾸로 잡는다
    r0 = math.sqrt(coverage * w * h / math.pi)
    ang = rnd.uniform(0, 2 * math.pi)
    for i in range(lobes):
        # 중심에서 조금씩 벗어난 자리에 크기가 다른 타원을 얹는다
        off = r0 * rnd.uniform(0.0, 0.55)
        ax = cx + math.cos(ang) * off
        ay = cy + math.sin(ang) * off * (h / w)
        rx = r0 * rnd.uniform(0.38, 0.78)
        ry = rx * rnd.uniform(0.55, 1.45) * (h / w)
        d.ellipse([ax - rx, ay - ry, ax + rx, ay + ry], fill=255)
        ang += rnd.uniform(1.4, 3.1)          # 다음 덩어리는 딴 쪽으로
    # 테두리를 갉아 낸다 — 작은 구멍을 몇 개 뚫어 «꽉 찬 판»을 깬다
    for _ in range(lobes):
        rx = r0 * rnd.uniform(0.10, 0.26)
        a = rnd.uniform(0, 2 * math.pi); off = r0 * rnd.uniform(0.55, 1.0)
        ax = cx + math.cos(a) * off; ay = cy + math.sin(a) * off * (h / w)
        d.ellipse([ax - rx, ay - rx, ax + rx, ay + rx], fill=0)
    m = m.filter(ImageFilter.GaussianBlur(max(w, h) * 0.02))
    m = m.point(lambda v: 255 if v > 118 else 0)
    # 가장자리 한 겹은 늘 비워 둔다 — 틀이 캔버스를 꽉 채우면 또 «판»이 된다
    d2 = ImageDraw.Draw(m)
    d2.rectangle([0, 0, w - 1, h - 1], outline=0, width=max(2, int(min(w, h) * 0.04)))
    return m


def b64(im):
    import base64, io
    buf = io.BytesIO(); im.convert("RGB").save(buf, "PNG")
    return base64.b64encode(buf.getvalue()).decode()


if __name__ == "__main__":
    import sys, os
    keys = ["crack", "pebble", "mud", "stain"]
    sheet = Image.new("RGB", (len(keys) * 140, 140), (16, 16, 16))
    for i, k in enumerate(keys):
        m = ragged_mask(128, 128, seed=zlib.crc32(k.encode()) % 9999)
        sheet.paste(m.convert("RGB"), (i * 140 + 6, 6))
    out = os.path.join(os.environ.get("HOME"), ".openclaw/workspace/tmp/v175_masks.png")
    sheet.save(out); print(out)
