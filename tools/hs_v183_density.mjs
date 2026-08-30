/* V-183 「몰려온다」의 자 — **화면 안에 몇 마리가 동시에 보이는가**를 잰다.
 *
 *   node tools/hs_v183_density.mjs [초] [씨앗들]
 *   node tools/hs_v183_density.mjs 90 1,2,3          (기본)
 *
 * 왜: hs/map.js 는 방마다 팩 1~2개·팩당 5~12마리인데, **실제로 카메라 안에 동시에
 * 살아 있는 적이 몇인지는 아무도 잰 적이 없다.** 손잡이(팩 크기·깨우는 반경·방당 팩 수·
 * 이동 속도)를 돌리기 전에 먼저 이 자를 박는다 — 고친 뒤 **같은 자**로 다시 잰다.
 *
 * 재는 법: 씨앗을 페이지 뜨기 전에 심고(genFloor 의 Math.random 이 결정적이게), hs 를
 * 열어 **실제 rAF 로 돌리며**(헤드리스 fps 는 못 믿으나 __prof 의 sim/draw/hud 는 우리
 * JS 비용이라 믿는다 — V-180b) 안에 심은 자동조종이 팩을 향해 밀고 들어가 싸운다.
 * 0.5초마다:
 *   ① 카메라 안(화면 안)에 살아 있는 적 수 — p50 · p95 · 최대
 *   ② 깨어 있는(awake) 팩 수
 * 그리고 90초 창의 __prof.summary() 의 frame(total)/sim/draw p95 를 함께 낸다.
 *
 * ★ 자동조종은 «자」다 — 고치기 전/후가 **똑같아야** 견줄 수 있다. 여기 손대면 두 표가
 *   다른 자로 잰 것이 된다. 씨앗 셋 평균으로 낸다(한 판은 표본 하나다). */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const VW = 1512, VH = 863;                       // hs_v180_prof 와 같은 창 (dpr 1)
const SEC = +(process.argv[2] || 90);
const SEEDS = (process.argv[3] || "1,2,3").split(",").map(s => +s.trim()).filter(Boolean);
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
setTimeout(() => { log("WATCHDOG " + (SEC * SEEDS.length + 120) + "s 넘김"); process.exit(9); },
  (SEC * SEEDS.length + 120) * 1000);

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
const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const median = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return !n ? 0 : n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

/* ★ 씨앗은 **페이지가 뜨기 전에** 심는다 — 게임 코드는 손 안 대고 Math.random 만 간다
   (pack_probe·army_probe 와 같은 LCG). genFloor 가 이걸 써 층이 결정적이 된다. */
const seedSrc = (seed) => `Math.random = (() => { let s = (${seed} >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();`;

/* ── 자동조종 + 표집기 (전부 페이지 안에서 rAF 로 — 밖에서 매 프레임 두드리면 느리다) ──
   자동조종은 «밀고 들어가는 사람」이다: 안 깬 팩으로 걸어가 그 안에서 싸우고, 그 방이
   비면 다음 팩으로. 살아남으려 Q 로 해골을 세우고 Z/X 로 자리·등급을 연다. 층이 다
   비면 계단으로 내려가 90초를 채운다(빈 화면으로 끝나지 않게). */
