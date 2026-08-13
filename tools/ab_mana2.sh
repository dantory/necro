#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# ⑧-d **자리가 빈 이유 = 마나부족.**
#   `tools/army_why.sh`(2026-08-14 00:34, 씨앗 여섯 × 12분)가 통에 나눠 부은 결과:
#     시체없음 0.0% · **마나부족 27.5%** · 재사용 23.4% · 셀차례 3.7% · [꽉참 45.3%]
#   그리고 **씨앗이 갈린다** — 군세 6.2~6.5 로 꽉 찬 판(최고층 46~50)은 마나부족이 11%인데,
#   군세 3.4~3.5 인 판(최고층 38·38)은 **42%·52%** 다. 못 가는 판은 마나가 말라서 못 간다.
#   죽을 때 사진도 여섯 씨앗 전부 **「제일 모자란 것 = 마나」**(0.07~0.10, 1.0 이 넉넉함).
#
#   ▸ 값을 짐작한 게 아니라 **auto() 를 다시 읽어 마나가 어디로 새는지 찾았다**:
#     · nova(시체 폭발) — mp 18 · cd 2.2초 · 시체 28 개 위면 **늘 돈다**. 곧 8마나/초 요구.
#       마나 재생은 2.2/초 대다. 소환(raise 6)보다 **코드에서 뒤**지만, 한 번 돌면
#       다음 놈이 죽어 raise 가 필요할 때 통이 비어 있다.
#     · burn(시체 태우기) — 시체 4 → **마나 16** · cd 3.0초. 그런데 문턱이
#       `CORPSE_MAX * 0.85` = **119개**다. 실제로 들고 있는 시체는 **30~40개** —
#       **한 번도 안 돈다.** 시체는 남아도는데(시체없음 0%) 마나로 바꾸는 길이 닫혀 있었다.
#
#     ㉠ base — 지금 그대로
#     ㉡ burn — 태우기 문턱 0.85 → **0.15**(21개). 남는 시체를 마나로 돌린다
#     ㉢ nova — 폭발을 **마나 절반 위일 때만**. 소환 몫을 남긴다
#
#   끝 조건(⑧-d): **뒷정리 30% 아래**이고 **최고층이 안 깎일 것.**
#   ★ 씨앗 **여섯**. 코드를 건드리면 난수 소비가 달라지니 한두 판 차이는 잡음이다.
#   코드는 복사본으로 되돌린다(git checkout 은 남의 작업까지 지운다).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
BK=$(mktemp -d); cp js/main.js "$BK"/
restore() { cp "$BK"/main.js js/main.js; }
trap restore EXIT
SEEDS="3 9 5 1 2 4"

arm() {                            # $1 = 이름
  for s in $SEEDS; do
    echo "───────── ARM $1 · SEED $s · $(date +%H:%M) ─────────"
    LH_SEED=$s node tools/loop_health.mjs 12 "tmp/mn2_$1_$s.json" 2>&1 | tail -8 || echo "FAIL $1 $s"
  done
}

restore; arm base

restore
python3 - <<'PY'
import pathlib
p = pathlib.Path("js/main.js"); s = p.read_text()
old = 'if (!globalThis.__NOSINK && S.corpses >= CORPSE_MAX * 0.85 && S.mp < mpMaxOf() * 0.90) cast("burn");'
new = 'if (!globalThis.__NOSINK && S.corpses >= CORPSE_MAX * 0.15 && S.mp < mpMaxOf() * 0.90) cast("burn");  /* AB */'
assert s.count(old) == 1, "burn 줄을 못 찾았다"
p.write_text(s.replace(old, new, 1))
PY
arm burn

restore
python3 - <<'PY'
import pathlib
p = pathlib.Path("js/main.js"); s = p.read_text()
old = 'if (S.mobs.length && S.corpses >= CORPSE_MAX * 0.2) cast("nova");'
new = 'if (S.mobs.length && S.corpses >= CORPSE_MAX * 0.2 && S.mp > mpMaxOf() * 0.5) cast("nova");  /* AB */'
assert s.count(old) == 1, "nova 줄을 못 찾았다"
p.write_text(s.replace(old, new, 1))
PY
arm nova

restore
echo "═════ 끝 · $(date +%H:%M) ═════"
# 같은 판을 건너뛴 절대 수치는 못 믿으므로 **같은 씨앗의 팔끼리** 견준다.
python3 - <<'PY'
import json, pathlib
SE = (3, 9, 5, 1, 2, 4)
ARMS = ("base", "burn", "nova")

def load(arm, s):
    try:
        return json.loads(pathlib.Path(f"tmp/mn2_{arm}_{s}.json").read_text())
    except Exception:
        return None

def stat(d):
    """(최고층, 뒷정리%, 마나부족%, 재사용%, 꽉참%, 군세, 마나%, 죽음)"""
    t = d["시간"]
    새땅 = t["기다림"] + t["싸움"] + t["뒷정리"]
    A = t.get("군세") or {}
    막 = A.get("막힘") or {}
    초 = A.get("초") or 0
    n = (초 / 0.05) or 1e-9
    pc = lambda k: 100 * 막.get(k, 0) / 초 if 초 else float("nan")
    dead = d.get("deaths")
    dead = len(dead) if isinstance(dead, list) else dead
    return (d["rows"][-1]["최고층"],
            100 * t["뒷정리"] / max(1e-9, 새땅),
            pc("마나부족"), pc("재사용"), pc("상한참"),
            A.get("머릿수합", 0) / n, 100 * A.get("마나율합", 0) / n, dead)

rows = {a: [] for a in ARMS}
print(f"{'씨앗':>4} " + " ".join(f"{a+' 최고층/뒷정리/마나부족':>26}" for a in ARMS))
for s in SE:
    cells = []
    for a in ARMS:
        d = load(a, s)
        if not d:
            cells.append(f"{'?':>26}"); continue
        st = stat(d); rows[a].append(st)
        cells.append(f"{f'{st[0]} / {st[1]:.0f}% / {st[2]:.0f}%':>26}")
    print(f"{s:>4} " + " ".join(cells))
print()
def avg(v): return sum(v) / len(v) if v else float("nan")
for a in ARMS:
    r = rows[a]
    if not r: print(f"{a:>5}  (자료 없음)"); continue
    print(f"{a:>5}  최고층 {avg([x[0] for x in r]):.1f} · 뒷정리 {avg([x[1] for x in r]):.1f}% "
          f"│ 마나부족 {avg([x[2] for x in r]):.0f}% · 재사용 {avg([x[3] for x in r]):.0f}% "
          f"· 꽉참 {avg([x[4] for x in r]):.0f}% │ 군세 {avg([x[5] for x in r]):.1f} "
          f"· 마나 {avg([x[6] for x in r]):.0f}% · 죽음 {avg([x[7] for x in r]):.2f}")
print()
print("판정 순서:")
print("  1) **마나부족 통이 줄었나** — 안 줄었으면 그 팔은 마나를 안 푼 것이다(축이 틀림).")
print("  2) 줄었으면 그 몫이 **군세**로 갔나 — 군세가 안 늘면 다른 통(재사용)이 먹은 것이다.")
print("  3) 그 다음이 최고층·뒷정리다. ⑧-d 끝 조건은 뒷정리 30% 아래 + 최고층 안 깎임.")
print("  ⚠ 거리·시야 손잡이는 두 번 졌다 — 여기서 다시 만지지 말 것.")
PY
git -C "$REPO" status --porcelain js/
