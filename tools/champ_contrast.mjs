/* ══ 우두머리의 «몸»이 바닥에서 읽히는가를 재는 자 ══ (ROADMAP D-4)
   D-3 에서 「살아는 있다」(63~74%)가 밝혀졌고, 남은 물음은 **읽히느냐**다.
   12층을 켜서 보니 발밑 금빛 고리(hh×0.34 · 선 α0.75)가 「마른 흙」·「잿빛 야영터」처럼
   **바닥이 이미 갈색인 구역에서 묻히는 것처럼** 보였다 — 그런데 그건 눈으로 본 짐작이다.
   값을 만지기 전에 잰다. 적 바를 고칠 때 쓴 자와 **같은 자**다(2026-08-15 · 바닥대비 px).

   ★ 끝 조건(재기 **전에** 적는다 · ROADMAP D-4 에 이미 적힌 그대로):
     ㉠ 고리의 **바닥대비**가 **모든 구역에서 3.0:1 이상**
     ㉡ 같은 화면의 **졸개 발밑과 1.3:1 이상 갈린다**
   ★ 자를 **양쪽으로 연다** — 「묻힌다」만이 아니라 「너무 튄다」도 보이게 값을 다 적는다.

   ★ 재는 법 — 좌표 셈에 안 기댄다. 같은 자리를 **세 번** 그려 빼는다:
     C 아무도 없는 판(바닥만) · A 우두머리+졸개 · B 그 우두머리의 champ 만 끈 판.
     A-B 의 차이 픽셀 중 **발밑 상자 안**의 것이 고리다(위쪽 차이는 체력바).
     고리 밑에 깔린 바닥은 **C 의 같은 자리 픽셀**이라 정확하다.
   ★ 놈은 RING_HOLD(150)**밖**에 세운다 — 안쪽에 서면 발밑에 붉은 그러데이션이 겹쳐
     금빛 대신 그것을 재게 된다.
   node tools/champ_contrast.mjs   (tmp/champ_contrast.json · tmp/champ_zone_*.png) */
const CDP = process.env.NECRO_CDP_PORT ? `http://127.0.0.1:${process.env.NECRO_CDP_PORT}` : "http://127.0.0.1:9333";
const URL = "http://127.0.0.1:8774/index.html";
const FLOOR_OK = 3.0, MOB_OK = 1.3;          // ← 재기 전에 박아 둔 문턱
/* ★ **보정용 손잡이** — `NECRO_RING_COL=#ffffff` 로 돌리면 고리만 하얘진다. 자가 정말
     고리를 보고 있다면 이때 수가 **크게 올라야** 한다. 안 오르면 자가 고장난 것이다
     (0 이나 늘 같은 수를 「관찰」로 삼지 않는다 · [[silent-zero-is-not-an-observation]]). */
const fs = await import("node:fs");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const shot = async (out) => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); };

