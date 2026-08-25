/* **누운 시체 그림이 «몸»으로 읽히는지 켜서 본다** (V-46 의 눈).
     node tools/v46_shot.mjs [초]
   ★ 짝짓기: 시체는 판마다 자리·각도·색이 다르므로 「옛것 판 → 새것 판」으로는
     **다른 시체를** 보게 된다([[same-seed-is-not-same-run]]). 시체가 넉넉히 깔린
     순간에 **판을 세우고**(`__S.speed = 0`) 같은 프레임을 `__CORPSEOLD` 만 갈아 두 번
     찍는다 — 시체 한 구까지 같은 자리라 두 장이 한 눈금이다.
   ★ 수는 여기서 안 센다 — 자는 `tools/v46_bones.py`(그림 파일 자체)가 든다.
     여기서 얻을 것은 **판에서 어떻게 읽히는가** 하나뿐이다
     ([[play-it-before-measuring-it]]). */
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
/* 「뼈」시체가 넉넉히 깔릴 때까지 굴린다 — 옛 그림의 방사형 부챗살이 거기서 보인다. */
let t0 = Date.now(), q = [0, 0];
while ((Date.now() - t0) / 1000 < SECS) {
  await wait(250);
  q = await ev(`(()=>{const p=(window.__S&&window.__S.piles)||[];
    return [p.length, p.filter(k=>k.sort==='bones').length];})()`) || [0, 0];
  if ((q[1] | 0) >= 12) break;
}
const froze = await ev("window.__S ? (window.__S.speed = 0, 1) : 0");
await wait(300);
const st = await ev(`(()=>{const p=window.__S.piles||[];
  return {piles:p.length, bones:p.filter(k=>k.sort==='bones').length, floor:window.__S.floor};})()`);
/* 「뼈」시체가 가장 빽빽한 자리를 찾아 그 둘레만 오려 낸다 — 화면 전체를 보면
   한 구가 손톱만 해서 «어떻게 읽히는지»가 안 보인다. dsf=2 로 찍으므로 두 배 한다. */
const box = await ev(`(()=>{const G=window.__geo, p=(window.__S.piles||[]).filter(k=>k.sort==='bones');
  const pt=p.map(k=>[(G.cx+k.x*G.sc)*2,(G.cy+k.y*G.sc*G.squash)*2]);
  if(!pt.length) return null;
  let best=null;
  for(const c of pt){const n=pt.filter(o=>Math.abs(o[0]-c[0])<330&&Math.abs(o[1]-c[1])<200).length;
    if(!best||n>best[0]) best=[n,c[0],c[1]];}
  return {n:best[0], cx:Math.round(best[1]), cy:Math.round(best[2])};})()`);
const shot = async (old, out) => {
  await ev(`globalThis.__CORPSEOLD = ${old ? 1 : 0}`);
  await wait(900);                       // 옛 그림을 처음 받아오는 시간 — 안 기다리면 얼룩만 찍힌다
  const s = await S("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(out, Buffer.from(s.data, "base64")); };
await shot(1, "tmp/v46_old.png");
await shot(0, "tmp/v46_new.png");
await ev("globalThis.__CORPSEOLD = 0");
fs.writeFileSync("tmp/v46_box.json", JSON.stringify(box));
console.log(JSON.stringify({ at, froze, st, box, errs: errs.slice(0, 3) }));
await S("Target.closeTarget", { targetId });
process.exit(0);
