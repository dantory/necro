/* ══ D-42 · 「자유로운 적은 왜 껍질까지 안 오는가」를 센다 ══
     node tools/d42_walk.mjs [초=30] [씨앗들=1,3] [목표층=21]
     node tools/d42_walk.mjs judge          ← 판을 다시 안 돌리고 tmp/d42_walk.json 만 다시 판정

   D-41 이 갈라 놓은 것: 갈래는 **ㄴ 「길이 멀다」** 다. 자유로운 적(둘레 90 안에 소환수가
   없는 적)은 **늘 있는데**(평균 0.35~1.09 · 최고 5~10), 중앙까지 최단거리가 **114~144** 로
   껍질 26 의 네댓 배 바깥에서 멎는다. 근접 피해는 네 판 다 **0**.
   D-41 이 남긴 ☞ 는 「문을 내기 전에 **어디서 왜 멎는지 한 수로 가르라**」였다.

   ★ 판은 **한 글자도 안 고친다** — 새 자 하나만 만든다.
   ★ 사람이 가는 그 길로 간다([[probe-must-walk-the-real-path]]) — rAF 를 안 끊고 게임의
     빨리감기로 내려가, 목표층에 닿으면 속도를 1 로 되돌려 실시간 SEC 초를 0.2초마다 뜬다
     (d40_look · d41_pain 과 **같은 안무**).

   ── 무엇을 세는가 ──
   적 낱몸에 표를 붙여(`__d42`) **«자유 토막»(free episode)** 을 좇는다. 한 토막은 그 적이
   자유로워진 순간부터 자유가 끝나는 순간까지다. 토막마다 적는다:
     · 시작 거리 · 끝 거리 · 그 동안의 최소 거리 · 좁힌 거리(시작−최소) · 걸린 초
     · **끝난 까닭**: 붙잡힘(다시 둘레 90/도발 안) · 죽음(판에서 사라짐) · 창끝(창이 닫힘)
     · 그 동안 **실제로 다가온 빠르기**(좁힌 거리 / 초) 대 **제 걸음**(m.spd)
   게임이 쓰는 그 상수로 센다(알아보는 거리 90 · 도발 130 · 껍질 26 · 화면 눌림 0.78 ·
   나타나는 둘레 190~240 · 걸음 22~32/초).

   끝 조건 (재기 전에 적는다)
     ① **옳은 화면인가** — SEC 초 중 마을에 있던 초 5 이하 · 시작층이 목표층 이상.
     ② **뜻 있는 표본인가** — 자유 토막이 씨앗 합쳐 **30 개 이상**. 토막이 적으면 비율은
        눈금이 아니라 잡음이다([[floor-far-from-threshold]]).
     ③ **씨앗 둘 이상**([[seed-the-probe]]).
     ④ **가르는 수를 적는다** — 끝난 까닭의 비율 · 토막 중앙 길이 · 좁힌 거리 중앙 ·
        다가온 빠르기 ÷ 제 걸음(«걷긴 걷는가»).
     ⑤ **판정은 갈래로 적는다**:
        ㉠ 다가온 빠르기가 제 걸음의 **20% 미만** → «안 걷는다». 문은 approach/발묶임 쪽.
        ㉡ 끝난 까닭 «붙잡힘» 이 **50% 이상** → «오는 길에 다시 붙잡힌다». 문은 둘레 90/도발.
        ㉢ 끝난 까닭 «죽음» 이 **50% 이상** → «오다가 죽는다». 문은 화력/사거리(뼈 270).
        ㉣ «창끝» 이 다수인데 걷는 빠르기가 멀쩡하다 → 그냥 **거리가 멀다**. 문은 나타나는 둘레.
        어느 것도 절반을 못 넘으면 **섞였다**고 적고 제일 큰 것과 그 몫을 적는다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`;
const PAGE = "http://127.0.0.1:8774/index.html";
const SEC = +(process.argv[2] || 30);
const SEEDS = String(process.argv[3] || "1,3").split(",").map(Number);
const TARGET = +(process.argv[4] || 21);
const FF = +(process.env.D42_FF || 8);
const FFCAP = +(process.env.D42_FFCAP || 200);
/* ★ D-43 · 이 자로 «문을 켠 팔»도 재려고 낸 손잡이 둘. 판은 한 글자도 안 고친다 —
   `D43_GRIP` 은 페이지가 서기 전에 `globalThis.__GRIP` 을 심을 뿐이고(0/없음이면 예전 그대로),
   `D42_OUT` 은 두 팔의 수를 서로 안 덮게 딴 파일로 뺀다. */
