/* **함수가 태운 시간**을 잰다 (2026-08-15 「그리고 렉걸림」의 교훈).
     node tools/cpu_profile.mjs [초] [층] [몸수]

   왜 이 자가 필요한가 — 그날 처음 잰 것은 rAF 간격이었고, 헤드리스에서 그 간격은
   vsync·합성과 무관해서 **병수님 화면의 프레임이 아니다.** 「긴 프레임 0%」가
   거짓 통과였다. 진짜 답은 CPU 프로파일에서 나왔다(drawGlows 자기시간 8.2%).
   그런데 그 프로파일은 **손으로 한 번 뜬 것**이라 다시 못 잰다 — 그래서 자로 굳힌다.

   이 맥은 89.6% 가 네이티브라 JS 가 병목이 아니다. 그러니 fps 로 판단하지 말고
   **JS 자기시간 상위 목록**을 본다 — 폰에서 제일 먼저 무너지는 자리가 거기다.
   판은 병수님 화면 크기(414×860 · dpr2)로 세우고, 몸을 불려 무겁게 만든다. */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const SEC = +(process.argv[2] || 6), FLOOR = +(process.argv[3] || 30), BODIES = +(process.argv[4] || 0);
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
await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 2, mobile: true });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e, aw = false) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: aw })).result?.value;

/* 사람이 지나는 길로 — 마을에서 시작해 던전으로 내려간다 */
await ev(`localStorage.setItem("necro.meta.v1",JSON.stringify({gold:90000,lv:40,deepest:${FLOOR + 4},runs:6,up:{hp:6,mp:6,dmg:5,army:8},equip:{},bag:[],tree:{bone:3,armor:3,ghoul:3,legion:3,golem:3,rot:2,harvest:2}}))`);
await S("Page.reload", { ignoreCache: true }); await wait(4500);
await ev(`window.toDungeon && window.toDungeon()`); await wait(700);
await ev(`(async()=>{const B=await import("/js/battle.js");B.enterFloor(${FLOOR});return 1;})()`, true);
await wait(2500);
/* 무겁게 만드는 길도 **판이 쓰는 문**으로만 낸다(summon/addCorpse) — 배열을 손으로
   밀어 넣으면 그림(S.piles)과 개수(S.corpses)가 어긋나 없는 결함을 재게 된다. */
if (BODIES) await ev(`(async()=>{const B=await import("/js/battle.js");
  const 종 = ["skel","ghoul","golem"];
  for (let i=(S.minions||[]).length; i<${BODIES}; i++)
    B.summon(종[i%3], { x: S.nx + (i%7-3)*22, y: S.ny + ((i/7|0)%5-2)*18 });
  for (let i=0;i<${BODIES} * 4;i++) B.addCorpse(S.nx + (i%11-5)*24, S.ny + ((i/11|0)%7-3)*20, i%3);
  return { 몸: (S.minions||[]).length, 시체: S.corpses };})()`, true);
await wait(1500);
/* 시체는 **개수(숫자)** 다 — 배열이 아니다(그림은 S.piles). 여기서 .length 를 붙이면
   늘 undefined 라 「시체 0」으로 읽혀 무거운 판을 가벼운 판으로 오인한다. */
const 판 = await ev(`({몸:(S.minions||[]).length, 적:(S.mobs||[]).length, 시체:S.corpses|0, 그림:(S.piles||[]).length})`);

await S("Profiler.enable");
await S("Profiler.setSamplingInterval", { interval: 200 });   /* 200µs — 짧은 함수도 잡힌다 */
await S("Profiler.start");
await wait(SEC * 1000);
const { profile } = await S("Profiler.stop");

/* 자기시간을 노드마다 모은다. samples 는 노드 id 열, timeDeltas 는 µs 간격이다. */
const byId = new Map(profile.nodes.map(n => [n.id, n]));
const self = new Map();
let total = 0;
for (let i = 0; i < profile.samples.length; i++) {
  const dt = profile.timeDeltas[i] || 0; total += dt;
  const n = byId.get(profile.samples[i]); if (!n) continue;
  const f = n.callFrame;
  const key = `${f.functionName || "(anonymous)"} @ ${(f.url || "").split("/").pop()}:${f.lineNumber + 1}`;
  self.set(key, (self.get(key) || 0) + dt);
}
const rows = [...self.entries()].sort((a, b) => b[1] - a[1])
  .map(([이름, us]) => ({ 이름, ms: +(us / 1000).toFixed(1), 비율: +(us / total * 100).toFixed(2) }));
const js = rows.filter(r => !/^\((program|idle|garbage collector|root)\)/.test(r.이름));
const 네이티브 = +(rows.filter(r => /^\((program|idle)\)/.test(r.이름)).reduce((a, r) => a + r.비율, 0)).toFixed(1);

const out = { 층: FLOOR, 초: SEC, 판, 네이티브퍼센트: 네이티브, JS상위: js.slice(0, 12), 콘솔오류: errs };
console.log(JSON.stringify(out, null, 1));
/* 판단 기준: JS 자기시간 1위가 5% 를 넘으면 그 함수가 폰에서 먼저 무너질 자리다.
   (drawGlows 는 8.2% 였고, 구운 뒤 목록에서 사라졌다.) */
const 우두머리 = js[0];
const bad = errs.length || !profile.samples.length || (우두머리 && 우두머리.비율 > 5);
console.log(bad ? `FAIL${우두머리 ? ` — 1위 ${우두머리.이름} ${우두머리.비율}%` : ""}` : "PASS");
await raw("Target.closeTarget", { targetId });
bws.close(); process.exit(bad ? 1 : 0);
