#!/usr/bin/env python3
"""**실물을 센다.** assets/ 안의 파일만 보고 진척을 말한다.

    python3 tools/pixellab/progress.py          # 사람이 읽는 표
    python3 tools/pixellab/progress.py --one    # 한 줄 요약(크론 보고용)

왜 따로 두는가 — 오늘 새벽 두 번, 내 장부(state.json)만 보고 "잘 돌고 있다"고 말했다가
둘 다 틀렸다. 장부는 **내가 걸었다고 믿는 것**이고 진실은 **디스크에 있는 파일**이다.
보고는 반드시 이 파일이 세어 준 숫자로 한다.
"""
import os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
KEYS = ["char/necro", "minion/skel", "minion/ghoul", "minion/golem",
        "mob/fallen", "mob/zombie", "mob/skelarch", "mob/brute", "mob/boss"]
DIRS = ("south", "south-east", "east", "north-east", "north",
        "north-west", "west", "south-west")

def count(key):
    base = os.path.join(ROOT, "assets", key)
    rot = sum(os.path.exists(os.path.join(base, d + ".png")) for d in DIRS)
    got = {}
    for grp in ("walk", "attack"):
        d = os.path.join(base, grp)
        n = 0
        if os.path.isdir(d):
            for x in os.listdir(d):
                if x in DIRS:
                    n += len([f for f in os.listdir(os.path.join(d, x)) if f.endswith(".png")])
        got[grp] = n
    return rot, got["walk"], got["attack"]

# 한 종의 만점: 회전 8 + 걷기 8방향×6 + 공격 8방향×6
FULL = 8 + 48 + 48

rows, tot, done = [], 0, 0
for k in KEYS:
    rot, w, a = count(k)
    s = rot + w + a
    tot += s
    ok = rot >= 8 and w >= 48 and a >= 48
    done += ok
    rows.append((k, rot, w, a, ok))

pct = round(tot / (FULL * len(KEYS)) * 100)
if "--one" in sys.argv:
    print(f"{done}/{len(KEYS)}종 완성 · 파일 {tot}/{FULL*len(KEYS)} ({pct}%)")
else:
    print(f"══ {done}/{len(KEYS)}종 완성 · {pct}% ══")
    for k, rot, w, a, ok in rows:
        print(f"  {'✓' if ok else '·'} {k:<16} 회전 {rot}/8  걷기 {w:>2}/48  공격 {a:>2}/48")
