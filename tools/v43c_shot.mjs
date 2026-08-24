/* **층을 넘어도 지고 온 시체가 바닥에 남는가** (V-43c) — 켜서 찍는다.
     node tools/v43c_shot.mjs
   V-43b 로 판 첫머리는 맞췄는데, `enterFloor` 가 앞 층 그림에 fade 를 걸면서 개수는
   안 건드리는 탓에 **층을 내려갈 때마다 다시** 갈렸다(셈 138 대 그림 23).
   잠기는 연출은 두고 **다 잠긴 뒤에** 다시 눕히도록 고쳤다 — 그 전후를 같은 자로 잰다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const wait = ms => new Promise(r => setTimeout(r, ms));
const { writeFileSync } = await import("node:fs");
const ev = async (expression) => (await S("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;
const shot = async name => { const { data } = await S("Page.captureScreenshot", { format: "png" });
  writeFileSync(`tmp/v43c_${name}.png`, Buffer.from(data, "base64")); console.log(`tmp/v43c_${name}.png`); };
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url: PAGE }); await wait(3500);
/* 다섯 시간 논 사람 — 창고가 한 짐(140) 꽉 찬 상태로 내려간다 */
await ev(`(async()=>{ const C = await import("/js/core.js"); const M = C.META;
  M.lv = 26; M.gold = 5000; M.deepest = 34; M.corpses = 0; C.saveMeta();
  const r = JSON.parse(localStorage.getItem("necro.meta.v1"));
  r.lastSeen = Date.now() - 5*3600*1000;
  localStorage.setItem("necro.meta.v1", JSON.stringify(r)); return 1; })()`);
await S("Page.reload", { ignoreCache: true }); await wait(3500);
await ev(`window.__closeAll && window.__closeAll()`); await wait(200);
await ev(`window.__toDungeon()`); await wait(1200);
const before = await ev(`JSON.stringify({ 층: window.__S.floor, 셈: window.__S.corpses, 그림: window.__S.piles.length })`);
console.log("내려가기 전 " + before);
/* ★ 손으로 다음 층에 내려선다 — 판을 비울 때까지 기다리면 시체가 소환에 다 쓰인다 */
await ev(`(async()=>{ const B = await import("/js/battle.js"); B.enterFloor(window.__S.floor + 1); return 1; })()`);
await wait(300);
const mid = await ev(`JSON.stringify({ 층: window.__S.floor, 셈: window.__S.corpses, 그림: window.__S.piles.length })`);
console.log("넘긴 직후(잠기는 중) " + mid);
await wait(1800);
const after = await ev(`(async()=>{ const B = await import("/js/battle.js"); const S = window.__S;
  return JSON.stringify({ 층: S.floor, 셈: S.corpses, 그림: S.piles.length,
    HUD: document.getElementById("gCorpse").textContent,
    발밑: S.piles.filter(p=>Math.hypot(p.x,p.y) < B.CORE_R*1.7).length,
    판밖: S.piles.filter(p=>Math.hypot(p.x,p.y) > B.RING_SPAWN*1.1).length }); })()`);
console.log("다 잠긴 뒤 " + after);
await shot("1_floor2");
console.log("콘솔오류 " + errs.length + (errs.length ? " · " + errs[0] : ""));
await raw("Target.closeTarget", { targetId });
process.exit(0);