const GRIP = process.env.D43_GRIP == null ? null : +process.env.D43_GRIP;
const OUT  = process.env.D42_OUT || "tmp/d42_walk.json";
const fs = await import("node:fs");
if (process.argv[2] === "judge") {
  const j = JSON.parse(fs.readFileSync(process.env.D42_OUT || "tmp/d42_walk.json", "utf-8"));
  console.log(`판정(저장된 수로 다시): ${판정(j)}`); process.exit(0); }

const stale = (await (await fetch(CDP + "/json/list")).json())
  .filter(t => t.type === "page" && t.url.startsWith(PAGE.split("index.html")[0]));
for (const t of stale) await fetch(`${CDP}/json/close/${t.id}`).catch(() => {});
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const wait = ms => new Promise(r => setTimeout(r, ms));

/* 페이지 안에 «좇는 자»를 하나 심는다. 0.2초마다 불리며 낱몸의 자유 토막을 잇는다.
   ★ 적 개체(`m`)에 표를 붙이므로 표본과 표본 사이에도 이어진다. 사라진 개체는
     지난 표본의 표를 보고 «죽음»으로 닫는다(id → 표 를 따로 들고 있는 까닭). */
const INSTALL = `(()=>{
 const SQ=0.78,CORE=26,LIM=90,TAUNT=130;
 /* ★ 2026-08-23 · **자를 판과 맞췄다**([[threshold-and-ruler-must-match]]).
    여태 이 자는 LIM=90 · TAUNT=130 을 제 손으로 적어 「자유인가」를 셌다. 그런데 판이
    실제로 쓰는 둘레는 90 * gripMul() 이고, **뒷정리(몰려옴)에서는 상한이 아예 풀린다**
    (lim = 1e9 — 아무 거리의 소환수에게나 붙는다 · 도발 130 은 몰려옴과 무관하게
    130 * gripMul()). 어긋난 채로 D-43 의 두 팔을 견주면, **문이 놓아 준 적을 자가 도로
    «붙잡힘»으로 닫아** 토막을 잘라 버린다 — 문이 무는지 안 무는지를 볼 수 없게 하는
    어긋남이라 A/B 자체가 못 쓴다. 창구가 없는 낡은 판에서는 예전 수로 물러난다. */
 const 둘레 = ()=>{ const mul = (window.__gripMul ? window.__gripMul() : 1);
   const rush = window.__rushNow ? !!window.__rushNow() : false;
   return { lim: rush ? 1e9 : LIM*mul, taunt: TAUNT*mul, mul, rush }; };
 const W = (window.__d42 = window.__d42 || { live:new Map(), eps:[], t:0 });
 window.__d42step = (dt)=>{
  const S=window.S||{}, M=S.mobs||[], U=S.minions||[];
  const R = 둘레();                     // ★ 판이 지금 쓰는 그 둘레(문·몰려옴이 반영된 값)
  W.t += dt; W.mulSum = (W.mulSum||0) + R.mul*dt; W.rushSec = (W.rushSec||0) + (R.rush?dt:0);
  if (R.mul < 1) W.biteSec = (W.biteSec||0) + dt;
  const seen=new Set();
  let free=0, near=1e9, inCore=0;
  for(const m of M){
    seen.add(m.id);
    let td=1e9, wall=false;
    for(const u of U){ const d=Math.hypot(m.x-u.x,(m.y-u.y)*SQ);
      if(d<td)td=d; if(u.kind==="golem"&&!u.own&&d<R.taunt)wall=true; }
    const dc=Math.hypot(m.x,m.y*SQ);
    if(dc<near)near=dc; if(dc<=CORE)inCore++;
    const isFree = !(td<R.lim) && !wall;
    if(isFree)free++;
    let e = W.live.get(m.id);
    if(isFree){
      if(!e){ e={id:m.id,t0:W.t,d0:dc,dmin:dc,spd:m.spd,boss:!!m.boss,rooted:0,n:0}; W.live.set(m.id,e); }
      e.d1=dc; e.t1=W.t; e.n++;
      if(dc<e.dmin)e.dmin=dc;
      if((m.swing||0)>0)e.rooted++;      // 휘두르느라 발이 멎어 있던 표본
    } else if(e){ e.why="붙잡힘"; W.eps.push(e); W.live.delete(m.id); }
  }
  for(const [mid,e] of [...W.live]) if(!seen.has(mid)){ e.why="죽음"; W.eps.push(e); W.live.delete(mid); }
  return {f:S.floor,at:(window.MODE||{}).at,dead:!!S.dead,n:U.length,mob:M.length,
    free,near:M.length?Math.round(near):-1,inCore,eps:W.eps.length,
    mul:R.mul,rush:R.rush?1:0,lim:R.lim};
 };
 /* ★ 문이 **정말 물었는지** 를 돌려준다 — 이걸 안 보면 「손잡이가 안 움직인 것」과
    「손잡이가 움직였는데 판이 안 바뀐 것」을 못 가른다([[knob-that-does-nothing]]). */
 window.__d42gate = ()=>{ const G = window.__GRIPST || null;
   return { 몫평균:+((W.mulSum||0)/Math.max(0.001,W.t)).toFixed(3), 문초:+((W.biteSec||0)).toFixed(1),
     몰려옴초:+((W.rushSec||0)).toFixed(1), 잰초:+W.t.toFixed(1),
     판문초: G?+G.sec.toFixed(1):-1, 판몫평균: G&&G.sec>0?+(G.mulSum/G.sec).toFixed(3):1, 판hi: G?G.hi:-1 }; };
 window.__d42close = ()=>{ for(const [,e] of window.__d42.live){ e.why="창끝"; window.__d42.eps.push(e); }
   window.__d42.live.clear();
   return window.__d42.eps.map(e=>({id:e.id,why:e.why,d0:+e.d0.toFixed(1),d1:+(e.d1??e.d0).toFixed(1),
     dmin:+e.dmin.toFixed(1),sec:+((e.t1??e.t0)-e.t0).toFixed(2),spd:+e.spd.toFixed(1),
     boss:e.boss,rooted:e.rooted,n:e.n})); };
 return 1;})()`;

