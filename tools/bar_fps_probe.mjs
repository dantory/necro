/* 둘을 한 번에 잰다 (2026-08-15 병수님 지적 둘).
     node tools/bar_fps_probe.mjs [초] [층]

   ① **아군 체력바** — "안 뜨는 애들이 많네, 해골만 뜨는듯". 바는 `hp < hpMax` 일 때만
      그린다. 그러면 **구울(물어뜯을 때마다 35% 회복)·골렘(두꺼움)은 늘 만피**라 영영
      안 뜰 수 있다 — 코드가 종을 가린 게 아니라 **셈이 가린** 것인지 먼저 가른다.
      종마다 「다친 프레임 비율」과 footMetrics 유무(바 자리를 정하는 값)를 같이 낸다.
   ② **렉** — "그리고 렉걸림". 오늘 그리는 쪽에 얹은 것이 셋이다(fx 그림 넷 · 소환 혼 ·
      숨/흔들림). rAF 간격을 그대로 재서 fps 와 **긴 프레임(>33ms)** 비율을 본다. */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const SEC = +(process.argv[2] || 30), FLOOR = +(process.argv[3] || 14);
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
const ev2 = async (e, aw = false) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: aw })).result?.value;
await ev2(`localStorage.setItem("necro.meta.v1",JSON.stringify({gold:9000,lv:24,deepest:${FLOOR + 4},runs:3,up:{hp:3,mp:4,dmg:2,army:5},equip:{},bag:[],tree:{bone:2,armor:3,ghoul:1,legion:3,golem:1,rot:1,harvest:1}}))`);
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4500));
await ev2(`window.toDungeon && window.toDungeon()`);
await new Promise(r => setTimeout(r, 700));
await ev2(`(async()=>{const B=await import("/js/battle.js");B.enterFloor(${FLOOR});return 1;})()`, true);
await new Promise(r => setTimeout(r, 2500));
/* 프레임 간격을 판 안에서 직접 잰다 — 밖에서 스크린샷을 찍으면 그 값이 오염된다. */
await ev2(`window.__FPS = { gaps: [], last: 0 };
  (function loop(t){ const F = window.__FPS; if (F.last) F.gaps.push(t - F.last); F.last = t;
    F.raf = requestAnimationFrame(loop); })(performance.now());`);
const out = await ev2(`(async () => {
  const C = await import("/js/core.js");
  const kinds = {}; let frames = 0;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < ${Math.round(SEC * 5)}; i++) {
    await sleep(200); frames++;
    for (const m of (S.minions || [])) {
      const k = m.kind || "?"; const o = kinds[k] || (kinds[k] = { 본것: 0, 다친것: 0 });
      o.본것++; if (m.hp < m.hpMax) o.다친것++;
    }
  }
  const F = window.__FPS; cancelAnimationFrame(F.raf);
  const g = F.gaps.slice(10).sort((a, b) => a - b);
  const at = (p) => g.length ? +g[Math.floor(g.length * p)].toFixed(1) : null;
  const 바율 = {};
  for (const [k, o] of Object.entries(kinds)) 바율[k] = { 표본: o.본것, 바뜬비율: +(o.다친것 / o.본것 * 100).toFixed(1) };
  /* 바 자리를 정하는 값이 종마다 있는가 — 없으면 바가 엉뚱한 데 뜬다(또는 폭이 기본값) */
  const fm = {};
  for (const b of ["minion/skel", "minion/ghoul", "minion/golem"])
    fm[b] = !!(window.footMetrics && window.footMetrics(b));
  return { 종별: 바율, footMetrics: fm, 판몸수: (S.minions || []).length + (S.mobs || []).length,
           fps: g.length ? +(1000 / (g.reduce((a, b) => a + b, 0) / g.length)).toFixed(1) : null,
           프레임중앙: at(0.5), 상위5퍼: at(0.95), 긴프레임: g.length ? +(g.filter(x => x > 33).length / g.length * 100).toFixed(1) : null };
})()`, true);
console.log(JSON.stringify({ 층: FLOOR, ...out, 콘솔오류: errs }, null, 1));
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(0);
