/* 아무 요소나 **그 자리에서 잘라 찍는다** — 「읽히는지」를 눈으로 볼 때 쓴다.
   tools/log_shot.mjs 를 로그 전용으로 짰다가 같은 것을 시체·군세 줄에도 재야 해서
   선택자를 받게 풀었다(고침은 전부에 — 다음 줄에도 그대로 쓴다).
     node tools/el_shot.mjs '#log' <out.png> [초=9] [pad=6]
   찍은 뒤 밝기 통계는 tools/read_metric.py 가 낸다. */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const SEL = process.argv[2] || "#log";
const OUT = process.argv[3] || "/tmp/el.png";
const SEC = +(process.argv[4] || 9), PAD = +(process.argv[5] || 6);
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
await S("Runtime.evaluate", { expression: `window.__toDungeon(); true` });
await new Promise(r => setTimeout(r, SEC * 1000));
const info = (await S("Runtime.evaluate", { returnByValue: true, expression: `(()=>{
  const el = document.querySelector(${JSON.stringify(SEL)});
  if (!el) return { missing: true };
  const b = el.getBoundingClientRect();
  return { rect:{x:b.left,y:b.top,w:b.width,h:b.height}, text: el.textContent.trim() };
})()` })).result.value;
if (info.missing) { console.error("no such element: " + SEL); process.exit(2); }
const r = info.rect;
const shot = await S("Page.captureScreenshot", { format: "png",
  clip: { x: Math.round(r.x) - PAD, y: Math.round(r.y) - PAD,
          width: Math.round(r.w) + PAD * 2, height: Math.round(r.h) + PAD * 2, scale: 2 } });
fs.writeFileSync(OUT, Buffer.from(shot.data, "base64"));
console.log(JSON.stringify({ out: OUT, sel: SEL, ...info }, null, 2));
await raw("Target.closeTarget", { targetId });
bws.close();
process.exit(0);
