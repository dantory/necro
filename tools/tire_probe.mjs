/* **10층에서 왜 안 끝나는가**(D-3) — 조용한 자리는 늘 10층 관문이다. 씨앗 7 은 그 주인이
   249초를 살았다. 「지침」(battle.js TIRE_AT)을 넣어도 안 끝났다면 곱하는 쪽이 아니라
   **곱해질 피해가 0** 이라는 뜻이므로, 그 자리에서 무엇이 0 인지를 직접 본다.

     node tools/tire_probe.mjs [분=7] [씨앗=7]

   5초마다 적는다: 층 · 주인 체력(%) · 주인이 산 시간 · 지침 배수 · 군세 · 시체 · 마나 ·
   그 5초 동안 **주인에게 들어간 피해**(S.dealtAcc 의 늘어남) · 네크로 체력.
   ★ loop_health 골격 그대로 — 씨앗 박고 rAF 끊고 step 을 직접 돌리고 auto() 를 제 박자로. */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const MIN = +(process.argv[2] || 7), SEED = +(process.argv[3] || 7), STEP = 5;

const stale = (await (await fetch(CDP + "/json/list")).json())
  .filter(t => t.type === "page" && t.url.startsWith(PAGE.split("index.html")[0]));
for (const t of stale) await fetch(`${CDP}/json/close/${t.id}`).catch(() => {});

const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
await new Promise(r => bws.addEventListener("open", r));

const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
const seedSrc = `Math.random = (() => { let s = (${SEED} >>> 0) || 1;
   return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();`;
await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc });
/* **지침을 켠 채로도 봐야 갈린다**(2026-08-14) — ab_tire 가 「팔 둘이 byte 단위로 같다」를
   냈는데, say()/fx 는 난수를 안 먹으므로 그것만으론 「안 밟았다」와 「밟았는데 곱해질
   피해가 0 이었다」가 안 갈린다. TP_TIRE=45 로 켜고 아래 「지침」 칸을 직접 읽는다. */
const TIRE = +(process.env.TP_TIRE || 0);
if (TIRE > 0) await S("Page.addScriptToEvaluateOnNewDocument", { source: `globalThis.__TIRE_AT = ${TIRE};` });
/* **졸개 상한**(ADD_CAP · ROADMAP D-3 축 ①) — 이 자의 잣대는 「주인피해가 0 을 벗어나는가」다.
   TP_ADDCAP=N 으로 켜고 같은 씨앗·같은 길이로 돌려 앞 판(0)과 나란히 읽는다. */
const ADDCAP = +(process.env.TP_ADDCAP || 0);
if (ADDCAP > 0) await S("Page.addScriptToEvaluateOnNewDocument", { source: `globalThis.__ADD_CAP = ${ADDCAP};` });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url: PAGE });
await wait(1500);
await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
await S("Page.reload", { ignoreCache: true });
await wait(4500);
await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
await wait(900);
await S("Runtime.evaluate", { expression: "window.requestAnimationFrame = () => 0" });
/* ★ **끊고 나서 한 박자 쉰다** — loop_health 가 이미 겪고 적어 둔 자리인데(그 파일 82줄)
   이 자를 만들 때 그 한 줄을 안 옮겼다. rAF 를 끊어도 **이미 예약된 콜백 하나**가 남아
   벽시계로 돌 수도, 안 돌 수도 있다. 그 한 번이 newRun 뒤에 떨어지면 step 을 돌리고
   난수를 한 움큼 퍼 가서 **같은 씨앗인데 판이 달라진다.**
   실측(2026-08-14): 이 줄이 없을 때 씨앗 7 을 두 번 돌리니 0:15 부터 갈렸다
   (군세 3/2 · 시체 5/6 · 마나 29/35). 넣은 뒤 두 판이 완전히 같아졌다. */
await wait(200);
await S("Runtime.evaluate", { awaitPromise: true, expression:
  `(async()=>{ const B = await import("/js/battle.js"); ${seedSrc} B.newRun(); return "ok"; })()` });

