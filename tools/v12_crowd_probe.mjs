/* **싸움이 화면에서 얼마나 넓게 벌어지나** (V-12 · 2026-08-24)
     node tools/v12_crowd_probe.mjs [초]
   40초 판을 돌며 매 초 ① 몸(적+아군)의 화면 바운딩박스 ② 그것이 보이는 무대(mapW×freeH)에서
   차지하는 넓이 몫 ③ 몸 하나의 화면 키 ④ 서로 겹치는 정도를 잰다.
   목적: 「가운데 손톱만 한 덩어리 + 텅 빈 바닥」이 눈이 아니라 수로도 그런지. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const SECS = +(process.argv[2] || 40);
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await S("Page.enable"); await S("Runtime.enable"); await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.addScriptToEvaluateOnNewDocument", { source:
  `Math.random = (() => { let s = 3; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();` });
await S("Page.navigate", { url: PAGE }); await wait(1500);
await ev(`localStorage.removeItem("necro.meta.v1")`);
await S("Page.reload", { ignoreCache: true });
for (let i = 0; i < 120; i++) { if (await ev(`!!(window.__geo && window.__toDungeon)`)) break; await wait(200); }
await wait(2500);
await ev(`window.__toDungeon && window.__toDungeon()`);
await wait(1500);
const rows = [];
for (let t = 0; t < SECS; t++) {
  const r = await ev(`(() => { const G = window.__geo, S = window.__S; if (!G || !S) return null;
    const px = x => G.cx + x * G.sc, py = y => G.cy + y * G.sc * G.squash;
    const bodies = [];
    for (const u of S.minions) bodies.push({ x: px(u.x), y: py(u.y), h: (u.h || 40) * G.us });
    for (const m of S.mobs) if (!(m.born > 0)) bodies.push({ x: px(m.x), y: py(m.y), h: (m.h || 48) * G.us });
    if (!bodies.length) return { n: 0 };
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, hs = 0;
    for (const b of bodies) { x0 = Math.min(x0, b.x - b.h * 0.3); x1 = Math.max(x1, b.x + b.h * 0.3);
      y0 = Math.min(y0, b.y - b.h); y1 = Math.max(y1, b.y); hs += b.h; }
    return { n: bodies.length, floor: S.floor|0, nmob: S.mobs.length, nmin: S.minions.length, bw: x1 - x0, bh: y1 - y0, mh: hs / bodies.length,
      mapW: G.mapW, freeH: G.freeH, sc: G.sc, us: G.us, squash: G.squash }; })()`);
  if (r && r.n) rows.push(r);
  await wait(1000);
}
const avg = (k) => +(rows.reduce((a, r) => a + r[k], 0) / rows.length).toFixed(1);
const g = rows[rows.length - 1];
const share = rows.map(r => (r.bw * r.bh) / (r.mapW * r.freeH));
console.log(JSON.stringify({
  표본: rows.length, 무대: `${g.mapW}x${g.freeH}`, 배율: +g.sc.toFixed(2), us: +g.us.toFixed(2), 눌림: +g.squash.toFixed(2),
  층: g.floor, 적: avg("nmob"), 아군: avg("nmin"), 몸수: avg("n"), 몸키평균: avg("mh"), 덩어리: `${avg("bw")}x${avg("bh")}`,
  넓이몫: +(share.reduce((a, b) => a + b, 0) / share.length * 100).toFixed(1) + "%",
  최대몫: +(Math.max(...share) * 100).toFixed(1) + "%",
  가로몫: +(avg("bw") / g.mapW * 100).toFixed(1) + "%", 세로몫: +(avg("bh") / g.freeH * 100).toFixed(1) + "%",
  콘솔오류: errs.length }));
await raw("Target.closeTarget", { targetId });
bws.close();
