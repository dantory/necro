/* **처음 몇 분이 위험한가** — 병수님 2026-08-21 20:27 「캐릭터가 초반부터 너무 쎔」.
     node tools/start_probe.mjs [분=3] [씨앗들=1,3,7]

   early_curve 는 「얼마나 빨리 세지나」(층·레벨·힘비)를 본다. 그런데 병수님 말씀은
   빠르기가 아니라 **세기**다 — 그러니 재야 할 것은 «내가 맞긴 하는가»다.

   0.05초마다 판을 떠서 세는 것:
     ㉠ 맞은 횟수 · 받은 피해 · 체력비 최저   — 내 몸이 위태로웠던 적이 있는가
     ㉡ 버틸 대수 = hpMax / floorDmg(층)      — 식으로 정해지는 여유
     ㉢ 적 하나 치우는 데 걸린 초             — 저항이 있는가
     ㉣ 군세/상한 · 마나비                    — 자리와 마나가 모자란 적이 있는가
   ★ 씨앗을 박고 rAF 를 끊는다(loop_health 머리말) · auto() 는 손으로 부른다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const MIN = +(process.argv[2] || 3);
const SEEDS = (process.argv[3] || "1,3,7").split(",").map(Number);
const STEP = 15;

const stale = (await (await fetch(CDP + "/json/list")).json())
  .filter((t) => t.type === "page" && t.url.startsWith(PAGE.split("index.html")[0]));
for (const t of stale) await fetch(`${CDP}/json/close/${t.id}`).catch(() => {});
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));

const rows = [], deaths = [], lostBy = {}, lostDmg = {}, band = [], fired = {}, bite = {}, poolBite = {}, wall = {}, wallN = {}, manaBurn = {}, raiseChoke = {}, corpseBurn = {}, gateBlast = {}, capCrush = {}, deepCrush = {};
/* 큰 수를 안전하게 읽는다. «| 0» 은 32비트 부호 있는 정수로 잘라서, 2^31(21.5억)을
   넘는 «깎은몫» 을 음수로 뒤집는다 — 자가 조용히 거짓을 말하는 자리다. */
