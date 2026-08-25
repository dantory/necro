/* **슬롯이 «물건 모양»인가** — D2 참고 사진 ⑤(병수님 2026-08-17 21:09):
   「D2 는 무기·방패가 2×4 세로 큰 칸이다」. 열 칸이 다 같은 정사각이면 인물 둘레에
   흩어진 단추로 읽힌다.
     node tools/doll_shape.mjs [폭 높이]   (안 주면 PC 세 크기를 다 돈다)

   ★ **재는 것은 «슬롯»이 아니라 «칸(.cell)»이다.** 슬롯 상자만 늘리고 그 안의 칸이
     `aspect-ratio:1` 인 채면 눈에는 아무 일도 안 일어난다([[knob-that-does-nothing]]).
     그래서 자는 실제로 그려진 `.cell` 의 가로·세로를 읽는다.
   ★ 문턱은 **D2 의 칸 수**에서 온다(2×4 → 2.0 · 2×3 → 1.5 · 2×1 → 0.5 · 1×1 → 0.5폭).
     ±12% 만 봐준다 — 「좀 길게」 를 통과시키면 자가 아니다.
   ★ 모양만 보면 안 된다 — **읽을 만한 크기**로 남는지 같이 본다(제일 짧은 변 ≥ 16px).
     비율을 맞추느라 허리띠가 6px 이 되면 그것도 결함이다.
   ★ 그리고 **채워 놓고 잰다** — 빈 슬롯은 표본이 아니다([[probe-must-walk-the-real-path]]). */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const SIZES = process.argv[2]
  ? [[+process.argv[2], +(process.argv[3] || 863)]]
  : [[1512, 863], [1440, 900], [1280, 800]];
const TOL = 0.12, MIN_SIDE = 16;

/* 기대하는 모양 — 세로배(h/w)와 「이웃보다 좁은가」. D2 의 칸 수 그대로다. */
const WANT = {
  "pd-wand":   { r: 2.0,  n: "무기 2×4" },
  "pd-shield": { r: 2.0,  n: "방패 2×4" },
  "pd-robe":   { r: 1.5,  n: "갑옷 2×3" },
  /* ★ 허리띠만 «바닥»이 있다(V-72) — 짧은 변이 --pdBeltMin 에 닿으면 비율을 놓고
       읽히는 쪽을 고른다. 바닥값은 **CSS 에서 읽어 온다**(여기 20 을 또 적으면 둘이
       갈린다 [[seam-not-values]]). */
  "pd-belt":   { r: 0.5,  n: "허리띠 2×1", floor: true },
  "pd-helm":   { r: 1.0,  n: "투구 2×2" },
  "pd-glove":  { r: 1.0,  n: "장갑 2×2" },
  "pd-boots":  { r: 1.0,  n: "신발 2×2" },
  "pd-charm":  { r: 1.0,  n: "부적 1×1", narrow: 0.6 },
  "pd-ring":   { r: 1.0,  n: "반지 1×1", narrow: 0.6 },
  "pd-ring2":  { r: 1.0,  n: "반지 1×1", narrow: 0.6 },
};

const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "?").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.value;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: SIZES[0][0], height: SIZES[0][1], deviceScaleFactor: 2, mobile: false });
await wait(4200);

/* 열 슬롯을 **다 채운다** — 빈 칸은 그림이 흐린 실루엣이라 「모양」을 묻기에 모자라다.
   슬롯 이름은 게임에서 가져온다(손으로 적었다가 GEAR 에 없는 것을 심은 적이 있다). */
await ev(`(()=>{const M=window.META; M.lv=40; M.bag=[];
  for(const k of (window.__GEAR_KEYS||[])) M.equip[k]={k, tier:2, af:[{id:"dmg",v:12}]};
  for(let i=0;i<12;i++) M.bag.push({k:(window.__GEAR_KEYS||["wand"])[0], tier:1, af:[]});
  window.saveMeta();})()`);

let bad = 0;
const say = (ok, s) => { if (!ok) bad++; console.log(`${ok ? "PASS" : "FAIL"}  ${s}`); };

