#!/bin/bash
# ★ 긴 측정은 저절로 떨어져 나간다(하트비트 600초 상한에 잘리지 않게) — tools/ab_guard.sh
. "$(dirname "$0")/ab_guard.sh"
# **편성(B-1)이 실제로 판을 가르나 — 다시 잰다** (ROADMAP E 「편성 넷이 실제로 갈리는지」).
#   B-1 을 닫을 때 쓴 자는 **나무를 손으로 열어 두고** 쟀다. 그 뒤 E-1(점을 저절로 씀)이
#   들어왔으니 **사람이 켜는 판**에서 다시 물어야 한다 — 넷이 전부 해골로 떨어지면
#   표에 벽·몸이 적혀 있어도 판에서는 한 종이다.
#     balance 균형(기본) · bone 해골 위주 · flesh 구울 위주 · wall 골렘 벽
#   편성은 LH_DOC 로 주입한다(LH_TAC 와 같은 문 · 코드는 한 줄도 안 바꾼다).
#   씨앗 3·9·5 · 12분. 3분짜리 한 판은 표본이 아니다(loop_health 주석).
#
#   끝 조건 둘 — **둘 다** 봐야 한다:
#     ① 편성별 **최고층 합**이 15% 이상 갈릴 것 (max/min - 1 ≥ 0.15)
#     ② 편성이 **판에 보일 것** — kind_probe 로 종 비율을 재서, bone 과 wall 의
#        골렘 비율이 서로 갈릴 것. ①만 보면 「숫자는 갈렸는데 군대는 다 해골」을 못 잡는다
#        ([[probe-must-walk-the-real-path]] · 자는 사람이 지나는 판에 세운다).
#   ★ kind_probe 마을비율 > 10%면 그 줄은 **못 쓴다**(마을에 서 있던 시간이 섞인다).
set -u
REPO=/Users/lbs/source/personal/necro
cd "$REPO" || exit 1
OUT=tmp; mkdir -p "$OUT"
DOCS="balance bone flesh wall"
# ★ kind_probe 는 **실시간**이라 짧게 잡고 싶지만, **골렘이 늦게 선다** — E-1 측정에서
#   첫 등장이 skel 10초 · ghoul 140초 · **golem 360초**였다. 240초로 재면 어느 편성에서도
#   골렘이 0 이라 「갈리나」를 물을 수조차 없다(자가 제 눈금으로 답을 정해 버리는 그 모양).
#   그래서 10분으로 잡는다 — 첫 등장의 두 배 가까이.
KSEC=${KSEC:-600}

node tools/chrome_guard.mjs 2>&1 | tail -2

echo "═════ 1부 · 편성 넷 × 씨앗 셋 × 12분 (loop_health) · $(date +%H:%M) ═════"
for d in $DOCS; do
  for s in 3 9 5; do
    echo "───────── DOC $d · SEED $s · $(date +%H:%M) ─────────"
    LH_SEED=$s LH_DOC=$d node tools/loop_health.mjs 12 "$OUT/doc_${d}_$s.json" 2>&1 \
      | grep -E '최고|주술|아슬아슬|errors' | head -5
  done
done

echo ""
echo "═════ 2부 · 편성이 판에 보이나 (kind_probe fresh · ${KSEC}초 실시간 · 골렘은 360초쯤 선다) · $(date +%H:%M) ═════"
for d in $DOCS; do
  echo "───────── kind $d · $(date +%H:%M) ─────────"
  LH_DOC=$d node tools/kind_probe.mjs "$KSEC" fresh > "$OUT/doc_kind_$d.log" 2>&1
  tail -3 "$OUT/doc_kind_$d.log"
done

