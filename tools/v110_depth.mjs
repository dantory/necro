/* ══ V-110 자 ══ 정산의 「내려간 깊이」가 **간 적 없는 길을 갔다고** 말하는가.
   건너뛰기가 열린 뒤로 판은 10층·23층에서 시작한다. 거기서 한 층도 못 내려가고 끝나면
   이 칸이 `10→10층` 이라고 적었다 — 화살표는 「여기서 저기로」인데 간 데가 없다.

   ★ **값은 화면이 아니라 «심은 LASTRUN»에서 읽는다** — 자가 from·floor 를 손수 넣고,
     화면에 적힌 층수를 되읽어 **제 손으로** 참·거짓을 가른다. 화면 글자에서 시작 층을
     되읽으면 자가 제 고침을 되읽는다([[silent-zero-is-not-an-observation]]).
   ★ **다섯 사람을 잰다.** ① 1층에서 시작해 1층에서 끝남 ② 1층 → 14층(가장 흔한 판)
     ③ **10층에서 시작해 10층에서 끝남**(고치려는 것) ④ 10층 → 23층(화살표가 옳게 서야
     하는 자리 · 과잉 수정 막이) ⑤ 65층에서 시작해 65층에서 끝남(깊은 건너뛰기).
   ★ 폭 셋을 다 본다 — 딱지가 길어졌으니 **칸이 넘치지 않는지**가 곧 판정이다.
   ★ 전리품이 있으면 이 넉 장은 안 그려진다 — 그래서 `loot` 는 빈 채로 심는다.

   쓰기:  node tools/v110_depth.mjs [old]
          old → window.__DEPTHOLD 로 옛 결을 되돌려 자가 정말 우는지 보정한다. */
import fs from "node:fs";
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const OLD = process.argv.includes("old");
const SIZES = [[1512, 863], [1366, 700], [1280, 620]];
/* {이름, from, floor} — from 은 판이 시작한 층, floor 는 끝난 층 */
const 사람 = [
  { n: "1층에서 시작 · 1층에서 끝", from: 1, floor: 1 },
  { n: "1층에서 시작 · 14층까지  ", from: 1, floor: 14 },
  { n: "10층에서 시작 · 10층에서 끝", from: 10, floor: 10 },
  { n: "10층에서 시작 · 23층까지 ", from: 10, floor: 23 },
  { n: "65층에서 시작 · 65층에서 끝", from: 65, floor: 65 },
];

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

/* 넉 장을 통째로 읽어 온다 — 값·딱지·넘침을 칸마다. */
const 읽기 = `(()=>{const out=[];
  document.querySelectorAll("#winEnd .cell.run").forEach(c=>{
    const v=c.querySelector(".rVal"), l=c.querySelector(".rLbl");
    const t=n=>((n&&n.textContent)||"").replace(/\\s+/g," ").trim();
    out.push({ val:t(v), lbl:t(l),
      넘침: Math.max(0, c.scrollWidth-c.clientWidth) + Math.max(0, (v?v.scrollWidth-v.clientWidth:0)) });
  });
  const w=document.getElementById("winEnd");
  const f=w?w.querySelector(".frame"):null;
  return { 칸: out, 창넘침: f?Math.max(0,f.scrollHeight-f.clientHeight):-1 };})()`;

