/* **W-3 — 마을 마당을 여러 창 크기에서 찍는다** (2026-08-24)
     node tools/w3_yard_shot.mjs            (기본 네 창)
     node tools/w3_yard_shot.mjs 1512x863
   마당(js/town.js YARD)은 **비율로 놓는데 조각은 화면 크기 그대로 그려진다**(ART.s).
   그래서 좁은 창에서는 자리만 좁아지고 물건은 그대로라 캐릭터를 덮는다 —
   항목마다 준 「창 폭 문턱」이 실제로 듣는지는 **켜서 봐야** 안다
   ([[play-it-before-measuring-it]]). 숫자가 아니라 그림을 모으는 자다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const sizes = (process.argv.slice(2).length ? process.argv.slice(2)
  : ["1512x863", "1920x1080", "1512x760", "414x896"]).map(s => s.split("x").map(Number));
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { writeFileSync } = await import("node:fs");
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
/* 씨앗을 박는다 — 바닥 소품이 창마다 달라지면 마당이 달라진 것인지 알 수 없다. */
await S("Page.addScriptToEvaluateOnNewDocument", { source:
  `Math.random = (() => { let s = 3; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();` });
for (const [w, h] of sizes) {
  await S("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await S("Page.navigate", { url: PAGE }); await wait(1200);
  await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
  await S("Page.reload", { ignoreCache: true }); await wait(4200);   // 마을에 설 때까지
  const { data } = await S("Page.captureScreenshot", { format: "png" });
  const out = `tmp/w3_yard_${w}x${h}.png`;
  writeFileSync(out, Buffer.from(data, "base64")); console.log(out);
}
console.log(`콘솔오류 ${errs.length}`);
await raw("Target.closeTarget", { targetId });
/* ★ 소켓이 안 닫혀 스크립트가 안 끝났다(4분 상한에 잘렸다) — 찍는 일은 다 끝났으니 여기서 나간다. */
process.exit(0);
