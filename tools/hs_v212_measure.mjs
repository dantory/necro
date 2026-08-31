/* hs/ V-212 자 — 「화면의 70% 가 빈 어둠」의 뿌리를 수로 가른다.
 *
 *   node tools/hs_v212_measure.mjs [초] [씨앗들]
 *   node tools/hs_v212_measure.mjs 30 1,2,3        (기본)
 *
 * 왜 (ROADMAP V-212): 컷을 열어 재니 게임 화면(HUD 위 110px·아래 UI 120px 뺀)에서 어두운
 *   (RGB 합 ≤75) 픽셀이 70% 다. 로드맵은 「카메라 클램프가 맵 전체 사각에 걸렸다」고 짐작했지만
 *   그 짐작을 믿지 말고 **다섯 수를 먼저 뽑는다**:
 *     ① 바닥 밀도 — 화면 사각 안에서 방∪복도가 덮는 넓이 비율.
 *     ② 어둠의 정체 — 어두운 픽셀이 방/복도 «밖»(그릴 게 없음)인지 «안»(칠이 너무 어두움)인지.
 *     ③ 클램프 몫 — __CAM_CLAMP false/true 에서 어둠 비율 차이. 작으면 클램프는 범인이 아니다.
 *     ④ 주인공 화면 위치 — 가로/세로 %. (컷에서 25% 로 관찰됨)
 *     ⑤ 소품이 바닥 밖에 있는가 + 어두운(안 밝힌) 바닥 위에 떠 있는가.
 *
 * 재는 법: 씨앗 고정 → 부팅 → 자동조종으로 여러 지점을 지나며 표본을 뽑는다. 각 표본에서
 *   ①④⑤ 는 게임 상태(방·복도·소품·카메라)로 계산하고, ② 는 board 캔버스 픽셀을 실제로 읽어
 *   각 어두운 픽셀을 월드로 되돌려 방/복도 «안/밖»으로 가른다.
 */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const VW = 1512, VH = 863;
const HUD_TOP = 110, UI_BOT = 120;   // 게임 화면 = 이 사이 (로드맵 기준)
const DARK = 75;                     // RGB 합 ≤ 75 = 어두움 (로드맵 기준)
const SEC = +(process.argv[2] || 30);
const SEEDS = (process.argv[3] || "1,2,3").split(",").map((s) => +s);
const TAG = process.env.V212TAG || "";     // 있으면 씨앗별 가장 어두운 프레임을 tmp/hs_v212_${TAG}_{a,b,c}.png 로
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
setTimeout(() => { log("WATCHDOG"); process.exit(9); }, (SEC * SEEDS.length + 900) * 1000);

await ensureChrome({ log, force: false });
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); let errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s }));
  return new Promise((res, rej) => { const to = setTimeout(() => { pend.delete(i); rej(new Error("CDP timeout " + m)); }, 30000);
    pend.set(i, { res: v => { clearTimeout(to); res(v); }, rej: e => { clearTimeout(to); rej(e); } }); }); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "?").slice(0, 160)); });
await new Promise(r => bws.addEventListener("open", r));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const seedSrc = (seed) => `Math.random = (() => { let s = (${seed} >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();`;

// 자동조종 — 팩으로 걸어가 싸운다(v199 를 줄인 판). 여러 지점을 지나며 화면이 갈린다.
const AUTO = `(() => {
  const doc = document, cv = doc.getElementById('board');
  const kd = k => doc.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  const ku = k => doc.dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true }));
  const held = new Set();
  const setKeys = want => { for (const k of held) if (!want.has(k)) { ku(k); held.delete(k); }
    for (const k of want) if (!held.has(k)) { kd(k); held.add(k); } };
  const tap = k => { kd(k); setTimeout(() => ku(k), 40); };
  cv.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: innerWidth / 2, clientY: innerHeight / 2, bubbles: true }));
  const A = { lastQ: 0 };
  function nearestPack(p) { let b = null, bd = 1e18;
    for (const q of G.packs) { if (q.done) continue; const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < bd) { bd = d; b = q; } }
    return b; }
  function tick() {
    const G = window.G; if (!G || !G.player) return requestAnimationFrame(tick);
    if (G.dead) { tap('r'); return requestAnimationFrame(tick); }
    const p = G.player, np = nearestPack(p);
    let tx, ty; if (np) { tx = np.x; ty = np.y; } else { tx = G.stairs.x; ty = G.stairs.y; }
    const dx = tx - p.x, dy = ty - p.y;
    const want = new Set();
    if (Math.hypot(dx, dy) > 120) { if (dx > 40) want.add('d'); else if (dx < -40) want.add('a'); if (dy > 40) want.add('s'); else if (dy < -40) want.add('w'); }
    setKeys(want);
    if (!np && Math.hypot(p.x - G.stairs.x, p.y - G.stairs.y) < 66) tap('f');
    const now = performance.now();
    if (now - A.lastQ > 460) { A.lastQ = now; tap('q'); const cam = window.cam, Z = window.HSZ;
      cv.dispatchEvent(new MouseEvent('mousemove', { clientX: (tx - cam.x) * Z, clientY: (ty - cam.y) * Z, bubbles: true })); }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})()`;

