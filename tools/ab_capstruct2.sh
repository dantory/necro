#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# ⑧-f **「상한참」이 되돌아왔다 — 다시 잰다** (ROADMAP G 끝, 08-17 08:1x).
#
# 08-16 06:0x 에 「군세 상한이 유일한 병목이다」를 **아니다**로 닫았다(그때 상한참 16~26% ·
# 제일 큰 통은 재사용 40~52%). 그런데 08-17 08:0x 에 `NOVA_GULP_FLAT 16` 을 켜서 못을
# 얕게 만들자 **막는 자리가 옮겨 갔다** — 상한참 48~63%.
#   ★ 그때 판정이 틀린 게 아니다. **그때의 판**에 대한 답이었고, 손잡이를 돌렸으니
#     **다시 재야 하는 답**이다. 닫은 항목 하나를 근거로 이걸 넘기지 않는다.
#
# ⑧-e 에서 이미 팔 하나가 상한참을 **20% → 0%** 로 없앴다(㉢ merge · 최고층 −3% 로 잡음 안).
# 그 팔은 「상한이 병목이 아니다」라는 **그때의 전제** 때문에 안 켰다. 전제가 바뀌었으니
# **그 팔부터 다시 재는 것**이 제일 싸다. 그래서 이번엔 팔을 둘로 줄인다:
#
#     base  — 지금 그대로(NOVA_GULP_FLAT 16 이 이미 코드에 들어 있다)   … 닻
#     merge — ㉢ __CAP_MERGE=1.25 : 꽉 차면 머릿수 대신 제일 약한 같은 종을 한 단계 키운다
#
#   켜는 것은 **코드 수정이 아니라 환경변수** → loop_health 가 페이지에 심는다
#   (LH_CAPMERGE → __CAP_MERGE). 그래서 js/ 를 한 줄도 안 고치고 되돌릴 것도 없다.
#
# 끝 조건(ROADMAP G):
#   ① **「상한참」이 30% 아래**
#   ② **최고층 합이 씨앗 폭(±6) 안** — 값만 맞추고 깊이가 깎이면 값 팔의 재판이다
#   ③ 군세(머릿수 **또는** 실효 화력)가 실제로 늘었나 — 「자리만 늘고 비었다」가 아닌가
#   ④ 통이 옮겨 앉았을 뿐인가(재사용·마나부족이 base 보다 8%p 넘게 커졌나)
#   ★ merge 는 머릿수를 안 늘리고 **세기**를 늘리는 팔이므로 ③ 은 실효 화력 쪽으로 붙는다.
#
# 씨앗 3·9·5 · 12분(⑧-e 와 같은 씨앗이라 그때 표와 곧장 견줄 수 있다).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
OUT=tmp; mkdir -p "$OUT"
SEEDS="3 9 5"

node tools/chrome_guard.mjs 2>&1 | tail -2

arm() {                            # $1=이름  $2=LH_CAPMERGE("" 면 안 켬)
  merge=""
  [ -n "$2" ] && merge="LH_CAPMERGE=$2"
  for s in $SEEDS; do
    echo "───────── ARM $1 · SEED $s · $(date +%H:%M) ─────────"
    env LH_SEED=$s $merge node tools/loop_health.mjs 12 "$OUT/cap2_$1_$s.json" 2>&1 \
      | grep -E '최고|뒷정리 군세|자리가 빈|판 전체 막힘|얕은 쪽|errors' | head -8 || echo "FAIL $1 $s"
  done
}

echo "═════ 상한 팔 둘 × 씨앗 셋 × 12분 · $(date +%H:%M) ═════"
arm base  ""
arm merge 1.25

echo "═════ 끝 · $(date +%H:%M) ═════"
# 같은 판을 건너뛴 절대 수치는 못 믿으므로 **같은 씨앗의 팔끼리** 견준다.
python3 - <<'PY'
import json, pathlib
SE = (3, 9, 5)
ARMS = ("base", "merge")

def load(arm, s):
    try:
        return json.loads(pathlib.Path(f"tmp/cap2_{arm}_{s}.json").read_text())
    except Exception:
        return None

