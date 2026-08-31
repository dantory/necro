/* hs/ V-215 자 — 방·복도 «밖»의 「던전 암반」이 벽지인가를 수로 가른다.
 *
 *   node tools/hs_v215_rock.mjs [초] [씨앗들] [before|after]
 *   node tools/hs_v215_rock.mjs 18 7,21,33 before   (기본)
 *
 * 왜 (ROADMAP V-215): 배포 컷을 1:1 로 확대해 보니 방·복도 밖의 검정을 채운 「암반」이
 *   «벽 타일을 격자로 도장 찍은 벽지»로 읽힌다 — 칸이 픽셀 단위로 똑같고(돌림·뒤집기 없음),
 *   96px 마다 되풀이하며, 칸 사이에 검은 이음매 줄이 자로 그은 듯 규칙적이다.
 *   V-176 이 **바닥**에서 잡은 병(`buildFloorPat`, 4×4×돌림·뒤집기로 주기 32→128)과 같은 것.
 *   그 자(`tools/hs_flatruler.py` — 한 칸 민 자기 자신과의 상관)를 **암반**으로 옮겨 잰다.
 *
 * 두 눈금 (통과선):
 *   ㉠ 되풀이 상관 — 암반 화소를 x·y 로 패턴 주기(96px×Z)만큼 민 자기 자신과의 상관계수.
 *      빛의 기울기는 국부평균(box-blur)을 빼서 지운다. 통과선 **≤ 0.55**.
 *   ㉡ 검은 이음매 — 암반의 행/열별 평균밝기(고역통과)를 96px×Z 주기로 잰 자기상관 봉우리.
 *      통과선 **봉우리 < 0.30**.
 *   ★ 바닥이 문턱에서 먼지 확인 — 같은 자로 «바닥» 화소(방 안, 벽·주인공서 뗌)도 잰다.
 *      바닥은 V-176 이 이미 끊었으니 낮게 나와야 한다(안 그러면 자가 고장).
 *   ★ 분모(고른 암반 화소 수)를 반드시 로그에 찍는다 — 관측 0 으로 통과라 안 적는다.
 *
 * 컷: 씨앗별 가장 암반이 많은 프레임을 tmp/v215_${TAG}_s${seed}.png 로,
 *     그 프레임의 암반 밀집 구역을 1:1 로 잘라 tmp/v215_${TAG}_crop_s${seed}.png 로 저장.
 */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const VW = 1512, VH = 863;
const HUD_TOP = 110, UI_BOT = 120;
const SEC = +(process.argv[2] || 18);
const SEEDS = (process.argv[3] || "7,21,33").split(",").map((s) => +s);
const TAG = process.argv[4] || "before";
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

// 자동조종 — 팩으로 걸어가 싸운다(v212 의 것 그대로). 여러 지점을 지나며 암반이 갈린다.
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
    for (const q of window.G.packs) { if (q.done) continue; const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < bd) { bd = d; b = q; } }
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

