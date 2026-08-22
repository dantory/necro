/* 문 확인 — D-33 `__TOUGH` 가 정말 도는가([[knob-that-does-nothing]]).
   ★ 이것은 **산수**를 보는 자다(상한이 얼마로 깎이고 한 마리가 얼마로 되받는가).
     판이 실제로 어떻게 되는지는 `tools/ab_tough.sh` 가 사람이 걷는 길로 잰다
     ([[probe-must-walk-the-real-path]]).
   보는 것 넷 — **재기 전에** 적는다:
     ① **t = 0 이면 한 톨도 안 다른가** — 세 몫(상한·체력·피해)이 정확히 1.
     ② **손잡이가 도는가** — t 를 올리면 상한이 «실제로» 줄고 한 마리가 그만큼 커지는가.
        ★ 상한은 정수(ceil)라 작은 수에서는 안 움직일 수 있다 — 그것이 ④다.
     ③ **총량이 보존되는가**(k=1) — `상한 × 한마리` 가 t 와 무관하게 같은가.
        이것이 이 문의 노림이다: 갈린 것은 «알갱이 크기»뿐이라야 뒤에 무슨 일이 나든
        그것을 «회전율» 탓이라 말할 수 있다. 어긋남이 크면 D-26 ④(그냥 어려워짐)와 섞인다.
     ④ **앞을 무는가** — 초반 상한은 3~7 이라 ceil 이 이기고, 바닥(1)에 닿으면 판이 멈춘다.
        D-29·D-31·D-32 가 전부 「뒤를 노렸는데 앞이 물렸다」로 졌다 — 그 자리를 **재기 전에** 본다. */
