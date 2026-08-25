/* ══ V-68 자 — 풀/흙 경계가 «곧은 토막»인가 ══
   마을을 켜서 바닥만 찍고, 화소를 풀(초록)과 흙(갈색)으로 가른 뒤 **경계의 곧은 토막
   길이**를 잰다. 곧은 그림이면 한 토막이 타일 한 변(32px)까지 늘어나고, 너덜너덜하면
   두세 화소에서 꺾인다.
     · run  = 같은 x 에 세로로(또는 같은 y 에 가로로) 이어지는 경계 토막의 길이
     · 재는 값 ① 평균 토막 길이 ② **8px 이상 곧은 토막이 차지하는 몫**(눈에 계단으로
       읽히는 것은 이쪽이다)
   ★ 같은 판·같은 저장값에서 `__wangRough` 만 껐다 켜며 전/후를 잰다
     ([[same-seed-is-not-same-run]]). **「전」의 곧은 몫이 15% 를 안 넘으면 미달**로 낸다 —
     양성 씨앗을 겸한다([[silent-zero-is-not-an-observation]] · 실측 씨앗 27.5% · 고친 판 1.5%
     이라 문턱은 그 사이에 둔다([[floor-far-from-threshold]])).
   node tools/v68_wangedge.mjs [--shots]                                        */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const SHOTS = process.argv.includes("--shots");
const fs = await import("node:fs");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => {
  const r = await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "eval");
  return r.result?.value;
};
const bad = (m) => { console.log("판정: 미달 —", m); process.exit(1); };

/* ── 문: 판이 서고 바닥 그림이 붙을 때까지 ── (못박은 잠 말고 문 — V-57c) */
const until = async (expr, secs, why) => {
  const t0 = Date.now();
  while (Date.now() - t0 < secs * 1000) { if (await ev(expr)) return; await wait(250); }
  bad(`${why} 문이 ${secs}초 안에 안 열렸다`);
};
await until("!!(window.__rebuildWang && window.LOAD && window.LOAD.done >= window.LOAD.total)", 60, "판이 다 뜸")
  .catch(async () => { await until("!!window.__rebuildWang", 60, "검수 훅"); });
await wait(1200);
/* ★ 첫 화면에 **오프라인 정산 창**이 뜬다 — 그게 판을 어둡게 덮어 색 가르기를 통째로
   망친다(처음에 이걸 안 닫아 경계를 15 토막밖에 못 찾았다). 열린 창은 전부 닫는다. */
await ev(`(() => { let n = 0;
  document.querySelectorAll(".win").forEach(w => {
    if (getComputedStyle(w).display === "none") return;
    const b = w.querySelector("[data-close]"); if (b) { b.click(); n++; }
  }); return n; })()`);
await wait(700);
await until('![...document.querySelectorAll(".win")].some(w => getComputedStyle(w).display !== "none")', 15, "창이 다 닫힘");

/* 마을 화면의 **바닥만** 캔버스에서 곧장 읽는다 — 소품·인물·HUD 가 섞이면 못 잰다.
   `drawGround` 가 구운 그림을 다시 부르는 대신, 화면 캔버스에서 **머리글·HUD 를 뺀
   가운데 띠**를 읽고 초록/갈색만 센다(다른 색은 경계 계산에서 제외한다). */
