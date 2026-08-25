"""V-45 의 자 — 뼛조각이 얹는 «밝은 잉크»를 **같은 프레임의 두 그림**에서 센다.
   조각 자리(tmp/v45_spots.json) 둘레만 본다: 바닥의 횃불이 깜빡여 화면 전체는 두 장이
   늘 다르므로, 넓게 세면 조각이 잡음에 묻힌다([[threshold-and-ruler-must-match]]).
     python3 tools/v45_ink.py   (tmp/v45_cmp.png 도 같이 낸다)"""
from PIL import Image
import json
a = Image.open("tmp/v45_old.png").convert("RGB")
b = Image.open("tmp/v45_new.png").convert("RGB")
spots = json.load(open("tmp/v45_spots.json"))
def ink(im):
    px = im.load(); n = 0; area = 0
    for (cx, cy, r) in spots:
        r = max(14, r)
        x0, y0 = max(0, int(cx - r)), max(0, int(cy - r))
        x1, y1 = min(im.width, int(cx + r)), min(im.height, int(cy + r))
        for y in range(y0, y1):
            for x in range(x0, x1):
                rr, gg, bb = px[x, y]
                area += 1
                if rr > 150 and gg > 140 and bb > 118 and (rr - bb) < 75: n += 1
    return n, area
na, ar = ink(a); nb, _ = ink(b)
print(f"밝은 화소  전 {na}  후 {nb}  ({(nb-na)/na*100:+.1f}%)   본 넓이 {ar}  조각 {len(spots)}")
xs = [s[0] for s in spots]; ys = [s[1] for s in spots]
x0 = max(0, int(min(xs)) - 90); y0 = max(0, int(min(ys)) - 90)
x1 = min(a.width, int(max(xs)) + 90); y1 = min(a.height, int(max(ys)) + 90)
Z = 3
ca = a.crop((x0, y0, x1, y1)); cb = b.crop((x0, y0, x1, y1))
ca = ca.resize((ca.width * Z, ca.height * Z), Image.NEAREST)
cb = cb.resize((cb.width * Z, cb.height * Z), Image.NEAREST)
out = Image.new("RGB", (ca.width, ca.height * 2 + 10), (20, 16, 12))
out.paste(ca, (0, 0)); out.paste(cb, (0, ca.height + 10))
out.save("tmp/v45_cmp.png"); print("wrote tmp/v45_cmp.png", out.size)
