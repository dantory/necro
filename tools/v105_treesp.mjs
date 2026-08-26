/* V-105 자 — **트리 밑자락이 처음 켠 사람에게 «0 · 0/0» 셋을 늘어놓는가.**
   점수는 레벨 2부터 한 점씩 생긴다(core.js `spTotal = max(0, lv-1)`). 그래서 Lv.1 인
   사람이 「어둠의 길」을 열면 밑자락이 **「남은 점수 0  0/0」** 이고, 툴팁은 **「남은
   점수 없음」** 이다 — 셋 다 맞는 말이지만 **언제 첫 점이 생기는지는 한 마디도 안 한다.**
   V-101 의 「×1.00」· V-102 의 「+0%」· V-104 의 셈줄과 **같은 못**이다
   ([[carry-fixes-forward]]) — 뜻 없는 0 이 가장 밝게 서 있다.

   ★ **총점은 화면이 아니라 «심은 레벨»에서 센다** — 고칠 쪽(밑자락)과 재는 쪽이
     갈려야 자가 제 고침을 되읽지 않는다([[silent-zero-is-not-an-observation]]).
   ★ 두 사람을 잰다: 처음 켠 사람(총점 0) · 트리를 판 사람(총점 23 · 과잉 수정 막이).
   node tools/v105_treesp.mjs [old]                   (old = 옛 결로 되돌려 자를 보정) */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const OLD = process.argv[2] === "old";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;

const MEASURE = `(()=>{
  const foot=document.querySelector("#winTree .winFoot .purse");
  const sp=document.getElementById("treeSp"), all=document.getElementById("treeSpAll");
  const txt=(foot.textContent||"").replace(/\\s+/g," ").trim();
  /* 밑자락에 «0» 으로 서 있는 수를 센다 — 뜻 없는 0 이 몇 개인가 */
  const zeros=(txt.match(/\\d+/g)||[]).map(Number).filter(n=>n===0).length;
  /* 「언제 생기는지」를 말하는 줄이 있는가 (밑자락 · 툴팁 둘 중 하나라도) */
  const tip=document.getElementById("treeTip");
  const cost=((tip.querySelector(".tipBuy .cost")||{}).textContent||"").trim();
  const when=/레벨\\s*2/.test(txt)||/레벨\\s*2/.test(cost);
  return { txt, sp:sp.textContent.trim(), all:all.textContent.trim(), zeros, when, cost,
           dis:!!tip.querySelector(".tipBuy .btn[disabled]") };})()`;

const run = async (name, seed, lv) => {
  await S("Page.reload", { ignoreCache: true }); await wait(1800);
  await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
  if (seed) await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(seed))})`);
  await S("Page.reload", { ignoreCache: true }); await wait(2400);
  if (OLD) await ev(`window.__TREESPOLD=1`);
  await ev(`window.__openWin("tree")`); await wait(600);
  const r = await ev(MEASURE);
  const tot = Math.max(0, lv - 1);                 /* ★ 심은 레벨에서 센다 — 화면이 아니다 */
  console.log(`── ${name}`);
  console.log(`   밑자락: 「${r.txt}」   (남은=${r.sp} · 곁=${r.all})`);
  console.log(`   툴팁 값: 「${r.cost}」${r.dis ? " · 찍기 잠김" : ""}`);
  console.log(`   총점(레벨에서 셈): ${tot} · 뜻 없는 0: ${r.zeros} · 「언제」 줄: ${r.when ? "있다" : "없음"}`);
  await ev(`window.__closeAll()`); await wait(200);
  return { ...r, tot };
};

const a = await run("처음 켠 사람 (Lv.1 · 트리 빈 채)", null, 1);
const b = await run("트리를 판 사람 (Lv.24 · 12점 씀)",
  { gold: 9000, lv: 24, deepest: 28, runs: 3, up: { hp: 3, mp: 4, dmg: 2, army: 5 },
    equip: {}, bag: [], tree: { bone: 2, armor: 3, ghoul: 1, legion: 3, golem: 1, rot: 1, harvest: 1 } }, 24);

/* 자 보정 — 두 사람이 정말 다른 자리에 서 있는가(총점 0 대 23) */
const ok = a.tot === 0 && b.tot === 23;
console.log(`\n자 보정: 처음 켠 사람 총점 ${a.tot} · 판 사람 총점 ${b.tot} → ${ok ? "옳다" : "★ 자가 틀렸다"}`);
/* 과잉 수정 막이 — 점수가 있는 사람의 밑자락은 한 톨도 안 달라져야 한다 */
const keep = b.sp === "11" && b.all === "12/23" && !b.when;
console.log(`판정: 처음 켠 사람 뜻 없는 0 ${a.zeros}(문턱 0) · 「언제」 줄 ${a.when ? "있다" : "없음"}(있어야 한다) · ` +
            `판 사람 밑자락 「${b.sp} ${b.all}」 ${keep ? "그대로" : "★ 달라졌다"} → ` +
            (ok && a.zeros === 0 && a.when && keep ? "통과" : "미달"));
await raw("Target.closeTarget", { targetId });
bws.close();
