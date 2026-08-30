/* V-185 컷 — 떼를 몰살하는 순간, 떠오르는 글이 화면을 얼마나 덮는지 눈으로 본다.
 *
 *   node tools/hs_v185_shot.mjs <before|after> [씨앗] [초]
 *
 * V-183 밀도 자의 자동조종으로 밀고 들어가 싸우다, 화면 안에 float «글자»가 가장 많이
 * 겹치는 순간(피해 숫자가 쏟아지는 프레임)을 잡아 찍는다. before 는 사람이 숫자에 묻히고,
 * after 는 사람이 보여야 한다(실패 조건). 처치가 실제로 늘고 있는지(kills)도 함께 찍는다. */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const VW = 1512, VH = 863;
const MODE = (process.argv[2] || "after").toLowerCase();
const SEED = +(process.argv[3] || 2), SEC = +(process.argv[4] || 70);
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

/* 화면 안 float 글자 수·살아있는 적·처치 누계. float 이 제일 많이 겹치는 순간을 노린다. */
const probe = () => ev(`(() => { const G=window.G,cam=window.cam,Z=window.HSZ;
  const x0=cam.x,x1=cam.x+innerWidth/Z,y0=cam.y,y1=cam.y+innerHeight/Z;
  let fl=0; for(const f of G.floats){ if(!f.txt) continue; if(f.x>=x0&&f.x<=x1&&f.y>=y0&&f.y<=y1) fl++; }
  let en=0; for(const pk of (G.packs||[])) if(pk.awake) for(const m of pk.enemies) if(m.alive&&m.x>=x0&&m.x<=x1&&m.y>=y0&&m.y<=y1)en++;
  return { fl, en, kills: G.kills }; })()`);

/* 몰살 순간을 잡는다 — float 글자가 지금껏 본 최고이고 적도 서 있으면 그 프레임을 찍어 둔다.
 * float 은 1초 안에 사라져 «지난 뒤»엔 못 잡는다. 그래서 최고를 만날 때마다 바로 찍어 덮어쓴다. */
let best = -1, bestKills = 0, waited = 0, shots = 0;
while (waited < SEC * 1000) {
  const c = await probe();
  if (c && c.fl > best && c.fl >= 6 && c.en >= 2) {
    best = c.fl; bestKills = c.kills; shots++;
    const { data } = await S("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(`tmp/v185_${MODE}.png`, Buffer.from(data, "base64"));
  }
  await sleep(150); waited += 150;
}

if (best < 0) { log("몰살 순간을 못 잡았다 (float 6+ · 적 2+ 가 없었다)"); process.exit(1); }
log(`tmp/v185_${MODE}.png  (float 글자 최대 ${best} · 그때 처치 ${bestKills} · 후보 ${shots}번 덮어씀)`);
await raw("Target.closeTarget", { targetId }).catch(() => {});
bws.close(); process.exit(0);
