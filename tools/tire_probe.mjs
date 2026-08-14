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
await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 1, mobile: true });
await S("Page.navigate", { url: PAGE });
await wait(1500);
await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
await S("Page.reload", { ignoreCache: true });
await wait(4500);
await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
await wait(900);
await S("Runtime.evaluate", { expression: "window.requestAnimationFrame = () => 0" });
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
  const dealt = S.dealtAcc || 0, d5 = dealt - R.prevDealt; R.prevDealt = dealt;
  return JSON.stringify({ t: Math.round(R.t), 층: S.floor, 죽음: R.deaths,
    주인: b ? { hp: Math.round(100 * b.hp / b.hpMax), 산시간: Math.round(b.age || 0),
                지침: b.tired ? +(b.wk || 1).toFixed(1) : 0, 거리: Math.round(Math.hypot(b.x - S.x, b.y - S.y)) } : null,
    군세: S.minions.length, 시체: (S.corpses || []).length, 마나: Math.round(S.mp || 0),
    피해5초: Math.round(d5), 내체력: Math.round(100 * S.hp / (S.hpMax || 1)), 적수: S.mobs.length });
})()`;

console.log(`씨앗 ${SEED} · ${MIN}분 · ${STEP}초 눈금`);
console.log(`  ${"때".padStart(5)} │ 층 │ ${"주인hp%".padStart(7)} │ ${"산시간".padStart(5)} │ ${"지침".padStart(5)} │ 군세 │ 시체 │ 마나 │ ${"5초피해".padStart(7)} │ 내hp% │ 적`);
for (let k = 0; k < (MIN * 60) / STEP; k++) {
  const r = await S("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: tick });
  const d = JSON.parse(r.result.value);
  const b = d.주인;
  const mm = `${Math.floor(d.t / 60)}:${String(d.t % 60).padStart(2, "0")}`;
  console.log(`  ${mm.padStart(5)} │ ${String(d.층).padStart(2)} │ ${String(b ? b.hp + "%" : "-").padStart(7)} │`
    + ` ${String(b ? b.산시간 : "-").padStart(5)} │ ${String(b ? (b.지침 ? "×" + b.지침 : "-") : "-").padStart(5)} │`
    + ` ${String(d.군세).padStart(4)} │ ${String(d.시체).padStart(4)} │ ${String(d.마나).padStart(4)} │`
    + ` ${String(d.피해5초).padStart(7)} │ ${String(d.내체력).padStart(5)} │ ${d.적수}`);
}
console.log("errors:", errs.slice(0, 3));
await fetch(`${CDP}/json/close/${targetId}`).catch(() => {});
process.exit(0);
