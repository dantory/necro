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
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const SEC = +(process.argv[2] || 6), FLOOR = +(process.argv[3] || 30), BODIES = +(process.argv[4] || 0);
const SLOW = +(process.argv[5] || 1);   /* CPU 를 N 배 느리게 — 1 이면 안 건다 */
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
await ev(`localStorage.setItem("necro.meta.v1",JSON.stringify({gold:90000,lv:40,deepest:${FLOOR + 4},runs:6,up:{hp:6,mp:6,dmg:5,army:8},equip:{},bag:[],tree:{bone:3,armor:3,ghoul:3,legion:3,golem:3,rot:2,harvest:2}}))`);
await S("Page.reload", { ignoreCache: true }); await wait(4500);
await ev(`window.toDungeon && window.toDungeon()`); await wait(700);
await ev(`(async()=>{const B=await import("/js/battle.js");B.enterFloor(${FLOOR});return 1;})()`, true);
await wait(2500);
/* 무겁게 만드는 길도 **판이 쓰는 문**으로만 낸다(summon/addCorpse) — 배열을 손으로
   밀어 넣으면 그림(S.piles)과 개수(S.corpses)가 어긋나 없는 결함을 재게 된다.
   ★★ **자리를 손으로 주지 않는다.** 예전엔 `S.nx`·`S.ny` 를 더해 넣었는데 **그런 칸은
      없다**(S 에 nx/ny 가 아예 없다) — 더한 값이 전부 NaN 이 되어 몸 절반이 NaN 자리에
      섰다. NaN 은 비교가 죄다 거짓이라 떼어놓기의 제곱 문을 **모든 쌍이 통과**했고,
      그래서 `step` 이 8.7% 로 1위인 것처럼 보였다 — **자가 제 손으로 만든 병목**이다.
      `summon(kind)` 을 인자 없이 부르면 판이 알아서 제 고리 자리에 세운다(사람이
      보는 진형과 같다). 시체도 마찬가지로 네크로 둘레의 실제 좌표계로 흩는다. */
if (BODIES) await ev(`(async()=>{const B=await import("/js/battle.js");
  const 종 = ["skel","ghoul","golem"];
  for (let i=(S.minions||[]).length; i<${BODIES}; i++) B.summon(종[i%3]);
  for (let i=0;i<${BODIES} * 4;i++) B.addCorpse((i%11-5)*24, ((i/11|0)%7-3)*20, i%3);
  const 성한몸 = (S.minions||[]).filter(m=>isFinite(m.x)&&isFinite(m.y)).length;
  return { 몸: (S.minions||[]).length, 성한몸, 시체: S.corpses };})()`, true);
await wait(1500);
/* 시체는 **개수(숫자)** 다 — 배열이 아니다(그림은 S.piles). 여기서 .length 를 붙이면
   늘 undefined 라 「시체 0」으로 읽혀 무거운 판을 가벼운 판으로 오인한다. */
const 판 = await ev(`({몸:(S.minions||[]).length, 적:(S.mobs||[]).length, 시체:S.corpses|0, 그림:(S.piles||[]).length})`);

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
await ev(`(() => { const seen = Object.create(null);
  const 훑기 = () => { const at = (window.__MODE || {}).at || "?";
    seen[at] = (seen[at] | 0) + 1; };
  훑기(); window.__where = { seen, 시작층: S.floor | 0, get 끝층() { return S.floor | 0; },
    타이머: setInterval(훑기, 100), stop() { clearInterval(this.타이머); return this; } };
  return 1; })()`);
/* 느리게 거는 것은 **판을 다 세운 뒤**다 — 마을→던전 내려가는 동안 걸면 그 대기가
   늘어져 판이 덜 선 채로 재게 된다. */
if (SLOW > 1) { await S("Emulation.setCPUThrottlingRate", { rate: SLOW }); await wait(800); }
await S("Profiler.start");
await wait(SEC * 1000);
const { profile } = await S("Profiler.stop");
if (SLOW > 1) await S("Emulation.setCPUThrottlingRate", { rate: 1 });
const 머문곳 = await ev(`(() => { const w = window.__where; if (!w) return null; w.stop();
  const 합 = Object.values(w.seen).reduce((a, b) => a + b, 0) || 1;
  const 던전몫 = +(((w.seen.dungeon | 0) / 합) * 100).toFixed(1);
  return { 화면: w.seen, "던전%": 던전몫, 시작층: w.시작층, 끝층: w.끝층 }; })()`);

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
const out = { 층: FLOOR, 초: SEC, 느리게: SLOW, 판, 머문곳, 네이티브퍼센트: 네이티브, JS초당ms,
  "프레임여유%": +(100 - JS초당ms / 10).toFixed(1), JS상위: js.slice(0, 12),
  "1위줄": js[0] ? { 함수: js[0].이름, 줄: 뜨거운줄(js[0].이름) } : null, 콘솔오류: errs };
console.log(JSON.stringify(out, null, 1));
/* 판단 기준 둘.
   ① JS 자기시간 1위가 5% 를 넘으면 그 함수가 폰에서 먼저 무너질 자리다
      (drawGlows 는 8.2% 였고, 구운 뒤 목록에서 사라졌다).
   ② **JS초당ms 가 400 을 넘으면** 1초 중 0.4초를 JS 가 먹는다는 뜻이라, 남는 것으로
      그리기·합성까지 못 한다 — 느리게 걸고 재는 판(SLOW>1)은 이쪽이 진짜 문이다. */
const 우두머리 = js[0];
const 넘침 = JS초당ms > 400;
/* ③ **잰 내내 던전에 있었나.** 95% 아래면 마을 화면이 섞인 판이라 숫자를 믿을 수 없다 —
      좋게 나오든 나쁘게 나오든 **버린다**(좋게 나오는 쪽이 더 위험하다). */
const 샜다 = 머문곳 && 머문곳["던전%"] < 95;
const bad = errs.length || !profile.samples.length || (우두머리 && 우두머리.비율 > 5) || 넘침 || 샜다;
console.log(bad ? `FAIL${넘침 ? ` — JS초당 ${JS초당ms}ms (느리게 ×${SLOW})` : ""}${우두머리 && 우두머리.비율 > 5 ? ` — 1위 ${우두머리.이름} ${우두머리.비율}%` : ""}${샜다 ? ` — 던전에 ${머문곳["던전%"]}% 만 머물렀다(${JSON.stringify(머문곳.화면)}) · 이 판은 버린다` : ""}`
  : `PASS — JS초당 ${JS초당ms}ms (느리게 ×${SLOW}) · 던전 ${머문곳 ? 머문곳["던전%"] : "?"}%`);
await raw("Target.closeTarget", { targetId });
bws.close(); process.exit(bad ? 1 : 0);
