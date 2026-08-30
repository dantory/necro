/* V-183 「몰려온다」를 **눈으로** 본다 — 자가 준 p50/p95 는 수일 뿐이다.
 *
 *   node tools/hs_v183_shot.mjs [초] [씨앗]
 *
 * hs_v183_density.mjs 와 **같은 자동조종**으로 굴리며 0.4초마다 화면 안 적 수를 세고,
 * 그 수가 그때까지의 최댓값을 새로 쓸 때마다 화면을 찍어 둔다(peak). 끝에서
 *   ① peak — 가장 몰렸을 때  ② mid — 중앙값 근처일 때  를 각각 낸다.
 * 「봉우리만 크고 골은 빈다」가 진짜인지, 골이 실제로 어떻게 보이는지를 가른다. */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const PAGE = "http://127.0.0.1:8774/hs/index.html";
const VW = 1512, VH = 863;
const SEC = +(process.argv[2] || 45), SEED = +(process.argv[3] || 2);
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

// 자동조종은 density 자와 **같은 것**을 쓴다 — 다른 자로 찍으면 다른 판을 보는 셈이다.
const DENS = fs.readFileSync("tools/hs_v183_density.mjs", "utf8");
const AUTO = (() => { const a = DENS.indexOf("const AUTO = `") + "const AUTO = `".length;
  const b = DENS.indexOf("`;", a); return DENS.slice(a, b); })();
if (!/requestAnimationFrame\(tick\)/.test(AUTO)) { log("자동조종을 못 떼어냈다"); process.exit(1); }

const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await S("Page.enable"); await S("Runtime.enable");
await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc(SEED) });
await S("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 2, mobile: false });
await S("Page.navigate", { url: PAGE });
let booted = false;
for (let i = 0; i < 60; i++) { await sleep(300);
  if (await ev(`!!(window.G && G.player && window.HSZ && document.getElementById('loading').style.display === 'none')`)) { booted = true; break; } }
if (!booted) { log("부팅 실패"); process.exit(1); }
await S("Runtime.evaluate", { expression: AUTO });

const shot = async (name) => { const { data } = await S("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(name, Buffer.from(data, "base64")); };
const count = () => ev(`(() => { const x0=cam.x,x1=cam.x+innerWidth/HSZ,y0=cam.y,y1=cam.y+innerHeight/HSZ;
  let n=0; for(const pk of G.packs) if(pk.awake) for(const m of pk.enemies) if(m.alive&&m.x>=x0&&m.x<=x1&&m.y>=y0&&m.y<=y1) n++;
  return n; })()`);

let best = -1, series = [], midShot = null;
const t0 = Date.now();
while (Date.now() - t0 < SEC * 1000) {
  const n = await count(); series.push(n);
  if (n > best) { best = n; await shot("tmp/v183_peak.png"); }
  await sleep(400);
}
const sorted = [...series].sort((a, b) => a - b), p50 = sorted[sorted.length >> 1];
// 중앙값 근처 순간을 하나 잡아 찍는다 — 「골」이 실제로 어떻게 보이나
for (let i = 0; i < 40; i++) { const n = await count();
  if (Math.abs(n - p50) <= 2) { await shot("tmp/v183_mid.png"); midShot = n; break; } await sleep(300); }
log(`■ hs_v183_shot 씨앗 ${SEED} · ${SEC}초 · 표본 ${series.length}`);
log(`  화면 안 적 — p50 ${p50} · 최대 ${best}`);
log(`  tmp/v183_peak.png (적 ${best})  ·  tmp/v183_mid.png (적 ${midShot ?? "못잡음"})`);
await raw("Target.closeTarget", { targetId }).catch(() => {});
bws.close(); process.exit(0);
