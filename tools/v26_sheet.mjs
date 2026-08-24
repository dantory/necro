/* **가장 많이 떴을 때**를 두 팔에서 한 장씩 찍는다 (V-26 의 그림).
     node tools/v26_sheet.mjs            고친 뒤
     BLOW=0 node tools/v26_sheet.mjs     고치기 전(__NOBLOW)
   숫자가 화면에 제일 많이 떠 있는 틀을 노려, 그 순간 **세상을 멈추고**(D-59 의 못박은 dt)
   찍는다 — 안 그러면 찍는 사이에 다 사그라들어 빈 판이 나온다.
   두 팔은 dt 가 벽시계라 같은 판이 아니다([[same-seed-is-not-same-run]]) — 견주는 것은
   「한 방이 몇 글자로 말하는가」이지 같은 순간이 아니다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const OUT = process.argv[2] || (process.env.BLOW === "0" ? "tmp/v26_before.png" : "tmp/v26_after.png");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async (x) => (await S("Runtime.evaluate", { expression: x, returnByValue: true })).result.value;
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.addScriptToEvaluateOnNewDocument", { source:
  `Math.random = (() => { let s = ${Number(process.env.SEED || 3)}; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();` });
await S("Page.navigate", { url: PAGE }); await wait(1800);
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(3000);
if (process.env.BLOW === "0") await ev(`globalThis.__NOBLOW = 1`);
await ev(`window.__toDungeon && window.__toDungeon()`); await wait(1500);
await ev(`window.__RECTS = { bars: [], nums: [], bodies: [], frames: 0 };`);
let best = -1;
for (let i = 0; i < 220; i++) {                     // 넉넉히 45초쯤 지켜본다
  await wait(200);
  const n = await ev(`(window.__RECTS && window.__RECTS.nums.length) | 0`);
  if (n > best) best = n;
  const fl = await ev(`(window.__S && window.__S.floor) | 0`);
  if (fl >= (process.env.MINF ? +process.env.MINF : 12) && n >= (process.env.MINN ? +process.env.MINN : 8)) {
    await ev(`globalThis.__FIXEDDT = 1e-7`);        // 세상을 멈춘다 — 그리기만 돈다
    await wait(120);
    const { data } = await S("Page.captureScreenshot", { format: "png" });
    (await import("node:fs")).writeFileSync(OUT, Buffer.from(data, "base64"));
    console.log(JSON.stringify({ 찍음: OUT, 그때_뜬_숫자: n, 층: fl }));
    process.exit(0);
  }
}
console.log(JSON.stringify({ 못찍음: true, 가장많았을때: best }));
process.exit(1);
