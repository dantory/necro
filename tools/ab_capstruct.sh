#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# ⑧-e **군세 상한을 값이 아니라 «구조»로 푼다** (ROADMAP 「군세 상한이 유일한 병목이다」).
#   ⑧-d 에서 값 손잡이 다섯(구역제·거리·마나·재사용·상한)이 전부 졌다. 상한 «값»을 올린
#   두 팔(first·depth)도 졌다 — +15% 올렸더니 군세는 +8%, 마나부족이 통만 옮겨 앉고 최고층은
#   되레 깎였다. 그래서 이번엔 상한 수치를 **한 톨도 안 올린다.** 「상한에 걸린 시간」이
#   「아무것도 안 하는 시간」이 되지 않도록 **막힌 자리에 다른 출구**를 낸다. 남아도는 자원은
#   시체다(시체없음 0초 · 쌓인 시체 29~75/상한 140).
#
#     base  — 둘 다 꺼짐(예전 그대로)
#     over  — ㉡ __CAP_OVER=6 : 상한 위로 6 기까지 더 세우되 초과분은 시체 3배·마나 2배
#     merge — ㉢ __CAP_MERGE=1.25 : 꽉 차면 머릿수 대신 제일 약한 같은 종을 한 단계 키운다
#
#   켜는 것은 **코드 수정이 아니라 환경변수 → loop_health 가 페이지에 심는다**(LH_WALL→__ARMY_WALL
#   과 같은 문: LH_CAPOVER→__CAP_OVER · LH_CAPMERGE→__CAP_MERGE). git checkout 은 안 쓴다.
#
#   판정(자가 스스로 말한다):
#     ① 막힘 세 이유(상한참·재사용·마나부족) 중 **제일 큰 것이 60% 아래**인가(ROADMAP 끝 조건)
#     ② **최고층이 안 깎였나**(base 대비 −10% 안)
#     ③ 군세(**머릿수** 또는 **실효 화력**)가 실제로 늘었나 — 「자리만 늘고 비었다」의 재판이 아닌가
#     ④ 통이 옮겨 앉았을 뿐인가(마나부족·재사용이 base 보다 대신 커졌나)
#   ★ 씨앗 여섯. loop_health 는 씨앗을 박아 A/B 가 성립한다(같은 씨앗이면 같은 판).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
OUT=tmp; mkdir -p "$OUT"
SEEDS="3 9 5 1 2 4"

node tools/chrome_guard.mjs 2>&1 | tail -2

arm() {                            # $1=이름  $2=LH_CAPOVER("" 면 안 켬)  $3=LH_CAPMERGE("" 면 안 켬)
  over=""; merge=""
  [ -n "$2" ] && over="LH_CAPOVER=$2"
  [ -n "$3" ] && merge="LH_CAPMERGE=$3"
  for s in $SEEDS; do
    echo "───────── ARM $1 · SEED $s · $(date +%H:%M) ─────────"
    env LH_SEED=$s $over $merge node tools/loop_health.mjs 12 "$OUT/capst_$1_$s.json" 2>&1 \
      | grep -E '최고|뒷정리 군세|자리가 빈|errors' | head -8 || echo "FAIL $1 $s"
  done
}

echo "═════ 상한 구조 팔 셋 × 씨앗 여섯 × 12분 · $(date +%H:%M) ═════"
arm base  ""  ""
arm over  6   ""
arm merge ""  1.25

echo "═════ 끝 · $(date +%H:%M) ═════"
# 같은 판을 건너뛴 절대 수치는 못 믿으므로 **같은 씨앗의 팔끼리** 견준다.
python3 - <<'PY'
import json, pathlib
SE = (3, 9, 5, 1, 2, 4)
ARMS = ("base", "over", "merge")

def load(arm, s):
    try:
        return json.loads(pathlib.Path(f"tmp/capst_{arm}_{s}.json").read_text())
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
print(f"{'씨앗':>4} " + " ".join(f"{a+' 최고/머릿수/화력':>22}" for a in ARMS))
for s in SE:
    cells = []
    for a in ARMS:
        d = load(a, s)
        if not d:
            cells.append(f"{'?':>22}"); continue
        st = stat(d); rows[a].append(st)
        cells.append(f"{f'{st[0]} / {st[2]:.1f} / {st[3]:.0f}':>22}")
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
    print(f"{a:>6}  최고층 {top:.1f} · 상한 {cap:.1f} · 머릿수 {head:.1f} · 실효화력 {pw:.0f}")
    print(f"        막힘 → 상한참 {jam:.0f}% · 재사용 {cd:.0f}% · 마나부족 {mana:.0f}% · 시체없음 {corp:.0f}%")
print()

if "base" not in agg:
    print("── 판정 ── base 가 안 끝났다 — 판정하지 않는다.")
else:
    b = agg["base"]
    for a in ("over", "merge"):
        if a not in agg:
            print(f"── {a} 판정 ── 안 끝났다.\n"); continue
        top, cap, head, pw, jam, cd, mana, corp = agg[a]
        btop, bcap, bhead, bpw, bjam, bcd, bmana, bcorp = b
        print(f"── {a} 판정 (base 대비) ──")
        biggest = max(jam, cd, mana)
        which = "상한참" if biggest == jam else ("재사용" if biggest == cd else "마나부족")
        print(f"  ① 막힘 제일 큰 이유({which} {biggest:.0f}%) < 60% ... "
              + ("OK" if biggest < 60 else "미달 — 아직 한 통이 판을 묻는다"))
        print(f"  ② 최고층 {top:.1f} vs base {btop:.1f} ({(top/btop-1)*100:+.0f}%) ... "
              + ("OK — 안 깎임" if top >= btop * 0.90 else "★ 깎였다(−10% 초과) — 값 팔의 재판"))
        head_up = head > bhead * 1.02
        pw_up = pw > bpw * 1.02
        print(f"  ③ 군세 늘었나 — 머릿수 {head:.1f} vs {bhead:.1f} · 실효화력 {pw:.0f} vs {bpw:.0f} ... "
              + ("OK — " + ("머릿수↑" if head_up else "") + ("실효화력↑" if pw_up else "")
                 if (head_up or pw_up) else "★ 제자리 — 「자리만 늘고 비었다」의 재판"))
        moved = (mana > bmana + 8) or (cd > bcd + 8)
        print(f"  ④ 통이 옮겨 앉았나 — 마나부족 {mana:.0f}%(base {bmana:.0f}) · 재사용 {cd:.0f}%(base {bcd:.0f}) ... "
              + ("★ 옮겨 앉음 — 상한참을 다른 통으로 밀었을 뿐일 수 있다" if moved else "OK — 다른 통이 대신 커지지 않음"))
        ok = (biggest < 60) and (top >= btop * 0.90) and (head_up or pw_up) and (not moved)
        print(f"  → **{a}: {'통과 후보' if ok else '미달'}** (네 조건 모두 OK 여야 통과 후보)\n")
PY
git -C "$REPO" status --porcelain tmp/ | head -3
echo "─────────────────────────────────────────────────────────"
echo "결과 JSON: $REPO/tmp/capst_<base|over|merge>_<씨앗>.json"
