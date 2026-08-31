/* hs/ V-206 컷 — 같은 장면에서 손잡이만 토글해 before/after 쌍을 남긴다(카메라 효과를 오롯이 가른다).
 *
 *   node tools/hs_v206_cuts.mjs [seed]
 *
 * 무엇을: 화면보다 큰 방을 찾아 사람을 그 «남쪽 벽»에 세운 뒤 —
 *   ① __CAM_CLAMP 를 false→true 로만 바꿔 카메라 before/after (뼈창을 남쪽으로 몇 발 쏴 둔 채로).
 *   ② __PROJ_WALL 를 false→true 로만 바꿔 발사체가 벽을 넘느냐/막히느냐 before/after.
 *   같은 프레임 상태에서 손잡이만 다르므로 «그 손잡이가 화면을 어떻게 바꾸나»가 눈에 바로 보인다.
 */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const SEED = +(process.argv[2] || 2);
const VW = 1512, VH = 863;
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
setTimeout(() => { log("WATCHDOG"); process.exit(9); }, 180000);

await ensureChrome({ log, force: true });
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

const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const cut = async (name) => { const r = await S("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(`tmp/hs_v206_${name}.png`, Buffer.from(r.data, "base64")); log(`  컷 tmp/hs_v206_${name}.png`); };
await S("Page.enable"); await S("Runtime.enable");
await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc(SEED) });
await S("Page.addScriptToEvaluateOnNewDocument", { source: `globalThis.__FOE_DMG = 0; globalThis.__RANGED_MOB = true;` });
await S("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url: URL });
let booted = false;
for (let i = 0; i < 60; i++) { await sleep(300);
  if (await ev(`!!(window.G && G.player && window.HSZ && document.getElementById('loading').style.display === 'none')`)) { booted = true; break; } }
if (!booted) { log("부팅 실패"); process.exit(3); }
await sleep(1200);   // 에셋 로드

// 화면(월드 vw×vh)보다 큰 방을 골라 사람을 남쪽 벽 한복판에 세운다.
const placed = await ev(`(() => {
  const G = window.G, Z = window.HSZ, vw = ${VW} / Z, vh = ${VH} / Z, p = G.player;
  let best = null;
  for (const r of G.rooms) if (r.w > vw * 0.95 && r.h > vh * 0.95) { if (!best || r.w * r.h > best.w * best.h) best = r; }
  if (!best) for (const r of G.rooms) { if (!best || r.w * r.h > best.w * best.h) best = r; }
  p.x = best.x + best.w / 2; p.y = best.y + best.h - (p.r + 6); p.hp = p.maxhp;
  return { rw: Math.round(best.w), rh: Math.round(best.h), vw: Math.round(vw), vh: Math.round(vh) };
})()`);
log(`  씨앗 ${SEED} — 방 ${placed.rw}×${placed.rh} · 화면 ${placed.vw}×${placed.vh}`);

// ① 카메라 쌍 — 남쪽으로 뼈창 몇 발을 얹은 채 손잡이만 토글.
await ev(`(() => { const p = G.player, a = Math.PI / 2;
  for (let i = 0; i < 5; i++) G.spears.push({ x: p.x + (i - 2) * 40, y: p.y - 20, vx: Math.cos(a) * 720 * (i % 2 ? -0.2 : 0.2), vy: 720, life: 1.1, dmg: 40 });
  globalThis.__PROJ_WALL = false; })()`);
await ev(`globalThis.__CAM_CLAMP = false;`); await sleep(1400); await cut("cam_before");
await ev(`globalThis.__CAM_CLAMP = true;`);  await sleep(1400); await cut("cam_after");

// ② 발사체 벽 쌍 — 카메라는 after 로 고정, 남쪽 벽으로 뼈창을 계속 쏘며 __PROJ_WALL 토글.
const fire = `(() => { const p = G.player; for (let i = 0; i < 6; i++)
  G.spears.push({ x: p.x + (i - 3) * 36, y: p.y - 20, vx: (i - 3) * 60, vy: 700, life: 1.1, dmg: 40 }); })()`;
await ev(`globalThis.__PROJ_WALL = false;`); await ev(fire); await sleep(260); await cut("wall_before");
await ev(`globalThis.__PROJ_WALL = true;`);  await ev(fire); await sleep(260); await cut("wall_after");

await raw("Target.closeTarget", { targetId }).catch(() => {});
const list = await (await fetch(CDP + "/json/list")).json();
for (const t of list) if (t.type === "page") { try { await fetch(CDP + "/json/close/" + t.id); } catch {} }
bws.close();
process.exit(0);
