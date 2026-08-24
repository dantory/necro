/* **떠오르는 숫자끼리 서로 겹치는가** (V-23 의 자).
     node tools/v23_numgap.mjs [초]
   V-20 이 「숫자 × 체력바」를 쟀다면 이건 「숫자 × 숫자」다. 한 몸을 여럿이 때리면
   같은 자리에 같은 높이로 떠서 **두 글자가 겹쳐 한 덩어리**가 된다(첫 판 15초 그림의
   「6」 두 개). 자는 V-20 과 같은 규칙 — **그리는 자리에서 모은 네모**(window.__RECTS)를
   그대로 읽는다. 밖에서 식을 다시 쓰면 판정이 그림과 갈린다. */
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
await S("Runtime.evaluate", { expression: `
  window.__RECTS = { bars: [], nums: [], frames: 0 };
  window.__NG = { frames: 0, numsSeen: 0, hitNums: 0, px: 0, worst: 0, bad: 0 };
  (function tick() {
    const R = window.__RECTS, O = window.__NG;
    if (R.nums.length) {
      O.frames++; O.numsSeen += R.nums.length;
      for (let i = 0; i < R.nums.length; i++) { const a = R.nums[i]; let p = 0;
        for (let j = 0; j < R.nums.length; j++) { if (i === j) continue; const b = R.nums[j];
          const w = Math.min(a[0]+a[2], b[0]+b[2]) - Math.max(a[0], b[0]);
          const h = Math.min(a[1]+a[3], b[1]+b[3]) - Math.max(a[1], b[1]);
          if (w > 0 && h > 0) p += w * h; }
        if (p > 0) { O.hitNums++; O.px += p;
          const frac = p / (a[2] * a[3]);
          if (frac > O.worst) O.worst = frac;
          if (frac > 0.25) O.bad++; } }   // 제 넓이의 1/4 이상 먹히면 «못 읽는다»
    }
    requestAnimationFrame(tick);
  })();` });
await wait(SECS * 1000);
const O = JSON.parse((await S("Runtime.evaluate", { returnByValue: true, expression: "JSON.stringify(window.__NG)" })).result.value);
const pc = (n) => (100 * n / Math.max(1, O.numsSeen)).toFixed(1) + "%";
console.log(`틀 ${O.frames} · 숫자 ${O.numsSeen}`);
console.log(`  서로 겹친 숫자 ${O.hitNums} (${pc(O.hitNums)}) · **1/4 넘게 먹힌 것 ${O.bad} (${pc(O.bad)})**`);
console.log(`  겹친 픽셀 ${O.px} · 최악 한 글자 ${(100*O.worst).toFixed(0)}% 가 먹혔다`);
await raw("Target.closeTarget", { targetId });
process.exit(0);
