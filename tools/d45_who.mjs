/* ══ D-45 · 「누가 178px 자리에서 적을 죽이나」를 한 수로 가른다 ══
     node tools/d45_who.mjs [초=40] [씨앗들=1,3,5] [목표층=21]
     node tools/d45_who.mjs judge          ← 판을 다시 안 돌리고 tmp/d45_who.json 만 다시 판정

   D-44 가 갈라 놓은 것: 적은 190 둘레에서 나서 10px 걸어 보고, 소환수가 **닿지도 않는**
   178px 자리에서 1.4초 만에 죽는다(434 마리 중 껍질까지 온 몸 0 · 멀리선몫 78%).
   그런데 **누가** 죽였는지는 안 셌다 — 그것을 모르고 사거리·둘레를 만지면 또 안 도는
   손잡이가 된다([[knob-that-does-nothing]]).

   ★ **자를 새로 만들지 않고 판에 «장부»를 붙였다** — 적에게 들어가는 피해는 이미
     `hurtMob` 한 길로 모여 있다(js/battle.js:649). 거기에 「누가」를 얹고, 적이 치워지는
     자리에서 막타 갈래·깎은 몫·죽은 자리를 적는다. **판 산수는 한 글자도 안 고쳤다.**
   ★ 사람이 가는 그 길로 간다([[probe-must-walk-the-real-path]]) — rAF 를 안 끊고 게임의
     빨리감기로 내려가, 목표층에 닿으면 속도를 1 로 되돌린다(d40·d41·d42·d44 와 **같은
     안무** · 같은 씨앗 1·3·5 · 같은 층 21 · 같은 40초라 그 수와 그대로 견준다).
   ★ **장부는 내려간 뒤에 비운다** — 빨리감기로 지나온 20 개 층의 죽음이 섞이면 「층 21
     에서 누가 죽이나」가 아니라 「지나오며 누가 죽였나」가 된다.

   끝 조건 (재기 전에 적는다 · ROADMAP 의 D-45 항목에도 같은 글이 있다)
     ① **옳은 화면인가** — SEC 초 중 마을에 있던 초 5 이하 · 시작층이 목표층 이상.
     ② **뜻 있는 표본인가** — 적의 죽음이 씨앗 합쳐 **30 마리 이상**([[floor-far-from-threshold]]).
     ③ **씨앗 셋**(1·3·5)([[seed-the-probe]]).
     ④ **가르는 수** ㄱ 갈래별 **막타 몫**(%) · ㄴ 갈래별 **깎은 몫**(%) ·
        ㄷ 갈래별 **죽은 자리 중앙**(px) · ㄹ **"etc" 몫**.
     ⑤ **판정 갈래**
        ㉠ **본인이 죽인다** — 「본인」 막타 몫 50% 이상 → 벽은 소환수와 무관한 상수
           (`NECRO_ATK.range = 270`). 문은 그 사거리와 피해.
        ㉡ **폭발이 죽인다** — 시체폭발+넘침+죽음폭발 합이 50% 이상 → 문은 폭발 반경·빈도.
        ㉢ **근접 소환수가 죽인다** — 「근접」 막타 몫 50% 이상 → D-44 의 「닿지도 않는
           자리에서 죽는다」와 어긋난다. 값을 고치기 전에 **자를 먼저 의심한다**
           ([[threshold-and-ruler-must-match]]).
        ㉣ **못 센 것이 있다** — "etc" 몫 20% 넘음 → 판정을 미루고 그 길부터 찾는다.
        어느 것도 절반을 못 넘으면 **섞였다**고 적고 제일 큰 것과 그 몫을 적는다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`;
const PAGE = "http://127.0.0.1:8774/index.html";
const SEC = +(process.argv[2] || 40);
const SEEDS = String(process.argv[3] || "1,3,5").split(",").map(Number);
const TARGET = +(process.argv[4] || 21);
const FF = +(process.env.D45_FF || 8);
const FFCAP = +(process.env.D45_FFCAP || 200);
const OUT = process.env.D45_OUT || "tmp/d45_who.json";
const fs = await import("node:fs");
const KINDS = ["본인", "근접", "지배", "시체폭발", "넘침", "죽음폭발", "etc"];
const 폭발갈래 = ["시체폭발", "넘침", "죽음폭발"];
const mid = a => a.length ? +a.slice().sort((x, y) => x - y)[a.length >> 1].toFixed(1) : -1;

function 판정(j) {
  const 팔 = Object.values(j);
  if (!팔.length) return "표본 없음 — 판정 못 함";
  const by = {}, dmg = {}, at = {};
  for (const k of KINDS) { by[k] = 0; dmg[k] = 0; at[k] = []; }
  for (const o of 팔) for (const k of KINDS) { by[k] += o.막타[k] || 0; dmg[k] += o.깎은몫[k] || 0; at[k].push(...(o.죽은자리[k] || [])); }
  const 죽음 = KINDS.reduce((s, k) => s + by[k], 0);
  const 마을 = 팔.some(o => o.마을초 > 5), 층 = 팔.some(o => o.시작층 < TARGET);
  const 흠 = [마을 ? "①마을초>5" : "", 층 ? "①시작층 모자람" : "", 죽음 < 30 ? "②표본<30" : ""].filter(Boolean);
  if (!죽음) return (흠.length ? `⚠ ${흠.join(" · ")} → ` : "") + "죽음 0 — 장부가 안 붙었다";
  const 몫 = k => by[k] / 죽음;
  const etc = 몫("etc"), 폭발 = 폭발갈래.reduce((s, k) => s + 몫(k), 0);
  const 갈래 = [];
  if (etc > 0.2) 갈래.push(`㉣ 못 센 것이 있다(etc ${(etc * 100).toFixed(0)}%)`);
  if (몫("본인") >= 0.5) 갈래.push(`㉠ 본인이 죽인다(${(몫("본인") * 100).toFixed(0)}% · 죽은 자리 ${mid(at["본인"])}px)`);
  if (폭발 >= 0.5) 갈래.push(`㉡ 폭발이 죽인다(${(폭발 * 100).toFixed(0)}%)`);
  if (몫("근접") >= 0.5) 갈래.push(`㉢ 근접 소환수가 죽인다(${(몫("근접") * 100).toFixed(0)}% · 죽은 자리 ${mid(at["근접"])}px)`);
  const 큰 = KINDS.slice().sort((a, b) => by[b] - by[a])[0];
  const 몸통 = 갈래.length ? 갈래.join(" + ")
    : `섞였다 — 제일 큰 것 ${큰} ${(몫(큰) * 100).toFixed(0)}% (죽음 ${죽음})`;
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

/* 장부를 비운다 — **자리를 바꾸지 않는다**(창구가 그 객체를 가리키고 있다). */
const RESET = `(()=>{ const B=window.__KILLBY,D=window.__KILLDMG,A=window.__KILLAT;
  if(!B||!D||!A) return 0;
  for(const k of Object.keys(B)) B[k]=0;
  for(const k of Object.keys(D)) D[k]=0;
  for(const k of Object.keys(A)) A[k].length=0;
  return 1; })()`;
