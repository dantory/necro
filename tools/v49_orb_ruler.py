#!/usr/bin/env python3
"""**빈 유리가 «빈 유리»로 읽히는가**를 그림 파일에서 잰다 (V-49 · 2026-08-25).

    python3 tools/v49_orb_ruler.py tmp/orb_before [tmp/orb_after]

판을 굴리지 않는다 — `tools/v49_orb.mjs` 가 구워 낸 64x64 를 읽는다(잡음 0).
세 수만 본다. 셋 다 「빈 곳이 찬 곳보다 눈에 먼저 들면 안 된다」는 한 가지를 잰다:

  ① **빈밝기 / 찬밝기** — 1 을 넘으면 빈 곳이 더 밝다(= 빈 쪽이 먼저 읽힌다).
  ② **제일 밝은 빈 화소** 대 **제일 어두운 찬 화소** — 겹치면 경계가 뒤집힌다.
  ③ **찬쪽 기울기**(B-R) — 빈 곳의 색이 제 액체와 같은 쪽인가.
     마나는 파랑(B-R > 0)인데 빈 곳이 갈색(B-R < 0)이면 **다른 물건**으로 읽힌다.

문턱은 **양성 표본으로 맞춘다** — 체력 구슬(갈색 빈 유리 + 붉은 액체)은 눈으로 멀쩡하니
그것이 통과해야 하고, 마나 구슬만 떨어져야 한다([[pixel-verification-calibration]]).
"""
import sys, os
from PIL import Image

C = 31.5; R_IN = 28.2

def luma(p): return 0.299*p[0] + 0.587*p[1] + 0.114*p[2]

def measure(path, pct):
    im = Image.open(path).convert("RGBA"); px = im.load()
    top, bot = C - R_IN, C + R_IN
    fill_top = bot - pct * (bot - top)
    empt, full = [], []
    for y in range(64):
        for x in range(64):
            dx, dy = x - C, y - C
            if dx*dx + dy*dy > (R_IN - 2.6)**2: continue      # 테·가장자리 한 겹은 뺀다
            p = px[x, y]
            if p[3] == 0: continue
            if abs(y - fill_top) <= 1.5: continue             # 수면 한 줄은 뺀다
            (full if y >= fill_top else empt).append(p)
    if not empt or not full: return None
    le = [luma(p) for p in empt]; lf = [luma(p) for p in full]
    ae, af = sum(le)/len(le), sum(lf)/len(lf)
    # 정반사(흰 점)는 유리의 것이라 «빈 곳의 밝기»에서 뺀다 — 위 5%를 자른다
    le_s = sorted(le); hi_e = le_s[int(len(le_s)*0.95)]
    lf_s = sorted(lf); lo_f = lf_s[int(len(lf_s)*0.05)]
    tilt_f = sum(p[2]-p[0] for p in full)/len(full)
    tilt_e = sum(p[2]-p[0] for p in empt)/len(empt)
    return dict(pct=pct, 빈밝기=round(ae,1), 찬밝기=round(af,1), 밝기비=round(ae/max(af,0.01),2),
                빈최고=round(hi_e,1), 찬최저=round(lo_f,1), 뒤집힘=round(hi_e-lo_f,1),
                찬기울기=round(tilt_f,1), 빈기울기=round(tilt_e,1))

def run(d):
    rows = []
    for k in ("hp", "mp"):
        for pct in (1.0, 0.75, 0.5, 0.25, 0.08):
            p = os.path.join(d, f"{k}_{round(pct*100):03d}.png")
            if not os.path.exists(p): continue
            m = measure(p, pct)
            if m: rows.append((k, m))
    return rows

def show(name, rows):
    print(f"── {name} ──")
    print("종 채움  빈밝기 찬밝기 밝기비 | 빈최고 찬최저 뒤집힘 | 찬기울기 빈기울기")
    for k, m in rows:
        print(f"{k:>3} {m['pct']:>4}  {m['빈밝기']:>6} {m['찬밝기']:>6} {m['밝기비']:>6} |"
              f" {m['빈최고']:>6} {m['찬최저']:>6} {m['뒤집힘']:>6} | {m['찬기울기']:>8} {m['빈기울기']:>8}")

if __name__ == "__main__":
    for d in sys.argv[1:]:
        show(d, run(d))
