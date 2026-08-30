/* V-189 「다르게 찍으면 다르게 놀리는가」의 자. 성장창이 장식이 아니라면 세 빌드가
 * 같은 씨앗·같은 시간에 «다르게» 놀아야 한다. 군세형·죽음형·맷집형에 각 40점을 찍고
 * (스탯/스킬을 창의 자료에 직접 박되 잠금 규칙을 지킨다) 같은 자동조종으로 굴려
 * 도달 층·처치·죽은 횟수·받은 피해·«낸 피해 구성»(뼈창/시체폭발/소환수)을 뽑는다.
 *
 *   node tools/hs_v189_build.mjs [초] [씨앗들]
 *   node tools/hs_v189_build.mjs 45 1,2,3     (기본)
 *
 * ★ hs_v186_tree.mjs 를 본떴다(CDP 9333 · chrome_guard 먼저 · 씨앗 틀). 지름길 금지 —
 *   낸 피해는 게임 안 hurtEnemy 한 문(main.js METRIC)이 출처별로 쌓은 실수다. 자동조종은
 *   세 능력을 다 쓴다(뼈창=마우스 자동·소환=q·시체폭발=e) — 그래야 «점수 배분»만이
 *   구성을 가른다. 죽어 판이 새로 서면 자동조종이 빌드를 다시 박는다(ensureBuild). */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const VW = 1512, VH = 863;
const SEC = +(process.argv[2] || 45);
const SEEDS = (process.argv[3] || "1,2,3").split(",").map((s) => +s);
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
setTimeout(() => { log("WATCHDOG"); process.exit(9); }, (SEC * SEEDS.length * 3 + 600) * 1000);

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

// 40점 배분 — 스탯/스킬을 창의 자료에 직접 박는다(잠금: mdmg←grade←slot · nova←spear · curse←nova).
const BUILDS = {
  army:  { name: "군세형", attr: { int: 20 }, skill: { slot: 8, grade: 1, mdmg: 11 }, grade: 1 },
  death: { name: "죽음형", attr: { str: 20 }, skill: { spear: 10, nova: 8, curse: 2 }, grade: 0 },
  tough: { name: "맷집형", attr: { vit: 16, def: 14, sta: 10 }, skill: {}, grade: 0 },
};

