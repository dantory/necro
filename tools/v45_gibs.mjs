/* **뼛조각이 화면에 얹는 «밝은 잉크»를 잰다** (V-45 의 자).
     node tools/v45_gibs.mjs [초]
   ★ 짝짓기: 조각은 2초면 사라지므로 「옛것 25초 → 새것 25초」로는 **다른 조각을** 재게
     된다([[same-seed-is-not-same-run]]). 그래서 조각이 넉넉히 뜬 순간에 **판을 세우고**
     (`__S.speed = 0`) 같은 프레임을 `__GIBOLD` 만 갈아 두 번 찍는다 — 조각 하나까지
     같은 자리·같은 개수라 두 수가 한 눈금이다.
   잉크는 **찍은 그림에서 직접** 센다(밖에서 식을 다시 쓰면 판정이 그림과 갈린다). */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const SECS = Number(process.argv[2] || 45);
const fs = await import("node:fs");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.addScriptToEvaluateOnNewDocument", { source:
  `Math.random = (() => { let s = 11; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();` });
/* ★ 시작 층을 못 박는다(D-22f) — 안 그러면 사진이 아니라 장례식을 찍는다. */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 34, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 } };
await S("Page.navigate", { url: PAGE }); await wait(1200);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(4500);
await ev("window.__toDungeon && window.__toDungeon()"); await wait(600);
const at = await ev("window.__MODE ? window.__MODE.at : (window.MODE&&window.MODE.at)");
/* 조각이 넉넉히 뜰 때까지 굴린다 — 시체 폭발이 터진 직후다. */
let best = 0, t0 = Date.now();
while ((Date.now() - t0) / 1000 < SECS) {
  await wait(180);
  const q = await ev(`(()=>{const g=(window.__S&&window.__S.fx||[]).filter(f=>f.kind==='gib');
    return [g.length, g.filter(f=>f.landed).length];})()`) || [0, 0];
  best = Math.max(best, q[0] | 0);
  /* **누운 조각까지 든 순간**을 고른다 — 옛 그림의 「가로 막대가 줄줄이」가 거기서 난다. */
  if ((q[0] | 0) >= 10 && (q[1] | 0) >= 5) break;
}
const froze = await ev("window.__S ? (window.__S.speed = 0, 1) : 0");
await wait(260);
const st = await ev(`(()=>{const g=(window.__S.fx||[]).filter(f=>f.kind==='gib');
  return {n:g.length, landed:g.filter(f=>f.landed).length, floor:window.__S.floor};})()`);
/* 조각이 모인 자리를 오려 낸다 — 화면 전체를 세면 바닥·몸이 잡음이 된다. */

/* 조각 하나하나의 **화면 자리**를 돌려준다 — 잉크는 그 둘레에서만 센다(횃불이 깜빡이는
   바닥까지 세면 조각이 잡음에 묻힌다). dsf=2 로 찍으므로 두 배 한다. */
const spots = await ev(`(()=>{const G=window.__geo, g=(window.__S.fx||[]).filter(f=>f.kind==='gib');
  const sc2=G.sc, sz=f=>(f.big?4:2.6)*Math.max(1,sc2*2.2);
  return g.map(f=>{const s=sz(f); return [ (G.cx+f.x*G.sc)*2, (G.cy+f.y*G.sc*G.squash - f.z*G.sc)*2, s*2.6 ];});})()`);
const shot = async (old, out) => {
  await ev(`globalThis.__GIBOLD = ${old ? 1 : 0}`); await wait(120);
  const s = await S("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(out, Buffer.from(s.data, "base64")); };
await shot(1, "tmp/v45_old.png");
await shot(0, "tmp/v45_new.png");
await ev("globalThis.__GIBOLD = 0");
fs.writeFileSync("tmp/v45_spots.json", JSON.stringify(spots));
console.log(JSON.stringify({ at, froze, gib: st, best, spots: spots.length, errs: errs.slice(0, 3) }));
await S("Target.closeTarget", { targetId });
process.exit(0);
