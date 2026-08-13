#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# ⑧-d **마지막 통 — 「상한」이다.**
#   통 네 개를 차례로 비웠는데 뒷정리는 45 → 38.7 → 38.8% 에서 멎었다. 네 번 다 같은 모양:
#     ✗ 구역제 풀기(2026-08-13)  놀고 ↓ → 다가감 ↑
#     ✗ 거리 줄이기(2026-08-14)  놀고 ↓ → 다가감 ↑ · 최고층 44.8→41.7
#     ✗ 마나 풀기 (2026-08-14)  마나 23%→3%  → **재사용 24%→51%** · 최고층 44.8→29.5
#     ✗ 재사용 풀기(2026-08-14)  재사용 24%→5% → **꽉참 50%→60%** · 군세 5.3→5.5(제자리)
#   ⚠ 거리·시야(두 번) · 마나(한 번) · 재사용(한 번) — **넷 다 여기서 다시 만지지 않는다.**
#
#   ▸ 남은 것은 꽉참 50~60% 하나인데, 이건 「자리가 없어 못 세운다」가 아니라
#     **세울 자리 자체가 적다**는 뜻이다. 뒷정리 상한이 씨앗 열여덟 판 전부 **5.1~7.8기**다.
#     그리고 **상한이 판을 가른다** — 상한 6.6~7.8 인 판은 최고층 46~52,
#     상한 5.1~5.6 인 판은 최고층 **34~40**. 앞서 「마나가 말랐다」던 씨앗 1·4 가
#     바로 상한 5.1~5.8 짜리다(군대가 작아 층이 안 넘어간 그림자였다).
#
#   ▸ 코드가 값을 말한다(js/core.js:956–959 · 890–903):
#       armyBase() = min(6, 3 + (lv-1)/3) — **Lv.10 에 6 에서 멎는다.**
#       그 뒤는 강화 `army`(base 40 · 1.55^n)뿐인데 autoForge 는 **제일 싼 것부터** 산다.
#       넷 중 army 가 제일 비싸(hp 14 · mp 16 · dmg 22 · **army 40**) 제일 적게 팔린다 —
#       12분 판에서 상한이 6~8 에 박히는 이유다. 60분 곡선에서 금이 1.4~5.2억 쌓이는데
#       상한이 6~8 이던 그 기록과 **같은 수치**다.
#
#     ㉠ base  — 지금 그대로
#     ㉡ first — autoForge 가 **군세를 제일 먼저** 산다(살 수 있으면 다른 것을 제친다)
#     ㉢ depth — 상한이 **층 깊이를 따라 자란다**(8층마다 +1). 강화와 무관한 축
#
#   판정 순서: ①상한이 실제로 올랐나 → ②그 몫이 **군세(머릿수)**로 갔나 → ③최고층·뒷정리.
#   ★ ②가 이 자의 핵심이다. 앞의 넷은 전부 ②에서 졌다 — 통만 옮겨 앉으면 또 진 것이다.
#     이번엔 「자리가 늘었는데 그 자리가 또 비어 있다」가 지는 모양이다(꽉참↓ 인데 군세 제자리).
#   끝 조건(⑧-d): **뒷정리 30% 아래**이고 **최고층이 안 깎일 것.**
#   ★ 씨앗 **여섯**. 코드를 건드리면 난수 소비가 달라지니 한두 판 차이는 잡음이다.
#   코드는 복사본으로 되돌린다(git checkout 은 남의 작업까지 지운다).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
BK=$(mktemp -d); cp js/core.js "$BK"/
restore() { cp "$BK"/core.js js/core.js; }
trap restore EXIT
SEEDS="3 9 5 1 2 4"

arm() {                            # $1 = 이름
  for s in $SEEDS; do
    echo "───────── ARM $1 · SEED $s · $(date +%H:%M) ─────────"
    LH_SEED=$s node tools/loop_health.mjs 12 "tmp/cap_$1_$s.json" 2>&1 | tail -8 || echo "FAIL $1 $s"
  done
}

restore; arm base

restore
python3 - <<'PY'
import pathlib
p = pathlib.Path("js/core.js"); s = p.read_text()
old = ('    let pick = null, lo = Infinity, reforge = false;\n'
       '    for (const k in UPS)       { const c = upCost(k);      if (c < lo) { lo = c; pick = k; reforge = false; } }\n'
       '    for (const k of GEAR_KEYS) { const c = reforgeCost(k); if (c < lo) { lo = c; pick = k; reforge = true;  } }\n')
