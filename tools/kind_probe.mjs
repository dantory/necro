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
/* ★ 이 자도 **손잡이를 받는다**(2026-08-15). 벌이·관문을 갈아 끼운 팔에서 「세 종이
   다 서나」를 물어야 하는데, 여태 이 자만 기본값으로 굳어 있어 A/B 의 절반(끝 조건 ①)을
   못 쟀다. 이름은 loop_health 와 **같은 것**을 쓴다 — 한 팔을 두 자에 태울 때
   `env LH_XPD=… LH_GATE=…` 를 그대로 앞에 붙이면 되도록. */
await S("Page.addScriptToEvaluateOnNewDocument", { source: `
   ${/* ★ 자는 **본보기 빌드**로 굴린다 — 까닭은 loop_health 의 같은 줄에 적었다. */""}
   globalThis.__AUTO_TREE = ${process.env.LH_AUTOTREE != null ? (+process.env.LH_AUTOTREE ? 1 : 0) : 1};
   ${process.env.LH_XPK  != null ? `globalThis.__XP_K = ${+process.env.LH_XPK};` : ""}
   ${process.env.LH_XPP  != null ? `globalThis.__XP_P = ${+process.env.LH_XPP};` : ""}
   ${process.env.LH_XPD  != null ? `globalThis.__XP_DEPTH = ${+process.env.LH_XPD};` : ""}
   ${process.env.LH_GATE != null ? `globalThis.__GATE_S = ${+process.env.LH_GATE};` : ""}
   ${process.env.LH_SPLIT != null ? `globalThis.__SPLIT = ${+process.env.LH_SPLIT};` : ""}
   ${process.env.LH_DOC  != null ? `globalThis.__DOCTRINE = ${JSON.stringify(process.env.LH_DOC)};` : ""}
   ${process.env.LH_TAC  != null ? `globalThis.__TACTIC = ${JSON.stringify(process.env.LH_TAC)};` : ""}` });
/* ★ `fresh` — **갓 만든 세이브로** 잰다. 이게 없던 동안 이 자는 그 프로필에 쌓인 판
   (Lv.20+·유물)으로만 쟀다 — 「처음 켠 사람에게 세 종이 서나」는 그걸로 답이 안 나온다
   (ROADMAP 4막 A-1 의 끝 조건이 바로 그것이다). node tools/kind_probe.mjs 720 fresh */
if (process.argv.includes("fresh")) await ev2(`localStorage.clear()`);
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 2500));
/* ★ 이름이 하나 틀려 이 자가 **12분 내내 던전에 안 들어갔다**(2026-08-15 18:47).
   `window.toDungeon` 은 없는 이름이다 — 있는 것은 `__toDungeon`(js/main.js:1910).
   그래서 fresh 팔이 12분에 층 5 · Lv 2 로 기었고(같은 팔을 loop_health 로 재면 층 52 · Lv 16),
   「세 종이 다 서나」가 해골 100% 로 미달이 났다. 값이 아니라 **자가 딴 길을 걸었다**. */
if (!(await ev2(`typeof window.__toDungeon === "function"`)))
  throw new Error("window.__toDungeon 이 없다 — 자가 던전에 못 들어간다(이름이 바뀌었나?)");
await ev2(`window.__toDungeon()`);
/* ★ **한 번만 보지 않는다** — 끝에 찍은 한 장은 그 순간 서 있던 것뿐이라, 12분 내내
   해골만 서다 마지막에 구울 하나가 선 판과 셋이 고루 선 판을 **못 가른다**.
   10초마다 세어 **머릿수의 누계**로 비율을 낸다(=시간가중). 「한 번이라도 섰나」는
   `본적`, 「얼마나 오래 판을 차지했나」는 `비율`이 답한다. */