// 한 표본 — 게임 상태로 ①④⑤, 캔버스 픽셀로 ②. STEP 픽셀 간격으로 훑는다(빠르게).
const SAMPLE = `(() => {
  const G = window.G, cam = window.cam, Z = window.HSZ;
  const VW = innerWidth, VH = innerHeight, STEP = 3;
  const g = document.getElementById('board').getContext('2d', { willReadFrequently: true });
  const x0 = 0, x1 = VW, y0 = ${HUD_TOP}, y1 = VH - ${UI_BOT};
  const rects = G.rooms.concat(G.corridors);
  const inFloor = (wx, wy) => { for (const r of rects) if (wx >= r.x && wx < r.x + r.w && wy >= r.y && wy < r.y + r.h) return r; return null; };
  const data = g.getImageData(x0, y0, x1 - x0, y1 - y0).data;
  const W = x1 - x0;
  let total = 0, dark = 0, darkOut = 0, darkIn = 0, darkUnvis = 0, floorPx = 0;
  for (let sy = y0; sy < y1; sy += STEP) for (let sx = x0; sx < x1; sx += STEP) {
    const i = ((sy - y0) * W + (sx - x0)) * 4;
    const sum = data[i] + data[i + 1] + data[i + 2];
    const wx = cam.x + sx / Z, wy = cam.y + sy / Z;
    const r = inFloor(wx, wy);
    total++; if (r) floorPx++;
    if (sum <= ${DARK}) { dark++; if (r) { darkIn++; if (r.cx !== undefined && !r.visited) darkUnvis++; } else darkOut++; }
  }
  // ④ 주인공 화면 위치 %
  const p = G.player;
  const px = ((p.x - cam.x) * Z) / VW * 100, py = ((p.y - cam.y) * Z) / VH * 100;
  // ⑤ 화면 안 소품 — 바닥 밖 개수 · 안 밝힌(어두운) 방 위 개수
  let propScreen = 0, propOutFloor = 0, propOnUnvis = 0;
  for (const pr of (G.props || [])) {
    const ssx = (pr.x - cam.x) * Z, ssy = (pr.y - cam.y) * Z;
    if (ssx < 0 || ssx > VW || ssy < y0 || ssy > y1) continue;
    propScreen++;
    const r = inFloor(pr.x, pr.y);
    if (!r) propOutFloor++; else if (r.cx !== undefined && !r.visited) propOnUnvis++;
  }
  return { total, dark, darkOut, darkIn, darkUnvis, floorPx, px, py, propScreen, propOutFloor, propOnUnvis };
})()`;

const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const r1 = n => Math.round(n * 10) / 10;

async function runOne(seed, clamp, key) {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
  await S("Page.enable"); await S("Runtime.enable");
  await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc(seed) + `;globalThis.__FOE_DMG=0;globalThis.__CAM_CLAMP=${clamp};` });
  await S("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
  await S("Page.navigate", { url: URL });
  let booted = false;
  for (let i = 0; i < 60; i++) { await sleep(300);
    if (await ev(`!!(window.G && G.player && window.HSZ && document.getElementById('loading').style.display === 'none')`)) { booted = true; break; } }
  if (!booted) { log("부팅 실패"); await raw("Target.closeTarget", { targetId }).catch(() => {}); return null; }
  await sleep(1000);   // 에셋
  await ev(AUTO);
  const t0 = Date.now(); const S_ = [];
  let worst = -1, worstShot = null;
  while (Date.now() - t0 < SEC * 1000) {
    await sleep(1500);
    const s = await ev(SAMPLE); if (!s) continue;
    s.darkPct = s.dark / s.total * 100; s.floorPct = s.floorPx / s.total * 100;
    S_.push(s);
    if (TAG && key && s.darkPct > worst) { worst = s.darkPct;
      const r = await S("Page.captureScreenshot", { format: "png" }); worstShot = Buffer.from(r.data, "base64"); }
  }
  if (TAG && key && worstShot) { fs.writeFileSync(`tmp/hs_v212_${TAG}_${key}.png`, worstShot); log(`  컷 tmp/hs_v212_${TAG}_${key}.png (어둠 ${r1(worst)}%)`); }
  await raw("Target.closeTarget", { targetId }).catch(() => {});
  if (!S_.length) return null;
  return {
    seed, clamp, n: S_.length,
    darkPct: r1(avg(S_.map(x => x.darkPct))),
    floorPct: r1(avg(S_.map(x => x.floorPct))),
    darkOutPct: r1(avg(S_.map(x => x.darkOut / x.total * 100))),
    darkInPct: r1(avg(S_.map(x => x.darkIn / x.total * 100))),
    darkUnvisPct: r1(avg(S_.map(x => x.darkUnvis / x.total * 100))),
    pxMed: r1(median(S_.map(x => x.px))), pyMed: r1(median(S_.map(x => x.py))),
    propScreenMed: median(S_.map(x => x.propScreen)),
    propOutFloor: S_.reduce((a, x) => a + x.propOutFloor, 0),
    propOnUnvis: S_.reduce((a, x) => a + x.propOnUnvis, 0),
    propScreenTot: S_.reduce((a, x) => a + x.propScreen, 0),
  };
}