// 자동조종 — 뼈창(마우스 계속 눌림)·소환(q)·시체폭발(e)을 다 쓴다. 빌드는 ensureBuild 가 지킨다.
const AUTO = `(build => {
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
  const A = { lastQ: 0, lastE: 0 }; window.__a189 = A;
  const Z = window.HSZ;
  const SPEC = ${JSON.stringify(BUILDS)}[build];
  function ensureBuild() {
    const p = window.G.player;
    if (p.__built === build) return;
    p.attr = { str:0,dex:0,int:0,sta:0,def:0,vit:0 };
    p.skill = { slot:0,grade:0,mdmg:0,mhp:0,spear:0,nova:0,curse:0 };
    p.mult = { dmg:1, body:1, minionDmg:1 }; p.buildSlots = 0; p.grade = 0;
    Object.assign(p.attr, SPEC.attr); Object.assign(p.skill, SPEC.skill);
    p.attrPts = 0; p.sklPts = 0; window.recalc(); p.grade = SPEC.grade;
    p.hp = p.maxhp; p.mana = p.maxmana; p.__built = build;
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

const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const mean = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const rng = a => a.length ? Math.max(...a) - Math.min(...a) : 0;
const r1 = n => Math.round(n * 10) / 10;

async function runOne(build, seed, wantShot) {
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

  await ev(`(${AUTO})(${JSON.stringify(build)})`);
  await sleep(600);
  await ev(`Object.assign(window.__hsMetric, { spear:0, nova:0, minion:0, taken:0, deaths:0, kills:0 })`);
  const t0 = Date.now();
  const curve = [];
  let maxFloor = 1, maxLevel = 1;
  while (Date.now() - t0 < SEC * 1000) {
    await sleep(5000);
    const s = await ev(`({ floor: G.floor, level: G.player.level, earned: G.player.attrPts + G.player.sklPts, kills: window.__hsMetric.kills })`);
    if (s) { maxFloor = Math.max(maxFloor, s.floor); maxLevel = Math.max(maxLevel, s.level);
      curve.push({ t: Math.round((Date.now() - t0) / 1000), ...s, floor: maxFloor, level: maxLevel }); }
  }
  const met = await ev(`({ ...window.__hsMetric })`);
  const prof = await ev(`window.__prof && window.__prof.summary ? window.__prof.summary() : null`);
  const framep95 = prof?.phase?.total?.p95 ?? 999;
  let shot = null;
  if (wantShot) {
    await ev(`(() => { if (document.getElementById('char').classList.contains('on')) window.toggleChar(); })()`);
    await sleep(150);
    const r = await S("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(wantShot, Buffer.from(r.data, "base64")); shot = wantShot;
    log("  컷 " + wantShot + `  (B${maxFloor}층)`);
  }
  await raw("Target.closeTarget", { targetId }).catch(() => {});
  const dealt = met.spear + met.nova + met.minion;
  return { build, seed, floor: maxFloor, level: maxLevel, kills: met.kills, deaths: met.deaths,
    taken: Math.round(met.taken), spear: Math.round(met.spear), nova: Math.round(met.nova),
    minion: Math.round(met.minion), dealt: Math.round(dealt), framep95: r1(framep95), curve };
}

async function main() {
  log(`■ hs_v189_build — 각 빌드 40점 · 씨앗 ${SEEDS.join("/")} · 각 ${SEC}초 · 창 ${VW}×${VH}\n`);
  const order = ["army", "death", "tough"];
  const all = {};
  for (const b of order) {
    all[b] = [];
    for (let i = 0; i < SEEDS.length; i++) {
      const seed = SEEDS[i];
      errs = [];
      const shot = (b === "army" && i === 0) ? "tmp/v189_army.png"
        : (b === "death" && i === 0) ? "tmp/v189_death.png" : null;
      const r = await runOne(b, seed, shot);
      if (!r) { log(`  ${BUILDS[b].name} 씨앗 ${seed} — 실패`); continue; }
      r.errs = errs.length;
      all[b].push(r);
      const share = s => r.dealt ? Math.round(r[s] / r.dealt * 100) : 0;
      log(`  ${BUILDS[b].name} 씨앗 ${seed}: B${r.floor}층 · 처치 ${r.kills} · 죽음 ${r.deaths} · Lv${r.level}` +
        ` · 낸 ${r.dealt} (뼈창 ${share("spear")}% 폭발 ${share("nova")}% 소환수 ${share("minion")}%)` +
        ` · 받은 ${r.taken} · p95 ${r.framep95}ms · 오류 ${r.errs}`);
    }
  }

  // ── 표: 빌드별 평균(폭) ────────────────────────────────────────────────────
  log(`\n▣ 빌드 비교 (씨앗 ${SEEDS.length}판 평균, 괄호는 폭=최대-최소)`);
  log("빌드    | 도달층 | 처치 | 죽음 | 받은피해 | 낸피해 | 뼈창% | 폭발% | 소환수% | Lv | p95ms");
  const agg = {};
  for (const b of order) {
    const rs = all[b]; if (!rs.length) { log(`${BUILDS[b].name} — 판 없음`); continue; }
    const M = k => mean(rs.map(r => r[k]));
    const dealt = M("dealt") || 1;
    const sh = k => Math.round(mean(rs.map(r => r.dealt ? r[k] / r.dealt * 100 : 0)));
    agg[b] = { floor: M("floor"), kills: M("kills"), deaths: M("deaths"), dealt: M("dealt"),
      spearSh: sh("spear"), novaSh: sh("nova"), minionSh: sh("minion"), level: M("level"), p95: M("framep95") };
    log(`${BUILDS[b].name} | ${r1(M("floor"))}(${rng(rs.map(r=>r.floor))}) | ${r1(M("kills"))}(${rng(rs.map(r=>r.kills))}) | ${r1(M("deaths"))} | ` +
      `${Math.round(M("taken"))} | ${Math.round(M("dealt"))} | ${sh("spear")} | ${sh("nova")} | ${sh("minion")} | ${r1(M("level"))} | ${r1(M("framep95"))}`);
  }

  // ── 판정: 구성이 뒤집히는가 · 처치/층이 10% 안에 모이는가 ──────────────────
  let verdict = { compFlip: false, spread: false, reason: [] };
  if (agg.army && agg.death) {
    const armyLeadsMinion = agg.army.minionSh > agg.death.minionSh && agg.army.minionSh >= Math.max(agg.army.spearSh, agg.army.novaSh);
    const deathLeadsSpearNova = (agg.death.spearSh + agg.death.novaSh) > (agg.army.spearSh + agg.army.novaSh) &&
      (agg.death.spearSh + agg.death.novaSh) > agg.death.minionSh;
    verdict.compFlip = armyLeadsMinion && deathLeadsSpearNova;
    verdict.reason.push(`군세형 소환수몫 ${agg.army.minionSh}% vs 죽음형 ${agg.death.minionSh}% · ` +
      `죽음형 뼈창+폭발 ${agg.death.spearSh + agg.death.novaSh}% vs 군세형 ${agg.army.spearSh + agg.army.novaSh}%`);
  }
  const kills = order.filter(b => agg[b]).map(b => agg[b].kills);
  const floors = order.filter(b => agg[b]).map(b => agg[b].floor);
  const within10 = arr => { const mx = Math.max(...arr), mn = Math.min(...arr); return mx > 0 && (mx - mn) / mx < 0.10; };
  verdict.spread = !(within10(kills) && within10(floors));
  log(`\n판정 — 구성 뒤집힘: ${verdict.compFlip ? "예 ✔" : "아니오 ✘"} · 처치/층 갈림(10% 밖): ${verdict.spread ? "예 ✔" : "아니오 ✘"}`);
  log(`  ${verdict.reason.join("\n  ")}`);
  const diverges = verdict.compFlip || verdict.spread;
  log(`  ▶ ${diverges ? "빌드가 갈린다 ✅" : "빌드가 안 갈린다 ❌ — 계수를 고쳐야 한다"}`);

  // ── 레벨 곡선(씨앗 첫 판) — 병수님 「성장이 너무 쉽다」 ─────────────────────
  log(`\n▣ 레벨 곡선 (씨앗 ${SEEDS[0]}, 5초마다 · 도달층/레벨/번 점수/처치)`);
  for (const b of order) {
    const r = all[b]?.[0]; if (!r) continue;
    const c = r.curve.map(s => `${s.t}s:B${s.floor}/Lv${s.level}/+${s.earned}pt/${s.kills}kill`).join("  ");
    log(`  ${BUILDS[b].name}: ${c}`);
  }

  fs.writeFileSync("tmp/v189_build.json", JSON.stringify({ SEC, SEEDS, all, agg, verdict, diverges }, null, 1));
  log(`\n(자료 tmp/v189_build.json)`);
  return diverges;
}

const diverges = await main();
bws.close();
process.exit(diverges ? 0 : 3);
