#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# ⑧-g **「이제 재사용이 진짜 벽인가」** (ROADMAP G 끝, 08-17 09:1x 의 물음).
#
# ⑧-f(`ab_capstruct2`)가 답한 것: merge 는 상한참을 **55% → 17%** 로 내리고 실효 화력을
# **+36%** 붙였는데, 뺀 38%p 중 **27%p 가 그대로 재사용으로 갔다**(34 → 61%). 그래서
# ④(통이 옮겨 앉았나)에 걸려 **안 켰다.** 딱딱한 벽(자리가 없다)이 **기다림**으로 바뀐 것이다.
#
# 그러니 이번 물음은 **merge 를 켠 채로** 재사용을 묻는 것이다 — 상한이 벽이던 판에서
# 재사용을 재면 ⑧-d 가 겪은 자리를 그대로 되밟는다(그때의 판에 대한 답을 이번 판에 쓰는 것).
#
#     base       — 지금 그대로                                            … 닻
#     merge      — ㉢ __CAP_MERGE=1.25                                    … ⑧-f 의 그 팔
#     merge+b2   — ㉢ + ㉣ __RAISE_BATCH=2                                … 재사용 팔(구조)
#     merge+b3   — ㉢ + ㉣ __RAISE_BATCH=3
#
# ★ ㉣ 는 **값이 아니라 구조**다 — 재사용 «초»를 한 톨도 안 깎는다. 한 번 나간 소환이
#   그 자리에서 최대 n 기까지 이어 서고, 이어 서는 몸도 **시체·마나를 평소대로** 낸다.
#   그래서 벽이 「기다림」에서 **「자원」**으로 옮겨 앉는다(이 게임의 뜻: 시체가 자원).
#   ⑧-d 에서 재사용을 **값으로** 깎는 팔은 이미 졌으므로 값은 안 쓴다
#   (그 자리 경고: 「거리·시야 두 번 · 마나 한 번 · 재사용 한 번 졌다 — 다시 만지지 말 것」).
#
# ★ js/ 는 손잡이 «정의»만 들어갔고 기본값은 꺼짐(RAISE_BATCH_DEF=1) — 켜는 것은
#   `LH_CAPMERGE`·`LH_RAISEBATCH` 환경변수뿐이라 되돌릴 것이 없다.
#   꺼짐이 예전과 같음을 **JSON 전체로 댔다**(씨앗3·3분 · 다른 칸 **0**).
#
# 끝 조건:
#   ① **재사용이 30% 아래**(판 전체 자 — ⑧-f 에서 자 둘의 눈금이 다른 것을 잡았다)
#   ② 최고층 합이 base 에서 씨앗 폭(±6) 안 — 값만 맞추고 깊이를 치르면 값 팔의 재판이다
#   ③ 머릿수 **또는** 실효 화력이 merge 보다 늘었나(「자리만 늘고 비었다」가 아닌가)
#   ④ 통이 옮겨 앉았을 뿐인가(마나부족·상한참이 merge 보다 8%p 넘게 커졌나)
#   ★ ④ 는 이 팔에서 **가장 걸리기 쉬운 자리**다 — 3분 맛보기에서 재사용 70→13% 인데
#     마나부족이 20→72% 였다(씨앗 하나·3분이라 판단은 아니다, [[seed-the-probe]]).
#     그래도 「자원으로 옮겨 앉았다」는 이 게임이 바라는 결이므로, ④ 에 걸리면
#     **버리기 전에 마나 쪽 출구를 같이 보는 것**이 다음 물음이 된다(값으로 마나를
#     올리는 것이 아니라 — 태우기·회수 같은 구조로).
#
# 씨앗 3·9·5 · 12분(⑧-e·⑧-f 와 같은 씨앗이라 그때 표와 곧장 견줄 수 있다).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
OUT=tmp; mkdir -p "$OUT"
SEEDS="3 9 5"

node tools/chrome_guard.mjs 2>&1 | tail -2

arm() {                            # $1=이름  $2=LH_CAPMERGE("" 면 안 켬)  $3=LH_RAISEBATCH("" 면 안 켬)
  env2=""
  [ -n "$2" ] && env2="LH_CAPMERGE=$2"
  [ -n "$3" ] && env2="$env2 LH_RAISEBATCH=$3"
  for s in $SEEDS; do
    echo "───────── ARM $1 · SEED $s · $(date +%H:%M) ─────────"
    env LH_SEED=$s $env2 node tools/loop_health.mjs 12 "$OUT/cap3_$1_$s.json" 2>&1 \
      | grep -E '최고|뒷정리 군세|자리가 빈|판 전체 막힘|얕은 쪽|errors' | head -8 || echo "FAIL $1 $s"
  done
}

echo "═════ 팔 넷 × 씨앗 셋 × 12분 · $(date +%H:%M) ═════"
arm base     ""    ""
arm merge    1.25  ""
arm mergeb2  1.25  2
arm mergeb3  1.25  3

echo "═════ 끝 · $(date +%H:%M) ═════"
# 같은 판을 건너뛴 절대 수치는 못 믿으므로 **같은 씨앗의 팔끼리** 견준다.
python3 - <<'PY'
import json, pathlib
SE = (3, 9, 5)
ARMS = ("base", "merge", "mergeb2", "mergeb3")

