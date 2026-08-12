#!/bin/bash
# **걷는 거리** — 손잡이 여덟(머릿수·마중·소환수 화력 둘·적 체력·곡선·방울·되짚기)을 댔지만
# 하나도 벽을 못 밀었고, 시간을 쪼개 보니 12분의 **83%가 뒷정리**였다(2026-08-12 12:0x).
# 그 뒷정리 안을 다시 갈랐더니 소환수는 **때림 35% · 다가감 47% · 놀고 18%** —
# 65%가 안 때리는 시간이고, 걷는 데 쓰는 것이 때리는 것보다 많다(12:3x).
# 소환수는 구역제라 표적이 죽으면 제 자리(home)로 돌아갔다가 다시 나간다. 그 왕복을 지운다.
#   base : 지금 코드 그대로
#   stay : 표적이 없으면 **home 으로 안 돌아가고 그 자리에 선다** (놀고 18% + 다음 왕복)
#   free : 줄이 빈 뒤(뒷정리)에는 **구역을 풀어** 아무 적에게나 붙는다 (WATCH → 무한)
# ★ 씨앗 **여덟**. 코드를 건드리면 난수 소비가 달라져 같은 씨앗도 다른 판이 되므로
#   씨앗 셋의 합은 잡음이다(11:0x 에 ab_dmg_wide 로 배운 것).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
BK=$(mktemp -d); cp js/battle.js "$BK"/
restore() { cp "$BK"/battle.js js/battle.js; }
trap restore EXIT
SEEDS="3 9 5 1 2 4 6 7"
arm() { for s in $SEEDS; do
    echo "───────── ARM $1 · SEED $s ─────────"
    LH_SEED=$s node tools/loop_health.mjs 12 "tmp/wk_$1_$s.json" 2>&1 | tail -10 || echo "FAIL $1 $s"
  done; }

restore
arm base

restore
python3 - <<'PY'
import pathlib
p = pathlib.Path("js/battle.js"); s = p.read_text()
old = "    if (!tgt) { if (!rooted) toward(u, hx, hy, K.spd, dt); continue; }"
assert old in s, "표적 없을 때의 귀가를 못 찾았다"
new = "    if (!tgt) { continue; }   /* AB:stay — 그 자리에 선다 */"
p.write_text(s.replace(old, new, 1))
PY
arm stay

restore
python3 - <<'PY'
import pathlib
p = pathlib.Path("js/battle.js"); s = p.read_text()
old = "      if (d < td && d < (m.boss ? BOSS_CALL : WATCH)) { td = d; tgt = m; }"
assert old in s, "구역 판정을 못 찾았다"
new = ("      const lim = m.boss ? BOSS_CALL\n"
       "                : (S.spawnQ && S.spawnQ.length) ? WATCH : 1e9;   /* AB:free — 뒷정리엔 구역을 푼다 */\n"
       "      if (d < td && d < lim) { td = d; tgt = m; }")
p.write_text(s.replace(old, new, 1))
PY
arm free

restore
echo "═════ 끝 · $(date +%H:%M) ═════"
# 팔별 최고층 — 판을 건너뛴 절대 수치는 못 믿으므로 **같은 판 안의 팔끼리만** 견준다.
python3 - <<'PY'
import json, pathlib
SE = (3, 9, 5, 1, 2, 4, 6, 7)
for arm in ("base", "stay", "free"):
    v, cl = [], []
    for s in SE:
        f = pathlib.Path(f"tmp/wk_{arm}_{s}.json")
        try:
            d = json.loads(f.read_text())
            v.append(d["rows"][-1]["최고층"])
            t = d.get("시간") or {}
            cl.append(t.get("뒷정리"))
        except Exception:
            v.append(None); cl.append(None)
    ok = [x for x in v if x is not None]
    okc = [x for x in cl if x is not None]
    print(arm, v, "평균", round(sum(ok)/len(ok), 2) if ok else "?",
          "· 뒷정리평균", round(sum(okc)/len(okc), 1) if okc else "?")
PY
git -C "$REPO" status --porcelain js/
