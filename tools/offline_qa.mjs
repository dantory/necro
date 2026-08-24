/* ══ ② 오프라인 진행 검수 ══ rebirth_qa 와 **같은 CDP 방식.** 시계를 실제로 기다리지 않고
   lastSeen 을 과거·미래로 밀어 넣어 정산을 검사한다. 게임 코드는 손대지 않는다.

     node tools/offline_qa.mjs

   두 갈래로 본다:
   · 순수 로직 — core.js 의 offlineGain/applyOffline 을 controlled now 로 직접 불러 다섯
     케이스(1·8·12시간 · 시계 되돌림 · 경과 0 회귀)를 잰다. 반올림·상한·효율이 정확한지.
   · 화면 배선 — localStorage 에 lastSeen 을 심고 **리로드**해 부팅이 패널을 띄우는지(8시간)
     · 미래(되돌림)면 안 띄우는지. 「패널 안 뜸」을 DOM 으로 확인한다.
   하나라도 실패하면 PASS/FAIL 을 다 찍고 exit 1. */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const HOUR = 3600000;

/* 남아 있던 판을 닫는다(rebirth_qa 와 같은 처방 — 썩은 탭이 렌더러를 나눠 먹지 않게). */
const stale = (await (await fetch(CDP + "/json/list")).json())
  .filter((t) => t.type === "page" && t.url.startsWith(PAGE.split("index.html")[0]));
for (const t of stale) await fetch(`${CDP}/json/close/${t.id}`).catch(() => {});
if (stale.length) console.log(`(남아 있던 판 ${stale.length} 개를 닫았다)`);

const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise((r) => bws.addEventListener("open", r));