// 한 프레임을 재는 자 — board 픽셀을 읽어 암반/바닥 화소를 게임상태로 가르고,
// 되풀이 상관(㉠)·이음매 주기성(㉡)을 페이지 안에서 계산해 수만 돌려준다.
const MEASURE = `(() => {
  const G = window.G, cam = window.cam, Z = window.HSZ;
  const x0 = 0, y0 = ${HUD_TOP}, x1 = innerWidth, y1 = innerHeight - ${UI_BOT};
  const W = x1 - x0, H = y1 - y0;
  const g = document.getElementById('board').getContext('2d', { willReadFrequently: true });
  const data = g.getImageData(x0, y0, W, H).data;
  const N = W * H;
  const lum = new Float64Array(N);
  for (let k = 0; k < N; k++) lum[k] = 0.299 * data[k*4] + 0.587 * data[k*4+1] + 0.114 * data[k*4+2];
  const WT = 15, WTOP = 30;
  const rooms = G.rooms, cors = G.corridors;
  // 방은 벽(WT 옆·WTOP 위·WT 아래)만큼 넓혀 뺀다 — 그 위를 벽이 덮는다(stoneRim 과 같은 사각).
  const inRoomExp = (wx, wy) => { for (const r of rooms) if (wx >= r.x - WT && wx < r.x + r.w + WT && wy >= r.y - WTOP && wy < r.y + r.h + WT) return true; return false; };
  const inCorExp = (wx, wy) => { for (const r of cors) if (wx >= r.x - WT && wx < r.x + r.w + WT && wy >= r.y - WT && wy < r.y + r.h + WT) return true; return false; };
  // 방 «안»(벽에서 M 뗌) — 바닥 대조군.
  const M = 22;
  const inRoomIn = (wx, wy) => { for (const r of rooms) if (wx >= r.x + M && wx < r.x + r.w - M && wy >= r.y + M && wy < r.y + r.h - M) return true; return false; };
  // 화면 위 산 것(주인공·적·소품) 근처는 둘 다에서 뺀다.
  const boxes = [];
  const pushBox = (wx, wy, pad) => { const sx = (wx - cam.x) * Z, sy = (wy - cam.y) * Z; boxes.push([sx - pad, sy - pad, sx + pad, sy + pad]); };
  pushBox(G.player.x, G.player.y, 60);
  for (const pk of G.packs) for (const m of pk.enemies) if (m.alive) pushBox(m.x, m.y, 45);
  for (const pr of (G.props || [])) pushBox(pr.x, pr.y, 45);
  const nearLiving = (gx, gy) => { for (const b of boxes) if (gx >= b[0] && gx <= b[2] && gy >= b[1] && gy <= b[3]) return true; return false; };
  const rock = new Uint8Array(N), floor = new Uint8Array(N);
  let rockPx = 0, floorPx = 0;
  for (let sy = 0; sy < H; sy++) for (let sx = 0; sx < W; sx++) {
    const gx = x0 + sx, gy = y0 + sy;
    const wx = cam.x + gx / Z, wy = cam.y + gy / Z;
    if (nearLiving(gx, gy)) continue;
    const inR = inRoomExp(wx, wy), inC = inCorExp(wx, wy);
    if (!inR && !inC) { rock[sy*W+sx] = 1; rockPx++; }
    else if (inRoomIn(wx, wy)) { floor[sy*W+sx] = 1; floorPx++; }
  }
  // 고역통과 — SAT 로 반지름 R 국부평균을 빼 빛의 기울기를 지운다.
  const R = 16;
  const sat = new Float64Array((W+1)*(H+1));
  for (let y = 0; y < H; y++) { let row = 0; for (let x = 0; x < W; x++) { row += lum[y*W+x]; sat[(y+1)*(W+1)+(x+1)] = sat[y*(W+1)+(x+1)] + row; } }
  const boxMean = (x, y) => { const xb1 = Math.min(W, x+R+1), yb1 = Math.min(H, y+R+1), xb0 = Math.max(0, x-R), yb0 = Math.max(0, y-R);
    const s = sat[yb1*(W+1)+xb1] - sat[yb0*(W+1)+xb1] - sat[yb1*(W+1)+xb0] + sat[yb0*(W+1)+xb0];
    return s / ((xb1-xb0)*(yb1-yb0)); };
  const hp = new Float64Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) hp[y*W+x] = lum[y*W+x] - boxMean(x, y);
  // ㉠ 되풀이 상관 — 주기 P 언저리(정수 시프트 ±3)에서 최댓값을 취한다(Z 가 정수 아님).
  function corrShift(mask, dx, dy) {
    let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    for (let y = 0; y + dy < H; y++) for (let x = 0; x + dx < W; x++) {
      const a = y*W+x, b = (y+dy)*W+(x+dx);
      if (!mask[a] || !mask[b]) continue;
      const va = hp[a], vb = hp[b];
      n++; sx += va; sy += vb; sxx += va*va; syy += vb*vb; sxy += va*vb;
    }
    if (n < 1500) return { r: null, n };
    const mx = sx/n, my = sy/n, cov = sxy/n - mx*my, vx = sxx/n - mx*mx, vy = syy/n - my*my;
    return { r: (vx > 0 && vy > 0) ? cov / Math.sqrt(vx*vy) : 0, n };
  }
  function repeat(mask, P) {
    let bx = { r: -2, n: 0 }, by = { r: -2, n: 0 };
    for (let d = Math.round(P) - 3; d <= Math.round(P) + 3; d++) {
      const rx = corrShift(mask, d, 0); if (rx.r != null && rx.r > bx.r) bx = rx;
      const ry = corrShift(mask, 0, d); if (ry.r != null && ry.r > by.r) by = ry;
    }
    const rep = (bx.r > -2 && by.r > -2) ? (bx.r + by.r) / 2 : (bx.r > -2 ? bx.r : (by.r > -2 ? by.r : null));
    return { rep, repX: bx.r > -2 ? bx.r : null, repXn: bx.n, repY: by.r > -2 ? by.r : null, repYn: by.n };
  }
  // ㉡ 이음매 주기성 — 행/열별 평균 hp 의 자기상관 봉우리(주기 P 언저리 ±4).
  function seam(mask, P) {
    const colSum = new Float64Array(W), colCnt = new Float64Array(W);
    const rowSum = new Float64Array(H), rowCnt = new Float64Array(H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mask[y*W+x]) { const v = hp[y*W+x]; colSum[x] += v; colCnt[x]++; rowSum[y] += v; rowCnt[y]++; }
    function ac(sum, cnt, len) {
      const minCnt = 20; const prof = new Float64Array(len), valid = new Uint8Array(len);
      let m = 0, c = 0;
      for (let i = 0; i < len; i++) if (cnt[i] >= minCnt) { prof[i] = sum[i]/cnt[i]; valid[i] = 1; m += prof[i]; c++; }
      if (c < 50) return null; m /= c;
      function at(lag) { let n = 0, num = 0, da = 0, db = 0;
        for (let i = 0; i + lag < len; i++) if (valid[i] && valid[i+lag]) { const a = prof[i]-m, b = prof[i+lag]-m; num += a*b; da += a*a; db += b*b; n++; }
        if (n < 30 || da <= 0 || db <= 0) return null; return num / Math.sqrt(da*db); }
      let best = -2; for (let L = Math.round(P) - 4; L <= Math.round(P) + 4; L++) { const v = at(L); if (v != null && v > best) best = v; }
      return best > -2 ? best : null;
    }
    return { col: ac(colSum, colCnt, W), row: ac(rowSum, rowCnt, H) };
  }
  // 암반 밀집 200×200 창(1:1 크롭용) — mask SAT 로 최대 밀도 구역을 찾는다.
  const CW = 200, CH = 200;
  const msat = new Float64Array((W+1)*(H+1));
  for (let y = 0; y < H; y++) { let row = 0; for (let x = 0; x < W; x++) { row += rock[y*W+x]; msat[(y+1)*(W+1)+(x+1)] = msat[y*(W+1)+(x+1)] + row; } }
  let bestDen = -1, cropX = 0, cropY = 0;
  for (let y = 0; y + CH <= H; y += 20) for (let x = 0; x + CW <= W; x += 20) {
    const s = msat[(y+CH)*(W+1)+(x+CW)] - msat[y*(W+1)+(x+CW)] - msat[(y+CH)*(W+1)+x] + msat[y*(W+1)+x];
    if (s > bestDen) { bestDen = s; cropX = x; cropY = y; }
  }
  const Prock = 96 * Z, Pfloor = 32 * Z;   // 암반 판 96px · 바닥 타일 32px (둘 다 월드px×Z)
  const rRock = repeat(rock, Prock), sRock = seam(rock, Prock);
  const rFloor = repeat(floor, Pfloor), sFloor = seam(floor, Pfloor);
  return {
    W, H, Z, Prock, Pfloor, rockPx, floorPx,
    rock: { rep: rRock.rep, repX: rRock.repX, repY: rRock.repY, repXn: rRock.repXn, repYn: rRock.repYn, seamCol: sRock.col, seamRow: sRock.row },
    floor: { rep: rFloor.rep, repX: rFloor.repX, repY: rFloor.repY, seamCol: sFloor.col, seamRow: sFloor.row },
    crop: { x: x0 + cropX, y: y0 + cropY, w: CW, h: CH, dens: bestDen / (CW*CH) },
  };
})()`;