const AUTO = `(() => {
  const doc = document, cv = doc.getElementById('board');
  const kd = k => doc.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  const ku = k => doc.dispatchEvent(new KeyboardEvent('keyup',   { key: k, bubbles: true }));
  const held = new Set();
  const setKeys = want => { for (const k of held) if (!want.has(k)) { ku(k); held.delete(k); }
    for (const k of want) if (!held.has(k)) { kd(k); held.add(k); } };
  const tap = k => { kd(k); setTimeout(() => ku(k), 40); };
  const aim = (sx, sy) => cv.dispatchEvent(new MouseEvent('mousemove', { clientX: sx, clientY: sy, bubbles: true }));
  cv.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: window.innerWidth / 2, clientY: window.innerHeight / 2, bubbles: true }));

  const A = { samples: [], t0: performance.now(), lastQ: 0, lastP: 0, deaths: 0, floors: new Set(), pf: null };
  window.__dens = A;
  window.__prof && window.__prof.reset && window.__prof.reset();

  const Z = window.HSZ;
  function nearestEnemy(p) { let b = null, bd = 1e18;
    for (const pk of G.packs) if (pk.awake) for (const m of pk.enemies) if (m.alive) {
      const d = (m.x - p.x) ** 2 + (m.y - p.y) ** 2; if (d < bd) { bd = d; b = m; } }
    return b ? { m: b, d: Math.sqrt(bd) } : null; }
  function nearestPack(p) { let b = null, bd = 1e18;
    for (const q of G.packs) { if (q.done) continue; const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < bd) { bd = d; b = q; } }
    return b ? { q: b, d: Math.sqrt(bd) } : null; }

  function tick() {
    const G = window.G, cam = window.cam;
    if (!G || !G.player) { requestAnimationFrame(tick); return; }
    A.floors.add(G.floor);
    if (G.dead) { A.deaths++; tap('r'); requestAnimationFrame(tick); return; }
    const p = G.player;

    // ── 움직임: 안 깬 팩으로 밀고 들어간다. 그 안(≤240px)이면 서서 싸운다(달아나면 떼가 흩어진다).
    const np = nearestPack(p);
    let tx, ty;
    if (np) { tx = np.q.x; ty = np.q.y; } else { tx = G.stairs.x; ty = G.stairs.y; }
    const dx = tx - p.x, dy = ty - p.y, dist = Math.hypot(dx, dy);
    const want = new Set();
    if (np && dist <= 240) {
      // 팩 안 — 거의 서 있되, 적 무리 한복판으로 살짝 파고든다(가장 가까운 적이 아주 가까우면 물러선다)
      const ne = nearestEnemy(p);
      if (ne && ne.d < 70) { if (Math.abs(dx) > 30) want.add(dx > 0 ? 'a' : 'd'); if (Math.abs(dy) > 30) want.add(dy > 0 ? 'w' : 's'); }
    } else {
      if (dx > 40) want.add('d'); else if (dx < -40) want.add('a');
      if (dy > 40) want.add('s'); else if (dy < -40) want.add('w');
    }
    setKeys(want);

    // ── 계단: 안 깬 팩이 하나도 없으면 내려가 90초를 채운다
    if (!np && Math.hypot(p.x - G.stairs.x, p.y - G.stairs.y) < 66) tap('f');

    // ── 겨냥 + 공격(마우스는 계속 눌린 채). 가장 가까운 적으로 겨눈다.
    const ne = nearestEnemy(p);
    if (ne) aim((ne.m.x - cam.x) * Z, (ne.m.y - cam.y) * Z);

    // ── 살아남기: 시체가 있으면 해골을 세우고(0.6초 박자), 점수가 있으면 자리·등급을 연다
    const now = performance.now();
    if (now - A.lastQ > 600) { A.lastQ = now; tap('q'); }
    if (now - A.lastP > 1500) { A.lastP = now;
      if (p.levelPoints > 0) tap(p.maxGrade < 2 ? 'x' : 'z'); }

    requestAnimationFrame(tick);
  }

  // ── 표집기: 0.5초마다 화면 안 살아 있는 적 수 · 깨어 있는 팩 수
  const viewW = () => window.innerWidth / window.HSZ, viewH = () => window.innerHeight / window.HSZ;
  A.timer = setInterval(() => {
    const G = window.G, cam = window.cam; if (!G || !G.player) return;
    const x0 = cam.x, x1 = cam.x + viewW(), y0 = cam.y, y1 = cam.y + viewH();
    let onscreen = 0, awake = 0, aliveTot = 0;
    for (const pk of G.packs) {
      if (pk.awake) awake++;
      for (const m of pk.enemies) if (m.alive) { aliveTot++;
        if (pk.awake && m.x >= x0 && m.x <= x1 && m.y >= y0 && m.y <= y1) onscreen++; }
    }
    A.samples.push({ t: +((performance.now() - A.t0) / 1000).toFixed(1),
      onscreen, awake, aliveTot, minions: G.minions.length, floor: G.floor, hp: Math.round(G.player.hp) });
  }, 500);

  requestAnimationFrame(tick);
  return 1;
})()`;

