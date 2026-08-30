/* V-190 「성장이 너무 쉽게 되는듯」(병수님 08-15)의 자. V-189 가 죽음형 25초에 Lv1→7 을 수로
 * 확인했다 — 이 자는 레벨 곡선을 «재고», 고친 뒤 «다시 재서» 늦춰졌는지 판정한다.
 *
 *   node tools/hs_v190_xp.mjs [초] [씨앗들]
 *   node tools/hs_v190_xp.mjs 90 1,2     (기본)
 *
 * ★ probe-must-walk-the-real-path — 지름길 금지. G.xp/G.player.level 은 게임 안 killEnemy 한 문이
 *   실제로 올린 값이다(처치를 주입하지 않는다). 자동조종이 죽음형(V-189 제일 빠른 쪽)으로 실플레이한다.
 * ★ 헤드리스는 5분에 끊긴다(V-189 실측). 그래서 벽시계로 15분을 안 돌린다 — 짧은 판에서
 *   «처치당 XP»·«초당 처치»를 재고, xpForLevel(n) 곡선으로 「Lv N 에 필요한 누적 처치·시각」을 환산한다.
 *   B1 은 층 깊이 보너스가 0 이라(hs/main.js V-190 ㉡) 처치당 XP 가 옛/새 곡선에서 동일 → 같은 실측으로
 *   옛 선형((n-1)·500)과 새 곡선(250·n·(n-1)) 둘 다 환산해 «배율»을 낸다. */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const VW = 1512, VH = 863;
const SEC = +(process.argv[2] || 90);
const SEEDS = (process.argv[3] || "1,2").split(",").map((s) => +s);
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
setTimeout(() => { log("WATCHDOG"); process.exit(9); }, (SEC * SEEDS.length + 600) * 1000);

// 곡선 두 벌 — 새(초선형) vs 옛(선형). Lv n 도달에 필요한 «누적» XP.
const xpNew = (n) => 250 * n * (n - 1);
const xpOld = (n) => (n - 1) * 500;
// 40점 = attrPts+sklPts, 레벨당 +2 → 20 레벨업 → Lv21 에서 40점을 다 얻는다.
const LV40 = 21;
const MILES = [2, 3, 5, 7, 10, 15, 20, LV40];

await ensureChrome({ log, force: false });
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); let errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s }));
  return new Promise((res, rej) => { const to = setTimeout(() => { pend.delete(i); rej(new Error("CDP timeout " + m)); }, 30000);
    pend.set(i, { res: v => { clearTimeout(to); res(v); }, rej: e => { clearTimeout(to); rej(e); } }); }); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || "?").slice(0, 160));
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errs.push("console.error " + (m.params.args?.[0]?.value || "?")); });
await new Promise(r => bws.addEventListener("open", r));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const seedSrc = (seed) => `Math.random = (() => { let s = (${seed} >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();`;

// 죽음형(V-189) — 힘20 · 뼈창10 · 시체폭발8 · 저주2. 자동조종이 계속 박는다(ensureBuild).
const DEATH = { attr: { str: 20 }, skill: { spear: 10, nova: 8, curse: 2 }, grade: 0 };

const AUTO = `(SPEC => {
  const doc = document, cv = doc.getElementById('board');
  const kd = k => doc.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  const ku = k => doc.dispatchEvent(new KeyboardEvent('keyup',   { key: k, bubbles: true }));
  const held = new Set();
  const setKeys = want => { for (const k of held) if (!want.has(k)) { ku(k); held.delete(k); }
    for (const k of want) if (!held.has(k)) { kd(k); held.add(k); } };
  const tap = k => { kd(k); setTimeout(() => ku(k), 40); };
  const aim = (sx, sy) => cv.dispatchEvent(new MouseEvent('mousemove', { clientX: sx, clientY: sy, bubbles: true }));
  cv.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: window.innerWidth / 2, clientY: window.innerHeight / 2, bubbles: true }));
  window.__prof && window.__prof.reset && window.__prof.reset();
  const A = { lastQ: 0, lastE: 0 }; window.__a190 = A;
  const Z = window.HSZ;
  function ensureBuild() {
    const p = window.G.player;
    if (p.__built) return;
    p.attr = { str:0,dex:0,int:0,sta:0,def:0,vit:0 };
    p.skill = { slot:0,grade:0,mdmg:0,mhp:0,spear:0,nova:0,curse:0 };
    p.mult = { dmg:1, body:1, minionDmg:1 }; p.buildSlots = 0; p.grade = 0;
    Object.assign(p.attr, SPEC.attr); Object.assign(p.skill, SPEC.skill);
    p.attrPts = 0; p.sklPts = 0; window.recalc(); p.grade = SPEC.grade;
    p.hp = p.maxhp; p.mana = p.maxmana; p.__built = 1;
  }
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
    if (G.dead) { tap('r'); requestAnimationFrame(tick); return; }
    ensureBuild();
    const p = G.player;
    const np = nearestPack(p);
    let tx, ty;
    if (np) { tx = np.q.x; ty = np.q.y; } else { tx = G.stairs.x; ty = G.stairs.y; }
    const dx = tx - p.x, dy = ty - p.y, dist = Math.hypot(dx, dy);
    const want = new Set();
    if (np && dist <= 240) {
      const ne0 = nearestEnemy(p);
      if (ne0 && ne0.d < 70) { if (Math.abs(dx) > 30) want.add(dx > 0 ? 'a' : 'd'); if (Math.abs(dy) > 30) want.add(dy > 0 ? 'w' : 's'); }
    } else {
      if (dx > 40) want.add('d'); else if (dx < -40) want.add('a');
      if (dy > 40) want.add('s'); else if (dy < -40) want.add('w');
    }
    setKeys(want);
    if (!np && Math.hypot(p.x - G.stairs.x, p.y - G.stairs.y) < 66) tap('f');
    const ne = nearestEnemy(p);
    if (ne) aim((ne.m.x - cam.x) * Z, (ne.m.y - cam.y) * Z);
    const now = performance.now();
    if (now - A.lastQ > 550) { A.lastQ = now; tap('q'); }
    if (now - A.lastE > 450) { A.lastE = now; tap('e'); }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return 1;
})`;