const out = {};
for (const SEED of SEEDS) {
  const { targetId } = await raw("Target.createTarget", { url: PAGE });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
  await S("Page.enable"); await S("Runtime.enable");
  await S("Page.addScriptToEvaluateOnNewDocument", { source:
    `Math.random = (() => { let s = (${SEED} >>> 0) || 1;
       return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
     globalThis.__AUTO_TREE = 1;
     ${GRIP == null ? "" : `globalThis.__GRIP = ${GRIP};`}` });
  await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
  await S("Page.navigate", { url: PAGE }); await wait(1500);
  await ev(`localStorage.removeItem("necro.meta.v1")`);
  await S("Page.reload", { ignoreCache: true }); await wait(4500);
  if (!(await ev(`typeof window.__toDungeon === "function"`))) throw new Error("window.__toDungeon 이 없다");
  await ev(`window.__toDungeon()`); await wait(800);

  await ev(`window.S && (window.S.speed = ${FF})`);
  let ff = 0, 앞at = "dungeon", 내려가다죽음 = 0;
  for (; ff < FFCAP; ff++) {
    await wait(1000);
    const a = await ev(`(()=>{const S=window.S||{};return {f:S.floor,at:(window.MODE||{}).at,dead:!!S.dead};})()`);
    if (!a) continue;
    if (a.at !== "dungeon" || a.dead) {
      if (앞at === "dungeon") 내려가다죽음++;
      await ev(`window.__closeWin && window.__closeWin(); window.__toDungeon && window.__toDungeon(); window.S && (window.S.speed = ${FF});`);
      앞at = a.at; continue; }
    앞at = "dungeon";
    if (a.f >= TARGET) break;
  }
  const 시작층 = (await ev(`(window.S||{}).floor`)) ?? 0;
  await ev(`window.S && (window.S.speed = 1)`);
  await wait(300);
  await ev(INSTALL);                                   // ★ 좇는 자를 심는 것은 **내려간 뒤**다

  const hist = [];
  let 마을초 = 0, 앞밖 = false;
  for (let i = 0; i < Math.round(SEC / 0.2); i++) {
    const a = await ev(`window.__d42step(0.2)`);
    if (a) {
      hist.push(a);
      const 밖 = (a.at !== "dungeon" || a.dead);
      if (밖) { 마을초 += 0.2; if (!앞밖) await ev(`window.__closeWin && window.__closeWin(); window.__toDungeon && window.__toDungeon();`); }
      앞밖 = 밖;
    }
    await wait(200);
  }
  const gate = (await ev(`window.__d42gate()`)) || null;   // ★ 문이 정말 물었는지
  const eps = (await ev(`window.__d42close()`)) || [];
  await fetch(`${CDP}/json/close/${targetId}`);

  const 안 = hist.filter(h => h.at === "dungeon" && !h.dead);
  const avg = k => +(안.reduce((s, h) => s + h[k], 0) / Math.max(1, 안.length)).toFixed(2);
  const 적있던초 = +(안.filter(h => h.mob > 0).length * 0.2).toFixed(1);
  const nears = 안.filter(h => h.near >= 0).map(h => h.near);
  const mid = a => a.length ? +a.slice().sort((x, y) => x - y)[a.length >> 1].toFixed(1) : -1;
  /* ★ **한 표본짜리 토막은 버린다** — 0.2초 하나로는 「걷는가」를 못 잰다
     ([[floor-far-from-threshold]] · [[silent-zero-is-not-an-observation]]). */
  const 쓸 = eps.filter(e => e.sec >= 0.4);
  const 까닭 = {}; for (const e of eps) 까닭[e.why] = (까닭[e.why] || 0) + 1;
  const 좁힘 = 쓸.map(e => +(e.d0 - e.dmin).toFixed(1));
  const 빠르기 = 쓸.map(e => +((e.d0 - e.dmin) / e.sec).toFixed(1));
  const 걸음 = 쓸.map(e => e.spd);
  const 비 = 쓸.length ? +(빠르기.reduce((s, v) => s + v, 0) / 걸음.reduce((s, v) => s + v, 0)).toFixed(3) : -1;
  const o = out["씨앗" + SEED] = {
    시작층, 끝층: 안.at(-1)?.f ?? 0, ff, 내려가다죽음, 마을초: +마을초.toFixed(1), 표본: 안.length, 적있던초,
    적평균: avg("mob"), 군세평균: avg("n"), 자유평균: avg("free"),
    최단: nears.length ? Math.min(...nears) : -1,
    코어안초: +(안.filter(h => h.inCore > 0).length * 0.2).toFixed(1),
    토막: eps.length, 쓸토막: 쓸.length, 까닭,
    토막초중앙: mid(쓸.map(e => e.sec)), 시작거리중앙: mid(쓸.map(e => e.d0)),
    최소거리중앙: mid(쓸.map(e => e.dmin)), 좁힘중앙: mid(좁힘), 좁힘최고: 좁힘.length ? Math.max(...좁힘) : -1,
    빠르기중앙: mid(빠르기), 걸음중앙: mid(걸음), 걷는비: 비,
    발묶인표본: 쓸.reduce((s, e) => s + e.rooted, 0), 총표본: 쓸.reduce((s, e) => s + e.n, 0),
    껍질까지온토막: 쓸.filter(e => e.dmin <= 26).length,
    /* ★ D-43 끝 조건 ④㉲ · ⑤㉣ — 문이 «대가»가 아니라 «학살»이 되는지를 본다
       ([[equilibrium-pushes-back]]). 군세가 1 이하로 꺼져 있던 초를 센다. */
    거의전멸초: +(안.filter(h => h.n <= 1).length * 0.2).toFixed(1),
    grip: GRIP, gate,
  };
  console.log(`═════ 씨앗 ${SEED} ═════`);
  console.log(`  깊은 층까지 ${ff}초(×${FF} · 그 사이 끊김 ${내려가다죽음}) · 층 ${시작층}→${o.끝층} · 마을초 ${o.마을초} · 표본 ${o.표본}`);
  console.log(`  판 위: 적 평균 ${o.적평균} (적 있던 초 ${o.적있던초}/${SEC}) · 군세 ${o.군세평균} · 자유 ${o.자유평균} · 최단 ${o.최단} · 코어안초 ${o.코어안초}`);
  console.log(`  자유 토막 ${o.토막} 개(0.4초 이상 ${o.쓸토막}) · 끝난 까닭 ${Object.entries(o.까닭).map(([k, v]) => `${k} ${v}`).join(" · ") || "없음"}`);
  console.log(`  토막 길이 중앙 ${o.토막초중앙}초 · 거리 ${o.시작거리중앙} → 최소 ${o.최소거리중앙} (좁힘 중앙 ${o.좁힘중앙} · 최고 ${o.좁힘최고})`);
  console.log(`  ★ 걷는가: 다가온 빠르기 중앙 ${o.빠르기중앙}/초 대 제 걸음 ${o.걸음중앙}/초 — **비 ${o.걷는비}** · 발묶인 표본 ${o.발묶인표본}/${o.총표본}`);
  console.log(`  껍질(26)까지 온 토막 ${o.껍질까지온토막}/${o.쓸토막} · 군세평균 ${o.군세평균} · 거의전멸초 ${o.거의전멸초} · 문 __GRIP=${o.grip == null ? "없음" : o.grip}`);
  /* ★ 「손잡이가 움직였나」를 판정 앞에 먼저 찍는다 — 문초가 0 이면 아래 수는 문의 값이
     아니라 그냥 또 한 판이다([[knob-that-does-nothing]] · [[silent-zero-is-not-an-observation]]). */
  if (o.gate) console.log(`  ★ 문이 물었나: 문 초 ${o.gate.문초}/${o.gate.잰초} · 몫 평균 ${o.gate.몫평균} · 몰려옴 초 ${o.gate.몰려옴초} (판 자: 문초 ${o.gate.판문초} · 문 동안 몫 ${o.gate.판몫평균} · 옛최고 ${o.gate.판hi})`);
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));

