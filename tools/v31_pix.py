# -*- coding: utf-8 -*-
"""V-31 자의 뒷단 — 사진에서 «칸 테두리의 또렷함»을 잰다.
   고리 = 칸 경계에서 안쪽 0~2px 띠. 바닥 = 칸 밖 3~7px 띠의 중앙값.
   값 = 고리 픽셀마다 |ΔL| 의 **상위 25% 평균**(한 점 튐에 안 흔들린다).
   python3 tools/v31_pix.py [tmp/v31_job.json]"""
import sys, json
from PIL import Image

job = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "tmp/v31_job.json"))
im = Image.open(job["png"]).convert("RGB"); W, H = im.size
px = im.load(); d = job["dpr"]
lum = lambda c: 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]

def ring_sharp(r):
    x0, y0 = int(r["x"]*d), int(r["y"]*d)
    x1, y1 = int((r["x"]+r["w"])*d), int((r["y"]+r["h"])*d)
    if x0 < 8 or y0 < 8 or x1 >= W-8 or y1 >= H-8: return None
    ring, base = [], []
    for y in range(y0-7, y1+8):
        for x in range(x0-7, x1+8):
            dx = min(x-x0, x1-x); dy = min(y-y0, y1-y)      # 경계까지의 거리(안쪽 +, 바깥 -)
            e = min(dx, dy)
            if 0 <= e <= 2: ring.append(lum(px[x, y]))
            elif -7 <= e <= -3: base.append(lum(px[x, y]))
    if len(ring) < 20 or len(base) < 20: return None
    base.sort(); b = base[len(base)//2]
    dev = sorted((abs(v-b) for v in ring), reverse=True)
    k = max(1, len(dev)//4)
    return sum(dev[:k])/k

def med(v): 
    v = sorted(v); return v[len(v)//2] if v else float("nan")

full, empty = [], []
for s in job["slots"]:
    v = ring_sharp(s)
    if v is None: continue
    (empty if s["empty"] else full).append((s["cls"], v))
fl = ring_sharp(job["floor"]) if job.get("floor") else None

for nm, g in (("낀 칸", full), ("빈 칸", empty)):
    print(f"{nm}: " + " · ".join(f"{c}={v:.1f}" for c, v in g))
print()
print(f"위 눈금 · 낀 칸  중앙값 = {med([v for _, v in full]):.1f}  (n={len(full)})")
print(f"재려던 것 · 빈 칸 중앙값 = {med([v for _, v in empty]):.1f}  (n={len(empty)})")
print(f"아래 눈금 · 빈 바닥      = {fl:.1f}" if fl is not None else "아래 눈금: 못 쟀다")
if fl and empty:
    print(f"빈 칸 / 빈 바닥 = {med([v for _,v in empty])/fl:.2f}배")
