/* hs/ V-204 자 — 「화면을 코드 도형이 얼마나 덮나」를 잰다.
 *
 *   node tools/hs_v204_paint.mjs [seed] [floor] [frames]
 *   node tools/hs_v204_paint.mjs 1 1 90        (기본 — 씨앗1 · 층1 · 90프레임)
 *
 * 왜 (ROADMAP V-204 ★): 벽·바닥이 «있는 에셋»이 아니라 코드 그라디언트/fillRect 다.
 *   「또 코드로 때웠나」를 다음에 바로 잡으려면 수가 있어야 한다. 그래서 한 프레임 동안
 *   CanvasRenderingContext2D 의 fillRect(코드)·drawImage(에셋) 가 «덮은 픽셀 넓이»를
 *   각각 합산해 비율을 낸다. 넓이는 그때의 변환행렬(det)로 기기픽셀 기준으로 환산한다 —
 *   월드는 setTransform(Z…) 아래서 그려지므로 그 배율을 넣어야 공정하다.
 *
 * ★ fill()/stroke() 경로칠(작은 FX·파티클)은 넓이를 안 잰다(경로 bbox 추적은 무겁다) —
 *   대신 «부른 횟수»만 세어 보고에 남긴다. 벽·바닥·물들이기·그림자는 전부 fillRect 라
 *   이 자가 노리는 «판을 덮는 코드»는 fillRect vs drawImage 로 다 잡힌다.
 *   두 번(before/after)을 같은 자로 재 델타를 본다([[cause-written-in-the-item-is-a-guess]]).
 */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
import fs from "node:fs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const SEED = +(process.argv[2] || 1);
const FLOOR = +(process.argv[3] || 1);
const FRAMES = +(process.argv[4] || 90);
const VW = 1512, VH = 863;
const log = (...a) => process.stdout.write(a.join(" ") + "\n");
setTimeout(() => { log("WATCHDOG"); process.exit(9); }, 180000);

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

// 한 프레임 동안 «판을 덮은 넓이»를 코드 도형과 에셋으로 갈라 합산한다. 넓이는 변환행렬(det)로
// 기기픽셀 기준으로 환산한다(월드는 setTransform(Z…) 아래서 그려지므로).
// ★ 핵심: fillRect 라도 fillStyle 이 «이미지에서 구운 CanvasPattern»이면 그건 코드가 아니라 에셋이다
//   (벽·바닥은 wall.png/타일 PNG 를 createPattern 으로 깔아 fillRect 로 편다). 그래서 createPattern 을
//   가로채 그 결과를 표식해 두고, fillRect 때 fillStyle 이 표식된 무늬면 에셋으로 센다. 순색/그라디언트
//   fillRect 만 코드다. 이 자를 게임 로드 «전»에 심어야 굽는 createPattern 까지 표식이 잡힌다.
// document-start 에 심는다 — buildWallPats/buildFloorPat 이 첫 프레임에 무늬를 굽기 때문.
const PAINT_SRC = `(() => {
  const P = window.__paint = { code: 0, asset: 0, overlay: 0, frames: 0, calls: { fillRect: 0, fillRectImg: 0, overlay: 0, drawImage: 0, fill: 0, stroke: 0 } };
  window.__paintReset = () => { P.code = 0; P.asset = 0; P.overlay = 0; P.frames = 0; for (const k in P.calls) P.calls[k] = 0; };
  const proto = CanvasRenderingContext2D.prototype;
  const IMG_PATS = new WeakSet();
  const det = ctx => { const m = ctx.getTransform(); return Math.abs(m.a * m.d - m.b * m.c); };
  const _cp = proto.createPattern;
  proto.createPattern = function (src, rep) { const p = _cp.call(this, src, rep); try { if (p) IMG_PATS.add(p); } catch (e) {} return p; };
  const _fr = proto.fillRect;
  proto.fillRect = function (x, y, w, h) {
    const a = Math.abs(w * h) * det(this);
    P.calls.fillRect++;
    // 화면 전체를 덮는 fillRect(공허 클리어·비네트·플래시)는 «연출 오버레이»지 도형이 아니다 —
    // 따로 담고 비율에서 뺀다. 안 그러면 1.3M px 짜리 전면칠이 벽(~1%)의 변화를 통째로 삼킨다.
    const full = this.canvas ? (this.canvas.width * this.canvas.height) : 0;
    if (full && a >= 0.9 * full) { P.overlay += a; P.calls.overlay++; return _fr.call(this, x, y, w, h); }
    let isImg = false; try { const fs = this.fillStyle; isImg = (fs && typeof fs === "object" && IMG_PATS.has(fs)); } catch (e) {}
    if (isImg) { P.asset += a; P.calls.fillRectImg++; } else { P.code += a; }
    return _fr.call(this, x, y, w, h);
  };
  const _di = proto.drawImage;
  proto.drawImage = function (img, ...a) {
    let dw = 0, dh = 0;
    if (a.length === 2) { dw = img.width; dh = img.height; }
    else if (a.length === 4) { dw = a[2]; dh = a[3]; }
    else if (a.length === 8) { dw = a[6]; dh = a[7]; }
    P.asset += Math.abs(dw * dh) * det(this); P.calls.drawImage++;
    return _di.call(this, img, ...a);
  };
  const _fill = proto.fill; proto.fill = function (...a) { P.calls.fill++; return _fill.apply(this, a); };
  const _stroke = proto.stroke; proto.stroke = function (...a) { P.calls.stroke++; return _stroke.apply(this, a); };
  const raf = window.requestAnimationFrame.bind(window);
  (function loop() { P.frames++; raf(loop); })();
})()`;

