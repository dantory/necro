#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# ══ A-2 「아슬아슬」 곡선 · 그리고 A-1 의 다음 축을 고르는 자료 ══════════════
#
#   A-2 의 끝 조건이 **30분에 체력 50% 아래 구간 다섯 번 이상**이라 30분으로 잰다.
#   손은 하나도 안 댄다 — **지금 판이 어떤지**를 처음으로 제대로 보는 자리다(base 만).
#
#   여기서 답이 나와야 하는 것 둘:
#     ① A-2 — 30분에 절반 밑으로 몇 번 빠지나. 다섯 번을 넘으면 이미 끝난 항목이고,
#        3분 연습처럼 「앞 몇 분에 세 번, 그 뒤로 0」이면 **아슬아슬이 초반에만 있다**는
#        뜻이라 A-1 과 같은 뿌리다.
#     ② A-1 의 다음 축 — 깊은 띠(25-49 · 50-99)에서 **초당 닿는 피해**가 얕은 띠의
#        절반 아래인가. 그렇다면 못 죽는 이유는 체력이 아니라 **아무것도 안 닿는 것**이고,
#        고칠 자리는 소환수 체력이 아니라 **벽을 우회하는 피해**(pool/charge/curse)다.
#        3분 연습에서 얕은 띠 피해의 90% 가 pool 이었다 — 그 축이 깊이를 따라 자라는지 본다.
#
#   ★ 한 판은 표본 하나다(seed-the-probe) — 씨앗 1·3·9 셋을 다 돌리고 셋을 같이 읽는다.
#     띠가 60초·20대를 못 채우면 자가 스스로 「판정하지 말 것」을 찍는다.
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
MIN=30
# 썩은 렌더러 하나가 한 시간 반을 통째로 못 믿게 만든다(TOOLS.md).
node tools/chrome_guard.mjs || echo "(chrome_guard 실패 — 그대로 간다)"

for s in 1 3 9; do
  echo "───────── SEED $s · $(date +%H:%M) ─────────"
  LH_SEED=$s node tools/loop_health.mjs "$MIN" "tmp/a2_$s.json" 2>&1 | tail -24 || echo "FAIL $s"
done
echo "═════ 끝 · $(date +%H:%M) ═════"

# ── 셋을 같이 읽는다 ──────────────────────────────────────────────────────
python3 - <<'PY'
import json, pathlib
띠들 = ["1-9", "10-24", "25-49", "50-99", "100+"]
합 = {k: {"초": 0.0, "피해": 0.0, "맞은횟수": 0, "절반아래": 0.0, "원인": {}} for k in 띠들}
print()
for s in (1, 3, 9):
    try: d = json.loads(pathlib.Path(f"tmp/a2_{s}.json").read_text())
    except Exception: print(f"씨앗 {s}: 자료 없음"); continue
    V = (d.get("시간") or {}).get("위험") or {}
    if not V: print(f"씨앗 {s}: 위험 자료 없음"); continue
    print(f"씨앗 {s} — 최고층 {d['rows'][-1]['최고층']} · 절반 밑으로 빠진 횟수 "
          f"**{V['빠진횟수']}회** · 절반아래 {V['절반아래']:.0f}초 · 군세 반토막 {V['반토막']}회 "
          f"· 죽음 {len(d.get('deaths') or [])}회")
    for k, Z in (V.get("띠") or {}).items():
        if k not in 합: continue
        for f in ("초", "피해", "맞은횟수", "절반아래"): 합[k][f] += Z.get(f, 0)
        for c, v in (Z.get("원인") or {}).items(): 합[k]["원인"][c] = 합[k]["원인"].get(c, 0) + v

print("\n── 씨앗 셋을 합친 띠 ──")
얕 = None
for k in 띠들:
    Z = 합[k]
    if Z["초"] < 1: continue
    원 = " · ".join(f"{c} {v:.0f}" for c, v in sorted(Z["원인"].items(), key=lambda x: -x[1])) or "없음"
    ps = Z["피해"] / Z["초"]
    믿 = "" if (Z["초"] >= 60 and Z["맞은횟수"] >= 20) else "  ⚠표본얇음"
    print(f"  {k:>6}층 · 머문 {Z['초']:.0f}초 · 초당 피해 {ps:.2f} ({Z['맞은횟수']}대) · "
          f"절반아래 {Z['절반아래']:.0f}초 · {원}{믿}")
    if k == "1-9": 얕 = ps

print("\n판정:")
깊 = [k for k in 띠들[1:] if 합[k]["초"] >= 60 and 합[k]["맞은횟수"] >= 20]
if 얕 is None or not 깊:
    print("  깊은 띠가 60초·20대를 못 채웠다 — 더 오래 돌려야 A-1 을 판정할 수 있다.")
else:
    b = 합[깊[-1]]["피해"] / 합[깊[-1]]["초"]
    print(f"  ① 깊은 띠({깊[-1]}) 초당 {b:.2f} 대 얕은 띠 {얕:.2f} = {b/max(1e-9,얕)*100:.0f}%")
    print("     50% 아래면 → **아무것도 안 닿는 것**이 원인이다. 소환수 체력이 아니라")
    print("     벽을 우회하는 피해(pool/charge/curse)를 깊이에 걸어야 한다 = A-1 의 다음 축.")
    print("     50% 위면 → 닿기는 하는데 **체력이 너무 크다** = 체력 곡선 쪽을 봐야 한다.")
    큰 = max(합[깊[-1]]["원인"].items(), key=lambda x: x[1], default=("없음", 0))
    print(f"  ② 깊은 띠에서 제일 크게 닿는 원인은 **{큰[0]}** 이다 — 그 축을 키우는 것이 제일 싸다.")
print("  ③ A-2 는 30분에 절반 밑으로 다섯 번 이상이면 끝. 씨앗마다 위 숫자를 볼 것.")
print("     빠진 횟수가 앞 몇 분에만 몰려 있으면 A-1 과 같은 뿌리다(초반에만 아슬아슬).")
PY
git -C "$REPO" status --porcelain js/
