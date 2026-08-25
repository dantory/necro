/* 구역 바닥의 **결**을 잰다 (ROADMAP V-62).
   node tools/v62_grain.mjs

   ★ 「퍼짐(p90-p10)」으로는 이 흠을 못 본다. sanctum 은 칸의 72% 가 **한 값**(닦인
     대리석)이라 이음새를 아무리 또렷하게 해도 p10·p90 이 둘 다 그 평지에 떨어져
     퍼짐이 안 움직인다([[floor-far-from-threshold]] — 바닥이 문턱에서 멀면 눈금이 아니다).
     그래서 **이웃 픽셀과의 차이**(가로·세로 평균 |Δ|)를 같이 잰다 — 이음새든 알갱이든
     「눈이 붙잡을 것」이 있으면 이 수가 오른다. 타일은 되풀이되므로 가장자리는 감아 잰다.
   ★ 페이지 안에서 **실제로 구워진 타일**을 읽는다(`__floorTiles`). 원본 png 를 파이썬으로
     재면 boost·saturate·tone 열둘을 안 거치므로 사람이 보는 것과 다른 수가 된다
     ([[probe-must-walk-the-real-path]]).
   기준은 crypt(1층) — 「돌바닥으로 읽힌다」고 사람이 확인한 유일한 자리다. */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
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
await S("Runtime.enable");
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(4000);

/* 이름 하나마다 구워진 타일 열둘 중 **tone 1.0 자리**(4~7)를 읽어 평균낸다. */
const 잰다 = `(() => {
  const T = window.__floorTiles; if (!T) return { err: "__floorTiles 가 없다" };
  const out = {};
  for (const name of Object.keys(T)) {
    const set = T[name]; if (!set || !set.length) continue;
    const 값 = [];
    for (let k = 4; k < Math.min(8, set.length); k++) {
      const c = set[k], g = c.getContext("2d", { willReadFrequently: true });
      const d = g.getImageData(0, 0, c.width, c.height).data, w = c.width, h = c.height;
      const L = new Float64Array(w * h);
      for (let i = 0; i < w * h; i++) L[i] = 0.299*d[i*4] + 0.587*d[i*4+1] + 0.114*d[i*4+2];
      let 합 = 0, 결 = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = L[y*w+x]; 합 += v;
        결 += Math.abs(v - L[y*w + (x+1)%w]) + Math.abs(v - L[((y+1)%h)*w + x]);
      }
      const s = [...L].sort((a,b) => a-b);
      값.push({ 평균: 합/(w*h), 결: 결/(w*h*2),
                퍼짐: s[Math.floor(s.length*0.9)] - s[Math.floor(s.length*0.1)] });
    }
    const m = (f) => 값.reduce((a,b) => a + b[f], 0) / 값.length;
    out[name] = { 평균: +m("평균").toFixed(1), 결: +m("결").toFixed(2), 퍼짐: +m("퍼짐").toFixed(1) };
  }
  return out;
})()`;
const r = await ev(잰다);
if (r?.err) { console.log("미달 —", r.err); await fetch(`${CDP}/json/close/${targetId}`); process.exit(1); }
const 순서 = ["crypt", "rot", "bone", "camp", "sanctum", "blood", "abyss"];
const 기준 = r.crypt?.결 ?? 0;
console.log("구역      화면평균    결   퍼짐   crypt 대비");
const 무른 = [];
for (const n of 순서) {
  const v = r[n]; if (!v) { console.log(`${n.padEnd(9)} 없다`); continue; }
  const 비 = 기준 ? v.결 / 기준 : 0;
  if (비 < 0.75) 무른.push(`${n} ${(비*100)|0}%`);
  console.log(`${n.padEnd(9)} ${String(v.평균).padStart(7)} ${String(v.결).padStart(6)} ${String(v.퍼짐).padStart(6)}   ${(비*100).toFixed(0)}%`);
}
console.log(`판정: ${무른.length ? "미달 — 결이 crypt 의 75% 아래인 구역: " + 무른.join(" · ") : "통과 (일곱 구역이 다 결을 가졌다)"}`);
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(무른.length ? 1 : 0);
