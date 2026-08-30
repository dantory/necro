/* V-180b — 프레임을 «자의 상한»이 아니라 «우리 JS 비용»으로 잰다.
 * V-154 가 정한 것: 헤드리스 fps 는 렌더러 상한이라 회귀 신호가 아니다.
 * 판정은 window.__prof.summary() 의 draw/sim/hud p95 로 한다. */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
setTimeout(() => { log("WATCHDOG 120s"); process.exit(9); }, 120000);
await ensureChrome({ log, force: false });
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s }));
  return new Promise((res, rej) => { const to = setTimeout(() => { pend.delete(i); rej(new Error("CDP timeout " + m)); }, 20000);
    pend.set(i, { res: v => { clearTimeout(to); res(v); }, rej: e => { clearTimeout(to); rej(e); } }); }); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
await raw("Page.enable", {}, sessionId);
await raw("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false }, sessionId);
await raw("Page.navigate", { url: URL }, sessionId);
const ev = (fn) => raw("Runtime.evaluate", { expression: fn, awaitPromise: true, returnByValue: true }, sessionId).then(r => r.result.value);
await new Promise(r => setTimeout(r, 3500));
await ev(`(async()=>{ for(let i=0;i<7;i++){ document.dispatchEvent(new KeyboardEvent('keydown',{key:'q'})); await new Promise(r=>setTimeout(r,120)); } })()`);
await ev(`(async()=>{ const t=Date.now(); while(Date.now()-t<9000){ document.dispatchEvent(new KeyboardEvent('keydown',{key:'d'})); await new Promise(r=>setTimeout(r,60)); document.dispatchEvent(new KeyboardEvent('keyup',{key:'d'})); } })()`);
const s = await ev(`JSON.stringify(window.__prof && window.__prof.summary ? window.__prof.summary() : {err:'no __prof'})`);
log("__prof.summary() →", s);
await raw("Target.closeTarget", { targetId });
log("done"); process.exit(0);
