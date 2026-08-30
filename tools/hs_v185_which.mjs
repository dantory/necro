/* V-185 곁가지 자 — «남은» 알림 글이 무엇인지 이름으로 센다.
 * 고침이 목표에 못 미쳤을 때 «무엇이 아직 덮는가»를 짐작하지 않기 위한 것.
 *   node tools/hs_v185_which.mjs [초] [씨앗]
 * 자동조종·씨앗은 hs_v185_floats.mjs 와 같은 것을 떼어 쓴다 — 다른 판을 보면 못 견준다. */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const VW = 1512, VH = 863;
const SEC = +(process.argv[2] || 40), SEED = +(process.argv[3] || 1);
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
  if (m.id && pend.has(m.id)) { const q = pend.get(m.id); pend.delete(m.id); return m.error ? q.rej(new Error(JSON.stringify(m.error))) : q.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DENS = fs.readFileSync("tools/hs_v183_density.mjs", "utf8");
const seedSrc = s => { const a = DENS.indexOf("const seedSrc = s => `") ; const q = DENS.indexOf("`", a) + 1;
  const b = DENS.indexOf("`;", q); return DENS.slice(q, b).replace(/\$\{s\}/g, s); };
const AUTO = (() => { const a = DENS.indexOf("const AUTO = `") + "const AUTO = `".length;
  const b = DENS.indexOf("`;", a); return DENS.slice(b === -1 ? a : a, b); })();
const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await S("Page.enable"); await S("Runtime.enable");
await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc(SEED) });
await S("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url: URL });
let booted = false;
for (let i = 0; i < 60; i++) { await sleep(300);
  if (await ev(`!!(window.G && G.player && window.HSZ && document.getElementById('loading').style.display==='none')`)) { booted = true; break; } }
if (!booted) { log("부팅 실패"); process.exit(1); }
await S("Runtime.evaluate", { expression: AUTO });
/* ★ G.floats 는 매 프레임 filter 로 «새 배열»이 된다(main.js:648) — push 를 감싸면 한 프레임
 * 만에 원본으로 돌아가 1개만 세고 만다(실제로 그랬다). 그러니 배열을 훑으며 처음 본 것에
 * 도장을 찍어 «뜬 순간»에 한 번만 센다. 도장이 있으면 다시 안 센다 = 오래 뜨는 글이 부풀지 않는다. */
await ev(`(() => { window.__tally = {}; let n = 0;
  window.__tallyIv = setInterval(() => { for (const f of (G.floats || [])) {
    if (!f || !f.txt || f.__seen) continue; f.__seen = 1;
    const k = f.dmg ? "\u00ab\ud53c\ud574\uc22b\uc790\u00bb" : String(f.txt).replace(/\\d+/g, "N").slice(0, 34);
    window.__tally[k] = (window.__tally[k] || 0) + 1; } }, 33); return true; })()`);
await sleep(SEC * 1000);
const t = await ev(`window.__tally`), kills = await ev(`G.kills`);
await raw("Target.closeTarget", { targetId }).catch(()=>{});
log(`■ hs_v185_which — ${SEC}초 · 씨앗 ${SEED} · 처치 ${kills}\n`);
for (const [k, v] of Object.entries(t).sort((a,b)=>b[1]-a[1])) log(String(v).padStart(6), " ", k);
process.exit(0);
