/* ══ V-119 자 ══ **「그동안 N 자리를 비웠다」가 참인가.**
   돌아온 사람이 맨 처음 보는 줄이다. 판이 적는 시간과 **실제로 비운 시간**을 견준다.
   실제 길로 걷는다 — lastSeen 을 뒤로 밀고 새로 켠다([[probe-must-walk-the-real-path]]).
   문: `node tools/v119_away.mjs old` — `__AWAYOLD` 로 고치기 «전» 을 되돌려
   자가 정말 우는지 먼저 보정한다. */
import fs from "node:fs";
const OLD = process.argv[2] === "old";
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;

/* 비운 시간 — 상한(8시간) 아래 하나 · 갓 넘긴 것 하나 · 하룻밤 · 사흘 */
const CASES = [
  { h: 0.75, say: "45분" },
  { h: 9,    say: "9시간" },
  { h: 31,   say: "1일 7시간" },
  { h: 77,   say: "3일 5시간" },
];
const seed = (h) => `(()=>{const C=globalThis.__C,M=C.META;
  M.lv=46;M.gold=1823400;M.deepest=34;M.best=34;M.corpses=0;M.relics=7;M.rebirths=2;
  M.up={hp:12,mp:9,dmg:14,army:6};
  C.saveMeta();
  const key="necro.meta.v1", o=JSON.parse(localStorage.getItem(key));
  o.lastSeen=Date.now()-${h}*3600e3; localStorage.setItem(key,JSON.stringify(o));
  return o.lastSeen})()`;

await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
const rows = [];
for (const c of CASES) {
  await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
  await S("Page.reload", { ignoreCache: true }); await wait(2400);
  await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
  await ev(seed(c.h));
  if (OLD) await ev(`(()=>{globalThis.__AWAYOLD=1;return 1})()`);
  /* 옛 결은 부팅 그림에 이미 박히므로, 문을 켠 뒤 **다시 그려** 견준다. */
  await S("Page.reload", { ignoreCache: true }); await wait(2600);
  /* ★ **한 번만 부르면 «닫힌다».** `__openWin` 은 이미 열린 창을 다시 부르면 토글로
     닫아 버려, 부팅 때 그린 «지금 결» 글월이 그대로 남는다 — 그러면 문을 열었는데도
     자가 「참 4/4」를 내고 만다([[silent-zero-is-not-an-observation]]).
     닫고(첫 번째) 다시 여는(두 번째) 두 번을 부른다. */
  if (OLD) await ev(`(()=>{globalThis.__AWAYOLD=1;window.__openWin("offline");window.__openWin("offline");return 1})()`);
  /* 문이 정말 걸렸는지 **여기서** 본다 — 안 걸린 채 「참」이 나오면 보정이 아니다. */
  if (OLD && !(await ev(`document.getElementById('winOffline').classList.contains('on')`)))
    throw new Error("문을 열었는데 창이 안 섰다 — 보정 실패");
  await wait(300);
  const txt = await ev(`(document.getElementById('offBody')||{}).innerText||''`);
  const line = (txt.split("\n").find(l => /자리를 비웠다/.test(l)) || "(줄 없음)").trim();
  const cap = /쌓인다/.test(txt);
  const said = (line.match(/그동안\s+(.+?)\s+자리를/) || [])[1] || "";
  rows.push({ ...c, said, ok: said === c.say, cap, line });
  console.log(`  ${String(c.h).padStart(5)}시간 비움 → 「${line}」  ${said === c.say ? "참" : "★거짓 (참값 " + c.say + ")"}${cap ? " · 상한줄 있음" : ""}`);
}
const bad = rows.filter(r => !r.ok).length;
console.log(`\n${OLD ? "옛 결" : "지금"} — 틀린 줄 ${bad}/${rows.length}`);
fs.writeFileSync("tmp/v119_away" + (OLD ? "_old" : "") + ".json", JSON.stringify(rows, null, 1));
await S("Target.closeTarget", { targetId });
process.exit(bad ? 1 : 0);
