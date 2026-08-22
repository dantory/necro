/* ══ D-44 · 「적은 왜 190 근처에서 멎는가」를 한 수로 가른다 ══
     node tools/d44_stand.mjs [초=40] [씨앗들=1,3,5] [목표층=21]
     node tools/d44_stand.mjs judge          ← 판을 다시 안 돌리고 tmp/d44_stand.json 만 다시 판정

   D-43b 가 갈라 놓은 것: 붙잡음을 30% 가까이 풀어 줘도(문 __GRIP g=1) 적이 얻은 것은
   **10.7px** 인데 껍질까지 남은 것은 **146.7px** 이었다. 풀어 줬는데 **덜 걸었다**
   (걷는비 0.842 → 0.818). 그러니 벽은 「붙잡혀서」가 아니라 **「적이 서는 자리」** 다.

   ★ 판은 **한 글자도 안 고친다** — 새 자 하나만 만든다(손잡이도 안 낸다. 한 팔로 족하다).
   ★ 사람이 가는 그 길로 간다([[probe-must-walk-the-real-path]]) — rAF 를 안 끊고 게임의
     빨리감기로 내려가, 목표층에 닿으면 속도를 1 로 되돌려 실시간 SEC 초를 0.2초마다 뜬다
     (d40_look · d41_pain · d42_walk 와 **같은 안무** · 같은 씨앗 1·3·5 · 같은 층 21 이라
      D-42·D-43 의 수와 그대로 견줄 수 있다).

   ── 무엇을 세는가 ── D-42 는 «자유 토막»을 좇았다. 여기서는 **낱몸의 한살이**를 좇는다:
   적이 태어나 사라질 때까지 **어디서 나서 어디까지 왔고 어디서 멎었는지**, 그리고
   **멎은 그 순간 가장 가까운 소환수가 얼마나 떨어져 있었는지**를 적는다.
   같이 **앞줄이 어디 서 있는지**(소환수 거리 중앙·최고)도 0.2초마다 잰다 — 적이 안 온 것과
   **우리가 마중 나가 그 자리에서 끝난 것**은 이것 없이는 못 가른다.
   게임이 쓰는 그 상수로 센다(화면 눌림 0.78 · 껍질 26 · 나타나는 둘레 190~240 · 닿는 거리
   (m.r+u.r)*0.5 — `approach` 가 쓰는 그 식).

   끝 조건 (재기 전에 적는다 · ROADMAP 의 D-44 항목에도 같은 글이 있다)
     ① **옳은 화면인가** — SEC 초 중 마을에 있던 초 5 이하 · 시작층이 목표층 이상.
     ② **뜻 있는 표본인가** — 닫힌 한살이가 씨앗 합쳐 **30 마리 이상**([[floor-far-from-threshold]]).
     ③ **씨앗 셋**(1·3·5)([[seed-the-probe]]).
     ④ **가르는 수를 적는다**
        ㄱ **들어온 거리** 중앙 (d0 − dmin) — 태어난 자리에서 안으로 몇 px 왔나.
        ㄴ **멎은 자리의 앞줄까지** ÷ **닿는 거리** — 1 근처면 소환수에 막혀 선 것이다.
        ㄷ **앞줄 거리 중앙** 대 **적 거리 중앙** — 우리가 나가 있나, 적이 와 있나.
        ㄹ **표적 없이(자유) 있던 프레임 몫** — 막힌 것이 아니라 그냥 안 온 것인지.
     ⑤ **판정은 갈래로 적는다**
        ㉠ **사거리** — 멎은 자리가 닿는 거리의 **1.5배 밖**인 한살이가 50% 이상이고
           그 자리가 씨앗 사이에서 20px 안으로 일정 → 소환수와 무관한 **상수**가 세운다.
        ㉡ **앞줄에 막힌다** — 멎은 자리의 앞줄까지가 닿는 거리의 **1.2배 이내**인 한살이가
           50% 이상 → 벽은 소환수 앞줄이다. 문은 「앞줄을 어디 세우나」(RING_HOLD·마중·밀기).
        ㉢ **온 적이 없다** — 들어온 거리 중앙이 **20px 미만**이고 앞줄 거리 중앙이 적 거리
           중앙보다 **바깥이거나 30px 이내** → 적이 안 온 게 아니라 **우리가 마중 나가**
           그 자리에서 끝난다. 문은 나타나는 둘레(RING_SPAWN)와 마중 거리.
        어느 것도 절반을 못 넘으면 **섞였다**고 적고 제일 큰 것과 그 몫을 적는다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`;
const PAGE = "http://127.0.0.1:8774/index.html";
const SEC = +(process.argv[2] || 40);
const SEEDS = String(process.argv[3] || "1,3,5").split(",").map(Number);
const TARGET = +(process.argv[4] || 21);
const FF = +(process.env.D44_FF || 8);
const FFCAP = +(process.env.D44_FFCAP || 200);
const OUT = process.env.D44_OUT || "tmp/d44_stand.json";
const fs = await import("node:fs");
const mid = a => a.length ? +a.slice().sort((x, y) => x - y)[a.length >> 1].toFixed(1) : -1;

function 판정(j) {
  const 몸 = Object.values(j).flatMap(o => o.한살이 || []);
  if (!몸.length) return "표본 없음 — 판정 못 함";
  const 마을 = Object.values(j).some(o => o.마을초 > 5), 층 = Object.values(j).some(o => o.시작층 < TARGET);
  const 흠 = [마을 ? "①마을초>5" : "", 층 ? "①시작층 모자람" : "", 몸.length < 30 ? "②표본<30" : ""].filter(Boolean);
  const 들어온 = mid(몸.map(e => +(e.d0 - e.dmin).toFixed(1)));
  const 앞줄비 = 몸.filter(e => e.cd > 0).map(e => e.nd / e.cd);
  const 막힘 = 앞줄비.filter(v => v <= 1.2).length / Math.max(1, 앞줄비.length);
  const 멀리 = 앞줄비.filter(v => v > 1.5).length / Math.max(1, 앞줄비.length);
  const 앞줄중앙 = mid(Object.values(j).map(o => o.앞줄거리중앙).filter(v => v >= 0));
  const 적중앙 = mid(Object.values(j).map(o => o.적거리중앙).filter(v => v >= 0));
  const 멎은자리 = Object.values(j).map(o => o.멎은거리중앙).filter(v => v >= 0);
  const 씨앗폭 = 멎은자리.length > 1 ? Math.max(...멎은자리) - Math.min(...멎은자리) : 0;
  const 갈래 = [];
  if (멀리 >= 0.5 && 씨앗폭 < 20) 갈래.push(`㉠ 사거리(멀리 ${(멀리 * 100).toFixed(0)}% · 씨앗폭 ${씨앗폭.toFixed(1)}px)`);
  if (막힘 >= 0.5) 갈래.push(`㉡ 앞줄에 막힘(${(막힘 * 100).toFixed(0)}%)`);
  if (들어온 < 20 && 앞줄중앙 >= 적중앙 - 30) 갈래.push(`㉢ 온 적이 없다(들어온 ${들어온}px · 앞줄 ${앞줄중앙} 대 적 ${적중앙})`);
  const 몸통 = 갈래.length ? 갈래.join(" + ") : `섞였다 — 막힘 ${(막힘 * 100).toFixed(0)}% · 멀리 ${(멀리 * 100).toFixed(0)}% · 들어온 ${들어온}px`;
  return (흠.length ? `⚠ ${흠.join(" · ")} → ` : "") + 몸통;
}

if (process.argv[2] === "judge") {
  const j = JSON.parse(fs.readFileSync(OUT, "utf-8"));
  console.log(`판정(저장된 수로 다시): ${판정(j)}`); process.exit(0);
}

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

/* 페이지 안에 «좇는 자»를 심는다. 0.2초마다 불리며 **낱몸의 한살이**를 잇는다.
   ★ 적 개체(id)에 표를 붙이므로 표본과 표본 사이에도 이어진다. 사라진 개체는
     지난 표본의 표를 보고 «죽음»으로 닫는다. */
