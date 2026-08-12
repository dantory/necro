#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **보스가 굼뜬 것**을 고친 자리를 검증한다 — 병수님 2026-08-13 "특히 보스 움직임이
# 부자연스럽고 굼뜬느낌이 강하네". 작업 트리에 커밋 안 된 채 남아 있던 수정이라
# **근거가 디스크에 없다**(내 장부 말고 산출물로 말한다 — 2026-08-09 교훈).
#
#   base : HEAD 그대로 (보스 걸음 그대로 · born0 0.8)
#   fix  : 작업 트리 (걸음 ×(몸/48)^0.35 · born0 2.6 으로 도착 시각을 되갚음)
#
# 두 가지를 따로 본다:
#   ① 눈  — boss_qa 로 **제 몸 폭의 몇 배/초**. 절대 속도로는 보스도 졸개도 같아서 안 걸린다.
#   ② 셈  — loop_health 12분으로 **최고층·죽음**. 걸음을 키우면 도착도 빨라져 관문이 벽이 된다.
#           앞 세션이 29→24 층 · 죽음 1→5 를 봤다고 적어 놨는데 그 파일이 없다. 다시 잰다.
# ★ 씨앗 넷. 하나는 표본 하나다(2026-08-12).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
BK=$(mktemp -d); cp js/battle.js "$BK"/fix.js
git show HEAD:js/battle.js > "$BK"/base.js || exit 1
restore_fix()  { cp "$BK"/fix.js  js/battle.js; }
restore_base() { cp "$BK"/base.js js/battle.js; }
trap restore_fix EXIT

SEEDS="3 9 5 1"

eye() {   # ① 눈 — 보스가 제 몸 몇 배를 지나는가
  echo "═════ 눈(boss_qa) · ARM $1 ═════"
  node tools/boss_qa.mjs 5 30 3 2>&1 | tail -18 || echo "FAIL eye $1"
}
sums() {  # ② 셈 — 12분 곡선
  for s in $SEEDS; do
    echo "───────── ARM $1 · SEED $s ─────────"
    LH_SEED=$s node tools/loop_health.mjs 12 "tmp/bm_$1_$s.json" 2>&1 | tail -8 || echo "FAIL $1 $s"
  done
}

restore_base; eye base; sums base
restore_fix;  eye fix;  sums fix
restore_fix

echo "═════ 끝 · $(date +%H:%M) ═════"
python3 - <<'PY'
import json, pathlib
SE = (3, 9, 5, 1)
for arm in ("base", "fix"):
    top, dead = [], []
    for s in SE:
        try:
            d = json.loads(pathlib.Path(f"tmp/bm_{arm}_{s}.json").read_text())
            top.append(d["rows"][-1]["최고층"])
            dead.append(len(d.get("deaths") or []))
        except Exception:
            top.append(None); dead.append(None)
    okt = [x for x in top if x is not None]
    okd = [x for x in dead if x is not None]
    print(arm, "최고층", top, "평균", round(sum(okt)/len(okt), 2) if okt else "?",
          "· 죽음", dead, "평균", round(sum(okd)/len(okd), 2) if okd else "?")
print("판정: fix 의 최고층이 base 보다 크게 낮거나 죽음이 뛰면 born0 를 더 올린다.")
PY
git -C "$REPO" status --porcelain js/
