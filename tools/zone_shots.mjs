/* 구역을 하나씩 **켜서 본다** — 자가 「갈린다」고 해도 화면이 갈렸는지는 눈이 봐야 안다.
   (ROADMAP G-b · [[play-it-before-measuring-it]])
     node tools/zone_shots.mjs [tmp/zones]     → tmp/zones_f<층>.png 넉 장 + 합성 시트 */
const OUT = process.argv[2] || "tmp/zones";
/* ★ V-5 로 바닥 그림이 **일곱 구역 다 달라졌다** — 그러니 넷만 보면 모자란다.
   구역이 처음 열리는 층을 전부 찍는다(둘째 인자로 바꿀 수 있다). */
const FLOORS = (process.argv[3] || "1,4,9,16,26,40,60").split(",").map(Number);
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
const ev2 = async (e, aw = false) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: aw })).result?.value;
await S("Runtime.evaluate", { expression: `localStorage.setItem("necro.meta.v1",JSON.stringify({gold:9000,lv:20,deepest:60,runs:3,up:{hp:3,mp:4,dmg:2,army:3},equip:{},bag:[],tree:{bone:2,armor:3,ghoul:1,legion:3}}))` });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4800));
await ev2(`window.__toDungeon && window.__toDungeon()`);
await new Promise(r => setTimeout(r, 900));
const fs = await import("node:fs");
for (const f of FLOORS) {
  await ev2(`(async()=>{const B=await import("/js/battle.js");B.enterFloor(${f});return 1;})()`, true);
  await new Promise(r => setTimeout(r, 2200));
  const z = await ev2(`document.getElementById("hZone").textContent`);
  const { data } = await S("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(`${OUT}_f${f}.png`, Buffer.from(data, "base64"));
  console.log(`${f}층 · ${z} → ${OUT}_f${f}.png`);
}
await S("Target.closeTarget", { targetId });
process.exit(0);
