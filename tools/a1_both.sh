#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# ══ A-1 마지막 한 자리 · 세 번째 시도 — **자리와 채울 것은 «둘 다» 있어야 한다** ═══════
#
#   앞의 두 팔은 각각 반쪽씩 이겼고, 진 이유가 **정확히 서로의 반대편**이었다.
#
#     ARMY_WALL(2026-08-14 13:38) — 상한을 3 → 6~7 로 올렸다. ① 실패(중앙값 5).
#       죽는 순간 사진: 상한 6~7(넉넉) · **군세 0~2** · **마나 0~5 / 43~54**
#       → 자리를 열어 줬는데 **채울 마나가 없었다.**
#
#     MANA_WALL(2026-08-14 14:11) — 회복을 2.2 → 3.0~6.0/초로 올렸다. ① 실패(중앙값 5).
#       마나 0     최고층 합 159 (기준선) · 죽음 7회 · 중앙값 5 · 앞 5분 6/7
#       마나 0.5              166 (104%)  · 죽음 6회 · 중앙값 5 · 앞 5분 6/6
#       마나 0.75             172 (108%)  · 죽음 3회 · 중앙값 5 · 앞 5분 3/3
#       마나 1.0              190 (119%)  · 죽음 3회 · 중앙값 5 · 앞 5분 3/3
#       죽는 순간 사진: **마나 24~37 / 43(찼다)** · **군세 3/3 · 2/3(상한에 붙었다)** · 적 3~9
#       → 채울 것을 줬는데 **담을 자리가 3 뿐이었다.**
#
#   ★ 죽음은 7 → 3 으로 절반 아래인데 **중앙값은 5 에서 한 톨도 안 움직인다** — 반쪽씩
#     풀어서는 5층 관문 앞의 그 판(적 6~9)이 안 바뀐다는 뜻이다. 두 사진을 겹치면
#     남는 그림이 하나다: **자리(상한)와 채울 것(마나)은 같이 있어야 벽이 선다.**
#     그래서 이번엔 값을 더 밀지 않고 **둘을 함께 켠다.**
#
#   팔은 `벽:마나` 쌍이다 — 각 축에서 ②를 지켰던 눈금만 쓴다(벽 0.5·0.75 · 마나 0.75·1.0).
#
#   답할 것 둘 — 앞의 두 자와 같은 금:
#     ① **초반 죽음이 걷히는가** — 죽은 층 중앙값이 5 에서 올라가고 앞 5분 쏠림이 풀리는가
#     ② **곡선이 뜨지 않는가** — 최고층 합이 첫 팔(0:0 = 손 안 댐)의 80~130% 안인가
#        ★ 이번엔 위쪽 금이 진짜 위험이다 — 둘을 같이 켜면 초반이 물렁해지기 쉽다
#          (병수님 2026-08-13 「초반이 너무 강해」). 130% 를 넘는 팔은 ①을 열어도 안 쓴다.
#   ★ 한 판은 표본 하나 — 팔마다 씨앗 1·3·9 셋을 다 돌린다(seed-the-probe).
#   ★ 둘을 같이 켜도 ①이 안 열리면 초반의 벽은 **수도 마나도 아니다** — 그때는 5층 관문
#     주인 그 자체(Lv.1~4 짜리 몸에 약속이 몇 %로 닿는가 · 소환수가 사는 시간)로 옮긴다.
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
MIN=${BOTH_MIN:-15}
ARMS=${BOTH_ARMS:-"0:0 0.5:0.75 0.75:0.75 0.75:1.0"}

# 자 11개를 먼저 지난다 — 못 지나면 재는 것이 의미가 없다.
echo "───────── 자(qa_all) · $(date +%H:%M) ─────────"
if ! node tools/qa_all.mjs > tmp/both_qa.txt 2>&1; then
  echo "QA 실패 — 재지 않고 멈춘다"; tail -30 tmp/both_qa.txt; exit 1
fi
tail -5 tmp/both_qa.txt

