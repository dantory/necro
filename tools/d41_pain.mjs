/* ══ D-41 · 「왜 한 대도 안 맞는가」를 센다 ══
     node tools/d41_pain.mjs [초=30] [씨앗들=1,3] [목표층=21]

   D-40 이 눈으로 본 것: 군세가 18→3 으로 꺼지는 그 순간에도 **붉은 오브가 한 칸도
   안 준다**(체력비 최저 1.000 · 두 팔 · 150 표본). 그래서 무너짐이 화면에서 아무것도
   아닌 일로 지나간다 — D 의 손잡이는 사건이 아니라 **«대가»** 라는 것이 D-40 의 ☞ 다.

   그런데 「대가를 붙이자」는 아직 **짐작**이다([[cause-written-in-the-item-is-a-guess]]).
   안 맞는 까닭이 셋 중 무엇인지 모르면 문을 어디에 낼지도 모른다:
     ㄱ **소환수가 다 잡는다** — 적이 죄다 둘레 90 안의 소환수에게 붙잡혀 자유로운 적이 0.
     ㄴ **길이 멀다** — 자유로운 적은 있는데 판 가운데(CORE_R=26)까지 못 온다.
     ㄷ **들어오는데 안 맞는다** — CORE_R 안에 드는데 타격 예약(p.core)이 안 풀린다.
   이 자는 판을 **한 글자도 안 고치고** 그 셋을 갈라 놓는다.

   ★ 사람이 가는 그 길로 간다([[probe-must-walk-the-real-path]]) — rAF 를 안 끊고 게임의
     제 고리를 돌린다. 깊은 층까지는 게임의 빨리감기(S.speed)로 내려가고, 목표층에 닿으면
     속도를 1 로 되돌려 실시간 SEC 초를 0.2초마다 뜬다. d40_look.mjs 와 같은 안무다.

   끝 조건 (재기 전에 적는다)
     ① **옳은 화면인가** — SEC 초 중 마을에 있던 초가 5 이하 · 표본의 층이 다 목표층 이상.
     ② **표본이 뜻이 있는가** — 적이 판에 한 마리라도 있던 초가 SEC 의 80% 이상.
        판이 비어 있던 시간을 「안 맞는다」로 세면 안 된다.
     ③ **씨앗 둘 이상**([[seed-the-probe]]) — 한 판은 표본 하나다.
     ④ **셋을 가르는 수를 적는다** — 자유로운 적 평균/최고 · 중앙까지 최단거리의 최저 ·
        CORE_R 안에 든 적이 있던 초 · 실제로 맞은 횟수(hurtLog 새 항목)와 그 원인.
     ⑤ **판정은 갈래로 적는다** — 자유 0 이면 ㄱ · 자유>0 인데 최단>CORE_R 이면 ㄴ ·
        CORE_R 안에 드는데 맞은 횟수 0 이면 ㄷ. 맞은 횟수가 0 이 아니면 D-40 의 눈이
        틀린 것이므로 **그것부터 다시 본다.** */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`;
const PAGE = "http://127.0.0.1:8774/index.html";
const SEC = +(process.argv[2] || 30);
const SEEDS = String(process.argv[3] || "1,3").split(",").map(Number);
const TARGET = +(process.argv[4] || 21);
const FF = +(process.env.D41_FF || 8);
const FFCAP = +(process.env.D41_FFCAP || 200);
const fs = await import("node:fs");
if (process.argv[2] === "judge") {           // 셈만 고쳐 다시 판정한다(판을 다시 안 돌린다)
  const j = JSON.parse(fs.readFileSync("tmp/d41_pain.json", "utf-8"));
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

/* 판 안의 값은 **게임이 쓰는 그 식 그대로** 센다 — 적의 표적 고르기(battle.js:2081~)와
   같은 상수: 알아보는 거리 90 · 도발 130 · 가운데 껍질 26 · 화면 눌림 0.78. */
const PEEK = `(()=>{const S=window.S||{};const M=S.mobs||[],U=S.minions||[];
 const SQ=0.78,CORE=26,LIM=90,TAUNT=130;
 let free=0,near=1e9,inCore=0;
 for(const m of M){let td=1e9,wall=false;
   for(const u of U){const d=Math.hypot(m.x-u.x,(m.y-u.y)*SQ);
     if(d<td)td=d; if(u.kind==="golem"&&!u.own&&d<TAUNT)wall=true;}
   if(!(td<LIM)&&!wall)free++;
   const dc=Math.hypot(m.x,m.y*SQ); if(dc<near)near=dc; if(dc<=CORE)inCore++;}
 return {f:S.floor,at:(window.MODE||{}).at,dead:!!S.dead,n:U.length,mob:M.length,
   free,near:M.length?Math.round(near):-1,inCore,hp:Math.round(S.hp||0),hm:Math.round(S.hpMax||1),
   hl:(S.hurtLog||[]).map(e=>e.t.toFixed(3)+"|"+e.cause+"|"+Math.round(e.dmg))};})()`;

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

  const hist = [], 맞음 = new Set();
  let 마을초 = 0, 앞밖 = false;
  for (let i = 0; i < Math.round(SEC / 0.2); i++) {
    const a = await ev(PEEK);
    if (a) {
      /* hurtLog 는 5초만 남으므로 0.2초마다 주워 모은다. ★ **이 표본에서 처음 본 것**만
         따로 더해 둔다 — 그래야 「무너진 동안 얼마나 아팠나」를 뒤에서 가를 수 있다. */
      let 새 = 0, 새근접 = 0;
      for (const h of a.hl) if (!맞음.has(h)) { 맞음.add(h);
        const [, c, d] = h.split("|"); 새 += +d; if (c !== "pool" && c !== "curse") 새근접 += +d; }
      a.새 = 새; a.새근접 = 새근접;
      hist.push(a);
      const 밖 = (a.at !== "dungeon" || a.dead);
      if (밖) { 마을초 += 0.2; if (!앞밖) await ev(`window.__closeWin && window.__closeWin(); window.__toDungeon && window.__toDungeon();`); }
      앞밖 = 밖;
    }
    await wait(200);
  }
  await fetch(`${CDP}/json/close/${targetId}`);

  const 안 = hist.filter(h => h.at === "dungeon" && !h.dead);
  const avg = k => +(안.reduce((s, h) => s + h[k], 0) / Math.max(1, 안.length)).toFixed(2);
  const 적있던초 = +(안.filter(h => h.mob > 0).length * 0.2).toFixed(1);
  const nears = 안.filter(h => h.near >= 0).map(h => h.near);
  const 원인 = {};
  for (const h of 맞음) { const [, c, d] = h.split("|"); const o = 원인[c] || (원인[c] = { 번: 0, 량: 0 }); o.번++; o.량 += +d; }
  /* ★ **D 가 물어야 할 그 수** — 군세가 「서 있던 최고의 절반」 아래로 내려간 동안과
     그 밖의 시간에 초당 얼마나 아픈가(D-34 절대 자와 같은 「무너짐」 정의). 배수가 1 근처면
     무너짐에는 **대가가 안 붙어 있는 것**이고, 그것이 곧 D 의 손잡이가 갈 자리다. */
  let hi = 0, 무너진표본 = 0, 무너진피해 = 0, 평상표본 = 0, 평상피해 = 0;
  for (const h of 안) { if (h.n > hi) hi = h.n;
    if (hi >= 3 && h.n <= hi / 2) { 무너진표본++; 무너진피해 += h.새 || 0; }
    else { 평상표본++; 평상피해 += h.새 || 0; } }
  const 무너진초당 = 무너진표본 ? +(무너진피해 / (무너진표본 * 0.2)).toFixed(1) : -1;
  const 평상초당 = 평상표본 ? +(평상피해 / (평상표본 * 0.2)).toFixed(1) : -1;
  const o = out["씨앗" + SEED] = {
    시작층, 끝층: 안.at(-1)?.f ?? 0, ff, 내려가다죽음, 마을초: +마을초.toFixed(1), 표본: 안.length, 적있던초,
    적평균: avg("mob"), 군세평균: avg("n"),
    자유평균: avg("free"), 자유최고: Math.max(0, ...안.map(h => h.free)), 자유0초: +(안.filter(h => h.free === 0).length * 0.2).toFixed(1),
    최단: nears.length ? Math.min(...nears) : -1, 최단중앙: nears.length ? nears.slice().sort((a, b) => a - b)[nears.length >> 1] : -1,
    코어안초: +(안.filter(h => h.inCore > 0).length * 0.2).toFixed(1),
    맞은횟수: 맞음.size, 원인,
    근접량: +안.reduce((s2, h) => s2 + (h.새근접 || 0), 0).toFixed(1),
    무너진초: +(무너진표본 * 0.2).toFixed(1), 무너진초당, 평상초당,
    대가배수: (평상초당 > 0 && 무너진초당 >= 0) ? +(무너진초당 / 평상초당).toFixed(2) : -1,
    체력비최저: +Math.min(...안.map(h => h.hm ? h.hp / h.hm : 1)).toFixed(3),
  };
  console.log(`═════ 씨앗 ${SEED} ═════`);
  console.log(`  깊은 층까지 ${ff}초(×${FF} · 그 사이 끊김 ${내려가다죽음}) · 층 ${시작층}→${o.끝층} · 마을초 ${o.마을초} · 표본 ${o.표본}`);
  console.log(`  판 위: 적 평균 ${o.적평균} (적이 있던 초 ${o.적있던초}/${SEC}) · 군세 평균 ${o.군세평균}`);
  console.log(`  ㄱ 자유로운 적: 평균 ${o.자유평균} · 최고 ${o.자유최고} · 자유 0 이던 초 ${o.자유0초}`);
  console.log(`  ㄴ 중앙까지 최단거리: 최저 ${o.최단} · 중앙값 ${o.최단중앙} (껍질 26)`);
  console.log(`  ㄷ CORE_R 안에 적이 있던 초 ${o.코어안초} · 맞은 횟수 ${o.맞은횟수} · 근접으로 받은 피해 ${o.근접량}`);
  console.log(`     원인별: ${Object.entries(o.원인).map(([c, v]) => `${c} ${v.번}번 ${Math.round(v.량)}`).join(" · ") || "없음"}`);
  console.log(`  ★ 대가: 무너진 초 ${o.무너진초} · 그 동안 초당 ${o.무너진초당} · 평상시 초당 ${o.평상초당} · **배수 ${o.대가배수}**`);
  console.log(`  체력비 최저 ${o.체력비최저}`);
}
fs.writeFileSync("tmp/d41_pain.json", JSON.stringify(out, null, 1));

const bad = [];
for (const k of Object.keys(out)) { const o = out[k];
  if (o.마을초 > 5) bad.push(`${k}: ${SEC}초 중 ${o.마을초}초를 마을에서 — 표본을 믿지 말 것`);
  if (o.시작층 < TARGET) bad.push(`${k}: 시작층 ${o.시작층} < ${TARGET}`);
  if (o.적있던초 < SEC * 0.8) bad.push(`${k}: 적이 있던 초 ${o.적있던초}/${SEC} — 빈 판을 「안 맞는다」로 셀 뻔했다`);
  if (o.ff >= FFCAP) bad.push(`${k}: 상한 ${FFCAP}초 안에 층 ${TARGET} 에 못 닿았다`); }
if (SEEDS.length < 2) bad.push(`씨앗이 ${SEEDS.length} 개 — 한 판은 표본 하나다`);
if (errs.length) bad.push(`콘솔오류 ${errs.length}: ${errs.slice(0, 2).join(" | ")}`);
console.log("");
if (bad.length) { console.log(`판정: 미달 — ${bad.join(" · ")}`); process.exit(1); }

/* ⑤ 갈래 판정 — **한 자리로 모은다.** `node tools/d41_pain.mjs judge` 로 저장된
   tmp/d41_pain.json 만 가지고 다시 판정할 수 있다(판을 4분 다시 돌리지 않고 셈만 고친다). */
function 판정(out) {
  const V = Object.values(out);
  const 자유 = V.reduce((s, o) => s + o.자유평균, 0) / V.length;
  const 최단 = Math.min(...V.map(o => o.최단));
  const 코어초 = V.reduce((s, o) => s + o.코어안초, 0) / V.length;
  const 맞음 = V.reduce((s, o) => s + o.맞은횟수, 0);
  const 근접 = V.reduce((s, o) => s + o.근접량, 0);
  /* ★ **배수는 아무 때나 믿으면 안 된다**([[silent-zero-is-not-an-observation]]).
     무너진 초가 6 초도 안 되거나 평상시 피해가 0 이면 그 자리엔 «잴 것이 없다» —
     0 을 「대가가 없다」로 읽으면 없는 관찰을 만들어 내는 것이다.
     ★ 문턱을 3 → 6 으로 올린 것은 **첫 판을 보고 나서**다(4.2초 한 씨앗이 「배수 0」이라는
       판정을 혼자 만들어 냈다). 값이 아니라 **믿을 자리인지**를 가르는 문턱이라 올렸고,
       그래서 이 자리의 결론은 배수가 아니라 «근접 0» 에 기댄다. */
  const 쓸 = V.filter(o => o.무너진초 >= 6 && o.평상초당 > 0);
  const 배수 = 쓸.length ? +(쓸.reduce((s, o) => s + o.대가배수, 0) / 쓸.length).toFixed(2) : null;
  const 배수말 = 배수 === null
    ? `**대가배수는 못 쟀다** — 무너진 초가 ${V.map(o => o.무너진초).join("·")} 로 6초에 못 미치거나 평상시 피해가 0 이다(잴 것이 없는 자리다)`
    : (배수 < 0.65 ? `**대가배수 ${배수} — 무너진 동안이 되레 덜 아프다.** 무너짐에 대가가 안 붙어 있다`
     : 배수 <= 1.35 ? `**대가배수 ${배수} — 평상시와 같다.** 무너짐에 대가가 안 붙어 있다`
     : `**대가배수 ${배수} — 무너진 동안이 더 아프다.** 크기를 볼 것`);
  if (근접 > 0) return `☒ 근접으로 ${근접} 을 맞았다 — 「둘레가 안 뚫린다」가 틀렸다. 자부터 다시 볼 것`;
  if (자유 >= 0.5 && 코어초 > 0) return `ㄷ **들어오는데 안 맞는다** — CORE_R 안에 있던 초 ${코어초.toFixed(1)} 인데 근접 피해 0. 문을 낼 자리는 «타격 예약»이다`;
  if (최단 > 26) return `ㄴ **길이 멀다.** 근접 피해 0 · 중앙까지 최단 ${최단} ≫ 26 — 적이 껍질 근처에도 못 온다`
    + ` (자유로운 적 평균 ${자유.toFixed(2)} 인데도). 맞은 것은 ${맞음} 번이고 **전부 «멀리서 오는 것»(장판·저주)** 이다. ${배수말}`;
  return `ㄱ **소환수가 다 잡는다** — 자유로운 적 평균 ${자유.toFixed(2)}. 문을 낼 자리는 «표적 고르기»(둘레 90)다`;
}
console.log(`판정: 통과 — ${판정(out)}`);
bws.close();
process.exit(0);
