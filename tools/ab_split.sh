#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **레벨이 쥔 셋을 가른다** (ROADMAP 4막 · 병수님 2026-08-15 17:06 「레벨이 너무 빨리 오른다」).
#   레벨을 **값으로** 눕히려던 여덟 팔이 전부 실패했다(요구 1.7·1.9 · 벌이 깊이 0.5·0 · 관문
#   한 벌까지). 매번 노린 것(12분 Lv 15 아래)은 됐는데 최고층이 같은 만큼 죽었다(72%·64%).
#   레벨과 깊이가 한 줄에 묶여 있어서다 — 그래서 깊이를 미는 몫(군세 상한·체력·마나)을
#   층(deepest)에 매단다(js/core.js __SPLIT). 세 팔로 잰다:
#     base  = 지금 그대로(__SPLIT=0 · 벌이·관문 기본)
#     split = __SPLIT=1 만 (레벨은 그대로 빨리 오름 — **가르기만 해도 깊이가 사나** 확인용)
#     both  = __SPLIT=1 + 벌이 깊이 0.5(LH_XPD=0.5) — **이게 노리는 팔**
#   씨앗 여섯(1,3,9,2,5,7): 셋으로 재면 87 vs 72 처럼 갈렸다 — 여섯이 최소다.
#   끝 조건 셋: ① both 12분 Lv < 15  ② both 최고층 합 ≥ base 의 80%  ③ kind_probe fresh 통과.
#   ★ 잰 커밋을 표에 적는다 — 옛 판의 87%로 켤 뻔했다([[seed-the-probe]]).
#   ★ kind_probe 마을비율 > 10%면 「통과/미달」을 말하지 말고 **이 표는 못 쓴다**(22:14 교훈).
#   이 자리에서 끝까지 기다리려면: AB_INLINE=1 bash tools/ab_split.sh
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
MINS=${1:-12}; SEEDS=${2:-1,3,9,2,5,7}
COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "?")
node tools/chrome_guard.mjs 2>&1 | tail -2

