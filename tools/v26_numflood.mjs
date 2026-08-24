/* **한 방이 여럿을 때리면 화면이 같은 숫자로 덮인다** (V-26 의 자).
     node tools/v26_numflood.mjs [초]
   V-20·V-23 과 **같은 규칙** — 그리는 자리에서 모은 네모(window.__RECTS.nums)를 그대로 읽는다.
   V-23 은 「한 몸 위에 겹친 숫자」를 고쳤다(반경 18). 여기서 보는 것은 그 반대다 —
   장판 한 방이 스무 몸을 때리면 **똑같은 값이 스무 개** 떠서 무대 위쪽을 통째로 덮는다.
   세는 것 넷: ① 한 틀에 뜬 숫자 개수 ② 숫자가 무대에서 먹는 넓이(겹침을 뺀 합집합)
   ③ **같은 글자가 동시에 둘 이상 떠 있는 몫** ④ 1/4 넘게 먹힌 숫자(V-23 회귀). */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const SECS = Number(process.argv[2] || 45);
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 120)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async (x) => (await S("Runtime.evaluate", { expression: x, returnByValue: true })).result.value;
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.addScriptToEvaluateOnNewDocument", { source:
  `Math.random = (() => { let s = ${Number(process.env.SEED || 3)}; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();` });
await S("Page.navigate", { url: PAGE }); await wait(1800);
/* look_shots 와 **같은 세이브**를 심는다 — 장판이 스무 몸을 때리는 화면은 깊은 층에만 있다 */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(3000);
if (process.env.BLOW) await ev(`globalThis.__NOBLOW = ${process.env.BLOW === "0" ? 1 : 0}`);
await ev(`window.__toDungeon && window.__toDungeon()`); await wait(1500);
await ev(`
  window.__RECTS = { bars: [], nums: [], bodies: [], frames: 0 };
  window.__NF = { frames: 0, nums: 0, quarter: 0, dupFrames: 0, dup: 0, maxOn: 0, cover: 0, blows: 0, wide: 0 };
  (function tick() {
    const R = window.__RECTS, O = window.__NF, G = window.__geo;
    if (R.frames && G) {
      const N = R.nums;
      O.frames++; O.nums += N.length;
      if (N.length > O.maxOn) O.maxOn = N.length;
      const ov = (a, b) => { const w = Math.min(a[0]+a[2], b[0]+b[2]) - Math.max(a[0], b[0]);
        const h = Math.min(a[1]+a[3], b[1]+b[3]) - Math.max(a[1], b[1]);
        return (w > 0 && h > 0) ? w * h : 0; };
      /* ③ 같은 글자가 동시에 둘 이상 — 「35k」가 열여섯 개 뜨는 그 일이다 */
      const cnt = {};
      for (const n of N) cnt[n[4]] = (cnt[n[4]] || 0) + 1;
      for (const k in cnt) if (cnt[k] > 1) O.dup += cnt[k];
      /* ② 무대에서 먹는 넓이 — 8px 그물로 합집합을 센다(겹친 데를 두 번 안 센다) */
      const cell = 8, cols = Math.ceil(G.w / cell), seen = new Set();
      for (const n of N) for (let y = n[1]; y < n[1] + n[3]; y += cell)
        for (let x = n[0]; x < n[0] + n[2]; x += cell)
          seen.add(((y / cell) | 0) * cols + ((x / cell) | 0));
      O.cover += seen.size * cell * cell / (G.mapW * G.freeH);
      /* ④ V-23 회귀 */
      for (const a of N) { let p = 0; for (const b of N) { if (b === a) continue; p += ov(a, b); }
        if (p / Math.max(1, a[2] * a[3]) > 0.25) O.quarter++; }
      /* 한 방으로 묶인 것이 몇이나 되나 */
      const gs = new Set(); for (const n of N) if (n[5]) gs.add(n[5]);
      O.blows += gs.size;
    }
    requestAnimationFrame(tick);
  })();`);
await wait(SECS * 1000);
const O = await ev(`(() => { const o = window.__NF, S = window.__S;
  return { ...o, floor: S && S.floor }; })()`);
const r = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
console.log(JSON.stringify({
  틀: O.frames, 층: O.floor,
  한틀에_뜬_숫자_평균: r(O.nums / Math.max(1, O.frames)), 한틀_최대: O.maxOn,
  같은_글자가_둘_이상인_몫: r(O.dup / Math.max(1, O.nums) * 100) + "%",
  숫자가_무대에서_먹는_넓이몫: r(O.cover / Math.max(1, O.frames) * 100, 2) + "%",
  "1/4_넘게_먹힌_숫자": r(O.quarter / Math.max(1, O.nums) * 100) + "%",
  한방묶음_평균: r(O.blows / Math.max(1, O.frames), 2),
  콘솔오류: errs.length,
}));
process.exit(0);
