/* **마을에서 마을의 말만 하는가** — 판(던전)의 값이 마을 화면에 남아 있는지 잰다.
     node tools/townwords_probe.mjs

   병수님 2026-08-13: "「시체 3」은 판의 자원인데 마을에도 있고, 던전 로그(「1층 진입」)도
   마을에 남아 있다. 마을에서는 마을의 말만 보일 것."

   ★ **사람이 지나는 길로 잰다**(memory/probe-must-walk-the-real-path).
     ① 갓 켠 마을 — newRun() 이 먼저 돌아 corpses:3 을 넣어 둔 그 자리
     ② 던전에 들어가 한동안 굴린 뒤 **나가기 단추로** 마을로 — 로그가 판의 줄로 가득 찬 상태
     둘 다 봐야 한다. ①만 보면 로그 오염을 놓치고, ②만 보면 첫 화면을 놓친다.

   가름: 마을의 게이지 칸(#gCorpse #gArmy)과 기록(#log)에 **판의 낱말**이 없어야 한다. */
const CDP = "http://127.0.0.1:9333";
const PAGE = process.argv[2] || "http://127.0.0.1:8774/index.html";
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
const ev = async (e) => JSON.parse((await S("Runtime.evaluate", { returnByValue: true, expression: e })).result.value);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 2, mobile: true });
await S("Page.navigate", { url: PAGE });
await wait(5200);

let bad = 0;
const say = (ok, s) => { if (!ok) bad++; console.log(`${ok ? "  ok" : "FAIL"}  ${s}`); };

/* **판의 낱말** — 던전에서만 뜻이 서는 말들. 마을 화면에 하나라도 있으면 실패다.
   「군세 0/6」처럼 판의 마릿수를 세는 꼴만 잡고, 「군세 최대 6」 같은 채비 값은 통과시킨다. */
const RUN_WORDS = [
  [/시체\s*\d/, "시체 개수"],
  [/군세\s*\d+\s*\//, "판의 군세 마릿수"],
  [/\d+층\s*진입/, "층 진입 기록"],
  [/남은\s*적/, "남은 적"],
  [/소환\b/, "소환 기록"],
  [/쓰러뜨림|처치/, "처치 기록"],
];
const scan = (o, when) => {
  const hay = [o.시체칸, o.군세칸, o.기록].join(" ⟂ ");
  const hit = RUN_WORDS.filter(([re]) => re.test(hay)).map(([, n]) => n);
  say(hit.length === 0, `${when} — 판의 낱말 없음${hit.length ? " → " + hit.join(", ") : ""}`);
  console.log(`        칸「${o.시체칸}」「${o.군세칸}」 기록「${o.기록}」`);
};
const read = () => ev(`JSON.stringify({
  어디: window.__MODE.at,
  시체칸: (document.getElementById("gCorpse")||{}).textContent||"",
  군세칸: (document.getElementById("gArmy")||{}).textContent||"",
  기록: [...document.querySelectorAll("#log > *")].map(e=>e.textContent).join(" | "),
  로그수: window.S.log.length })`);

/* ① 갓 켠 마을 */
const a = await read();
say(a.어디 === "town", `갓 켜면 마을이다 (at=${a.어디})`);
scan(a, "갓 켠 마을");

/* ② 던전을 한동안 굴린 뒤 나가기로 돌아온 마을 */
await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
await wait(600);
await S("Runtime.evaluate", { expression: "window.S.speed = 8" });
await wait(9000);
await S("Runtime.evaluate", { expression: "window.S.speed = 1" });
const dg = await read();
say(dg.어디 === "dungeon" && /시체\s*\d/.test(dg.시체칸), `던전에서는 시체 칸이 산다 「${dg.시체칸}」`);
say(dg.로그수 > 0, `던전 기록이 쌓였다 (${dg.로그수}줄)`);

const g = await ev(`(()=>{const e=document.getElementById("hLeave"); if(!e) return JSON.stringify({없음:1});
  const b=e.getBoundingClientRect(); return JSON.stringify({cx:b.left+b.width/2, cy:b.top+b.height/2});})()`);
await S("Input.dispatchMouseEvent", { type: "mousePressed",  x: g.cx, y: g.cy, button: "left", clickCount: 1 });
await S("Input.dispatchMouseEvent", { type: "mouseReleased", x: g.cx, y: g.cy, button: "left", clickCount: 1 });
await wait(900);
await S("Runtime.evaluate", { expression: `document.querySelectorAll("#winEnd .btn").forEach(b=>b.click())` });
await wait(600);
const b = await read();
say(b.어디 === "town", `나가기로 마을에 돌아왔다 (at=${b.어디})`);
scan(b, "판을 굴리고 돌아온 마을");

say(errs.length === 0, `예외 없음${errs.length ? " → " + errs[0] : ""}`);
await raw("Target.closeTarget", { targetId });
console.log(bad ? `\n${bad}개 실패` : "\n모두 통과");
process.exit(bad ? 1 : 0);
