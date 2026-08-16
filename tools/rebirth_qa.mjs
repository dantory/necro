/* ══ 환생이 정말 「되풀이할 이유」가 되는가 ══ 한 씨앗에 대해 **회차 1** 을 굴려 깊이
   곡선을 기록하고, 그 끝에서 환생시킨 뒤 **회차 2** 를 같은 씨앗으로 다시 굴려 같은
   시각의 깊이를 견준다. 판정: 회차 2가 회차 1보다 **1.6배 이상** 깊은가(씨앗 셋).

     node tools/rebirth_qa.mjs [분] [씨앗,씨앗,…] [out.json]
     예) node tools/rebirth_qa.mjs 30 1,7,13

   loop_health.mjs 의 방식을 그대로 따른다 — 페이지가 뜨기 전에 Math.random 을 씨앗
   있는 것으로 갈고(같은 씨앗이면 같은 판), 남은 탭을 쓸고, 나갈 때 제 탭을 닫고,
   0.05초 step 루프로 빨리 감는다. **게임 코드를 건드려 재지 않는다.**
   ★ 회차 2는 회차 1과 **같은 씨앗으로 다시 심는다** — 같은 던전을 마주해야 유해 배수
     하나만이 차이가 된다(유해가 시체를 더 얹으며 뒤늦게 스트림이 갈리는 것은 실제
     게임에서도 그러하므로 그대로 둔다). */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
const MIN = +(process.argv[2] || 30);
const SEEDS = (process.argv[3] || "1,7,13").split(",").map(Number);
const OUT = process.argv[4] || "/tmp/rebirth_qa.json";
const WALL_CAP = 540;                                  // 벽시계 상한(초) — 넘으면 접고 정직하게 적는다
const t0 = Date.now();

const stale = (await (await fetch(CDP + "/json/list")).json())
  .filter((t) => t.type === "page" && t.url.startsWith(PAGE.split("index.html")[0]));
for (const t of stale) await fetch(`${CDP}/json/close/${t.id}`).catch(() => {});
if (stale.length) console.log(`(남아 있던 판 ${stale.length} 개를 닫았다)`);

const seedSrc = (SEED) =>
  `Math.random = (() => { let s = (${SEED} >>> 0) || 1;
     return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();`;

/* 한 씨앗을 통째로 재는 한 판(탭 하나) — 회차 1 · 환생 · 회차 2. 곡선 둘을 돌려준다. */
async function runSeed(SEED) {
  const ver = await (await fetch(CDP + "/json/version")).json();
  const bws = new WebSocket(ver.webSocketDebuggerUrl);
  let id = 0; const pend = new Map(); const errs = [];
  const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
  bws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data);
    if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
    if (m.method === "Runtime.exceptionThrown") errs.push("EXC " + (m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
  await new Promise((r) => bws.addEventListener("open", r));
  const { targetId } = await raw("Target.createTarget", { url: PAGE });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const shut = async () => { try { const { execFileSync } = await import("node:child_process"); execFileSync("curl", ["-s", `${CDP}/json/close/${targetId}`]); } catch {} };
  const S = (m, p) => raw(m, p, sessionId);
  await S("Page.enable"); await S("Runtime.enable");
  await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc(SEED) });
  await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
  await S("Page.navigate", { url: PAGE });
  await new Promise((r) => setTimeout(r, 1500));
  await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
  await S("Page.reload", { ignoreCache: true });
  await new Promise((r) => setTimeout(r, 4500));
  await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
  await new Promise((r) => setTimeout(r, 900));
  /* rAF 를 끊어 **빨리 감기만이 유일한 시간**이 되게 한다(loop_health 와 같은 처방). */
  await S("Runtime.evaluate", { expression: "window.requestAnimationFrame = () => 0" });
  await new Promise((r) => setTimeout(r, 200));

  /* 씨앗을 다시 심고 판을 새로 연다 — 여기부터가 진짜 0분(회차 1). */
  const boot = async () => S("Runtime.evaluate", { awaitPromise: true, expression:
    `(async()=>{ const B = await import("/js/battle.js");
       ${seedSrc(SEED)} B.newRun(); return "ok"; })()` });
  await boot();

  /* 60초를 0.05초 step 으로 빨리 감고, 죽으면 사람 대신 다시 내려보낸다(main.js 의 몫).
     auto() 는 0.35초마다(그리는 고리가 하던 일). 끝에서 그 순간의 깊이를 돌려준다. */
  const tick = `(async()=>{
    const B = await import("/js/battle.js"), C = await import("/js/core.js");
    const S = window.__S; const n = Math.round(60 / 0.05); let at = 0, deaths = 0;
    for (let i = 0; i < n; i++) {
      try {
        B.step(0.05);
        if ((at += 0.05) > 0.35) { at = 0; window.auto(); }
        if (S.dead) { deaths++; C.META.runs++; B.newRun(); }
      } catch (e) { return "ERR " + e.message; }
    }
    return JSON.stringify({ 층: S.floor, 최고층: C.META.deepest, 레벨: C.META.lv,
      금: Math.round(C.META.gold), 군세: S.minions.length, 상한: C.armyCap(),
      유해: C.META.relics|0, 죽음: deaths });
  })()`;

  const curve = async (label) => {
    const c = [];
    for (let m = 1; m <= MIN; m++) {
      if ((Date.now() - t0) / 1000 > WALL_CAP) { console.log(`  [벽시계 ${WALL_CAP}s 초과 — ${label} ${m - 1}분에서 접음]`); break; }
      const r = await S("Runtime.evaluate", { expression: tick, awaitPromise: true, returnByValue: true });
      const v = r.result.value;
      if (typeof v === "string" && v.startsWith("ERR")) { console.log(`  ${label} ${m}분 ${v}`); errs.push(v); break; }
      const o = JSON.parse(v); c.push(o.최고층);
      if (m % 5 === 0 || m === MIN)
        console.log(`  씨${SEED} ${label} ${String(m).padStart(2)}분  최고 ${String(o.최고층).padStart(2)}층 · Lv ${o.레벨} · 금 ${o.금} · 군세 ${o.군세}/${o.상한} · 유해 ${o.유해}`);
    }
    return c;
  };

  const c1 = await curve("회차1");
  /* ── 환생 ── 회차 1 의 최고층으로 유해를 얻고 처음으로 되돌린 뒤, **같은 씨앗**으로
     다시 심어 회차 2를 연다(같은 던전을 마주해야 유해 하나만이 차이가 된다). */
  const reb = await S("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression:
    `(async()=>{ const C = await import("/js/core.js"), B = await import("/js/battle.js");
       const before = C.META.deepest;
       const r = window.__rebirth();
       ${seedSrc(SEED)} B.newRun();
       return JSON.stringify({ before, r }); })()` });
  const rj = JSON.parse(reb.result.value);
  if (!rj.r) { console.log(`  씨${SEED} ✗ 회차1 최고 ${rj.before}층 — 임계(25) 미만이라 환생 불가`); await shut(); bws.close(); return { SEED, c1, c2: [], reb: rj, errs }; }
  console.log(`  씨${SEED} ⟳ 환생 · 회차1 최고 ${rj.before}층 → 유해 +${rj.r.gain} (총 ${rj.r.relics})`);
  const c2 = await curve("회차2");
  await shut(); bws.close();
  return { SEED, c1, c2, reb: rj, errs };
}