/* ★★ **죽으면 사람이 「던전으로」를 다시 누른다** — 이 자에게는 그 손이 없었다
   (2026-08-15 22:14). 판은 죽으면 마을로 돌아와 정산 창을 열고 **거기 서서 기다린다**
   (js/main.js:2032). 그래서 이 자는 층 4 에서 죽은 뒤 남은 11분을 **마을에 서서** 세고,
   해골 100% 로 「미달」을 냈다 — 값이 아니라 자가 멈춰 있었다.
   ★ 21:00 (dcde0a8, 겹침 0.6→0.5) **전에는 죽음이 0 이라 이 구멍이 안 보였다.**
     20:16 에 이 자가 낸 「통과」는 한 번도 안 죽은 판의 것이다.
   `toDungeon()` 이 스스로 closeAll() 을 하므로 부르기만 하면 된다(js/main.js:1931).
   1초마다 보는 까닭: 10초에 한 번만 보면 죽을 때마다 최대 10초를 마을에서 버린다.
   ★ 그리고 **몇 번 죽었는지·마을에 몇 초 서 있었는지를 낸다** — 다음에 자가 또
     멈추면 「미달」이 아니라 그 숫자가 먼저 눈에 띄게([[probe-must-walk-the-real-path]]). */
const tally = {}; let samples = 0, revives = 0, townT = 0;
const seenAt = {};
const beat = async () => {
  const at = await ev2(`(()=>({at:(window.MODE||{}).at, dead:!!S.dead}))()`);
  if (!at) return;
  if (at.at !== "dungeon" || at.dead) { townT++; revives++; await ev2(`window.__toDungeon()`); }
};
for (let t = 0; t < SEC; t += 10) {
  const span = Math.min(10, SEC - t);
  for (let i = 0; i < span; i++) { await new Promise(r => setTimeout(r, 1000)); await beat(); }
  const c = await ev2(`(()=>{const c={};for(const m of (S.minions||[])) if(!m.own) c[m.k||m.kind||"?"]=(c[m.k||m.kind||"?"]||0)+1; return c;})()`);
  if (!c) continue;
  samples++;
  for (const [k, v] of Object.entries(c)) { tally[k] = (tally[k] | 0) + v; if (!seenAt[k]) seenAt[k] = t + 10; }
}
const sum = Object.values(tally).reduce((a, b) => a + b, 0) || 1;
const 비율 = Object.fromEntries(Object.entries(tally).map(([k, v]) => [k, +(v / sum * 100).toFixed(1)]));
const 최대 = Math.max(0, ...Object.values(비율));
const out = await ev2(`(()=>({층:S.floor, 상한:(window.armyCap?armyCap():null), 레벨:META.lv,
  트리:JSON.stringify(META.tree), 자동:globalThis.__AUTO_TREE === 1}))()`);
/* 마을에 오래 서 있었으면 종 비율은 **판의 성질이 아니라 자의 흠**이다 — 그때는
   통과/미달을 말하지 않고 그렇게 적는다(조용한 미달이 제일 비쌌다). */
const 마을비율 = SEC ? townT / SEC * 100 : 0;
/* ★ 2026-08-17 — 판정을 **한 자리에서** 짓는다. 아래 exit 코드가 이 값을 그대로 쓴다:
   여태 이 자는 무슨 답이 나오든 `exit 0` 이라, qa_all 에 넣으면 「미달」이 PASS 칸에
   앉을 판이었다(조용한 통과가 이 리포에서 제일 비쌌다). 두 곳에 같은 식을 적으면
   언젠가 갈라지므로 문장 하나만 둔다. */
const 판정 = 마을비율 > 10 ? `자가 마을에 ${townT}초 서 있었다 — 이 표는 못 쓴다`
           : (["skel","ghoul","golem"].every(k => tally[k]) && 최대 <= 85) ? "통과" : "미달";
console.log(JSON.stringify({ ...out, 표본: samples, 누계: tally, 비율, 최대종비율: 최대,
  본적: Object.fromEntries(Object.entries(seenAt).map(([k, v]) => [k, v + "초"])),
  죽음: revives, 마을초: townT, 마을비율: +마을비율.toFixed(1), 판정 }, null, 1));
await fetch(`${CDP}/json/close/${targetId}`);
/* 짧게 돌리면 골렘이 아직 안 서서 미달이 정상이다(첫 등장 ≈360초) —
   그래서 qa_all 에는 **충분히 긴 인자**(720초)로 slow 자리에 둔다. */
process.exit(판정 === "통과" ? 0 : 1);
