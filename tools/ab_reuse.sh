#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# ⑧-d **남은 통은 「재사용대기」 하나다.**
#   앞선 세 자가 같은 모양으로 졌다 — **한 통을 비우면 다음 통이 그만큼 먹는다**:
#     ✗ 구역제 풀기(2026-08-13)  놀고 ↓ → 다가감 ↑
#     ✗ 거리 줄이기(2026-08-14)  놀고 ↓ → 다가감 ↑ · 최고층 44.8→41.7
#     ✗ 마나 풀기 (2026-08-14)  마나 23%→3% → **재사용 24%→51%** · 최고층 44.8→29.5
#   burn 팔이 결정적이다: 마나를 20%p 나 풀고 마나가 81% 남았는데도 **군세가 되레 줄었다**
#   (5.3→4.6). 자원이 아니라 **손이 하나뿐이라 못 세운 것**이다.
#
#   ▸ 코드가 값을 말한다(js/core.js:106–108 · js/battle.js:526):
#       raise cd **1.2초** · ghoul **2.0초** · golem **6.0초**, 군세 상한은 **17기**.
#       전멸 뒤 5기에서 상한까지 채우는 데 **재사용만으로 15~25초** — 층당 12~14초짜리
#       판에서 **한 층을 통째로 쓰는 값**이다. 시체는 남아돌고(시체없음 0%) 마나도 남는데
#       (40~81%) 군대가 안 선다.
#
#     ㉠ base — 지금 그대로
#     ㉡ half — 소환 재사용 **절반**(raise 0.6 · ghoul 1.0 · golem 3.0). 늘 빠른 손
#     ㉢ rally — **군세가 상한 절반 아래일 때만** 소환 재사용 면제. 복구 구간만 푼다
#
#   판정 순서: ①재사용 통이 줄었나 → ②그 몫이 **군세**로 갔나 → ③최고층·뒷정리.
#   ★ ②가 이 자의 핵심이다. 앞의 셋은 전부 ②에서 졌다 — 통만 옮겨 앉으면 또 진 것이다.
#   끝 조건(⑧-d): **뒷정리 30% 아래**이고 **최고층이 안 깎일 것.**
#   ★ 씨앗 **여섯**. 코드를 건드리면 난수 소비가 달라지니 한두 판 차이는 잡음이다.
#   ⚠ 거리·시야(두 번 짐)·마나(한 번 짐) 손잡이는 **여기서 다시 만지지 않는다.**
#   코드는 복사본으로 되돌린다(git checkout 은 남의 작업까지 지운다).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
BK=$(mktemp -d); cp js/core.js js/battle.js "$BK"/
restore() { cp "$BK"/core.js js/core.js; cp "$BK"/battle.js js/battle.js; }
trap restore EXIT
SEEDS="3 9 5 1 2 4"

arm() {                            # $1 = 이름
  for s in $SEEDS; do
    echo "───────── ARM $1 · SEED $s · $(date +%H:%M) ─────────"
    LH_SEED=$s node tools/loop_health.mjs 12 "tmp/ru_$1_$s.json" 2>&1 | tail -8 || echo "FAIL $1 $s"
  done
}

restore; arm base

restore
python3 - <<'PY'
import pathlib
p = pathlib.Path("js/core.js"); s = p.read_text()
for old, new in (
    ('{ id:"raise", n:"해골 되살리기", ico:"☠", mp:6,  cd:1.2,',
     '{ id:"raise", n:"해골 되살리기", ico:"☠", mp:6,  cd:0.6,'),
    ('{ id:"ghoul", n:"구울 되살리기", ico:"✦", mp:12, cd:2.0,',
     '{ id:"ghoul", n:"구울 되살리기", ico:"✦", mp:12, cd:1.0,'),
    ('{ id:"golem", n:"흙 골렘",      ico:"◆", mp:30, cd:6.0,',
     '{ id:"golem", n:"흙 골렘",      ico:"◆", mp:30, cd:3.0,'),
):
    assert s.count(old) == 1, f"못 찾았다: {old[:30]}"
    s = s.replace(old, new, 1)
p.write_text(s)
PY
arm half

restore
python3 - <<'PY'
import pathlib
p = pathlib.Path("js/battle.js"); s = p.read_text()
old = '  if ((S.cd[id] || 0) > 0 || S.mp < mpNeed || S.corpses < sk.corpse) return false;'
new = ('  /* AB rally — 군세가 상한 절반 아래면 소환 재사용을 면제한다(복구 구간만) */\n'
       '  const __rally = isRaise(id) && armyN() < armyCap() * 0.5;\n'
       '  if ((!__rally && (S.cd[id] || 0) > 0) || S.mp < mpNeed || S.corpses < sk.corpse) return false;')
assert s.count(old) == 1, "cd 검사 줄을 못 찾았다"
p.write_text(s.replace(old, new, 1))
PY
arm rally

restore
echo "═════ 끝 · $(date +%H:%M) ═════"
# 같은 판을 건너뛴 절대 수치는 못 믿으므로 **같은 씨앗의 팔끼리** 견준다.
python3 - <<'PY'
import json, pathlib
SE = (3, 9, 5, 1, 2, 4)
ARMS = ("base", "half", "rally")

def load(arm, s):
    try:
        return json.loads(pathlib.Path(f"tmp/ru_{arm}_{s}.json").read_text())
    except Exception:
        return None

def stat(d):
    """(최고층, 뒷정리%, 재사용%, 마나부족%, 꽉참%, 군세, 마나%, 죽음)"""
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
            pc("재사용"), pc("마나부족"), pc("상한참"),
            A.get("머릿수합", 0) / n, 100 * A.get("마나율합", 0) / n, dead)

rows = {a: [] for a in ARMS}
print(f"{'씨앗':>4} " + " ".join(f"{a+' 최고층/뒷정리/재사용':>26}" for a in ARMS))
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
          f"│ 재사용 {avg([x[2] for x in r]):.0f}% · 마나부족 {avg([x[3] for x in r]):.0f}% "
          f"· 꽉참 {avg([x[4] for x in r]):.0f}% │ 군세 {avg([x[5] for x in r]):.1f} "
          f"· 마나 {avg([x[6] for x in r]):.0f}% · 죽음 {avg([x[7] for x in r]):.2f}")
print()
print("판정 순서:")
print("  1) **재사용 통이 줄었나** — 안 줄었으면 그 팔은 손을 안 푼 것이다(축이 틀림).")
print("  2) 줄었으면 그 몫이 **군세**로 갔나 — ★ 앞의 세 자는 전부 여기서 졌다.")
print("     군세가 안 늘고 다른 통(꽉참·셀차례)만 커졌으면 통이 옮겨 앉은 것이고 또 진 것이다.")
print("  3) 그 다음이 최고층·뒷정리다. ⑧-d 끝 조건은 뒷정리 30% 아래 + 최고층 안 깎임.")
print("  ⚠ 거리·시야(두 번 짐) · 마나(한 번 짐) 손잡이는 여기서 다시 만지지 말 것.")
PY
git -C "$REPO" status --porcelain js/