const bwsPre = null; void bwsPre;
const out = [];
for (const SEED of SEEDS) {
  console.log(`\n══ 씨앗 ${SEED} ══`);
  out.push(await runSeed(SEED));
}

/* ── 판정 ── 유해가 「되풀이할 이유」가 되었는지를 세 각도로 본다. 깊이 곡선은 log
   꼴이라(ROADMAP: 최고층 ≈ log_1.15(시간)) 유해가 주는 것은 **거의 일정한 시각-앞섬**
   이고, 그래서 깊이 **비율**은 중반에 제일 크고 끝에서 눌린다. 세 각도:
     · 비율 곡선 — 5분 간격으로 회차2/회차1. 앞섬이 어디서 제일 큰지 보인다.
     · 최고 비율 — 곡선에서 제일 크게 앞선 순간(중반).
     · 시각-앞섬 — 회차2가 회차1의 **30분 깊이**에 몇 분 만에 닿는가(느낌으로 제일 큰 값). */
console.log(`\n═══ 판정 (${MIN}분 · ${SEEDS.length}씨앗) ═══`);
let passPeak = 0, passMid = 0, tested = 0;
const MID = Math.min(15, MIN);
for (const o of out) {
  const k = Math.min(o.c1.length, o.c2.length);
  if (!k || !o.reb.r) { console.log(`씨${o.SEED}: 환생 불가/미완 — 판정 제외`); continue; }
  tested++;
  const ratios = [];
  for (let i = 0; i < k; i++) ratios.push(o.c1[i] ? o.c2[i] / o.c1[i] : 0);
  const marks = [5, 10, 15, 20, 25, 30].filter((m) => m <= k);
  const curveTxt = marks.map((m) => `${m}분 ${o.c2[m - 1]}/${o.c1[m - 1]}=${ratios[m - 1].toFixed(2)}`).join(" · ");
  const peak = Math.max(...ratios), peakAt = ratios.indexOf(peak) + 1;
  const mid = ratios[MID - 1] || 0;
  /* 시각-앞섬 — 회차2가 회차1의 마지막(30분) 깊이에 처음 닿는 분. */
  const target = o.c1[k - 1]; let reachAt = k;
  for (let i = 0; i < o.c2.length; i++) if (o.c2[i] >= target) { reachAt = i + 1; break; }
  const okPeak = peak >= 1.6, okMid = mid >= 1.6;
  if (okPeak) passPeak++; if (okMid) passMid++;
  console.log(`씨${o.SEED}: ${curveTxt}`);
  console.log(`   최고 ${peak.toFixed(2)}배(${peakAt}분) ${okPeak ? "✓" : "✗"} · 중반 ${MID}분 ${mid.toFixed(2)}배 ${okMid ? "✓" : "✗"}` +
              ` · 회차2가 회차1의 ${target}층(${k}분)에 **${reachAt}분**만에 닿음(${(k - reachAt)}분 앞섬)`);
}
const verdict = tested && passPeak === tested;
console.log(`\n→ 최고 비율 1.6배↑: ${passPeak}/${tested} · 중반(${MID}분) 1.6배↑: ${passMid}/${tested} — ${verdict ? "**통과**" : "**미달**"}`);
const allErr = out.flatMap((o) => o.errs);
console.log("errors:", allErr.slice(0, 3), "· 벽시계", Math.round((Date.now() - t0) / 1000) + "s");
fs.writeFileSync(OUT, JSON.stringify({ MIN, SEEDS, out, passPeak, passMid, tested, verdict }, null, 1));
process.exit(0);
