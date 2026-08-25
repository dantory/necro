/* **빛깔이 다른 숫자 둘이 «같은 픽셀»에 그려지는가** (V-69 의 자).
     node tools/v69_numlap.mjs [초]        XLAP=0 이면 고침을 끄고 «전»을 잰다
   V-51 의 자(`v51_runs.mjs`)와 같은 그릇을 쓴다 — 그리는 자리에서 모은 네모
   (`window.__RECTS.nums`)를 그대로 읽고, 식을 밖에서 다시 쓰지 않는다.

   ★ V-51 은 **같은 빛깔끼리 «붙는 것»**만 봤다(「16」 옆 「16」 = 「1616」). 그러면서
     `q.kind !== n.kind` 를 통째로 건너뛰었다 — 「빛깔이 다르면 둘로 읽힌다」는 까닭인데,
     그 말은 **나란히 설 때만** 맞다. 획이 획 위에 얹히면 색은 못 구한다.
   ★ 그래서 이 자는 **닿는 것(gap<0)** 이 아니라 **겹치는 넓이**를 센다 — 사람이 못 읽는
     것은 「가깝다」가 아니라 「덮였다」이다. 눈금은 그려진 글자 넓이 중 몇 %가
     다른 빛깔에 덮였는가.
   ★ 알파 0.35 아래는 안 센다(V-51 과 같은 못 · [[pixel-verification-calibration]]). */
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
if (process.env.XLAP === "0") await S("Runtime.evaluate", { expression: "globalThis.__NOXLAP = 1" });
await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
await wait(1200);
/* ★ **들어갔는지 확인한다** — 마을에서 재면 숫자가 거의 안 떠 «0%»가 나온다
   ([[silent-zero-is-not-an-observation]]). look_shots 와 같은 이름(`MODE.at`)으로 본다. */
const at = async () => (await S("Runtime.evaluate", { returnByValue: true, expression: `(window.MODE||{}).at` })).result.value;
if (await at() !== "dungeon") { console.log("미달: 던전에 못 들어갔다"); process.exit(1); }
await S("Runtime.evaluate", { expression: `
  window.__RECTS = { bars: [], nums: [], bodies: [], frames: 0 };
  window.__RUN = { frames: 0, seen: 0, area: 0, lap: 0, pairs: 0, hit: 0, worst: 0, worstTxt: "" };
  (function tick() {
    const N = window.__RECTS.nums, O = window.__RUN;
    if (N.length) {
      const vis = N.filter(a => a[7] >= 0.35);
      O.frames++; O.seen += vis.length;
      for (const a of vis) O.area += Math.max(0, a[2]) * Math.max(0, a[3]);
      const bad = new Set();
      for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
        const a = vis[i], b = vis[j];
        if (a[6] === b[6]) continue;                        // 같은 빛깔은 V-51 의 몫이다
        const ho = Math.min(a[0]+a[2], b[0]+b[2]) - Math.max(a[0], b[0]);
        const vo = Math.min(a[1]+a[3], b[1]+b[3]) - Math.max(a[1], b[1]);
        if (ho <= 0 || vo <= 0) continue;                   // 안 겹친다
        const lap = ho * vo;
        O.lap += lap; O.pairs++; bad.add(i); bad.add(j);
        const r = lap / Math.max(1, Math.min(a[2]*a[3], b[2]*b[3]));
        if (r > O.worst) { O.worst = r; O.worstTxt = a[4] + "×" + b[4]; }
      }
      O.hit += bad.size;
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
const pct = 100 * O.lap / Math.max(1, O.area), hit = 100 * O.hit / Math.max(1, O.seen);
console.log(`틀 ${O.frames} · 숫자 ${O.seen} · **다른 빛깔에 덮인 넓이 ${pct.toFixed(2)}%** ` +
  `· 덮인 글자 ${hit.toFixed(1)}% · 겹친 짝 ${O.pairs} · 최악 «${O.worstTxt}» ${(100*O.worst).toFixed(0)}%`);
console.log(`마을로 돌아간 초 ${마을초}/${SECS} · 층 ${(await S("Runtime.evaluate", { returnByValue: true, expression: "window.S && S.floor" })).result.value}`);
console.log("콘솔오류", errs.length, errs.slice(0, 2));
if (O.frames < 30) console.log("미달: 숫자가 뜬 틀이 30 밑이다 — 잰 것이 없다");
/* ★ **「전」이 내 양성 씨앗이다** ([[silent-zero-is-not-an-observation]]) — `XLAP=0` 으로
   재는데도 덮인 글자가 5% 를 안 넘으면 자가 눈이 먼 것이다(실측 씨앗 11.2% 대
   고친 판 1.3% · 문턱은 그 사이 [[floor-far-from-threshold]]). */
if (process.env.XLAP === "0" && hit < 5) console.log(`미달: 씨앗(고치기 전)이 ${hit.toFixed(1)}% 뿐이다 — 자가 못 본다`);
await raw("Target.closeTarget", { targetId });
process.exit(0);
