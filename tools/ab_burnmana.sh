#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# ⑧-h **㉤ 마른 마나에 문을 연다** (ROADMAP G · 08-17 10:0x).
#
# ⑧-g(`ab_capstruct3`)가 답한 것: ㉣(한 손짓에 여럿)은 **졌다.** 깊이를 −34·−44 나
# 치렀고 실효 화력이 3분의 1로 무너졌다. 그런데 **왜** 무너졌는지가 이 팔의 까닭이다 —
# ㉣ 은 벽을 「기다림」에서 **「시체」**로 옮길 셈이었는데, 실제로 옮겨 앉은 자리는
# **마나**였다(마나부족 12 → 36·40%). 시체는 오히려 **쌓였다**(죽는 순간 시체
# base 18~36구 대 ㉣ 46~72구).
#
# 그 판에서 「시체 태우기」(시체 4 → 마나)는 이 게임이 이미 가진 **마나 쪽 출구**인데,
# 자동 진행에서 열리는 조건이 **「시체가 넘칠 때」뿐**이었다 — `S.corpses >= 140*0.85`
# = **119구**. 즉 마나가 40% 를 막고 시체가 46~72구로 «중간»인 그 판에서 문은
# **한 번도 안 열렸다.** 벽인 자리에서 안 열리는 문은 손잡이가 아니라 벽이다
# ([[knob-that-does-nothing]]).
#
#     base       — 지금 그대로                                   … 닻
#     merge      — ㉢ __CAP_MERGE=1.25                           … ⑧-f·⑧-g 의 그 팔
#     burn35     — ㉤ __BURN_MANA=0.35 (merge 없이)              … 문만 열어 본다
#     mergeburn  — ㉢ + ㉤                                       … 둘을 같이
#
# ★ ㉤ 는 **값을 안 만진다** — 태우는 양(4구)도 얻는 마나(BURN_MP)도 그대로다.
#   바뀌는 것은 **「언제 열리는가」** 뿐이고, 소환에 쓸 몫 BURN_KEEP=12 구는 남긴다.
# ★ 꺼짐이 예전과 같음을 **JSON 전체로 댔다** — 씨앗3·3분 · 197칸 중 **다른 칸 0**.
#   기본값은 `BURN_MANA_DEF 0` = 꺼짐이고 켜는 것은 `LH_BURNMANA` 뿐이라 되돌릴 것이 없다.
#
# ⚠️ **미리 적어 두는 예상과 그 뜻**(재고 나서 고쳐 쓰지 않으려고 먼저 적는다):
#   merge 판에서 마나부족은 **12% 밖에 안 된다**(벽은 재사용 61%다). 그러니 ㉤ 이
#   merge 판을 크게 바꾸면 그게 이상한 것이다. 이 팔이 진짜로 묻는 것은 둘이다 —
#   ⓐ 문을 열어도 **안 나빠지는가**(태우느라 폭발할 시체를 뺏지 않는가)
#   ⓑ base 판에서 마나부족 7% 를 더 줄이고 **깊이를 조금이라도 미는가**
#   ⓐ 만 참이고 ⓑ 가 거짓이면 ㉤ 은 **켜지 않고 문만 고쳐 둔 채 남긴다** —
#   마나가 벽이 되는 판(㉣ 같은)이 다시 오면 그때 쓰는 출구다.
#
# 끝 조건(ㅡ 넷 다여야 켠다):
#   ① 마나부족이 base 보다 줄었나
#   ② 최고층 합이 base 에서 씨앗 폭(±6) 안 — 값만 맞추고 깊이를 치르면 진 팔이다
#   ③ 시체없음이 base 보다 8%p 넘게 커지지 않았나(태우느라 소환을 굶기지 않았나)
#   ④ 실효 화력이 base 보다 안 줄었나(폭발할 시체를 태워 없애지 않았나)
#
# 씨앗 3·9·5 · 12분(⑧-e·⑧-f·⑧-g 와 같은 씨앗이라 그때 표와 곧장 견줄 수 있다).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
OUT=tmp; mkdir -p "$OUT"
SEEDS="3 9 5"

node tools/chrome_guard.mjs 2>&1 | tail -2

arm() {                            # $1=이름  $2=LH_CAPMERGE("" 면 안 켬)  $3=LH_BURNMANA("" 면 안 켬)
  env2=""
  [ -n "$2" ] && env2="LH_CAPMERGE=$2"
  [ -n "$3" ] && env2="$env2 LH_BURNMANA=$3"
  for s in $SEEDS; do
    echo "───────── ARM $1 · SEED $s · $(date +%H:%M) ─────────"
    env LH_SEED=$s $env2 node tools/loop_health.mjs 12 "$OUT/burn_$1_$s.json" 2>&1 \
      | grep -E '최고|뒷정리 군세|자리가 빈|판 전체 막힘|얕은 쪽|errors' | head -8 || echo "FAIL $1 $s"
  done
}

echo "═════ 팔 넷 × 씨앗 셋 × 12분 · $(date +%H:%M) ═════"
arm base       ""    ""
arm merge      1.25  ""
arm burn35     ""    0.35
arm mergeburn  1.25  0.35

echo "═════ 끝 · $(date +%H:%M) ═════"
# 같은 판을 건너뛴 절대 수치는 못 믿으므로 **같은 씨앗의 팔끼리** 견준다.
python3 - <<'PY'
import json, pathlib
SE = (3, 9, 5)
ARMS = ("base", "merge", "burn35", "mergeburn")

