/* V-185 「떠오르는 글(floats)이 화면 한복판을 덮는다」의 자 — 고치기 전/후를 같은 판으로 잰다.
 *
 *   node tools/hs_v185_floats.mjs [before|after] [초] [씨앗들]
 *   node tools/hs_v185_floats.mjs before 60 1,2,3     (기본)
 *
 * 왜: V-184 를 닫고 컷을 열어 보니 화면을 제일 크게 덮는 건 이름표가 아니라 «흰 피해
 * 숫자»였다(상한 60). 손대기 전에 자부터 박는다 — 짐작으로 고치면 고쳤는지 못 잰다.
 *
 * ★ 자동조종은 V-183 밀도 자(hs_v183_density.mjs)의 것을 «그대로» 떼어 쓴다(V-184 와 같다) —
 *   다른 자로 굴리면 다른 판을 보는 셈이라 전/후를 못 견준다. 밀고 들어가 떼를 몰살하면
 *   피해 숫자가 사람 위에 통째로 쌓이고, 그게 float 이 겹치는 자리다.
 *
 * 0.5초마다 재는 것:
 *   ① 덮음률 — 사람 화면좌표 ±200px 사각 안에서 float «글자» 사각이 덮는 화소 비율(%).
 *      겹친 사각은 100×100 격자 합집합으로 세 이중 계상하지 않는다.
 *      글자 폭은 실제 폰트(16px / big 26px 'Times New Roman')로 ctx.measureText — 짐작 폭 금지.
 *   ② 동시 float 개수 — «피해 숫자»(f.dmg)와 «알림 글»(그 밖) 따로 p50·p95·최대
 *   ③ __prof.summary() 의 frame p95
 * 끝에 콘솔 오류·몰살이 일어났는지(kills). */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const VW = 1512, VH = 863;
const LABEL = (process.argv[2] || "before").toLowerCase();
const SEC = +(process.argv[3] || 60);
const SEEDS = (process.argv[4] || "1,2,3").split(",").map(s => +s.trim()).filter(Boolean);
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
setTimeout(() => { log("WATCHDOG"); process.exit(9); }, (SEC * SEEDS.length + 150) * 1000);

await ensureChrome({ log, force: false });
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s }));
  return new Promise((res, rej) => { const to = setTimeout(() => { pend.delete(i); rej(new Error("CDP timeout " + m)); }, 30000);
    pend.set(i, { res: v => { clearTimeout(to); res(v); }, rej: e => { clearTimeout(to); rej(e); } }); }); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || "?").slice(0, 160)); });
await new Promise(r => bws.addEventListener("open", r));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const median = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return !n ? 0 : n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

const seedSrc = (seed) => `Math.random = (() => { let s = (${seed} >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();`;

/* 자동조종은 V-183 밀도 자의 것을 그대로 떼어 쓴다(V-184 와 같은 방법). */
const DENS = fs.readFileSync("tools/hs_v183_density.mjs", "utf8");
const AUTO = (() => { const a = DENS.indexOf("const AUTO = `") + "const AUTO = `".length;
  const b = DENS.indexOf("`;", a); return DENS.slice(a, b); })();
if (!/requestAnimationFrame\(tick\)/.test(AUTO)) { log("자동조종을 못 떼어냈다"); process.exit(1); }

/* 한 표본 — float 개수(피해/알림 따로)·덮음률(사람 ±200px 사각 안 «글자» 합집합 화소 %).
 * 글자 사각: textAlign center · baseline sy → x∈[sx−w/2, sx+w/2], y∈[sy−h, sy+4]. */
