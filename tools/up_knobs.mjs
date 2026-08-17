/* 강화 넷(생명력·기력·어둠의 힘·군세)이 **정말 고를 수 있는 축인가** — 자를 먼저 댄다.
   ROADMAP 「C. 능력치 강화 넷이 전부 선형이다」의 첫 단계.
   고치기 전에 수로 재는 자리다([[cause-written-in-the-item-is-a-guess]]).

   두 가지를 묻는다:
     ㉠ **넷이 따로 자라는가** — autoForge 가 「제일 싼 것」을 사므로, 넷의 밑값이
        14/16/22/40 이고 곱이 다 같은 1.55 라면 계급은 **고정된 간격**에 묶인다.
        묶여 있으면 그건 축 넷이 아니라 **금 하나에 붙은 눈금 넷**이다.
     ㉡ **같은 금이 축마다 다른 값을 주는가** — 다르면 「제일 싼 것부터」는 그냥 틀린
        전략이고, 같으면 고를 이유가 없다. 어느 쪽이든 지금은 «고르는 것»이 아니다.
   브라우저 없이 core.js 를 그대로 불러 식을 두드린다(tree_knobs.mjs 와 같은 결). */
const C = await import("../js/core.js");

const clear = () => { for (const k of Object.keys(C.UPS)) C.META.up[k] = 0; };
const setUp = (o) => { clear(); Object.assign(C.META.up, o); };
/* ★ ㉠ 이 autoForge 를 부르면 **재련(META.plus)도 같이 산다** — 그대로 두면 뒤의 ㉡·㉢ 이
   +40 짜리 망토를 입은 몸을 재게 되어 「생명력이 죽는 층」이 32층으로 밀린다(맨몸은 14층).
   자가 저를 속이는 자리라 여기서 되돌린다([[seed-the-probe]] 와 같은 결). */
const PLUS0 = JSON.parse(JSON.stringify(C.META.plus || {}));
const restorePlus = () => { for (const k of Object.keys(C.META.plus || {})) C.META.plus[k] = PLUS0[k] | 0; };

/* ══ ㉠ 넷이 묶여 있는가 ══ 금을 부어 autoForge 에게 실제로 사게 하고 계급을 본다. */
console.log("══ ㉠ 「제일 싼 것부터」가 넷을 묶는가 ══");
console.log("금".padStart(12), "  생명력 기력 어둠 군세   폭(최대-최소)");
clear();
for (const k of Object.keys(C.META.plus || {})) C.META.plus[k] = 0;
const spans = [];
for (const gold of [1e3, 1e4, 1e5, 1e6, 1e7, 1e8]) {
  C.META.gold = gold;
  for (let i = 0; i < 400; i++) if (!C.autoForge(64).length) break;
  const v = ["hp", "mp", "dmg", "army"].map((k) => C.META.up[k] | 0);
  const span = Math.max(...v) - Math.min(...v);
  spans.push(span);
  console.log(String(gold.toLocaleString()).padStart(12), " ",
    v.map((x) => String(x).padStart(5)).join(" "), " ", String(span).padStart(4));
}
const locked = Math.max(...spans) <= 3;
console.log(locked
  ? `☞ 폭이 ${Math.max(...spans)} 을 안 넘는다 — 금이 만 배가 되어도 넷의 간격은 그대로다.\n`
    + "   축 넷이 아니라 **금 하나에 붙은 눈금 넷**이다(고를 것이 없다).\n"
  : "☞ 넷이 따로 자란다.\n");

/* ══ ㉡ 같은 금이 축마다 무엇을 주는가 ══
   축이 서로 다른 것을 건드리므로 **판에서 뜻이 있는 셋**으로 모아 견준다:
     · 총화력 = 군세 상한 × 소환수 피해 배수 (하수인 전부가 내는 힘)
     · 체력   = hpMaxOf() (본인 생존)
     · 마나   = 최대 마나 + 회복×20초 (20초 동안 쓸 수 있는 총량)
   층을 바꿔 가며 본다 — 깊이가 값의 뜻을 바꾸는 자리가 있다. */
