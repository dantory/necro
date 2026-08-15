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
# ★ 씨앗은 **여섯**이다(`ab_capstruct` 와 같은 목록 — 두 자를 맞대려면 눈금이 같아야 한다).
#   셋으로 쟀을 때 「편성 사이 폭 12% vs 씨앗 사이 폭 31%」로 **잡음이 신호보다 컸다** —
#   그 상태의 「미달」은 결론이 아니라 *못 쟀다* 이다([[seed-the-probe]]).
SEEDS=${SEEDS:-"3 9 5 1 2 4"}
# ★ kind_probe 는 **실시간**이라 짧게 잡고 싶지만, **골렘이 늦게 선다** — E-1 측정에서
#   첫 등장이 skel 10초 · ghoul 140초 · **golem 360초**였다. 240초로 재면 어느 편성에서도
#   골렘이 0 이라 「갈리나」를 물을 수조차 없다(자가 제 눈금으로 답을 정해 버리는 그 모양).
#   그래서 10분으로 잡는다 — 첫 등장의 두 배 가까이.
KSEC=${KSEC:-600}

node tools/chrome_guard.mjs 2>&1 | tail -2

echo "═════ 1부 · 편성 넷 × 씨앗 [$SEEDS] × 12분 (loop_health) · $(date +%H:%M) ═════"
for d in $DOCS; do
  for s in $SEEDS; do
    echo "───────── DOC $d · SEED $s · $(date +%H:%M) ─────────"
    LH_SEED=$s LH_DOC=$d node tools/loop_health.mjs 12 "$OUT/doc_${d}_$s.json" 2>&1 \
      | grep -E '최고|주술|아슬아슬|errors' | head -5
  done
done

echo ""
# ★ `SKIP_KIND=1` 이면 2부를 건너뛰고 **지난 로그를 그대로 쓴다**(4×10분 = 40분을 아낀다).
#   ②(종 비율이 갈리나)는 08-16 03:34 에 이미 OK 로 답이 났고 그 뒤 종을 고르는 길은
#   안 바뀌었다. 다시 물어야 하는 것은 ①(최고층이 갈리나)뿐이다.
#   ★ 건너뛴 것을 **말은 하고 건너뛴다** — 안 적으면 다음에 「이번에 쟀다」로 읽는다.
if [ "${SKIP_KIND:-0}" = "1" ]; then
  echo "═════ 2부 · 건너뜀(SKIP_KIND=1) — tmp/doc_kind_*.log 는 지난 판(03:34)의 것이다 ═════"
else
echo "═════ 2부 · 편성이 판에 보이나 (kind_probe fresh · ${KSEC}초 실시간 · 골렘은 360초쯤 선다) · $(date +%H:%M) ═════"
for d in $DOCS; do
  echo "───────── kind $d · $(date +%H:%M) ─────────"
  LH_DOC=$d node tools/kind_probe.mjs "$KSEC" fresh > "$OUT/doc_kind_$d.log" 2>&1
  tail -3 "$OUT/doc_kind_$d.log"
done
fi

