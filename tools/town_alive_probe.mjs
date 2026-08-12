/* **마을의 네크로멘서가 살아 있는가** — 서 있는 동안 숨을 쉬고 둘러보는지 잰다.
     node tools/town_alive_probe.mjs

   병수님 2026-08-13(ROADMAP): "네크로멘서가 마을에서 완전히 멎어 있다 — 방향도
   정면 고정, 숨도 없다." 마을은 켜자마자 보는 첫 화면인데 거기 서 있는 것이
   **한 프레임도 안 바뀌면** 배경 그림과 다를 바가 없다.

   ★ **사람이 지나는 길로 잰다**(memory/probe-must-walk-the-real-path) — 갓 켠 마을에
     그냥 서서 한 바퀴(≈15초)를 지켜본다. 아무것도 안 누르고, 시간도 안 당긴다:
     병수님이 마을을 켜 놓고 보는 그 상태 그대로다.

   가름(그린 상태를 `window.__ANIM` 으로 받아 본다 — 그리는 쪽이 직접 적는 값이다):
     ① 마을의 네크로멘서가 **매 프레임 그려진다**(항목이 쌓인다)
     ② 바라보는 쪽이 **셋 이상**으로 바뀐다 — 정면에 박혀 있지 않다
     ③ 숨(bob)이 **0 과 1 을 오간다** — 눌렸다 펴진다
     ④ 그 사이 서 있는 상태(idle)가 유지된다 — 걷거나 휘두르는 것으로 새면 안 된다 */
const CDP = "http://127.0.0.1:9333";
const PAGE = process.argv[2] || "http://127.0.0.1:8774/index.html";
const WATCH = Number(process.argv[3] || 17000);      // 지켜보는 시간(ms) — 한 바퀴보다 길게
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const ev2 = async (e) => JSON.parse((await S("Runtime.evaluate", { returnByValue: true, expression: e })).result.value);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 2, mobile: true });
await S("Page.navigate", { url: PAGE });
await wait(5200);

let bad = 0;
const say = (ok, s) => { if (!ok) bad++; console.log(`${ok ? "  ok" : "FAIL"}  ${s}`); };

const at = await ev2(`JSON.stringify(window.__MODE.at)`);
say(at === "town", `갓 켜면 마을이다 (at=${at})`);

/* __ANIM 은 매 프레임 쌓이므로 **켜 두고 조금씩 걷어 온다** — 17초치를 한 번에
   끌어오면 수천 개가 한 덩어리로 온다(그럴 이유가 없다). 걷어 오면서 비운다. */
await S("Runtime.evaluate", { expression: "window.__ANIM = []" });
const dirs = new Map(), bobs = new Map(), states = new Map();
let frames = 0;
const t0 = Date.now();
while (Date.now() - t0 < WATCH) {
  await wait(400);
  const rows = await ev2(`(()=>{const a=window.__ANIM||[]; window.__ANIM=[];
    return JSON.stringify(a.filter(r=>r.base==="char/necro"));})()`);
  for (const r of rows) {
    frames++;
    dirs.set(r.dir, (dirs.get(r.dir) || 0) + 1);
    bobs.set(String(r.bob ?? "없음"), (bobs.get(String(r.bob ?? "없음")) || 0) + 1);
    states.set(r.state, (states.get(r.state) || 0) + 1);
  }
}
const fmt = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}×${v}`).join(" · ") || "(없음)";

say(frames > 100, `마을의 네크로멘서가 그려진다 (${frames}프레임 / ${(WATCH / 1000).toFixed(0)}초)`);
say(dirs.size >= 3, `바라보는 쪽이 바뀐다 (${dirs.size}가지) — ${fmt(dirs)}`);
say(bobs.has("0") && bobs.has("1"), `숨이 눌렸다 펴진다 — ${fmt(bobs)}`);
say(states.size === 1 && states.has("idle"), `서 있는 상태를 지킨다 — ${fmt(states)}`);
say(errs.length === 0, `콘솔 오류 없음${errs.length ? " → " + errs[0] : ""}`);

await raw("Target.closeTarget", { targetId });
console.log(bad ? `\n실패 ${bad}` : "\n전부 통과");
process.exit(bad ? 1 : 0);