const tick = `(async()=>{
  const B = await import("/js/battle.js"), C = await import("/js/core.js");
  const S = window.__S; const n = Math.round(${STEP} / 0.05);
  const R = window.__R || (window.__R = { t: 0, autoT: 0, deaths: 0, prevDealt: 0, says: [] });
  for (let i = 0; i < n; i++) {
    B.step(0.05); R.t += 0.05;
    if ((R.autoT += 0.05) > 0.35) { R.autoT = 0; try { window.auto(); } catch {} }
    if (S.dead) { R.deaths++; C.META.runs++; B.newRun(); }
  }
  let b = null; for (const m of S.mobs) if (m.boss) { b = m; break; }
  /* ★ **「곱해질 피해」 칸이 넉 대째 거짓이었다**(2026-08-14 · 결함 ④) — S.dealtAcc 는
     누적이 아니라 **한 틱 몫**이고 step 이 끝날 때마다 0 으로 지운다(battle.js 776줄).
     그래서 (dealt - prevDealt) 는 늘 0 이거나 -63 같은 **음수**로 나왔다. 하필 이 칸이
     「27배를 곱해도 안 죽는다」의 곱해질 쪽이라, 여기가 거짓이면 벽을 못 가른다.
     → 이제 **주인 체력이 실제로 준 몫**을 잰다(같은 개체일 때만 — 층이 바뀌어 새 주인이
       서면 앞 주인의 체력과 빼면 안 된다). 군대 전체 화력은 step 이 이미 고르게 다듬어
       둔 S.armyDps 를 그대로 읽는다. */
  let 주인피해 = 0;
  if (b && R.prevBoss === b) 주인피해 = Math.max(0, (R.prevBossHp || 0) - b.hp);
  R.prevBoss = b; R.prevBossHp = b ? b.hp : 0;
  return JSON.stringify({ t: Math.round(R.t), 층: S.floor, 죽음: R.deaths,
    주인피해: Math.round(주인피해), 화력: Math.round(S.armyDps || 0),
    주인: b ? { hp: Math.round(100 * b.hp / b.hpMax), 산시간: Math.round(b.age || 0),
                /* ★ 결함 ⑤ — 네크로는 **늘 원점(0,0)** 이다(S.x 라는 칸이 없다). 빼기를 하니
                   NaN 이 되어 JSON 에서 null 로 찍혔다. 판의 다른 자리도 같은 식을 쓴다
                   (battle.js 921줄 overflow: hypot(m.x, m.y * SQUASH_VIEW)). */
                지침: b.tired ? +(b.wk || 1).toFixed(1) : 0,
                거리: Math.round(Math.hypot(b.x, b.y * (B.SQUASH_VIEW ?? C.SQUASH_VIEW ?? 1))) } : null,
    /* ★ S.corpses 는 개수(숫자)다 — 배열이 아니다(battle.js 478줄 addCorpse/useCorpse).
       .length 로 읽어 7분 내내 undefined 를 찍었다(2026-08-14). 「57구가 쌓였다」는 판단을
       이 칸으로 하므로, 여기가 비면 벽의 원인을 못 가른다.
       (이 주석은 tick 템플릿 안이다 — 백틱을 쓰면 문자열이 끊긴다.) */
    군세: S.minions.length, 시체: Math.round(S.corpses || 0), 마나: Math.round(S.mp || 0),
    내체력: Math.round(100 * S.hp / (S.hpMax || 1)), 적수: S.mobs.length });
})()`;

/* ★ **지침이 페이지에 닿았는지를 먼저 적는다**(2026-08-14) — 앞선 7분 판에서 「지침」 칸이
   내내 "-" 로 나왔는데, 그것이 ①주입이 안 닿았다 인지 ②닿았는데 조건이 안 섰다 인지
   갈리지 않았다. 「밟혔는가」를 재려는 자가 밟힘 여부를 못 보이면 자가 아니다.
   페이지에서 직접 __TIRE_AT 과 TIRE_AT_DEF 를 읽어 첫 줄에 박는다. */
{ const r = await S("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression:
    `(async()=>{ const B = await import("/js/battle.js");
       return JSON.stringify({ 주입: globalThis.__TIRE_AT ?? null, 기본: B.TIRE_AT_DEF,
         상한주입: globalThis.__ADD_CAP ?? null, 상한기본: B.ADD_CAP_DEF }); })()` });
  const g = JSON.parse(r.result.value);
  console.log(`지침 설정 · 주입 __TIRE_AT=${g.주입 === null ? "없음" : g.주입} · 기본 TIRE_AT_DEF=${g.기본}`
    + ` → 실제로 쓰이는 값 ${g.주입 ?? g.기본}${(g.주입 ?? g.기본) > 0 ? "" : " (꺼짐 — 「지침」 칸은 늘 - 로 나온다)"}`);
  console.log(`졸개 상한 · 주입 __ADD_CAP=${g.상한주입 === null ? "없음" : g.상한주입} · 기본 ADD_CAP_DEF=${g.상한기본}`
    + ` → 실제로 쓰이는 값 ${g.상한주입 ?? g.상한기본}${(g.상한주입 ?? g.상한기본) > 0 ? "" : " (꺼짐 — 부르는 쪽에 상한이 없다)"}`); }

console.log(`씨앗 ${SEED} · ${MIN}분 · ${STEP}초 눈금`);
console.log(`  ${"때".padStart(5)} │ 층 │ ${"주인hp%".padStart(7)} │ ${"산시간".padStart(5)} │ ${"지침".padStart(5)} │ ${"거리".padStart(4)} │ 군세 │ 시체 │ 마나 │ ${"주인피해".padStart(8)} │ ${"화력".padStart(6)} │ 내hp% │ 적`);
for (let k = 0; k < (MIN * 60) / STEP; k++) {
  const r = await S("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: tick });
  const d = JSON.parse(r.result.value);
  const b = d.주인;
  const mm = `${Math.floor(d.t / 60)}:${String(d.t % 60).padStart(2, "0")}`;
  console.log(`  ${mm.padStart(5)} │ ${String(d.층).padStart(2)} │ ${String(b ? b.hp + "%" : "-").padStart(7)} │`
    + ` ${String(b ? b.산시간 : "-").padStart(5)} │ ${String(b ? (b.지침 ? "×" + b.지침 : "-") : "-").padStart(5)} │`
    + ` ${String(b ? b.거리 : "-").padStart(4)} │`
    + ` ${String(d.군세).padStart(4)} │ ${String(d.시체).padStart(4)} │ ${String(d.마나).padStart(4)} │`
    + ` ${String(b ? d.주인피해 : "-").padStart(8)} │ ${String(d.화력).padStart(6)} │ ${String(d.내체력).padStart(5)} │ ${d.적수}`);
}
console.log("errors:", errs.slice(0, 3));
await fetch(`${CDP}/json/close/${targetId}`).catch(() => {});
process.exit(0);