const NUM = (v) => Number(v) || 0;
for (const SEED of SEEDS) {
  const { targetId } = await raw("Target.createTarget", { url: PAGE });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
  await S("Network.setCacheDisabled", { cacheDisabled: true });
  /* 손잡이를 갈아 끼우는 문 — `NECRO_KNOBS="__ARMY_WALL=0.5;__ARMY_START=3"` 처럼 준다.
     A/B 는 **같은 자로 두 팔**을 재야 견줄 수 있다([[seed-the-probe]]). */
  const knobs = (process.env.NECRO_KNOBS || "").split(";").filter(Boolean)
    .map(kv => { const [k, v] = kv.split("="); return `globalThis.${k.trim()} = ${v.trim()};`; }).join(" ");
  const seedSrc = `Math.random = (() => { let s = (${SEED} >>> 0) || 1;
     return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
     globalThis.__AUTO_TREE = 1; ${knobs}`;
  await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc });
  await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
  await S("Page.navigate", { url: PAGE });
  await wait(1500);
  await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
  await S("Page.reload", { ignoreCache: true });
  await wait(4500);
  await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
  await wait(900);
  await S("Runtime.evaluate", { expression: "window.requestAnimationFrame = () => 0" });
  await wait(200);
  await S("Runtime.evaluate", { awaitPromise: true, expression:
    `(async()=>{ const B = await import("/js/battle.js"); ${seedSrc} B.newRun(); return "ok"; })()` });

  const tick = `(async()=>{
    const B = await import("/js/battle.js"), C = await import("/js/core.js");
    const S = window.__S; const n = Math.round(${STEP} / 0.05);
    const R = window.__R || (window.__R = { autoT:0, deaths:0, hi:1, hits:0, taken:0, lo:1, kills:0, dry:0, full:0, samp:0, prevHp:S.hp, prevKill:S.killed|0,
      tsec:0, hist:[], deathLog:[], reported:0 });
    for (let i = 0; i < n; i++) {
      try { B.step(0.05); } catch (e) { return JSON.stringify({ 예외: (e + "").slice(0,140) }); }
      if (S.floor > R.hi) R.hi = S.floor;
      if (S.hp < R.prevHp - 0.001) { R.hits++; R.taken += R.prevHp - S.hp; }
      R.prevHp = S.hp;
      R.lo = Math.min(R.lo, S.hp / Math.max(1, S.hpMax));
      const k = S.killed | 0; if (k > R.prevKill) { R.kills += k - R.prevKill; } R.prevKill = k;
      R.samp++; R.tsec += 0.05;
      /* **죽는 순간의 사진** — 「군대가 무너진 뒤 마나가 없어 못 세운다」는 08-21 의 진단이
         D-7~D-17 뒤에도 그대로인지 보려면 죽음마다 그 자리를 적어 둬야 한다
         ([[cause-written-in-the-item-is-a-guess]]). 앞 5초(100틱)를 굴려 둔다. */
      /* ★ 소환 계수기도 같이 굴린다(D-19) — 「마나가 없어 못 세움」과 「세워도 지워짐」은
         고칠 자리가 정반대인데, 죽음의 사진만으로는 안 갈린다. 누적값을 담아 두고
         죽는 순간에 앞 5초의 «차이»로 읽는다. */
      const T = B.RAISE_TALLY;
      /* ★ D-20 · **잃음의 «가해자»** 도 같이 굴린다. D-19 가 「세워도 지워짐 23/25」까지
         갈랐지만 지운 쪽이 졸개의 이빨인지 우두머리의 절규인지는 안 세어 뒀다. */
      const LK = B.LOST_KINDS, L = B.LOST_BY;
      R.hist.push([S.minions.length, S.mp, S.corpses, S.hp / Math.max(1, S.hpMax),
                   T.try, T.ok, T.mana, T.corpse, T.cd, T.capfull, T.lost, T.merge,
                   ...LK.map(k => L[k] | 0)]);
      if (R.hist.length > 100) R.hist.shift();
      /* ★ D-23 · **「군대가 무너지는 사건」을 센다** — 세기만 한다(판을 한 글자도 안 건드린다).
         무너짐 = 군세/상한이 **0.70 이상 섰다가 0.35 이하로** 떨어진 순간 한 번.
         회복초 = 다시 0.70 에 닿기까지. 죽음으로 끊기면 −1(죽어서 0 이 되는 것은
         무너짐이 아니라 죽음이다 — 그건 이미 따로 센다). */
      {
        const W = R.wall || (R.wall = { armed: false, pend: null, ev: [] });
        const rat = S.minions.length / Math.max(1, C.armyCap());
        if (W.pend) { if (rat >= 0.70) { W.pend.회복 = +(R.tsec - W.pend.t).toFixed(1); W.pend = null; W.armed = true; } }
        else if (W.armed) { if (rat <= 0.35) { const e = { 층: S.floor, 초: Math.round(R.tsec), t: R.tsec, 회복: null }; W.ev.push(e); W.pend = e; W.armed = false; } }
        else if (rat >= 0.70) W.armed = true;
      }
      /* ★ D-34 · **같은 사건을 «상한» 이 아니라 «실제로 서 있던 수» 로 한 번 더 센다.**
         D-33 이 남긴 ⓑ 다 — 상한을 옮기는 손잡이(__TOUGH)를 켜자 군세/상한이 0.89~1.07 로
         올라가 **문턱을 아예 안 건드렸다.** 분모가 손잡이를 타면 자가 「무너짐이 사라졌다」고
         말하지만 그것은 판이 아니라 자가 움직인 것이다([[threshold-and-ruler-must-match]]).
         그래서 기준을 **판이 스스로 세워 둔 머릿수**로 바꾼다:
           최고 = 최근 30초 동안 실제로 서 있던 최댓값 (손잡이가 못 옮기는 관측값)
           무너짐 = 그 최고가 4마리 이상인데 **절반 이하로** 꺼진 순간 한 번
           회복   = 다시 그 최고에 닿기까지 · 죽음으로 끊기면 −1
         ★ 옛 자는 그대로 둔다 — 두 자를 나란히 찍어야 D-23~33 과 견줄 수 있다. */
      {
        const V = R.wallN || (R.wallN = { buf: new Array(30).fill(0), sec: -1, pend: null, ev: [] });
        const n = S.minions.length, sec = Math.floor(R.tsec) % 30;
        if (sec !== V.sec) { V.sec = sec; V.buf[sec] = 0; }
        if (n > V.buf[sec]) V.buf[sec] = n;
        let hi = 0; for (let i = 0; i < 30; i++) if (V.buf[i] > hi) hi = V.buf[i];
        if (V.pend) { if (n >= V.pend.최고) { V.pend.회복 = +(R.tsec - V.pend.t).toFixed(1); V.pend = null; } }
        else if (hi >= 4 && n * 2 <= hi) {
          const e = { 층: S.floor, 초: Math.round(R.tsec), t: R.tsec, 최고: hi, 회복: null };
          V.ev.push(e); V.pend = e;
        }
      }
      if (S.mp < 6) R.dry++;                                    // 해골 한 마리도 못 세우는 순간
      if (S.minions.length >= C.armyCap()) R.full++;             // 자리가 꽉 찬 순간
      if ((R.autoT += 0.05) > 0.35) { R.autoT = 0; try { window.auto(); } catch {} }
      if (S.dead) {
        const H = R.hist, cap = C.armyCap();
        const m = (j) => +(H.reduce((a, x) => a + x[j], 0) / Math.max(1, H.length)).toFixed(1);
        const pct = (f) => +(H.filter(f).length / Math.max(1, H.length) * 100).toFixed(0);
        const d0 = H[0] || [], dz = H[H.length - 1] || [];
        const dd = (j) => Math.max(0, (dz[j] | 0) - (d0[j] | 0));   // 앞 5초 동안 늘어난 몫
        R.deathLog.push({ 초: Math.round(R.tsec), 층: S.floor, 군세: S.minions.length, 상한: cap,
          시도: dd(4), 세움: dd(5), 막힘마나: dd(6), 막힘시체: dd(7), 막힘쿨: dd(8),
          막힘자리: dd(9), 잃음: dd(10), 키움: dd(11),
          마나: Math.round(S.mp), 마나최대: Math.round(S.mpMax), 시체: S.corpses,
          버틸대수: +(S.hpMax / C.floorDmg(S.floor)).toFixed(1),
          앞5초군세: m(0), 앞5초마나: m(1), 앞5초시체: m(2),
          앞5초마름: pct(x => x[1] < 6), 앞5초자리참: pct(x => x[0] >= cap),
          /* 앞 5초에 소환수를 지운 갈래 — 「melee 6 · howl 2」 처럼 0 이 아닌 것만 */
          잃음갈래: B.LOST_KINDS.map((k, i) => [k, dd(12 + i)]).filter(x => x[1] > 0)
                      .map(x => x[0] + " " + x[1]).join(" ") || "-" });
        if (R.wall) { if (R.wall.pend) { R.wall.pend.회복 = -1; R.wall.pend = null; } R.wall.armed = false; }
        if (R.wallN) { if (R.wallN.pend) { R.wallN.pend.회복 = -1; R.wallN.pend = null; } R.wallN.buf.fill(0); }   // ★ D-34 · 죽음은 무너짐이 아니다
        R.deaths++; R.prevHp = 0; C.META.runs++; B.newRun(); R.prevHp = S.hp; R.prevKill = S.killed|0; R.hist.length = 0;
      }
    }
    const f = S.floor;
    return JSON.stringify({ 층:f, lv:C.META.lv, 군세:S.minions.length, 상한:C.armyCap(),
      체력비:+(S.hp/Math.max(1,S.hpMax)).toFixed(2), 최저:+R.lo.toFixed(2),
      맞은수:R.hits, 받은피해:Math.round(R.taken), 체력:Math.round(S.hpMax),
      버틸대수:+(S.hpMax/C.floorDmg(f)).toFixed(1), 처치:R.kills,
      초당처치:+(R.kills/(${STEP}*(window.__ti=(window.__ti||0)+1))).toFixed(2),
      마나마름:+(R.dry/R.samp*100).toFixed(0), 자리참:+(R.full/R.samp*100).toFixed(0),
      시체:S.corpses,                                            // ★ D-31 · 못 크기 — 「몫」 으로 보는 자
      죽음:R.deaths,
      잃음누계: Object.fromEntries(B.LOST_KINDS.map(k => [k, B.LOST_BY[k] | 0])),
      깎인몫: Object.fromEntries(B.LOST_KINDS.map(k => [k, Math.round(B.LOST_DMG[k] || 0)])),
      터짐: Object.assign({}, B.MECH_FIRE),
      이빨: Object.fromEntries(Object.entries(B.MECH_BITE).map(([k, v]) => [k, [v.n, +v.s.toFixed(3), v.o | 0]])),
      무너짐: (R.wall ? R.wall.ev.map(e => [e.층, e.초, e.회복]) : []),
      무너짐절대: (R.wallN ? R.wallN.ev.map(e => [e.층, e.초, e.회복, e.최고]) : []),   // ★ D-34 · 서 있던 수 기준
      /* ★ D-24 · **왜 «못 채우나»를 깊이별로 센다.** D-23 이 남긴 ㉮ 다 — 뒤에서 군세가
         상한의 절반에 상시로 머무는데, 그 자리가 「손이 안 나감·마나·시체·재사용·자리참」
         중 무엇인지는 여태 «죽는 순간의 앞 5초» 로만 봤다(죽음이 없는 구간은 못 본다).
         RAISE_TALLY 는 판이 갈려도 안 지워지는 누계라, 점마다 실어 바깥에서 빼면 된다. */
      소환누계: (() => { const T = B.RAISE_TALLY;
        return { try:T.try, ok:T.ok, cd:T.cd, mana:T.mana, corpse:T.corpse, capfull:T.capfull, merge:T.merge, lost:T.lost }; })(),
      장판자: B.MECH_POOL ? [B.MECH_POOL.pools | 0, B.MECH_POOL.pairs | 0, +B.MECH_POOL.s.toFixed(3), B.MECH_POOL.over | 0] : null,
      /* ★ D-29 · 마나를 태우는 갈래의 자 (자리온횟수, 태운합, 마른횟수) — 손잡이가 0 이면 전부 0 이다 */
      마나태움: B.MANA_BURN ? [B.MANA_BURN.n | 0, Math.round(B.MANA_BURN.s), B.MANA_BURN.dry | 0] : null,
      /* ★ D-30 · 되세우는 손을 잠그는 갈래의 자 (자리온횟수, 늘어난쿨합, 손을빼앗은횟수) */
      소환잠금: B.RAISE_CHOKE ? [B.RAISE_CHOKE.n | 0, Math.round(B.RAISE_CHOKE.s), B.RAISE_CHOKE.blk | 0] : null,
      /* ★ D-31 · 바닥의 시체를 태우는 갈래의 자 (자리온횟수, 태운시체합, 못이바닥난횟수) */
      시체태움: B.CORPSE_BURN ? [B.CORPSE_BURN.n | 0, B.CORPSE_BURN.s | 0, B.CORPSE_BURN.dry | 0] : null,
      /* ★ D-32 · 관문이 군세를 직접 무는 갈래의 자 (터진횟수, 문소환수합, 깎은몫합, 죽인수) */
      관문폭발: B.GATE_BLAST ? [B.GATE_BLAST.n | 0, B.GATE_BLAST.hit | 0, Math.round(B.GATE_BLAST.s), B.GATE_BLAST.k | 0] : null,
      /* ★ D-35 · 무너진 직후 상한이 내려앉는 문의 자 (눌린횟수, 눌린초합, 기준머릿수합) */
      상한눌림: C.CAP_CRUSH ? [C.CAP_CRUSH.n | 0, +C.CAP_CRUSH.sec.toFixed(1), C.CAP_CRUSH.hiSum | 0] : null,
      /* ★ D-36 · 깊이가 여는 문의 자 (걸린횟수, 눌린초합, 걸린층합) */
      깊이눌림: C.DEEP_CRUSH ? [C.DEEP_CRUSH.n | 0, +C.DEEP_CRUSH.sec.toFixed(1), C.DEEP_CRUSH.fSum | 0] : null,
      죽음기록: (() => { const d = R.deathLog.slice(R.reported); R.reported = R.deathLog.length; return d; })() });
  })()`;

  const pts = [];
  for (let t = STEP; t <= MIN * 60; t += STEP) {
    const r = (await S("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: tick })).result.value;
    const o = JSON.parse(r);
    if (o.예외) { console.log(`씨앗 ${SEED} ${t}초에 예외: ${o.예외}`); break; }
    for (const d of (o.죽음기록 || [])) deaths.push({ SEED, ...d });
    delete o.죽음기록;
    lostBy[SEED] = o.잃음누계; lostDmg[SEED] = o.깎인몫;   // 마지막 점의 누계가 그 씨앗의 총계다
    fired[SEED] = o.터짐; bite[SEED] = o.이빨;              // ★ D-22 · 같은 결 — 마지막 점이 총계다
    if (o.무너짐) wall[SEED] = o.무너짐;                       // ★ D-23 · 마지막 점이 총계다
    if (o.무너짐절대) wallN[SEED] = o.무너짐절대;             // ★ D-34 · 마지막 점이 총계다
    if (o.장판자) poolBite[SEED] = o.장판자;                 // ★ D-22c · «한 장판당» 자 (깔린수, 쌍, 몫합)
    if (o.마나태움) manaBurn[SEED] = o.마나태움;             // ★ D-29 · 마지막 점이 총계다
    if (o.소환잠금) raiseChoke[SEED] = o.소환잠금;           // ★ D-30 · 마지막 점이 총계다
    if (o.시체태움) corpseBurn[SEED] = o.시체태움;           // ★ D-31 · 마지막 점이 총계다
    if (o.관문폭발) gateBlast[SEED] = o.관문폭발;             // ★ D-32 · 마지막 점이 총계다
    if (o.상한눌림) capCrush[SEED] = o.상한눌림;             // ★ D-35 · 마지막 점이 총계다
    if (o.깊이눌림) deepCrush[SEED] = o.깊이눌림;             // ★ D-36 · 마지막 점이 총계다
    /* ★ D-21 · **깊이별로 가르려면 누계의 «차이»를 층과 함께 적어 둬야 한다.**
       판 안의 코드는 한 글자도 안 건드린다 — 점마다 오는 누계를 바깥에서 빼기만 한다
       (자가 흐름을 흔들면 D-20 과 견줄 수 없다 · [[seed-the-probe]]). */
    band.push({ SEED, 초: t, 층: o.층, 누계: o.잃음누계, 몫: o.깎인몫,
                소환: o.소환누계, 군세: o.군세, 상한: o.상한, 시체: o.시체 });   // ★ D-24 (+ D-31 못)
    delete o.잃음누계; delete o.깎인몫; delete o.터짐; delete o.이빨; delete o.장판자; delete o.무너짐; delete o.무너짐절대; delete o.소환누계; delete o.마나태움; delete o.관문폭발;
    pts.push({ 초: t, ...o });
  }
  rows.push({ SEED, pts });
  await raw("Target.closeTarget", { targetId });
}

const n = Math.min(...rows.map(r => r.pts.length));
const avg = (i, k) => +(rows.reduce((a, r) => a + r.pts[i][k], 0) / rows.length).toFixed(2);
// ★ 칸을 붙여 찍으면 수가 커질 때 옆칸과 들러붙는다 — 2026-08-21 에 「188103.33」 이
//   되어 A/B 를 읽는 쪽이 그 줄을 통째로 버렸다(자가 고장난 것을 데이터가 없는 것으로
//   읽을 뻔했다). 폭이 모자라도 칸 사이에 빈칸 하나를 «강제»한다.
const COLS = [["층",5],["Lv",5],["군세/상한",9],["체력",7],["버틸대수",8],["최저체력비",10],
              ["맞은수",8],["받은피해",8],["처치",7],["초당처치",8],["마나마름%",9],["자리참%",8],["죽음",5]];
console.log("\n" + ["초".padStart(4), ...COLS.map(([h, w]) => h.padStart(w))].join(" "));
for (let i = 0; i < n; i++) {
  const p = (k) => String(avg(i, k));
  const vals = [p("층"), p("lv"), `${p("군세")}/${avg(i, "상한")}`, p("체력"), p("버틸대수"),
                p("최저"), p("맞은수"), p("받은피해"), p("처치"), p("초당처치"),
                p("마나마름"), p("자리참"), p("죽음")];
  console.log([String(rows[0].pts[i].초).padStart(4),
               ...vals.map((v, j) => v.padStart(COLS[j][1]))].join(" "));
}
/* ══ 죽는 순간의 사진 ══ 「무엇이 죽였나」는 층별 평균으로는 안 보인다 —
   죽음 하나하나의 자리(군세·마나·시체·버틸대수)를 세어야 갈린다. */
if (deaths.length) {
  const DC2 = [["씨앗",5],["초",5],["시도",5],["세움",5],["잃음",5],["막힘쿨",7],["막힘마나",8],
               ["막힘시체",8],["막힘자리",8],["키움",5],["앞5초 잃음갈래",22]];
  const DC = [["씨앗",5],["초",5],["층",5],["군세/상한",9],["마나/최대",9],["시체",5],["버틸대수",8],
              ["앞5초군세",9],["앞5초마나",9],["앞5초시체",9],["앞5초마름%",10],["앞5초자리참%",12]];
  console.log(`\n── 죽음 ${deaths.length} 개의 사진 ──`);
  console.log(DC.map(([h, w]) => h.padStart(w)).join(" "));
  for (const d of deaths)
    console.log([d.SEED, d.초, d.층, `${d.군세}/${d.상한}`, `${d.마나}/${d.마나최대}`, d.시체,
                 d.버틸대수, d.앞5초군세, d.앞5초마나, d.앞5초시체, d.앞5초마름, d.앞5초자리참]
                .map((v, j) => String(v).padStart(DC[j][1])).join(" "));
  const mean = (f) => +(deaths.reduce((a, d) => a + f(d), 0) / deaths.length).toFixed(1);
  /* 갈래를 셈으로 나눈다 — 「마나가 없어 다시 못 세웠다」(마름) 대 「몸이 모자랐다」(버틸대수). */
  const dryDeath = deaths.filter(d => d.앞5초마름 >= 50).length;
  const thinArmy = deaths.filter(d => d.앞5초군세 <= d.상한 * 0.4).length;
  const softBody = deaths.filter(d => d.버틸대수 < 8).length;
  console.log(`\n평균: 군세 ${mean(d => d.군세)}/${mean(d => d.상한)} · 마나 ${mean(d => d.마나)}/${mean(d => d.마나최대)} ` +
              `· 시체 ${mean(d => d.시체)} · 버틸대수 ${mean(d => d.버틸대수)} · 층 ${mean(d => d.층)}`);
  console.log(`갈래: 마나마름(앞5초 마름≥50%) ${dryDeath}/${deaths.length} · ` +
              `군세얇음(앞5초 군세≤상한40%) ${thinArmy}/${deaths.length} · ` +
              `몸모자람(버틸대수<8) ${softBody}/${deaths.length}`);

  /* ══ D-19 · 「못 세웠나 · 세워도 지워졌나」 ══ 앞 5초의 소환 시도를 갈라 본다.
     D-18 이 남긴 물음: 마나가 남았는데도 군세가 0 인 죽음이 일곱 있었다.
     · 손이 안 나갔다  = 시도 자체가 없다(재사용만 돌고 있었다)
     · 못 세웠다      = 시도는 했는데 마나·시체에 막혔다
     · 지워졌다       = 세우기는 섰는데(세움>0) 그만큼 잃었다(잃음 ≥ 세움) */
  console.log(`\n── 앞 5초에 손이 몇 번 나갔나 ──`);
  console.log(DC2.map(([h, w]) => h.padStart(w)).join(" "));
  for (const d of deaths)
    console.log([d.SEED, d.초, d.시도, d.세움, d.잃음, d.막힘쿨, d.막힘마나, d.막힘시체, d.막힘자리, d.키움, d.잃음갈래 || "-"]
                .map((v, j) => String(v).padStart(DC2[j][1])).join(" "));
  const noTry  = deaths.filter(d => d.시도 === 0).length;
  const cantRaise = deaths.filter(d => d.시도 > 0 && d.세움 === 0).length;
  const wiped  = deaths.filter(d => d.세움 > 0 && d.잃음 >= d.세움).length;
  const sum = (f) => deaths.reduce((a, d) => a + f(d), 0);
  console.log(`\n앞5초 합계: 시도 ${sum(d=>d.시도)} · 세움 ${sum(d=>d.세움)} · 잃음 ${sum(d=>d.잃음)} · ` +
              `막힘[쿨 ${sum(d=>d.막힘쿨)} · 마나 ${sum(d=>d.막힘마나)} · 시체 ${sum(d=>d.막힘시체)} · 자리 ${sum(d=>d.막힘자리)}]`);
  console.log(`갈래2: 손이안나감(시도=0) ${noTry}/${deaths.length} · ` +
              `못세움(시도>0·세움=0) ${cantRaise}/${deaths.length} · ` +
              `지워짐(세움>0·잃음≥세움) ${wiped}/${deaths.length}`);
  /* ★ D-18 이 꼽은 일곱 — **마르지 않았는데 군세가 얇은** 죽음만 따로 본다. */
  const wet = deaths.filter(d => d.앞5초마름 < 50 && d.앞5초군세 <= d.상한 * 0.4);
  if (wet.length) {
    const wNo = wet.filter(d => d.시도 === 0).length;
    const wCant = wet.filter(d => d.시도 > 0 && d.세움 === 0).length;
    const wWipe = wet.filter(d => d.세움 > 0 && d.잃음 >= d.세움).length;
    console.log(`\n★ 마르지 않았는데 군세가 얇은 죽음 ${wet.length} 개: ` +
                `손이안나감 ${wNo} · 못세움 ${wCant} · 지워짐 ${wWipe} · ` +
                `(시도 ${wet.reduce((a,d)=>a+d.시도,0)} · 세움 ${wet.reduce((a,d)=>a+d.세움,0)} · 잃음 ${wet.reduce((a,d)=>a+d.잃음,0)})`);
  }
}
/* ══ D-20 · **무엇이 소환수를 죽였나** ══ 「잃음」을 갈래로 가른다.
   · 막타 = 마지막 한 방을 넣은 쪽(누가 마무리했나)
   · 깎은몫 = 그 갈래가 소환수 체력에서 실제로 깎아낸 합(누가 갈고 있었나)
   둘이 갈리면 「오래 갈아 놓고 남이 마무리한」 가해자가 드러난다. */
{
  const KS = Object.keys(lostBy[SEEDS[0]] || {});
  if (KS.length) {
    /* ★ 여기에도 «| 0» 이 있었다(D-22 에서 잡음). 갈래별 몫은 D-21 에서 NUM 으로 고쳤는데
       **합을 내는 이 한 줄**이 그대로여서 20분 × 여섯의 분모가 음수가 되고 몫%가 -713 으로
       찍혔다. 같은 고침을 옆자리에 안 옮긴 자리다([[carry-fixes-forward]]). */
    const sumBy = (o) => KS.reduce((a, k) => a + NUM(o[k]), 0);
    const tot = {}, dmg = {};
    for (const k of KS) { tot[k] = 0; dmg[k] = 0; }
    /* ★ 깎은몫에 «| 0» 을 대면 안 된다 — 32비트로 잘려 2^31 을 넘는 순간 «음수»가 된다.
       막타(개수)는 만 단위라 안 걸리지만 몫은 깊은 층에서 조 단위로 큰다. */
    for (const s of SEEDS) for (const k of KS) { tot[k] += lostBy[s]?.[k] | 0; dmg[k] += NUM(lostDmg[s]?.[k]); }
    const nAll = sumBy(tot), dAll = sumBy(dmg);
    console.log(`\n── 무엇이 소환수를 죽였나 (${MIN}분 × 씨앗 ${SEEDS.length} · 잃음 ${nAll}) ──`);
    console.log(["갈래".padStart(8), "막타".padStart(7), "막타%".padStart(7), "깎은몫".padStart(10), "깎은몫%".padStart(8)].join(" "));
    for (const k of KS.sort((a, b) => tot[b] - tot[a]))
      console.log([k.padStart(8), String(tot[k]).padStart(7),
                   (nAll ? (tot[k] / nAll * 100).toFixed(0) : "0").padStart(7),
                   String(dmg[k]).padStart(10),
                   (dAll ? (dmg[k] / dAll * 100).toFixed(0) : "0").padStart(8)].join(" "));
  }
}

/* ══ D-22 · 「0」 을 셋으로 가른다 ══ 위 표에서 저주(curse)는 막타 0% · 깎은몫 0% 다.
   그런데 그 하나로는 **㉠ 안 선다 · ㉡ 안 터진다 · ㉢ 이빨이 없다** 를 못 가른다 —
   셋은 고칠 자리가 전부 다르다([[knob-that-does-nothing]]).
     · 터짐  = 수법이 실제로 발동한 횟수 → 0 이면 ㉠㉡, 많은데 몫이 0 이면 ㉢
     · 이빨  = 한 대가 소환수 하나를 **제 체력의 몇 %** 깎았나(평균)
   ★ 절규(howl)가 대조군이다 — floorHp 축이라 깊이에서 안 묽어진다. 나란히 놓고 본다. */
{
  const F = {}, Bn = {}, Bs = {}, Bo = {};
  for (const s2 of SEEDS) {
    for (const [k, v] of Object.entries(fired[s2] || {})) F[k] = (F[k] | 0) + (v | 0);
    for (const [k, v] of Object.entries(bite[s2] || {})) {
      Bn[k] = (Bn[k] | 0) + (v[0] | 0); Bs[k] = NUM(Bs[k]) + NUM(v[1]); Bo[k] = (Bo[k] | 0) + (v[2] | 0); }
  }
  const KS2 = [...new Set([...Object.keys(F), ...Object.keys(Bn)])];
  if (KS2.length) {
    console.log(`\n── 수법이 터지긴 하는가 · 터지면 이빨이 있는가 (${MIN}분 × 씨앗 ${SEEDS.length}) ──`);
    console.log(["수법".padStart(8), "터짐".padStart(7), "맞은대수".padStart(9), "한대당 이빨%".padStart(13),
                 "넘침%".padStart(7), "판정".padStart(12)].join(" "));
    for (const k of KS2.sort((a, b) => (F[b] | 0) - (F[a] | 0))) {
      const n = Bn[k] | 0, avg = n ? Bs[k] / n * 100 : 0, ov = n ? (Bo[k] | 0) / n * 100 : 0;
      /* ★ D-22d · 「한대당 이빨%」는 **100 에서 끊은 평균**이다(위아래가 없으면 꼬리가
         평균을 가져간다 — 대조군 절규가 161~524% 로 흔들렸다). 넘치게 때린 대수는
         버리지 않고 옆 칸 「넘침%」로 따로 낸다: 그 칸이 크면 **「더 세게」가 이미
         남아도는 자리**라는 뜻이라 손잡이를 더 올릴 값이 없다. */
      const 판정 = !(F[k] | 0) && !n ? "㉠㉡ 안 터짐" : !n ? "㉢ 안 닿음"
                 : avg < 5 ? "㉢ 이빨없음" : avg >= 10 ? "㉠ 닿음" : "돎";
      console.log([k.padStart(8), String(F[k] | 0).padStart(7), String(n).padStart(9),
                   (n ? avg.toFixed(1) : "-").padStart(13), (n ? ov.toFixed(1) : "-").padStart(7),
                   판정.padStart(12)].join(" "));
    }
    /* ★ **D-22c · 장판만은 아래 줄을 본다.** 위 표의 pool 칸은 「틱 한 번당」이라 자와 문턱의
       단위가 다르다([[threshold-and-ruler-must-match]]) — 한 장판이 한 소환수를 270번 때리므로
       위 칸의 수는 늘 0.0~0.3 이다(손잡이를 스무 배 올려도 안 움직인다).
       여기 「한 장판당 이빨%」가 ㉠(10% 이상)에 물릴 수다. */
    let PP = 0, PN = 0, PS = 0, PO = 0;
    for (const s2 of SEEDS) { const v = poolBite[s2]; if (!v) continue; PP += v[0] | 0; PN += v[1] | 0; PS += NUM(v[2]); PO += v[3] | 0; }
    if (PP) console.log(`  장판(D-22c) · 깔린 장판 ${PP} · 「장판×소환수」 쌍 ${PN} · ` +
      `**한 장판당 이빨 ${PN ? (PS / PN * 100).toFixed(1) : "-"}%** ` +
      `(넘침 ${PN ? (PO / PN * 100).toFixed(1) : "-"}% · 쌍/장판 ${(PN / PP).toFixed(1)}) ← ㉠ 은 이 수로 본다`);
    /* ★ **D-29 · 마나를 태우는 갈래**(battle.js MANABURN_OF). 기본 0 이면 이 줄이 아예 안 뜬다 —
       뜨는데 「마름」이 0 이면 태우기는 하되 **손을 못 묶은 것**이다([[knob-that-does-nothing]]). */
    let MN = 0, MS = 0, MD = 0;
    for (const s2 of SEEDS) { const v = manaBurn[s2]; if (!v) continue; MN += v[0] | 0; MS += v[1] | 0; MD += v[2] | 0; }
    if (MN) console.log(`  마나태움(D-29) · 자리 ${MN} 번 · 태운 마나 합 ${MS} · **한 번에 ${(MS / MN).toFixed(1)}** · ` +
      `그 한 방에 마름(<6) **${(MD / MN * 100).toFixed(1)}%** (${MD}번)`);
    /* ★ **D-30 · 되세우는 손을 잠그는 갈래**(battle.js RAISECHOKE_OF). 기본 0 이면 이 줄이 아예 안 뜬다 —
       뜨는데 「손빼앗음」이 0 이면 이미 쿨이던 것을 더 민 것뿐이다([[knob-that-does-nothing]]). */
    let CN = 0, CS = 0, CB = 0;
    for (const s2 of SEEDS) { const v = raiseChoke[s2]; if (!v) continue; CN += v[0] | 0; CS += v[1] | 0; CB += v[2] | 0; }
    if (CN) console.log(`  소환잠금(D-30) · 자리 ${CN} 번 · 늘어난 쿨 합 ${CS}초 · **한 번에 ${(CS / CN).toFixed(2)}초** · ` +
      `그 한 방에 손빼앗음 **${(CB / CN * 100).toFixed(1)}%** (${CB}번)`);
    /* ★ **D-31 · 바닥의 시체를 태우는 갈래**(battle.js CORPSEBURN_OF). 기본 0 이면 이 줄이 아예 안 뜬다 —
       뜨는데 「바닥남」이 0 이면 태우기는 하되 **재료를 못 끊은 것**이다([[knob-that-does-nothing]]).
       ★ 판정은 이 비율이 아니라 아래 「못」 줄과 세움/분 이다([[threshold-and-ruler-must-match]]). */
    let BN = 0, BS = 0, BD = 0;
    for (const s2 of SEEDS) { const v = corpseBurn[s2]; if (!v) continue; BN += v[0] | 0; BS += v[1] | 0; BD += v[2] | 0; }
    if (BN) console.log(`  시체태움(D-31) · 자리 ${BN} 번 · 태운 시체 합 ${BS} · **한 번에 ${(BS / BN).toFixed(1)}구** · ` +
      `그 한 방에 못 바닥남(<3) **${(BD / BN * 100).toFixed(1)}%** (${BD}번)`);
    /* ★ **D-32 · 관문이 «지금 서 있는 군세»를 직접 무는 갈래**(battle.js GATEBLAST_OF).
       기본 0 이면 이 줄이 아예 안 뜬다. 뜨는데
         · 「한 번에 문 마리」가 0 이면 → **반경 안에 아무도 없다**(터지는 자리가 틀렸다)
         · 「죽인 수」가 0 이면      → **이빨이 없다**(값이 소환수 체력에 진다)
       둘은 고칠 자리가 전혀 다르다([[knob-that-does-nothing]]).
       ★ 판정은 이 줄이 아니라 위 「무엇이 소환수를 죽였나」의 **막타%** 와 D-24 표의
         **회복초중앙 · 무너짐 판당** 이다([[threshold-and-ruler-must-match]]). */
    let GN = 0, GH = 0, GS = 0, GK = 0;
    for (const s2 of SEEDS) { const v = gateBlast[s2]; if (!v) continue; GN += v[0] | 0; GH += v[1] | 0; GS += NUM(v[2]); GK += v[3] | 0; }
    if (GN) console.log(`  관문폭발(D-32) · 터짐 ${GN} 번 · **한 번에 ${(GH / GN).toFixed(1)}마리** 뭄 · ` +
      `깎은 몫 합 ${Math.round(GS)} · 죽인 수 ${GK} (**한 번에 ${(GK / GN).toFixed(1)}마리**)`);
  }
}
/* ══ D-21 · **깊이에 따라 가해자가 갈리나** ══ D-20 이 남긴 자리다.
   6분(층 1~13)에서 melee 90% 가 나왔지만, 뒤쪽(층 40~80)에서도 그런지는 안 봤다.
   「뒤가 조용한 것」이 ㉠ 졸개가 못 문다 인지 ㉡ 무는데 군대가 안 준다 인지가 여기서 갈린다.
   점(15초)마다 오는 «누계»를 빼서 그 창의 몫을 구하고, 그 창의 층으로 칸에 담는다.
   ★ 창 안에서 층이 내려갔으면(죽어 되짚기) **높은 쪽**에 담는다 — 잃음은 깊은 데서 났다. */
{
  const BANDS = [[1,10],[11,20],[21,40],[41,60],[61,9999]];
  const KS = Object.keys(lostBy[SEEDS[0]] || {});
  const cells = BANDS.map(() => ({ n:{}, d:{}, sec:0 }));
  for (const c of cells) for (const k of KS) { c.n[k] = 0; c.d[k] = 0; }
  for (const SEED of SEEDS) {
    const ser = band.filter(b => b.SEED === SEED);
    /* 첫 창(0~15초)도 담아야 총계가 D-20 과 «한 톨도» 안 틀린다 — 0 을 앞에 세운다. */
    let prev = { 초: 0, 층: 1, 누계: {}, 몫: {} };
    for (const b of ser) {
      if (prev) {
        const f = Math.max(prev.층, b.층);
        const i = BANDS.findIndex(([lo,hi]) => f >= lo && f <= hi);
        if (i >= 0) {
          cells[i].sec += b.초 - prev.초;
          for (const k of KS) {
            cells[i].n[k] += Math.max(0, (b.누계?.[k] | 0) - (prev.누계?.[k] | 0));
            cells[i].d[k] += Math.max(0, NUM(b.몫?.[k]) - NUM(prev.몫?.[k]));   // ★ 여기도 «| 0» 금지
          }
        }
      }
      prev = b;
    }
  }
  const TOP = ["melee","howl","add","lord"];
  const rest = KS.filter(k => !TOP.includes(k));
  const hdr = ["층구간","분","잃음","잃음/분", ...TOP.map(k=>k+"%"), "기타%"];
  const W = [9,7,7,8,7,7,7,7,7];
  console.log(`\n── 깊이에 따라 가해자가 갈리나 (막타%) ──`);
  console.log(hdr.map((h,i)=>h.padStart(W[i])).join(" "));
  for (let i = 0; i < BANDS.length; i++) {
    const c = cells[i], tot = KS.reduce((a,k)=>a+c.n[k],0);
    if (!c.sec) continue;
    const mins = c.sec / 60;
    const pc = (v) => (tot ? (v/tot*100).toFixed(0) : "-");
    console.log([`${BANDS[i][0]}-${BANDS[i][1]===9999?"":BANDS[i][1]}`, mins.toFixed(1), String(tot),
                 (tot/Math.max(0.01,mins)).toFixed(0),
                 ...TOP.map(k=>pc(c.n[k])), pc(rest.reduce((a,k)=>a+c.n[k],0))]
                .map((v,j)=>String(v).padStart(W[j])).join(" "));
  }
  console.log(`\n── 같은 칸을 «깎은몫%» 로 ──`);
  console.log(hdr.map((h,i)=>h.padStart(W[i])).join(" "));
  for (let i = 0; i < BANDS.length; i++) {
    const c = cells[i], tot = KS.reduce((a,k)=>a+c.d[k],0);
    if (!c.sec) continue;
    const mins = c.sec / 60;
    const pc = (v) => (tot ? (v/tot*100).toFixed(0) : "-");
    console.log([`${BANDS[i][0]}-${BANDS[i][1]===9999?"":BANDS[i][1]}`, mins.toFixed(1), String(tot),
                 (tot/Math.max(0.01,mins)).toFixed(0),
                 ...TOP.map(k=>pc(c.d[k])), pc(rest.reduce((a,k)=>a+c.d[k],0))]
                .map((v,j)=>String(v).padStart(W[j])).join(" "));
  }
}
/* ══ D-23 · **「군대가 무너지는 사건」이 실제로 나는가** ══ D 항목의 이름을 재는 자다.
   D-21 의 「잃음/분」은 뒤에서 되레 2.3배인데 군세는 안 준다 — 같이 커지기 때문이다.
   그러니 무너짐은 **머릿수가 아니라 «상한 대비 비율»** 로 봐야 앞뒤를 견줄 수 있다. */
{
  const BANDS = [[1,10],[11,20],[21,40],[41,60],[61,9999]];
  const cells = BANDS.map(() => ({ n: 0, rec: [], cut: 0, open: 0 }));
  let all = 0;
  for (const SEED of SEEDS) for (const [f, , r] of (wall[SEED] || [])) {
    const i = BANDS.findIndex(([lo, hi]) => f >= lo && f <= hi);
    if (i < 0) continue;
    all++; cells[i].n++;
    if (r === null) cells[i].open++;
    else if (r < 0) cells[i].cut++;
    else cells[i].rec.push(r);
  }
  const med = (a) => a.length ? (a = a.slice().sort((x, y) => x - y),
    a.length % 2 ? a[(a.length - 1) / 2] : +((a[a.length / 2 - 1] + a[a.length / 2]) / 2).toFixed(1)) : "-";
  const W2 = [9, 8, 9, 9, 9, 9];
  console.log(`\n── 군대가 무너지는 사건 (군세/상한 0.70 → 0.35 · 씨앗 ${SEEDS.length} · 합 ${all}) ──`);
  console.log(["층구간", "무너짐", "판당", "회복초중앙", "죽음끊김", "안돌아옴"].map((h, i) => h.padStart(W2[i])).join(" "));
  for (let i = 0; i < BANDS.length; i++) {
    const c = cells[i];
    console.log([`${BANDS[i][0]}-${BANDS[i][1] === 9999 ? "" : BANDS[i][1]}`, String(c.n),
                 (c.n / SEEDS.length).toFixed(2), String(med(c.rec)), String(c.cut), String(c.open)]
                .map((v, j) => String(v).padStart(W2[j])).join(" "));
  }
  const front = cells[0].n + cells[1].n, back = all - front;
  console.log(`앞(층 1-20) ${front} · 판당 ${(front / SEEDS.length).toFixed(2)}   |   ` +
              `뒤(층 21+) ${back} · 판당 ${(back / SEEDS.length).toFixed(2)}`);
}

/* ══ D-34 · **같은 사건을 «서 있던 수» 로 다시 센다** ══ D-33 이 남긴 ⓑ 다.
   위 자의 분모는 `armyCap()` 이라 **상한을 옮기는 손잡이가 자까지 같이 옮긴다**
   (D-33 t=2: 군세/상한 0.57→1.00 이 되어 무너짐이 21.83 → 0.08 «판당» 으로 사라졌다).
   이 자의 기준은 **최근 30초 동안 실제로 서 있던 최댓값**이라 손잡이가 못 옮긴다.
     · 최고평균 = 그 사건들이 선 자리의 기준 머릿수 — **두 팔에서 이 값이 크게 다르면**
       무너짐 수를 바로 견주지 말고 이 줄부터 볼 것([[floor-far-from-threshold]]).
   ★ 두 자가 같은 판에서 서로 다른 말을 하면 **이 자를 믿는다** — 분모가 관측값이다. */
{
  const BANDS = [[1,10],[11,20],[21,40],[41,60],[61,9999]];
  const cells = BANDS.map(() => ({ n: 0, rec: [], cut: 0, open: 0, hi: 0 }));
  let all = 0;
  for (const SEED of SEEDS) for (const [f, , r, hi] of (wallN[SEED] || [])) {
    const i = BANDS.findIndex(([lo, hi2]) => f >= lo && f <= hi2);
    if (i < 0) continue;
    all++; cells[i].n++; cells[i].hi += hi | 0;
    if (r === null) cells[i].open++;
    else if (r < 0) cells[i].cut++;
    else cells[i].rec.push(r);
  }
  const med = (a) => a.length ? (a = a.slice().sort((x, y) => x - y),
    a.length % 2 ? a[(a.length - 1) / 2] : +((a[a.length / 2 - 1] + a[a.length / 2]) / 2).toFixed(1)) : "-";
  const W3 = [9, 8, 9, 9, 9, 9, 9];
  console.log(`\n── 군대가 무너지는 사건 · 절대 자 (서 있던 최고 → 절반 · 씨앗 ${SEEDS.length} · 합 ${all}) ──`);
  console.log(["층구간", "무너짐", "판당", "회복초중앙", "죽음끊김", "안돌아옴", "최고평균"].map((h, i) => h.padStart(W3[i])).join(" "));
  for (let i = 0; i < BANDS.length; i++) {
    const c = cells[i];
    console.log([`${BANDS[i][0]}-${BANDS[i][1] === 9999 ? "" : BANDS[i][1]}`, String(c.n),
                 (c.n / SEEDS.length).toFixed(2), String(med(c.rec)), String(c.cut), String(c.open),
                 c.n ? (c.hi / c.n).toFixed(1) : "-"]
                .map((v, j) => String(v).padStart(W3[j])).join(" "));
  }
  const front2 = cells[0].n + cells[1].n, back2 = all - front2;
  console.log(`앞(층 1-20) ${front2} · 판당 ${(front2 / SEEDS.length).toFixed(2)}   |   ` +
              `뒤(층 21+) ${back2} · 판당 ${(back2 / SEEDS.length).toFixed(2)}`);
  /* ★ **D-35 · 무너진 직후 상한이 내려앉는 문**(core.js CRUSH_OF). 기본 0 이면 이 줄이 안 뜬다.
     ★ 이 줄은 **「문이 도는가」만** 말한다 — 눌림이 0 이면 방아쇠가 안 걸린 것이고
       ([[knob-that-does-nothing]]), 판당 눌린 초가 0 에 가까우면 켜 놓고도 안 눌린 것이다.
       **판정은 바로 위 표의 뒤 판당 · 회복초중앙**이다 — 이 줄이 아니다.
     ★ 이 줄을 여기 두는 까닭: 처음엔 「수법 표」 블록 안에 적었다가 재기 전에 잡았다 —
       그 블록은 `if (KS2.length)` 라, 수법이 한 번도 안 터진 짧은 판에서는 **문이 돌았는데도
       줄이 통째로 안 떴다**(2분 smoke). 자는 제가 재는 표 옆에 선다. */
  {
    let KN = 0, KS = 0, KH = 0;
    for (const s2 of SEEDS) { const v = capCrush[s2]; if (!v) continue; KN += v[0] | 0; KS += NUM(v[1]); KH += v[2] | 0; }
    if (KN) console.log(`상한눌림(D-35) · 눌림 ${KN} 번 · 눌린 초 합 ${KS.toFixed(0)} ` +
      `(**판당 ${(KS / SEEDS.length).toFixed(0)}초** · 한 번에 ${(KS / KN).toFixed(1)}초) · ` +
      `기준 머릿수 평균 ${(KH / KN).toFixed(1)}`);
  }
  /* ★ **D-36 · 깊이가 여는 문**(core.js DEEP_OF). 기본 0 이면 이 줄이 안 뜬다.
     ★ D-35 줄과 **꼭 같은 자리에** 선다 — 두 갈래는 미는 것(자리)이 같고 방아쇠만
       다르므로, 같은 꼴로 적어야 「사건 하나에 무슨 일이 났나」를 나란히 견줄 수 있다.
     ★ 이 줄도 **「문이 도는가」만** 말한다 — 판정은 위 표의 뒤 판당 · 회복초중앙이다.
     ★ **걸린 층 평균이 21 아래로 내려갈 수 없다** — 그것이 이 갈래의 존재 이유다
       (앞을 물면 D-29~35 가 진 자리로 되돌아간다). 21 미만이 찍히면 문이 샌 것이다. */
  {
    let DN = 0, DS = 0, DF = 0;
    for (const s2 of SEEDS) { const v = deepCrush[s2]; if (!v) continue; DN += v[0] | 0; DS += NUM(v[1]); DF += v[2] | 0; }
    if (DN) console.log(`깊이눌림(D-36) · 걸림 ${DN} 번 · 눌린 초 합 ${DS.toFixed(0)} ` +
      `(**판당 ${(DS / SEEDS.length).toFixed(0)}초** · 한 번에 ${(DS / DN).toFixed(1)}초) · ` +
      `걸린 층 평균 ${(DF / DN).toFixed(1)}`);
  }
}

/* ══ D-24 · **뒤에서 왜 자리를 못 채우나** ══ D-23 이 남긴 ㉮ 다.
   D-23 이 잰 것: 뒤(층 21+)는 한 번 무너지면 11.6~16.3초를 비운 채 싸우고, 그 사이
   자리참% 는 10% 뿐이다 — **자리는 남는데 못 채운다.** 그 「못 채움」의 갈래를 깊이별로
   가른다. 죽음의 앞 5초로만 보던 자를 **판 전체**로 넓힌 것이다(죽음이 없는 구간이
   오히려 이 항목의 알맹이다 · [[probe-must-walk-the-real-path]]).
     · 시도/분  = castOnce 가 불린 횟수(손이 나갔나)
     · 세움/분  = 실제로 선 수
     · 막힘%    = 시도 중 그 관문에 걸린 몫 — **겹칠 수 있다**(마나도 없고 쿨도 안 돌았으면 둘 다 센다)
   ★ 판을 한 글자도 안 건드린다 — 점마다 오는 누계를 바깥에서 빼기만 한다. */
{
  const BANDS = [[1,10],[11,20],[21,40],[41,60],[61,9999]];
  const KS = ["try","ok","cd","mana","corpse","capfull","merge","lost"];
  const cells = BANDS.map(() => { const c = { sec:0, rat:[] }; for (const k of KS) c[k] = 0; return c; });
  for (const SEED of SEEDS) {
    const ser = band.filter(b => b.SEED === SEED && b.소환);
    let prev = null;
    for (const b of ser) {
      if (prev) {
        const f = Math.max(prev.층, b.층);                 // 창 안에서 되짚었으면 깊은 쪽에 담는다(D-21 과 같은 결)
        const i = BANDS.findIndex(([lo,hi]) => f >= lo && f <= hi);
        if (i >= 0) {
          cells[i].sec += b.초 - prev.초;
          for (const k of KS) cells[i][k] += Math.max(0, (b.소환[k]|0) - (prev.소환[k]|0));
          if (b.상한 > 0) cells[i].rat.push(b.군세 / b.상한);
        }
      }
      prev = b;
    }
  }
  const W = [9,7,9,9,9,9,8,9,9,9];
  console.log(`\n── 뒤에서 왜 자리를 못 채우나 (D-24 · 씨앗 ${SEEDS.length}) ──`);
  console.log(["층구간","분","군세/상한","시도/분","세움/분","잃음/분","막힘쿨%","막힘마나%","막힘시체%","막힘자리%"]
              .map((h,i)=>h.padStart(W[i])).join(" "));
  for (let i = 0; i < BANDS.length; i++) {
    const c = cells[i]; if (!c.sec) continue;
    const mins = c.sec / 60, per = (v) => (v/Math.max(0.01,mins)).toFixed(0);
    const pc = (v) => (c.try ? (v/c.try*100).toFixed(0) : "-");
    const rat = c.rat.length ? (c.rat.reduce((a,x)=>a+x,0)/c.rat.length).toFixed(2) : "-";
    console.log([`${BANDS[i][0]}-${BANDS[i][1]===9999?"":BANDS[i][1]}`, mins.toFixed(1), rat,
                 per(c.try), per(c.ok), per(c.lost), pc(c.cd), pc(c.mana), pc(c.corpse), pc(c.capfull)]
                .map((v,j)=>String(v).padStart(W[j])).join(" "));
  }
  /* ★ **D-31 · 「못」 — 그 구간에 바닥에 쌓여 있던 시체의 평균.** 위 막힘시체% 는 «비율» 이라
     시도가 늘면 같이 오른다(D-30 이 막힘쿨% 에 똑같이 속을 뻔했다 ·
     [[threshold-and-ruler-must-match]]). 재료 축의 판정은 **이 몫**으로 한다 —
     지금(손잡이 0) 뒤 칸이 상한 140 에 붙어 있으면 재료가 사실상 무한이라는 뜻이다.
     표와 따로 한 줄로 내는 까닭: 표에 칸을 더하면 옛 로그와 «바이트까지 같은가» 를
     못 본다(A/B 0b 검사가 그걸 본다). */
  const pool = BANDS.map(() => []);
  for (const b of band) { if (b.시체 == null) continue;
    const i = BANDS.findIndex(([lo,hi]) => b.층 >= lo && b.층 <= hi);
    if (i >= 0) pool[i].push(b.시체); }
  const poolTxt = BANDS.map(([lo,hi],i) => pool[i].length
    ? `${lo}-${hi===9999?"":hi} ${(pool[i].reduce((a,x)=>a+x,0)/pool[i].length).toFixed(0)}` : null)
    .filter(Boolean).join(" · ");
  if (poolTxt) console.log(`  못(D-31 · 그 구간의 시체 못 평균 · 상한 ${140}) : ${poolTxt}`);
}

console.log(`\n씨앗 ${SEEDS.join(",")} · ${MIN}분 · 예외 ${errs.length}`);
bws.close(); process.exit(0);