const mean = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const r1 = n => Math.round(n * 10) / 10;
const fmtT = s => s == null ? "—" : s < 60 ? `${r1(s)}s` : `${r1(s / 60)}분`;

async function runOne(seed, shots) {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
  await S("Page.enable"); await S("Runtime.enable");
  await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc(seed) });
  await S("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
  await S("Page.navigate", { url: URL });
  let booted = false;
  for (let i = 0; i < 60; i++) { await sleep(300);
    if (await ev(`!!(window.G && G.player && window.HSZ && document.getElementById('loading').style.display === 'none')`)) { booted = true; break; } }
  if (!booted) { log("부팅 실패"); await raw("Target.closeTarget", { targetId }).catch(() => {}); return null; }

  await ev(`(${AUTO})(${JSON.stringify(DEATH)})`);
  await sleep(600);
  await ev(`Object.assign(window.__hsMetric, { spear:0, nova:0, minion:0, taken:0, deaths:0, kills:0 })`);
  const t0 = Date.now();
  const samples = [];
  let earlyShot = false;
  while (Date.now() - t0 < SEC * 1000) {
    await sleep(500);
    const s = await ev(`({ floor: G.floor, level: G.player.level, xp: G.xp, kills: window.__hsMetric.kills, earned: G.player.attrPts + G.player.sklPts })`);
    if (s) samples.push({ t: (Date.now() - t0) / 1000, ...s });
    if (!earlyShot && shots?.early && s && (Date.now() - t0) > 6000) {
      earlyShot = true;
      const r = await S("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(shots.early, Buffer.from(r.data, "base64"));
      log(`  컷 ${shots.early}  (Lv${s.level} · xp 바 낮을 때)`);
    }
  }
  const last = samples[samples.length - 1] || { level: 1, xp: 0, kills: 0, floor: 1, earned: 0, t: SEC };
  // 죽어 재시작하면 레벨이 떨어진다 — 죽음형은 V-189 에서 죽음 0 이지만 혹시 몰라 감시.
  let reset = false;
  for (let i = 1; i < samples.length; i++) if (samples[i].level < samples[i - 1].level) reset = true;

  const framep95 = (await ev(`window.__prof && window.__prof.summary ? window.__prof.summary().phase.total.p95 : 999`)) ?? 999;
  let lateShot = null;
  if (shots?.late) {
    await ev(`(() => { if (!document.getElementById('char').classList.contains('on')) window.toggleChar(); })()`);
    await sleep(200);
    const r = await S("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(shots.late, Buffer.from(r.data, "base64"));
    lateShot = shots.late;
    log(`  컷 ${shots.late}  (Lv${last.level} · C 창 남은 점수)`);
  }
  await raw("Target.closeTarget", { targetId }).catch(() => {});

  // 실측 환산치 — B1 은 깊이 보너스 0 이라 처치당 XP 가 순수하다.
  const xpPerKill = last.kills ? last.xp / last.kills : 0;
  const killRate = last.t ? last.kills / last.t : 0;
  // 직접 도달한 이정표(t·kills) — 곡선 없이 «실제로» 닿은 값.
  const reached = {};
  for (const L of MILES) { const s = samples.find(x => x.level >= L); if (s) reached[L] = { t: s.t, kills: s.kills }; }
  return { seed, last, xpPerKill, killRate, reached, reset, framep95, samples, shots: { early: shots?.early, late: lateShot } };
}

async function main() {
  log(`■ hs_v190_xp — 죽음형 · 씨앗 ${SEEDS.join("/")} · 각 ${SEC}초 · 창 ${VW}×${VH}`);
  log(`  곡선: 새 xpForLevel(n)=250·n·(n-1) vs 옛 (n-1)·500 · 40점=Lv${LV40}\n`);
  const runs = [];
  for (let i = 0; i < SEEDS.length; i++) {
    errs = [];
    const shots = i === 0 ? { early: "tmp/v190_early.png", late: "tmp/v190_late.png" } : null;
    const r = await runOne(SEEDS[i], shots);
    if (!r) { log(`  씨앗 ${SEEDS[i]} — 실패`); continue; }
    r.errs = errs.length; runs.push(r);
    log(`  씨앗 ${SEEDS[i]}: ${r.last.t.toFixed(0)}s 에 Lv${r.last.level} · 처치 ${r.last.kills} · xp ${r.last.xp}` +
      ` · 번점 +${r.last.earned} · 처치당XP ${r1(r.xpPerKill)} · 초당처치 ${r1(r.killRate)}` +
      ` · p95 ${r1(r.framep95)}ms · 오류 ${r.errs}${r.reset ? " · ⚠재시작감지" : ""}`);
  }
  if (!runs.length) { log("판 없음"); return false; }

  const avgXpK = mean(runs.map(r => r.xpPerKill));
  const avgRate = mean(runs.map(r => r.killRate));
  const totErr = runs.reduce((s, r) => s + r.errs, 0);
  const avgP95 = r1(mean(runs.map(r => r.framep95)));

  log(`\n▣ 실측 평균 (씨앗 ${runs.length}판) — 처치당 XP ${r1(avgXpK)} · 초당 처치 ${r1(avgRate)} · p95 ${avgP95}ms · 콘솔오류 ${totErr}`);

  // ── 직접 도달한 이정표 (곡선 없이 실제로 닿은 것) ──────────────────────────
  log(`\n▣ 직접 도달 (씨앗 평균, 도달한 것만) — Lv N : 시각 · 누적처치`);
  for (const L of MILES) {
    const hit = runs.map(r => r.reached[L]).filter(Boolean);
    if (!hit.length) { log(`  Lv${L}: 이 판(${SEC}s)에선 못 닿음`); continue; }
    log(`  Lv${L === LV40 ? LV40 + "(40점)" : L}: ${fmtT(mean(hit.map(h => h.t)))} · 처치 ${Math.round(mean(hit.map(h => h.kills)))}`);
  }

  // ── 곡선 환산 표: 옛 vs 새 (같은 실측 처치당XP·초당처치로) ──────────────────
  const killsFor = (xpFn, L) => xpFn(L) / (avgXpK || 1);
  const timeFor = (xpFn, L) => killsFor(xpFn, L) / (avgRate || 1);
  log(`\n▣ 곡선 환산 (실측 처치당XP ${r1(avgXpK)}·초당처치 ${r1(avgRate)} 로 두 곡선 다 환산)`);
  log(`  Lv    | 옛 누적XP | 새 누적XP | 옛 도달 | 새 도달 | 느려짐(배)`);
  const rows = {};
  for (const L of MILES) {
    const to = timeFor(xpOld, L), tn = timeFor(xpNew, L);
    const ratio = to > 0 ? tn / to : 0;
    rows[L] = { xpOld: xpOld(L), xpNew: xpNew(L), tOld: to, tNew: tn, killsNew: Math.round(killsFor(xpNew, L)), ratio: r1(ratio) };
    log(`  ${(L === LV40 ? LV40 + "★" : "" + L).padEnd(5)} | ${String(xpOld(L)).padStart(8)} | ${String(xpNew(L)).padStart(9)} | ${fmtT(to).padStart(7)} | ${fmtT(tn).padStart(7)} | ${r1(ratio)}x`);
  }
  log(`  (★=Lv${LV40}=40점 소진 지점 · 배율 = 새÷옛, 처치당XP 는 두 곡선 같아 처치수 배율과 동일)`);

  // ── 통과선 판정 ────────────────────────────────────────────────────────────
  log(`\n▣ 통과선 판정`);
  const pass = {};
  pass.lv10 = rows[10].ratio >= 5;
  pass.pts40 = rows[LV40].ratio >= 8;
  pass.lv2 = rows[2].ratio <= 2;   // Lv2 는 2배 넘게 느려지면 실패
  log(`  ① Lv10 5배↑ 느리게: ${rows[10].ratio}x → ${pass.lv10 ? "통과 ✔" : "미달 ✘"}`);
  log(`  ② 40점(Lv${LV40}) 8배↑ 느리게: ${rows[LV40].ratio}x → ${pass.pts40 ? "통과 ✔" : "미달 ✘"}`);
  log(`  ③ Lv2 는 2배 이내(초반 안 답답): ${rows[2].ratio}x → ${pass.lv2 ? "통과 ✔" : "미달 ✘"}`);
  const allPass = pass.lv10 && pass.pts40 && pass.lv2;
  log(`  ▶ ${allPass ? "곡선 통과 ✅" : "미달 있음 ❌"}`);

  fs.writeFileSync("tmp/v190_xp.json", JSON.stringify({ SEC, SEEDS, avgXpK, avgRate, avgP95, totErr, rows, pass, allPass,
    runs: runs.map(r => ({ seed: r.seed, last: r.last, xpPerKill: r.xpPerKill, killRate: r.killRate, reached: r.reached, reset: r.reset, errs: r.errs })) }, null, 1));
  log(`\n(자료 tmp/v190_xp.json)`);
  return allPass;
}

const ok = await main();
bws.close();
process.exit(ok ? 0 : 3);