echo ""
echo "═════ 갈렸나 ═════"
node - <<'JS'
import fs from "node:fs";
const DOCS = ["balance", "bone", "flesh", "wall"];
const NM = { balance: "균형", bone: "해골위주", flesh: "구울위주", wall: "골렘벽" };
const tops = {};
console.log("  편성 │ 최고층 합 │ 판수 │ 12분Lv │ 군세 │ 시체 │ 죽음");
for (const d of DOCS) {
  let top = 0, ok = 0, lv = 0, army = 0, corpse = 0, deaths = 0, runs = 0;
  for (const s of [3, 9, 5]) {
    try {
      const o = JSON.parse(fs.readFileSync(`tmp/doc_${d}_${s}.json`, "utf8"));
      const last = o.rows[o.rows.length - 1];
      top += last?.최고층 || 0; lv += last?.레벨 || 0;
      army += last?.군세 || 0; corpse += last?.시체 || 0;
      runs += last?.판수 || 0; deaths += o.deaths || 0; ok++;
    } catch { /* 아직 안 끝난 씨앗 */ }
  }
  if (ok) tops[d] = top;
  console.log(`${NM[d].padEnd(6)} │ ${String(top).padStart(6)} (${ok}/3) │ ${String(runs).padStart(3)} │ ${(lv / (ok || 1)).toFixed(1).padStart(5)} │ ${(army / (ok || 1)).toFixed(1).padStart(4)} │ ${(corpse / (ok || 1)).toFixed(0).padStart(4)} │ ${String(deaths).padStart(4)}`);
}

/* 종 비율 — kind_probe 로그의 마지막 JSON 을 집는다. 마을비율 10% 넘으면 못 쓴다. */
console.log("");
console.log("  편성 │ skel │ ghoul │ golem │ 마을% │ 판정");
const kinds = {};
for (const d of DOCS) {
  let line = "재지 못함";
  try {
    const txt = fs.readFileSync(`tmp/doc_kind_${d}.log`, "utf8");
    const m = txt.match(/\{[\s\S]*\}\s*$/);
    const j = JSON.parse(m[0]);
    const town = j["마을비율"];
    const g = j["비율"] || {};                 // ★ 키는 「비율」이다(누계/본적과 다른 칸)
    const pick = (k) => Number(g[k] ?? 0);
    const sk = pick("skel"), gh = pick("ghoul"), go = pick("golem");
    kinds[d] = { sk, gh, go, town };
    line = `${sk.toFixed(1).padStart(5)} │ ${gh.toFixed(1).padStart(5)} │ ${go.toFixed(1).padStart(5)} │ ${String(town).padStart(5)} │ ${town > 10 ? "★못 씀(마을에 서 있었다)" : (j["판정"] || "")}`;
  } catch { line = "재지 못함 — tmp/doc_kind_" + d + ".log 를 직접 볼 것"; }
  console.log(`${NM[d].padEnd(6)} │ ${line}`);
}

console.log("");
const vals = Object.values(tops);
if (vals.length < 4) {
  console.log("── 판정 ── 팔이 넷 다 안 끝났다 — 판정하지 않는다.");
} else {
  const mx = Math.max(...vals), mn = Math.min(...vals);
  const spread = mn > 0 ? (mx / mn - 1) : 0;
  const gk = Object.keys(kinds);
  let kline = "② 종 비율을 못 읽었다 ................. 판정 보류";
  if (kinds.bone && kinds.wall && kinds.bone.town <= 10 && kinds.wall.town <= 10) {
    const gap = Math.abs(kinds.wall.go - kinds.bone.go);
    kline = `② 골렘 비율 bone ${kinds.bone.go.toFixed(1)}% vs wall ${kinds.wall.go.toFixed(1)}% (차 ${gap.toFixed(1)}p) ... ${gap >= 5 ? "OK" : "미달 — 편성이 판에 안 보인다"}`;
  }
  console.log("── 판정 ──");
  console.log(`① 최고층 합 ${mn}~${mx} · 갈림 ${(spread * 100).toFixed(1)}% ≥ 15% ... ${spread >= 0.15 ? "OK" : "미달 — 편성이 판을 안 가른다"}`);
  console.log(kline);
  console.log("→ 미달이면 **값을 만지기 전에** 왜 안 갈리는지부터 본다(auto() 가 편성 표를 정말 읽나 · 상한이 다 묻나).");
}
JS
echo "═════ 끝 · $(date +%H:%M) · 잰 커밋 $(git rev-parse --short HEAD) ═════"
