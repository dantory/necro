/* **던전 바닥에 소품이 몇 개나 놓이는가** (2026-08-24 · V-10)
     node tools/v10_scatter_probe.mjs [density] [rolls]
   1층에 들어가 한 프레임 동안 놓인 소품을 **자리와 함께** 센다.
   총 개수만이 아니라 **가로 여섯 띠 · 세로 네 띠**로 나눠 세는 것이 요점이다 —
   「가운데만 차 있고 끝은 통째로 빈」 얼룩은 총계로는 안 보인다(08-12 야영지). */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl); let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId); const wait = ms => new Promise(r => setTimeout(r, ms));
await S("Page.enable"); await S("Runtime.enable"); await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url: PAGE }); await wait(1500);
await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
await S("Page.reload", { ignoreCache: true }); await wait(5000);
/* ★ ev2 가 `result?.value` 만 집어 오면 판 안에서 던진 것이 **undefined** 로 온다 —
   그러면 자가 조용히 0 을 돌려준다([[silent-zero-is-not-an-observation]] · V-9).
   여기서는 응답을 통째로 받아 터진 자리를 그대로 싣는다. */
const ev = async e => { const r = await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) { console.log("못 쟀다 — 판 안에서 터졌다: " + (r.exceptionDetails.exception?.description || "").slice(0, 200)); process.exit(2); }
  return r.result.value; };
/* ★ 단추를 글자로 찾지 말 것 — 마을에도 「1층 입구로」 가 있어 **마을에 선 채로** 찍는다
   (08-24 에 넉 장을 다 마을로 찍었다). first_look 과 같은 문을 쓴다. */
await ev(`window.__toDungeon && window.__toDungeon()`);
if (!(await ev(`!!window.__toDungeon`))) { console.log("못 쟀다 — __toDungeon 이 없다"); process.exit(2); }
await wait(4000);
const D = process.argv[2], R = process.argv[3];
if (D) await ev(`globalThis.__SCAT_DENS=${+D}`);
if (R) await ev(`globalThis.__SCAT_ROLLS=${+R}`);
await wait(700);
/* ★ 바닥은 **한 번 구워 두고 얹는다**(ground.js 의 gcv). 세기만 켜고 기다리면
   drawScatter 가 아예 안 불려 **0** 이 나온다 — 그게 08-24 첫 판정이었다.
   `__gbust` 를 올려 굽기를 다시 시킨다([[silent-zero-is-not-an-observation]]). */
const out = await ev(`(async()=>{ globalThis.__scatterHits=[]; globalThis.__scatterCount=1;
  globalThis.__gbust = (globalThis.__gbust||0) + 1;
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const h=globalThis.__scatterHits; globalThis.__scatterCount=0; globalThis.__scatterHits=[];
  return {n:h.length, geo:globalThis.__geo, pts:h.map(a=>[Math.round(a[0]),Math.round(a[1])])}; })()`);
if (!out || typeof out.n !== "number") { console.log("못 쟀다 — 자가 수를 못 받았다"); process.exit(2); }
/* ★ **0 을 관찰로 받지 않는다.** 소품이 정말 없을 수는 없다(dens>0) — 0 이면 십중팔구
   캐시를 봤거나 에셋이 안 붙은 것이다. 조용히 0 을 돌려주면 다음엔 그걸 믿는다. */
if (out.n === 0) { console.log("못 쟀다 — 소품 0개. 바닥 캐시를 다시 안 구웠거나 decor 가 안 붙었다"); process.exit(2); }
const { n, pts, geo } = out;
const W = 1512, PLAY = geo.freeH;            // 판(HUD)에 안 가리는 세로
const inPlay = pts.filter(([, y]) => y >= 0 && y < PLAY);
const cols = 6, rows = 4;
const cb = Array.from({ length: cols }, () => 0), rb = Array.from({ length: rows }, () => 0);
for (const [x, y] of inPlay) { cb[Math.min(cols - 1, Math.floor(x / W * cols))]++; rb[Math.min(rows - 1, Math.floor(y / PLAY * rows))]++; }
const mm = a => `${Math.min(...a)}~${Math.max(...a)}`;
const empty = cb.filter(v => v === 0).length + rb.filter(v => v === 0).length;
console.log(`소품 ${n}개(그중 판 위 ${inPlay.length}) · sc ${geo.sc.toFixed(2)} · 보이는 세로 ${PLAY}`);
console.log(`  가로 여섯 띠: ${cb.join(" ")}   (${mm(cb)})`);
console.log(`  세로 네 띠  : ${rb.join(" ")}   (${mm(rb)})`);
console.log(`  텅 빈 띠 ${empty}개 · 안팎 비 ${(Math.max(...cb) / Math.max(1, Math.min(...cb))).toFixed(2)}`);
await S("Target.closeTarget", { targetId }); process.exit(0);
