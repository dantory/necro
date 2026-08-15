/* **래스터·합성이 태운 시간**을 잰다 — 앞의 두 자가 못 보던 마지막 칸.
     node tools/trace_probe.mjs [초] [층] [몸수] [느리게배]

   왜 이 자가 필요한가 — 「그리고 렉걸림」을 좇아 자를 둘 세웠고 둘 다 **아니다**로
   끝났다: `cpu_profile` 은 여섯 배 느린 기계에서도 JS 가 초당 0.12~0.15초뿐이라 했고,
   `paint_probe` 는 2D 호출이 초당 0.046초뿐이라 했다. 그런데 그 ×6 판의 한 프레임은
   34ms 인데 둘을 합쳐도 6.6ms 다 — **남는 27ms 를 아무도 안 보고 있었다.**
   그 27ms 가 여기다: 크롬의 canvas2d 호출은 **미뤄진다**. 호출 자리에서 재는 것은
   *명령을 적는* 시간이고, **칠하는(래스터) · 화면에 얹는(합성)** 일은 다른 스레드
   ─ 심지어 다른 프로세스(GPU/Viz) ─ 에서 뒤늦게 벌어진다.

   재는 법 — `Tracing`(크롬이 제 안에서 쓰는 계측)을 켜고 **스레드별로 바쁜 시간**을
   센다. 페이지 세션이 아니라 **브라우저 통째로** 켜야 GPU·Viz 프로세스가 잡힌다.
   ★ 겹친 것을 두 번 세지 않는다 — 한 스레드 안에서 **맨 바깥 것만** 더한다
     (안쪽 것은 이미 바깥 시간에 들어 있다). B/E 짝은 스택으로 X 로 접어서 본다.
   ★ 어느 프로세스인지 이름을 같이 낸다(process_name·process_labels) — 「Compositor
     가 바쁘다」보다 「GPU 프로세스의 VizCompositorThread 가 바쁘다」가 고칠 수 있는 말이다.
   ★ 판은 병수님 화면(414×860 · dpr2)으로 세우고 **사람이 지나는 길**로 내려간다
     — 마을에서 시작해 층으로([[probe-must-walk-the-real-path]]).
   ★ 느리게(`Emulation.setCPUThrottlingRate`)는 **렌더러 JS 에만** 걸린다 — 래스터·합성
     스레드는 안 느려진다. 그러니 ×6 의 이 표는 「폰의 합성」이 아니라 **이 맥의 합성**이다.
     그래도 「그 27ms 가 어디에 있나」는 이걸로만 답이 된다. */
/* ★ 어느 창에서 재는지 낸다 — 9333 은 `--disable-gpu`(소프트웨어 합성), 9334 는
   `gpu_chrome.mjs` 가 세우는 **GPU 합성 켠 창**이다. 같은 표라도 이 둘은 다른 기계다. */
const PORT = process.env.NECRO_CDP_PORT || "9333";
const CDP = `http://127.0.0.1:${PORT}`, PAGE = "http://127.0.0.1:8774/index.html";
const SEC = +(process.argv[2] || 6), FLOOR = +(process.argv[3] || 30), BODIES = +(process.argv[4] || 0);
const SLOW = +(process.argv[5] || 1);
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const 이벤트 = []; let 다받음 = null;
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Tracing.dataCollected") { for (const e of m.params.value) 이벤트.push(e); return; }
  if (m.method === "Tracing.tracingComplete") { 다받음 && 다받음(); return; }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
/* 표에 **어떤 합성인지**를 박아 둔다 — 크롬은 GPU 를 못 쓰면 말없이 소프트웨어로 내려가고,
   그걸 모르면 소프트웨어 값을 「GPU 켠 값」이라 적게 된다. */
const 지피유 = await raw("SystemInfo.getInfo").then(i => ({
  합성: i.gpu?.featureStatus?.gpu_compositing || "?",
  캔버스: i.gpu?.featureStatus?.["2d_canvas"] || "?",
  렌더러: (i.gpu?.auxAttributes?.glRenderer || "?").slice(0, 60),
})).catch(() => ({ 합성: "?", 캔버스: "?", 렌더러: "?" }));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 2, mobile: true });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e, aw = false) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: aw })).result?.value;

