/* hs/ 6차 fp95 원인 규명 (V-154 C) — 프레임 시간이 «우리 코드»에서 드나, 아니면
 * 헤드리스 소프트웨어 present 에서 드나를 가른다.
 *
 *   node tools/hs_p7_gpu.mjs
 *     → 같은 판을 GPU 끈 크롬 / 켠 크롬 두 곳에서 6초 놀려(idle) 프레임 간격 p95 와
 *       우리 JS 작업(window.__prof.total) p95 를 나란히 찍는다.
 *
 * chrome_guard 는 --disable-gpu 로 고정돼 있어(9333) 그 자체가 기준선(끈 쪽)이다.
 * 여기선 --disable-gpu 를 뺀 크롬을 9334 에 따로 띄워 비교한다. 둘 다 임시 프로필. */
import { spawn } from "node:child_process";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL = "http://127.0.0.1:8774/hs/index.html";
const wait = ms => new Promise(r => setTimeout(r, ms));
const HARD = setTimeout(() => { console.log("WATCHDOG 90s"); process.exit(9); }, 90000);

const INJECT = `(()=>{ let s=1337>>>0; Math.random=function(){ s|=0; s=(s+0x6D2B79F5)|0; let t=Math.imul(s^(s>>>15),1|s);
  t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; };
  window.__ft=[]; (function samp(t){ if(window.__lt) window.__ft.push(t-window.__lt); window.__lt=t;
    if(window.__ft.length>3000) window.__ft.shift(); requestAnimationFrame(samp); })(performance.now()); })();`;

async function measure(port, gpu) {
  const udd = `/tmp/hs_gpu_probe_${port}`;
  const args = ["--headless=new", `--remote-debugging-port=${port}`, "--window-size=1512,863",
    `--user-data-dir=${udd}`, "--no-first-run", "about:blank"];
  if (!gpu) args.splice(3, 0, "--disable-gpu");
  const proc = spawn(CHROME, args, { detached: true, stdio: "ignore" }); proc.unref();
  let ver = null;
  for (let i = 0; i < 30; i++) { await wait(500); try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; } catch {} }
  if (!ver) return { gpu, err: "no CDP" };
  const bws = new WebSocket(ver.webSocketDebuggerUrl);
  let id = 0; const pend = new Map();
  const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s }));
    return new Promise((res, rej) => { const to = setTimeout(() => rej(new Error("to " + m)), 9000);
      pend.set(i, { res: v => { clearTimeout(to); res(v); }, rej: e => { clearTimeout(to); rej(e); } }); }); };
  bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
    if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error("e")) : p.res(m.result); } });
  await new Promise(r => bws.addEventListener("open", r));
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  await S("Page.enable"); await S("Runtime.enable");
  await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
  await S("Page.addScriptToEvaluateOnNewDocument", { source: INJECT });
  await S("Page.navigate", { url: URL });
  const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
  for (let i = 0; i < 24; i++) { await wait(300); if (await ev("!!(window.G && G.player && window.HSZ)")) break; }
  await ev("window.__ft.length=0; window.__prof && window.__prof.reset();");
  await wait(6000);
  const glinfo = await ev(`(()=>{ try{ const c=document.createElement('canvas'); const gl=c.getContext('webgl'); const dbg=gl.getExtension('WEBGL_debug_renderer_info');
    return dbg? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL): (gl?'webgl-no-dbg':'no-webgl'); }catch(e){return 'err';} })()`);
  const ftp95 = await ev("(()=>{const a=[...window.__ft].sort((x,y)=>x-y);return a.length?+a[Math.floor(a.length*0.95)].toFixed(1):0;})()");
  const ftMed = await ev("(()=>{const a=[...window.__ft].sort((x,y)=>x-y);return a.length?+a[Math.floor(a.length*0.5)].toFixed(1):0;})()");
  const prof = await ev("JSON.stringify(window.__prof?window.__prof.summary():null)");
  await raw("Target.closeTarget", { targetId });
  try { spawn("bash", ["-lc", `pkill -f "user-data-dir=${udd}" || true`]); } catch {}
  return { gpu, renderer: glinfo, ftMed, ftp95, prof: JSON.parse(prof || "null") };
}

for (const gpu of [false, true]) {
  const r = await measure(gpu ? 9334 : 9335, gpu);
  const p = r.prof && r.prof.phase;
  console.log(`\n[GPU ${gpu ? "ON " : "OFF"}] renderer=${r.renderer || r.err}`);
  console.log(`  frame interval  median ${r.ftMed}ms  p95 ${r.ftp95}ms`);
  if (p) console.log(`  our JS (prof)   total p95 ${p.total.p95}ms  (draw ${p.draw.p95} / sim ${p.sim.p95} / hud ${p.hud.p95})`);
}
clearTimeout(HARD);
process.exit(0);