const bad = [];
let 토막합 = 0;
for (const k of Object.keys(out)) { const o = out[k]; 토막합 += o.쓸토막;
  if (o.마을초 > 5) bad.push(`${k}: ${SEC}초 중 ${o.마을초}초를 마을에서 — 표본을 믿지 말 것`);
  if (o.시작층 < TARGET) bad.push(`${k}: 시작층 ${o.시작층} < ${TARGET}`);
  if (o.적있던초 < SEC * 0.8) bad.push(`${k}: 적이 있던 초 ${o.적있던초}/${SEC} — 빈 판을 셀 뻔했다`);
  if (o.ff >= FFCAP) bad.push(`${k}: 상한 ${FFCAP}초 안에 층 ${TARGET} 에 못 닿았다`); }
if (토막합 < 30) bad.push(`자유 토막이 ${토막합} 개 — 30 개에 못 미치면 비율은 눈금이 아니다`);
if (SEEDS.length < 2) bad.push(`씨앗이 ${SEEDS.length} 개 — 한 판은 표본 하나다`);
if (errs.length) bad.push(`콘솔오류 ${errs.length}: ${errs.slice(0, 2).join(" | ")}`);
console.log("");
if (bad.length) { console.log(`판정: 미달 — ${bad.join(" · ")}`); process.exit(1); }