def load(arm, s):
    try:
        return json.loads(pathlib.Path(f"tmp/burn_{arm}_{s}.json").read_text())
    except Exception:
        return None

"""★★ 막힘 넷은 **판 전체 자**(`시간.막힘전` · 720초)로 잰다 — ⑧-f 에서 자 둘의
   눈금이 다른 것을 잡았다(같은 판에서 19% 대 55%). 끝 조건이 판 전체 자로
   적혀 있으니 판정도 그 자로 한다."""

def stat(d):
    """(최고층, 상한, 머릿수, 실효화력, 상한참%, 재사용%, 마나부족%, 시체없음%)"""
    top = d["rows"][-1]["최고층"]
    A = (d.get("시간") or {}).get("군세") or {}
    M = (d.get("시간") or {}).get("막힘전") or {}
    n = ((A.get("초") or 0) / 0.05) or 1e-9
    초 = M.get("초") or 0
    pc = lambda k: 100 * M.get(k, 0) / 초 if 초 else 0.0
    return (top, A.get("상한합", 0) / n, A.get("머릿수합", 0) / n, A.get("화력합", 0) / n,
            pc("상한참"), pc("재사용"), pc("마나부족"), pc("시체없음"))

rows = {a: [] for a in ARMS}
tops = {a: [] for a in ARMS}
print("막힘 %% 는 **판 전체 720초** 자다(막힘전).")
print(f"{'씨앗':>4} " + " ".join(f"{a+' 최고/화력/마나/시체없음':>26}" for a in ARMS))
for s in SE:
    cells = []
    for a in ARMS:
        d = load(a, s)
        if not d:
            cells.append(f"{'?':>26}"); continue
        st = stat(d); rows[a].append(st); tops[a].append(st[0])
        cells.append(f"{f'{st[0]} / {st[3]:.0f} / {st[6]:.0f}% / {st[7]:.0f}%':>26}")
    print(f"{s:>4} " + " ".join(cells))
print()

def avg(v): return sum(v) / len(v) if v else float("nan")
agg = {}
for a in ARMS:
    r = rows[a]
    if not r:
        print(f"{a:>9}  (자료 없음)"); continue
    agg[a] = tuple(avg([x[i] for x in r]) for i in range(8))
    top, cap, head, pw, jam, cd, mana, corp = agg[a]
    print(f"{a:>9}  최고층 {top:.1f}(합 {sum(tops[a])}) · 머릿수 {head:.1f} · 실효화력 {pw:.0f}")
    print(f"           막힘 → 상한참 {jam:.0f}% · 재사용 {cd:.0f}% · 마나부족 {mana:.0f}% · 시체없음 {corp:.0f}%")
print()

if "base" not in agg:
    print("── 판정 ── 닻(base)이 안 끝났다 — 판정하지 않는다.")
else:
    b = agg["base"]
    for a in ("burn35", "mergeburn"):
        if a not in agg:
            print(f"── {a} 판정 ── 안 끝났다."); continue
        top, cap, head, pw, jam, cd, mana, corp = agg[a]
        ref = agg.get("merge") if a == "mergeburn" else b     # mergeburn 은 merge 가 제 닻이다
        rn = "merge" if a == "mergeburn" else "base"
        if ref is None: ref, rn = b, "base"
        print(f"── {a} 판정 (닻: {rn}) ──")
        print(f"  ① 마나부족 {mana:.0f}% vs {rn} {ref[6]:.0f}% ... "
              + ("OK — 줄었다" if mana < ref[6] - 0.5 else "미달 — 문을 열어도 안 줄었다"))
        d_top = sum(tops[a]) - sum(tops["base"])
        print(f"  ② 최고층 합 {sum(tops[a])} vs base {sum(tops['base'])} ({d_top:+d}) · 씨앗 폭 ±6 안 ... "
              + ("OK — 안 깎임" if abs(d_top) <= 6 else "★ 폭 밖 — 깊이를 치렀다"))
        print(f"  ③ 시체없음 {corp:.0f}% vs {rn} {ref[7]:.0f}% (+8%p 안) ... "
              + ("OK — 소환을 안 굶겼다" if corp <= ref[7] + 8 else "★ 태우느라 소환을 굶겼다"))
        print(f"  ④ 실효화력 {pw:.0f} vs {rn} {ref[3]:.0f} ... "
              + ("OK — 안 줄었다" if pw >= ref[3] * 0.98 else "★ 줄었다 — 폭발할 시체를 태웠다"))
        okc = (mana < ref[6] - 0.5) and abs(d_top) <= 6 and corp <= ref[7] + 8 and pw >= ref[3] * 0.98
        print(f"  → **{a}: {'통과 후보' if okc else '미달'}** (네 조건 모두 OK 여야 통과 후보)")
        print()
print("  ★ 통과 후보이면 켜는 자리는 js/core.js 의 `BURN_MANA_DEF` 0 → 0.35 다 — 환경변수는 검수기 것이다.")
print("  ★ ⓐ(안 나빠짐)만 참이고 ⓑ(깊이를 밈)가 거짓이면 **안 켜고 문만 고쳐 둔 채 남긴다.**")
PY
echo "─────────────────────────────────────────────────────────"
echo "결과 JSON: $REPO/tmp/burn_<base|merge|burn35|mergeburn>_<씨앗>.json"
