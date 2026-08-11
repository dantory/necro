// 관문 보스 크기 검수기 — **보스와 졸개를 같은 줄에 세워** 한 장에 찍는다.
//   node tools/boss_probe.mjs <out.png> [floor]
// 판을 멈추고(S.speed=0) 손으로 세우므로 층이 뜨는 타이밍에 안 기댄다.
// 화면에 실제로 그려진 세로 픽셀도 같이 재서(캔버스 알파 스캔) 숫자로 남긴다.
const [, , OUT = "tmp/boss.png", FLOOR = "10"] = process.argv;
const CDP = "http://127.0.0.1:9333";
const URL = "http://127.0.0.1:8774/index.html";
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
  if (m.method === "Runtime.exceptionThrown")
    errors.push("EXC " + (m.params.exceptionDetails?.exception?.description || "?"));
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error")
    errors.push("CON " + (m.params.args || []).map(a => a.value ?? a.description ?? "").join(" "));
});
await new Promise(r => bws.addEventListener("open", r));

const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const ev = async (expression) => {
  const r = await S("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 2, mobile: true });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4000));

await ev("window.__toDungeon()");
await new Promise(r => setTimeout(r, 1500));

/* 보스 · 졸개 셋 · 내 유닛 하나를 **같은 y** 에 세운다 — 세로가 다르면 원근(us)이
   달라져 크기 비교가 더러워진다. 서 있는 자세(swing 0 · moving 0)로만 본다. */
const meta = await ev(`(function(){
  const S = window.__S;
  S.speed = 0; S.floor = ${FLOOR}; S.mobs.length = 0; S.minions.length = 0; S.fx.length = 0;
  S.corpses2 = []; if (S.piles) S.piles.length = 0;
  const mk = (kind, h, x, boss) => ({ id: Math.random(), kind, h, x, y: 40, boss: !!boss,
    hp: 100, hpMax: 100, dmg: 1, spd: 0, a: 0, r: h * 0.22, atk: 0, born: 0, born0: 0.4,
    dx: 0, dy: 1, swing: 0, moving: 0, walked: 0 });
  /* ★ 졸개는 **그 층에 실제로 나오는 종**만 세운다 — 아무 종이나 세우면 판에 없는
     놈과 견주게 되어(관문 10층에 괴물을 세우는 식) 크기 판정이 거짓말이 된다. */
  const kinds = [...new Set(window.__mobKinds(S.floor))];
  S.mobs.push(mk("boss", window.__bossH(S.floor), -110, true));
  kinds.forEach((k, i) => S.mobs.push(mk(k, window.__MOB_H_OF(k), -10 + i * 60, false)));
  return { geo: window.__geo, kinds };
})()`);
await new Promise(r => setTimeout(r, 400));

/* ══ 화면에 **실제로 그려진** 세로를 잰다 ══ 놈을 하나씩만 세워 두고 캔버스의
   알파(=배경과 다른 픽셀)를 훑는 대신, 각자 혼자 있는 판을 찍어 몸통 상자를 잰다.
   판 배경이 불투명이라 알파로는 못 가른다 — **한 놈 있는 판 - 아무도 없는 판**의
   차이 픽셀을 센다. */
const measure = await ev(`(async function(){
  const S = window.__S, cv = document.getElementById('stage');
  const g = cv.getContext('2d');
  const raf = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const keep = S.mobs.slice();
  const shot = async () => { await raf(); return g.getImageData(0, 0, cv.width, cv.height).data; };
  S.mobs.length = 0;
  const base = await shot();
  const out = {};
  for (const m of keep) {
    S.mobs.length = 0; S.mobs.push(m);
    const d = await shot();
    let top = -1, bot = -1, l = cv.width, r = -1;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
      const i = (y * cv.width + x) * 4;
      if (Math.abs(d[i] - base[i]) + Math.abs(d[i+1] - base[i+1]) + Math.abs(d[i+2] - base[i+2]) > 24) {
        if (top < 0) top = y; bot = y; if (x < l) l = x; if (x > r) r = x;
      }
    }
    out[m.kind] = { h: bot - top + 1, w: r - l + 1, boxH: m.h };
  }
  S.mobs.length = 0; keep.forEach(m => S.mobs.push(m));
  return out;
})()`);

await new Promise(r => setTimeout(r, 300));
const { data } = await S("Page.captureScreenshot", { format: "png" });
fs.mkdirSync(OUT.replace(/\/[^/]+$/, ""), { recursive: true });
fs.writeFileSync(OUT, Buffer.from(data, "base64"));
const f = Object.entries(measure).map(([k, v]) =>
  `${k} box${v.boxH} → ${v.w}x${v.h}px`).join(" · ");
console.log("floor", FLOOR, "|", f, "| errors", errors.length, errors.slice(0, 3).join(" | "));
await raw("Target.closeTarget", { targetId });
bws.close();