const read = () => ({
  총화력: +(C.armyCap() * C.minionDmgMul()).toFixed(2),
  체력:   Math.round(C.hpMaxOf()),
  마나:   +(C.mpMaxOf() + C.mpRegenOf() * 20).toFixed(1),
});
const KEYS = ["hp", "mp", "dmg", "army"];
const dead = [];
restorePlus();   // ㉠ 이 사 둔 재련을 되돌린다 — 맨몸에서 잰다
for (const floor of [1, 20, 60]) {
  C.S.floor = floor;
  console.log(`══ ㉡ ${floor}층 · 계급 20 에서 한 계급 더 사면 ══ (값 = 1만 금당 증가율 %)`);
  const base20 = Object.fromEntries(KEYS.map((k) => [k, 20]));
  setUp(base20); const b = read();
  console.log("   바탕 ", JSON.stringify(b));
  for (const k of KEYS) {
    setUp({ ...base20, [k]: 21 });
    const v = read(), cost = C.upCost(k);      // 계급 20 → 21 값
    const per = (x) => {
      if (b[x] === 0) return "  -   ";
      const pct = (v[x] - b[x]) / b[x] * 100 * (1e4 / cost);
      return (pct === 0 ? "  ." : pct.toFixed(2)).padStart(6);
    };
    const moved = Object.keys(v).filter((x) => v[x] !== b[x]);
    if (!moved.length) dead.push(`${floor}층 ${C.UPS[k].n}`);
    console.log(`   ${C.UPS[k].n.padEnd(5)} 값 ${String(cost.toLocaleString()).padStart(11)} 금 ·`,
      `총화력 ${per("총화력")} · 체력 ${per("체력")} · 마나 ${per("마나")}`,
      moved.length ? "" : "  ★ 아무것도 안 움직임");
  }
  console.log("");
}
/* ══ ㉢ 생명력은 **몇 층부터 죽는가** ══
   hpMaxOf 는 `max(bodyHp, 층피해×SURVIVE_HITS)` 다 — 깊이가 붙으면 뒤엣것이 이겨서
   앞엣것(강화가 키우는 쪽)이 **통째로 무시된다.** 20분 판이 75~79층까지 가므로,
   이 층이 낮으면 생명력 강화는 판의 거의 전부에서 «없는 축»이다. */
console.log("══ ㉢ 생명력 강화가 죽는 층 ══ (hpMaxOf 가 층피해에 먹히는 자리)");
for (const r of [0, 10, 20, 40]) {
  let died = null;
  for (let f = 1; f <= 200; f++) {
    C.S.floor = f; setUp({ hp: r }); const a = C.hpMaxOf();
    setUp({ hp: r + 1 }); const b = C.hpMaxOf();
    if (b === a) { died = f; break; }
  }
  console.log(`   계급 ${String(r).padStart(2)} → ${died ? `**${died}층**부터 한 계급을 더 사도 체력이 안 는다` : "200층까지 산다"}`);
}

/* ══ ㉣ 그 죽은 축에 금이 얼마나 들어가는가 ══ 제일 싼 축이라 **제일 많이 산다.** */
console.log("\n══ ㉣ 강화에 쓴 금 중 생명력 몫 ══");
for (const gold of [1e5, 1e7, 1e9]) {
  const spent = { hp: 0, mp: 0, dmg: 0, army: 0 }; clear();
  let left = gold;
  for (;;) {
    let pick = null, lo = Infinity;
    for (const k of KEYS) { const c = C.upCost(k); if (c < lo) { lo = c; pick = k; } }
    if (lo > left) break;
    left -= lo; spent[pick] += lo; C.META.up[pick]++;
  }
  const tot = Object.values(spent).reduce((a, b) => a + b, 0) || 1;
  console.log(`   금 ${String(gold.toLocaleString()).padStart(15)} → `
    + KEYS.map((k) => `${C.UPS[k].n} ${(spent[k] / tot * 100).toFixed(0)}%`).join(" · "));
}

C.S.floor = 1; clear();
if (dead.length) console.log(`\n★ 안 도는 손잡이: ${dead.join(" · ")}`);
process.exit(0);
