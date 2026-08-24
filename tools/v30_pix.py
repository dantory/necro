# -*- coding: utf-8 -*-
"""V-30 자의 뒷단 — 찍은 사진에서 «또렷함»을 잰다.
   안쪽 원(반지름 0.42h)의 밝기가 바깥 고리(1.5r~2.4r 의 바닥)의 중앙값에서
   얼마나 벗어나는지, 픽셀마다 |ΔL| 을 재서 **상위 10% 의 평균**을 쓴다.
   한 점 튐에 안 흔들리고, 「거의 다 바닥색인데 몇 픽셀만 뼈」인 시체도 잡는다.
   python3 tools/v30_pix.py tmp/v30_job.json"""
import sys, json, math
from PIL import Image

job = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "tmp/v30_job.json"))
im = Image.open(job["png"]).convert("RGB"); W, H = im.size
px = im.load(); dpr = job["dpr"]

def lum(c): return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]

def sharp(cx, cy, h):
    r = 0.42 * h * dpr
    if r < 3: return None
    inner, ring = [], []
    r2i, r2a, r2b = r*r, (1.5*r)**2, (2.4*r)**2
    x0, x1 = int(cx-2.4*r), int(cx+2.4*r); y0, y1 = int(cy-2.4*r), int(cy+2.4*r)
    if x0 < 0 or y0 < 0 or x1 >= W or y1 >= H: return None   # 화면 밖 — 안 센다
    for y in range(y0, y1+1):
        for x in range(x0, x1+1):
            d = (x-cx)**2 + (y-cy)**2
            if d <= r2i: inner.append(lum(px[x, y]))
            elif r2a <= d <= r2b: ring.append(lum(px[x, y]))
    if len(inner) < 20 or len(ring) < 40: return None
    ring.sort(); base = ring[len(ring)//2]
    dev = sorted((abs(v - base) for v in inner), reverse=True)
    k = max(1, len(dev)//10)
    return sum(dev[:k]) / k

out = {}
for name, pts in job["groups"].items():
    vals = []
    for p in pts:
        dy = -0.5 * p["h"] * dpr if name == "body" else 0.0
        v = sharp(p["x"]*dpr, p["y"]*dpr + dy, p["h"])
        if v is not None: vals.append(v)
    vals.sort()
    out[name] = {"n": len(vals), "med": round(vals[len(vals)//2], 1) if vals else None,
                 "p10": round(vals[max(0,len(vals)//10)], 1) if vals else None,
                 "p90": round(vals[min(len(vals)-1, 9*len(vals)//10)], 1) if vals else None,
                 "vals": [round(v,1) for v in vals]}
print(json.dumps(out, ensure_ascii=False))