await ev(`localStorage.setItem("necro.meta.v1",JSON.stringify({gold:90000,lv:40,deepest:${FLOOR + 4},runs:6,up:{hp:6,mp:6,dmg:5,army:8},equip:{},bag:[],tree:{bone:3,armor:3,ghoul:3,legion:3,golem:3,rot:2,harvest:2}}))`);
await S("Page.reload", { ignoreCache: true }); await wait(4500);
await ev(`window.toDungeon && window.toDungeon()`); await wait(700);
await ev(`(async()=>{const B=await import("/js/battle.js");B.enterFloor(${FLOOR});return 1;})()`, true);
await wait(2500);
/* 무겁게 만드는 길도 **판이 쓰는 문**으로만 — 자리는 `summon` 에 맡긴다(손으로 주면 NaN). */
if (BODIES) await ev(`(async()=>{const B=await import("/js/battle.js");
  const 종 = ["skel","ghoul","golem"];
  for (let i=(S.minions||[]).length; i<${BODIES}; i++) B.summon(종[i%3]);
  for (let i=0;i<${BODIES} * 4;i++) B.addCorpse((i%11-5)*24, ((i/11|0)%7-3)*20, i%3);
  return 1;})()`, true);
await wait(1500);
const 판 = await ev(`({몸:(S.minions||[]).length, 적:(S.mobs||[]).length, 시체:S.corpses|0, 그림:(S.piles||[]).length})`);

/* fps 는 페이지 안 rAF 로 따로 센다 — 트레이스에서 프레임을 세는 것보다 눈금이 분명하다. */
await ev(`(()=>{ let n=0, 살아=true; const 톱니=()=>{ if(!살아) return; n++; requestAnimationFrame(톱니); };
  requestAnimationFrame(톱니); window.__raf={ get n(){return n;}, reset(){n=0;}, stop(){살아=false;} }; return 1; })()`);
if (SLOW > 1) { await S("Emulation.setCPUThrottlingRate", { rate: SLOW }); await wait(800); }

/* ── 트레이스 ────────────────────────────────────────────────────────────
   `toplevel` 이 스레드가 태운 시간의 바깥 껍데기고, `cc`·`viz`·`gpu` 가 래스터·합성의
   속살이다. `devtools.timeline` 은 이름을 사람이 읽을 수 있게 해 준다.
   ★ sessionId 를 빼고 부른다 — 브라우저 통째로 켜야 GPU 프로세스가 잡힌다. */
await raw("Tracing.start", {
  transferMode: "ReportEvents", bufferUsageReportingInterval: 1000,
  traceConfig: { recordMode: "recordAsMuchAsPossible", includedCategories: [
    "toplevel", "cc", "viz", "gpu", "blink", "benchmark", "sequence_manager",
    "disabled-by-default-devtools.timeline", "disabled-by-default-devtools.timeline.frame"] } });
/* ★ 프레임 세기는 **트레이스 창과 같은 구간**이라야 한다 — 처음엔 세기를 느리게 걸기
   *전에* 시작해서, 안 느려진 0.8초(120fps)가 통째로 섞였다. ×6 무거운 판이 「fps 135.7」
   로 이 맥의 천장(120)을 넘겨 나온 게 그 자국이다(96프레임이 덤으로 들어갔다).
   재기 직전에 0 으로 되돌린다([[probe-must-walk-the-real-path]]: 자가 제 눈금을 만든 자리). */
await ev(`window.__raf.reset()`);
await wait(SEC * 1000);
const 프레임수 = await ev(`(()=>{ const r=window.__raf; const n=r.n; r.stop(); return n; })()`);
const 끝남 = new Promise(r => { 다받음 = r; });
await raw("Tracing.end"); await 끝남;
if (SLOW > 1) await S("Emulation.setCPUThrottlingRate", { rate: 1 });

/* ── 셈 ──────────────────────────────────────────────────────────────────
   스레드(pid/tid)마다 **맨 바깥 것만** 더한다. 'X' 는 길이를 제가 들고 있고,
   'B'/'E' 는 스택으로 짝을 지어 길이를 만든다. 겹친 안쪽은 버린다. */
