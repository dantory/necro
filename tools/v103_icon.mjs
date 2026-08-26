/* V-103 자 — 스킬 트리 첫 칸의 그림이 정말 «깨진 것»인지 묻는다. */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await S("Page.reload", { ignoreCache: true }); await wait(1800);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);
await ev(`window.__openWin("tree")`); await wait(700);
console.log(JSON.stringify(await ev(`(()=>{
  const out=[]; document.querySelectorAll("#winTree .tNode, #winTree [data-sk], #winTree .skIcon").forEach(e=>{
    const img=e.tagName==="IMG"?e:e.querySelector("img");
    const cs=getComputedStyle(e);
    out.push({ sk:e.dataset?.sk||"", tag:e.tagName, cls:(e.className||"").toString().slice(0,40),
      img: img? {src:(img.getAttribute("src")||"").slice(-40), nw:img.naturalWidth, nh:img.naturalHeight, comp:img.complete} : null,
      bg: cs.backgroundImage.slice(0,90) });
  });
  return out.slice(0,6); })()`), null, 1));
await raw("Target.closeTarget", { targetId }); bws.close();
