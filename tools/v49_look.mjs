/* 처음 켠 사람이 «창»에서 보는 것을 찍는다 (V-49 고르기용).
     node tools/v49_look.mjs
   새 저장 → 1층 → 70초 굴려 물건이 쌓이게 한 뒤 가방·능력치·편성·운용을 찍는다. */
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
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const shot = async (n) => { const { data } = await S("Page.captureScreenshot", { format: "png" });
  writeFileSync(`tmp/v49_${n}.png`, Buffer.from(data, "base64")); console.log(`tmp/v49_${n}.png`); };
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url: PAGE }); await wait(2500);
await ev(`localStorage.clear()`);
await S("Page.reload", { ignoreCache: true }); await wait(2500);
if (!(await ev(`typeof window.__toDungeon === "function"`))) throw new Error("__toDungeon 없다");
await ev(`window.__toDungeon()`); await wait(70000);
console.log(JSON.stringify(await ev(`({at:(window.MODE||{}).at, f:(window.S||{}).floor, bag:((window.META||{}).bag||[]).length})`)));
for (const w of ["bag", "stat", "tree", "party", "ops"]) {
  await ev(`window.__openWin(${JSON.stringify(w)})`); await wait(500); await shot(w);
  await ev(`window.__openWin(null)`); await wait(250);
}
console.log("콘솔오류", errs.length, errs.slice(0, 3));
await raw("Target.closeTarget", { targetId });
process.exit(0);