const meta = { gold: 182400, lv: 26, xp: 0, deepest: 99, runs: 6,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: {}, bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 99, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(1800);
if (!(await ev(`typeof window.__toDungeon === "function"`))) throw new Error("__toDungeon 없다 — 이름을 확인할 것");
await ev(`window.__toDungeon()`);
await wait(1200);
if (!(await ev(`!!(window.__geo && window.__geo.sc)`))) throw new Error("__geo 가 안 섰다 — 한 프레임도 안 그려졌다");

/* 구역 표는 게임에서 읽는다 — 여기에 손으로 베껴 적으면 표가 바뀔 때 자가 거짓말을 한다. */
const zones = await ev(`(async () => { const C = await import("/js/core.js"); 
  return C.ZONES.map(z => ({ from: z.from, n: z.n, tile: z.tile, tint: z.tint })); })()`);
if (!zones || !zones.length) throw new Error("ZONES 를 못 읽었다");

/* ══ 판 안에서 한 구역을 재는 몸통 ══ */
const measureSrc = (floor) => `(async () => {
  const S = window.__S, G = window.__geo, cv = document.getElementById("stage");
  if (!S || !G) throw new Error("__S/__geo 없다");
  const g = cv.getContext("2d", { willReadFrequently: true });
  const raf = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const dpr = cv.width / cv.getBoundingClientRect().width;
  const kinds = [...new Set(window.__mobKinds(${floor}))];
  const kind = kinds[kinds.length - 1] || "fallen";
  const H = window.__MOB_H_OF(kind);
  const mk = (x, champ) => ({ id: Math.random(), kind, h: H * (champ ? 1.22 : 1), x, y: 20,
    boss: false, champ, hp: 100, hpMax: 100, dmg: 1, spd: 0, a: 0, r: H * 0.22,
    atk: 0, born: 0, born0: 0, dx: 0, dy: 1, swing: 0, moving: 0, walked: 0, col: ${JSON.stringify(process.env.NECRO_RING_COL || null)} });
  const still = () => { S.speed = 0; S.floor = ${floor}; S.minions.length = 0; S.fx.length = 0;
                        S.corpses2 = []; if (S.piles) S.piles.length = 0; };
  /* 층을 바꾸고 바닥이 갈아 끼워질 틈을 준다(syncZone 은 hud() 안에서 돈다) */
  still(); S.mobs.length = 0;
  for (let i = 0; i < 30; i++) await raf();
  const grab = () => g.getImageData(0, 0, cv.width, cv.height).data;
  const C = grab();                                        // ① 바닥만
  still(); S.mobs.length = 0;
  const champ = mk(190, true), mob = mk(-190, false);
  S.mobs.push(champ, mob);
  for (let i = 0; i < 6; i++) { still(); await raf(); }
  const A = grab();                                        // ② 우두머리 + 졸개
  champ.champ = false;
  for (let i = 0; i < 6; i++) { still(); await raf(); }
  const B = grab();                                        // ③ 고리만 뺀 같은 판
  champ.champ = true; for (let i = 0; i < 2; i++) { still(); await raf(); }   // 사진용으로 되돌린다

  /* 발밑 상자 — 고리는 발(x,y)을 중심으로 rr=hh*0.34, 세로는 그 × squash */
  const W = cv.width, hh = champ.h * G.us, rr = hh * 0.34;
  const box = (m, k) => { const cx = (G.cx + m.x * G.sc) * dpr, cy = (G.cy + m.y * G.sc * G.squash) * dpr,
                          rx = rr * G.sc * dpr * k, ry = rx * G.squash;
    return { x0: Math.max(0, Math.floor(cx - rx)), x1: Math.min(W - 1, Math.ceil(cx + rx)),
             y0: Math.max(0, Math.floor(cy - ry)), y1: Math.min(cv.height - 1, Math.ceil(cy + ry)), cx, cy, rx, ry }; };
  const lum = (r, gg, b) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(gg) + 0.0722 * f(b); };
  const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const med = (a) => { const s = [...a].sort((p, q) => p - q); return s.length ? s[s.length >> 1] : 0; };

  /* ── 고리 픽셀: A 와 B 가 다른 자리 중 **발밑 상자** 안 (위쪽 차이는 체력바) ── */
  /* ★★ **고리는 «선»과 «속»이 따로다** — 선은 α0.75 로 긋고 속은 α0.18 로 채운다.
     처음엔 달라진 픽셀을 통째로 중앙값 냈는데, 속이 넓어서 **중앙값이 곧 속의 값**이
     됐다(선은 몇 %). 병수님 눈이 「고리」라고 부르는 것은 **선**이다 — 갈라서 잰다.
     가르는 자: A-B 차이가 큰 쪽 **상위 15%** 가 선, 나머지가 속. */
  const bx = box(champ, 1.25);
  const px = [];
  for (let y = bx.y0; y <= bx.y1; y++) for (let x = bx.x0; x <= bx.x1; x++) {
    const i = (y * W + x) * 4;
    const d = Math.abs(A[i] - B[i]) + Math.abs(A[i+1] - B[i+1]) + Math.abs(A[i+2] - B[i+2]);
    if (d >= 12) px.push({ i, d });
  }
  px.sort((p, q) => q.d - p.d);
  const cut = Math.max(1, Math.round(px.length * 0.15));
  const pick = (arr) => { const la = [], lc = [], ra = [[], [], []], rc = [[], [], []];
    for (const { i } of arr) { la.push(lum(A[i], A[i+1], A[i+2])); lc.push(lum(C[i], C[i+1], C[i+2]));
      for (let c = 0; c < 3; c++) { ra[c].push(A[i+c]); rc[c].push(C[i+c]); } }
    return { la, lc, ra, rc }; };
  const line = pick(px.slice(0, cut)), all = pick(px);
  const ringA = all.la, ringC = all.lc, rgbA = all.ra, rgbC = all.rc;
  /* ── 발밑 «띠» 통째로: 우두머리(고리 있음) 대 졸개(없음) — 「한눈에 갈리나」 ── */
  const bandLum = (img, m, k) => { const b = box(m, k); let s = 0, n = 0;
    for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) {
      const dx = (x - b.cx) / b.rx, dy = (y - b.cy) / b.ry, r2 = dx * dx + dy * dy;
      if (r2 > 1 || r2 < 0.36) continue;                    // 가운데(발·몸)는 뺀다
      const i = (y * W + x) * 4; s += lum(img[i], img[i+1], img[i+2]); n++; }
    return n ? s / n : null; };
  const champBand = bandLum(A, champ, 1.25), mobBand = bandLum(A, mob, 1.25);
  const hex = (a) => "#" + a.map(v => Math.round(v).toString(16).padStart(2, "0")).join("");
  const hex0 = (a) => "#" + a.map(v => Math.round(v).toString(16).padStart(2, "0")).join("");
  const lineRatio = line.la.length ? +ratio(med(line.la), med(line.lc)).toFixed(2) : null;
  return { floor: ${floor}, kind, ringPx: ringA.length, linePx: line.la.length,
    lineHex: line.la.length ? hex0(line.ra.map(med)) : null,
    lineUnderHex: line.lc.length ? hex0(line.rc.map(med)) : null, lineRatio,
    ring: ringA.length ? med(ringA) : null, under: ringC.length ? med(ringC) : null,
    ringHex: ringA.length ? hex(rgbA.map(med)) : null, underHex: ringC.length ? hex(rgbC.map(med)) : null,
    floorRatio: ringA.length ? +ratio(med(ringA), med(ringC)).toFixed(2) : null,
    champBand, mobBand, mobRatio: (champBand && mobBand) ? +ratio(champBand, mobBand).toFixed(2) : null };
})()`;

const out = [];
for (const z of zones) {
  const r = await ev(measureSrc(z.from));
  if (!r) throw new Error(`구역 ${z.n} 을 못 쟀다 — 자가 고장났다`);
  if (!r.ringPx) throw new Error(`구역 ${z.n}: 고리 픽셀 0 — 조용한 0 은 관찰이 아니다`);
  out.push({ ...z, ...r });
  await shot(`tmp/champ_zone_${z.from}.png`);
}
fs.writeFileSync("tmp/champ_contrast.json", JSON.stringify(out, null, 1));
console.log("| 구역 | 층 | 바닥 | 고리선 | **선:바닥** | 속:바닥 | 우두머리띠:졸개띠 | 선px/전체 |");
console.log("| --- | --- | --- | --- | --- | --- | --- | --- |");
for (const r of out)
  console.log(`| ${r.n} | ${r.from} | ${r.lineUnderHex} | ${r.lineHex} | **${r.lineRatio}**${r.lineRatio < FLOOR_OK ? " ✗" : ""} | ${r.floorRatio} | ${r.mobRatio}${r.mobRatio < MOB_OK ? " ✗" : ""} | ${r.linePx}/${r.ringPx} |`);
const badF = out.filter(r => r.lineRatio < FLOOR_OK), badM = out.filter(r => r.mobRatio < MOB_OK);
console.log(`\n㉠ 고리:바닥 ≥ ${FLOOR_OK} — ${badF.length ? "미달 " + badF.map(r => r.n + " " + r.lineRatio).join(" · ") : "구역 " + out.length + "곳 다 통과"}`);
console.log(`㉡ 졸개와 ≥ ${MOB_OK} — ${badM.length ? "미달 " + badM.map(r => r.n + " " + r.mobRatio).join(" · ") : "구역 " + out.length + "곳 다 통과"}`);
console.log("errs", errs);
process.exit(0);
