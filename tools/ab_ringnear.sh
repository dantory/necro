#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# ⑧-d **뒷정리의 「걷는 시간」.**
#   ⑧-c 로 줄(spawnQ)이 안 막히자 제일 큰 조각이 뒷정리로 옮겨 갔다
#   (다가감 42% · 놀고 27% · 때림 30%) — 안 때리는 시간이 여전히 절반 이상이다.
#   손잡이 기록(docs/ROADMAP.md)에 따르면 이미 답이 갈려 있다:
#     ✗ 구역제를 푼다 — 나빴다(놀고가 통째로 다가감이 됐고 총 이동이 되레 늘었다)
#     ✓ **거리 자체를 줄인다** — RING_SPAWN 300→190 이 층당 27.8→20.5초를 냈다
#   그래서 이번에도 **거리**다. 다만 얼마나 줄일지는 벽이 하나 있어서 눈으로 못 정한다:
#     · 소환수의 진 RING_HOLD = 150, 제자리에서 알아보는 거리 WATCH = 186.
#     · 적은 RING_SPAWN + 0~50 에 선다. 190 이면 190~240 — **거의 다 WATCH 밖**이라
#       군대는 적이 걸어 들어올 때까지 「놀고」, 그 뒤에 「다가감」이다. 두 조각의 뿌리가 같다.
#     · 그렇다고 진(150) 안으로 넣으면 적이 **군대 한복판에 튀어나온다** — 얕은 층의
#       「너무 한번에 짠! 하고 나오는듯」과 같은 자리로 돌아간다.
#   그래서 진 언저리(155)와 진 안(130)을 같이 재서 **곡선의 모양**을 본다.
#     base 190 · mid 155(진 바로 밖 · 대부분 WATCH 안) · near 130(진 안 — 눈으로도 봐야 함)
#   끝 조건: **뒷정리 비율 30% 아래**이고 **최고층이 안 깎일 것**.
# ★ 씨앗 **여섯**. 코드를 건드리면 난수 소비가 달라져 같은 씨앗도 다른 판이 되므로
#   한두 판의 차이는 잡음이다.
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
BK=$(mktemp -d); cp js/battle.js "$BK"/
restore() { cp "$BK"/battle.js js/battle.js; }
trap restore EXIT
SEEDS="3 9 5 1 2 4"

set_ring() {                       # $1 = 값
  restore
  python3 - "$1" <<'PY'
import sys, pathlib, re
v = sys.argv[1]; p = pathlib.Path("js/battle.js"); s = p.read_text()
s2, n = re.subn(r'export const RING_SPAWN = \d+;',
                f'export const RING_SPAWN = {v};    /* AB */', s, count=1)
assert n == 1, "RING_SPAWN 을 못 찾았다"
p.write_text(s2)
PY
}

arm() {                            # $1 = 이름, $2 = 값
  set_ring "$2"
  for s in $SEEDS; do
    echo "───────── ARM $1(RING_SPAWN=$2) · SEED $s · $(date +%H:%M) ─────────"
    LH_SEED=$s node tools/loop_health.mjs 12 "tmp/rn_$1_$s.json" 2>&1 | tail -8 || echo "FAIL $1 $s"
  done
}

arm base 190
arm mid  155
arm near 130

restore
echo "═════ 끝 · $(date +%H:%M) ═════"
# 같은 판을 건너뛴 절대 수치는 못 믿으므로 **같은 씨앗의 팔끼리** 견준다.
python3 - <<'PY'
import json, pathlib
SE = (3, 9, 5, 1, 2, 4)
ARMS = ("base", "mid", "near")
def load(arm, s):
    try:
        return json.loads(pathlib.Path(f"tmp/rn_{arm}_{s}.json").read_text())
    except Exception:
        return None

def stat(d):
    """(최고층, 뒷정리비율%, 다가감%, 놀고%, 때림%, 죽음)"""
    t = d["시간"]
    새땅 = t["기다림"] + t["싸움"] + t["뒷정리"]
    뒤 = t.get("뒷") or {}
    마리 = max(1e-9, 뒤.get("마리초", 0))
    dead = d.get("deaths")
    dead = len(dead) if isinstance(dead, list) else dead
    return (d["rows"][-1]["최고층"],
            100 * t["뒷정리"] / max(1e-9, 새땅),
            100 * 뒤.get("다가감", 0) / 마리,
            100 * 뒤.get("놀고", 0) / 마리,
            100 * 뒤.get("때림", 0) / 마리,
            dead)

rows = {a: [] for a in ARMS}
print(f"{'씨앗':>4} " + " ".join(f"{a+' 최고층/뒷정리%':>20}" for a in ARMS))
for s in SE:
    cells = []
    for a in ARMS:
        d = load(a, s)
        if not d:
            cells.append(f"{'?':>20}"); continue
        st = stat(d); rows[a].append(st)
        cells.append(f"{str(st[0])+' / '+format(st[1],'.0f')+'%':>20}")
    print(f"{s:>4} " + " ".join(cells))
print()
def avg(v): return sum(v) / len(v) if v else float("nan")
for a in ARMS:
    r = rows[a]
    if not r: print(f"{a:>5}  (자료 없음)"); continue
    print(f"{a:>5}  최고층 {avg([x[0] for x in r]):.1f} · 뒷정리 {avg([x[1] for x in r]):.1f}% "
          f"· (다가감 {avg([x[2] for x in r]):.0f} · 놀고 {avg([x[3] for x in r]):.0f} "
          f"· 때림 {avg([x[4] for x in r]):.0f}) · 죽음 {avg([x[5] for x in r]):.2f}")
print()
print("판정: 뒷정리 30% 아래 + 최고층 안 깎임 → 그 값을 택한다.")
print("      최고층이 깎이면 거리가 아니라 **틈**을 없앤 것이다(적이 걸어오는 사이에")
print("      군대가 회복/재소환할 짬이 사라진다) — 그때는 한 단계 큰 값으로 물러난다.")
print("      near(130) 를 택하려면 **눈으로도 봐야 한다** — 적이 진 안에 튀어나오는지.")
PY
git -C "$REPO" status --porcelain js/
