/* V-42 자 — **맵 띠 바깥의 «가라앉힘»이 이음매에 선을 긋는가.**
   `paintGround` 는 띠 바깥을 「선이 아니라 번짐」으로 가라앉힌다고 적어 두고,
   번짐(그라디언트)을 **띠 바깥 전체**에 깐 뒤 그 위에 「번짐 너머」 몫을
   **한 번 더** 평평하게 덮는다. 그라디언트는 마지막 색을 그 너머까지 물고 늘어지므로
   그 자리는 이미 8c 인데 8c 를 또 얹는 것이다 — 겹치는 순간 **딱 떨어지는 세로줄**이
   생긴다(왼쪽 x=mapX0-F, 오른쪽 x=mapX0+mapW+F).

   재는 법 — 무대 캔버스를 그대로 읽어(스크린샷 대신 `getImageData`) **가로 한 줄의
   밝기 계단**을 센다. 이음매는 「가로로 길게 이어지는 계단」이라 여러 줄에서 **같은 x**
   에 선다 — 그것이 무늬 잡음과 갈리는 자리다.

   내는 수:
     · 줄맞춤 계단 — 표본 줄의 60% 이상에서 같은 x 에 12 이상 뛰는 자리
     · 그 자리에서의 평균 낙차(밝기 0~255)

     node tools/v42_seam.mjs            (마을 · 1층)  */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, URL = "http://127.0.0.1:8774/index.html";
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
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const evalp = async (expression) => (await S("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;

await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.addScriptToEvaluateOnNewDocument", { source:
  `Math.random = (() => { let s = 3; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();` });
await S("Page.navigate", { url: URL }); await wait(1500);
await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
await S("Page.reload", { ignoreCache: true }); await wait(4500);

/** 무대 캔버스에서 **가로줄 계단**을 센다. 띠 안쪽(싸움·소품)은 잡음이라 빼고
 *  띠 바깥 ± 여유만 본다. */
const SCAN = `(() => {
  const cv = document.getElementById("stage"), g = cv.getContext("2d", { willReadFrequently: true });
  const G = window.__geo || {};
  const W = cv.width, H = cv.height, dpr = W / (G.w || W);
  const x0 = Math.round((G.mapX0 || 0) * dpr), x1 = Math.round(((G.mapX0 || 0) + (G.mapW || 0)) * dpr);
  const rows = []; const top = Math.round(H * 0.05), bot = Math.round(H * 0.62);
  for (let i = 0; i < 24; i++) rows.push(top + Math.round((bot - top) * i / 23));
  const lum = (d, i) => (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
  // 세는 자리: 띠 바깥 (0..x0) 과 (x1..W)
  const spans = [[1, x0], [x1, W]].filter(s => s[1] - s[0] > 2);
  const votes = new Map();          // x -> [표, 낙차합]
  for (const y of rows) {
    const d = g.getImageData(0, y, W, 1).data;
    for (const [a, b] of spans)
      for (let x = a; x < b; x++) {
        const dl = Math.abs(lum(d, x * 4) - lum(d, (x - 1) * 4));
        if (dl >= 12) { const v = votes.get(x) || [0, 0]; v[0]++; v[1] += dl; votes.set(x, v); }
      }
  }
  const lined = [...votes].filter(([, v]) => v[0] >= rows.length * 0.6)
    .map(([x, v]) => ({ x: Math.round(x / dpr), 표: v[0], 낙차: +(v[1] / v[0]).toFixed(1) }))
    .sort((p, q) => q.낙차 - p.낙차);
  return JSON.stringify({ dpr, 띠: [Math.round(x0 / dpr), Math.round(x1 / dpr)], 줄수: rows.length, 줄맞춤계단: lined });
})()`;

const show = (label, s) => { const o = JSON.parse(s);
  console.log(`${label}  띠 ${o.띠[0]}~${o.띠[1]} · 줄 ${o.줄수}`);
  if (!o.줄맞춤계단.length) console.log("   줄맞춤 계단 없음 ✔");
  else for (const L of o.줄맞춤계단) console.log(`   x=${L.x}  낙차 ${L.낙차}  (${L.표}/${o.줄수} 줄)`);
  return o.줄맞춤계단; };

const town = show("마을", await evalp(SCAN));
await evalp(`window.__toDungeon && window.__toDungeon()`); await wait(1800);
const dun = show("1층", await evalp(SCAN));
console.log(`콘솔오류 ${errs.length}`);
process.exitCode = (town.length || dun.length) ? 1 : 0;
await raw("Target.closeTarget", { targetId });
bws.close();