echo ""
echo "═════ 갈렸나 ═════"
SEEDS="$SEEDS" node - <<'JS'
import fs from "node:fs";
const DOCS = ["balance", "bone", "flesh", "wall"];
const NM = { balance: "균형", bone: "해골위주", flesh: "구울위주", wall: "골렘벽" };
const tops = {}, grid = {};
const SEEDS = (process.env.SEEDS || "3 9 5").trim().split(/\s+/).map(Number);
console.log("  편성 │ 최고층 합 │ 판수 │ 12분Lv │ 군세 │ 시체 │ 죽음");
for (const d of DOCS) {
  let top = 0, ok = 0, lv = 0, army = 0, corpse = 0, deaths = 0, runs = 0;
  for (const s of SEEDS) {
    try {
      const o = JSON.parse(fs.readFileSync(`tmp/doc_${d}_${s}.json`, "utf8"));
      const last = o.rows[o.rows.length - 1];
      top += last?.최고층 || 0; lv += last?.레벨 || 0;
      army += last?.군세 || 0; corpse += last?.시체 || 0;
      /* 낱 판을 따로 남긴다 — 합만 보면 **씨앗 잡음이 편성 차보다 큰지**를 못 본다. */
      grid[d + "|" + s] = { top: last?.최고층 || 0, army: last?.군세 || 0, cap: last?.상한 || 0 };
      /* `deaths` 는 죽은 자리마다 한 덩이씩 든 **배열**이다 — 그냥 더하면
         `0[object Object],...` 가 찍힌다(08-16 04:17 표에 그렇게 나왔다). 길이를 센다. */
      runs += last?.판수 || 0; deaths += Array.isArray(o.deaths) ? o.deaths.length : (o.deaths || 0); ok++;
    } catch { /* 아직 안 끝난 씨앗 */ }
  }
  if (ok) tops[d] = top;
  console.log(`${NM[d].padEnd(6)} │ ${String(top).padStart(6)} (${ok}/${SEEDS.length}) │ ${String(runs).padStart(3)} │ ${(lv / (ok || 1)).toFixed(1).padStart(5)} │ ${(army / (ok || 1)).toFixed(1).padStart(4)} │ ${(corpse / (ok || 1)).toFixed(0).padStart(4)} │ ${String(deaths).padStart(4)}`);
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

  /* ③ **잡음이 신호보다 크면 15% 문턱은 잴 수가 없다**([[seed-the-probe]]).
     같은 씨앗 안에서 편성 넷이 벌어지는 폭 ↔ 같은 편성 안에서 씨앗 셋이 벌어지는 폭을
     나란히 낸다. 뒤가 크면 「편성이 안 갈린다」가 아니라 **아직 못 쟀다**가 맞는 말이다. */
  const 폭 = (v) => { const a = v.filter(x => x > 0); return a.length < 2 ? 0 : (Math.max(...a) / Math.min(...a) - 1); };
  const 편성폭 = SEEDS.map(s => 폭(DOCS.map(d => grid[d + "|" + s]?.top || 0)));
  const 씨앗폭 = DOCS.map(d => 폭(SEEDS.map(s => grid[d + "|" + s]?.top || 0)));
  const 신호 = 편성폭.reduce((a, b) => a + b, 0) / (편성폭.length || 1);
  const 잡음 = 씨앗폭.reduce((a, b) => a + b, 0) / (씨앗폭.length || 1);
  console.log(`③ 편성 사이 폭 ${(신호 * 100).toFixed(0)}% vs 씨앗 사이 폭 ${(잡음 * 100).toFixed(0)}% ... ` +
    (신호 > 잡음 ? "OK — 편성이 잡음보다 크다" : "★ 잡음이 더 크다 — 씨앗을 늘리기 전엔 ①을 믿지 말 것"));
  SEEDS.forEach((s, i) => console.log(`     씨앗${s} 안 편성 넷: ${DOCS.map(d => grid[d + "|" + s]?.top || "-").join("/")} → ${(편성폭[i] * 100).toFixed(0)}%`));

  /* ④ **군세가 상한에 붙어 있으면 무엇을 세워도 머릿수가 같다** — 편성이 갈릴 자리가 없다. */
  const all = Object.values(grid), 꽉 = all.filter(g => g.cap > 0 && g.army >= g.cap).length;
  console.log(`④ 군세 = 상한으로 꽉 찬 판 ${꽉}/${all.length} ... ` +
    (꽉 * 2 > all.length ? "★ 상한이 다 묻는다 — 편성보다 「군세 상한」 항목이 먼저다" : "OK"));
  console.log("→ 미달이면 **값을 만지기 전에** 왜 안 갈리는지부터 본다(auto() 가 편성 표를 정말 읽나 · 상한이 다 묻나).");

  /* ⑤ **두 자를 맞댄다** — 같은 씨앗에서 `ab_doc balance` 와 `ab_capstruct base` 가
     같은 값을 내는가. 08-16 에 같은 base 를 두 자로 재서 「상한참 20% 대 55~67%」로
     엇갈렸고, 그걸 **눈으로 대 보기 전까지 팔을 더 만들 뻔했다.** 자가 스스로 대게 한다.
     (balance 는 프리셋을 켠 것이고 base 는 안 켠 것이라 **다르면 그게 프리셋의 값**이다.) */
  const 막 = (f) => { try {
    const A = ((JSON.parse(fs.readFileSync(f, "utf8"))["시간"] || {})["군세"]) || {};
    const m = A["막힘"] || {}, 초 = A["초"] || 0;
    return 초 ? { 초, jam: 100 * (m["상한참"] || 0) / 초, cd: 100 * (m["재사용"] || 0) / 초, mp: 100 * (m["마나부족"] || 0) / 초 } : null;
  } catch { return null; } };
  const 쌍 = SEEDS.map(s => ({ s, a: 막(`tmp/doc_balance_${s}.json`), b: 막(`tmp/capst_base_${s}.json`) })).filter(x => x.a && x.b);
  if (!쌍.length) console.log("⑤ 두 자를 맞댈 짝이 없다(capst_base_*.json 이 없다) ... 건너뜀");
  else {
    const d = 쌍.map(x => Math.abs(x.a.jam - x.b.jam));
    const mx = Math.max(...d);
    console.log(`⑤ 같은 씨앗에서 balance vs capstruct-base 상한참 최대차 ${mx.toFixed(1)}p (짝 ${쌍.length}) ... ` +
      (mx <= 2 ? "OK — 두 자가 같은 판을 본다(엇갈린 값은 «다른 커밋»이지 자 탓이 아니다)"
               : "★ 두 자가 다른 판을 본다 — 프리셋이 판을 바꾸는 것이니 그것부터 볼 것"));
    쌍.forEach(x => console.log(`     씨앗${x.s} 상한참 ${x.a.jam.toFixed(0)}/${x.b.jam.toFixed(0)}% · 재사용 ${x.a.cd.toFixed(0)}/${x.b.cd.toFixed(0)}% · 마나 ${x.a.mp.toFixed(0)}/${x.b.mp.toFixed(0)}%`));
  }
}
JS
echo "═════ 끝 · $(date +%H:%M) · 잰 커밋 $(git rev-parse --short HEAD) ═════"