const 프로세스이름 = new Map(), 프로세스라벨 = new Map(), 스레드이름 = new Map();
for (const e of 이벤트) {
  if (e.ph !== "M") continue;
  if (e.name === "process_name") 프로세스이름.set(e.pid, e.args?.name);
  else if (e.name === "process_labels") 프로세스라벨.set(e.pid, e.args?.labels);
  else if (e.name === "thread_name") 스레드이름.set(e.pid + ":" + e.tid, e.args?.name);
}
const 키 = (e) => e.pid + ":" + e.tid;
/* 맨 바깥 것의 **이름**은 죄다 껍데기다(`RunTask`·`ThreadPool_RunTask`…) — 그대로 내면
   「RunTask 가 568ms」라는 못 고칠 말이 된다. 그래서 껍데기면 **그 안의 첫 알맹이**로
   이름을 바꿔 단다(시간은 바깥 것 그대로 — 겹쳐 세지 않는다). */
const 껍데기 = /^(RunTask|ThreadPool_RunTask|ThreadControllerImpl::RunTask|SequenceManager|MessagePump|TaskGraphRunner|SimpleWatcher|Channel|Mojo|IPC|.*::OnHandleReady)/;
const 스레드 = new Map();        /* 키 → { us, 이름별 } */
const 뭉치 = new Map();
for (const e of 이벤트) {
  if (e.ph !== "X" && e.ph !== "B" && e.ph !== "E") continue;
  const k = 키(e); let a = 뭉치.get(k); if (!a) 뭉치.set(k, a = []); a.push(e);
}
for (const [k, a] of 뭉치) {
  a.sort((x, y) => (x.ts - y.ts) || (x.ph === "E" ? -1 : 1));
  /* ① B/E 를 X 로 접는다 */
  const st = [], 조각 = [];
  for (const e of a) {
    if (e.ph === "X") { 조각.push({ name: e.name, ts: e.ts, dur: e.dur || 0 }); continue; }
    if (e.ph === "B") { st.push(e); continue; }
    const b = st.pop(); if (b) 조각.push({ name: b.name, ts: b.ts, dur: e.ts - b.ts });
  }
  조각.sort((x, y) => x.ts - y.ts);
  /* ② 맨 바깥 창만 더하되, 창 안의 첫 알맹이로 이름을 갈아 단다 */
  let t = 스레드.get(k); if (!t) 스레드.set(k, t = { us: 0, 이름별: Object.create(null), 속별: Object.create(null) });
  let 창 = null, 이름끝 = -Infinity, 속끝 = -Infinity;
  const 닫기 = () => { if (!창) return; t.us += 창.dur; t.이름별[창.label] = (t.이름별[창.label] || 0) + 창.dur; 창 = null; };
  for (const p of 조각) {
    if (창 && p.ts < 창.ts + 창.dur) {                    /* 안쪽 */
      if (껍데기.test(p.name)) continue;                  /* 껍데기는 이름으로도 속으로도 안 센다 */
      if (창.껍데기) { 창.label = p.name; 창.껍데기 = false; 이름끝 = p.ts + p.dur; 속끝 = -Infinity; continue; }
      /* 한 겹 더 — 「BeginMainFrame 이 1초를 다 먹었다」 다음에 답할 것은 **그 안이 뭐냐**다.
         이름이 붙은 것 **안쪽의 첫 겹**만 모은다(더 깊은 것은 이미 그 안에 들어 있다). */
      if (p.ts < 이름끝 && p.ts >= 속끝) { t.속별[p.name] = (t.속별[p.name] || 0) + p.dur; 속끝 = p.ts + p.dur; }
      continue;
    }
    닫기();
    창 = { label: p.name, ts: p.ts, dur: p.dur, 껍데기: 껍데기.test(p.name) };
    이름끝 = 창.껍데기 ? -Infinity : p.ts + p.dur; 속끝 = -Infinity;
  }
  닫기();
}

const 초 = SEC;
const fps = 프레임수 / 초;
/* ★ **초당ms 만 보면 이 맥이 손해를 본다** — 여기서는 120fps 로 돌아 폰(60)의 두 배를
   그리므로 초당 숫자가 두 배로 나온다. 그래서 **프레임당ms** 를 같이 낸다(16.7ms 가
   60fps 한 프레임의 천장). 폰과 대 볼 때 맞는 눈금은 이쪽이다. */
