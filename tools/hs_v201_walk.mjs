/* hs/ V-201 자 — 「걸어서 무슨 일이 되는가」를 잰다 (충돌 판정).
 *
 *   node tools/hs_v201_walk.mjs [before|after] [걸음수] [씨앗들]
 *   node tools/hs_v201_walk.mjs before            (기본 — 2000 걸음 × 씨앗 셋)
 *   node tools/hs_v201_walk.mjs after 2000 1337,4242,9001
 *
 * 왜 (ROADMAP V-201): 여태 아무 자도 「걸어서 무슨 일이 되는가」를 안 봤다 — 검수가 전부
 *   「한 컷을 어떻게 그리는가」였다([[probe-must-walk-the-real-path]]). 이 자는 사람이 하듯
 *   **실제 키 입력(DOM keydown/keyup)** 으로 무작위로 걷고, 매 프레임 「지금 선 자리가
 *   걸을 수 있는 자리인가(방 ∪ 복도 안인가)」·「서 있는 소품 위에 겹쳤나」를 센다.
 * ★ 내부 함수 직접 호출로 건너뛰지 않는다 — 걷기는 페이지 안 rAF 루프가 DOM 이벤트로
 *   키를 눌렀다 뗀다(게임의 실제 keydown/keyup 리스너가 발화). 세는 것만 페이지 안에서
 *   한 번에 굴려(2000번 CDP 왕복 대신), 마지막에 집계를 한 번 읽는다.
 *
 * 찍는 수: 벽 밖에 선 걸음 비율 · 서 있는 소품 위 겹친 걸음 비율 · 프레임 p95 ·
 *   「같은 자리에서 10 프레임 넘게 못 움직인」 창(stuck) 수 · 최대 정지 프레임.
 * ★ 소품 겹침은 고친 뒤엔 main.js 가 노출한 window.__blockProps({x,y,r})로 «실제 막는 꼴»을
 *   재고, 고치기 전엔 같은 서 있는 소품을 pr.h*0.22 발밑 추정으로 잰다(둘 다 y 는 0.6 눌러 깊이).
 */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const MODE = process.argv[2] === "after" ? "after" : "before";
const N = +(process.argv[3] || 2000);
const SEEDS = (process.argv[4] || "1337,4242,9001").split(",").map((s) => +s);
const VW = 1512, VH = 863;
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
setTimeout(() => { log("WATCHDOG"); process.exit(9); }, 150000 * SEEDS.length + 60000);

await ensureChrome({ log, force: true });
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s }));
  return new Promise((res, rej) => { const to = setTimeout(() => { pend.delete(i); rej(new Error("CDP timeout " + m)); }, 120000);
    pend.set(i, { res: v => { clearTimeout(to); res(v); }, rej: e => { clearTimeout(to); rej(e); } }); }); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const seedSrc = (seed) => `Math.random = (() => { let s = (${seed} >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();`;

// 페이지 안에서 «실제 키 입력»으로 N 걸음 무작위로 걷고, 매 프레임 센다.
const WALK = `(N => new Promise(resolve => {
  const doc = document, cv = doc.getElementById('board');
  const kd = k => doc.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  const ku = k => doc.dispatchEvent(new KeyboardEvent('keyup',   { key: k, bubbles: true }));
  const held = new Set();
  const setKeys = want => { for (const k of held) if (!want.has(k)) { ku(k); held.delete(k); }
    for (const k of want) if (!held.has(k)) { kd(k); held.add(k); } };
  const DIRS = [['w'],['s'],['a'],['d'],['w','a'],['w','d'],['s','a'],['s','d']];
  const BLOCK = new Set(['decor/pillar.png','decor/column2.png','decor/statue.png','decor/coffin.png','decor/brazier.png']);
  function inUnion(x, y) {
    for (const r of G.rooms) if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
    for (const c of G.corridors) if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) return true;
    return false;
  }
  const BL = window.__blockers ? window.__blockers() : null;
  function onProp(x, y) {
    if (BL) { for (const b of BL) { const dx = x - b.x, dy = (y - b.y) / 0.62; if (dx * dx + dy * dy < b.r * b.r) return true; } }
    else { for (const pr of G.props) { if (!BLOCK.has(pr.img)) continue; const br = pr.h * 0.22;
      const dx = x - pr.x, dy = (y - pr.y) / 0.62; if (dx * dx + dy * dy < br * br) return true; } }
    for (const ch of G.chests) { const r = (ch.r || 26); const dx = x - ch.x, dy = (y - ch.y) / 0.62; if (dx * dx + dy * dy < r * r) return true; }
    return false;
  }
  window.__prof && window.__prof.reset && window.__prof.reset();
  let step = 0, outWall = 0, onPropN = 0;
  let dir = DIRS[0], dirLeft = 0;
  const frames = [];
  let lastT = performance.now();
  let px = G.player.x, py = G.player.y, still = 0, stuckWin = 0, maxStill = 0;
  function tick() {
    const now = performance.now(); frames.push(now - lastT); lastT = now;
    const p = G.player;
    // ★ 이 자는 «걸음»을 잰다 — 싸움이 아니다. 죽어서 얼어붙으면 「끼임」이 거짓으로 부푼다.
    //   피를 매 프레임 채워 안 죽게 하고(무적), 그래도 죽으면 R 로 되살려 걷기를 잇는다.
    p.hp = p.maxhp;
    if (G.dead) { const rk = new KeyboardEvent('keydown', { key: 'r', bubbles: true }); doc.dispatchEvent(rk);
      px = p.x; py = p.y; still = 0; requestAnimationFrame(tick); return; }
    const moved = Math.hypot(p.x - px, p.y - py);
    // 「끼임」 — 키를 쥔 채 0.5px 도 못 움직인 프레임. 11 프레임째에 창 하나로 센다.
    if (held.size > 0 && moved < 0.5) { still++; if (still > maxStill) maxStill = still; if (still === 11) stuckWin++; }
    else still = 0;
    px = p.x; py = p.y;
    if (!inUnion(p.x, p.y)) outWall++;
    if (onProp(p.x, p.y)) onPropN++;
    // 방향: 몇 프레임 유지하다 새로 뽑는다. 막히면(안 움직이면) 즉시 새 방향으로.
    if (dirLeft <= 0 || moved < 0.3) { dir = DIRS[(Math.random() * DIRS.length) | 0]; dirLeft = 4 + ((Math.random() * 6) | 0); }
    dirLeft--;
    setKeys(new Set(dir));
    step++;
    if (step >= N) {
      setKeys(new Set());
      frames.sort((a, b) => a - b);
      const rafP95 = frames[Math.floor(frames.length * 0.95)] || 0;
      const compP95 = window.__prof && window.__prof.summary ? window.__prof.summary().phase.total.p95 : 0;
      resolve(JSON.stringify({ N: step, outWall, onPropN,
        outWallPct: +(100 * outWall / step).toFixed(2), onPropPct: +(100 * onPropN / step).toFixed(2),
        p95: +compP95.toFixed(2), rafP95: +rafP95.toFixed(2), stuckWin, maxStill,
        floor: G.floor, rooms: G.rooms.length - 1, corridors: G.corridors.length,
        blockProps: BL ? BL.length : 0 }));
      return;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}))`;

