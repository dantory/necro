#!/usr/bin/env python3
"""창 안에 «판의 결을 벗어난 흰 것»이 얼마나 있는지 잰다 (V-50).

    python3 tools/v50_ruler.py tmp/v50_before [tmp/v50_after]

세 수만 본다 — 창 상자 안에서
  ① 최대 밝기        (제일 밝은 화소)
  ② 흰 화소 수       (밝기>200 이고 «무채색»인 것 — 금빛 글자는 채도가 있어 안 걸린다)
  ③ 그 흰 것이 «한 세로줄»에 몰렸는가(스크롤바의 생김새)
문턱은 양성 표본으로 맞춘다 — 구르는 칸이 없는 창(상인·대장간·트리·정산…)이 전부 통과하는 자리.
"""
import json, sys, os
import numpy as np
from PIL import Image

WHITE_L = 200      # 밝기 문턱
WHITE_S = 40       # 채도 문턱 (max-min). 금빛 글자 #c8aa6e 는 max-min=90 이라 안 걸린다

def measure(d):
    rep = json.load(open(os.path.join(d, "report.json")))
    out = {}
    for w, v in rep.items():
        if not v.get("open"):
            continue
        p = os.path.join(d, w + ".png")
        if not os.path.exists(p):
            continue
        b = v["box"]
        a = np.asarray(Image.open(p).convert("RGB")).astype(int)
        a = a[b["y"]:b["y"]+b["h"], b["x"]:b["x"]+b["w"]]
        lum = a @ [0.299, 0.587, 0.114]
        sat = a.max(2) - a.min(2)
        m = (lum > WHITE_L) & (sat < WHITE_S)
        n = int(m.sum())
        col = 0
        if n:
            cols = m.sum(0)
            col = float(cols.max() / max(1, m.shape[0]))   # 제일 진한 세로줄이 창 높이의 몇 할인가
        out[w] = dict(maxlum=round(float(lum.max()), 1), white=n, colfrac=round(col, 3),
                      scroll=len(v.get("scrollers", [])))
    return out

def show(tag, o):
    print(f"── {tag}")
    print(f"{'창':10s} {'구르는칸':>6s} {'최대밝기':>8s} {'흰화소':>7s} {'세로줄':>6s}  판정")
    for w, v in o.items():
        bad = v["white"] > 300 and v["colfrac"] > 0.3
        print(f"{w:10s} {v['scroll']:6d} {v['maxlum']:8.1f} {v['white']:7d} {v['colfrac']:6.2f}  {'★흰바' if bad else 'ok'}")

a = measure(sys.argv[1]); show(sys.argv[1], a)
if len(sys.argv) > 2:
    b = measure(sys.argv[2]); print(); show(sys.argv[2], b)
    print("\n── 앞뒤")
    for w in a:
        if w in b:
            print(f"{w:10s} 흰화소 {a[w]['white']:6d} → {b[w]['white']:6d}   최대밝기 {a[w]['maxlum']:6.1f} → {b[w]['maxlum']:6.1f}")