def load(arm, s):
    try:
        return json.loads(pathlib.Path(f"tmp/cap3_{arm}_{s}.json").read_text())
    except Exception:
        return None

"""★★ 막힘 넷은 **판 전체 자**(`시간.막힘전` · 720초)로 잰다.
   `시간.군세.막힘` 은 **뒷정리 창 안**만 세는 다른 자다 — 같은 판에서 19% 대 55% 로
   갈린다(⑧-f 에서 잡았다). 끝 조건이 판 전체 자로 적혀 있으니 판정도 그 자로 한다."""

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
print(f"{'씨앗':>4} " + " ".join(f"{a+' 최고/화력/재사용/마나':>26}" for a in ARMS))
for s in SE:
    cells = []
    for a in ARMS:
        d = load(a, s)
        if not d:
            cells.append(f"{'?':>26}"); continue
        st = stat(d); rows[a].append(st); tops[a].append(st[0])
        cells.append(f"{f'{st[0]} / {st[3]:.0f} / {st[5]:.0f}% / {st[6]:.0f}%':>26}")
    print(f"{s:>4} " + " ".join(cells))
print()

def avg(v): return sum(v) / len(v) if v else float("nan")
agg = {}
for a in ARMS:
    r = rows[a]
    if not r:
        print(f"{a:>8}  (자료 없음)"); continue
    agg[a] = tuple(avg([x[i] for x in r]) for i in range(8))
    top, cap, head, pw, jam, cd, mana, corp = agg[a]
    print(f"{a:>8}  최고층 {top:.1f}(합 {sum(tops[a])}) · 머릿수 {head:.1f} · 실효화력 {pw:.0f}")
    print(f"          막힘 → 상한참 {jam:.0f}% · 재사용 {cd:.0f}% · 마나부족 {mana:.0f}% · 시체없음 {corp:.0f}%")
print()

if "base" not in agg or "merge" not in agg:
    print("── 판정 ── 닻(base·merge)이 안 끝났다 — 판정하지 않는다.")
else:
    b, m = agg["base"], agg["merge"]
    for a in ("mergeb2", "mergeb3"):
        if a not in agg:
            print(f"── {a} 판정 ── 안 끝났다."); continue
        top, cap, head, pw, jam, cd, mana, corp = agg[a]
        print(f"── {a} 판정 (①② 는 base · ③④ 는 merge 대비) ──")
        print(f"  ① 재사용 {cd:.0f}% (base {b[5]:.0f}% · merge {m[5]:.0f}%) < 30% ... "
              + ("OK" if cd < 30 else "미달 — 기다림이 아직 판을 묻는다"))
        d_top = sum(tops[a]) - sum(tops["base"])
        print(f"  ② 최고층 합 {sum(tops[a])} vs base {sum(tops['base'])} ({d_top:+d}) · 씨앗 폭 ±6 안 ... "
              + ("OK — 안 깎임" if abs(d_top) <= 6 else "★ 폭 밖 — 깊이를 치렀다"))
        head_up, pw_up = head > m[2] * 1.02, pw > m[3] * 1.02
        print(f"  ③ 군세 늘었나 — 머릿수 {head:.1f} vs {m[2]:.1f} · 실효화력 {pw:.0f} vs {m[3]:.0f} ... "
              + ("OK — " + ("머릿수↑ " if head_up else "") + ("실효화력↑" if pw_up else "")
                 if (head_up or pw_up) else "★ 제자리 — 「자리만 늘고 비었다」의 재판"))
        moved = (mana > m[6] + 8) or (jam > m[4] + 8)
        print(f"  ④ 통이 옮겨 앉았나 — 마나부족 {mana:.0f}%(merge {m[6]:.0f}) · 상한참 {jam:.0f}%(merge {m[4]:.0f}) ... "
              + ("★ 옮겨 앉음 — 기다림을 «자원»으로 밀었다" if moved else "OK — 다른 통이 대신 커지지 않음"))
        ok = (cd < 30) and (abs(d_top) <= 6) and (head_up or pw_up) and (not moved)
        print(f"  → **{a}: {'통과 후보' if ok else '미달'}** (네 조건 모두 OK 여야 통과 후보)")
        if not ok and (cd < 30) and moved:
            print("     ★ ④ 로만 걸렸다면 **버리기 전에 읽을 것**: 「기다림 → 자원」은 이 게임이"
                  " 바라는 결이다. 다음 물음은 마나 쪽 «구조» 출구다(값으로 마나를 올리는 게 아니라).")
        print()
    print("  ★ 통과 후보이면 켜는 자리는 js/core.js 의 `RAISE_BATCH_DEF` 1 → n 이다"
          " (그리고 merge 를 켠다면 `CAP_MERGE_DEF` 0 → 1.25) — 환경변수는 검수기 것이다.")
PY
git -C "$REPO" status --porcelain js/ | head -3
echo "─────────────────────────────────────────────────────────"
echo "결과 JSON: $REPO/tmp/cap3_<base|merge|mergeb2|mergeb3>_<씨앗>.json"
