# -*- coding: utf-8 -*-
"""V-33 자의 뒷단 — 「칸의 그림이 눈에 얼마나 나타나나」를 잰다.

   재는 법은 **그림을 껐다 켜서 뺀다**: 같은 자리를 두 번 찍되 한 번은 `.tIco` 를
   숨긴다. 두 사진의 차 |L_켬 − L_끔| 이 곧 **그림이 보태는 잉크**다.
   배경을 짐작할 필요가 없어서, 칸마다 바탕이 달라도 흔들리지 않는다.

   값 두 개를 낸다(칸마다):
     ink  = 그림 상자 안 |ΔL| 의 **평균**  — 「얼마나 나타나나」
     top  = 그림 상자 안 |ΔL| 의 **상위 10% 평균** — 「제일 밝은 획이 얼마나 사나」
   python3 tools/v33_pix.py [tmp/v33_job.json]"""
import sys, json
from PIL import Image

job = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "tmp/v33_job.json"))
on  = Image.open(job["on"]).convert("RGB")
off = Image.open(job["off"]).convert("RGB")
W, H = on.size
assert off.size == (W, H), "두 사진 크기가 다르다"
pa, pb = on.load(), off.load()
d = job["dpr"]
lum = lambda c: 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]

def ink(r):
    x0, y0 = int(r["x"]*d), int(r["y"]*d)
    x1, y1 = int((r["x"]+r["w"])*d), int((r["y"]+r["h"])*d)
    if x1 <= x0 or y1 <= y0 or x0 < 0 or y0 < 0 or x1 > W or y1 > H: return None
    ds = []
    for y in range(y0, y1):
        for x in range(x0, x1):
            ds.append(abs(lum(pa[x, y]) - lum(pb[x, y])))
    if not ds: return None
    ds.sort()
    k = max(1, len(ds)//10)
    return {"ink": sum(ds)/len(ds), "top": sum(ds[-k:])/k, "n": len(ds)}

out = []
for nd in job["nodes"]:
    m = ink(nd["r"])
    out.append({**{k: nd[k] for k in ("id", "state")}, **(m or {"ink": None, "top": None, "n": 0})})
print(json.dumps(out, ensure_ascii=False))
