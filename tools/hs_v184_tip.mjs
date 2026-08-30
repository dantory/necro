/* V-184 툴팁·줍기 경로 확인 — 이름표를 감춘 뒤에도 마우스를 얹으면 툴팁이 뜨고
 * 밟으면 줍히는지 못박는다(요구 검증 3). 자동조종으로 물건을 바닥에 낸 뒤:
 *   ① 바닥 물건 하나의 화면좌표로 마우스를 옮겨 el('tooltip') 이 block 인지·글이 있는지
 *   ② 잠깐 더 굴려 G.picks 가 느는지(밟아서 줍는 경로) */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
setTimeout(() => { log("WATCHDOG"); process.exit(9); }, 150000);
await ensureChrome({ log, force: false });
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s }));
  return new Promise((res, rej) => { const to = setTimeout(() => { pend.delete(i); rej(new Error("to " + m)); }, 30000);
    pend.set(i, { res: v => { clearTimeout(to); res(v); }, rej: e => { clearTimeout(to); rej(e); } }); }); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DENS = fs.readFileSync("tools/hs_v183_density.mjs", "utf8");
const AUTO = (() => { const a = DENS.indexOf("const AUTO = `") + "const AUTO = `".length; const b = DENS.indexOf("`;", a); return DENS.slice(a, b); })();
const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await S("Page.enable"); await S("Runtime.enable");
await S("Page.addScriptToEvaluateOnNewDocument", { source: `Math.random=(()=>{let s=2;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};})();` });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url: URL });
for (let i = 0; i < 60; i++) { await sleep(300); if (await ev(`!!(window.G&&G.player&&window.HSZ&&document.getElementById('loading').style.display==='none')`)) break; }
await S("Runtime.evaluate", { expression: AUTO });
// 바닥에 물건이 여럿 날 때까지
for (let i = 0; i < 60; i++) { await sleep(500); if (await ev(`window.G && G.items.length >= 8`)) break; }
const picks0 = await ev(`window.G.picks`);
// ① 바닥 물건 하나(사람에게 가장 가까운, 아직 자석에 안 딸려온 것)의 화면좌표로 마우스를 옮긴다
const spot = await ev(`(() => { const G=window.G,cam=window.cam,Z=window.HSZ,p=G.player; let b=null,bd=1e18;
  for(const it of G.items){const d=Math.hypot(it.x-p.x,it.y-p.y); if(d>140&&d<bd){bd=d;b=it;}}
  if(!b) b=G.items[0]; if(!b) return null;
  return { sx:(b.x-cam.x)*Z, sy:(b.y-cam.y)*Z+8, name:b.item.name }; })()`);
let tip = { display: "no-spot" };
if (spot) {
  for (let k = 0; k < 8; k++) {
    await ev(`document.getElementById('board').dispatchEvent(new MouseEvent('mousemove',{clientX:${spot.sx},clientY:${spot.sy},bubbles:true}))`);
    await sleep(120);
    tip = await ev(`(() => { const t=document.getElementById('tooltip'); return { display:t.style.display, text:(t.textContent||'').slice(0,60) }; })()`);
    if (tip.display === "block") break;
  }
}
// ② 잠깐 더 굴려 줍기가 느는지
await sleep(4000);
const picks1 = await ev(`window.G.picks`);
log(`툴팁: 마우스 얹은 물건 「${spot?.name ?? "?"}」 → display=${tip.display} · 글=「${tip.text ?? ""}」`);
log(`줍기: picks ${picks0} → ${picks1}  (${picks1 > picks0 ? "밟아서 줍는 경로 산다 ✓" : "안 늘었다 ✗"})`);
log(`판정: 툴팁 ${tip.display === "block" ? "뜬다 ✓" : "안 뜬다 ✗"} · 줍기 ${picks1 > picks0 ? "✓" : "✗"}`);
await raw("Target.closeTarget", { targetId }).catch(() => {});
bws.close(); process.exit(0);
