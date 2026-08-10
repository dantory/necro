#!/usr/bin/env python3
"""assets/sprites.json 을 만든다 — **디스크에 실제로 있는 프레임 수**를 적어 둔다.

없으면 브라우저가 「있는 데까지 두드려」 프레임 수를 알아내야 한다. 한 번 열 때
404 가 304 번 났다 — 종마다 프레임 수가 달라서(해골 7 · 골렘 공격 5) 코드에 박을
수도 없었다. 파일 목록은 **굽는 쪽이 이미 아는 것**이므로 여기서 적어 준다.

주의: 이 파일은 에셋을 새로 구울 때마다 다시 만들어야 한다. 안 그러면 새 프레임이
있어도 안 불러온다. `python3 tools/make_manifest.py` 한 줄이면 된다.
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
DIRS = ["east", "south-east", "south", "south-west",
        "west", "north-west", "north", "north-east"]
# 8방향 스프라이트가 사는 곳
GROUPS = ["char", "minion", "mob"]


def count(base_dir, state, d):
    p = os.path.join(base_dir, state, d)
    if not os.path.isdir(p):
        return 0
    n = 0
    while os.path.isfile(os.path.join(p, f"{n}.png")):
        n += 1
    return n


def main():
    out, bases = {}, 0
    for g in sorted(GROUPS):
        gd = os.path.join(ASSETS, g)
        if not os.path.isdir(gd):
            continue
        for name in sorted(os.listdir(gd)):
            bd = os.path.join(gd, name)
            # 회전 8장이 다 있어야 8방향 스프라이트로 본다
            if not all(os.path.isfile(os.path.join(bd, f"{d}.png")) for d in DIRS):
                continue
            entry = {}
            for state in ("walk", "attack"):
                per = {d: count(bd, state, d) for d in DIRS}
                if not any(per.values()):
                    continue
                # 여덟 방향이 같으면 숫자 하나로 줄인다 — 대개 같다
                uniq = set(per.values())
                entry[state] = per[DIRS[0]] if len(uniq) == 1 else per
            if entry:
                out[f"{g}/{name}"] = entry
                bases += 1

    dst = os.path.join(ASSETS, "sprites.json")
    with open(dst, "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write("\n")

    total = 0
    for k, v in sorted(out.items()):
        line = []
        for st in ("walk", "attack"):
            if st not in v:
                continue
            c = v[st]
            line.append(f"{st} {c if isinstance(c, int) else '고르지않음'+str(sorted(set(c.values())))}")
            total += (c * 8) if isinstance(c, int) else sum(c.values())
        print(f"  {k}: {' · '.join(line)}")
    print(f"{bases}종 · 프레임 {total}장 → assets/sprites.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
