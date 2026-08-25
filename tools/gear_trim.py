#!/usr/bin/env python3
"""V-53 — 장비 그림의 «투명 여백»을 잘라 낸다.

그림은 전부 64×64 정사각인데 실제로 그려진 것은 그 안 일부다(망토 42×56 · 반지 41×36).
`background:contain` 은 **여백까지 포함해** 맞추므로, 칸이 커도 물건은 작게 앉는다.
`tools/doll_crop.py` 가 네크로맨서 인물에 한 것과 같은 처리를 열한 장에 옮긴다
([[carry-fixes-forward]]).

원본은 assets/ui/gear/_src/ 에 남긴다 — 다시 굽지 않아도 되돌릴 수 있다.
    python3 tools/gear_trim.py [--restore]
"""
import sys, os, glob, shutil
from PIL import Image

GEAR = os.path.join(os.path.dirname(__file__), "..", "assets", "ui", "gear")
SRC = os.path.join(GEAR, "_src")
A_MIN = 16          # 이 아래는 «안 그려진 것»으로 본다(사그라든 가장자리)

def restore():
    for f in sorted(glob.glob(os.path.join(SRC, "*.png"))):
        shutil.copy2(f, os.path.join(GEAR, os.path.basename(f)))
        print("되돌림", os.path.basename(f))

def trim():
    os.makedirs(SRC, exist_ok=True)
    for f in sorted(glob.glob(os.path.join(GEAR, "*.png"))):
        name = os.path.basename(f)
        keep = os.path.join(SRC, name)
        if not os.path.exists(keep):
            shutil.copy2(f, keep)            # 원본은 한 번만 남긴다
        im = Image.open(keep).convert("RGBA")
        bb = im.split()[3].point(lambda v: 255 if v > A_MIN else 0).getbbox()
        if not bb:
            print("건너뜀(빈 그림)", name); continue
        out = im.crop(bb)
        w0, h0 = im.size; w, h = out.size
        out.save(f)
        print(f"{name:12} {w0}×{h0} → {w}×{h}  (넓이의 {w*h*100//(w0*h0)}%)")

if __name__ == "__main__":
    restore() if "--restore" in sys.argv else trim()
