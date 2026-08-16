/* **마을이 비었는가**를 수로 가른다 — 「빈 풀밭이 많다」는 눈만으로는 못 다툰다.
     node tools/town_probe.mjs [out.png] [밴드수=8]

   재는 법: 마을 화면의 **캔버스 화소를 직접** 읽어(HUD 에 가린 위·아래는 뺀다)
   가로 띠로 자르고, 띠마다 **4x4 칸의 명암차가 40 을 넘는 비율**을 센다.
   풀·흙 바닥은 잔무늬라 이 값이 낮고, 소품·건물은 윤곽선과 그림자가 있어 높다.
   ★ 자를 먼저 씨앗으로 시험했다(2026-08-13 01:1x, 고치기 전 화면):
       띠 8개 중 넷이 5% 아래(1.3 / 2.7 / 0.4 / 4.8) · 나머지는 13~23%.
     즉 이 자는 「절반 넘게가 빈 풀밭」을 그대로 집어낸다 — 눈으로 본 것과 같다.

   가름:
     · 모든 띠가 MIN 이상이어야 한다(비어 보이는 띠가 없어야 한다)
     · 그러면서 제일 빽빽한 띠는 CLUSTER 이상 — **고르게 깔면 안 된다.**
       야영지는 무리를 지어야 「여기가 마을」이 생긴다(js/ground.js drawScatter). */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const OUT = process.argv[2] || "tmp/town_probe.png";
const BANDS = +(process.argv[3] || 8);
const MIN = 8.0, CLUSTER = 15.0;
const fs = await import("node:fs");

const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const errors = [];
function raw(method, params = {}, sessionId) {
  const mid = ++id; bws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  return new Promise((res, rej) => pend.set(mid, { res, rej }));
}
bws.addEventListener("message", ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id);
    return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  const M = m.method, P = m.params || {};
  if (M === "Runtime.exceptionThrown") errors.push("EXC " + (P.exceptionDetails?.exception?.description || P.exceptionDetails?.text || "?"));
  if (M === "Runtime.consoleAPICalled" && P.type === "error")
    errors.push("CON " + (P.args || []).map(a => a.value ?? a.description ?? "").join(" "));
});
await new Promise(r => bws.addEventListener("open", r));

const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
/* ★ 캐시를 끄지 않으면 **고치기 전 코드를 다시 잰다** — 값이 안 움직여서 처음엔
   고친 게 안 먹힌 줄 알았다(2026-08-13). 자는 늘 지금 코드를 재야 한다. */
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.navigate", { url: PAGE });
await new Promise(r => setTimeout(r, 2500));
/* ★ **사람이 지나는 길로 잰다** — 마을은 게임을 켜면 나오는 첫 화면이다.
   그림 다 그려질 때까지 기다린다(소품이 덜 실린 채 재면 「비었다」가 거짓으로 나온다). */
await S("Runtime.evaluate", { awaitPromise: true, expression:
  `new Promise(r => { const w = () => (window.LOAD && window.LOAD.total && window.LOAD.done >= window.LOAD.total) ? r(1) : setTimeout(w, 200); w(); })` });
await new Promise(r => setTimeout(r, 1200));

const R = (await S("Runtime.evaluate", { returnByValue: true, expression: `(()=>{
  if (!window.MODE || MODE.at !== "town") return { notTown: String(window.MODE && MODE.at) };
  const cv = document.getElementById("stage");
  const dpr = cv.width / cv.clientWidth;
  const cr = cv.getBoundingClientRect();
  /* HUD 에 가린 데는 빼고 **보이는 만큼만** 잰다 — 패널 뒤가 비었는지는 아무도 모른다. */
  const top = document.getElementById("top").getBoundingClientRect();
  const pan = document.getElementById("panel").getBoundingClientRect();
  const y0 = Math.round((top.bottom - cr.top) * dpr), y1 = Math.round((pan.top - cr.top) * dpr);
  const g = cv.getContext("2d");
  const bands = [];
  const N = ${BANDS};
  for (let b = 0; b < N; b++) {
    const a = y0 + Math.floor((y1 - y0) * b / N), z = y0 + Math.floor((y1 - y0) * (b + 1) / N);
    const d = g.getImageData(0, a, cv.width, z - a).data;
    const W = cv.width, H = z - a;
    let tot = 0, hit = 0;
    for (let y = 0; y + 4 <= H; y += 4) for (let x = 0; x + 4 <= W; x += 4) {
      let lo = 999, hi = -1;
      for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) {
        const i = ((y + dy) * W + (x + dx)) * 4;
        const v = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
        if (v < lo) lo = v; if (v > hi) hi = v;
      }
      tot++; if (hi - lo > 40) hit++;
    }
    bands.push({ y: a, h: H, pct: +(100 * hit / tot).toFixed(1) });
  }
  return { bands, y0, y1, dpr };
})()` })).result.value;

if (R.notTown) { console.log("FAIL 마을 화면이 아니다: " + R.notTown); process.exit(1); }

const shot = await S("Page.captureScreenshot", { format: "png" });
fs.mkdirSync(OUT.replace(/\/[^/]*$/, "") || ".", { recursive: true });
fs.writeFileSync(OUT, Buffer.from(shot.data, "base64"));

const pcts = R.bands.map(b => b.pct);
const lo = Math.min(...pcts), hi = Math.max(...pcts);
const bare = R.bands.filter(b => b.pct < MIN);
R.bands.forEach((b, i) => console.log(`  띠${i} y${b.y}+${b.h}  ${String(b.pct).padStart(5)}%` + (b.pct < MIN ? "  ← 빈 풀밭" : "")));
console.log(`  제일 빈 띠 ${lo}% (문턱 ${MIN}) · 제일 빽빽한 띠 ${hi}% (무리 문턱 ${CLUSTER}) · errors ${errors.length}`);
const ok = bare.length === 0 && hi >= CLUSTER && errors.length === 0;
console.log(ok ? "PASS" : `FAIL ${bare.length ? `빈 띠 ${bare.length}개` : ""} ${hi < CLUSTER ? "무리가 없다(고르게 깔렸다)" : ""} ${errors.length ? errors.join(" | ") : ""}`);
await S("Target.closeTarget", { targetId }).catch(() => {});
process.exit(ok ? 0 : 1);
