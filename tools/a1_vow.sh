#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# ══ A-1 세 번째 축 — **관문은 서는 순간 수법을 약속한다**(GATE_VOW) ═════════════
#
#   앞 축(GATE_SEC · 주인 체력을 내 군대로 매기기)은 2026-08-14 11:0x 에 졌다:
#     GATE_SEC  0   최고층 합 152 · 죽은 층 중앙값  5 · 깊은 띠 0.00%   ← 기준선
#              1.5             105 ·             15.0 · 깊은 띠가 얕은 띠보다 높다
#              2.5              89 ·             12.5
#              4                99 ·             10.0
#              6                75 ·             15.0
#             14                55 ·             10.0
#   조건 ①(깊은 띠에 피해가 닿는가)은 **처음으로 열렸다.** 그런데 조건 ②(최고층이
#   기준선의 80% 위)는 **다섯 눈금 전부 실패**다(105/89/99/75/55 대 기준 122).
#   눈금 탓이 아니다 — 이 축은 「내 화력이 층 체력을 앞지르는 층」에서 갑자기 켜져
#   **거기에 벽을 세운다.** 값을 낮추면 벽의 자리만 조금 옮긴다(1.5 도 40층에서 멈춘다).
#
#   ★ 그래서 위험을 **주인의 질김에서 완전히 떼어 낸다**(체력은 한 톨도 안 건드린다):
#       관문이 서면 그 자리에서 수법 GATE_VOW 번을 약속하고,
#       제 손으로 낸 만큼 갚고, **갚지 못한 채 치워져도 약속한 만큼은 예정대로 터진다.**
#       (예고 fx 를 제 차례 tell 초 전에 띄우므로 「예고 없이 터짐」이 아니다.)
#     세기는 m.dmg = floorDmg(f) 라 **깊이를 따라 저절로 큰다** — A-1 이 찾던 그 축이다.
#     관문 체력이 그대로이므로 **벽이 될 자리가 없다**(조건 ②가 구조적으로 안 깨진다).
#
#   ★ 답할 것 둘은 앞 자와 같다:
#     ① 깊은 띠의 **초당 최대체력 %** 가 얕은 띠의 절반을 넘는가
#     ② 최고층 합이 0 팔(손 안 댐)의 80% 아래로 안 내려가는가
#   ★ 한 판은 표본 하나 — 팔마다 씨앗 1·3·9 셋을 다 돌린다(seed-the-probe).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
MIN=${VOW_MIN:-15}
ARMS=${VOW_ARMS:-"0 2 5"}
# 썩은 렌더러 하나가 세 판을 통째로 못 믿게 만든다(TOOLS.md).
node tools/chrome_guard.mjs || echo "(chrome_guard 실패 — 그대로 간다)"

for g in $ARMS; do
  for s in 1 3 9; do
    echo "───────── GATE_VOW $g · SEED $s · $(date +%H:%M) ─────────"
    LH_VOW=$g LH_SEED=$s node tools/loop_health.mjs "$MIN" "tmp/vow_${g}_${s}.json" \
      > "tmp/vow_${g}_${s}.txt" 2>&1 || echo "FAIL $g/$s"
    tail -6 "tmp/vow_${g}_${s}.txt"
  done
done
echo "═════ 끝 · $(date +%H:%M) ═════"

# ── 팔끼리 나란히 읽는다 ─────────────────────────────────────────────────────
ARMS="$ARMS" python3 - <<'PY'
import json, os, pathlib, statistics as st
SE = (1, 3, 9)
ARMS = os.environ.get("ARMS", "0 2 5").split()
print()
기준 = None
for g in ARMS:
    층들, 분들, 최고, 깊말, 관문말 = [], [], [], [], []
    for s in SE:
        try:
            d = json.loads(pathlib.Path(f"tmp/vow_{g}_{s}.json").read_text())
        except Exception as e:
            print(f"   GATE_VOW {g} 씨앗 {s}  (자료 없음 — {e})"); continue
        dd = [x for x in (d.get("deaths") or []) if isinstance(x, dict)]
        층들 += [x["층"] for x in dd if x.get("층")]
        분들 += [x["분"] for x in dd if x.get("분")]
        최고.append(d["rows"][-1]["최고층"])
        txt = pathlib.Path(f"tmp/vow_{g}_{s}.txt").read_text(errors="replace")
        for ln in txt.splitlines():
            if "깊은 띠" in ln and "최대체력의" in ln: 깊말.append(ln.strip())
            if "깊은 관문의 주인" in ln: 관문말.append(ln.strip())
    if not 최고: continue
    med = st.median(층들) if 층들 else None
    앞5 = sum(1 for x in 분들 if x <= 5)
    합 = sum(최고)
    if 기준 is None: 기준 = 합
    print(f"── GATE_VOW {g} ──  최고층 {최고} (합 {합} · 기준선의 {100*합/(기준 or 1):.0f}%) · "
          f"죽음 {len(층들)}회 · 죽은 층 중앙값 {med} · 앞 5분 {앞5}/{len(분들) or 0}")
    for ln in 깊말[:3]:   print("     " + ln)
    for ln in 관문말[:3]: print("     " + ln)
    print()

print("읽는 법:")
print("  · 깊은 띠의 **초당 최대체력 %** 가 얕은 띠의 절반을 넘으면 그 팔이 조건 ①을 연 것이다.")
print("  · **최고층 합이 첫 팔(0)의 80% 아래로 내려가면** 또 벽이다 — 그때는 이 축도 진 것이니")
print("    「약속의 세기」(m.dmg 그대로 말고 절반)로 한 칸 낮춰 다시 쓴다.")
print("  · 둘 다 통과한 팔을 GATE_VOW_DEF 로 박고, 60분 곡선(tools/a1_60.sh)으로 A-1 을 닫는다.")
PY
git -C "$REPO" status --porcelain js/
