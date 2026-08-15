/* 떼어놓기(sep)의 쌍 루프가 **싸졌는지, 그리고 같은 쌍을 고르는지**를 잰다.
     node tools/sep_probe.mjs [층] [몸수]

   왜 — CPU 프로파일에서 `step` 자기시간이 5.4% 로 1위였다. 그 안에서 제일 큰 덩어리가
   쌍마다 도는 O(n²) × 3패스다(몸 마흔이면 한 프레임 2,700쌍). 거기서 쌍마다
   ① `touchK()` 를 부르고 ② `Math.hypot` 을 불렀다 — 둘 다 **쌍과 무관하거나
   대부분 헛일**이다(쌍의 대부분은 멀리 떨어져 있다).

   고친 뒤 물어야 할 것이 둘이고, 이 자는 둘 다 답한다:
     ① 정말 싼가            → 옛 길·새 길을 같은 몸 배열로 각각 200번 돌려 시간을 댄다
     ② **같은 쌍을 고르나**  → 겹쳤다고 판정한 쌍 수가 **정확히 같아야** 한다.
        (제곱 문을 1.0001 배로 넉넉히 열어 둔 이유가 이것이다 — 아슬아슬한 쌍은
         걸러내지 않고 아래 원래 판정으로 넘긴다.) 하나라도 다르면 FAIL. */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
/* ★ 몸수를 억지로 채우지 않는 것이 기본이다(0). 손으로 소환해 넣으면 **한 점에 포개진
   덩이**가 되어 「겹친 쌍 100%」인 판이 된다 — 제곱 문이 아무것도 못 거르는 최악의 판이라
   이득이 실제보다 작게 나온다. 사람이 보는 판은 제 진으로 퍼진 쪽이고, 거기서는 쌍의
   8% 만 겹친다(중앙값 d/min = 3.35). 굳이 무겁게 재고 싶을 때만 인자를 준다. */
const FLOOR = +(process.argv[2] || 30), BODIES = +(process.argv[3] || 0);
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

await ev(`localStorage.setItem("necro.meta.v1",JSON.stringify({gold:90000,lv:40,deepest:${FLOOR + 4},runs:6,up:{hp:6,mp:6,dmg:5,army:8},equip:{},bag:[],tree:{bone:3,armor:3,ghoul:3,legion:3,golem:3,rot:2,harvest:2}}))`);
await S("Page.reload", { ignoreCache: true }); await wait(4500);
await ev(`window.toDungeon && window.toDungeon()`); await wait(700);
await ev(`(async()=>{const B=await import("/js/battle.js");B.enterFloor(${FLOOR});return 1;})()`, true);
await wait(2500);
if (BODIES) await ev(`(async()=>{const B=await import("/js/battle.js"); const 종=["skel","ghoul","golem"];
  for (let i=(S.minions||[]).length; i<${BODIES}; i++)
    B.summon(종[i%3], { x: S.nx + (i%7-3)*22, y: S.ny + ((i/7|0)%5-2)*18 });
  return (S.minions||[]).length;})()`, true);
await wait(4000);   /* 판이 제 진(ring)으로 자리를 잡을 때까지 */

/* 살아 있는 판의 몸을 그대로 떠서(움직이지 않는 사본) 두 길을 같은 입력으로 돌린다. */
const out = await ev(`(async () => {
  const B = await import("/js/battle.js");
  const src = S.minions.concat(S.mobs).map(e => ({ x: e.x, y: e.y, r: e.r }));
  const sq = 0.7;                       // SQUASH_VIEW 대역 — 값 자체는 두 길에 똑같이 들어간다
  const N = src.length;
  const 옛길 = () => { let hit = 0;
    for (let p = 0; p < 3; p++) for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const a = src[i], b = src[j];
      const dx = b.x - a.x, dy = (b.y - a.y) * sq;
      const d = Math.hypot(dx, dy);
      const min = (a.r + b.r) * B.touchK();
      if (d >= min) continue; hit++;
    } return hit; };
  const 새길 = () => { let hit = 0; const tk = B.touchK();
    for (let p = 0; p < 3; p++) for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const a = src[i], b = src[j];
      const dx = b.x - a.x, dy = (b.y - a.y) * sq;
      const min = (a.r + b.r) * tk;
      const dsq = dx * dx + dy * dy;
      if (dsq >= min * min * 1.0001) continue;
      const d = Math.hypot(dx, dy);
      if (d >= min) continue; hit++;
    } return hit; };
  const bench = (fn) => { fn(); fn();                     // 데우기
    const t0 = performance.now(); for (let n = 0; n < 200; n++) fn();
    return +(performance.now() - t0).toFixed(1); };
  const 쌍 = N * (N - 1) / 2 * 3;
  return { 몸: N, 쌍, 겹친쌍_옛: 옛길(), 겹친쌍_새: 새길(),
           겹친비율: +(옛길() / 쌍 * 100).toFixed(1),   /* 제곱 문이 거를 몫이 여기서 보인다 */
           옛ms: bench(옛길), 새ms: bench(새길) };
})()`, true);
out.배수 = +(out.옛ms / Math.max(0.01, out.새ms)).toFixed(2);
out.같은쌍 = out.겹친쌍_옛 === out.겹친쌍_새;
out.콘솔오류 = errs;
console.log(JSON.stringify(out, null, 1));
const bad = errs.length || !out.같은쌍 || out.배수 < 1.2;
console.log(bad ? "FAIL" : "PASS");
await raw("Target.closeTarget", { targetId });
bws.close(); process.exit(bad ? 1 : 0);
