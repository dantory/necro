/* **강화 넷이 «축»인가 «금 하나에 붙은 눈금 넷»인가** — 그리고 빌드마다 갈리는가.
   (병수님 2026-08-21 17:40 「① 자동 구매 규칙을 바꾼다」)
     node tools/forge_mix.mjs

   ★ **고치기 전에 먼저 댄다**([[cause-written-in-the-item-is-a-guess]]).
     이 자가 지금(=고치기 전) 무엇을 말하는지 적어 두고, 고친 뒤 같은 자로 다시 잰다.

   넷을 묻는다 — 끝 조건은 ROADMAP 에 **값을 고르기 전에** 적어 두었다:
     ㉠ 금 1e8 에서 계급 **폭(최대-최소) ≥ 12** — 단 **몫이 갈리는 빌드에서**.
        ★★ 처음엔 이걸 **「균형」편성에서 쟀다.** 그런데 균형은 몫이 넷 다 1.0 인
          **일부러 평평한 빌드**다 — 거기서 폭이 1 인 것은 규칙이 안 듣는 게 아니라
          **규칙이 시킨 대로 된 것**이다. 「축이 갈리는가」를 묻고 싶으면
          **갈리라고 만든 빌드**에서 물어야 한다. 자를 댈 자리를 잘못 골랐다.
          (균형이 예전과 거의 같은 것 — 28·28·27·26 → 27·27·27·26 — 은 **지켜야 할
           쪽**이다. 지난 A/B 의 축이 균형이라, 여기가 흔들리면 옛 측정을 못 읽는다.)
     ㉡ 편성 넷이 **다른 몸**을 만든다 — 군세 계급이 편성 최대/최소 사이 **2배 이상**
     ㉢ **마나가 안 굶는다** — 어느 편성에서도 mp 계급 ≥ **넷 평균의 55%**
        ★ 조심이 아니라 **실측 때문**이다: 08-21 죽음 일곱이 전부 마나 0~6 이었다.
        ★★ 처음엔 「**넷 중 최저**의 60%」로 썼다가 **쓰기 전에 물렀다** — mp 가 최저이면
          `mp ≥ 0.6·mp` 라 **언제나 참**이다. 굶기려고 작정해도 안 우는 자였다.
          **바닥이 문턱에서 멀면 그 수는 눈금이 아니라 상수다**([[floor-far-from-threshold]]).
          오늘 새벽에도 같은 것에 걸렸다(arena_qa ④). 이번엔 «재기 전에» 봤다.
     ㉣ **재련이 안 굶는다** — 같은 금에서 재련 계급 합이 고치기 전의 60% 이상
   브라우저 없이 `core.js` 를 그대로 불러 식을 두드린다(up_knobs·tree_knobs 와 같은 결). */
const C = await import("../js/core.js");
const KEYS = Object.keys(C.UPS);

const reset = () => {
  for (const k of KEYS) C.META.up[k] = 0;
  for (const k of Object.keys(C.META.plus || {})) C.META.plus[k] = 0;
};
/** 금을 부어 **끝까지** 사게 하고 계급을 읽는다. */
const spend = (gold, doctrine) => {
  reset();
  globalThis.__DOCTRINE = doctrine || undefined;
  C.META.gold = gold;
  for (let i = 0; i < 4000; i++) if (!C.autoForge(64).length) break;
  const up = {}; for (const k of KEYS) up[k] = C.META.up[k] | 0;
  const plus = Object.values(C.META.plus || {}).reduce((a, b) => a + (b | 0), 0);
  globalThis.__DOCTRINE = undefined;
  return { up, plus, 남은금: Math.round(C.META.gold) };
};
const vals = (u) => KEYS.map(k => u[k] | 0);
const span = (u) => Math.max(...vals(u)) - Math.min(...vals(u));

const fails = [], out = {};

/* ── ㉠ 금을 10만 배 부으면 넷이 갈리는가 ── */
console.log("══ ㉠-a 「균형」은 예전 그대로여야 한다(몫이 넷 다 1.0 — 일부러 평평하다) ══");
console.log("        금 |  " + KEYS.map(k => C.UPS[k].n.padStart(4)).join(" ") + " |   폭   재련");
const 폭 = {};
for (const g of [1e3, 1e4, 1e5, 1e6, 1e7, 1e8]) {
  const r = spend(g);
  폭[g] = span(r.up);
  console.log(String(g.toExponential(0)).padStart(10) + " |  " +
    KEYS.map(k => String(r.up[k]).padStart(4)).join(" ") + " |  " +
    String(폭[g]).padStart(3) + "   " + String(r.plus).padStart(4));
}
out.균형폭_1e8 = 폭[1e8];
if (폭[1e8] > 4) fails.push(`㉠-a 균형 편성의 폭이 ${폭[1e8]} — 예전(2)에서 벌어졌다. 지난 A/B 의 축이 흔들린다`);