for a in $ARMS; do
  w=${a%%:*}; m=${a##*:}
  tag=$(echo "$a" | tr '.:' '__')
  for s in 1 3 9; do
    echo "───────── 벽 $w · 마나 $m · SEED $s · $(date +%H:%M) ─────────"
    LH_WALL=$w LH_MANA=$m LH_SEED=$s node tools/loop_health.mjs "$MIN" "tmp/bo_${tag}_${s}.json" \
      > "tmp/bo_${tag}_${s}.txt" 2>&1 || echo "FAIL $a/$s"
    tail -6 "tmp/bo_${tag}_${s}.txt"
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
for a in ARMS:
    w, m = a.split(":")
    tag = a.replace(".", "_").replace(":", "_")
    층들, 분들, 최고, 깊말, 죽사진 = [], [], [], [], []
    for s in SE:
        try:
            d = json.loads(pathlib.Path(f"tmp/bo_{tag}_{s}.json").read_text())
        except Exception as e:
            print(f"   벽 {w} 마나 {m} 씨앗 {s}  (자료 없음 — {e})"); continue
        dd = [x for x in (d.get("deaths") or []) if isinstance(x, dict)]
        층들 += [x["층"] for x in dd if x.get("층")]
        분들 += [x["분"] for x in dd if x.get("분")]
        최고.append(d["rows"][-1]["최고층"])
        죽사진 += [f"s{s} 분{x.get('분')} 층{x.get('층')} 군세{x.get('군세')}/{x.get('상한')} "
                   f"마나{x.get('마나')}/{x.get('마나최대')} 시체{x.get('시체')} 적{x.get('적')}"
                   for x in dd]
        txt = pathlib.Path(f"tmp/bo_{tag}_{s}.txt").read_text(errors="replace")
        for ln in txt.splitlines():
            if "깊은 띠" in ln and "최대체력의" in ln: 깊말.append(ln.strip())
    if not 최고: continue
    med = st.median(층들) if 층들 else None
    앞5 = sum(1 for x in 분들 if x <= 5)
    합 = sum(최고)
    if 기준 is None: 기준 = 합
    print(f"── 벽 {w} · 마나 {m} ──  최고층 {최고} (합 {합} · 기준선의 {100*합/(기준 or 1):.0f}%) · "
          f"죽음 {len(층들)}회 · 죽은 층 중앙값 {med} · 앞 5분 {앞5}/{len(분들) or 0}")
    for ln in 깊말[:3]: print("     " + ln)
    # ★ 값이 아니라 **왜 못 막았나**를 같이 본다 — 앞의 두 팔은 이 사진으로 진 이유가 갈렸다.
    for ln in 죽사진[:4]: print("       · " + ln)
    print()

print("읽는 법:")
print("  · 조건 ① — **앞 5분 죽음이 걷히는가.** 죽은 층 중앙값이 5 에서 올라가야 한다.")
print("    (초반 죽음만 빠지면 60분 곡선에서 중앙값이 125 로 뛴다 — 이미 재 놓은 표다.)")
print("  · 조건 ② — 최고층 합이 첫 팔(0:0)의 **80~130% 안**인가.")
print("    ★ 이번엔 **위쪽 금**이 진짜 위험이다 — 둘을 같이 켰으니 초반이 물렁해지기 쉽다.")
print("      130% 를 넘는 팔은 ①을 열어도 쓰지 않는다(병수님 2026-08-13 「초반이 너무 강해」).")
print("  · 둘 다 통과한 팔 중 **가장 작은 쌍**을 ARMY_WALL_DEF · MANA_WALL_DEF 로 박는다.")
print("    그 뒤 60분 곡선(tools/a1_60.sh)으로 A-1 을 닫는다.")
print("  · ★ 죽음 사진을 계속 볼 것 — 마나도 차고 군세도 상한까지 찼는데 여전히 죽으면")
print("    막는 것은 **수도 마나도 아니다**(5층 관문 주인 · 소환수가 사는 시간으로 옮긴다).")
PY
git -C "$REPO" status --porcelain js/