def stat(d):
    """(최고층, 상한, 머릿수, 실효화력, 상한참%, 재사용%, 마나부족%, 시체없음%)"""
    top = d["rows"][-1]["최고층"]
    A = (d.get("시간") or {}).get("군세") or {}
    막 = A.get("막힘") or {}
    초 = A.get("초") or 0
    n = (초 / 0.05) or 1e-9
    pc = lambda k: 100 * 막.get(k, 0) / 초 if 초 else 0.0
    return (top, A.get("상한합", 0) / n, A.get("머릿수합", 0) / n, A.get("화력합", 0) / n,
            pc("상한참"), pc("재사용"), pc("마나부족"), pc("시체없음"))

rows = {a: [] for a in ARMS}
tops = {a: [] for a in ARMS}
print(f"{'씨앗':>4} " + " ".join(f"{a+' 최고/머릿수/화력/상한참':>28}" for a in ARMS))
for s in SE:
    cells = []
    for a in ARMS:
        d = load(a, s)
        if not d:
            cells.append(f"{'?':>28}"); continue
        st = stat(d); rows[a].append(st); tops[a].append(st[0])
        cells.append(f"{f'{st[0]} / {st[2]:.1f} / {st[3]:.0f} / {st[4]:.0f}%':>28}")
    print(f"{s:>4} " + " ".join(cells))
print()

def avg(v): return sum(v) / len(v) if v else float("nan")
agg = {}
for a in ARMS:
    r = rows[a]
    if not r:
        print(f"{a:>6}  (자료 없음)"); continue
    agg[a] = tuple(avg([x[i] for x in r]) for i in range(8))
    top, cap, head, pw, jam, cd, mana, corp = agg[a]
    print(f"{a:>6}  최고층 {top:.1f}(합 {sum(tops[a])}) · 상한 {cap:.1f} · 머릿수 {head:.1f} · 실효화력 {pw:.0f}")
    print(f"        막힘 → 상한참 {jam:.0f}% · 재사용 {cd:.0f}% · 마나부족 {mana:.0f}% · 시체없음 {corp:.0f}%")
print()

if "base" not in agg or "merge" not in agg:
    print("── 판정 ── 팔 하나가 안 끝났다 — 판정하지 않는다.")
else:
    b, m = agg["base"], agg["merge"]
    btop_sum, mtop_sum = sum(tops["base"]), sum(tops["merge"])
    top, cap, head, pw, jam, cd, mana, corp = m
    btop, bcap, bhead, bpw, bjam, bcd, bmana, bcorp = b
    print("── merge 판정 (base 대비) ──")
    print(f"  ① 상한참 {jam:.0f}% (base {bjam:.0f}%) < 30% ... "
          + ("OK" if jam < 30 else "미달 — 상한이 아직 판을 묻는다"))
    d_top = mtop_sum - btop_sum
    print(f"  ② 최고층 합 {mtop_sum} vs base {btop_sum} ({d_top:+d}) · 씨앗 폭 ±6 안 ... "
          + ("OK — 안 깎임" if abs(d_top) <= 6 else "★ 폭 밖 — 깊이를 치렀다"))
    head_up = head > bhead * 1.02
    pw_up = pw > bpw * 1.02
    print(f"  ③ 군세 늘었나 — 머릿수 {head:.1f} vs {bhead:.1f} · 실효화력 {pw:.0f} vs {bpw:.0f} ... "
          + ("OK — " + ("머릿수↑ " if head_up else "") + ("실효화력↑" if pw_up else "")
             if (head_up or pw_up) else "★ 제자리 — 「자리만 늘고 비었다」의 재판"))
    moved = (mana > bmana + 8) or (cd > bcd + 8)
    print(f"  ④ 통이 옮겨 앉았나 — 마나부족 {mana:.0f}%(base {bmana:.0f}) · 재사용 {cd:.0f}%(base {bcd:.0f}) ... "
          + ("★ 옮겨 앉음 — 상한참을 다른 통으로 밀었을 뿐일 수 있다" if moved else "OK — 다른 통이 대신 커지지 않음"))
    ok = (jam < 30) and (abs(d_top) <= 6) and (head_up or pw_up) and (not moved)
    print(f"  → **merge: {'통과 후보' if ok else '미달'}** (네 조건 모두 OK 여야 통과 후보)")
    print()
    print("  ★ 통과 후보이면 켜는 자리는 js/core.js 의 `CAP_MERGE_DEF` 0 → 1.25 다"
          " (환경변수는 검수기 것이고, 게임 기본값은 이 상수다).")
PY
git -C "$REPO" status --porcelain js/ | head -3
echo "─────────────────────────────────────────────────────────"
echo "결과 JSON: $REPO/tmp/cap2_<base|merge>_<씨앗>.json"
