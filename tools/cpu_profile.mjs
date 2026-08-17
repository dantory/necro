/* **함수가 태운 시간**을 잰다 (2026-08-15 「그리고 렉걸림」의 교훈).
     node tools/cpu_profile.mjs [초] [층] [몸수] [느리게배]

   ★ **몫(%)만으로는 폰을 못 본다.** 「1위가 5% 미만」은 *이 판 안에서* 고르다는 뜻이지
     **일이 적다는 뜻이 아니다** — 이 맥이 워낙 빨라 94.8% 가 네이티브로 잡히면
     JS 는 뭘 해도 몫이 작게 나온다. 그래서 **절대량**을 같이 낸다:
     `JS초당ms` = 1초를 사는 동안 JS 가 태운 밀리초. 60fps 의 한 프레임은 16.7ms 이니
     초당 1000ms 가 천장이고, JS 가 그중 몇을 먹는지가 곧 **폰에 남는 여유**다.
   ★ 네 번째 인자로 CPU 를 **N 배 느리게**(`Emulation.setCPUThrottlingRate`) 걸 수 있다.
     폰은 이 맥보다 대략 4~6배 느리다 — `4`·`6` 으로 걸고 `JS초당ms` 를 본다.

   왜 이 자가 필요한가 — 그날 처음 잰 것은 rAF 간격이었고, 헤드리스에서 그 간격은
   vsync·합성과 무관해서 **병수님 화면의 프레임이 아니다.** 「긴 프레임 0%」가
   거짓 통과였다. 진짜 답은 CPU 프로파일에서 나왔다(drawGlows 자기시간 8.2%).
   그런데 그 프로파일은 **손으로 한 번 뜬 것**이라 다시 못 잰다 — 그래서 자로 굳힌다.

   이 맥은 89.6% 가 네이티브라 JS 가 병목이 아니다. 그러니 fps 로 판단하지 말고
   **JS 자기시간 상위 목록**을 본다 — 폰에서 제일 먼저 무너지는 자리가 거기다.
   판은 병수님 화면 크기(414×860 · dpr2)로 세우고, 몸을 불려 무겁게 만든다. */
/* 창은 골라 쓴다 — 기본 9333(소프트웨어 합성), `NECRO_CDP_PORT=9334` 면 GPU 합성 켠 창(gpu_chrome.mjs). */
/* ★ 성능 모드는 **쿼리로 못을 박는다**(`NECRO_PERF=1|0`). localStorage 로만 세우면
   자동 판정이 재는 도중에 켜 버려 두 팔이 같아진다(main.js 의 PERF_PINNED 참조). */
