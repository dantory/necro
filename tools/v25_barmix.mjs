/* **체력바가 누구 것인지 읽히는가** (V-25 의 자).
     node tools/v25_barmix.mjs [초]
   V-20·V-23 과 **같은 규칙** — 그리는 자리에서 모은 네모(window.__RECTS)를 그대로 읽는다.
   바가 안 읽히는 길은 둘이다: ① 바끼리 겹쳐 한 막대가 된다 ② 바가 **남의 몸** 위에
   얹혀 그 몸의 것으로 읽힌다(제 몸은 바로 아래 있으므로 절대 안 겹친다).
   네모마다 뒤에 [x, y] 앵커가 붙어 있어 「제 몸」과 「남의 몸」이 갈린다. */
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
if (process.env.BARLIFT) await S("Runtime.evaluate", { expression: `globalThis.__BARLIFT = ${+process.env.BARLIFT}` });
if (process.env.BARSTACK) await S("Runtime.evaluate", { expression: `globalThis.__BARSTACK = ${+process.env.BARSTACK}` });
await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
await wait(1200);
await S("Runtime.evaluate", { expression: `
  window.__RECTS = { bars: [], nums: [], bodies: [], frames: 0 };
  window.__BM = { frames: 0, bars: 0, hitBar: 0, hitBody: 0, quarter: 0, worst: 0, pxBar: 0, pxBody: 0, orphan: 0, halfHid: 0, stranded: 0, ownTouch: 0, ghost: 0 };
  (function tick() {
    const R = window.__RECTS, O = window.__BM;
    if (R.bars.length) {
      O.frames++; O.bars += R.bars.length;
      const ov = (a, b) => { const w = Math.min(a[0]+a[2], b[0]+b[2]) - Math.max(a[0], b[0]);
        const h = Math.min(a[1]+a[3], b[1]+b[3]) - Math.max(a[1], b[1]);
        return (w > 0 && h > 0) ? w * h : 0; };
      for (const a of R.bars) {
        const area = Math.max(1, a[2] * a[3]);
        let pb = 0, pd = 0;
        for (const b of R.bars) { if (b === a) continue; pb += ov(a, b); }
        for (const d of R.bodies) { if (d[4] === a[4] && d[5] === a[5]) continue; pd += ov(a, d); }
        if (pb > 0) O.hitBar++;
        if (pd > 0) O.hitBody++;
        O.pxBar += pb; O.pxBody += pd;
        const f = (pb + pd) / area;
        if (f > 0.25) O.quarter++;
        if (f > O.worst) O.worst = f;
        /* **주인이 보이는가.** 몸 네모는 그린 차례로 쌓인다 — 뒤에 오는 것이 «더 가까운»
           몸이라 앞의 것을 덮는다. 주인의 몸이 거의 다 가려졌으면 그 바는 화면에서
           임자 없는 막대다(사람은 그것을 **덮은 놈의 것**으로 읽는다). */
        let own = 0, oi = -1;
        for (let i = 0; i < R.bodies.length; i++) if (R.bodies[i][4] === a[4] && R.bodies[i][5] === a[5]) { oi = i; own = ov(a, R.bodies[i]); break; }
        if (own > 0) O.ownTouch++; else if (pd > 0) O.stranded++;
        if (oi >= 0) {
          const me = R.bodies[oi], mine = Math.max(1, me[2] * me[3]);
          let hid = 0;
          for (let j = oi + 1; j < R.bodies.length; j++) hid += ov(me, R.bodies[j]);
          const r = hid / mine;
          if (r > 0.5) O.halfHid++;
          if (r > 0.8) O.orphan++;
          /* ★ **임자 없는 막대** — 주인은 8할 넘게 가렸는데 바는 멀쩡히 보이는 것.
             화면에서 사람이 보는 것이 바로 이것이다(막대만 떠 있고 임자가 없다).
             바를 덮는 것도 **더 가까운 몸**(주인보다 뒤에 그려진 것)뿐이다. */
          let bh = 0;
          for (let j = oi + 1; j < R.bodies.length; j++) bh += ov(a, R.bodies[j]);
          if (r > 0.8 && bh / area < 0.3) O.ghost++;
        }
      }
    }
    requestAnimationFrame(tick);
  })();` });
await wait(SECS * 1000);
const O = JSON.parse((await S("Runtime.evaluate", { returnByValue: true, expression: "JSON.stringify(window.__BM)" })).result.value);
const pc = n => (100 * n / Math.max(1, O.bars)).toFixed(1) + "%";
console.log(`틀 ${O.frames} · 바 ${O.bars} (틀당 ${(O.bars/Math.max(1,O.frames)).toFixed(1)})`);
console.log(`  바끼리 겹친 바      ${O.hitBar} (${pc(O.hitBar)}) · 겹친 픽셀 ${O.pxBar}`);
console.log(`  남의 몸을 덮은 바   ${O.hitBody} (${pc(O.hitBody)}) · 덮은 픽셀 ${O.pxBody}`);
console.log(`  제 넓이 1/4 넘게 먹힌 바 ${O.quarter} (${pc(O.quarter)}) · 최악 ${(100*O.worst).toFixed(0)}%`);
console.log(`  제 몸에 닿은 바 ${O.ownTouch} (${pc(O.ownTouch)}) · **제 몸엔 안 닿고 남의 몸에만 얹힌 바 ${O.stranded} (${pc(O.stranded)})**`);
console.log(`  주인이 반 넘게 가려진 바 ${O.halfHid} (${pc(O.halfHid)}) · 주인이 8할 가려진 바 ${O.orphan} (${pc(O.orphan)})`);
console.log(`  ★ 임자 없는 막대(주인은 가렸는데 바는 보임) ${O.ghost} (${pc(O.ghost)})`);
await raw("Target.closeTarget", { targetId });
process.exit(0);