async function run() {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
  await S("Page.enable"); await S("Runtime.enable");
  await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc(SEED) });
  await S("Page.addScriptToEvaluateOnNewDocument", { source: PAINT_SRC });
  await S("Emulation.setDeviceMetricsOverride", { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
  await S("Page.navigate", { url: URL });
  let booted = false;
  for (let i = 0; i < 60; i++) { await sleep(300);
    if (await ev(`!!(window.G && G.player && window.HSZ && document.getElementById('loading').style.display === 'none')`)) { booted = true; break; } }
  if (!booted) { log("부팅 실패"); await raw("Target.closeTarget", { targetId }).catch(() => {}); return null; }

  // 원하는 층까지 계단으로 내려간다(빠르게 — 적을 안 잡고 계단만 탄다).
  for (let f = 1; f < FLOOR; f++) {
    await ev(`(() => { const p = G.player; p.x = G.stairs.x; p.y = G.stairs.y;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
      setTimeout(() => document.dispatchEvent(new KeyboardEvent('keyup', { key: 'f', bubbles: true })), 60); })()`);
    await sleep(700);
  }
  // 방 한복판에 두어 벽 네 면이 화면에 들게, 그리고 에셋이 다 로드되게 잠시 기다린다.
  await ev(`(() => { const r = G.rooms[0]; const p = G.player; p.x = r.x + r.w / 2; p.y = r.y + r.h / 2; })()`);
  await sleep(1400);

  const floorNow = await ev(`window.G.floor`);
  await ev(`window.__paintReset()`);
  // 프레임을 모은다.
  const target = FRAMES;
  for (let i = 0; i < 120; i++) { await sleep(60); if (await ev(`window.__paint.frames`) >= target) break; }
  const P = await ev(`window.__paint`);
  const r = await S("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(`tmp/hs_v204_paint_f${FLOOR}.png`, Buffer.from(r.data, "base64"));
  await raw("Target.closeTarget", { targetId }).catch(() => {});
  return { floorNow, P };
}

const out = await run();
if (!out) { bws.close(); process.exit(3); }
const { floorNow, P } = out;
const tot = P.code + P.asset;
const codePct = tot ? (100 * P.code / tot) : 0;
const assetPct = tot ? (100 * P.asset / tot) : 0;
log(`\n■ hs_v204_paint — 씨앗 ${SEED} · 층 ${floorNow} · ${P.frames} 프레임 · 오류 ${errs.length}`);
log(`  코드 도형(순색·그라디언트 fillRect) 넓이 합: ${Math.round(P.code).toLocaleString()}  (fillRect ${P.calls.fillRect - P.calls.overlay - P.calls.fillRectImg}회)`);
log(`  에셋(drawImage + 이미지무늬 fillRect) 넓이 합: ${Math.round(P.asset).toLocaleString()}  (drawImage ${P.calls.drawImage}회 · 무늬칠 ${P.calls.fillRectImg}회)`);
log(`  연출 오버레이(전면칠, 비율서 제외): ${Math.round(P.overlay).toLocaleString()}  (${P.calls.overlay}회)`);
log(`  경로칠(넓이 미측정): fill ${P.calls.fill}회 · stroke ${P.calls.stroke}회`);
log(`\n▣ 코드 도형 비율 ${codePct.toFixed(1)}%  ·  에셋 비율 ${assetPct.toFixed(1)}%`);
log(`  ▸ 컷 tmp/hs_v204_paint_f${FLOOR}.png`);
fs.writeFileSync(`tmp/hs_v204_paint_f${FLOOR}.json`, JSON.stringify({ seed: SEED, floor: floorNow, frames: P.frames, code: P.code, asset: P.asset, codePct, assetPct, calls: P.calls, errs: errs.length }, null, 2));
log(`  ▸ tmp/hs_v204_paint_f${FLOOR}.json`);
if (errs.length) log(`  ⚠ 오류: ${errs.slice(0, 4).join(" | ")}`);

const list = await (await fetch(CDP + "/json/list")).json();
for (const t of list) if (t.type === "page") { try { await fetch(CDP + "/json/close/" + t.id); } catch {} }
bws.close();
process.exit(0);
