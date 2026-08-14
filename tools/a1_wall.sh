#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# ══ A-1 마지막 한 자리 — **초반에 벽이 설 수 있는가**(ARMY_WALL) ══════════════════
#
#   60분 곡선(2026-08-14 12:35 · GATE_VOW 2 · 상한 0.18)에서 **깊은 죽음이 처음 생겼다**:
#     씨앗 1  최고 147 · 죽음 [5, 5]          (분 2·3)
#     씨앗 3  최고 125 · 죽음 [5, 5, 125]     (분 2·3·44)
#     씨앗 9  최고 135 · 죽음 [5, 5, 25, 135] (분 2·3·10·56)
#   ★ **초반 두 죽음을 빼고 세면 세 조건이 전부 열린다** — 남는 죽음 [25,125,135] ·
#     중앙값 125(≥40 ✔) · 앞 5분 0/3(✔) · 최고층 135.7(✔). A-1 에 남은 것은 축이 아니라
#     **단 한 자리, 초반**이다.
#
#   그 초반도 확률이 아니라 **산수**다 — 씨앗 셋이 전부 층 5 · 분 2 와 분 3 에 두 번씩
#   죽고, 죽는 순간의 판이 셋 다 같은 모양이다:
#     군세 1~3 · **군세 상한 3** · 적 6~8마리 · 최대체력 108~270 · 5초피해 48~74(체력의 20~50%)
#   **벽이 셋인데 적이 여덟이다**(floorN(5)=8). 벽을 못 세우니 전부 네크로에게 들어온다.
#   레벨로만 자라는 상한은 그 자리에 닿지 못한다 — 분 2·3 은 아직 Lv.1~4 다.
#
#   ★ 그래서 **바닥을 그 층의 적 수에 둔다**(armyBase = max(레벨몫, round(floorN(f)×ARMY_WALL))).
#     위는 예전의 6 으로 막으므로 **초반을 앞당길 뿐 천장을 안 올린다** — Lv.10 뒤로는
#     레벨 쪽이 크거나 같아 저절로 손을 뗀다(깊은 층은 한 톨도 안 달라진다).
#     팔의 뜻(층 5 · 적 8 기준): 0.5 → 상한 4 · 0.75 → 6 · 1.0 → 6(층 1 에서도 5)
#
#   답할 것 둘:
#     ① **초반 죽음이 걷히는가** — 죽은 층 중앙값이 5 에서 올라가고 앞 5분 쏠림이 풀리는가
#     ② **곡선이 뜨지 않는가** — 최고층 합이 첫 팔(0 = 손 안 댐)의 80~130% 안인가.
#        ★ 이 축은 앞의 넷과 위험이 **반대**다. 앞은 「벽이 서서 못 올라간다」였고
#          이번은 **「초반이 물렁해져 곡선 전체가 뜬다」**다 — 그래서 위쪽에도 금을 긋는다.
#   ★ 한 판은 표본 하나 — 팔마다 씨앗 1·3·9 셋을 다 돌린다(seed-the-probe).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
MIN=${WALL_MIN:-15}
ARMS=${WALL_ARMS:-"0 0.5 0.75 1.0"}

# 자 11개를 먼저 지난다 — 못 지나면 재는 것이 의미가 없다.
echo "───────── 자(qa_all) · $(date +%H:%M) ─────────"
if ! node tools/qa_all.mjs > tmp/wall_qa.txt 2>&1; then
  echo "QA 실패 — 재지 않고 멈춘다"; tail -30 tmp/wall_qa.txt; exit 1
fi
tail -5 tmp/wall_qa.txt

for w in $ARMS; do
  tag=$(echo "$w" | tr '.' '_')
  for s in 1 3 9; do
    echo "───────── 벽 $w · SEED $s · $(date +%H:%M) ─────────"
    LH_WALL=$w LH_SEED=$s node tools/loop_health.mjs "$MIN" "tmp/wl_${tag}_${s}.json" \
      > "tmp/wl_${tag}_${s}.txt" 2>&1 || echo "FAIL $w/$s"
    tail -6 "tmp/wl_${tag}_${s}.txt"
  done
done
echo "═════ 끝 · $(date +%H:%M) ═════"

# ── 팔끼리 나란히 읽는다 ─────────────────────────────────────────────────────
ARMS="$ARMS" python3 - <<'PY'
import json, os, pathlib, statistics as st
SE = (1, 3, 9)
ARMS = os.environ.get("ARMS", "").split()
print()
기준 = None
for w in ARMS:
    tag = w.replace(".", "_")
    층들, 분들, 최고, 깊말 = [], [], [], []
    for s in SE:
        try:
            d = json.loads(pathlib.Path(f"tmp/wl_{tag}_{s}.json").read_text())
        except Exception as e:
            print(f"   벽 {w} 씨앗 {s}  (자료 없음 — {e})"); continue
        dd = [x for x in (d.get("deaths") or []) if isinstance(x, dict)]
        층들 += [x["층"] for x in dd if x.get("층")]
        분들 += [x["분"] for x in dd if x.get("분")]
        최고.append(d["rows"][-1]["최고층"])
        txt = pathlib.Path(f"tmp/wl_{tag}_{s}.txt").read_text(errors="replace")
        for ln in txt.splitlines():
            if "깊은 띠" in ln and "최대체력의" in ln: 깊말.append(ln.strip())
    if not 최고: continue
    med = st.median(층들) if 층들 else None
    앞5 = sum(1 for x in 분들 if x <= 5)
    합 = sum(최고)
    if 기준 is None: 기준 = 합
    print(f"── 벽 {w} ──  최고층 {최고} (합 {합} · 기준선의 {100*합/(기준 or 1):.0f}%) · "
          f"죽음 {len(층들)}회 · 죽은 층 중앙값 {med} · 앞 5분 {앞5}/{len(분들) or 0}")
    for ln in 깊말[:3]: print("     " + ln)
    print()

print("읽는 법:")
print("  · 조건 ① — **앞 5분 죽음이 걷히는가.** 죽은 층 중앙값이 5 에서 올라가야 한다.")
print("    (초반 죽음만 빠지면 60분 곡선에서 중앙값이 125 로 뛴다 — 이미 재 놓은 표다.)")
print("  · 조건 ② — 최고층 합이 첫 팔(0)의 **80~130% 안**인가. 이 축은 위험이 반대다 —")
print("    130% 를 넘으면 초반을 너무 풀어 준 것이고, 80% 아래면 벽이 선 것이다.")
print("  · 둘 다 통과한 팔 중 **가장 작은 값**을 ARMY_WALL_DEF 로 박는다(초반만 건드리는")
print("    손잡이라 크게 잡을 이유가 없다). 그 뒤 60분 곡선(tools/a1_60.sh)으로 A-1 을 닫는다.")
print("  · 어느 팔도 ①을 못 열면 초반의 벽은 **수가 아니라 다른 것**이다 —")
print("    그때는 죽는 순간의 판(적 6~8 · 5초피해가 체력의 20~50%)을 직접 보는 자로 옮긴다.")
PY
git -C "$REPO" status --porcelain js/
