/* **V-25 를 눈으로 견준다** — 같은 판·거의 같은 순간을 옛 규칙과 새 규칙으로 한 장씩 찍는다.
     node tools/v25_sheet.mjs [초]
   판을 멈출 수가 없으므로 **손잡이만 바꿔 바로 다음 틀을 찍는다**(두 장 사이 100ms 남짓).
   나오는 것: tmp/v25_before.png · tmp/v25_after.png */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const SECS = Number(process.argv[2] || 40);
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
const wait = ms => new Promise(r => setTimeout(r, ms));
const { writeFileSync } = await import("node:fs");
const shot = async n => { const { data } = await S("Page.captureScreenshot", { format: "png" });
  writeFileSync(`tmp/v25_${n}.png`, Buffer.from(data, "base64")); console.log(`tmp/v25_${n}.png`); };
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.addScriptToEvaluateOnNewDocument", { source:
  `Math.random = (() => { let s = 3; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();` });
await S("Page.navigate", { url: PAGE }); await wait(1500);
await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
await S("Page.reload", { ignoreCache: true }); await wait(4500);
await S("Runtime.evaluate", { expression: `globalThis.__BARLIFT = 6; globalThis.__BARSTACK = 0;` });   // 옛 규칙
await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
await wait(SECS * 1000);
/* **판을 세운다** — 못박은 dt(D-59 의 창구)를 아주 작게 주면 세상은 안 흐르고 그리기만 돈다.
   그래야 두 장이 «같은 자리»가 된다(안 그러면 찍는 사이에 다 흩어진다). */
await S("Runtime.evaluate", { expression: `globalThis.__FIXEDDT = 1e-7` });
await wait(400);
await shot("before");
await S("Runtime.evaluate", { expression: `globalThis.__BARLIFT = 1; globalThis.__BARSTACK = 1;` });   // 새 규칙
await wait(400);
await shot("after");
await S("Runtime.evaluate", { expression: `globalThis.__FIXEDDT = 0` });
console.log(`콘솔오류 ${errs.length}`);
await raw("Target.closeTarget", { targetId });
process.exit(0);
