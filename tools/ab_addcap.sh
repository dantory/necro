#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **D-3 축 ① · 졸개 상한이 「주인피해 0」을 벗어나게 하는가** (battle.js ADD_CAP)
#   벽의 이름은 마나가 아니라 **졸개 벽**이었다 — 주인피해가 7분 내내 정확히 0 인데
#   화력(armyDps)은 109~142 였다. 군대는 때리고 있었다, **주인만 빼고.**
#   관문 주인의 add 수법이 발밑에 졸개 넷씩 무한히 세우고, 소환수는 늘 제일 가까운 적을
#   잡으니 주인에게 한 대도 안 닿는다.
#   팔 넷: 상한 없음(0, 지금 기본값) · 4 · 8 · 12.
#   잣대는 하나다 — **주인피해가 0 을 벗어나는가.** (그 다음이 최고층·최대간격)
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
MINS=${1:-7}
SEED=${2:-7}

node tools/chrome_guard.mjs 2>&1 | tail -3

for cap in 0 4 8 12; do
  echo "───────── 졸개상한 $cap · SEED $SEED · ${MINS}분 ─────────"
  env TP_ADDCAP=$cap node tools/tire_probe.mjs "$MINS" "$SEED" > "tmp/addcap_${cap}.log" 2>&1
  head -1 "tmp/addcap_${cap}.log"
  tail -3 "tmp/addcap_${cap}.log"
done

echo "═════ 끝 · $(date +%H:%M) ═════"
python3 - <<'PY'
import pathlib, re
def rows(p):
    out = []
    for ln in pathlib.Path(p).read_text(errors="replace").splitlines():
        if "│" not in ln: continue
        c = [x.strip() for x in ln.split("│")]
        if len(c) < 13 or not re.match(r"^\d+:\d\d$", c[0]): continue
        out.append(c)
    return out
def num(s):
    try: return float(str(s).replace("%", "").replace("×", ""))
    except Exception: return None
print(f"\n{'상한':>4} │ {'최고층':>5} │ {'주인피해>0':>9} │ {'주인최장생존':>10} │ {'끝 적수':>6} │ {'끝 내hp%':>7} │ {'화력중앙':>7}")
base = None
for cap in (0, 4, 8, 12):
    p = f"tmp/addcap_{cap}.log"
    try: R = rows(p)
    except Exception: print(f"{cap:>4} │ (판 없음)"); continue
    if not R: print(f"{cap:>4} │ (표 없음)"); continue
    top = max(int(r[1]) for r in R if r[1].isdigit())
    hit = sum(1 for r in R if (num(r[9]) or 0) > 0)
    alive = max([num(r[3]) or 0 for r in R])
    dps = sorted(num(r[10]) or 0 for r in R)
    med = dps[len(dps)//2]
    print(f"{cap:>4} │ {top:>5} │ {hit:>4}/{len(R):<4} │ {alive:>9.0f}초 │ {int(num(R[-1][12]) or 0):>6} │ {int(num(R[-1][11]) or 0):>7} │ {med:>7.0f}")
    if cap == 0: base = (top, hit)
print("\n잣대: **주인피해>0 이 0/N 을 벗어나는가.** 벗어난 팔이 있으면 그 값으로 loop_health"
      " 씨앗 여덟(최고층 80% 조건)을 건다. 전부 0 이면 축 ① 은 아니다 → 축 ②(표적 가중치)로 간다.")
PY