/* ── ㉡ 편성이 다른 몸을 만드는가 ── */
console.log("\n══ ㉡ 편성 넷이 «다른 몸»을 만드는가 (금 1e8) ══");
console.log("  편성      |  " + KEYS.map(k => C.UPS[k].n.padStart(4)).join(" ") + " |  재련");
const byDoc = {};
for (const d of C.DOCTRINE_IDS) {
  const r = spend(1e8, d);
  byDoc[d] = r.up;
  console.log("  " + (C.DOCTRINE[d].n + "        ").slice(0, 9) + " |  " +
    KEYS.map(k => String(r.up[k]).padStart(4)).join(" ") + " |  " + String(r.plus).padStart(4));
}
/* ── ㉠-b 몫이 «갈리는» 빌드에서 폭이 나는가 ── 여기가 진짜 물음이다 */
const 폭들 = C.DOCTRINE_IDS.map(d => ({ d, s: span(byDoc[d]) }));
const 최대폭 = Math.max(...폭들.map(x => x.s));
out.최대폭_1e8 = 최대폭;
console.log("\n══ ㉠-b 갈리라고 만든 빌드에서 폭이 나는가 (금 1e8) ══");
for (const x of 폭들) console.log(`  ${(C.DOCTRINE[x.d].n + "        ").slice(0, 9)} 폭 ${String(x.s).padStart(3)}`);
if (!(최대폭 >= 12))
  fails.push(`㉠-b 어느 편성에서도 계급 폭이 ${최대폭} — 끝 조건 12 미만. 축이 아니라 눈금이다`);

const armies = C.DOCTRINE_IDS.map(d => byDoc[d].army | 0);
const [aLo, aHi] = [Math.min(...armies), Math.max(...armies)];
out.군세_편성폭 = [aLo, aHi];
if (!(aHi >= aLo * 2 && aHi > aLo))
  fails.push(`㉡ 군세 계급이 편성 사이에서 ${aLo}~${aHi} — 2배가 안 된다. 편성이 몸을 안 바꾼다`);

/* ── ㉢ 마나가 굶지 않는가 ── */
console.log("\n══ ㉢ 마나가 굶는 편성이 있는가 ══");
for (const d of C.DOCTRINE_IDS) {
  const u = byDoc[d], avg = vals(u).reduce((a, b) => a + b, 0) / KEYS.length, mp = u.mp | 0;
  const ok = mp >= avg * 0.55;
  console.log(`  ${(C.DOCTRINE[d].n + "        ").slice(0, 9)} 마나 ${String(mp).padStart(4)} · 넷 평균 ${avg.toFixed(1).padStart(5)}  (${Math.round(100 * mp / (avg || 1))}%)  ${ok ? "ok" : "★ 굶는다"}`);
  if (!ok) fails.push(`㉢ ${C.DOCTRINE[d].n}: 마나 계급 ${mp} 가 넷 평균 ${avg.toFixed(1)} 의 55% 아래 — 죽음 일곱이 전부 마나 0~6 이었다`);
}

/* ── ㉣ 재련이 굶지 않는가 ── (기준값은 고치기 전에 재서 여기 박는다) */
const BASE_PLUS_1E8 = +(process.env.BASE_PLUS || 0);
const nowPlus = spend(1e8).plus;
out.재련_1e8 = nowPlus;
console.log(`\n══ ㉣ 재련(무한 축) 계급 합 (금 1e8): ${nowPlus}` +
            (BASE_PLUS_1E8 ? `  · 고치기 전 ${BASE_PLUS_1E8} → ${Math.round(100 * nowPlus / BASE_PLUS_1E8)}%` : "  (기준값 미지정 — BASE_PLUS=… 로 넘긴다)"));
if (BASE_PLUS_1E8 && nowPlus < BASE_PLUS_1E8 * 0.6)
  fails.push(`㉣ 재련이 ${nowPlus} 로 고치기 전(${BASE_PLUS_1E8})의 60% 아래 — 무한 축이 굶는다`);

console.log("\n" + (fails.length ? `미달 ${fails.length}건\n  · ` + fails.join("\n  · ") : "통과"));
console.log(JSON.stringify(out));
process.exit(fails.length ? 1 : 0);
