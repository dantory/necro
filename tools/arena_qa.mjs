/* **판이 «위에 얹혔는가» — 그리고 맵이 «끝없이 퍼지지 않는가**
   (병수님 2026-08-17 23:37 「어느정도 너비만 실제 맵으로」 · 23:38 「하단 UI를 게임화면위에 올리라고」).
     node tools/arena_qa.mjs

   ★★ **이 자가 없어서 같은 것을 두 번 잃었다.** 08-16 에 「맵은 화면 끝까지 간다」고
     주석까지 적어 놓고, 전체화면으로 바꾸면서 `100% - --panelH` 를 도로 넣었다.
     **적어 둔 «왜» 는 아무것도 안 막는다 — 자만 막는다.**
   넷을 본다:
     ① 무대가 **화면 전체**다(판 자리가 검은 띠가 아니다 = 무대 아래끝 == 창 아래끝)
     ② **맵 띠가 창보다 좁다**(넓은 창에서). 그리고 창을 더 늘려도 **띠는 안 늘어난다**
     ③ **배율이 창 폭을 안 따라간다** — 1400 과 1900 에서 `sc` 가 같아야 한다
        (여기가 「무한정 늘어난다」의 실제 자리다: 예전엔 창이 넓을수록 판이 커졌다)
     ④ **몸들이 판에 안 가린다** — 실제로 그려진 개체 중 **제일 아래 것**의 발이
        아래 판 위끝보다 위에 있다.
   ★★ ④ 를 처음엔 「가운데(cy)가 판 위끝보다 위인가」로 물었는데 **보정이 안 울었다** —
     cy 를 옛 식(h/2)으로 되돌려도 통과했다. 재 보니 h/2 는 판 위끝에서 226px 이나
     떨어져 있었다: **바닥이 문턱에서 멀면 그 수는 눈금이 아니라 상수다.**
     그래서 「가운데」가 아니라 **제일 아래 몸**을 잰다 — 실제로 가려지는 것이 그것이다. */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("Network.setCacheDisabled", { cacheDisabled: true });
const ev2 = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const wait = (ms) => new Promise(r => setTimeout(r, ms));

for (let i = 0; i < 120; i++) {
  if (await ev2(`!!(window.__geo && window.toDungeon)`)) break;
  await wait(200);
}
/* ★ **던전에서 잰다.** 마을은 소품 규칙이 달라 띠가 다르게 보일 수 있다 — 병수님이
   오래 보는 화면은 던전이다(probe-must-walk-the-real-path). */
await ev2(`window.toDungeon && window.toDungeon()`);
await wait(1200);

const READ = `(() => { const g = window.__geo || {};
  const R = el => { const r = el.getBoundingClientRect(); return { t: Math.round(r.top), b: Math.round(r.bottom), l: Math.round(r.left), r: Math.round(r.right) }; };
  return { 뷰: [innerWidth, innerHeight], 무대: R(document.getElementById("stage")),
    판: R(document.getElementById("panel")),
    맵폭: Math.round(g.mapW || 0), 자유높이: Math.round(g.freeH || 0), 판높이: Math.round(g.panelH || 0),
    배율: +(g.sc || 0).toFixed(4), 가운데y: Math.round(g.cy || 0), 눌림: +(g.squash || 0).toFixed(3),
    /* 실제로 그려진 몸 중 **제일 아래 발**(스크린 y). 아군·적을 다 센다. */
    맨아래발: (() => { const S = window.__S; if (!S) return null;
      const all = [].concat(S.minions || [], S.mobs || []).filter(u => u && u.hp > 0);
      if (!all.length) return null;
      return Math.round(Math.max(...all.map(u => (g.cy || 0) + (u.y || 0) * (g.sc || 1) * (g.squash || 1)))); })(),
    몸수: (() => { const S = window.__S; return S ? [].concat(S.minions || [], S.mobs || []).filter(u => u && u.hp > 0).length : 0; })() }; })()`;

const at = async (w, h) => { await S("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await wait(900); return await ev2(READ); };

const fails = [], seen = {};
for (const [w, h] of [[1512, 863], [1400, 900], [1900, 1000], [1100, 800]]) {
  const o = await at(w, h); seen[`${w}×${h}`] = o;
  const t = `${w}×${h}`;
  /* ① 무대가 화면 전체 — 아래끝이 창 아래끝이어야 한다(판이 «얹힌» 것이다) */
  if (Math.abs(o.무대.b - h) > 1)
    fails.push(`① ${t}: 무대가 판만큼 잘렸다(아래끝 ${o.무대.b}/${h}) — 판은 얹는 것이지 자리를 뺏는 게 아니다`);
  /* ② 넓은 창에서 맵 띠가 창보다 좁다 */
  if (w >= 1400 && !(o.맵폭 < w - 20))
    fails.push(`② ${t}: 맵 띠가 창 폭 그대로다(${o.맵폭}/${w}) — 「무한정 늘어난다」 그대로`);
  /* ④ 실제 몸이 판에 안 가린다. ★ 몸이 없으면 «묻지 않는다» — 0마리를 통과로 세면
     그건 「아무도 안 가렸다」가 아니라 **아무것도 못 본 것**이다. */
  if (!o.몸수) fails.push(`④ ${t}: 잴 몸이 없다(0마리) — 이 폭에서는 아무것도 못 물었다`);
  else if (!(o.맨아래발 < o.판.t))
    fails.push(`④ ${t}: 맨 아래 몸의 발(${o.맨아래발})이 아래 판(위끝 ${o.판.t}) 밑이다 — 판이 몸을 가린다`);
}
/* ③ 창을 넓혀도 배율이 안 커진다 */
const a = seen["1400×900"], b = seen["1900×1000"];
if (a && b && Math.abs(a.배율 - b.배율) > 0.02)
  fails.push(`③ 창을 500px 넓히자 배율이 ${a.배율} → ${b.배율} 로 커졌다 — 맵이 창을 따라 늘어난다`);
if (a && b && b.맵폭 !== a.맵폭)
  fails.push(`③ 창을 넓히자 맵 띠도 ${a.맵폭} → ${b.맵폭} 로 늘어났다`);

console.log(JSON.stringify({ 잰것: seen, 콘솔오류: errs, 실패: fails,
  판정: fails.length ? `미달 ${fails.length}건` : "통과" }, null, 1));
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(fails.length || errs.length ? 1 : 0);