new = ('    let pick = null, lo = Infinity, reforge = false;\n'
       '    /* AB first — 군세 상한을 제일 먼저 산다(살 수 있으면 나머지를 제친다) */\n'
       '    const __ac = upCost("army");\n'
       '    if (META.gold - __ac >= keep) { pick = "army"; lo = __ac; reforge = false; }\n'
       '    if (pick === null) {\n'
       '    for (const k in UPS)       { const c = upCost(k);      if (c < lo) { lo = c; pick = k; reforge = false; } }\n'
       '    for (const k of GEAR_KEYS) { const c = reforgeCost(k); if (c < lo) { lo = c; pick = k; reforge = true;  } }\n'
       '    }\n')
assert s.count(old) == 1, "autoForge 고르는 자리를 못 찾았다"
p.write_text(s.replace(old, new, 1))
PY
arm first

restore
python3 - <<'PY'
import pathlib
p = pathlib.Path("js/core.js"); s = p.read_text()
old = 'export const armyBase = () => Math.min(6, 3 + Math.floor((META.lv - 1) / 3));'
new = ('/* AB depth — 상한이 층 깊이를 따라 자란다(8층마다 +1). 강화(금)와 무관한 축 */\n'
       'export const armyBase = () => Math.min(6, 3 + Math.floor((META.lv - 1) / 3))'
       ' + Math.floor((S.floor | 0) / 8);')
assert s.count(old) == 1, "armyBase 를 못 찾았다"
p.write_text(s.replace(old, new, 1))
PY
arm depth

restore
echo "═════ 끝 · $(date +%H:%M) ═════"
# 같은 판을 건너뛴 절대 수치는 못 믿으므로 **같은 씨앗의 팔끼리** 견준다.
python3 - <<'PY'
import json, pathlib
SE = (3, 9, 5, 1, 2, 4)
ARMS = ("base", "first", "depth")

def load(arm, s):
    try:
        return json.loads(pathlib.Path(f"tmp/cap_{arm}_{s}.json").read_text())
    except Exception:
        return None

def stat(d):
    """(최고층, 뒷정리%, 상한, 군세, 꽉참%, 재사용%, 마나부족%, 죽음)"""
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
            A.get("상한합", 0) / n, A.get("머릿수합", 0) / n,
            pc("상한참"), pc("재사용"), pc("마나부족"), dead)

rows = {a: [] for a in ARMS}
print(f"{'씨앗':>4} " + " ".join(f"{a+' 최고층/상한/군세':>24}" for a in ARMS))
for s in SE:
    cells = []
    for a in ARMS:
        d = load(a, s)
        if not d:
            cells.append(f"{'?':>24}"); continue
        st = stat(d); rows[a].append(st)
        cells.append(f"{f'{st[0]} / {st[2]:.1f} / {st[3]:.1f}':>24}")
    print(f"{s:>4} " + " ".join(cells))
print()
def avg(v): return sum(v) / len(v) if v else float("nan")
for a in ARMS:
    r = rows[a]
    if not r: print(f"{a:>6}  (자료 없음)"); continue
    print(f"{a:>6}  최고층 {avg([x[0] for x in r]):.1f} · 뒷정리 {avg([x[1] for x in r]):.1f}% "
          f"│ **상한 {avg([x[2] for x in r]):.1f} · 군세 {avg([x[3] for x in r]):.1f}** "
          f"│ 꽉참 {avg([x[4] for x in r]):.0f}% · 재사용 {avg([x[5] for x in r]):.0f}% "
          f"· 마나부족 {avg([x[6] for x in r]):.0f}% · 죽음 {avg([x[7] for x in r]):.2f}")
print()
print("판정 순서:")
print("  1) **상한이 실제로 올랐나** — 안 올랐으면 그 팔은 손을 안 푼 것이다(축이 틀림).")
print("  2) 올랐으면 그 몫이 **군세(머릿수)**로 갔나 — ★ 앞의 네 자는 전부 여기서 졌다.")
print("     상한만 늘고 머릿수가 제자리면(=꽉참↓ 인데 자리가 또 빔) 통이 옮겨 앉은 것이고 또 진 것이다.")
print("  3) 그 다음이 최고층·뒷정리다. ⑧-d 끝 조건은 뒷정리 30% 아래 + 최고층 안 깎임.")
print("  ⚠ 거리·시야(두 번 짐) · 마나(한 번 짐) · 재사용(한 번 짐) 손잡이는 여기서 다시 만지지 말 것.")
PY
git -C "$REPO" status --porcelain js/