const READ = `(()=>{ const B=window.__KILLBY,D=window.__KILLDMG,A=window.__KILLAT;
  if(!B) return null;
  const at={}; for(const k of Object.keys(A)) at[k]=A[k].slice();
  return { 막타:{...B}, 깎은몫:Object.fromEntries(Object.entries(D).map(([k,v])=>[k,+v.toFixed(1)])), 죽은자리:at }; })()`;

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
  if (!(await ev(`!!window.__KILLBY`))) throw new Error("window.__KILLBY 창구가 없다 — 장부가 안 붙었다");
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
  if (!(await ev(RESET))) throw new Error("장부를 못 비웠다");   // ★ 비우는 것은 **내려간 뒤**다

  const hist = [];
  let 마을초 = 0, 앞밖 = false;
  for (let i = 0; i < Math.round(SEC / 0.2); i++) {
    const a = await ev(`(()=>{const S=window.S||{};return {f:S.floor,at:(window.MODE||{}).at,dead:!!S.dead,n:(S.minions||[]).length,mob:(S.mobs||[]).length};})()`);
    if (a) {
      hist.push(a);
      const 밖 = (a.at !== "dungeon" || a.dead);
      if (밖) { 마을초 += 0.2; if (!앞밖) await ev(`window.__closeWin && window.__closeWin(); window.__toDungeon && window.__toDungeon();`); }
      앞밖 = 밖;
    }
    await wait(200);
  }
  const r = (await ev(READ)) || { 막타: {}, 깎은몫: {}, 죽은자리: {} };
  await fetch(`${CDP}/json/close/${targetId}`);

  const 안 = hist.filter(h => h.at === "dungeon" && !h.dead);
  const avg = k => +(안.reduce((s, h) => s + h[k], 0) / Math.max(1, 안.length)).toFixed(2);
  const 죽음 = KINDS.reduce((s, k) => s + (r.막타[k] || 0), 0);
  const 깎음 = KINDS.reduce((s, k) => s + (r.깎은몫[k] || 0), 0);
  const o = out["씨앗" + SEED] = {
    시작층, 끝층: 안.at(-1)?.f ?? 0, ff, 내려가다죽음, 마을초: +마을초.toFixed(1), 표본: 안.length,
    적평균: avg("mob"), 군세평균: avg("n"),
    죽음, 깎음: +깎음.toFixed(1), ...r,
  };
  console.log(`═════ 씨앗 ${SEED} ═════`);
  console.log(`  깊은 층까지 ${ff}초(×${FF} · 그 사이 끊김 ${내려가다죽음}) · 층 ${시작층}→${o.끝층} · 마을초 ${o.마을초} · 표본 ${o.표본}`);
  console.log(`  판 위: 적 ${o.적평균} · 군세 ${o.군세평균} · **적의 죽음 ${죽음}** · 깎은 몫 합 ${o.깎음}`);
  for (const k of KINDS) {
    const b = r.막타[k] || 0, d = r.깎은몫[k] || 0, a2 = r.죽은자리[k] || [];
    if (!b && !d) continue;
    console.log(`   · ${k.padEnd(5)} 막타 ${String(b).padStart(4)} (${(b / Math.max(1, 죽음) * 100).toFixed(0)}%) · 깎은 몫 ${(d / Math.max(1, 깎음) * 100).toFixed(0)}% · 죽은 자리 중앙 ${mid(a2)}px`);
  }
  if (errs.length) console.log(`  ⚠ 페이지 예외 ${errs.length}: ${errs[0]}`);
}
fs.mkdirSync("tmp", { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`\n판정: ${판정(out)}`);
console.log(`(수는 ${OUT})`);
process.exit(0);
