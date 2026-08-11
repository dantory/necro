/* **핵심 고리가 어디서 납작해지는가** — 오래 굴려 놓고 1분마다 재서 곡선을 본다.
   지금까지의 검수기는 「한 조각이 맞나」를 봤다(drop/affix/bag/fuse). 이건 그 조각들이
   모여 **몇 분째에 심심해지는지**를 본다 — 방치형에서 제일 중요한 건 그 시각이다.

     node tools/loop_health.mjs [분] [out.json]

   재는 것: 층 · 판수 · 레벨 · 금 · 낀 것 점수합 · 가방 · 합성 · 주운 것/녹인 것 ·
            군세 · 시체. 「무엇이 늘기를 멈추는가」가 곧 다음에 할 일이다. */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
const MIN = +(process.argv[2] || 20);
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [], netfail = [];
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push("EXC " + (m.params.exceptionDetails?.exception?.description || "").slice(0, 160));
  if (m.method === "Network.loadingFailed") netfail.push(m.params.errorText); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
/* ★★ **씨앗을 박지 않으면 이 자로는 아무것도 못 가른다.** 같은 코드로 15분을 세 번
   돌렸더니 군대 점유가 34 · 47 · 70 이었다 — 설정을 바꿔 가며 비교하던 폭(58 / 72 / 75)이
   통째로 그 흔들림 안에 들어간다. 실제로 그 잡음을 「회귀」로 읽고 되돌릴 뻔했다.
   게임 코드는 손대지 않고 **페이지가 뜨기 전에** Math.random 을 갈아 끼운다 —
   같은 씨앗이면 같은 판이 나오므로 A/B 가 성립한다.
     LH_SEED=7 node tools/loop_health.mjs 15 */
const SEED = +(process.env.LH_SEED || 1);
await S("Page.addScriptToEvaluateOnNewDocument", { source:
  `Math.random = (() => { let s = (${SEED} >>> 0) || 1;
     return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();` });
await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 2, mobile: true });
await S("Page.navigate", { url: PAGE });
await new Promise(r => setTimeout(r, 1500));
/* **처음부터** 시작한다 — 「막 시작한 사람이 몇 분째에 심심해지나」가 알고 싶은 것이다. */
await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4500));
await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
await new Promise(r => setTimeout(r, 900));

/* 판을 **빨리 감는다.** 실제로 20분을 기다리면 20분이 걸린다 — step 을 직접 돌린다.
   ★★ 처음에 step 만 돌렸다가 **군세 0 · 2분에 얼어붙음**이 나왔다. 게임 자체가
   멈춘 줄 알았는데, 자동 소환 auto() 는 battle.step 이 아니라 **main.js 의 그리는
   고리**가 0.35초마다 부른다. 그리기를 안 돌리면 군대가 한 기도 안 선다.
   죽었을 때 다시 내려가는 것도 사람이 누르는 몫이라 여기서 대신 눌러 준다.
   → 검수기가 **게임을 그대로 흉내 내지 않으면 게임을 오진한다.** */
