#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# ══ A-1 **끝 조건을 재는 자** — 60분 곡선에서 죽음이 깊이로 내려왔나 ════════════
#
#   A-1 의 구멍은 09:0x 에 메웠다(첫 예고를 서는 즉시 · 예고를 남기고 죽으면 터짐 ·
#   덜 여문 수법 OPEN_MUL=0.12). 그때 잰 것은 **띠별 받은 피해와 최고층뿐**이라
#   A-1 을 닫을 수 없다. 끝 조건은 처음부터 하나였다:
#
#       60분 곡선에서 **죽은 층의 중앙값 ≥ 40** · 죽음이 앞 5분에 몰리지 않을 것
#       (고치기 전 중앙값 5 · 죽음 100% 가 앞 5분) · 최고층은 **80 아래로 안 떨어질 것**
#
#   ★ 손은 하나도 안 댄다 — HEAD 그대로 60분 × 씨앗 1·3·9. 팔 하나짜리 자다.
#   ★ 한 판은 표본 하나(seed-the-probe) — 셋을 다 돌리고 **합쳐서** 중앙값을 낸다.
#   ★ 죽음이 0 이면 「통과」가 아니라 **판정 불가**다(맞을 일이 없으면 중앙값도 없다) —
#     그 경우는 구멍이 덜 메워진 것이므로 그렇게 찍는다.
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
MIN=60
# 썩은 렌더러 하나가 세 판을 통째로 못 믿게 만든다(TOOLS.md).
node tools/chrome_guard.mjs || echo "(chrome_guard 실패 — 그대로 간다)"

for s in 1 3 9; do
  echo "───────── SEED $s · $(date +%H:%M) ─────────"
  LH_SEED=$s node tools/loop_health.mjs "$MIN" "tmp/a160_$s.json" 2>&1 | tail -12 || echo "FAIL $s"
done
echo "═════ 끝 · $(date +%H:%M) ═════"

# ── 셋을 같이 읽는다 ──────────────────────────────────────────────────────
python3 - <<'PY'
import json, pathlib, statistics as st
SE = (1, 3, 9)
층들, 분들, 최고 = [], [], []
print()
for s in SE:
    try:
        d = json.loads(pathlib.Path(f"tmp/a160_{s}.json").read_text())
    except Exception as e:
        print(f"   씨앗 {s}  (자료 없음 — {e})"); continue
    dd = [x for x in (d.get("deaths") or []) if isinstance(x, dict)]
    f = [x.get("층") for x in dd if x.get("층")]
    m = [x.get("분") for x in dd if x.get("분")]
    top = d["rows"][-1]["최고층"]
    층들 += f; 분들 += m; 최고.append(top)
    print(f"   씨앗 {s}  최고층 {top:>3} · 죽음 {len(dd):>2}회 · 층 {f} · 분 {[round(x) for x in m]}")

print()
if not 층들:
    print("판정: **판정 불가 — 60분 동안 한 번도 안 죽었다.**")
    print("      구멍이 덜 메워진 것이다(맞을 일이 없으면 중앙값도 없다). A-1 은 열린 채로 둔다.")
else:
    med층 = st.median(층들); med분 = st.median(분들)
    앞5 = sum(1 for x in 분들 if x <= 5)
    top평 = sum(최고) / len(최고)
    print(f"죽은 층 중앙값 **{med층}** (최대 {max(층들)}) · 죽은 분 중앙값 {med분:.1f} · "
          f"앞 5분에 {앞5}/{len(분들)} · 최고층 평균 {top평:.1f}")
    ok층 = med층 >= 40
    ok앞 = 앞5 / len(분들) < 0.5
    ok최고 = top평 >= 80
    print()
    print(f"  ① 죽은 층 중앙값 ≥ 40      : {'통과' if ok층 else '실패'} ({med층})")
    print(f"  ② 죽음이 앞 5분에 안 몰림  : {'통과' if ok앞 else '실패'} ({앞5}/{len(분들)})")
    print(f"  ③ 최고층 ≥ 80              : {'통과' if ok최고 else '실패'} ({top평:.1f})")
    print()
    if ok층 and ok앞 and ok최고:
        print("판정: **A-1 을 닫는다.** 세 조건 모두 통과.")
    elif ok최고 and not ok층:
        print("판정: **아직 열려 있다** — 위험이 여전히 얕은 층에 있다.")
        print("      다음 축은 「깊은 층에서 네크로에게 닿는 다른 손」(장판 말고)이다.")
    elif not ok최고:
        print("판정: **최고층이 무너졌다** — OPEN_MUL 0.12 가 너무 세다. 0.06 쪽을 본다.")
    else:
        print("판정: 조건 일부만 통과 — 위 세 줄 중 실패한 것이 다음 작업이다.")
PY
git -C "$REPO" status --porcelain js/