const r3 = n => (n == null ? "—" : Math.round(n * 1000) / 1000);

async function runOne(seed) {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
  await S("Page.enable"); await S("Runtime.enable");
  await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc(seed) + `;globalThis.__FOE_DMG=0;` });
  await S("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
  await S("Page.navigate", { url: URL });
  let booted = false;
  for (let i = 0; i < 60; i++) { await sleep(300);
    if (await ev(`!!(window.G && G.player && window.HSZ && document.getElementById('loading').style.display === 'none')`)) { booted = true; break; } }
  if (!booted) { log(`  씨앗 ${seed} 부팅 실패`); await raw("Target.closeTarget", { targetId }).catch(() => {}); return null; }
  await sleep(1200);   // 에셋(wall.png 로 bedrockPat 굽기)
  await ev(AUTO);
  const t0 = Date.now();
  let best = null, bestShot = null;
  while (Date.now() - t0 < SEC * 1000) {
    await sleep(1500);
    const shot = await S("Page.captureScreenshot", { format: "png" });
    const mm = await ev(MEASURE);
    if (!mm) continue;
    if (!best || mm.rockPx > best.rockPx) { best = mm; bestShot = Buffer.from(shot.data, "base64"); }
  }
  let cropBuf = null;
  if (best) {
    fs.writeFileSync(`tmp/v215_${TAG}_s${seed}.png`, bestShot);
    const cr = await S("Page.captureScreenshot", { format: "png", clip: { x: best.crop.x, y: best.crop.y, width: best.crop.w, height: best.crop.h, scale: 1 } });
    cropBuf = Buffer.from(cr.data, "base64");
    fs.writeFileSync(`tmp/v215_${TAG}_crop_s${seed}.png`, cropBuf);
  }
  await raw("Target.closeTarget", { targetId }).catch(() => {});
  return best;
}

