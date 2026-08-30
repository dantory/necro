#!/usr/bin/env python3
# hs/ 픽셀 자 — 소스 소품 PNG 의 «불투명 프로파일»(바닥판이 달려 오나)과
# 컷의 R−B(붉은기−푸른기)·밝기를 같은 자로 잰다. V-160.
#   python3 tools/hs_measure.py props        → 소품 PNG 알파 프로파일
#   python3 tools/hs_measure.py rb <png> x y w h [label]  → 상자 평균 R,G,B,R-B,밝기
import sys, numpy as np
from PIL import Image

def load(p): return np.asarray(Image.open(p).convert("RGBA"), dtype=np.int32)

def props():
    for name in ["pillar","column2","urn","brazier","bones","coffin","statue","rubble"]:
        a = load(f"assets/decor/{name}.png")
        H,W = a.shape[:2]; al = a[:,:,3]
        rows_op = [(al[y]>24).sum() for y in range(H)]           # 불투명(>24) 픽셀 수/행
        rows_solid = [(al[y]>160).sum() for y in range(H)]        # «단단한» 픽셀 수/행
        y_op = [y for y in range(H) if rows_op[y]>0]
        y_solid = [y for y in range(H) if rows_solid[y]>0]
        if not y_op: print(f"{name:9s} EMPTY"); continue
        y1_op = y_op[-1]; y1_solid = y_solid[-1] if y_solid else y_op[-1]
        tail = y1_op - y1_solid                                   # 단단한 몸통 밑의 «반투명 꼬리»
        print(f"{name:9s} H={H:3d}  op[{y_op[0]:3d}..{y1_op:3d}]  solid[..{y1_solid:3d}]  tail={tail:2d}px  b_op={ (y1_op+1)/H:.3f} b_solid={(y1_solid+1)/H:.3f}")

def rb(png,x,y,w,h,label=""):
    a = load(png); box = a[y:y+h, x:x+w]
    op = box[box[:,:,3]>40]
    if len(op)==0: print(f"{label:12s} (투명)"); return
    R,G,B = op[:,0].mean(), op[:,1].mean(), op[:,2].mean()
    lum = 0.299*R+0.587*G+0.114*B
    print(f"{label:12s} R={R:5.1f} G={G:5.1f} B={B:5.1f}  R-B={R-B:+5.1f}  lum={lum:5.1f}")

if __name__=="__main__":
    if sys.argv[1]=="props": props()
    elif sys.argv[1]=="rb": rb(sys.argv[2],*(int(v) for v in sys.argv[3:7]), sys.argv[7] if len(sys.argv)>7 else "")
