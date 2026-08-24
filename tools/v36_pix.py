# -*- coding: utf-8 -*-
"""V-36 자의 뒷단 — 「벨트 칸의 그림이 칸을 얼마나 채우나」를 잰다.

   재는 법은 V-33/V-34 그대로 — **그림을 껐다 켜서 뺀 잉크** |L_켬 − L_끔|.
   바탕(칸틀·못·번호)이 칸마다 달라도 흔들리지 않는다.

   칸마다 값 넷:
     ink  = 그림 상자 안 |ΔL| 평균        — 「얼마나 나타나나」
     top  = 상위 10% 평균                 — 「제일 밝은 획이 얼마나 사나」
     fw   = 그림이 **닿은 폭** / 상자 폭   — 가로로 얼마나 벌었나
     fh   = 그림이 **닿은 높이** / 상자 높이
   fw·fh 는 ΔL > 6 인 점의 바깥테로 잰다. 어둡게 죽인 칸(.slot.off)도
   테두리 획은 6 을 넘으므로 **밝기가 아니라 «크기»만** 읽는다.

   python3 tools/v36_pix.py tmp/v36_job.json"""
import sys, json
from PIL import Image

job = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "tmp/v36_job.json"))
on  = Image.open(job["on"]).convert("RGB")
off = Image.open(job["off"]).convert("RGB")
W, H = on.size
assert off.size == (W, H), "두 사진 크기가 다르다"
pa, pb = on.load(), off.load()
d = job["dpr"]
THR = 6.0
lum = lambda c: 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]

def measure(r):
    x0, y0 = int(r["x"]*d), int(r["y"]*d)
    x1, y1 = int((r["x"]+r["w"])*d), int((r["y"]+r["h"])*d)
    if x1 <= x0 or y1 <= y0 or x0 < 0 or y0 < 0 or x1 > W or y1 > H: return None
    ds = []
    minx, maxx, miny, maxy = None, None, None, None
    for y in range(y0, y1):
        for x in range(x0, x1):
            v = abs(lum(pa[x, y]) - lum(pb[x, y]))
            ds.append(v)
            if v > THR:
                if minx is None or x < minx: minx = x
                if maxx is None or x > maxx: maxx = x
                if miny is None or y < miny: miny = y
                if maxy is None or y > maxy: maxy = y
    if not ds: return None
    ds.sort()
    k = max(1, len(ds)//10)
    bw = (maxx-minx+1) if minx is not None else 0
    bh = (maxy-miny+1) if miny is not None else 0
    return {"ink": sum(ds)/len(ds), "top": sum(ds[-k:])/k,
            "fw": bw/(x1-x0), "fh": bh/(y1-y0), "n": len(ds)}

out = []
for nd in job["nodes"]:
    m = measure(nd["r"])
    out.append({**{k: nd[k] for k in ("id", "state")},
                **(m or {"ink": None, "top": None, "fw": 0, "fh": 0, "n": 0})})
print(json.dumps(out, ensure_ascii=False))