const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;

async function main() {
  log(`■ hs_v215_rock [${TAG}] — 씨앗 ${SEEDS.join("/")} · 각 ${SEC}초 · 창 ${VW}×${VH}`);
  log(`  ㉠ 되풀이 상관 통과선 ≤0.55 · ㉡ 이음매 봉우리 통과선 <0.30 · (바닥은 대조군, 낮아야 자가 성함)`);
  const rows = [];
  for (const seed of SEEDS) {
    const r = await runOne(seed);
    if (!r) continue;
    rows.push({ seed, ...r });
    log(`  씨앗 ${seed}: 암반화소 ${r.rockPx} · Z ${r3(r.Z)} · 판주기 ${r3(r.Prock)}px`);
    log(`    암반 ㉠ 되풀이 ${r3(r.rock.rep)} (x ${r3(r.rock.repX)}/${r.rock.repXn} · y ${r3(r.rock.repY)}/${r.rock.repYn})  ㉡ 이음매 열 ${r3(r.rock.seamCol)} · 행 ${r3(r.rock.seamRow)}`);
    log(`    바닥 대조 ${r.floorPx}px: ㉠ 되풀이 ${r3(r.floor.rep)}  ㉡ 이음매 열 ${r3(r.floor.seamCol)} · 행 ${r3(r.floor.seamRow)}  (crop 밀도 ${r3(r.crop.dens)})`);
  }
  if (rows.length) {
    const rockRep = avg(rows.map(r => r.rock.rep).filter(v => v != null));
    const seamCol = avg(rows.map(r => r.rock.seamCol).filter(v => v != null));
    const seamRow = avg(rows.map(r => r.rock.seamRow).filter(v => v != null));
    const seamPk = Math.max(seamCol ?? -1, seamRow ?? -1);
    const floorRep = avg(rows.map(r => r.floor.rep).filter(v => v != null));
    const totRock = rows.reduce((a, r) => a + r.rockPx, 0);
    log(`\n▣ 요약 [${TAG}] (씨앗 평균 · 분모 암반화소 합 ${totRock})`);
    log(`  ㉠ 암반 되풀이 상관 ${r3(rockRep)}   (통과선 ≤0.55 → ${rockRep <= 0.55 ? "통과" : "미달"})`);
    log(`  ㉡ 암반 이음매 봉우리 ${r3(seamPk)} (열 ${r3(seamCol)}·행 ${r3(seamRow)}) (통과선 <0.30 → ${seamPk < 0.30 ? "통과" : "미달"})`);
    log(`  · 바닥 대조군 되풀이 ${r3(floorRep)} — 낮으면(≪0.55) 자가 문턱에서 멀어 성하다`);
    fs.writeFileSync(`tmp/hs_v215_rock_${TAG}.json`, JSON.stringify({ SEC, SEEDS, rows, summary: { rockRep, seamCol, seamRow, seamPk, floorRep, totRock } }, null, 1));
    log(`  ▸ tmp/hs_v215_rock_${TAG}.json · 컷 tmp/v215_${TAG}_s*.png · 크롭 tmp/v215_${TAG}_crop_s*.png`);
  } else log("  판 없음");
}
await main();
bws.close();
process.exit(0);
