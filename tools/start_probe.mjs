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

const rows = [], deaths = [];
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
      R.hist.push([S.minions.length, S.mp, S.corpses, S.hp / Math.max(1, S.hpMax)]);
      if (R.hist.length > 100) R.hist.shift();
      if (S.mp < 6) R.dry++;                                    // 해골 한 마리도 못 세우는 순간
      if (S.minions.length >= C.armyCap()) R.full++;             // 자리가 꽉 찬 순간
      if ((R.autoT += 0.05) > 0.35) { R.autoT = 0; try { window.auto(); } catch {} }
      if (S.dead) {
        const H = R.hist, cap = C.armyCap();
        const m = (j) => +(H.reduce((a, x) => a + x[j], 0) / Math.max(1, H.length)).toFixed(1);
        const pct = (f) => +(H.filter(f).length / Math.max(1, H.length) * 100).toFixed(0);
        R.deathLog.push({ 초: Math.round(R.tsec), 층: S.floor, 군세: S.minions.length, 상한: cap,
          마나: Math.round(S.mp), 마나최대: Math.round(S.mpMax), 시체: S.corpses,
          버틸대수: +(S.hpMax / C.floorDmg(S.floor)).toFixed(1),
          앞5초군세: m(0), 앞5초마나: m(1), 앞5초시체: m(2),
          앞5초마름: pct(x => x[1] < 6), 앞5초자리참: pct(x => x[0] >= cap) });
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
      죽음:R.deaths,
      죽음기록: (() => { const d = R.deathLog.slice(R.reported); R.reported = R.deathLog.length; return d; })() });
  })()`;

  const pts = [];
  for (let t = STEP; t <= MIN * 60; t += STEP) {
    const r = (await S("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: tick })).result.value;
    const o = JSON.parse(r);
    if (o.예외) { console.log(`씨앗 ${SEED} ${t}초에 예외: ${o.예외}`); break; }
    for (const d of (o.죽음기록 || [])) deaths.push({ SEED, ...d });
    delete o.죽음기록;
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
}
console.log(`\n씨앗 ${SEEDS.join(",")} · ${MIN}분 · 예외 ${errs.length}`);
bws.close(); process.exit(0);