async function runOne(seed) {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
  const errs = [];
  bws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.sessionId !== sessionId) return;
    if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "?").slice(0, 160)); });
  await S("Page.enable"); await S("Runtime.enable");
  await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc(seed) });
  await S("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
  await S("Page.navigate", { url: URL });
  let booted = false;
  for (let i = 0; i < 60; i++) { await sleep(300);
    if (await ev(`!!(window.G && G.player && window.HSZ && document.getElementById('loading').style.display === 'none')`)) { booted = true; break; } }
  if (!booted) { log(`  씨앗 ${seed} — 부팅 실패`); await raw("Target.closeTarget", { targetId }).catch(() => {}); return null; }
  await sleep(400);
  const r = JSON.parse(await ev(`(${WALK})(${N})`));
  r.seed = seed; r.errs = errs.length;
  await raw("Target.closeTarget", { targetId }).catch(() => {});
  log(`  씨앗 ${seed}: ${r.N}걸음 · 벽밖 ${r.outWallPct}%(${r.outWall}) · 소품겹침 ${r.onPropPct}%(${r.onPropN}) · ` +
    `compute p95 ${r.p95}ms(rAF ${r.rafP95}) · 끼임창 ${r.stuckWin}(최대정지 ${r.maxStill}f) · 막는소품 ${r.blockProps} · 오류 ${r.errs}`);
  return r;
}

log(`\n■ hs_v201_walk (${MODE}) — ${N}걸음 × 씨앗 ${SEEDS.join("/")} · 창 ${VW}×${VH}`);
const runs = [];
for (const seed of SEEDS) { const r = await runOne(seed); if (r) runs.push(r); }
if (!runs.length) { log("판 없음"); bws.close(); process.exit(3); }

const sum = (k) => runs.reduce((s, r) => s + r[k], 0);
const agg = {
  mode: MODE, N, seeds: SEEDS,
  outWallPct: +(100 * sum("outWall") / sum("N")).toFixed(2),
  onPropPct: +(100 * sum("onPropN") / sum("N")).toFixed(2),
  p95: +Math.max(...runs.map(r => r.p95)).toFixed(2),
  stuckWin: sum("stuckWin"), maxStill: Math.max(...runs.map(r => r.maxStill)),
  errs: sum("errs"),
};
log(`\n▣ ${MODE} 합산: 벽밖 ${agg.outWallPct}% · 소품겹침 ${agg.onPropPct}% · frame p95 ${agg.p95}ms · ` +
  `끼임창 ${agg.stuckWin}(최대정지 ${agg.maxStill}f) · 오류 ${agg.errs}`);
if (MODE === "after") {
  const pass = { wall: agg.outWallPct === 0, prop: agg.onPropPct <= 2, stuck: agg.stuckWin === 0, err: agg.errs === 0 };
  log(`  통과선: 벽밖 0% → ${pass.wall ? "✔" : "✘"} · 소품겹침 ≤2% → ${pass.prop ? "✔" : "✘"} · ` +
    `끼임 0 → ${pass.stuck ? "✔" : "✘"} · 오류 0 → ${pass.err ? "✔" : "✘"}`);
  log(`  ▶ ${Object.values(pass).every(Boolean) ? "다 규격 안 ✅" : "미달 있음 ❌"}`);
}
fs.writeFileSync(`tmp/hs_v201_walk_${MODE}.json`, JSON.stringify({ agg, runs }, null, 2));
log(`  ▸ tmp/hs_v201_walk_${MODE}.json`);

const list = await (await fetch(CDP + "/json/list")).json();
for (const t of list) if (t.type === "page") { try { await fetch(CDP + "/json/close/" + t.id); } catch {} }
bws.close();
process.exit(0);
