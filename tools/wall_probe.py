#!/usr/bin/env python3
"""벽인가, 되짚기가 싼 것인가 — 판이 «오르내리기만» 할 때 어느 쪽인지 가르는 자.

ROADMAP 「D 에 붙는다 · ㉠」이 물은 것: 20분째에 제 최고층에 못 서 있는 판이
  ① 되짚기가 싸서 곧바로 되돌아가는 것인지
  ② 그 층을 정말 못 이기는 것인지.
둘은 고칠 자리가 정반대다(① 되짚기 값 · ② 그 층의 위협).

재는 것 셋:
  ㉠ 되짚기 분   — 죽은 층으로 돌아오는 데 걸린 분(분 해상도). 싸면 1분.
  ㉡ 천장 죽음   — 제 최고층에서 되풀이해 죽는가(같은 층 죽음 횟수).
  ㉢ 죽는 몸     — 죽는 순간의 최대체력이 «층피해×SURVIVE_HITS» 에 붙어 있는가.
                   붙어 있으면 그 층에서는 **내가 만든 몸이 없는 것**이다
                   (hpMaxOf = max(bodyHp, floorDmg×5) — 깊이가 앞엣것을 덮는다).

쓰기:  python3 tools/wall_probe.py tmp/collapse_vow024
"""
import json, glob, os, sys, statistics as st
from collections import Counter

SURVIVE_HITS = 5

def load(d):
    for f in sorted(glob.glob(os.path.join(d, "*.json"))):
        yield os.path.basename(f)[:-5], json.load(open(f))

def main(d):
    rows = []
    all_deaths = []
    print(f"{'판':12} {'최고층':>5} {'끝층':>4} {'죽음':>4} {'천장죽음':>7} {'되짚기분(중앙)':>13}  뒤6분 층")
    for name, j in load(d):
        r, dea = j["rows"], j["deaths"]
        floors = [x["층"] for x in r]
        peak = max(x["최고층"] for x in r)
        retr = []
        for de in dea:
            m, F = de["분"], de["층"]
            for i in range(m, len(r)):          # rows[0] == 분1
                if r[i]["층"] >= F:
                    retr.append(r[i]["분"] - m); break
        ceil_deaths = sum(1 for de in dea if de["층"] >= peak * 0.98)
        all_deaths += [(name, de) for de in dea]
        med = st.median(retr) if retr else None
        print(f"{name:12} {peak:5} {floors[-1]:4} {len(dea):4} {ceil_deaths:7} "
              f"{('-' if med is None else med):>13}  {floors[-6:]}")

    print("\n══ ㉢ 죽는 순간의 «몸» ══  (층별 · 최대체력이 층피해×5 에 붙었으면 그 층엔 내 몸이 없다)")
    byfl = {}
    for name, de in all_deaths:
        byfl.setdefault(de["층"], []).append(de)
    for fl in sorted(byfl):
        v = byfl[fl]
        hp = sorted({x["최대체력"] for x in v})
        dmg = sorted({x["층피해"] for x in v})
        pinned = len(hp) == 1 and len(dmg) == 1 and abs(hp[0] - dmg[0] * SURVIVE_HITS) < 1
        share = st.median(x["5초피해"] / max(1, x["최대체력"]) for x in v)
        mark = "  ★ 몸이 층에 먹혔다(전부 같은 값)" if pinned else ""
        print(f"   층{fl:3} n={len(v):2} 최대체력 {str(hp if len(hp) < 4 else f'{hp[0]}~{hp[-1]} ({len(hp)}가지)'):>34}"
              f" · 층피해 {dmg[0]:>7} · 5초피해/최대체력 {share:5.2f}{mark}")

    tot = Counter(de["층"] for _, de in all_deaths)
    print(f"\n   죽음 층 쏠림: {tot.most_common(6)}  (합 {sum(tot.values())})")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "tmp/collapse_vow024")
