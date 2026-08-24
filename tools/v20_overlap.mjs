/* **떠오르는 숫자가 체력바를 덮는가** (V-20 의 자).
     node tools/v20_overlap.mjs [초]
   그리는 자리에서 모은 네모(window.__RECTS)를 그대로 읽어, 한 틀 안에서
   숫자 네모와 바 네모가 겹치는 개수·픽셀을 센다. 식을 밖에서 다시 쓰지 않는다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const SECS = Number(process.argv[2] || 45);
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
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.addScriptToEvaluateOnNewDocument", { source:
  `Math.random = (() => { let s = 3; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();` });
await S("Page.navigate", { url: PAGE }); await wait(1500);
await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
await S("Page.reload", { ignoreCache: true }); await wait(4500);
await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
await wait(1200);
/* 틀마다 겹침을 세는 감시자를 페이지 안에 심는다 — 밖에서 폴링하면 틀을 건너뛴다 */
await S("Runtime.evaluate", { expression: `
  window.__RECTS = { bars: [], nums: [], frames: 0 };
  window.__OV = { frames: 0, numsSeen: 0, hitNums: 0, px: 0 };
  (function tick() {
    const R = window.__RECTS, O = window.__OV;
    if (R.nums.length || R.bars.length) {
      O.frames++; O.numsSeen += R.nums.length;
      for (const n of R.nums) { let p = 0;
        for (const b of R.bars) {
          const w = Math.min(n[0]+n[2], b[0]+b[2]) - Math.max(n[0], b[0]);
          const h = Math.min(n[1]+n[3], b[1]+b[3]) - Math.max(n[1], b[1]);
          if (w > 0 && h > 0) p += w * h; }
        if (p > 0) { O.hitNums++; O.px += p; } }
    }
    requestAnimationFrame(tick);
  })();` });
await wait(SECS * 1000);
const out = (await S("Runtime.evaluate", { returnByValue: true, expression: "JSON.stringify(window.__OV)" })).result.value;
const O = JSON.parse(out);
console.log(`틀 ${O.frames} · 숫자 ${O.numsSeen} · **바를 덮은 숫자 ${O.hitNums}** (${(100*O.hitNums/Math.max(1,O.numsSeen)).toFixed(1)}%) · 겹친 픽셀 ${O.px}`);
await raw("Target.closeTarget", { targetId });