const 줄 = [...스레드.entries()].map(([k, t]) => {
  const [pid] = k.split(":");
  const 이름 = 스레드이름.get(k) || "?";
  const 프로 = 프로세스이름.get(+pid) || "?";
  const 라벨 = (프로세스라벨.get(+pid) || "").slice(0, 28);
  const 재기 = ([n, us]) => `${n} ${+(us / 1000 / 초).toFixed(1)}`;
  const 상위 = Object.entries(t.이름별).sort((a, b) => b[1] - a[1]).slice(0, 3).map(재기);
  const 속 = Object.entries(t.속별).sort((a, b) => b[1] - a[1]).slice(0, 5).map(재기);
  return { 스레드: 이름, 프로세스: 라벨 ? `${프로}(${라벨})` : 프로,
    "초당ms": +(t.us / 1000 / 초).toFixed(1),
    "프레임당ms": +(t.us / 1000 / (프레임수 || 1)).toFixed(2), 상위, 속 };
}).filter(r => r.초당ms >= 0.5).sort((a, b) => b.초당ms - a.초당ms);

/* 우리 판과 상관있는 쪽만 따로 묶는다 — 렌더러 메인은 `cpu_profile` 이 이미 보는 곳이고,
   여기서 새로 보려던 것은 **합성·래스터·GPU** 다. */
const 합성계 = 줄.filter(r => /Compositor|Raster|Viz|GPU|gpu|DrawingBuffer|Media/.test(r.스레드 + r.프로세스));
const 합성초당ms = +(합성계.reduce((a, r) => a + r.초당ms, 0)).toFixed(1);
const 합성프레임당 = +(합성계.reduce((a, r) => a + r.프레임당ms, 0)).toFixed(2);
const 렌더러메인 = 줄.filter(r => r.스레드 === "CrRendererMain");
const 메인초당 = 렌더러메인.reduce((a, r) => a + r.초당ms, 0);
const 메인프레임당 = +(렌더러메인.reduce((a, r) => a + r.프레임당ms, 0)).toFixed(2);

const out = { 창: `:${PORT}`, GPU: 지피유, 층: FLOOR, 초, 느리게: SLOW, 판,
  fps: +fps.toFixed(1), 트레이스이벤트: 이벤트.length,
  합성: { "초당ms": 합성초당ms, "프레임당ms": 합성프레임당 },
  렌더러메인: { "초당ms": +메인초당.toFixed(1), "프레임당ms": 메인프레임당 },
  스레드: 줄.slice(0, 12), 콘솔오류: errs };
console.log(JSON.stringify(out, null, 1));
/* 판단 기준 — **프레임당**으로 읽는다. 60fps 한 프레임이 16.7ms 이고, 합성·래스터가
   그 절반(8ms)을 먹으면 그리는 쪽에 남는 것이 없다. 초당 눈금(앞의 두 자와 같은
   1000ms 천장)도 같이 두되, 이 맥은 120fps 로 돌아 초당 숫자가 두 배로 나온다.
   ★ 이 자의 한계도 적어 둔다: 느리게는 **렌더러 JS 에만** 걸리므로 여기 숫자는
     **이 맥의 합성**이다. 폰의 GPU 가 몇 배 느린지는 이걸로 못 안다 — 진짜 기기가 있어야 한다. */
const 넘침 = 합성프레임당 > 8;
const bad = errs.length || !이벤트.length || !프레임수 || 넘침;
console.log(bad ? `FAIL${넘침 ? ` — 합성 프레임당 ${합성프레임당}ms` : ""}${!이벤트.length ? " — 트레이스 빔" : ""}${errs.length ? ` — 콘솔오류 ${errs.length}` : ""}`
  : `PASS — 합성 프레임당 ${합성프레임당}ms(초당 ${합성초당ms}) · 렌더러메인 ${메인프레임당}ms · fps ${fps.toFixed(1)} (느리게 ×${SLOW} · :${PORT} GPU합성 ${지피유.합성})`);
await raw("Target.closeTarget", { targetId });
bws.close(); process.exit(bad ? 1 : 0);