for (const [W, H] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
  await ev(`window.__openWin("bag")`);
  await wait(600);
  const r = JSON.parse(await ev(`(()=>{
    const vis=el=>{ if(!el) return false; const g=el.getBoundingClientRect(); return g.width>1&&g.height>1; };
    const doll=[...document.querySelectorAll(".win.on .pdoll")].find(vis);
    if(!doll) return JSON.stringify({없음:"pdoll"});
    const out={};
    for(const s of doll.querySelectorAll(".pdSlot")){
      const key=[...s.classList].find(c=>c.startsWith("pd-"));
      const c=s.querySelector(".cell")||s;             /* 눈에 보이는 것은 칸이다 */
      const g=c.getBoundingClientRect();
      out[key]={w:+g.width.toFixed(1), h:+g.height.toFixed(1)};
    }
    const bm=parseFloat(getComputedStyle(doll).getPropertyValue("--pdBeltMin"))||
             parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--pdBeltMin"))||20;
    return JSON.stringify({칸:out, 인물:doll.querySelectorAll(".pdSlot").length, 띠바닥:bm});
  })()`));
  const t = `${W}×${H}`;
  if (r.없음) { say(false, `${t}: ${r.없음} 이 없다`); continue; }
  say(r.인물 === 10, `${t}: 슬롯 열이 다 있다 (${r.인물}개)`);

  /* 「보통 칸」(투구)의 폭이 1 단위 — 좁은 칸은 그것과 견준다. */
  const unit = r.칸["pd-helm"]?.w || 0;
  const 틀린모양 = [], 너무작음 = [], 안좁음 = [];
  for (const k in WANT) {
    const c = r.칸[k]; if (!c) { 틀린모양.push(`${k} 없음`); continue; }
    const got = c.h / c.w;
    /* 바닥에 닿은 칸은 **바닥이 기대값**이다 — 안 그러면 「읽을 만하다」와 「물건
       모양이다」가 서로를 떨어뜨린다(문턱 둘이 싸우면 자가 아니다). */
    const want = WANT[k].floor ? Math.max(WANT[k].r, (r.띠바닥 || 20) / c.w) : WANT[k].r;
    if (Math.abs(got - want) / want > TOL) 틀린모양.push(`${WANT[k].n} ${got.toFixed(2)}(≠${want})`);
    if (Math.min(c.w, c.h) < MIN_SIDE) 너무작음.push(`${WANT[k].n} ${Math.min(c.w, c.h)}px`);
    if (WANT[k].narrow && unit && c.w / unit > WANT[k].narrow + TOL)
      안좁음.push(`${WANT[k].n} 폭 ${(c.w / unit).toFixed(2)}배`);
  }
  say(틀린모양.length === 0, `${t}: 슬롯이 물건 모양이다 (${틀린모양.join(", ") || "열 칸 다 맞음"})`);
  say(안좁음.length === 0, `${t}: 반지·부적은 작은 칸이다 (${안좁음.join(", ") || "셋 다 맞음"})`);
  say(너무작음.length === 0, `${t}: 칸이 읽을 만하다 (${너무작음.join(", ") || `제일 짧은 변 ≥ ${MIN_SIDE}px`})`);

  /* 「다 같은 정사각」으로 되돌아가면 여기서 잡힌다 — 모양이 **몇 가지**인가. */
  const 가짓수 = new Set(Object.values(r.칸).map(c => (c.h / c.w).toFixed(1))).size;
  say(가짓수 >= 4, `${t}: 모양이 여러 가지다 (${가짓수}가지 ≥ 4)`);

  await ev(`window.__closeAll&&window.__closeAll()`);
  await wait(200);
}
say(errs.length === 0, `콘솔 예외 0 (${errs.slice(0, 2).join(" | ") || "없음"})`);
console.log(bad ? `\n✗ 슬롯 모양: ${bad} 곳 틀림` : `\n✓ 슬롯 모양: 전부 통과`);
await raw("Target.closeTarget", { targetId });
process.exit(bad ? 1 : 0);
