/* 화면에 **실제로 놓인 소품**을 이름별로 센다 — 눈이 「같은 것만 되풀이된다」고
   말할 때 그것이 «뽑기가 쏠린 것»인지 «그림이 모자란 것»인지 가른다.
   자는 `__scatterCount`(ground.js drawScatter 안)가 이미 있다 — 켜고 **다시 굽게**
   해서 그 한 프레임의 기록을 읽는다(바닥은 캐시라 평소엔 안 다시 그린다).
   node tools/v48_props.mjs   */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
const metrics = (w) => S("Emulation.setDeviceMetricsOverride", { width: w, height: 863, deviceScaleFactor: 2, mobile: false });
await metrics(1512);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(1800);
if (!(await ev(`typeof window.__toDungeon === "function"`))) throw new Error("__toDungeon 이 없다");
await ev(`window.__toDungeon()`); await wait(4000);

/* 한 층의 화면을 **다시 굽게** 하고 그 프레임에 놓인 것을 받아 온다.
   너비를 1px 흔들면 바닥 캐시 열쇠가 바뀐다(groundCacheKey 에 w 가 들어간다). */
let flip = 0;
async function sample(tag) {
  await ev(`globalThis.__scatterCount = 1; globalThis.__scatterHits = []`);
  await metrics(1512 + (++flip % 2)); await wait(700);
  const hits = await ev(`JSON.stringify(globalThis.__scatterHits||[])`);
  await ev(`globalThis.__scatterCount = 0`);
  /* 놓인 자리와 **같은 프레임의 그림**을 함께 남긴다 — 자(v48_same.py)가 그 자리를
     오려 서로 대 본다. 판을 세워 두어야 몹이 소품을 가려도 두 장이 어긋나지 않는다. */
  if (tag) {
    await ev(`window.__S && (window.__S.speed = 0)`); await wait(250);
    const sh = await S("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(`tmp/v48_${tag}.png`, Buffer.from(sh.data, "base64"));
    fs.writeFileSync(`tmp/v48_${tag}.json`, hits || "[]");
    await ev(`window.__S && (window.__S.speed = 1)`);
  }
  /* **실루엣**으로 센다 — 눈이 가르는 단위는 이름이 아니라 「이름 + 누운 각」이다
     (밝기·크기 흔들기는 자로 대면 같은 조각이다 · tools/v48_same.py). */
  return JSON.parse(hits || "[]").map(h => h[2] + (h[4] ? `@${h[4]}` : ""));
}
const rows = [];
for (const want of [2, 8, 14, 20]) {
  // 그 층에 닿을 때까지 굴린다(못 닿으면 있는 층에서 잰다)
  for (let i = 0; i < 40; i++) {
    const st = await ev(`(()=>({f:(window.S||{}).floor, at:(window.MODE||{}).at, dead:!!(window.S&&S.dead)}))()`);
    if (st && (st.at !== "dungeon" || st.dead)) await ev(`window.__toDungeon()`);
    if (st && st.f >= want) break;
    await wait(1000);
  }
  const f = await ev(`(window.S||{}).floor`);
  const names = await sample(`f${want}`);
  const hist = {}; for (const n of names) hist[n] = (hist[n] || 0) + 1;
  rows.push({ floor: f, total: names.length, hist });
}
const loaded = await ev(`JSON.stringify(Object.keys(window.__decorDump ? window.__decorDump() : {}))`);
console.log("에셋 이름", loaded);
for (const r of rows) {
  const es = Object.entries(r.hist).sort((a, b) => b[1] - a[1]);
  const top = es[0] ? `${es[0][0]} ${(es[0][1] / r.total * 100).toFixed(1)}%` : "-";
  console.log(`${r.floor}층 · 놓인 것 ${r.total} · 실루엣 가짓수 ${es.length} · 제일 많은 것 ${top}`);
  console.log("   ", es.map(([k, v]) => `${k}:${v}`).join(" "));
}
console.log("errs", errs);
process.exit(0);
