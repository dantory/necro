/* 켜서 «창»을 본다 — 가방·특성·능력치·교리 (2026-08-24 V-24 탐색)
     node tools/v24_wins.mjs [초]
   새 저장으로 시작해 던전에서 N초 놀고, 사람이 여는 창 넷을 그대로 찍는다. */
const SEC = Number(process.argv[2] || 150);
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const { writeFileSync } = await import("node:fs");
const shot = async (name) => { const { data } = await S("Page.captureScreenshot", { format: "png" });
  writeFileSync(`tmp/v24_${name}.png`, Buffer.from(data, "base64")); console.log(`tmp/v24_${name}.png`); };
const ev = async (expr) => (await S("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.addScriptToEvaluateOnNewDocument", { source:
  `Math.random = (() => { let s = 7; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();` });
await S("Page.navigate", { url: PAGE }); await wait(1500);
await ev(`localStorage.removeItem("necro.meta.v1")`);
await S("Page.reload", { ignoreCache: true }); await wait(4500);
await ev("window.__toDungeon && window.__toDungeon()");
await wait(SEC * 1000);
console.log(await ev(`(async()=>{ const C = await import("/js/core.js"); const St = window.__S;
  return JSON.stringify({ 층:St.floor, 가방:C.META.bag.length, 레벨:C.META.lv, 금:C.META.gold, 스킬점수:C.META.sp }); })()`));
for (const w of ["bag", "stat", "tree"]) {
  await ev(`window.__closeAll && window.__closeAll()`); await wait(200);
  await ev(`window.__openWin(${JSON.stringify(w)})`); await wait(700); await shot(w);
}
await ev(`window.__closeAll && window.__closeAll()`);
console.log(`콘솔오류 ${errs.length}`, errs.slice(0, 3).join(" | "));
await raw("Target.closeTarget", { targetId });
process.exit(0);
