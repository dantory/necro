/* ══ D-46 ㉠ · 「폭발 92% 는 판의 성질인가, 균형 편성의 성질인가」를 한 수로 가른다 ══
     node tools/d46_forks.mjs [초=40] [씨앗들=1,3,5] [목표층=21] [편성들=balance,bone,flesh,wall]
     node tools/d46_forks.mjs judge        ← 판을 다시 안 돌리고 tmp/d46_forks.json 만 다시 판정

   D-45 가 갈라 놓은 것: 층 21 에서 적 483 마리 중 **92% 가 시체폭발의 막타**이고 근접
   소환수는 5% 뿐이다. 그런데 D-45 는 **「균형」편성 하나만** 돌렸다 — 그것이 이 게임의
   성질인지 그 편성의 성질인지 아직 모른다([[cause-written-in-the-item-is-a-guess]]).
   넷 다 폭발로 이긴다면 편성 손잡이가 「누가 죽이나」를 못 바꾼다는 뜻이고(B-1 이 아직
   열려 있는 그 자리), 갈린다면 D-45 의 한 문장을 편성별로 다시 적어야 한다.

   ★ **자를 새로 만들지 않는다** — D-45 가 판에 붙인 장부(`__KILLBY`/`__KILLDMG`/`__KILLAT`)를
     그대로 읽고, 안무·씨앗·층·초까지 D-45 와 **같게** 두었다. 바뀌는 것은 한 줄뿐이다:
     들어가기 전에 `globalThis.__DOCTRINE` 을 박는다(core.js `doctrineId` 가 열어 둔 문).
     그래서 balance 팔은 D-45 의 수와 **그대로 견줄 수 있다** — 자가 옳은지 먼저 보는 자리다.
   ★ 사람이 가는 그 길로 간다([[probe-must-walk-the-real-path]]) — rAF 를 안 끊고 게임의
     빨리감기로 내려가, 목표층에 닿으면 속도를 1 로 되돌리고 **거기서 장부를 비운다.**

   끝 조건 (재기 전에 적는다 · ROADMAP 의 D-46 항목에도 같은 글이 있다)
     ① **옳은 화면인가** — 판마다 마을에 있던 초 5 이하 · 시작층이 목표층 이상.
     ② **뜻 있는 표본인가** — **편성마다** 적의 죽음 30 마리 이상([[floor-far-from-threshold]]).
     ③ **씨앗 셋 × 편성 넷 = 12 판**([[seed-the-probe]]).
     ④ **가르는 수** ㄱ 편성별 **폭발 막타 몫**(%) · ㄴ 편성별 **근접 막타 몫**(%) ·
        ㄷ 편성별 **군세 평균**·**죽음 수**(40초에 몇 마리) · ㄹ **"etc" 몫**.
     ⑤ **판정 갈래** — 문턱은 씨앗 잡음에서 멀게 잡는다(D-45 의 세 씨앗이 90·92·92% 라
        잡음은 2%p 안쪽이다 · 아래 15%p 는 그 일곱 배).
        ㉠ **손잡이가 하나뿐이다** — 편성 넷이 다 폭발 몫 **75% 이상**이고 편성 사이
           **폭(최대-최소) 15%p 미만** → 편성은 「누가 죽이나」를 못 바꾼다. 그러면 92% 는
           판의 성질이고, 편성을 갈리게 하려면 **편성이 폭발 비중 자체를 갈라야** 한다.
        ㉡ **편성이 갈린다** — 폭발 몫 폭 **15%p 이상** → 92% 는 「균형」의 성질이다.
           D-45 의 한 문장을 편성별로 다시 적고, 제일 안 갈리는 편성부터 본다.
        ㉢ **못 센 것이 있다** — "etc" 몫 20% 넘음 → 판정을 미루고 그 길부터 찾는다.
        ㉣ **자가 어긋났다** — balance 팔의 폭발 몫이 D-45 의 92% 에서 **10%p 넘게** 벗어남
           → 값을 읽기 전에 **자를 먼저 의심한다**([[threshold-and-ruler-must-match]]).
        · 곁가지로 함께 적는다: **죽음 수**가 편성 사이 30% 넘게 갈리면 「편성이 «누가»는
          못 갈라도 «얼마나 빨리»는 가른다」를 따로 적는다(D 의 물음에 닿는 수다). */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`;
const PAGE = "http://127.0.0.1:8774/index.html";
const SEC = +(process.argv[2] || 40);
const SEEDS = String(process.argv[3] || "1,3,5").split(",").map(Number);
const TARGET = +(process.argv[4] || 21);
const DOCS = String(process.argv[5] || "balance,bone,flesh,wall").split(",");
const FF = +(process.env.D46_FF || 8);
const FFCAP = +(process.env.D46_FFCAP || 200);
const OUT = process.env.D46_OUT || "tmp/d46_forks.json";
/* ★ D-47 · **같은 자를 그대로 쓰되 문 하나만 연다**(`D47_CORPSE` · 안 주면 옛 판과 같다).
   core.js 의 `__DOC_CORPSE` 게이트를 들어가기 전에 박는다. 안 주면 아래 주입 줄이
   **아예 안 붙어** D-46 이 잰 그 자와 한 글자도 다르지 않다 — 그래야 D-46 의 수와 견준다. */
const CORPSE = process.env.D47_CORPSE;
/* ★ D-50 · **문 하나를 더 연다**(`D50_PURE` · 안 주면 옛 판과 같다).
   battle.js 의 `__ARMY_PURE` 게이트다 — 켜면 「적이 내 소환수를 때린 몫」이
   `KILL_DMG["근접"]`·`S.dealtAcc` 에서 빠진다. 안 주면 이 주입 줄이 **아예 안 붙어**
   D-46/D-47/D-49 가 잰 자와 한 글자도 다르지 않다. */
const PURE = process.env.D50_PURE;
const fs = await import("node:fs");
const KINDS = ["본인", "근접", "지배", "시체폭발", "넘침", "죽음폭발", "etc"];
const 폭발갈래 = ["시체폭발", "넘침", "죽음폭발"];
const 이름 = { balance: "균형", bone: "해골", flesh: "구울", wall: "골렘벽" };
const D45_BALANCE = 92;              // D-45 가 같은 자리에서 낸 수(㉣ 가 견줄 기준)

function 편성별(j) {
  const by = {};
  for (const [k, o] of Object.entries(j)) {
    const d = k.split("/")[0];
    const a = by[d] || (by[d] = { 막타: {}, 깎은몫: {}, 죽음: 0, 깎음: 0, 군세: [], 판: 0, 마을: 0, 얕음: 0 });
    for (const kk of KINDS) { a.막타[kk] = (a.막타[kk] || 0) + (o.막타[kk] || 0); a.깎은몫[kk] = (a.깎은몫[kk] || 0) + (o.깎은몫[kk] || 0); }
    a.죽음 += o.죽음; a.깎음 += o.깎음; a.군세.push(o.군세평균); a.판++;
    if (o.마을초 > 5) a.마을++; if (o.시작층 < TARGET) a.얕음++;
  }
  return by;
}
function 판정(j) {
  const by = 편성별(j);
  const ids = Object.keys(by);
  if (!ids.length) return "표본 없음 — 판정 못 함";
  const 흠 = [];
  const 줄 = [];
  for (const d of ids) {
    const a = by[d];
    if (a.마을) 흠.push(`①${이름[d] || d} 마을초>5 ${a.마을}판`);
    if (a.얕음) 흠.push(`①${이름[d] || d} 시작층 모자람 ${a.얕음}판`);
    if (a.죽음 < 30) 흠.push(`②${이름[d] || d} 표본 ${a.죽음}<30`);
    const 몫 = k => (a.막타[k] || 0) / Math.max(1, a.죽음);
    a.폭발 = +(폭발갈래.reduce((s, k) => s + 몫(k), 0) * 100).toFixed(1);
    a.근접 = +(몫("근접") * 100).toFixed(1);
    a.본인 = +(몫("본인") * 100).toFixed(1);
    a.etc = +(몫("etc") * 100).toFixed(1);
    a.군세평균 = +(a.군세.reduce((s, v) => s + v, 0) / Math.max(1, a.군세.length)).toFixed(2);
    줄.push(`   · ${(이름[d] || d).padEnd(4)} 폭발 ${String(a.폭발).padStart(5)}% · 근접 ${String(a.근접).padStart(4)}% · 본인 ${String(a.본인).padStart(4)}% · 군세 ${String(a.군세평균).padStart(5)} · 죽음 ${a.죽음}`);
  }
  const 폭 = Math.max(...ids.map(d => by[d].폭발)) - Math.min(...ids.map(d => by[d].폭발));
  const 죽max = Math.max(...ids.map(d => by[d].죽음)), 죽min = Math.min(...ids.map(d => by[d].죽음));
  const 죽폭 = (죽max - 죽min) / Math.max(1, 죽max) * 100;
  const etc최대 = Math.max(...ids.map(d => by[d].etc));
  const 갈래 = [];
  if (etc최대 > 20) 갈래.push(`㉢ 못 센 것이 있다(etc 최대 ${etc최대.toFixed(0)}%)`);
  if (by.balance && Math.abs(by.balance.폭발 - D45_BALANCE) > 10)
    갈래.push(`㉣ 자가 어긋났다(균형 ${by.balance.폭발}% · D-45 는 ${D45_BALANCE}%)`);
  if (폭 >= 15) 갈래.push(`㉡ 편성이 갈린다(폭발 몫 폭 ${폭.toFixed(1)}%p)`);
  else if (ids.every(d => by[d].폭발 >= 75)) 갈래.push(`㉠ 손잡이가 하나뿐이다(넷 다 ${Math.min(...ids.map(d => by[d].폭발)).toFixed(0)}% 이상 · 폭 ${폭.toFixed(1)}%p)`);
  const 몸통 = 갈래.length ? 갈래.join(" + ")
    : `섞였다 — 폭 ${폭.toFixed(1)}%p 인데 넷 다 75% 를 넘지는 않는다`;
  const 곁 = 죽폭 >= 30 ? `\n곁가지: **편성이 «얼마나 빨리»는 가른다** — 40초 죽음 ${죽min}~${죽max}(폭 ${죽폭.toFixed(0)}%)` : `\n곁가지: 죽음 수는 편성 사이 ${죽폭.toFixed(0)}% 만 갈린다(문턱 30%)`;
  return (흠.length ? `⚠ ${흠.join(" · ")} → ` : "") + 몸통 + "\n" + 줄.join("\n") + 곁;
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

const RESET = `(()=>{ const B=window.__KILLBY,D=window.__KILLDMG,A=window.__KILLAT;
  if(!B||!D||!A) return 0;
  for(const k of Object.keys(B)) B[k]=0;
  for(const k of Object.keys(D)) D[k]=0;
  for(const k of Object.keys(A)) A[k].length=0;
  const N=window.__TAINT; if(N){ N["\uBAAB"]=0; N["\uD69F\uC218"]=0; }   // ★ D-52 · 오염 장부도 같은 자리에서 비운다
  return 1; })()`;
const READ = `(()=>{ const B=window.__KILLBY,D=window.__KILLDMG,A=window.__KILLAT;
  if(!B) return null;
  const at={}; for(const k of Object.keys(A)) at[k]=A[k].slice();
  const T=window.__RAISETALLY, N=window.__TAINT;
  return { 막타:{...B}, 깎은몫:Object.fromEntries(Object.entries(D).map(([k,v])=>[k,+v.toFixed(1)])), 죽은자리:at,
           오염: N ? { 몫:+N["\uBAAB"].toFixed(1), 횟수:N["\uD69F\uC218"] } : null,
           소환장부: T ? {...T} : null }; })()`;
/* ★ D-48 · **소환 장부도 같은 자에서 읽는다** — 자를 새로 만들지 않는다. 판은 한 톨도 안
   건드리고(읽기만) 목표층에 닿은 그 자리에서 함께 비운다. 없으면 null 로 남겨 **조용한 0 이
   안 되게** 한다([[silent-zero-is-not-an-observation]]). */
const RTRESET = `(()=>{ const T=window.__RAISETALLY; if(!T) return 0;
  for(const k of Object.keys(T)) T[k]=0; return 1; })()`;
/* ★ D-49 · **소환수 쪽 장부도 같은 자에서 읽는다**(js/battle.js `LOST_BY` 머리말 · D-20 이
   붙이고 D-49 가 «맞은 횟수»와 «본인 몫» 칸을 더했다). 여기서도 판은 한 톨도 안 건드린다.
   없으면 null 로 남겨 **조용한 0 이 안 되게** 한다([[silent-zero-is-not-an-observation]]). */
const LTRESET = `(()=>{ const B=window.__LOSTBY,D=window.__LOSTDMG,H=window.__LOSTHITS,E=window.__HEROTALLY;
  if(!B||!D||!H||!E) return 0;
  for(const k of Object.keys(B)) B[k]=0;
  for(const k of Object.keys(D)) D[k]=0;
  for(const k of Object.keys(H)) H[k]=0;
  E.hits=0; E.dmg=0; return 1; })()`;
const LTREAD = `(()=>{ const B=window.__LOSTBY,D=window.__LOSTDMG,H=window.__LOSTHITS,E=window.__HEROTALLY;
  if(!B) return null;
  return { 잃음막타:{...B},
           잃음몫:Object.fromEntries(Object.entries(D).map(([k,v])=>[k,+v.toFixed(1)])),
           잃음횟수:{...H}, 본인:{맞은수:E.hits, 맞은몫:+E.dmg.toFixed(1)} }; })()`;

const out = {};
for (const DOC of DOCS) {
  console.log(`\n╔═══ 편성 ${이름[DOC] || DOC} (${DOC}) ═══╗`);
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
       globalThis.__DOCTRINE = ${JSON.stringify(DOC)};` + (CORPSE == null ? "" :
       `\n       globalThis.__DOC_CORPSE = ${JSON.stringify(+CORPSE)};`) + (PURE == null ? "" :
       `\n       globalThis.__ARMY_PURE = ${JSON.stringify(+PURE)};`) });
    await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
    await S("Page.navigate", { url: PAGE }); await wait(1500);
    await ev(`localStorage.removeItem("necro.meta.v1")`);
    await S("Page.reload", { ignoreCache: true }); await wait(4500);
    if (!(await ev(`typeof window.__toDungeon === "function"`))) throw new Error("window.__toDungeon 이 없다");
    if (!(await ev(`!!window.__KILLBY`))) throw new Error("window.__KILLBY 창구가 없다 — 장부가 안 붙었다");
    const 실편성 = await ev(`globalThis.__DOCTRINE`);
    if (실편성 !== DOC) throw new Error(`편성이 안 박혔다 — ${실편성} != ${DOC}`);
    if (CORPSE != null) { const 실문 = await ev(`globalThis.__DOC_CORPSE`);
      if (+실문 !== +CORPSE) throw new Error(`시체 문이 안 박혔다 — ${실문} != ${CORPSE}`);
      const 실값 = await ev(`JSON.stringify(window.__docCorpse ? window.__docCorpse() : null)`);
      console.log(`    (문 켬 __DOC_CORPSE=${실문} · 이 편성의 시체 쓰임 ${실값})`); }
    if (PURE != null) { const 실순 = await ev(`globalThis.__ARMY_PURE`);
      if (+실순 !== +PURE) throw new Error(`ARMY_PURE 문이 안 박혔다 — ${실순} != ${PURE}`);
      console.log(`    (문 켬 __ARMY_PURE=${실순})`); }
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
    if (!(await ev(RESET))) throw new Error("장부를 못 비웠다");
    const rtOn = await ev(RTRESET);            // D-48 · 없으면 0 — 아래 출력에서 「장부 없음」으로 드러난다
    const ltOn = await ev(LTRESET);            // D-49 · 같은 결 — 소환수 쪽 장부

    const hist = [];
    let 마을초 = 0, 앞밖 = false;
    for (let i = 0; i < Math.round(SEC / 0.2); i++) {
      /* ★ D-49 · **몸도 같이 잰다** — 수명 = 몸 ÷ 초당 맞는 양 이라, 맞은 양만 세면
         「많이 맞아서」와 「몸이 얇아서」가 한 수에 뭉친다([[knob-that-does-nothing]]).
         소환수 hpMax 평균(mhp)과 네크로의 몸(hhp/hhpMax)을 0.2초마다 같이 찍는다. */
      const a = await ev(`(()=>{const S=window.S||{},M=S.minions||[];
        const hs=M.map(u=>u.hpMax||0), mhp=hs.length?hs.reduce((s,v)=>s+v,0)/hs.length:0;
        return {f:S.floor,at:(window.MODE||{}).at,dead:!!S.dead,n:M.length,mob:(S.mobs||[]).length,
                mhp:+mhp.toFixed(1),hhp:+(S.hp||0).toFixed(1),hhpMax:+(S.hpMax||0).toFixed(1)};})()`);
      if (a) {
        hist.push(a);
        const 밖 = (a.at !== "dungeon" || a.dead);
        if (밖) { 마을초 += 0.2; if (!앞밖) await ev(`window.__closeWin && window.__closeWin(); window.__toDungeon && window.__toDungeon();`); }
        앞밖 = 밖;
      }
      await wait(200);
    }
    const r = (await ev(READ)) || { 막타: {}, 깎은몫: {}, 죽은자리: {} };
    const L = ltOn ? await ev(LTREAD) : null;        // ★ D-49 · 소환수 쪽 장부(없으면 null 로 남는다)
    await fetch(`${CDP}/json/close/${targetId}`);

    const 안 = hist.filter(h => h.at === "dungeon" && !h.dead);
    const avg = k => +(안.reduce((s, h) => s + h[k], 0) / Math.max(1, 안.length)).toFixed(2);
    const 죽음 = KINDS.reduce((s, k) => s + (r.막타[k] || 0), 0);
    const 깎음 = KINDS.reduce((s, k) => s + (r.깎은몫[k] || 0), 0);
    const o = out[`${DOC}/씨앗${SEED}`] = {
      편성: DOC, 씨앗: SEED, 시작층, 끝층: 안.at(-1)?.f ?? 0, ff, 내려가다죽음,
      마을초: +마을초.toFixed(1), 표본: 안.length, 적평균: avg("mob"), 군세평균: avg("n"),
      죽음, 깎음: +깎음.toFixed(1), ...r,
      소환수몸: avg("mhp"), 본인몸: avg("hhp"), 본인몸최대: avg("hhpMax"),   // ★ D-49
      잃음장부: L,                                                          // ★ D-49
    };
    if (!rtOn) o.소환장부 = null;
    const 폭발 = 폭발갈래.reduce((s, k) => s + (r.막타[k] || 0), 0);
    console.log(`  씨앗 ${SEED}: 층 ${시작층}→${o.끝층}(${ff}초) · 마을초 ${o.마을초} · 적 ${o.적평균} · 군세 ${o.군세평균} · 죽음 ${죽음} · 폭발 ${(폭발 / Math.max(1, 죽음) * 100).toFixed(0)}% · 근접 ${((r.막타["근접"] || 0) / Math.max(1, 죽음) * 100).toFixed(0)}%`);
    /* ★★ D-52 · **오염을 한 줄로 찍는다 — 두 판을 견주지 않는다.** 「적이 내 편을 때린 몫」이
       옛 길에서 `KILL_DMG["근접"]` 에 얹히던 그 값이다. 분모는 **깎은 몫 합 + 그 몫** —
       옛 판에서 화력 장부가 실제로 부풀던 크기가 그대로 이 수다.
       없으면 null 로 남겨 **조용한 0 이 안 되게** 한다([[silent-zero-is-not-an-observation]]). */
    { const N = o.오염;
      if (!N) console.log(`    (오염 장부 없음 — window.__TAINT 가 안 붙었다)`);
      else console.log(`    오염 ${N.몫.toFixed(0)} (${N.횟수}회) / 깎은몫 ${깎음.toFixed(0)}` +
        ` → 옛 장부가 부풀던 몫 ${(N.몫 / Math.max(1, N.몫 + 깎음) * 100).toFixed(1)}%` +
        ` · 근접 ${(o.깎은몫["근접"] || 0).toFixed(0)} → ${((o.깎은몫["근접"] || 0) + N.몫).toFixed(0)}`); }
    /* ★ D-48 · 한 줄로 같이 찍는다 — 「무엇이 소환을 막았나」. 몫의 분모는 **시도 + 건너뜀**이다
       (상한이 차서 시도조차 못 한 초를 빼면 상한의 몫이 통째로 사라진다). */
    { const T = o.소환장부;
      if (!T) console.log(`    (소환 장부 없음 — window.__RAISETALLY 가 안 붙었다)`);
      else { const 분모 = Math.max(1, T.try + T.capskip);
        const p = v => `${(v / 분모 * 100).toFixed(0)}%`;
        console.log(`    소환 ${T.try + T.capskip}회: 섬 ${p(T.ok)} · 상한 ${p(T.capskip + T.capfull)} · 마나만 ${p(T.soleMana)} · 재사용만 ${p(T.soleCd)} · 시체만 ${p(T.soleCorpse)} · 섞임 ${p(T.multi)} · 지워짐 ${T.lost}`); } }
    /* ★ D-49 · 한 줄로 같이 찍는다 — 「소환수가 무엇에 얼마나 맞고, 몇 대 버티나」. */
    { const L2 = o.잃음장부;
      if (!L2) console.log(`    (소환수 장부 없음 — window.__LOSTBY 가 안 붙었다)`);
      else { const 총맞음 = Object.values(L2.잃음몫).reduce((s, v) => s + v, 0);
        const 총횟수 = Object.values(L2.잃음횟수).reduce((s, v) => s + v, 0);
        const 죽은수 = Object.values(L2.잃음막타).reduce((s, v) => s + v, 0);
        const 한방 = 총맞음 / Math.max(1, 총횟수);
        console.log(`    소환수 죽음 ${죽은수} · 맞음 ${총횟수}회 ${총맞음.toFixed(0)} · 한 방 ${한방.toFixed(1)}` +
          ` · 몸 ${o.소환수몸} (${(o.소환수몸 / Math.max(0.01, 한방)).toFixed(1)}대) · 본인 ${L2.본인.맞은수}회 ${L2.본인.맞은몫.toFixed(0)}` +
          ` · 소환수 몫 ${(총맞음 / Math.max(1, 총맞음 + L2.본인.맞은몫) * 100).toFixed(0)}%`); } }
    if (errs.length) { console.log(`  ⚠ 페이지 예외 ${errs.length}: ${errs[0]}`); errs.length = 0; }
    fs.mkdirSync("tmp", { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  }
}
console.log(`\n판정: ${판정(out)}`);
console.log(`(수는 ${OUT})`);
process.exit(0);
