/* **잿빛 야영터 바닥이 «벽지»로 안 읽히는지 켜서 본다** (V-47 의 눈).
     node tools/v47_shot.mjs [초=120]
   ★ 짝짓기: 바닥은 **굽어 놓은 한 장**이라(ground.js `gcv`) 판을 세우고 `__campOld` 만
     갈면 소품·시체·몸 한 개까지 같은 자리인 두 장이 나온다 — 이어 찍으면 다른 판을
     보게 된다([[same-seed-is-not-same-run]]).
   ★ 문은 **두 번 부른다** — 첫 부름은 옛 타일 굽기를 시작만 하고, 그 사이 캐시 열쇠는
     타일 수가 12 로 같아 다시 안 구워진다(js/main.js 의 그 주석).
   ★ 수는 여기서 안 센다 — 자는 `tools/v47_lattice.py`(타일 파일 자체)가 든다.
     여기서 얻을 것은 **판에서 어떻게 읽히는가** 하나뿐이다([[play-it-before-measuring-it]]). */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const SECS = Number(process.argv[2] || 120);   // 40 초로는 15층까지밖에 못 간다(실측)
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
  `Math.random = (() => { let s = 47; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();` });
/* ★ 시작 층을 못 박는다(D-22f) — 안 그러면 사진이 아니라 장례식을 찍는다. */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 34, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 } };
await S("Page.navigate", { url: PAGE }); await wait(1200);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(4500);
await ev("window.__toDungeon && window.__toDungeon()"); await wait(600);
/* 잿빛 야영터(16~25층)에 닿을 때까지 굴린다 — 그 아래·위 구역은 다른 바닥이다. */
let t0 = Date.now(), f = 0;
while ((Date.now() - t0) / 1000 < SECS) {
  await wait(300);
  f = await ev("window.__S ? (window.__S.floor | 0) : 0") || 0;
  if (f >= 16 && f <= 25) break;
}
const froze = await ev("window.__S ? (window.__S.speed = 0, 1) : 0");
await wait(300);
const zone = await ev("window.__S && document.getElementById('hZone') && document.getElementById('hZone').textContent");
const shot = async (out) => { const s = await S("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(out, Buffer.from(s.data, "base64")); return out; };
/* ① 새 바닥 */
await shot("tmp/v47_new.png");
/* ② 옛 바닥 — 두 번 부른다(첫 부름은 굽기를 시작만 한다) */
console.log("문", await ev("window.__campOld && window.__campOld(true)"));
await wait(1500);
await ev("window.__campOld && window.__campOld(true)");
await wait(600);
await shot("tmp/v47_old.png");
/* 되돌려 둔다 — 다음 자가 옛 바닥을 물려받으면 안 된다 */
await ev("window.__campOld && window.__campOld(false)");
console.log("층", f, "구역", zone, "판세움", froze, "errs", errs);
/* 판정 — 사진이 옳은 화면인가만 묻는다(예쁜지는 사람이 본다). */
const bad = [];
if (!(f >= 16 && f <= 25)) bad.push(`층 ${f} — 잿빛 야영터가 아니다`);
if (String(zone || "").indexOf("야영") < 0) bad.push(`구역이 «${zone}» 다`);
if (!froze) bad.push("판을 못 세웠다 — 두 장이 다른 프레임이다");
if (errs.length) bad.push(`콘솔오류 ${errs.length}`);
console.log("판정:", bad.length ? "미달 — " + bad.join(" · ") : "통과 (같은 프레임 두 장을 찍었다)");
await raw("Target.closeTarget", { targetId });
process.exit(bad.length ? 1 : 0);