const CDP = "http://127.0.0.1:9333";
const URL = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
function raw(method, params = {}, sessionId) {
  const mid = ++id; bws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  return new Promise((res, rej) => pend.set(mid, { res, rej }));
}
bws.addEventListener("message", ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id);
    return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
});
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await new Promise(r => setTimeout(r, 2500));
const expr = `(async () => {
  /* ★ 캐시를 비껴간다 — 브라우저가 옛 core.js 를 물고 있으면 «없는 함수»로 죽는다 */
  const core = await import("/js/core.js?v=" + Math.random());
  const st = core.S, M = core.META;
  /* ★ 페이지가 **실제 세이브를 물고** 뜬다 — 안 비우면 「맨몸」이 장비를 낀 채가 된다
     ([[silent-zero-is-not-an-observation]] 에서 vowlift_check 가 걸렸던 그 자리). */
  M.equip = {}; M.plus = {}; M.af = []; M.amul = []; M.tree = {}; M.uniq = [];
  const 자리 = [
    { 이름: "분 2 (Lv.1 · 층 3)",   lv: 1,  army: 0,  floor: 3  },
    { 이름: "분 6 (Lv.12 · 층 12)", lv: 12, army: 2,  floor: 12 },
    { 이름: "뒤 (Lv.60 · 층 45)",   lv: 60, army: 12, floor: 45 },
    { 이름: "끝 (Lv.90 · 층 65)",   lv: 90, army: 20, floor: 65 },
  ];
  const rows = [];
  for (const a of 자리) {
    M.lv = a.lv; M.up.army = a.army; st.floor = a.floor;
    for (const t of [0, 0.5, 1, 1.5, 2, 3]) {
      globalThis.__TOUGH = t;
      const cap = core.armyCap(), hp = core.minionHpMul(), dmg = core.minionMulOf();
      rows.push({ 자리: a.이름, t, cap, hp: Math.round(hp * 1e6) / 1e6, dmg: Math.round(dmg * 1e6) / 1e6 });
    }
    delete globalThis.__TOUGH;
  }
  return JSON.stringify({ rows, def: core.TOUGH_DEF, cut: core.TOUGH_CUT,
                          몫0: [core.toughCapMul(), core.toughBackMul()] });
})()`;
const r = await S("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
if (r.exceptionDetails) { console.error(JSON.stringify(r.exceptionDetails)); process.exit(2); }
const { rows, def, cut, 몫0 } = JSON.parse(r.result.value);
let bad = 0;
console.log(`TOUGH_CUT = ${cut} · TOUGH_DEF = ${def}\n`);

// ① 기본값이 무해한가
if (def !== 0) { console.log(`✗ ① 기본값이 0 이 아니다(${def}) — 아직 재기 전이다`); bad++; }
if (몫0[0] !== 1 || 몫0[1] !== 1) { console.log(`✗ ① 손 안 댄 몫이 1 이 아니다(${몫0})`); bad++; }
else console.log("✔ ① 기본값(t=0)에서 세 몫이 정확히 1 — 판은 한 톨도 안 바뀐다");

console.log("\n| 자리 | t | 군세 상한 | 한 마리 체력 | 한 마리 피해 | **총체력** | **총피해** |");
console.log("| --- | --- | --- | --- | --- | --- | --- |");
const by = {};
for (const x of rows) (by[x.자리] ||= []).push(x);
for (const [자리, xs] of Object.entries(by)) {
  const b = xs[0];                                   // t=0 이 그 자리의 바탕
  for (const x of xs) {
    const th = (x.cap * x.hp) / (b.cap * b.hp), td = (x.cap * x.dmg) / (b.cap * b.dmg);
    const mark = v => (Math.abs(v - 1) <= 0.12 ? `${Math.round(v * 100)}%` : `**${Math.round(v * 100)}%**`);
    console.log(`| ${x.t === 0 ? 자리 : ""} | ${x.t} | ${x.cap}${x.cap === 1 ? " ⚠" : ""} | ×${x.hp.toFixed(2)} | ×${x.dmg.toFixed(2)} | ${mark(th)} | ${mark(td)} |`);
  }
}
// ② 손잡이가 도는가 — 뒤쪽 자리에서 상한이 줄고 한 마리가 커져야 한다
const 뒤 = by["뒤 (Lv.60 · 층 45)"];
const t0 = 뒤[0], t2 = 뒤.find(x => x.t === 2);
if (!(t2.cap < t0.cap * 0.6 && t2.hp > t0.hp * 1.6)) {
  console.log(`\n✗ ② 손잡이가 안 돈다 — 뒤 자리 상한 ${t0.cap}→${t2.cap} · 체력 ×${t0.hp}→×${t2.hp}`); bad++;
} else console.log(`\n✔ ② 손잡이가 돈다 — 뒤 자리 상한 ${t0.cap} → ${t2.cap} 이고 한 마리가 ×${(t2.hp / t0.hp).toFixed(2)} 두꺼워진다`);

// ③ 총량 보존 — 정수 올림 탓의 어긋남만 남아야 한다
let worst = 0, worstAt = "";
for (const [자리, xs] of Object.entries(by)) {
  const b = xs[0];
  for (const x of xs) {
    const e = Math.abs((x.cap * x.hp) / (b.cap * b.hp) - 1);
    if (e > worst) { worst = e; worstAt = `${자리} · t=${x.t}`; }
  }
}
console.log(worst <= 0.25
  ? `✔ ③ 총량이 대체로 보존된다 — 제일 어긋난 곳이 ${Math.round(worst * 100)}% (${worstAt}) · 남은 것은 ceil 탓이다`
  : `✗ ③ 총량이 ${Math.round(worst * 100)}% 어긋난다 (${worstAt}) — 회전율 축이 «세기» 축과 섞인다`);
if (worst > 0.25) bad++;

// ④ 앞을 무는가 — 초반 자리에서 상한이 1 로 내려가면 판이 멈춘다
const 앞 = [...by["분 2 (Lv.1 · 층 3)"], ...by["분 6 (Lv.12 · 층 12)"]];
const 죽는t = 앞.filter(x => x.cap <= 1).map(x => x.t);
const 안도는t = by["분 2 (Lv.1 · 층 3)"].filter(x => x.t > 0 && x.cap === by["분 2 (Lv.1 · 층 3)"][0].cap).map(x => x.t);
console.log(죽는t.length
  ? `⚠ ④ **앞이 물린다** — t=${[...new Set(죽는t)].join("·")} 에서 초반 상한이 1 이다(벽이 없어진다). 팔은 그 아래로만 둔다`
  : "✔ ④ 앞 자리에서 상한이 1 로 안 내려간다");
if (안도는t.length) console.log(`   · 그리고 t=${안도는t.join("·")} 은 초반 상한을 «한 톨도» 못 움직인다(ceil 이 이긴다) — 앞은 어차피 못 건드린다`);
console.log(bad ? `\n✗ ${bad} 군데가 어긋났다` : "\n✔ 넷 다 선다 — 재도 된다");
process.exit(bad ? 1 : 0);