const rows = [];
for (const [W, H] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await S("Page.reload", { ignoreCache: true }); await wait(1700);
  await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
  await S("Page.reload", { ignoreCache: true }); await wait(2400);
  if (OLD) await ev(`window.__DEPTHOLD=1`);
  for (const p of 사람) {
    /* 심는다 — 전리품은 비워야 넉 장이 그려진다(loot 가 있으면 좌판이 그 자리를 쓴다). */
    await ev(`(()=>{const L=window.__LASTRUN; L.has=true; L.loot=[]; L.gold=0; L.xp=12; L.killed=2;
      L.leveled=false; L.from=${p.from}; L.floor=${p.floor}; L.summoned=5; L.used=5; L.secs=8;
      L.dead=true; return 1})()`);
    await ev(`window.__openWin("end")`); await wait(420);
    const r = await ev(읽기);
    await ev(`window.__closeAll&&window.__closeAll()`); await wait(100);
    const 깊이칸 = (r.칸 || [])[0] || { val: "", lbl: "", 넘침: 0 };
    /* ① 화살표가 **간 적 없는 길**을 그리는가 — `N→N` 은 언제나 거짓이다.
       ② 화살표가 있으면 두 수가 **심은 값 그대로**여야 한다(참값 막이).
       ③ 화살표가 없으면 적힌 층은 **끝난 층**이어야 한다.
       ④ 딱지가 비어 있으면 안 된다 — 자리를 비우는 것은 고침이 아니다(V-108). */
    const m = /(\d+)\s*→\s*(\d+)\s*층/.exec(깊이칸.val);
    const 홑 = /^(\d+)\s*층$/.exec(깊이칸.val);
    let 거짓 = 0, 참값틀림 = 0, 딱지없음 = 0;
    const 정말내려감 = p.floor > Math.max(1, p.from);
    if (m) {
      if (m[1] === m[2]) 거짓++;                                   /* 10→10층 */
      if (+m[1] !== p.from || +m[2] !== p.floor) 참값틀림++;
      if (!정말내려감) 거짓++;                                      /* 안 내려갔는데 화살표 */
    } else if (홑) {
      if (+홑[1] !== p.floor) 참값틀림++;
    } else 참값틀림++;                                              /* 층수를 아예 안 적었다 */
    /* 딱지는 **한 일을 말해야 한다** — 안 내려갔으면 그렇게 적혀 있어야 한다. */
    if (!깊이칸.lbl) 딱지없음++;
    else if (!정말내려감 && !/못 내려|안 내려/.test(깊이칸.lbl)) 딱지없음++;
    else if (정말내려감 && !/내려간 깊이/.test(깊이칸.lbl)) 딱지없음++;
    rows.push({ W, 이름: p.n, val: 깊이칸.val, lbl: 깊이칸.lbl, 넘침: 깊이칸.넘침,
                창넘침: r.창넘침, 칸수: (r.칸 || []).length, 거짓, 참값틀림, 딱지없음 });
  }
}
await raw("Target.closeTarget", { targetId }); bws.close();

console.log(OLD ? "── 옛 결(__DEPTHOLD) ──" : "── 지금 결 ──");
console.log(`| 심은 판 | 폭 | 적힌 값 | 딱지 | 거짓 | 참값틀림 | 딱지없음 | 넘침 |`);
console.log(`|---|---|---|---|---|---|---|---|`);
for (const r of rows) console.log(`| ${r.이름} | ${r.W} | ${r.val} | ${r.lbl} | ${r.거짓} | ${r.참값틀림} | ${r.딱지없음} | ${r.넘침}px |`);
const 합 = k => rows.reduce((s, r) => s + (r[k] | 0), 0);
const 칸모자람 = rows.filter(r => r.칸수 !== 4).length;
/* 창이 세로로 넘치는 것은 **이 항목이 만든 것이 아니다** — 1280×620 에서 38px 넘치는
   것은 고치기 전에도 그랬다(V-100b). 문 밖에 적되 **더 나빠지지는 않았는가**만 본다:
   딱지가 길어졌으니 여기서 한 줄이 늘면 그건 내 탓이다. */
const 창넘침 = Math.max(0, ...rows.map(r => r.창넘침 | 0));
const 창밑값 = 38;
console.log(`\n합계 — 거짓 **${합("거짓")}** · 참값틀림 ${합("참값틀림")} · 딱지없음 ${합("딱지없음")}`
  + ` · 칸 넘침 ${합("넘침")}px · 넉 장이 아닌 판 ${칸모자람}`);
console.log(`창 세로 넘침(V-100b · 문 밖) 가장 나쁜 값 ${창넘침}px (고치기 전 ${창밑값}px)`);
fs.writeFileSync("tmp/v110_depth.json", JSON.stringify(rows, null, 1));
const 통과 = 합("거짓") === 0 && 합("참값틀림") === 0 && 합("딱지없음") === 0
  && 합("넘침") === 0 && 칸모자람 === 0 && 창넘침 <= 창밑값;
console.log(통과 ? "판정: 통과" : "판정: 미달");
process.exit(통과 ? 0 : 1);
