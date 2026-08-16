/* 빛 캐시가 **그림을 안 바꾸고 실제로 싼가**를 잰다(2026-08-15 「렉걸림」).
   구운 길(drawGlows)과 옛 길(drawGlowsSlow)로 마을을 각각 찍어 픽셀을 견주고,
   같은 빛 묶음을 200프레임 그리는 데 걸린 시간을 잰다.
   node tools/glow_probe.mjs */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 200)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => { const r = await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "eval failed"); return r.result?.value; };
await S("Page.reload", { ignoreCache: true }); await wait(3000);

/* 마을은 첫 화면이다. 빛(모닥불·대장간·문) 셋이 여기서 뜬다. */
const out = await ev(`(async () => {
  const G = await import("./js/ground.js");
  const cv = document.createElement("canvas"); cv.width = 828; cv.height = 1720;
  const c = cv.getContext("2d");
  const puts = [[400, 900, 206, 1.15], [200, 700, 157, 1.0], [620, 1100, 88, 0.7]];
  const draw = (fn) => { c.clearRect(0, 0, cv.width, cv.height);
    for (const p of puts) G.addGlow(p[0], p[1], p[2], p[3]); fn(c, 0.86); };
  draw(G.drawGlows);      const a = c.getImageData(0, 0, cv.width, cv.height).data;
  draw(G.drawGlowsSlow);  const b = c.getImageData(0, 0, cv.width, cv.height).data;
  let diff = 0, maxd = 0, lit = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i+3] || b[i+3]) lit++;
    for (let k = 0; k < 4; k++) { const d = Math.abs(a[i+k] - b[i+k]); if (d > 8) { diff++; break; } if (d > maxd) maxd = d; }
  }
  const bench = (fn) => { const t0 = performance.now();
    for (let n = 0; n < 200; n++) { for (const p of puts) G.addGlow(p[0], p[1], p[2], p[3]); fn(c, 0.86); }
    return +(performance.now() - t0).toFixed(1); };
  bench(G.drawGlows);                       // 캐시 데우기
  return { litPx: lit, diffPx: diff, maxChan: maxd,
           fastMs: bench(G.drawGlows), slowMs: bench(G.drawGlowsSlow) };
})()`);
out.diffFrac = +(out.diffPx / Math.max(1, out.litPx)).toFixed(4);
out.speedup = +(out.slowMs / Math.max(0.01, out.fastMs)).toFixed(1);
out.errors = errs;
console.log(JSON.stringify(out, null, 2));
const bad = errs.length || out.diffFrac > 0.02 || out.fastMs >= out.slowMs;
console.log(bad ? "FAIL" : "PASS");
await raw("Target.closeTarget", { targetId });
bws.close(); process.exit(bad ? 1 : 0);