async function main() {
  log(`■ hs_v212_measure — 씨앗 ${SEEDS.join("/")} · 각 ${SEC}초 · 창 ${VW}×${VH} · 게임화면 y[${HUD_TOP}..${VH - UI_BOT}] · 어둠 RGB합≤${DARK}`);
  const on = [];
  const keys = ["a", "b", "c"];
  for (let i = 0; i < SEEDS.length; i++) {
    const r = await runOne(SEEDS[i], true, keys[i]);
    if (!r) { log(`  씨앗 ${SEEDS[i]} 실패`); continue; }
    on.push(r);
    log(`  씨앗 ${r.seed} [clamp on] 표본 ${r.n}: 어둠 ${r.darkPct}% (밖 ${r.darkOutPct}% · 안 ${r.darkInPct}% [그중 안밝힌방 ${r.darkUnvisPct}%]) · 바닥밀도 ${r.floorPct}% · 주인공 ${r.pxMed}%,${r.pyMed}% · 소품/화면 ${r.propScreenMed}(바닥밖 ${r.propOutFloor}·안밝힌방위 ${r.propOnUnvis}/${r.propScreenTot})`);
  }
  // ③ 클램프 몫 — 씨앗 1 만 off 로 한 판 더.
  const off = await runOne(SEEDS[0], false, null);
  if (off) log(`  씨앗 ${off.seed} [clamp OFF] 어둠 ${off.darkPct}% · 바닥밀도 ${off.floorPct}% · 주인공 ${off.pxMed}%,${off.pyMed}%`);

  if (on.length) {
    log(`\n▣ 요약 (clamp on 평균)`);
    log(`  ① 바닥 밀도       ${r1(avg(on.map(r => r.floorPct)))}%`);
    log(`  ② 어둠 ${r1(avg(on.map(r => r.darkPct)))}% = 바닥밖 ${r1(avg(on.map(r => r.darkOutPct)))}% + 바닥안 ${r1(avg(on.map(r => r.darkInPct)))}% (안밝힌방 ${r1(avg(on.map(r => r.darkUnvisPct)))}%)`);
    log(`  ④ 주인공 화면 위치 가로 ${r1(median(on.map(r => r.pxMed)))}% · 세로 ${r1(median(on.map(r => r.pyMed)))}%  (가운데=50)`);
    const pTot = on.reduce((a, r) => a + r.propScreenTot, 0), pOut = on.reduce((a, r) => a + r.propOutFloor, 0), pUn = on.reduce((a, r) => a + r.propOnUnvis, 0);
    log(`  ⑤ 소품 ${pTot}개 중 바닥밖 ${pOut}(${r1(pOut / pTot * 100)}%) · 안밝힌방 위 ${pUn}(${r1(pUn / pTot * 100)}%)`);
    if (off) log(`  ③ 클램프 몫 (씨앗 ${off.seed}): 어둠 on ${on.find(r => r.seed === off.seed)?.darkPct}% vs off ${off.darkPct}% (차 ${r1((on.find(r => r.seed === off.seed)?.darkPct || 0) - off.darkPct)}%p)`);
  }
  fs.writeFileSync(`tmp/hs_v212_measure${TAG ? "_" + TAG : ""}.json`, JSON.stringify({ SEC, SEEDS, on, off }, null, 1));
  log(`  ▸ tmp/hs_v212_measure${TAG ? "_" + TAG : ""}.json`);
}
await main();
bws.close();
process.exit(0);
