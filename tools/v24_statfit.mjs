/* 능력치 창이 «몇 줄이나 보이는가» (2026-08-24 V-24)
     node tools/v24_statfit.mjs
   가방을 열어 도킹 상태로 만든 뒤, #statBody 의 보이는 틀 안에 능력치 줄이
   몇 개나 온전히 들어오는지 센다. 그리는 자리에서 잰다(getBoundingClientRect). */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
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
const wait = (ms) => new Promise(r => setTimeout(r, ms));
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
await wait(Number(process.env.V24_SEC || 90) * 1000);
await ev(`window.__openWin("bag")`); await wait(800);
const r = await ev(`(() => {
  const body = document.getElementById("statBody"); const bb = body.getBoundingClientRect();
  const rows = [...body.querySelectorAll(".sStat:not(.jList) .tipStat")];
  const vis = rows.filter(e => { const b = e.getBoundingClientRect(); return b.top >= bb.top - 0.5 && b.bottom <= bb.bottom + 0.5; });
  const doll = body.querySelector(".pdoll"); const db = doll ? doll.getBoundingClientRect() : null;
  const sl = body.querySelector(".sStat:not(.jList)"); const sb = sl ? sl.getBoundingClientRect() : null;
  const seen = sb ? Math.max(0, Math.min(bb.bottom, sb.bottom) - Math.max(bb.top, sb.top)) : 0;
  return { 줄수: rows.length, 온전히보임: vis.length,
    틀높이: Math.round(bb.height), 속높이: Math.round(body.scrollHeight),
    인물높이: db ? Math.round(db.height) : 0, 수치판높이: sb ? Math.round(sb.height) : 0,
    수치판보인몫: sb ? +(seen / sb.height * 100).toFixed(1) : 0,
    인물이먹은몫: db ? +(db.height / bb.height * 100).toFixed(1) : 0,
    굴려야하는몫: +((body.scrollHeight - bb.height) / body.scrollHeight * 100).toFixed(1) };
})()`);
console.log(JSON.stringify(r, null, 1));
const { data } = await S("Page.captureScreenshot", { format: "png" });
(await import("node:fs")).writeFileSync(`tmp/${process.env.V24_OUT || "v24_statfit"}.png`, Buffer.from(data, "base64"));
console.log(`tmp/${process.env.V24_OUT || "v24_statfit"}.png`);
await raw("Target.closeTarget", { targetId });
process.exit(0);