const SAMPLE = `(() => {
  const G = window.G, cam = window.cam, Z = window.HSZ;
  if (!G || !G.player) return null;
  const mc = window.__mc || (window.__mc = document.createElement('canvas'));
  const c = mc.getContext('2d');
  const px = (G.player.x - cam.x) * Z, py = (G.player.y - cam.y) * Z;
  const R = 200, bx0 = px - R, by0 = py - R, box = R * 2, N = 100, cell = box / N;
  const grid = new Uint8Array(N * N), gridD = new Uint8Array(N * N), gridN = new Uint8Array(N * N);
  let dmg = 0, note = 0;
  for (const f of G.floats) {
    if (!f.txt) continue;
    const isD = !!f.dmg; if (isD) dmg++; else note++;
    const big = !!f.big, sz = big ? 26 : (f.sz || 16);
    c.font = (big ? "bold " : "") + sz + "px 'Times New Roman',serif";
    const w = c.measureText(f.txt).width, h = sz;
    const sx = (f.x - cam.x) * Z, sy = (f.y - cam.y) * Z;
    const x0 = Math.max(bx0, sx - w / 2), y0 = Math.max(by0, sy - h);
    const x1 = Math.min(bx0 + box, sx + w / 2), y1 = Math.min(by0 + box, sy + 4);
    if (x1 <= x0 || y1 <= y0) continue;
    const gx0 = Math.max(0, Math.floor((x0 - bx0) / cell)), gx1 = Math.min(N, Math.ceil((x1 - bx0) / cell));
    const gy0 = Math.max(0, Math.floor((y0 - by0) / cell)), gy1 = Math.min(N, Math.ceil((y1 - by0) / cell));
    for (let gy = gy0; gy < gy1; gy++) for (let gx = gx0; gx < gx1; gx++) { grid[gy * N + gx] = 1; (isD ? gridD : gridN)[gy * N + gx] = 1; }
  }
  let covered = 0, cD = 0, cN = 0;
  for (let i = 0; i < grid.length; i++) { covered += grid[i]; cD += gridD[i]; cN += gridN[i]; }
  return { dmg, note, cov: +(covered / (N * N) * 100).toFixed(2),
    covD: +(cD / (N * N) * 100).toFixed(2), covN: +(cN / (N * N) * 100).toFixed(2), kills: G.kills };
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
  let booted = false;
  for (let i = 0; i < 60; i++) { await sleep(300);
    if (await ev(`!!(window.G && G.player && window.HSZ && document.getElementById('loading').style.display === 'none')`)) { booted = true; break; } }
  if (!booted) { log(`  씨앗 ${seed} — 부팅 실패`); await raw("Target.closeTarget", { targetId }).catch(() => {}); return null; }

  await S("Runtime.evaluate", { expression: AUTO });
  const covs = [], covDs = [], covNs = [], dmgs = [], notes = [];
  const t0 = Date.now();
  while (Date.now() - t0 < SEC * 1000) {
    const r = await ev(SAMPLE);
    if (r) { covs.push(r.cov); covDs.push(r.covD); covNs.push(r.covN); dmgs.push(r.dmg); notes.push(r.note); }
    await sleep(500);
  }
  const prof = await ev(`window.__prof && window.__prof.summary ? window.__prof.summary() : null`);
  const kills = await ev(`window.G ? window.G.kills : 0`);
  await raw("Target.closeTarget", { targetId }).catch(() => {});
  return { seed, n: covs.length, covs, covDs, covNs, dmgs, notes, kills, framep95: prof?.phase?.total?.p95 ?? 999 };
}

log(`■ hs_v185_floats [${LABEL.toUpperCase()}] — ${SEC}초 · 씨앗 ${SEEDS.join("·")} · 창 ${VW}×${VH}\n`);
const rows = [];
for (const seed of SEEDS) {
  const r = await runSeed(seed);
  if (!r) continue;
  rows.push(r);
  log(`씨앗 ${r.seed}  덮음률 p50 ${pct(r.covs, 0.5)}% · p95 ${pct(r.covs, 0.95)}% · 최대 ${Math.max(0, ...r.covs)}%` +
    ` (피해 p50 ${pct(r.covDs, 0.5)}/p95 ${pct(r.covDs, 0.95)}% · 알림 p50 ${pct(r.covNs, 0.5)}/p95 ${pct(r.covNs, 0.95)}%)` +
    `   피해숫자 p50 ${pct(r.dmgs, 0.5)}/p95 ${pct(r.dmgs, 0.95)}/최대 ${Math.max(0, ...r.dmgs)}` +
    `   알림글 p50 ${pct(r.notes, 0.5)}/p95 ${pct(r.notes, 0.95)}/최대 ${Math.max(0, ...r.notes)}` +
    `   처치 ${r.kills}   frame p95 ${r.framep95}ms`);
}
if (!rows.length) { log("\n표본 0 — 전부 부팅 실패"); bws.close(); process.exit(1); }

const allCov = rows.flatMap(r => r.covs), allCovD = rows.flatMap(r => r.covDs), allCovN = rows.flatMap(r => r.covNs);
const allDmg = rows.flatMap(r => r.dmgs), allNote = rows.flatMap(r => r.notes);
const T = {
  covP50: pct(allCov, 0.5), covP95: pct(allCov, 0.95), covMax: Math.max(0, ...allCov),
  covDP50: pct(allCovD, 0.5), covDP95: pct(allCovD, 0.95), covNP50: pct(allCovN, 0.5), covNP95: pct(allCovN, 0.95),
  dmgP50: pct(allDmg, 0.5), dmgP95: pct(allDmg, 0.95), dmgMax: Math.max(0, ...allDmg),
  noteP50: pct(allNote, 0.5), noteP95: pct(allNote, 0.95), noteMax: Math.max(0, ...allNote),
  framep95: median(rows.map(r => r.framep95)),
  kills: rows.reduce((a, r) => a + r.kills, 0),
};
log(`\n▣ 씨앗 ${rows.length}개 합산 [${LABEL.toUpperCase()}]`);
log(`  덮음률(±200px) — p50 ${T.covP50}% · p95 ${T.covP95}% · 최대 ${T.covMax}%`);
log(`    ├ 피해숫자분 — p50 ${T.covDP50}% · p95 ${T.covDP95}%`);
log(`    └ 알림글분 — p50 ${T.covNP50}% · p95 ${T.covNP95}%`);
log(`  동시 피해숫자 — p50 ${T.dmgP50} · p95 ${T.dmgP95} · 최대 ${T.dmgMax}`);
log(`  동시 알림글 — p50 ${T.noteP50} · p95 ${T.noteP95} · 최대 ${T.noteMax}`);
log(`  frame p95 ${T.framep95}ms (예산 ≤16.7)   ·   처치 합 ${T.kills}`);
log(`  콘솔 오류 ${errs.length}${errs.length ? " — " + errs.slice(0, 3).join(" | ") : ""}`);
fs.writeFileSync(`tmp/v185_${LABEL}.json`, JSON.stringify({ label: LABEL, T, rows, errs }, null, 1));
bws.close();
process.exit(0);