function 판정(out) {
  const V = Object.values(out);
  const 합 = {}; let n = 0;
  for (const o of V) { for (const [k, v] of Object.entries(o.까닭)) 합[k] = (합[k] || 0) + v; n += o.토막; }
  const 몫 = k => n ? (합[k] || 0) / n : 0;
  const 비 = +(V.reduce((s, o) => s + o.걷는비, 0) / V.length).toFixed(3);
  const 좁힘 = +(V.reduce((s, o) => s + o.좁힘중앙, 0) / V.length).toFixed(1);
  const 최소 = +(V.reduce((s, o) => s + o.최소거리중앙, 0) / V.length).toFixed(1);
  const 초 = +(V.reduce((s, o) => s + o.토막초중앙, 0) / V.length).toFixed(2);
  const 껍질 = V.reduce((s, o) => s + o.껍질까지온토막, 0);
  const 꼬리 = ` (토막 ${n} 개 · 중앙 ${초}초 동안 ${좁힘} 만큼 좁혀 ${최소} 에서 멎는다 · 껍질까지 온 토막 ${껍질} 개 ·`
    + ` 까닭 ${Object.entries(합).map(([k, v]) => `${k} ${(100 * v / n).toFixed(0)}%`).join(" · ")})`;
  if (껍질 > 0) return `☒ 껍질(26)까지 온 토막이 ${껍질} 개 있다 — D-41 의 「아무도 26 안으로 안 온다」와 어긋난다. 자부터 다시 볼 것${꼬리}`;
  if (비 < 0.20) return `㉠ **안 걷는다** — 다가온 빠르기가 제 걸음의 ${(100 * 비).toFixed(0)}% 뿐이다. 자유인데도 발이 안 나간다. 문은 approach/발묶임 쪽${꼬리}`;
  if (몫("붙잡힘") >= 0.5) return `㉡ **오는 길에 다시 붙잡힌다** — 토막의 ${(100 * 몫("붙잡힘")).toFixed(0)}% 가 «붙잡힘»으로 닫힌다(걷는비 ${비}). 문은 둘레 90/도발 쪽${꼬리}`;
  if (몫("죽음") >= 0.5) return `㉢ **오다가 죽는다** — 토막의 ${(100 * 몫("죽음")).toFixed(0)}% 가 «죽음»으로 닫힌다(걷는비 ${비}). 문은 화력/사거리(뼈 270) 쪽${꼬리}`;
  if (몫("창끝") >= 0.5) return `㉣ **그냥 거리가 멀다** — 토막의 ${(100 * 몫("창끝")).toFixed(0)}% 가 창끝까지 자유인 채였고 걷는비 ${비}. 문은 나타나는 둘레(190~240) 쪽${꼬리}`;
  const 큰 = Object.entries(합).sort((a, b) => b[1] - a[1])[0] || ["없음", 0];
  return `**섞였다** — 어느 까닭도 절반을 못 넘는다. 제일 큰 것은 «${큰[0]}» ${(100 * 큰[1] / n).toFixed(0)}% (걷는비 ${비})${꼬리}`;
}
console.log(`판정: 통과 — ${판정(out)}`);
bws.close();
process.exit(0);
