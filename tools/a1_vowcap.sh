#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# ══ A-1 네 번째 축 — **약속의 세기를 층이 아니라 내 체력으로 매긴다**(GATE_VOW_CAP) ══
#
#   GATE_VOW 첫 쓸기(2026-08-14 11:39 · 15분 × 씨앗 1·3·9):
#     GATE_VOW 0   최고층 [42,60,51] 합 153 (기준선) · 죽음  7 · 중앙값  5   · 깊은 띠 0.59% (얕은 0.96)
#              2              [35,35,35] 합 105 (69%)  · 죽음 11 · 중앙값  5   · 깊은 띠 1.23~1.72% (얕은 0.83~1.06)
#              5              [25,26,25] 합  76 (50%)  · 죽음 14 · 중앙값 22.5 · 깊은 띠 0.65~0.76% (얕은 0.71~0.92)
#   조건 ①은 **넉넉히 열렸다**(깊은 띠가 얕은 띠를 넘는다). 조건 ②는 또 무너졌다.
#
#   ★ 그런데 이번엔 **왜 무너지는지가 산수로 보인다** — 씨앗 셋이 전부 같은 층에서 멈춘다
#     (팔 2 → 35·35·35 · 팔 5 → 25·26·25). 확률이면 이렇게 안 겹친다.
#       hpMaxOf = max(bodyHp, floorDmg(f) × SURVIVE_HITS) 이고 SURVIVE_HITS = 5,
#       약속의 세기는 m.dmg = floorDmg(f) 인데 저주는 그 3.8배로 닿는다.
#     → 체력이 그 바닥에 붙는 층부터 **약속 한 번 = 최대체력의 76%**, 두 번이면 넘는다.
#       그 층이 곧 벽이다. 세기를 절반으로 낮추면 **벽의 자리만 옮긴다**(GATE_SEC 가 이미
#       다섯 눈금으로 그것을 보여 줬다 — 같은 자리를 두 번 고치면 방법을 바꾼다).
#
#   ★ 그래서 눈금을 바꾼다: 약속 하나가 가져갈 몫을 **그때 최대체력의 몇 %** 로 묶는다.
#     · 깊이를 따라 자라는 성질은 그대로다(hpMaxOf 자체가 층을 따라 큰다) → 조건 ①
#     · 어느 깊이에서도 한 방이 나를 지우지 못한다 → **벽이 설 자리가 산수에서 사라진다** → 조건 ②
#     · 묶는 것은 **약속만 남은 수법**뿐 — 주인이 제 손으로 내는 수법은 안 건드린다.
#
#   답할 것 둘은 앞 자들과 같다:
#     ① 깊은 띠의 **초당 최대체력 %** 가 얕은 띠의 절반을 넘는가
#     ② 최고층 합이 첫 팔(0,0 = 손 안 댐)의 80% 아래로 안 내려가는가
#   ★ 한 판은 표본 하나 — 팔마다 씨앗 1·3·9 셋을 다 돌린다(seed-the-probe).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
MIN=${VOW_MIN:-15}
# 팔은 "약속수,상한" 쌍이다. 상한 0 = 묶지 않음(예전 GATE_VOW 그대로).
ARMS=${VOWCAP_ARMS:-"0,0 2,0.08 2,0.18 2,0.30"}

# 자 11개를 먼저 지난다 — 못 지나면 재는 것이 의미가 없다.
echo "───────── 자(qa_all) · $(date +%H:%M) ─────────"
if ! node tools/qa_all.mjs > tmp/vowcap_qa.txt 2>&1; then
  echo "QA 실패 — 재지 않고 멈춘다"; tail -30 tmp/vowcap_qa.txt; exit 1
fi
tail -5 tmp/vowcap_qa.txt

for a in $ARMS; do
  g=${a%%,*}; c=${a##*,}
  tag=$(echo "$a" | tr ',.' '__')
  for s in 1 3 9; do
    echo "───────── 약속 $g · 상한 $c · SEED $s · $(date +%H:%M) ─────────"
    LH_VOW=$g LH_VOWCAP=$c LH_SEED=$s node tools/loop_health.mjs "$MIN" "tmp/vc_${tag}_${s}.json" \
      > "tmp/vc_${tag}_${s}.txt" 2>&1 || echo "FAIL $a/$s"
    tail -6 "tmp/vc_${tag}_${s}.txt"
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
    g, c = a.split(",")
    tag = a.replace(",", "_").replace(".", "_")
    층들, 분들, 최고, 깊말 = [], [], [], []
    for s in SE:
        try:
            d = json.loads(pathlib.Path(f"tmp/vc_{tag}_{s}.json").read_text())
        except Exception as e:
            print(f"   약속 {g} 상한 {c} 씨앗 {s}  (자료 없음 — {e})"); continue
        dd = [x for x in (d.get("deaths") or []) if isinstance(x, dict)]
        층들 += [x["층"] for x in dd if x.get("층")]
        분들 += [x["분"] for x in dd if x.get("분")]
        최고.append(d["rows"][-1]["최고층"])
        txt = pathlib.Path(f"tmp/vc_{tag}_{s}.txt").read_text(errors="replace")
        for ln in txt.splitlines():
            if "깊은 띠" in ln and "최대체력의" in ln: 깊말.append(ln.strip())
    if not 최고: continue
    med = st.median(층들) if 층들 else None
    앞5 = sum(1 for x in 분들 if x <= 5)
    합 = sum(최고)
    if 기준 is None: 기준 = 합
    print(f"── 약속 {g} · 상한 {c} ──  최고층 {최고} (합 {합} · 기준선의 {100*합/(기준 or 1):.0f}%) · "
          f"죽음 {len(층들)}회 · 죽은 층 중앙값 {med} · 앞 5분 {앞5}/{len(분들) or 0}")
    for ln in 깊말[:3]: print("     " + ln)
    print()

print("읽는 법:")
print("  · 조건 ① — 깊은 띠의 **초당 최대체력 %** 가 얕은 띠의 절반을 넘는가.")
print("  · 조건 ② — **최고층 합이 첫 팔(0,0)의 80% 위**인가. 씨앗 셋이 같은 층에 멈추면 그건")
print("    확률이 아니라 산수다(벽) — 그때는 상한을 한 칸 더 조인다.")
print("  · 둘 다 통과한 팔을 GATE_VOW_DEF/GATE_VOW_CAP_DEF 로 박고, 60분 곡선(tools/a1_60.sh)")
print("    으로 A-1 의 끝 조건(죽은 층 중앙값 ≥ 40 · 앞 5분 쏠림 없음 · 최고층 ≥ 80)을 본다.")
print("  · 어느 상한도 ②를 못 살리면 이 축도 진 것이다 — 그때는 「약속」이 아니라")
print("    **죽음이 앞 5분·5층에 몰리는 그 자리**(초반)를 직접 보는 자로 옮긴다.")
PY
git -C "$REPO" status --porcelain js/
