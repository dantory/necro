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
  for (let i = 0; i < n; i++) {
    try {
      B.step(0.05);
      if ((at += 0.05) > 0.35) { at = 0; window.auto(); }     // main.js 의 그리는 고리가 하는 일
      if (S.dead) { deaths++; B.newRun(); }                    // 사람이 「다시」를 누르는 몫
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
  });})()`;

const rows = [];
for (let m = 1; m <= MIN; m++) {
  const r = await S("Runtime.evaluate", { expression: tick(60), awaitPromise: true, returnByValue: true });
  const v = r.result.value;
  if (typeof v === "string" && v.startsWith("ERR")) { console.log(m + "분", v); break; }
  const o = JSON.parse(v); o.분 = m; rows.push(o);
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
fs.writeFileSync(process.argv[3] || "/tmp/loop_health.json", JSON.stringify(rows, null, 1));
console.log("errors:", errs.slice(0, 3), "netfail:", netfail.slice(0, 3));
await raw("Target.closeTarget", { targetId }); bws.close();
