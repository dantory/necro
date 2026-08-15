/* 화면에 **무슨 종이 서 있나**. 편성이 셋을 섞는다고 표에 적혀 있어도, 실제로 서는 것과
   그려지는 그림이 다를 수 있다(2026-08-15 로드맵 사진에서 12기가 전부 같은 해골로 보였다).
   node tools/kind_probe.mjs [초] */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const SEC = +(process.argv[2] || 50);
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
const ev2 = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
/* ★ `fresh` — **갓 만든 세이브로** 잰다. 이게 없던 동안 이 자는 그 프로필에 쌓인 판
   (Lv.20+·유물)으로만 쟀다 — 「처음 켠 사람에게 세 종이 서나」는 그걸로 답이 안 나온다
   (ROADMAP 4막 A-1 의 끝 조건이 바로 그것이다). node tools/kind_probe.mjs 720 fresh */
if (process.argv.includes("fresh")) await ev2(`localStorage.clear()`);
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 2500));
await ev2(`window.toDungeon && window.toDungeon()`);
/* ★ **한 번만 보지 않는다** — 끝에 찍은 한 장은 그 순간 서 있던 것뿐이라, 12분 내내
   해골만 서다 마지막에 구울 하나가 선 판과 셋이 고루 선 판을 **못 가른다**.
   10초마다 세어 **머릿수의 누계**로 비율을 낸다(=시간가중). 「한 번이라도 섰나」는
   `본적`, 「얼마나 오래 판을 차지했나」는 `비율`이 답한다. */
const tally = {}; let samples = 0;
const seenAt = {};
for (let t = 0; t < SEC; t += 10) {
  await new Promise(r => setTimeout(r, Math.min(10, SEC - t) * 1000));
  const c = await ev2(`(()=>{const c={};for(const m of (S.minions||[])) if(!m.own) c[m.k||m.kind||"?"]=(c[m.k||m.kind||"?"]||0)+1; return c;})()`);
  if (!c) continue;
  samples++;
  for (const [k, v] of Object.entries(c)) { tally[k] = (tally[k] | 0) + v; if (!seenAt[k]) seenAt[k] = t + 10; }
}
const sum = Object.values(tally).reduce((a, b) => a + b, 0) || 1;
const 비율 = Object.fromEntries(Object.entries(tally).map(([k, v]) => [k, +(v / sum * 100).toFixed(1)]));
const 최대 = Math.max(0, ...Object.values(비율));
const out = await ev2(`(()=>({층:S.floor, 상한:(window.armyCap?armyCap():null), 레벨:META.lv,
  트리:JSON.stringify(META.tree), 자동:META.autoTree}))()`);
console.log(JSON.stringify({ ...out, 표본: samples, 누계: tally, 비율, 최대종비율: 최대,
  본적: Object.fromEntries(Object.entries(seenAt).map(([k, v]) => [k, v + "초"])),
  판정: (["skel","ghoul","golem"].every(k => tally[k]) && 최대 <= 85) ? "통과" : "미달" }, null, 1));
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(0);