const tick = (sec) => `(async()=>{
  const B = await import("/js/battle.js"), C = await import("/js/core.js");
  const S = window.__S; let n = Math.round(${sec} / 0.05), at = 0, deaths = 0;
  /* 분을 넘어 이어지는 기록 — 죽음은 분 경계와 상관없이 온다 */
  const R = window.__R || (window.__R = { t: 0, ring: [], log: [] });
  for (let i = 0; i < n; i++) {
    try {
      /* ── 누가 본인을 때렸나 ── 팔이 뻗는 칸(pending.core)을 **step 전에** 봐 둔다.
         체력은 step 안에서 그 pending 이 풀리며 깎이므로, 뒤에서 보면 이미 지워져 있다. */
      const hp0 = S.hp; let src = null;
      for (const m of S.mobs) if (m.pending && m.pending.core) (src = src || []).push(m.kind);
      B.step(0.05); R.t += 0.05;
      const d = hp0 - S.hp;
      if (d > 0.001) {
        if (!src) {                                            // 못 잡았으면 제일 가까운 놈으로
          let best = null, bd = 1e9;
          for (const m of S.mobs) { const q = Math.hypot(m.x, m.y); if (q < bd) { bd = q; best = m; } }
          src = [best ? best.kind : "?"];
        }
        R.ring.push({ t: R.t, d: Math.round(d * 10) / 10, from: src });
      }
      while (R.ring.length && R.t - R.ring[0].t > 5) R.ring.shift();   // 직전 5초만 남긴다
      if ((at += 0.05) > 0.35) { at = 0; window.auto(); }     // main.js 의 그리는 고리가 하는 일
      if (S.dead) {
        deaths++;
        /* ── 죽은 자리의 사진 ── newRun 이 판을 지우기 **전에** 찍는다.
           「무엇이 모자라서 죽었나」는 이 네 줄로 갈린다:
             본인 체력(최대체력 대비 층피해) · 군세(군세/상한) · 마나(마나/최대) · 화력(적체력) */
        const from = {}; let took = 0, hits = 0;
        for (const e of R.ring) { took += e.d; hits++;
          for (const k of e.from) from[k] = (from[k] || 0) + e.d / e.from.length; }
        R.log.push({
          층: S.floor, 최대체력: C.hpMaxOf(), 층피해: C.floorDmg(S.floor),
          마나: Math.round(S.mp), 마나최대: C.mpMaxOf(),
          군세: S.minions.length, 상한: C.armyCap(), 시체: S.corpses,
          적: S.mobs.length, 적체력: Math.round(S.mobs.reduce((a, m) => a + Math.max(0, m.hp), 0)),
          "5초피해": Math.round(took), 맞은횟수: hits,
          출처: Object.fromEntries(Object.entries(from).map(([k, v]) => [C.MOB_N[k] || k, Math.round(v)])),
        });
        R.ring.length = 0;
        B.newRun();                                            // 사람이 「다시」를 누르는 몫
      }
    } catch(e) { return "ERR " + e.message; }
  }
  const sc = (it) => it ? C.scoreOf(it) : 0;
  const eq = ["wand","robe","charm"].map(k => sc(C.equipped(k)));
  return JSON.stringify({
    층: S.floor, 최고층: C.META.deepest, 판수: C.META.runs, 레벨: C.META.lv,
    금: Math.round(C.META.gold),
    낀것점수: Math.round(eq.reduce((a,b)=>a+b,0)), 슬롯: eq.map(Math.round),
    가방: (C.META.bag||[]).length, 군세: S.minions.length, 상한: C.armyCap(),
    시체: S.corpses, 체력: Math.round(S.hp), 이번분죽음: deaths,
    죽음기록: R.log.splice(0),
  });})()`;

const rows = [], deaths = [];
for (let m = 1; m <= MIN; m++) {
  const r = await S("Runtime.evaluate", { expression: tick(60), awaitPromise: true, returnByValue: true });
  const v = r.result.value;
  if (typeof v === "string" && v.startsWith("ERR")) { console.log(m + "분", v); break; }
  const o = JSON.parse(v); o.분 = m;
  for (const d of o.죽음기록 || []) deaths.push({ ...d, 분: m });
  delete o.죽음기록; rows.push(o);
  console.log(`${String(m).padStart(2)}분  층 ${String(o.층).padStart(2)} (최고 ${o.최고층}) · 판 ${o.판수} · Lv ${o.레벨}` +
              ` · 금 ${String(o.금).padStart(6)} · 장비 ${String(o.낀것점수).padStart(4)} [${o.슬롯}]` +
              ` · 가방 ${o.가방} · 군세 ${o.군세}/${o.상한} · 죽음 ${o.이번분죽음}`);
}
/* **어디서 멈췄나** — 마지막 5분 동안 안 자란 것을 이름으로 뱉는다. */
if (rows.length >= 6) {
  const a = rows[rows.length - 6], b = rows[rows.length - 1], flat = [];
  for (const k of ["최고층", "레벨", "낀것점수", "상한"]) if (b[k] <= a[k]) flat.push(k);
  console.log("\n마지막 5분에 **안 자란 것**:", flat.length ? flat.join(" · ") : "없음(전부 자람)");
  console.log("금은", b.금 > a.금 * 1.5 ? "계속 불어남 — 쓸 곳이 모자란지 볼 것" : "완만");
  /* ★ **이 게임에서 제일 중요한 한 줄.** 「직접 안 싸운다」가 전제이므로, 군대가 판에
     서 있지 않으면 다른 게임을 하고 있는 것이다. 25분 재서 평균 점유와 「거의 전멸」인
     분 수를 본다 — 시체 격을 고치기 전엔 평균 48% · 전멸 12/25분이었다(고친 뒤 81% · 1/25). */
  const occ = rows.map(r => r.군세 / Math.max(1, r.상한));
  const low = occ.filter(o => o <= 0.25).length;
  console.log(`군대 점유 평균 ${Math.round(occ.reduce((x,y)=>x+y,0)/occ.length*100)}%` +
              ` · 거의 전멸(25%↓) ${low}/${occ.length}분`);
}
/* ── **왜 그 층에서 멈추나** ──────────────────────────────────────────────
   죽는 자리가 늘 같으면 「더 깊이」가 목표에서 빠진다. 죽은 자리를 전부 모아
   **무엇이 모자랐는지**를 이름으로 말한다 — 짐작이 아니라 죽을 때 찍은 사진에서. */