const PERF = process.env.NECRO_PERF;
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`,
  PAGE = "http://127.0.0.1:8774/index.html" + (PERF != null ? `?perf=${PERF === "1" ? 1 : 0}` : "");
const SEC = +(process.argv[2] || 6), FLOOR = +(process.argv[3] || 30), BODIES = +(process.argv[4] || 0);
const SLOW = +(process.argv[5] || 1);   /* CPU 를 N 배 느리게 — 1 이면 안 건다 */
/* ★★ **가장 깊은 층**은 이제 손잡이다(2026-08-17). 여태 이 자는 `deepest = 층+4` 로만
   판을 세웠는데, 그러면 `revisiting()` 이 **잰 내내 참**이라 판이 `step` 을 한 프레임에
   **세 번** 돌린다(REVISIT_FF_DEF=3). 되짚기는 사람이 노는 12분 중 **6.9%** 뿐인데
   자는 그 6.9% 안에서만 재고 있었다 — 「무거운 자리」를 세 배로 부풀린 종이다.
   `NECRO_DEEPEST=<층>` 으로 되짚지 않는 판(=보통 걸음)을 잴 수 있다. */
const DEEPEST = process.env.NECRO_DEEPEST != null ? +process.env.NECRO_DEEPEST : FLOOR + 4;
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
/* ★ 페이지 안에서 터진 것을 **삼키지 않는다**(2026-08-17). 예전엔 `.result?.value` 만
   집어 와서, 식이 터지면 조용히 `undefined` 가 됐다 — 그래서 새로 붙인 「머문곳」이
   한동안 **없는 채로 통과**했다(자가 안 재는 것을 잰다고 말하는 그 병). */
const ev = async (e, aw = false) => {
  const r = await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: aw });
  if (r.exceptionDetails) throw new Error("페이지 안에서 터졌다: " +
    (r.exceptionDetails.exception?.description || r.exceptionDetails.text || "?").slice(0, 300));
  return r.result?.value;
};

/* 사람이 지나는 길로 — 마을에서 시작해 던전으로 내려간다 */
await ev(`localStorage.setItem("necro.meta.v1",JSON.stringify({gold:90000,lv:40,deepest:${DEEPEST},runs:6,up:{hp:6,mp:6,dmg:5,army:8},equip:{},bag:[],tree:{bone:3,armor:3,ghoul:3,legion:3,golem:3,rot:2,harvest:2}}))`);
/* ★ 성능 모드는 위에서 **쿼리로** 못을 박았다(`?perf=`). 판이 스스로 켜는 문은
   「최근 90 프레임 중 28ms 넘는 것이 33% 이상」(main.js 2406)인데, 그게 실제로 도움이
   되는지를 재려면 두 팔을 따로 세워야 한다.
   ★★ 안 주면 **빈 서판에서** 판이 알아서 정하게 한다 — 저장된 값을 지운다. 안 지우면
      **지난 판이 켜 둔 것을 물려받아** 재게 된다(실측: ×1 기준선이 dpr 1.35 로 돌았다.
      앞선 ×6 판이 성능 모드를 켜서 localStorage 에 남긴 것이다). 그러면 같은 명령이
      돌린 순서에 따라 다른 답을 낸다. */
if (PERF == null) await ev(`localStorage.removeItem("necro.perf.v1")`);
await S("Page.reload", { ignoreCache: true }); await wait(4500);

/* 한 번 내려가 판을 세운다 — 끝에 **지금 어디인가**를 같이 물어 온다.
   무겁게 만드는 길도 **판이 쓰는 문**으로만 낸다(summon/addCorpse) — 배열을 손으로
   밀어 넣으면 그림(S.piles)과 개수(S.corpses)가 어긋나 없는 결함을 재게 된다.
   ★★ **자리를 손으로 주지 않는다.** 예전엔 `S.nx`·`S.ny` 를 더해 넣었는데 **그런 칸은
      없다**(S 에 nx/ny 가 아예 없다) — 더한 값이 전부 NaN 이 되어 몸 절반이 NaN 자리에
      섰다. NaN 은 비교가 죄다 거짓이라 떼어놓기의 제곱 문을 **모든 쌍이 통과**했고,
      그래서 `step` 이 8.7% 로 1위인 것처럼 보였다 — **자가 제 손으로 만든 병목**이다.
      `summon(kind)` 을 인자 없이 부르면 판이 알아서 제 고리 자리에 세운다(사람이
      보는 진형과 같다). 시체도 마찬가지로 네크로 둘레의 실제 좌표계로 흩는다. */
const 내려가기 = async () => {
  await ev(`window.toDungeon && window.toDungeon()`); await wait(700);
  await ev(`(async()=>{const B=await import("/js/battle.js");B.enterFloor(${FLOOR});return 1;})()`, true);
  await wait(2500);
  if (BODIES) await ev(`(async()=>{const B=await import("/js/battle.js");
    const 종 = ["skel","ghoul","golem"];
    for (let i=(S.minions||[]).length; i<${BODIES}; i++) B.summon(종[i%3]);
    for (let i=0;i<${BODIES} * 4;i++) B.addCorpse((i%11-5)*24, ((i/11|0)%7-3)*20, i%3);
    return 1;})()`, true);
  await wait(1500);
  /* 시체는 **개수(숫자)** 다 — 배열이 아니다(그림은 S.piles). 여기서 .length 를 붙이면
     늘 undefined 라 「시체 0」으로 읽혀 무거운 판을 가벼운 판으로 오인한다. */
  return await ev(`({어디:(window.__MODE||{}).at||"?", 죽음:!!S.dead, 층:S.floor|0,
    몸:(S.minions||[]).length, 적:(S.mobs||[]).length, 시체:S.corpses|0, 그림:(S.piles||[]).length})`);
};

/* ★★ **재기 직전에 「지금 던전인가」를 다시 묻는다** (2026-08-17 12:xx).
   30층은 본인이 죽는 층이라, 판을 세우는 4.7초 사이에 죽어 **이미 마을로 끌려간 채**
   재기 시작하는 판이 있다 — 실측 세 판 중 **둘**이 그랬다(표본 89개가 전부 town).
   고약한 것은 그때도 스냅샷이 **던전처럼 보인다**는 점이다: 죽어도 배열이 곧장 안 비어
   몸17·적16·시체140 이 그대로 적힌다(그 판의 JS초당은 35.5 · 성한 판은 121.5 — ×3.4 로
   좋게 나오는 거짓이다). 「던전%」 자가 뒤에서 버려 주기는 하지만, 그러면 A/B 가 성한
   판을 모으느라 **세 배를 돌고**(hud_ab 의 다시뽑기 상한 MAX 를 넘기면 아예 못 모은다).
   그래서 버리기 전에 **다시 내려간다** — 자는 「걸러내는 것」만이 아니라 「제자리에
   세우는 것」까지가 제 일이다([[probe-must-walk-the-real-path]]).
   ★ 다시 갈 때는 **판을 새로 연다**(Page.reload). 같은 판 안에서 `toDungeon()` 만 세 번
     불러 보니 **세 번 다 같은 자리에서 죽었다** — 다시 뽑는 것이 아니라 같은 판을 다시
     보는 것이었다. `toDungeon()` 이 `closeAll()`+`newRun()` 을 하므로 정산창은 알아서 걷힌다. */
let 판 = null, 헛걸음 = [];
for (let 판째 = 1; 판째 <= 3; 판째++) {
  if (판째 > 1) { await S("Page.reload", { ignoreCache: true }); await wait(4500); }
  const s = await 내려가기();
  if (s.어디 === "dungeon" && !s.죽음) { 판 = s; break; }
  헛걸음.push(`${판째}:${s.어디}${s.죽음 ? "·죽음" : ""}`);
}
if (!판) {
  console.log(JSON.stringify({ 층: FLOOR, 헛걸음 }, null, 1));
  console.log(`FAIL — 세 번 내려갔는데 재기 직전에 던전이 아니었다(${헛걸음.join(" ")})`);
  await raw("Target.closeTarget", { targetId }); bws.close(); process.exit(1);
}
if (헛걸음.length) 판.다시내려감 = 헛걸음.join(" ");

await S("Profiler.enable");
await S("Profiler.setSamplingInterval", { interval: 200 });   /* 200µs — 짧은 함수도 잡힌다 */
/* ★★ **머문 곳을 재는 내내 지켜본다** (2026-08-17 에 이 자에 물린 이빨).
   여태 `판` 은 **재기 전에 한 번** 읽은 것이었다. 그런데 30층은 본인이 죽는 층이라
   재는 8초 사이에 **마을로 끌려가는 판이 섞인다** — 그러면 자는 던전 판(몸17·시체140)을
   적어 놓고 실제로는 **마을 화면**을 잰다. 마을은 step 이 안 도니 숫자가 통째로 좋아져
   (실측 JS초당 125 → 38) 고치지도 않은 것을 「×3 빨라졌다」로 읽게 된다.
   그래서 100ms 마다 지금 화면을 적어 두고, 던전 밖이 섞이면 **그 판을 버린다.**
   ([[probe-must-walk-the-real-path]] 의 뒤집힌 짝 — 길로 들어가는 것만이 아니라
    **잰 내내 그 길에 있었는지**까지 봐야 한다.) */
/* ★★ **어느 화면인지만이 아니라 「어느 속도인지」도 적는다**(2026-08-17). 되짚는 층
   (`S.floor < META.deepest`)에서는 판이 같은 틱을 **세 번** 돌린다 — 화면은 던전 100%
   라 위 자를 멀쩡히 통과하는데, 재고 있는 것은 **세 배로 도는 판**이다. 그러면
   「step 이 1위 · 그 안 44.9% 가 빨리감기 한 줄」 같은 말이 나오는데 그건 고칠 자리가
   아니라 **자가 서 있는 자리**다. 되짚기 몫을 같이 내서 종이에 적히게 한다. */
/* ★★ **프레임도 센다**(2026-08-17 17:xx). 아래 「JS초당ms」는 *1초를 사는 동안* JS 가
   태운 시간이라, 느리게 걸면 rAF 가 덜 불리는 만큼 **일도 덜 하게 되어** 숫자가 거의
   안 움직인다 — 같은 판에서 ×1 57.3 · ×4 80.5 · ×6 86.0 이었다(6배를 걸어 1.5배).
   바닥 57 에 문턱 400 이면 그 자는 **영영 안 문다**([[floor-far-from-threshold]]).
   폰에서 병수님이 겪는 것은 「JS 가 초당 몇 ms」가 아니라 **프레임이 빠지는 것**이므로
   rAF 를 세어 fps 와 「한 프레임에 태운 JS」를 같이 낸다.
   ★ 성능 모드가 **실제로 켜졌는지는 캔버스를 재서** 안다(dpr 2 대 1.35). localStorage 를
     읽으면 안 된다 — 그 칸은 **지난 판이 남긴 값**이라 못을 박은 팔에서도 true 가 나온다
     (실측: 쿼리로 끈 팔인데 저장값 true · dpr 은 2). 그래서 저장값은 참고로만 적는다.
   ★★ **이 아래 ev(...) 안은 템플릿 문자열이다 — 설명은 여기 밖에 적는다.** 안에 backtick
     을 쓰면 문자열이 그 자리에서 끊겨 파일 전체가 SyntaxError 가 된다(오늘 두 번 그랬다). */
await ev(`(() => { const seen = Object.create(null); let ff = 0, n = 0;
  const 훑기 = () => { const at = (window.__MODE || {}).at || "?";
    seen[at] = (seen[at] | 0) + 1;
    n++; if ((S.floor | 0) < ((window.META || {}).deepest | 0)) ff++; };
  훑기(); window.__where = { seen, 시작층: S.floor | 0, get 끝층() { return S.floor | 0; },
    get 되짚기몫() { return n ? ff / n : 0; },
    프레임: 0, 프레임시작: 0,
    프레임재기시작() { this.프레임 = 0; this.프레임시작 = performance.now(); return this; },
    get 잰ms() { return performance.now() - this.프레임시작; },
    타이머: setInterval(훑기, 100), stop() { clearInterval(this.타이머); return this; } };
  (function 프레임세기() { window.__where.프레임++; requestAnimationFrame(프레임세기); })();
  return 1; })()`);
/* 느리게 거는 것은 **판을 다 세운 뒤**다 — 마을→던전 내려가는 동안 걸면 그 대기가
   늘어져 판이 덜 선 채로 재게 된다. */
if (SLOW > 1) { await S("Emulation.setCPUThrottlingRate", { rate: SLOW }); await wait(800); }
/* 프레임 세는 창을 **프로파일 창과 같은 자리에** 맞춘다 — 느리게 건 뒤에 0 으로 되돌린다. */
await ev(`window.__where.프레임재기시작() && 1`);
await S("Profiler.start");
await wait(SEC * 1000);
const { profile } = await S("Profiler.stop");
if (SLOW > 1) await S("Emulation.setCPUThrottlingRate", { rate: 1 });
const 머문곳 = await ev(`(() => { const w = window.__where; if (!w) return null; w.stop();
  const 합 = Object.values(w.seen).reduce((a, b) => a + b, 0) || 1;
  const 던전몫 = +(((w.seen.dungeon | 0) / 합) * 100).toFixed(1);
  return { 화면: w.seen, "던전%": 던전몫, "되짚기%": +(w.되짚기몫 * 100).toFixed(1),
    시작층: w.시작층, 끝층: w.끝층,
    프레임: w.프레임, fps: +(w.프레임 / (w.잰ms / 1000)).toFixed(1),
    dpr: (() => { const c = document.querySelector("canvas");
      return c && c.clientWidth ? +(c.width / c.clientWidth).toFixed(2) : null; })(),
    저장된성능값: localStorage.getItem("necro.perf.v1") }; })()`);

/* 자기시간을 노드마다 모은다. samples 는 노드 id 열, timeDeltas 는 µs 간격이다. */
const byId = new Map(profile.nodes.map(n => [n.id, n]));
const self = new Map();
const 줄 = new Map();          /* 함수키 → (줄번호 → 표본수) */
let total = 0;
for (let i = 0; i < profile.samples.length; i++) {
  const dt = profile.timeDeltas[i] || 0; total += dt;
  const n = byId.get(profile.samples[i]); if (!n) continue;
  const f = n.callFrame;
  const key = `${f.functionName || "(anonymous)"} @ ${(f.url || "").split("/").pop()}:${f.lineNumber + 1}`;
  self.set(key, (self.get(key) || 0) + dt);
}
/* ★ **함수 하나가 770줄이면 「step 이 8.7%」는 답이 아니다.** V8 은 노드마다
   positionTicks(줄별 적중수)를 같이 준다 — 1위 함수 안에서 **어느 줄**이 태우는지
   여기서 나온다. 이게 없어서 sep 루프를 찾는 데 손으로 프로파일을 두 번 떴다. */
for (const n of profile.nodes) {
  if (!n.positionTicks?.length) continue;
  const f = n.callFrame;
  const key = `${f.functionName || "(anonymous)"} @ ${(f.url || "").split("/").pop()}:${f.lineNumber + 1}`;
  const m = 줄.get(key) || new Map(); 줄.set(key, m);
  for (const t of n.positionTicks) m.set(t.line, (m.get(t.line) || 0) + t.ticks);
}
const rows = [...self.entries()].sort((a, b) => b[1] - a[1])
  .map(([이름, us]) => ({ 이름, ms: +(us / 1000).toFixed(1), 비율: +(us / total * 100).toFixed(2) }));
const js = rows.filter(r => !/^\((program|idle|garbage collector|root)\)/.test(r.이름));
const 네이티브 = +(rows.filter(r => /^\((program|idle)\)/.test(r.이름)).reduce((a, r) => a + r.비율, 0)).toFixed(1);

/* 1위 함수 안에서 제일 뜨거운 줄 여덟. 표본수 비율이라 위 ms 와 자릿수가 다르다. */
const 뜨거운줄 = (키) => {
  const m = 줄.get(키); if (!m) return [];
  const 합 = [...m.values()].reduce((a, b) => a + b, 0) || 1;
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([줄번호, t]) => ({ 줄: 줄번호, 몫: +(t / 합 * 100).toFixed(1) }));
};
/* **절대량** — 잰 시간 동안 JS 가 태운 밀리초를 1초당으로 환산한다.
   몫(%)은 이 맥이 빠를수록 작아지지만, 이 값은 판이 실제로 시킨 일의 양이다. */
const 잰초 = total / 1e6 || 1;
const JS초당ms = +(js.reduce((a, r) => a + r.ms, 0) / 잰초).toFixed(1);
/* ★ **한 프레임에 태운 JS.** 위의 초당 값은 rAF 가 덜 불리면 같이 작아지므로 느리게
   걸어도 안 움직인다 — 프레임으로 나누면 「한 번 그릴 때 시킨 일」이 남는다. */
const fps = 머문곳 ? 머문곳.fps : null;
const JS프레임당ms = fps ? +(JS초당ms / fps).toFixed(2) : null;
const out = { 층: FLOOR, 초: SEC, 느리게: SLOW, 판, 머문곳, 네이티브퍼센트: 네이티브, JS초당ms,
  fps, JS프레임당ms,
  "프레임여유%": +(100 - JS초당ms / 10).toFixed(1), JS상위: js.slice(0, 12),
  "1위줄": js[0] ? { 함수: js[0].이름, 줄: 뜨거운줄(js[0].이름) } : null, 콘솔오류: errs };
console.log(JSON.stringify(out, null, 1));
/* 판단 기준 둘.
   ① JS 자기시간 1위가 5% 를 넘으면 그 함수가 폰에서 먼저 무너질 자리다
      (drawGlows 는 8.2% 였고, 구운 뒤 목록에서 사라졌다).
   ② ~~JS초당ms > 400~~ **버렸다(2026-08-17 17:xx) — 움직이지 않는 자였다.**
      같은 판에서 ×1 57.3 · ×4 80.5~91.3 · ×6 77~100 이다. 6배를 걸어도 1.5배밖에
      안 오르는 까닭은 느려지면 **rAF 가 덜 불려 일도 덜 하기** 때문이다(초당 값의 분모가
      벽시계라서 그렇다). 바닥이 60~100 인데 문턱이 400 이면 **영영 안 문다**
      ([[floor-far-from-threshold]] · [[knob-that-does-nothing]]).
      → 대신 **한 프레임에 태운 JS**(JS초당ms ÷ fps)로 묻는다. 이 값은 일을 따라 움직인다
        (×1 0.50 · ×4 2.09 · ×6 3.62~4.70 — 9배). 문턱은 **8ms** — 60fps 한 프레임(16.7ms)의
        절반을 JS 가 먹으면 남는 것으로 그리기·합성을 못 한다. ×6 바닥 4.7 에서 1.7배라
        여유가 400/60=6.7배보다 훨씬 좁다.
      ★ **fps 자체로는 안 묻는다.** fps 는 느리게 건 배수만 따르고(119 → 43.7 → 20) 판이
        무거운지는 거의 안 본다 — ×6 에서 텅 빈 판 21.7 대 꽉 찬 판 19.5 다. 문턱을 걸면
        ×6 에서 늘 빨간 줄이 떠 눈만 무뎌진다. 대신 **적어 두고 사람이 견준다**(A/B). */
const 우두머리 = js[0];
const 넘침 = JS프레임당ms != null && JS프레임당ms > 8;
/* ③ **잰 내내 던전에 있었나.** 95% 아래면 마을 화면이 섞인 판이라 숫자를 믿을 수 없다 —
      좋게 나오든 나쁘게 나오든 **버린다**(좋게 나오는 쪽이 더 위험하다). */
const 샜다 = 머문곳 && 머문곳["던전%"] < 95;
const bad = errs.length || !profile.samples.length || (우두머리 && 우두머리.비율 > 5) || 넘침 || 샜다;
const 잰것 = `JS프레임당 ${JS프레임당ms}ms · ${fps}fps(dpr ${머문곳 ? 머문곳.dpr : "?"}) · 느리게 ×${SLOW}`;
console.log(bad ? `FAIL${넘침 ? ` — ${잰것} (문턱 8ms)` : ""}${우두머리 && 우두머리.비율 > 5 ? ` — 1위 ${우두머리.이름} ${우두머리.비율}%` : ""}${샜다 ? ` — 던전에 ${머문곳["던전%"]}% 만 머물렀다(${JSON.stringify(머문곳.화면)}) · 이 판은 버린다` : ""}`
  : `PASS — ${잰것} · 던전 ${머문곳 ? 머문곳["던전%"] : "?"}% · 되짚기 ${머문곳 ? 머문곳["되짚기%"] : "?"}%`);
await raw("Target.closeTarget", { targetId });
bws.close(); process.exit(bad ? 1 : 0);