async function runSeed(seed) {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
  await S("Page.enable"); await S("Runtime.enable");
  await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc(seed) });
  await S("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
  await S("Page.navigate", { url: URL });
  // 부팅(G 생성) + 로딩 오버레이가 걷힐 때까지
  let booted = false;
  for (let i = 0; i < 60; i++) { await sleep(300);
    if (await ev(`!!(window.G && G.player && window.HSZ && document.getElementById('loading').style.display === 'none')`)) { booted = true; break; } }
  if (!booted) { log(`  씨앗 ${seed} — 부팅 실패`); await raw("Target.closeTarget", { targetId }).catch(() => {}); return null; }

  await S("Runtime.evaluate", { expression: AUTO });
  await sleep(SEC * 1000 + 400);

  const raw2 = await ev(`JSON.stringify({
    samples: window.__dens.samples,
    deaths: window.__dens.deaths,
    floors: [...window.__dens.floors],
    prof: window.__prof && window.__prof.summary ? window.__prof.summary() : null })`);
  await raw("Target.closeTarget", { targetId }).catch(() => {});
  const o = JSON.parse(raw2);
  const on = o.samples.map(s => s.onscreen), aw = o.samples.map(s => s.awake);
  return { seed, n: o.samples.length, deaths: o.deaths, floors: o.floors,
    onP50: median(on), onP95: pct(on, 0.95), onMax: Math.max(0, ...on),
    awP50: median(aw), awMax: Math.max(0, ...aw),
    minionsMax: Math.max(0, ...o.samples.map(s => s.minions)),
    prof: o.prof };
}

log(`■ hs_v183_density — ${SEC}초 · 씨앗 ${SEEDS.join("·")} · 창 ${VW}×${VH}(dpr1)\n`);
const rows = [];
for (const seed of SEEDS) {
  const r = await runSeed(seed);
  if (!r) continue;
  rows.push(r);
  const pf = r.prof && r.prof.phase;
  log(`씨앗 ${r.seed}  화면적 p50 ${r.onP50} · p95 ${r.onP95} · 최대 ${r.onMax}` +
    ` · 깬팩 p50 ${r.awP50}/최대 ${r.awMax} · 소환최대 ${r.minionsMax}` +
    ` · 층 ${r.floors.join("→")} · 죽음 ${r.deaths} · 표본 ${r.n}` +
    (pf ? `\n         frame p95 ${pf.total.p95}ms · sim p95 ${pf.sim.p95} · draw p95 ${pf.draw.p95} · hud p95 ${pf.hud.p95}` : ""));
}
if (!rows.length) { log("\n표본 0 — 전부 부팅 실패"); bws.close(); process.exit(1); }

const med = sel => median(rows.map(sel));
const framep95 = rows.map(r => r.prof?.phase?.total?.p95 ?? 999);
const T = {
  onP50: med(r => r.onP50), onP95: med(r => r.onP95), onMax: Math.max(...rows.map(r => r.onMax)),
  awP50: med(r => r.awP50), awMax: Math.max(...rows.map(r => r.awMax)),
  framep95: med(() => 0) || median(framep95),
  simp95: median(rows.map(r => r.prof?.phase?.sim?.p95 ?? 0)),
  drawp95: median(rows.map(r => r.prof?.phase?.draw?.p95 ?? 0)),
  hudp95: median(rows.map(r => r.prof?.phase?.hud?.p95 ?? 0)),
};
log(`\n▣ 씨앗 ${rows.length}개 중앙값`);
log(`  화면 안 동시 적 — p50 ${T.onP50} · p95 ${T.onP95} · 최대 ${T.onMax}   (목표 p50≥25 · p95≥40)`);
log(`  깨어 있는 팩 — p50 ${T.awP50} · 최대 ${T.awMax}`);
log(`  프레임 — total p95 ${median(framep95).toFixed(2)}ms · sim ${T.simp95} · draw ${T.drawp95} · hud ${T.hudp95}   (예산 total p95 ≤ 16.7ms)`);
const densOk = T.onP50 >= 25 && T.onP95 >= 40;
const frameOk = median(framep95) <= 16.7;
log(`\n  밀도 ${densOk ? "통과 ✓" : "미달 ✗"} · 프레임 ${frameOk ? "통과 ✓" : "초과 ✗"}`);
bws.close();
process.exit(0);