run () {                                   # run <이름> <SPLIT> <XPD>
  local tag=$1 sp=$2 d=$3
  for s in ${SEEDS//,/ }; do
    echo "───── $tag (split=${sp:-0} xpd=${d:-기본}) · 씨앗 $s · ${MINS}분 ─────"
    env LH_SEED=$s ${sp:+LH_SPLIT=$sp} ${d:+LH_XPD=$d} \
      node tools/loop_health.mjs "$MINS" "tmp/absplit_${tag}_${s}.json" > "tmp/absplit_${tag}_${s}.log" 2>&1
    tail -1 "tmp/absplit_${tag}_${s}.log"
  done
}
run base  ""  ""
run split 1   ""
run both  1   0.5

echo "═════ 세 종이 여전히 서나 (kind_probe fresh · both 설정 · ${MINS}분 · 실시간) ═════"
env LH_SPLIT=1 LH_XPD=0.5 node tools/kind_probe.mjs $((MINS*60)) fresh > tmp/absplit_kind.log 2>&1
tail -20 tmp/absplit_kind.log

echo "═════ 끝 · $(date +%H:%M) · 잰 커밋 $COMMIT ═════"
python3 - "$SEEDS" "$COMMIT" <<'PY'
import json, re, sys, pathlib
seeds = [s for s in sys.argv[1].split(",") if s]
commit = sys.argv[2]
arms = (("base", "지금(split0)"), ("split", "split1만"), ("both", "split1+깊이0.5"))
print(f"\n{'팔':>14} │ {'12분 Lv':>8} │ {'앞4분':>6} │ {'뒤4분':>6} │ {'최고층 합':>8} │ {'base 대비':>8} │ {'죽음':>4} │ {'판수':>3}")
base_top = None
stat = {}
for tag, name in arms:
    lv, e4, l4, tops, deaths, runs = [], [], [], [], 0, 0
    for s in seeds:
        p = pathlib.Path(f"tmp/absplit_{tag}_{s}.json")
        if not p.exists(): continue
        data = json.loads(p.read_text())
        r = data.get("rows", [])
        if len(r) < 8: continue
        L = [x["레벨"] for x in r]
        lv.append(L[-1]); tops.append(max(x["층"] for x in r))
        e4.append((L[3] - L[0]) / 3); l4.append((L[-1] - L[-4]) / 3)
        deaths += len(data.get("deaths", [])); runs += 1
    if not lv:
        print(f"{name:>14} │ (판 없음)"); stat[tag] = None; continue
    top = sum(tops); lvavg = sum(lv) / len(lv)
    if base_top is None: base_top = top
    pct = top / base_top * 100 if base_top else 0
    stat[tag] = {"lv": lvavg, "top": top, "pct": pct, "deaths": deaths, "n": runs}
    print(f"{name:>14} │ {lvavg:>8.1f} │ {sum(e4)/len(e4):>6.2f} │ {sum(l4)/len(l4):>6.2f} │ "
          f"{top:>8} │ {pct:>7.0f}% │ {deaths:>4} │ {runs:>3}")
print(f"\n잰 커밋: {commit} · 씨앗 {','.join(seeds)}")
print("※ 마을초/마을비율은 loop_health 에 없다(죽으면 곧장 newRun 하므로 마을에 안 선다) —")
print("  마을 함정은 kind_probe 만 겪는다. 그 값을 아래 한 줄에 따로 낸다.")

kp = pathlib.Path("tmp/absplit_kind.log")
town = None; verdict_kp = None; kline = "kind_probe 결과 없음"
if kp.exists():
    txt = kp.read_text().strip()
    j = None
    try:
        j = json.loads(txt)
    except Exception:
        m = re.search(r"\{[\s\S]*\}", txt)
        if m:
            try: j = json.loads(m.group(0))
            except Exception: j = None
    if j is not None:
        town = j.get("마을비율"); verdict_kp = j.get("판정")
        r = j.get("비율", {})
        kline = (f"kind_probe(both): 죽음 {j.get('죽음')} · 마을초 {j.get('마을초')}초 · 마을비율 {town}% · "
                 f"skel {r.get('skel','—')} · ghoul {r.get('ghoul','—')} · golem {r.get('golem','—')} · "
                 f"판정 {verdict_kp}")
    else:
        kline = "kind_probe 로그 파싱 실패 — tmp/absplit_kind.log 를 직접 볼 것"
print("\n" + kline)

print("\n── 판정 ──")
b = stat.get("both")
if town is not None and town > 10:
    print(f"★ kind_probe 가 마을에 오래 서 있었다(마을비율 {town}%) — **이 표는 못 쓴다.** 고쳐서 다시 잰다.")
elif not b:
    print("both 팔의 판이 없다 — 잴 수 없다(로그 확인).")
else:
    c1 = b["lv"] < 15
    c2 = b["pct"] >= 80
    c3 = (verdict_kp == "통과")
    print(f"① both 12분 Lv {b['lv']:.1f} < 15 .................. {'OK' if c1 else '미달'}")
    print(f"② both 최고층 합 base 대비 {b['pct']:.0f}% ≥ 80% ..... {'OK' if c2 else '미달'}")
    print(f"③ kind_probe fresh 판정 = {verdict_kp} ........ {'OK' if c3 else '미달'}")
    if c1 and c2 and c3:
        print("→ **셋 다 통과.** SPLIT_DEF=1 로 켜고 벌이 깊이 기본값도 0.5 로 켠다(cdp_verify 뒤 커밋·푸시).")
    else:
        print("→ **하나라도 미달 = 켜지 말 것.** 문(__SPLIT)과 자(ab_split.sh)만 커밋하고 이 표를 ROADMAP 에 적는다.")
PY