const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const evalp = (expression) => S("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }).then((r) => r.result.value);
await S("Page.enable"); await S("Runtime.enable");
await S("Page.navigate", { url: PAGE });
await new Promise((r) => setTimeout(r, 3500));

const results = [];
const push = (name, ok, detail) => { results.push([name, ok, detail]); };

/* ── 순수 로직 ── controlled now 로 직접 부른다(리로드 타이밍 흔들림이 없다). */
const LOGIC = `(async () => {
  const C = await import("/js/core.js");
  const M = C.META;
  const out = [];
  const reset = (d) => { M.gold = 1000; M.corpses = 0; M.relics = 0; M.deepest = d; };
  const gpm = () => C.offlineGoldPerMin(M), cpm = () => C.offlineCorpsePerMin(M), mul = () => C.relicMul();
  /* ★ 시체 창고는 **한 짐(CORPSE_BANK_MAX)** 에서 멈춘다 — 번 것(r.corpses)은 그대로
     적히지만 실제로 실리는 것(r.corpsesIn = META 증가분)은 잘린다. 자도 그 둘을 갈라 본다. */
  const bank = (n) => Math.min(n, C.CORPSE_BANK_MAX);
  const now = Date.now();
  let g0, c0, r, eg, ec;

  reset(20); M.lastSeen = now - 1*${HOUR}; g0 = M.gold; c0 = M.corpses;
  r = C.applyOffline(now);
  eg = Math.round(60 * gpm() * C.OFFLINE_EFF * mul()); ec = Math.round(60 * cpm() * C.OFFLINE_EFF * mul());
  out.push(["1시간 → 60분치 × 50%",
    !!r && r.min===60 && r.capped===false && r.gold===eg && r.corpses===ec && (M.gold-g0)===eg && (M.corpses-c0)===bank(ec) && r.corpsesIn===bank(ec),
    r ? ('min='+r.min+' gold='+r.gold+'/'+eg+' corpse='+r.corpses+'/'+ec+'실림='+(M.corpses-c0)+'/'+bank(ec)+' capped='+r.capped) : 'null']);

  reset(20); M.lastSeen = now - 8*${HOUR}; g0 = M.gold; c0 = M.corpses;
  r = C.applyOffline(now);
  eg = Math.round(480 * gpm() * C.OFFLINE_EFF * mul()); ec = Math.round(480 * cpm() * C.OFFLINE_EFF * mul());
  out.push(["8시간 → 480분치 × 50% (경계 capped=false)",
    !!r && r.min===480 && r.capped===false && r.gold===eg && r.corpses===ec && (M.gold-g0)===eg && (M.corpses-c0)===bank(ec) && r.corpsesIn===bank(ec),
    r ? ('min='+r.min+' gold='+r.gold+'/'+eg+'실림='+(M.corpses-c0)+'/'+bank(ec)+' capped='+r.capped) : 'null']);

  reset(20); M.lastSeen = now - 12*${HOUR}; g0 = M.gold; c0 = M.corpses;
  const ref = C.offlineGain(8*${HOUR}, M);
  r = C.applyOffline(now);
  out.push(["12시간 → 8시간치와 정확히 같음 · capped=true",
    !!r && r.min===480 && r.capped===true && r.gold===ref.gold && r.corpses===ref.corpses && (M.gold-g0)===ref.gold && (M.corpses-c0)===bank(ref.corpses),
    r ? ('min='+r.min+' gold='+r.gold+'/'+ref.gold+' corpse='+r.corpses+'/'+ref.corpses+'실림='+(M.corpses-c0)+'/'+bank(ref.corpses)+' capped='+r.capped) : 'null']);

  /* ★ V-43 — **창고가 한 짐을 넘지 않는다.** 다섯 시간을 비우고 던전에 들어가면
     예전엔 11,040 구가 판에 실렸다(상한 140 · 그림 26 장). 판에 오르기 전에 잘린다. */
  reset(34); M.lastSeen = now - 5*${HOUR};
  r = C.applyOffline(now);
  out.push(["V-43 · 다섯 시간 → 창고는 한 짐에서 멈춘다",
    !!r && r.corpses > C.CORPSE_BANK_MAX && M.corpses === C.CORPSE_BANK_MAX && r.corpsesIn === C.CORPSE_BANK_MAX && r.corpseFull === true,
    '번='+(r&&r.corpses)+' 창고='+M.corpses+'/'+C.CORPSE_BANK_MAX+' full='+(r&&r.corpseFull)]);

  /* 다 찬 창고에 또 부어도 안 넘친다 — 던전에 안 들어가고 여러 번 껐다 켜는 사람. */
  M.lastSeen = now - 5*${HOUR};
  r = C.applyOffline(now);
  out.push(["V-43 · 찬 창고에 또 부어도 그대로",
    !!r && M.corpses === C.CORPSE_BANK_MAX && r.corpsesIn === 0,
    '창고='+M.corpses+' 실림='+(r&&r.corpsesIn)]);

  reset(20); M.lastSeen = now + 1*${HOUR}; g0 = M.gold; c0 = M.corpses;
  r = C.applyOffline(now);
  out.push(["시계 되돌림(미래) → 0 · null · lastSeen 미래 유지",
    r===null && M.gold===g0 && M.corpses===c0 && M.lastSeen >= now + 1*${HOUR},
    'r='+JSON.stringify(r)+' dGold='+(M.gold-g0)+' 미래유지='+(M.lastSeen >= now+1*${HOUR})]);

  reset(20); M.lastSeen = now; g0 = M.gold; c0 = M.corpses;
  r = C.applyOffline(now);
  out.push(["회귀 · 경과 0 → 금·시체 한 톨도 안 늚",
    r===null && M.gold===g0 && M.corpses===c0,
    'r='+JSON.stringify(r)+' dGold='+(M.gold-g0)+' dCorpse='+(M.corpses-c0)]);

  return JSON.stringify(out);
})()`;
for (const [name, ok, detail] of JSON.parse(await evalp(LOGIC))) push(name, ok, detail);

/* ── 화면 배선 ── localStorage 에 lastSeen 을 심고 리로드해 부팅이 패널을 띄우는지 본다. */
const READ = `(async()=>{ const C = await import("/js/core.js");
  return JSON.stringify({ on: document.getElementById("winOffline").classList.contains("on"),
    off: window.__lastOffline, gold: C.META.gold, corpses: C.META.corpses }); })()`;
async function domCheck(metaObj) {
  await S("Runtime.evaluate", { expression: `localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(metaObj))})` });
  await S("Page.reload", { ignoreCache: true });
  await new Promise((r) => setTimeout(r, 3500));
  return JSON.parse(await evalp(READ));
}

{
  const now = Date.now();
  const base = { gold: 1000, corpses: 0, deepest: 20, relics: 0, lv: 1, xp: 0 };
  const a = await domCheck({ ...base, lastSeen: now - 8 * HOUR });
  push("배선 · 8시간 비움 → 패널 뜸 · min 480 · 금 반영",
    a.on === true && a.off && a.off.min === 480 && a.off.capped === false && a.off.gold > 0 && a.off.corpses > 0 && a.gold === 1000 + a.off.gold && a.corpses === a.off.corpsesIn && a.corpses <= 140,
    `on=${a.on} min=${a.off && a.off.min} gold=+${a.off && a.off.gold} corpse=+${a.off && a.off.corpses} 실림=${a.off && a.off.corpsesIn} 창고=${a.corpses} 가진금=${a.gold}`);

  const b = await domCheck({ ...base, lastSeen: now + 1 * HOUR });
  push("배선 · 시계 되돌림 → 패널 안 뜸 · 금 불변",
    b.on === false && b.off === null && b.gold === 1000 && b.corpses === 0,
    `on=${b.on} off=${JSON.stringify(b.off)} 가진금=${b.gold}`);
}

/* ── V-43b · 지고 내려온 시체가 **판에 눕는가** ──
   V-43 을 닫고 재니 셈 116 대 그림 19 였다 — 창고 몫은 `addCorpse` 를 안 거치므로
   `S.piles` 에 한 장도 안 눕는다. `layCarried` 가 셈과 그림을 함께 세우는지 본다.
   ★ **판이 열리는 그 프레임**에서만 성립한다(시간이 흐르면 폭발이 먹어 치운다) —
     던전에 넣고 곧바로 멈춰서(S.running=false) 잰다. */
{
  await domCheck({ gold: 1000, corpses: 0, deepest: 30, relics: 0, lv: 20, xp: 0, lastSeen: Date.now() - 5 * HOUR });
  const c = JSON.parse(await evalp(`(async()=>{ window.__closeAll && window.__closeAll();
    window.__toDungeon(); const S = window.__S; S.running = false;
    const B = await import("/js/battle.js");
    return JSON.stringify({ 셈: S.corpses, 그림: S.piles.length, 상한: B.CORPSE_MAX,
      발밑: S.piles.filter(p => Math.hypot(p.x, p.y) < B.CORE_R * 1.5).length,
      밖: S.piles.filter(p => Math.hypot(p.x, p.y) > B.RING_SPAWN * 1.1).length }); })()`));
  push("V-43b · 지고 내려온 시체가 셈만큼 판에 눕는다",
    c.셈 > 100 && c.그림 === c.셈 && c.셈 <= c.상한,
    `셈=${c.셈} 그림=${c.그림} 상한=${c.상한}`);
  push("V-43b · 발밑에 쌓지 않고 판 안에 흩는다",
    c.발밑 === 0 && c.밖 === 0,
    `발밑=${c.발밑} 판밖=${c.밖}`);
}

let fail = 0;
for (const [name, ok, detail] of results) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  ‹" + detail + "›"}`);
  if (!ok) fail++;
}
console.log(`\n${results.length - fail}/${results.length} PASS`);
await raw("Target.closeTarget", { targetId });
bws.close();
process.exit(fail ? 1 : 0);
