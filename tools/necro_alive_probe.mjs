/* **던전에 선 네크로멘서가 살아 있는가.**
     node tools/necro_alive_probe.mjs [초]

   병수님 2026-08-15: "내 캐릭터는 중앙으로 위치 유지하는건 좋은데, 아예 움직이지
   않는건 좀 이상한듯". 실제로 `moving:0, walked:0` 으로 넘겨 **서 있는 그림 한 장**에
   박혀 있었고, 적이 없으면 방향까지 남쪽 고정이었다. 마을에는 같은 처방(숨·시선)을
   이미 넣어 두고 던전에 안 옮긴 것이다([[carry-fixes-forward]]).

   `window.__ANIM`(drawOne 의 검수 훅)으로 **그려진 상태**를 본다 — 코드에 값이 있는지가
   아니라 화면에 그렇게 그려졌는지를 봐야 한다. 셋을 본다:
     ① 숨(bob)이 눌렸다 펴지는가      — 두 값 다 나와야 한다
     ② 좌우 무게 이동(sway)이 도는가  — 폭이 1px 는 넘어야 눈에 든다
     ③ 방향(dir)이 도는가             — 적이 없을 때 둘러보는가
   ★ 걷기(walk)가 돌면 **실패**다 — 다리가 안 도는 채로 미끄러지는 게 「떠다닌다」였다.
     여기서는 몸만 움직이고 그림자는 땅에 있어야 하므로 state 는 idle 이어야 한다. */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const SEC = +(process.argv[2] || 20);
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
const ev2 = async (e, aw = false) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: aw })).result?.value;
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4200));
await ev2(`window.toDungeon && window.toDungeon()`);
await new Promise(r => setTimeout(r, 1200));
/* **적을 치운 채로** 본다 — 병수님이 「안 움직인다」고 본 자리가 바로 뒷정리·이동 구간이다.
   판이 계속 적을 부르므로 재는 동안 계속 비운다. */
if (process.env.ALIVE_OLD === "1") await ev2(`globalThis.__NECRO_STILL = 1;`);   // 캘리브레이션
await ev2(`window.__ANIM_MOBS = 1; window.__ANIM = []; window.__ALIVE_SWEEP = setInterval(() => {
   if (window.S) { S.mobs.length = 0; }
 }, 30);`);   /* ★ 30ms — 200ms 로 쓸었더니 그 사이 선 적을 보느라 방향이 돌아서,
                   옛 상태에서도 ③ 이 통과했다(자가 눈을 반쯤 감고 있었다). */
await new Promise(r => setTimeout(r, SEC * 1000));
const out = await ev2(`(() => {
  clearInterval(window.__ALIVE_SWEEP);
  const rows = (window.__ANIM || []).filter(r => r.base === "char/necro");
  window.__ANIM = null;
  const bob = [...new Set(rows.map(r => r.bob))];
  const sway = rows.map(r => r.sway);
  const dir = [...new Set(rows.map(r => r.dir))];
  /* ★ 「둘러보는가」는 **적이 0 이던 프레임**만 센다 */
  const quiet = rows.filter(r => !r.mobs);
  const dirQuiet = [...new Set(quiet.map(r => r.dir))];
  const st = [...new Set(rows.map(r => r.state))];
  return { 프레임: rows.length, 숨값: bob, 흔들림폭: sway.length ? +(Math.max(...sway) - Math.min(...sway)).toFixed(2) : 0,
           방향: dir, 빈판프레임: quiet.length, 빈판방향: dirQuiet, 자세: st };
})()`);

const fails = [];
if (!out || !out.프레임) fails.push("네크로가 한 프레임도 안 그려졌다 — 자를 먼저 본다");
else {
  if (out.숨값.length < 2) fails.push(`① 숨이 안 쉰다 (bob 값이 ${JSON.stringify(out.숨값)} 하나뿐)`);
  if (out.흔들림폭 < 1) fails.push(`② 좌우 흔들림이 ${out.흔들림폭}px — 1px 아래는 안 보인다`);
  if (out.빈판프레임 < 30) fails.push(`③ 적 없는 프레임이 ${out.빈판프레임}개뿐 — 이 자로는 못 잰다`);
  else if (out.빈판방향.length < 2) fails.push(`③ 적이 없을 때 방향이 ${JSON.stringify(out.빈판방향)} 에 박혀 있다`);
  if (out.자세.includes("walk")) fails.push("★ 걷기 프레임이 돈다 — 제자리에서 걸으면 떠다니는 것으로 읽힌다");
}
console.log(JSON.stringify({ ...out, 콘솔오류: errs, 실패: fails,
  판정: fails.length ? `미달 ${fails.length}건` : "통과" }, null, 1));
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(fails.length ? 1 : 0);
