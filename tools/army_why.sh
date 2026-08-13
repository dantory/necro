#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# ⑧-d **뒷정리의 걷는 시간 — 이번엔 「머릿수」다.**
#   거리·시야 손잡이는 두 번 다 같은 답을 냈다(docs/ROADMAP.md 손잡이 기록):
#     ✗ 구역제 풀기 · ✗ RING_SPAWN 190→155→130. 「놀고」를 줄인 만큼이 그대로 「다가감」이 됐다.
#   남은 설명은 머릿수다 — 뒷정리 동안 선 군대가 평균 **5.3기**인데 상한은 17 이다.
#   둘레를 다섯으로 덮으니 남은 놈이 어디 있든 **누군가는 반대편에서 걸어와야 한다.**
#
#   ★ 이번 판은 **팔이 없다.** 값을 고르기 전에 **왜 안 서는지**부터 본다 —
#     지난 두 번의 실패가 「짐작한 축을 바로 A/B 했다」에서 왔기 때문이다.
#     loop_health 에 통 넷을 새로 달았다(검수기 안에만 · 읽기만 · 난수 소비 그대로):
#       시체없음 · 마나부족 · 재사용대기 · 셀차례기다림(auto 의 0.35초 박자)
#     셈으로 미리 짚어 두면 — auto() 는 0.35초마다 **한 기**만 세우고 raise 는 재사용
#     1.2초다. 상한 17 을 0 에서 채우는 데만 **20초**가 걸린다. 사실이면 손댈 곳은
#     거리도 화력도 아니고 **다시 서는 속도**다.
#   끝: 여섯 씨앗에서 「자리가 빈 시간」의 제일 큰 이유가 한 통으로 모이면 그것이 다음 팔이다.
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
node tools/chrome_guard.mjs || true
SEEDS="3 9 5 1 2 4"
for s in $SEEDS; do
  echo "───────── SEED $s · $(date +%H:%M) ─────────"
  LH_SEED=$s node tools/loop_health.mjs 12 "tmp/aw_$s.json" 2>&1 | tail -12 || echo "FAIL $s"
done
echo "═════ 끝 · $(date +%H:%M) ═════"
python3 - <<'PY'
import json, pathlib
SE = (3, 9, 5, 1, 2, 4)
rows = []
for s in SE:
    try:
        d = json.loads(pathlib.Path(f"tmp/aw_{s}.json").read_text())
    except Exception:
        print(f"{s:>4}  (자료 없음)"); continue
    t = d["시간"]; A = t.get("군세"); P = t.get("뒷") or {}
    if not A or not A.get("초"):
        print(f"{s:>4}  (군세 눈금 없음 — 뒷정리가 0 이었나)"); continue
    n = A["초"] / 0.05
    막 = A["막힘"]; 초 = A["초"]
    rows.append((A, 막, 초, d["rows"][-1]["최고층"]))
    pc = lambda v: f"{100*v/초:.0f}%"
    print(f"{s:>4}  군세 {A['머릿수합']/n:4.1f}/{A['상한합']/n:4.1f} · 시체 {A['시체합']/n:4.1f} · "
          f"마나 {100*A['마나율합']/n:3.0f}% │ 시체없음 {pc(막['시체없음']):>4} · "
          f"마나부족 {pc(막['마나부족']):>4} · 재사용 {pc(막['재사용']):>4} · "
          f"셀차례 {pc(막['셀차례']):>4} · 꽉참 {pc(막['상한참']):>4} │ 최고층 {d['rows'][-1]['최고층']}")
if rows:
    tot = sum(r[2] for r in rows)
    agg = {k: sum(r[1][k] for r in rows) for k in rows[0][1]}
    n = sum(r[0]["초"] for r in rows) / 0.05
    print()
    print(f"합계  군세 {sum(r[0]['머릿수합'] for r in rows)/n:.1f} / 상한 "
          f"{sum(r[0]['상한합'] for r in rows)/n:.1f} · 최고층 평균 {sum(r[3] for r in rows)/len(rows):.1f}")
    for k, v in sorted(agg.items(), key=lambda x: -x[1]):
        print(f"   {k:>8} {100*v/tot:5.1f}%")
    빈 = tot - agg["상한참"]
    큰 = max(((k, v) for k, v in agg.items() if k != "상한참"), key=lambda x: x[1])
    print()
    if 빈 / tot < 0.15:
        print("판정: 뒷정리 내내 군대가 거의 꽉 차 있었다 — **머릿수는 뿌리가 아니다.**")
        print("      그러면 남은 것은 상한 자체(armyCap)거나, 5기가 상한이었다는 뜻이다.")
    else:
        print(f"판정: 뒷정리의 {100*빈/tot:.0f}% 가 **자리가 빈 시간**이고 제일 큰 이유는 **{큰[0]}**({100*큰[1]/tot:.0f}%) 다.")
        print("      다음 팔은 그 통 하나만 연다 — 시체없음이면 수급, 재사용/셀차례면 다시 서는 속도,")
        print("      마나부족이면 저주(amp)가 먼저 먹는 자리를 다시 본다.")
PY
git -C "$REPO" status --porcelain js/
