/* **떠오르는 숫자가 위 띠(`#top`) 위로 올라가는가** (V-75 의 자).
     node tools/v75_numtop.mjs [초]        TOPCAP=0 이면 고침을 끄고 «전»을 잰다
   V-69 의 자(`v69_numlap.mjs`)와 **같은 그릇**을 쓴다 — 그리는 자리에서 모은 네모
   (`window.__RECTS.nums`)를 그대로 읽는다. 식을 밖에서 다시 쓰지 않는다.

   ★ 재는 것은 「가까이 갔나」가 아니라 **띠 밑금 위로 넘어간 넓이**다. 띠는 `#top`
     이고 밑금은 **DOM 에서 읽는다**(40↔48 을 자에도 적으면 고친 쪽과 갈린다
     · [[threshold-and-ruler-must-match]]).
   ★ 알파 0.35 아래는 안 센다(V-51·V-69 와 같은 못 · [[pixel-verification-calibration]]).
   ★ **깊은 층에서 재야 한다** — 얕은 층은 몸이 가운데에만 서서 위로 안 간다.
     그래서 시작을 「몇 시간 논 사람」으로 심고 깊이 내려보낸다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const SECS = Number(process.argv[2] || 45);
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 120)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const wait = ms => new Promise(r => setTimeout(r, ms));
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.addScriptToEvaluateOnNewDocument", { source:
  `Math.random = (() => { let s = 3; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();` });
await S("Page.navigate", { url: PAGE }); await wait(1500);
/* **몇 시간 논 사람**을 심는다 — 숫자가 쏟아지는 자리는 새 저장이 아니라 여기다
   (look_shots·V-26·V-51 과 **같은 세이브**). */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
await S("Runtime.evaluate", { expression: `localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})` });
await S("Page.reload", { ignoreCache: true }); await wait(4500);
/* 전/후를 **같은 판·같은 저장값**으로 견주는 문 ([[same-seed-is-not-same-run]]) */
if (process.env.TOPCAP === "0") await S("Runtime.evaluate", { expression: "globalThis.__NOTOPCAP = 1" });
await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
await wait(1200);
/* ★ **들어갔는지 확인한다** — 마을에서 재면 숫자가 거의 안 떠 «0%»가 나온다
   ([[silent-zero-is-not-an-observation]]). look_shots 와 같은 이름(`MODE.at`)으로 본다. */
const at = async () => (await S("Runtime.evaluate", { returnByValue: true, expression: `(window.MODE||{}).at` })).result.value;
if (await at() !== "dungeon") { console.log("미달: 던전에 못 들어갔다"); process.exit(1); }
await S("Runtime.evaluate", { expression: `
  window.__RECTS = { bars: [], nums: [], bodies: [], frames: 0 };
  window.__RUN = { frames: 0, seen: 0, area: 0, over: 0, hit: 0, worst: 0, worstTxt: "", bot: 0 };
  (function tick() {
    const N = window.__RECTS.nums, O = window.__RUN;
    const el = document.getElementById("top"), r = el && el.getBoundingClientRect();
    const bot = r && r.height > 0 ? r.bottom : 0;
    if (bot) O.bot = bot;
    if (N.length && bot) {
      const vis = N.filter(a => a[7] >= 0.35);
      O.frames++; O.seen += vis.length;
      for (const a of vis) {
        const w = Math.max(0, a[2]), h = Math.max(0, a[3]);
        O.area += w * h;
        const up = Math.min(h, bot - a[1]);            /* 띠 밑금 위로 올라간 높이 */
        if (up <= 0) continue;
        O.over += up * w; O.hit++;
        const rr = up / Math.max(1, h);
        if (rr > O.worst) { O.worst = rr; O.worstTxt = a[4]; }
      }
    }
    requestAnimationFrame(tick);
  })();` });
/* 45초 사이에 죽으면 마을로 돌아간다 — 1초마다 보고 되돌린다(look_shots 와 같은 결).
   되돌린 초를 세어 **너무 많으면 미달**로 말한다. */
let 마을초 = 0;
for (let i = 0; i < SECS; i++) {
  await wait(1000);
  const a = (await S("Runtime.evaluate", { returnByValue: true,
    expression: `(()=>({at:(window.MODE||{}).at, dead:!!(window.S&&S.dead)}))()` })).result.value;
  if (a && (a.at !== "dungeon" || a.dead)) { 마을초++; await S("Runtime.evaluate", { expression: "window.__toDungeon()" }); }
}
const O = JSON.parse((await S("Runtime.evaluate", { returnByValue: true, expression: "JSON.stringify(window.__RUN)" })).result.value);
const pct = 100 * O.over / Math.max(1, O.area), hit = 100 * O.hit / Math.max(1, O.seen);
console.log(`틀 ${O.frames} · 숫자 ${O.seen} · 띠 밑금 ${O.bot}px`);
console.log(`**띠 위로 올라간 넓이 ${pct.toFixed(2)}%** · 걸친 글자 ${hit.toFixed(1)}% ` +
  `· 최악 «${O.worstTxt}» ${(100 * O.worst).toFixed(0)}%`);
console.log(`마을로 돌아간 초 ${마을초}/${SECS} · 층 ${(await S("Runtime.evaluate", { returnByValue: true, expression: "window.S && S.floor" })).result.value}`);
console.log("콘솔오류", errs.length, errs.slice(0, 2));
if (O.frames < 30) console.log("미달: 숫자가 뜬 틀이 30 밑이다 — 잰 것이 없다");
/* ★ **「전」이 내 양성 씨앗이다** ([[silent-zero-is-not-an-observation]]) — `TOPCAP=0` 으로
   재는데도 걸친 글자가 하나도 없으면 자가 눈이 먼 것이다(깊이 못 내려갔거나 창이
   너무 커서 몸이 꼭대기까지 안 간 것). 고친 판의 문턱은 **0** 이다 — 묶었으니
   한 글자도 넘으면 안 된다([[floor-far-from-threshold]] · 바닥 0, 씨앗은 그 위). */
if (process.env.TOPCAP === "0" && O.hit === 0) console.log("미달: 씨앗(고치기 전)이 0 이다 — 자가 못 본다");
if (process.env.TOPCAP !== "0" && O.hit > 0) console.log(`틀림: 묶었는데 ${O.hit} 글자가 띠를 넘었다`);
await raw("Target.closeTarget", { targetId });
process.exit(0);
