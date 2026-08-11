/* 진이 꽉 찼을 때를 **눈으로** 본다 — 비율만으로는 「겹친다」를 못 가른다.
   군세를 채운 뒤 적을 지우고 한 박자 두어 전원이 제 자리에 서게 한 다음 찍는다.
     node tools/pack_shot.mjs [out.png] [초] */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const OUT = process.argv[2] || "/tmp/pack.png", SEC = +(process.argv[3] || 90);
const fs = await import("node:fs");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
function raw(method, params = {}, sessionId) {
  const mid = ++id; bws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  return new Promise((res, rej) => pend.set(mid, { res, rej }));
}
bws.addEventListener("message", ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id);
    return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
});
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 2, mobile: true });
await S("Page.navigate", { url: PAGE });
await new Promise(r => setTimeout(r, 2500));
await S("Runtime.evaluate", { awaitPromise: true, expression:
  `new Promise(r => { const w = () => (window.LOAD && window.LOAD.done) ? r(1) : setTimeout(w, 200); w(); })` });
const r = await S("Runtime.evaluate", { returnByValue: true, expression: `(()=>{
  window.__toDungeon();
  for (let i = 0; i < ${SEC} * 60; i++) { window.step(1/60); if (i % 21 === 0) window.auto(); }
  const n = window.S.minions.length;
  /* 적을 지우고 잠깐 더 굴려 **전원이 제 자리로** 돌아가게 한다 — 진의 모양을 본다 */
  window.S.mobs.length = 0; window.S.bolts.length = 0;
  for (let i = 0; i < 240; i++) window.step(1/60);
  return JSON.stringify({ n, still: window.S.minions.length });
})()` });
console.log(r.result.value);
await new Promise(r => setTimeout(r, 700));
const s = await S("Page.captureScreenshot", { format: "png" });
fs.writeFileSync(OUT, Buffer.from(s.data, "base64"));
console.log("wrote", OUT);
await raw("Target.closeTarget", { targetId }); bws.close();
