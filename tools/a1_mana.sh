#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# ══ A-1 마지막 한 자리 · 두 번째 시도 — **초반을 막는 것은 마나다**(MANA_WALL) ═══════
#
#   앞 팔(ARMY_WALL)은 **졌다**(2026-08-14 13:38 · 0 · 0.5 · 0.75 · 1.0 × 씨앗 1·3·9).
#     벽 0     최고층 합 159 (기준선) · 죽음 7회 · 죽은 층 중앙값 5 · 앞 5분 6/7
#     벽 0.5              145 ( 91%)  · 죽음 7회 · 중앙값 5 · 앞 5분 6/7
#     벽 0.75             170 (107%)  · 죽음 5회 · 중앙값 5 · 앞 5분 5/5
#     벽 1.0              161 (101%)  · 죽음 6회 · 중앙값 5 · 앞 5분 6/6
#   조건 ②(80~130%)는 세 팔이 지켰는데 **조건 ①이 네 팔 전부 실패**다 — 중앙값이 5 에서
#   한 톨도 안 움직였다. 자가 적어 둔 「어느 팔도 ①을 못 열면 초반의 벽은 **수가 아니라
#   다른 것**」의 자리다.
#
#   ★ 그 「다른 것」이 죽는 순간의 사진에 그대로 있었다 — 네 팔 스무 번의 죽음이 전부:
#       시체 26~32(넉넉) · 상한 6~7(넉넉) · **군세 0~2** · **마나 0~5 / 43~54**
#     자리를 열어 줘도 **채울 마나가 없다.** 해골 하나가 6 인데 회복이 2.2/초 —
#     한 마리에 2.7초, 상한까지 16초다. 관문 주인은 그 사이에 벽을 지운다.
#     (출처를 보면 죽음의 대부분이 「층의 주인」 한 놈이다 — 5층 관문이다.)
#
#   그래서 **회복의 바닥을 「초당 되살리기 몇 번 몫」에 둔다**(core.js `MANA_WALL`).
#     max() 라 부적·강화가 그 바닥을 넘어서면 저절로 손을 뗀다 → 중반 이후 불변(조건 ②).
#     팔의 뜻: 0.5 → 3.0/초 · 0.75 → 4.5/초 · 1.0 → 6.0/초 (예전 2.2/초)
#
#   답할 것 둘 — 앞 팔과 같은 자, 같은 금:
#     ① **초반 죽음이 걷히는가** — 죽은 층 중앙값이 5 에서 올라가고 앞 5분 쏠림이 풀리는가
#     ② **곡선이 뜨지 않는가** — 최고층 합이 첫 팔(0 = 손 안 댐)의 80~130% 안인가
#   ★ 한 판은 표본 하나 — 팔마다 씨앗 1·3·9 셋을 다 돌린다(seed-the-probe).
#   ★ 어느 팔도 ①을 못 열면 마나도 아니다 — 그때는 5층 관문 그 자체(주인의 약속이
#     Lv.1~4 짜리 몸에 몇 %로 닿는가)를 보는 자로 옮긴다.
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
MIN=${MANA_MIN:-15}
ARMS=${MANA_ARMS:-"0 0.5 0.75 1.0"}

# 자 11개를 먼저 지난다 — 못 지나면 재는 것이 의미가 없다.
echo "───────── 자(qa_all) · $(date +%H:%M) ─────────"
if ! node tools/qa_all.mjs > tmp/mana_qa.txt 2>&1; then
  echo "QA 실패 — 재지 않고 멈춘다"; tail -30 tmp/mana_qa.txt; exit 1
fi
tail -5 tmp/mana_qa.txt

for w in $ARMS; do
  tag=$(echo "$w" | tr '.' '_')
  for s in 1 3 9; do
    echo "───────── 마나 $w · SEED $s · $(date +%H:%M) ─────────"
    LH_MANA=$w LH_SEED=$s node tools/loop_health.mjs "$MIN" "tmp/mn_${tag}_${s}.json" \
      > "tmp/mn_${tag}_${s}.txt" 2>&1 || echo "FAIL $w/$s"
    tail -6 "tmp/mn_${tag}_${s}.txt"
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
    층들, 분들, 최고, 깊말, 죽사진 = [], [], [], [], []
    for s in SE:
        try:
            d = json.loads(pathlib.Path(f"tmp/mn_{tag}_{s}.json").read_text())
        except Exception as e:
            print(f"   마나 {w} 씨앗 {s}  (자료 없음 — {e})"); continue
        dd = [x for x in (d.get("deaths") or []) if isinstance(x, dict)]
        층들 += [x["층"] for x in dd if x.get("층")]
        분들 += [x["분"] for x in dd if x.get("분")]
        최고.append(d["rows"][-1]["최고층"])
        죽사진 += [f"s{s} 분{x.get('분')} 층{x.get('층')} 군세{x.get('군세')}/{x.get('상한')} "
                   f"마나{x.get('마나')}/{x.get('마나최대')} 시체{x.get('시체')} 적{x.get('적')}"
                   for x in dd]
        txt = pathlib.Path(f"tmp/mn_{tag}_{s}.txt").read_text(errors="replace")
        for ln in txt.splitlines():
            if "깊은 띠" in ln and "최대체력의" in ln: 깊말.append(ln.strip())
    if not 최고: continue
    med = st.median(층들) if 층들 else None
    앞5 = sum(1 for x in 분들 if x <= 5)
    합 = sum(최고)
    if 기준 is None: 기준 = 합
    print(f"── 마나 {w} ──  최고층 {최고} (합 {합} · 기준선의 {100*합/(기준 or 1):.0f}%) · "
          f"죽음 {len(층들)}회 · 죽은 층 중앙값 {med} · 앞 5분 {앞5}/{len(분들) or 0}")
    for ln in 깊말[:3]: print("     " + ln)
    # ★ 값이 아니라 **왜 못 막았나**를 같이 본다 — 앞 팔은 이 사진으로 진 이유가 갈렸다.
    for ln in 죽사진[:4]: print("       · " + ln)
    print()

print("읽는 법:")
print("  · 조건 ① — **앞 5분 죽음이 걷히는가.** 죽은 층 중앙값이 5 에서 올라가야 한다.")
print("    (초반 죽음만 빠지면 60분 곡선에서 중앙값이 125 로 뛴다 — 이미 재 놓은 표다.)")
print("  · 조건 ② — 최고층 합이 첫 팔(0)의 **80~130% 안**인가. 이 축도 위험이 반대다 —")
print("    130% 를 넘으면 초반을 너무 풀어 준 것이고(병수님 2026-08-13 「초반이 너무 강해」),")
print("    80% 아래면 벽이 선 것이다.")
print("  · 둘 다 통과한 팔 중 **가장 작은 값**을 MANA_WALL_DEF 로 박는다.")
print("    그 뒤 60분 곡선(tools/a1_60.sh)으로 A-1 을 닫는다.")
print("  · ★ 죽음 사진의 **마나/군세**를 같이 볼 것 — 마나가 찼는데도 군세가 0~2 면")
print("    막는 것은 마나도 아니다(소환 재사용 대기 · 소환수가 사는 시간 쪽으로 옮긴다).")
PY
git -C "$REPO" status --porcelain js/