if (deaths.length) {
  const avg = (f) => deaths.reduce((a, d) => a + f(d), 0) / deaths.length;
  const byFloor = {};
  for (const d of deaths) byFloor[d.층] = (byFloor[d.층] || 0) + 1;
  const top = Object.entries(byFloor).sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log(`\n죽음 ${deaths.length}회 · 자주 죽는 층 ` +
              top.map(([f, n]) => `${f}층×${n}`).join(" · "));
  /* 「몇 대 맞고 죽나」 — 이 값이 3 아래로 내려가면 본인 체력이 벽이다. */
  const 버팀 = avg((d) => d.최대체력 / Math.max(1, d.층피해));
  console.log(`죽을 때 평균  군세 ${Math.round(avg((d) => d.군세 / Math.max(1, d.상한)) * 100)}%` +
              ` · 마나 ${Math.round(avg((d) => d.마나 / Math.max(1, d.마나최대)) * 100)}%` +
              ` · 시체 ${avg((d) => d.시체).toFixed(1)}` +
              ` · 남은 적 ${avg((d) => d.적).toFixed(1)}마리(체력합 ${Math.round(avg((d) => d.적체력))})` +
              ` · 맞고 버팀 ${버팀.toFixed(1)}대`);
  const src = {};
  for (const d of deaths) for (const [k, v] of Object.entries(d.출처 || {})) src[k] = (src[k] || 0) + v;
  const tot = Object.values(src).reduce((a, b) => a + b, 0) || 1;
  console.log("죽기 직전 5초 피해 출처: " +
              Object.entries(src).sort((a, b) => b[1] - a[1])
                .map(([k, v]) => `${k} ${Math.round(v / tot * 100)}%`).join(" · "));
  /* 한 줄 판정 — 셋 중 **제일 모자란 것**을 지목한다. */
  const 군세 = avg((d) => d.군세 / Math.max(1, d.상한)), 마나 = avg((d) => d.마나 / Math.max(1, d.마나최대));
  const 후보 = [["본인 체력", 버팀 / 5], ["군세", 군세], ["마나", 마나]].sort((a, b) => a[1] - b[1]);
  console.log(`→ 벽은 **${후보[0][0]}** 쪽이 제일 모자람(체력 ${(버팀 / 5).toFixed(2)} · 군세 ${군세.toFixed(2)} · 마나 ${마나.toFixed(2)}, 1.0 이 넉넉함)`);
}
fs.writeFileSync(process.argv[3] || "/tmp/loop_health.json", JSON.stringify({ rows, deaths }, null, 1));
console.log("errors:", errs.slice(0, 3), "netfail:", netfail.slice(0, 3));
await raw("Target.closeTarget", { targetId }); bws.close();
