/* 로그가 **읽히는지**를 눈과 수로 같이 본다.
   판(돌 무늬) 위에 글자만 얹혀 있으면 바탕이 요동쳐서 글자가 묻힌다.
   그래서 로그 칸을 잘라 찍고, 같은 칸의 **바탕 요동(표준편차)** 과
   **글자·바탕 밝기차** 를 같이 남긴다 — 「옅어 보인다」를 수로 가른다.
     node tools/log_shot.mjs <out.png> [초=9] */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const OUT = process.argv[2] || "/tmp/log.png", SEC = +(process.argv[3] || 9);
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
  const el = document.getElementById('log'), b = el.getBoundingClientRect();
  return { rect:{x:b.left,y:b.top,w:b.width,h:b.height},
           lines:[...el.children].map(c=>c.textContent), text:el.textContent.length };
})()` })).result.value;
const r = info.rect;
const shot = await S("Page.captureScreenshot", { format: "png",
  clip: { x: Math.round(r.x) - 4, y: Math.round(r.y) - 6, width: Math.round(r.w) + 8, height: Math.round(r.h) + 12, scale: 2 } });
fs.writeFileSync(OUT, Buffer.from(shot.data, "base64"));
console.log(JSON.stringify({ out: OUT, ...info }, null, 2));
await raw("Target.closeTarget", { targetId });
bws.close();
process.exit(0);
