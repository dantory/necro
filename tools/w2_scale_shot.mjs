/* **W-2 — 배율 후보를 나란히 찍는다** (2026-08-24)
     node tools/w2_scale_shot.mjs 1.05 1.5 1.72 2.0
   같은 씨앗·같은 길(새 저장 → 1층 → 15초)로 배율만 갈아 끼워 찍는다.
   숫자를 재는 것이 아니라 **어느 것이 읽히는지 눈으로 고르는** 것이 목적이다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const vals = process.argv.slice(2).map(Number);
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const { writeFileSync } = await import("node:fs");
for (const v of vals) {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
  await S("Network.setCacheDisabled", { cacheDisabled: true });
  await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
  await S("Page.addScriptToEvaluateOnNewDocument", { source:
    `globalThis.__SC_MAX = ${v};
     Math.random = (() => { let s = 3; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();` });
  await S("Page.navigate", { url: PAGE }); await wait(1500);
  await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
  await S("Page.reload", { ignoreCache: true }); await wait(4200);
  await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
  await wait(15000);
  const { data } = await S("Page.captureScreenshot", { format: "png" });
  const f = `tmp/w2_sc${String(v).replace(".", "_")}.png`;
  writeFileSync(f, Buffer.from(data, "base64"));
  const geo = (await S("Runtime.evaluate", { returnByValue: true, expression:
    `JSON.stringify({sc:+window.__geo.sc.toFixed(2), us:+window.__geo.us.toFixed(2),
      ringW:Math.round(window.__geo.ringW), 적:window.__S.mobs.length, 군세:window.__S.minions.length})` })).result.value;
  console.log(f, geo);
  await raw("Target.closeTarget", { targetId });
}
bws.close(); process.exit(0);
