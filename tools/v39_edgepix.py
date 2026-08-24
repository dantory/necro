# -*- coding: utf-8 -*-
"""V-39 자의 뒷단 — 「무대 캔버스가 «보간해서» 늘어났는가」를 잰다.

   최근접(pixelated)으로 늘리면 화면에 뜨는 색은 **뒷그림에 실제로 있던 색뿐**이다.
   보간(auto)으로 늘리면 이웃한 두 색을 섞은 **중간색**이 사이사이에 새로 생긴다.
   그래서 「가로로 이웃한 세 픽셀 a·b·c 에서 b 가 a 와도 c 와도 다르면서
   그 둘 사이에 놓인다」는 픽셀의 비율을 센다 — 그것이 곧 보간의 흔적이다.

   내는 값(%): smooth · pixel — 오린 창 안에서 그런 중간색 픽셀이 차지하는 비율.
   같이 남기는 것: 두 창을 8 배로 오려 놓은 png 둘([[play-it-before-measuring-it]]).

   python3 tools/v39_edgepix.py <smooth.png> <pixel.png> <cx> <cy> <w> <h> <dpr> <zoom>"""
import sys, json
from PIL import Image

sm = Image.open(sys.argv[1]).convert("RGB")
px = Image.open(sys.argv[2]).convert("RGB")
cx, cy, w, h = (int(v) for v in sys.argv[3:7])
dpr, zoom = int(sys.argv[7]), int(sys.argv[8])
assert sm.size == px.size, "두 사진 크기가 다르다"

box = (cx * dpr, cy * dpr, (cx + w) * dpr, (cy + h) * dpr)

def crop(im):
    return im.crop(box)

def midrate(im):
    """가로 이웃 셋에서 «둘 사이에 낀 중간색» 픽셀의 비율."""
    p = im.load(); W, H = im.size
    n = mid = 0
    for y in range(H):
        for x in range(1, W - 1):
            a, b, c = p[x - 1, y], p[x, y], p[x + 1, y]
            n += 1
            # a 와 c 가 뚜렷이 다르고, b 가 어느 쪽과도 안 같으면서 그 사이에 놓인다
            if max(abs(a[i] - c[i]) for i in range(3)) < 24: continue
            if max(abs(a[i] - b[i]) for i in range(3)) < 8: continue
            if max(abs(c[i] - b[i]) for i in range(3)) < 8: continue
            if all(min(a[i], c[i]) - 4 <= b[i] <= max(a[i], c[i]) + 4 for i in range(3)):
                mid += 1
    return n, mid

cs, cp_ = crop(sm), crop(px)
n, ms = midrate(cs)
_, mp = midrate(cp_)
zs = sys.argv[1].replace(".png", "_zoom.png")
zp = sys.argv[2].replace(".png", "_zoom.png")
cs.resize((cs.width * zoom, cs.height * zoom), Image.NEAREST).save(zs)
cp_.resize((cp_.width * zoom, cp_.height * zoom), Image.NEAREST).save(zp)
print(json.dumps({"n": n, "smooth": round(100 * ms / max(1, n), 2),
                  "pixel": round(100 * mp / max(1, n), 2), "zoomA": zs, "zoomB": zp}))