const INSTALL = `(()=>{
 const SQ=0.78,CORE=26,TOUCH=(globalThis.__TOUCH_K!=null?+globalThis.__TOUCH_K:0.5),LIM=90,TAUNT=130;
 const 둘레=()=>{ const mul=(window.__gripMul?window.__gripMul():1);
   const rush=window.__rushNow?!!window.__rushNow():false;
   return { lim: rush?1e9:LIM*mul, taunt: TAUNT*mul }; };
 const W=(window.__d44=window.__d44||{live:new Map(),done:[],t:0,front:[],foe:[],outside:0,frames:0});
 window.__d44step=(dt)=>{
  const S=window.S||{},M=S.mobs||[],U=S.minions||[];
  const R=둘레(); W.t+=dt;
  const 앞줄=U.map(u=>Math.hypot(u.x,u.y*SQ)).sort((a,b)=>a-b);
  const 앞줄중=앞줄.length?앞줄[앞줄.length>>1]:-1, 앞줄최고=앞줄.length?앞줄[앞줄.length-1]:-1;
  const 적들=M.map(m=>Math.hypot(m.x,m.y*SQ)).sort((a,b)=>a-b);
  const 적중=적들.length?적들[적들.length>>1]:-1;
  if(앞줄중>=0&&적중>=0){ W.front.push(앞줄중); W.foe.push(적중); W.frames++;
    if(적중>앞줄중) W.outside++; }
  const seen=new Set();
  for(const m of M){
   seen.add(m.id);
   /* 판이 쓰는 그 셈 — 가장 가까운 소환수와 그때의 «닿는 거리»(approach 의 standoff) */
   let nd=1e9, cd=0, tgt=null, wall=false;
   for(const u of U){ const d=Math.hypot(m.x-u.x,(m.y-u.y)*SQ);
     if(d<nd){ nd=d; cd=(m.r+u.r)*TOUCH; }
     if(d<R.lim&&(!tgt||d<tgt.d)) tgt={d};
     if(u.kind==="golem"&&!u.own&&d<R.taunt) wall=true; }
   const dc=Math.hypot(m.x,m.y*SQ);
   let e=W.live.get(m.id);
   if(!e){ e={id:m.id,t0:W.t,d0:dc,dmin:dc,nd:(nd<1e9?nd:-1),cd:cd,spd:m.spd,r:m.r,
              boss:!!m.boss,free:0,n:0,rooted:0}; W.live.set(m.id,e); }
   e.d1=dc; e.t1=W.t; e.n++;
   if(!(tgt||wall)) e.free++;
   if((m.swing||0)>0) e.rooted++;
   /* ★ **멎은 그 순간**의 사진을 같이 남긴다 — 가장 안쪽까지 왔을 때 앞줄이 어디였나 */
   if(dc<e.dmin){ e.dmin=dc; e.nd=(nd<1e9?nd:-1); e.cd=cd; e.군세=U.length; }
  }
  for(const [mid2,e] of [...W.live]) if(!seen.has(mid2)){ e.why="죽음"; W.done.push(e); W.live.delete(mid2); }
  return {f:S.floor,at:(window.MODE||{}).at,dead:!!S.dead,n:U.length,mob:M.length,
    앞줄:Math.round(앞줄중),앞줄최고:Math.round(앞줄최고),적:Math.round(적중),닫힘:W.done.length};
 };
 window.__d44close=()=>{ for(const [,e] of window.__d44.live){ e.why="창끝"; window.__d44.done.push(e); }
  window.__d44.live.clear();
  const W2=window.__d44;
  return { 몸: W2.done.map(e=>({id:e.id,why:e.why,d0:+e.d0.toFixed(1),d1:+(e.d1??e.d0).toFixed(1),
     dmin:+e.dmin.toFixed(1),nd:+(e.nd??-1).toFixed(1),cd:+(e.cd||0).toFixed(1),
     sec:+((e.t1??e.t0)-e.t0).toFixed(2),spd:+e.spd.toFixed(1),r:+(e.r||0).toFixed(1),
     boss:e.boss,free:e.free,rooted:e.rooted,n:e.n,군세:e.군세??-1})),
   앞줄중앙: W2.front.length?+W2.front.slice().sort((a,b)=>a-b)[W2.front.length>>1].toFixed(1):-1,
   적중앙: W2.foe.length?+W2.foe.slice().sort((a,b)=>a-b)[W2.foe.length>>1].toFixed(1):-1,
   적이앞줄밖몫: W2.frames?+(W2.outside/W2.frames).toFixed(3):-1 };
 };
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
     globalThis.__AUTO_TREE = 1;` });
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
    const a = await ev(`window.__d44step(0.2)`);
    if (a) {
      hist.push(a);
      const 밖 = (a.at !== "dungeon" || a.dead);
      if (밖) { 마을초 += 0.2; if (!앞밖) await ev(`window.__closeWin && window.__closeWin(); window.__toDungeon && window.__toDungeon();`); }
      앞밖 = 밖;
    }
    await wait(200);
  }
  const r = (await ev(`window.__d44close()`)) || { 몸: [] };
  await fetch(`${CDP}/json/close/${targetId}`);

  const 안 = hist.filter(h => h.at === "dungeon" && !h.dead);
  const avg = k => +(안.reduce((s, h) => s + h[k], 0) / Math.max(1, 안.length)).toFixed(2);
  /* ★ **한 표본짜리 한살이는 버린다** — 0.2초 하나로는 「왔나」를 못 잰다
     ([[floor-far-from-threshold]] · [[silent-zero-is-not-an-observation]]). 우두머리도 뺀다
     (돌진 상태머신이 걸음과 다른 안무라 졸개의 «서는 자리»를 흐린다). */
  const 쓸 = (r.몸 || []).filter(e => e.sec >= 0.4 && !e.boss && e.cd > 0);
  const 들어온 = 쓸.map(e => +(e.d0 - e.dmin).toFixed(1));
  const 앞줄비 = 쓸.map(e => +(e.nd / e.cd).toFixed(2));
  const o = out["씨앗" + SEED] = {
    시작층, 끝층: 안.at(-1)?.f ?? 0, ff, 내려가다죽음, 마을초: +마을초.toFixed(1), 표본: 안.length,
    적평균: avg("mob"), 군세평균: avg("n"),
    앞줄거리중앙: r.앞줄중앙, 적거리중앙: r.적중앙, 적이앞줄밖몫: r.적이앞줄밖몫,
    앞줄최고중앙: mid(안.map(h => h.앞줄최고).filter(v => v >= 0)),
    한살이수: (r.몸 || []).length, 쓸한살이: 쓸.length,
    태어난거리중앙: mid(쓸.map(e => e.d0)), 멎은거리중앙: mid(쓸.map(e => e.dmin)),
    들어온거리중앙: mid(들어온), 들어온최고: 들어온.length ? Math.max(...들어온) : -1,
    닿는거리중앙: mid(쓸.map(e => e.cd)),
    멎은자리앞줄까지중앙: mid(쓸.map(e => e.nd)),
    앞줄비중앙: mid(앞줄비),
    막힌몫: 쓸.length ? +(앞줄비.filter(v => v <= 1.2).length / 쓸.length).toFixed(3) : -1,
    멀리선몫: 쓸.length ? +(앞줄비.filter(v => v > 1.5).length / 쓸.length).toFixed(3) : -1,
    자유프레임몫: 쓸.length ? +(쓸.reduce((s, e) => s + e.free, 0) / Math.max(1, 쓸.reduce((s, e) => s + e.n, 0))).toFixed(3) : -1,
    껍질까지온몸: 쓸.filter(e => e.dmin <= 26).length,
    산초중앙: mid(쓸.map(e => e.sec)),
    한살이: 쓸,
  };
  console.log(`═════ 씨앗 ${SEED} ═════`);
  console.log(`  깊은 층까지 ${ff}초(×${FF} · 그 사이 끊김 ${내려가다죽음}) · 층 ${시작층}→${o.끝층} · 마을초 ${o.마을초} · 표본 ${o.표본}`);
  console.log(`  판 위: 적 ${o.적평균} · 군세 ${o.군세평균} · **앞줄 ${o.앞줄거리중앙} (최고 ${o.앞줄최고중앙}) 대 적 ${o.적거리중앙}** · 적이 앞줄 밖 ${(o.적이앞줄밖몫 * 100).toFixed(0)}%`);
  console.log(`  한살이 ${o.한살이수} (쓸 ${o.쓸한살이}) · 태어난 ${o.태어난거리중앙} → 멎은 ${o.멎은거리중앙} · **들어온 ${o.들어온거리중앙}px** (최고 ${o.들어온최고}) · 산초 ${o.산초중앙}`);
  console.log(`  멎은 자리의 앞줄까지 ${o.멎은자리앞줄까지중앙} ÷ 닿는 거리 ${o.닿는거리중앙} = **${o.앞줄비중앙}** · 막힘 ${(o.막힌몫 * 100).toFixed(0)}% · 멀리 ${(o.멀리선몫 * 100).toFixed(0)}% · 자유프레임 ${(o.자유프레임몫 * 100).toFixed(0)}% · 껍질까지 온 몸 ${o.껍질까지온몸}`);
  if (errs.length) console.log(`  ⚠ 페이지 예외 ${errs.length}: ${errs[0]}`);
}
fs.mkdirSync("tmp", { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`\n판정: ${판정(out)}`);
console.log(`(수는 ${OUT})`);
process.exit(0);