const grab = async () => ev(`(() => {
  const cv = document.querySelector("canvas");
  const g = cv.getContext("2d");
  const x0 = 0, y0 = Math.round(cv.height * 0.06), w = cv.width, h = Math.round(cv.height * 0.40);
  const d = g.getImageData(x0, y0, w, h).data;
  const m = new Array(w * h);
  /* ★ 색 가르기를 **눈금으로 먼저 재고** 정했다(처음엔 「초록이면 풀」로 잡았다가
     경계를 15 토막밖에 못 찾았다 — 이 판의 풀은 boost 0.55 를 먹어 r≈g 인 **어두운
     올리브**지 초록이 아니다). r−g 의 분포가 두 봉우리(−2~2 · 16~32)에 골이 10 이라,
     그 골을 사이에 두고 양쪽만 센다. 회색 소품(r≈b)은 r−b 로 먼저 뺀다. */
  for (let i = 0; i < w * h; i++) {
    const r = d[i*4], gg = d[i*4+1], b = d[i*4+2];
    if (r + gg + b < 60 || r - b < 15) { m[i] = 2; continue; }      // 땅이 아닌 것
    const k = r - gg;
    m[i] = k <= 5 ? 0 : k >= 14 ? 1 : 2;                            // 0 풀 · 1 흙 · 2 그밖
  }
  return { w, h, m: m.join("") };
})()`);

function measure(o) {
  const { w, h } = o, m = o.m;
  const at = (x, y) => +m[y * w + x];
  const runs = [];
  /* ★ 처음에 축을 뒤집어 세어 **최장 2px** 이 나왔다. **세로 이음매**(왼쪽 풀 · 오른쪽 흙)는
     가로 이웃을 견줘 찾고 **세로로** 이어진다 — 찾는 축과 세는 축이 다르다. */
  const scanV = () => {                       // 세로 이음매: x 고정 · y 로 이어진다
    for (let x = 0; x + 1 < w; x++) {
      let run = 0;
      for (let y = 0; y < h; y++) {
        const p = at(x, y), q = at(x + 1, y);
        const isEdge = (p === 0 && q === 1) || (p === 1 && q === 0);
        if (isEdge) run++; else { if (run) runs.push(run); run = 0; }
      }
      if (run) runs.push(run);
    }
  };
  const scanH = () => {                       // 가로 이음매: y 고정 · x 로 이어진다
    for (let y = 0; y + 1 < h; y++) {
      let run = 0;
      for (let x = 0; x < w; x++) {
        const p = at(x, y), q = at(x, y + 1);
        const isEdge = (p === 0 && q === 1) || (p === 1 && q === 0);
        if (isEdge) run++; else { if (run) runs.push(run); run = 0; }
      }
      if (run) runs.push(run);
    }
  };
  scanV(); scanH();
  if (!runs.length) return null;
  const tot = runs.reduce((s, r) => s + r, 0);
  const long = runs.filter((r) => r >= 8).reduce((s, r) => s + r, 0);
  return { n: runs.length, mean: tot / runs.length, max: Math.max(...runs),
           longPct: long / tot * 100, tot };
}

const shot = async (out) => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); };

const run = async (rough) => {
  await ev(`(globalThis.__wangRough = ${rough}, window.__rebuildWang())`);
  await wait(900);
  const o = await grab();
  if (SHOTS) await shot(`tmp/v68_${rough ? "after" : "before"}.png`);
  return measure(o);
};

const before = await run(0);
const after  = await run(1);
if (!before || !after) bad("경계를 한 자리도 못 찾았다 — 마을이 아니거나 색 가르기가 틀렸다");

const row = (t, r) => `${t}  토막 ${r.n}개 · 평균 ${r.mean.toFixed(2)}px · 최장 ${r.max}px · **8px 이상 곧은 몫 ${r.longPct.toFixed(1)}%**`;
console.log(row("전(옛 그림)", before));
console.log(row("후(다시 구움)", after));
if (before.longPct < 15) bad(`「전」의 곧은 몫이 ${before.longPct.toFixed(1)}% 뿐이다(15% 미만) — 자가 옛 그림을 못 되살렸거나 색 가르기가 헐겁다`);
const ok = after.longPct <= before.longPct * 0.45 && after.mean < before.mean * 0.7;
console.log(`판정: ${ok ? "통과" : "미달"} — 곧은 몫 ${before.longPct.toFixed(1)}% → ${after.longPct.toFixed(1)}% · 평균 ${before.mean.toFixed(2)} → ${after.mean.toFixed(2)}px`);
await S("Target.closeTarget", { targetId }).catch(() => {});
process.exit(ok ? 0 : 1);
