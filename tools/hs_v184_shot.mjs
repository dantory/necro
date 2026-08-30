/* V-184 컷 — 물건이 쌓이고 적이 있는 방에서 이름표 상태를 눈으로 본다.
 *
 *   node tools/hs_v184_shot.mjs <before|after|alt> [씨앗] [초]
 *
 * V-183 밀도 자의 자동조종으로 밀고 들어가 싸우다, 화면 안에 물건이 여러 개 쌓이고
 * (바닥물건 ≥ 24) 적이 서 있는(≥ 3) 순간을 잡아 찍는다. alt 는 찍기 직전 ALT 를 눌러
 * (keydown) 든 상태로 찍는다 — D2 처럼 그때만 이름표가 다 보여야 한다. */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const VW = 1512, VH = 863;
const MODE = (process.argv[2] || "after").toLowerCase();
const SEED = +(process.argv[3] || 2), SEC = +(process.argv[4] || 60);
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
setTimeout(() => { log("WATCHDOG"); process.exit(9); }, (SEC + 150) * 1000);

await ensureChrome({ log, force: false });
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s }));
  return new Promise((res, rej) => { const to = setTimeout(() => { pend.delete(i); rej(new Error("CDP timeout " + m)); }, 30000);
    pend.set(i, { res: v => { clearTimeout(to); res(v); }, rej: e => { clearTimeout(to); rej(e); } }); }); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const seedSrc = (seed) => `Math.random = (() => { let s = (${seed} >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();`;
const DENS = fs.readFileSync("tools/hs_v183_density.mjs", "utf8");
const AUTO = (() => { const a = DENS.indexOf("const AUTO = `") + "const AUTO = `".length;
  const b = DENS.indexOf("`;", a); return DENS.slice(a, b); })();

const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await S("Page.enable"); await S("Runtime.enable");
await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc(SEED) });
await S("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 2, mobile: false });
await S("Page.navigate", { url: URL });
let booted = false;
for (let i = 0; i < 60; i++) { await sleep(300);
  if (await ev(`!!(window.G && G.player && window.HSZ && document.getElementById('loading').style.display === 'none')`)) { booted = true; break; } }
if (!booted) { log("부팅 실패"); process.exit(1); }
await S("Runtime.evaluate", { expression: AUTO });

/* 화면 안 물건·적을 세, 물건이 쌓이고(≥24) 적이 서 있는(≥3) 순간을 기다린다. */
const cond = () => ev(`(() => { const G=window.G,cam=window.cam,Z=window.HSZ;
  const x0=cam.x,x1=cam.x+innerWidth/Z,y0=cam.y,y1=cam.y+innerHeight/Z;
  let it=0; for(const i of G.items){const s=i; if(s.x>=x0&&s.x<=x1&&s.y>=y0&&s.y<=y1)it++;}
  let en=0; for(const pk of G.packs) if(pk.awake) for(const m of pk.enemies) if(m.alive&&m.x>=x0&&m.x<=x1&&m.y>=y0&&m.y<=y1)en++;
  return {it,en}; })()`);

let best = { it: 0, en: 0 }, waited = 0;
while (waited < SEC * 1000) {
  const c = await cond();
  if (c && c.it >= 24 && c.en >= 3) { best = c; break; }
  if (c && c.it > best.it) best = c;
  await sleep(400); waited += 400;
}

if (MODE === "alt") {
  await S("Input.dispatchKeyEvent", { type: "keyDown", key: "Alt", code: "AltLeft", windowsVirtualKeyCode: 18 });
  await ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Alt',bubbles:true}))`);
  await sleep(120);
}
await sleep(80);
const out = `tmp/v184_${MODE}.png`;
const { data } = await S("Page.captureScreenshot", { format: "png" });
fs.writeFileSync(out, Buffer.from(data, "base64"));
if (MODE === "alt") await ev(`document.dispatchEvent(new KeyboardEvent('keyup',{key:'Alt',bubbles:true}))`);
log(`${out}  (화면 안 물건 ${best.it} · 적 ${best.en})`);
await raw("Target.closeTarget", { targetId }).catch(() => {});
bws.close(); process.exit(0);
