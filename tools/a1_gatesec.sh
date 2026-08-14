#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# ══ A-1 다음 축 — **관문 주인의 체력을 내 군대로 매긴다**(GATE_SEC) ═══════════
#
#   60분 곡선(2026-08-14 10:04)이 남긴 자리: 구멍은 메웠는데도 깊은 띠에서 네크로에게
#   닿는 것이 **초당 최대체력의 0.04%**(얕은 띠 1.25% 의 3%) — 손 놓고 맞아도 2430초를
#   산다. 원인은 하나로 모인다: 주인이 한 번에 **1.2초**밖에 못 산다(얕은 관문 16.4초).
#   수법은 관문당 0.8번, 그마저 born 중이라 OPEN_MUL 0.12 로 깎인다.
#
#   그래서 눈금을 바꿨다 — 주인 체력의 **바닥을 지금 내 군대 화력에 둔다**:
#       m.hpMax = max(floorHp(f)×7, armyDps × GATE_SEC)
#   얕은 관문은 층 체력 쪽이 커서 하나도 안 바뀌고, 깊은 관문만 「최소 GATE_SEC 초는
#   선다」로 올라간다. 0 이면 손 안 댐(HEAD 기본값).
#
#   ★ 이 자가 답할 것 둘:
#     ① 깊은 띠의 **초당 최대체력 %** 가 얕은 띠 근처로 올라오는가(A-1 의 본 조건)
#     ② 그 대가로 **최고층이 무너지지 않는가**(관문이 벽이 되면 안 된다 — OPEN_MUL 때
#        손 안 댄 값 1.0 이 최고층 합을 292→125 로 반토막 냈다. 같은 함정이 여기 있다)
#   ★ 한 판은 표본 하나 — 팔마다 씨앗 1·3·9 셋을 다 돌린다.
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
MIN=${GS_MIN:-15}
ARMS=${GS_ARMS:-"0 6 14"}
# 썩은 렌더러 하나가 세 판을 통째로 못 믿게 만든다(TOOLS.md).
node tools/chrome_guard.mjs || echo "(chrome_guard 실패 — 그대로 간다)"

for g in $ARMS; do
  for s in 1 3 9; do
    echo "───────── GATE_SEC $g · SEED $s · $(date +%H:%M) ─────────"
    LH_GATE=$g LH_SEED=$s node tools/loop_health.mjs "$MIN" "tmp/gs_${g}_${s}.json" \
      > "tmp/gs_${g}_${s}.txt" 2>&1 || echo "FAIL $g/$s"
    tail -6 "tmp/gs_${g}_${s}.txt"
  done
done
echo "═════ 끝 · $(date +%H:%M) ═════"

# ── 팔끼리 나란히 읽는다 ─────────────────────────────────────────────────────
ARMS="$ARMS" python3 - <<'PY'
import json, os, pathlib, re, statistics as st
SE = (1, 3, 9)
ARMS = os.environ.get("ARMS", "0 6 14").split()
print()
for g in ARMS:
    층들, 분들, 최고, 깊말, 관문말 = [], [], [], [], []
    for s in SE:
        try:
            d = json.loads(pathlib.Path(f"tmp/gs_{g}_{s}.json").read_text())
        except Exception as e:
            print(f"   GATE_SEC {g} 씨앗 {s}  (자료 없음 — {e})"); continue
        dd = [x for x in (d.get("deaths") or []) if isinstance(x, dict)]
        층들 += [x["층"] for x in dd if x.get("층")]
        분들 += [x["분"] for x in dd if x.get("분")]
        최고.append(d["rows"][-1]["최고층"])
        txt = pathlib.Path(f"tmp/gs_{g}_{s}.txt").read_text(errors="replace")
        for ln in txt.splitlines():
            if "깊은 띠" in ln and "최대체력의" in ln: 깊말.append(ln.strip())
            if "깊은 관문의 주인" in ln: 관문말.append(ln.strip())
    if not 최고: continue
    med = st.median(층들) if 층들 else None
    앞5 = sum(1 for x in 분들 if x <= 5)
    print(f"── GATE_SEC {g} ──  최고층 {최고} (합 {sum(최고)}) · 죽음 {len(층들)}회 · "
          f"죽은 층 중앙값 {med} · 앞 5분 {앞5}/{len(분들) or 0}")
    for ln in 깊말[:3]:   print("     " + ln)
    for ln in 관문말[:3]: print("     " + ln)
    print()

print("읽는 법:")
print("  · 깊은 띠의 **초당 최대체력 %** 가 얕은 띠(≈1.2%)의 절반을 넘으면 그 팔이 A-1 을 연 것이다.")
print("  · 단 **최고층 합이 0 팔의 80% 아래로 내려가면** 관문이 벽이 된 것 — 한 칸 낮은 팔을 고른다.")
print("  · 둘 다 통과한 팔을 GATE_SEC_DEF 로 박고, 그 뒤 60분 곡선(tools/a1_60.sh)으로 A-1 을 닫는다.")
PY
git -C "$REPO" status --porcelain js/
