/* V-104 자 — **편성 창이 «못 세우는 소환수»를 이름만 내걸고 침묵하는가.**
   처음 켠 사람은 해골밖에 못 세운다(구울·골렘은 트리에서 찍어야 SKILLS 에 든다 ·
   core.js syncSkills). 그런데 편성 창은 「구울 위주」·「골렘 벽」을 멀쩡한 칸으로
   세우고, 고른 「균형」의 셈줄은 「벽(골렘) 1 · 몸(구울) 1」을 밝은 값으로 적는다.

   ★ **열렸는지는 편성 창이 아니라 «벨트»에서 읽는다** — 벨트는 SKILLS 를 그대로
     그리는 자리라, 고칠 쪽(편성 창)과 재는 쪽이 갈린다([[silent-zero-is-not-an-observation]]).
   ★ 두 사람을 잰다: 처음 켠 사람(잠김 둘) · 트리를 판 사람(잠김 없음 · 과잉 수정 막이).
   node tools/v104_doclock.mjs [old]                  (old = 옛 결로 되돌려 자를 보정) */
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

/* 편성 칸이 이름을 내건 소환수 — 칸 하나에 «앞세우는 몸» 하나. */
const PRIME = { flesh: "ghoul", wall: "golem" };
const KO = { ghoul: "구울", golem: "골렘" };

const MEASURE = `(()=>{
  /* ① 열린 소환 스킬은 «벨트»에서 읽는다 — 편성 창과 다른 자리다 */
  const belt = [...document.querySelectorAll("#belt [data-sk]")].map(e=>e.getAttribute("data-sk"));
  const locked = ["ghoul","golem"].filter(k=>!belt.includes(k));
  /* ② 편성 칸 — 이름을 내걸었는데 잠금 표가 없는 것 */
  const PRIME={flesh:"ghoul",wall:"golem"};
  const tiles=[...document.querySelectorAll("#docGrid [data-doc]")].map(e=>({
    id:e.getAttribute("data-doc"), lock:e.classList.contains("lock"),
    note:!!e.querySelector(".docLock")}));
  const mute=tiles.filter(t=>PRIME[t.id]&&locked.includes(PRIME[t.id])&&!t.lock);
  /* ③ 셈줄 — 못 세우는 몸의 수를 밝은 값(<b>)으로 적는가 */
  const tip=document.getElementById("docTip");
  const bs=[...tip.querySelectorAll(".tipStat.up b")].map(b=>({
    txt:(b.previousSibling&&b.previousSibling.textContent||"").trim()+"|"+b.textContent.trim(),
    off:b.classList.contains("off")}));
  const KO={ghoul:"구울",golem:"골렘"};
  const loud=bs.filter(b=>locked.some(k=>b.txt.includes(KO[k]))&&!b.off);
  /* ④ 창 어디든 「아직 못 연다」를 말하는 줄이 있는가 */
  const says=[...tip.querySelectorAll(".docLock,.tipNote.lockNote")].map(e=>e.textContent.trim());
  return { belt, locked, tiles, mute:mute.map(t=>t.id), bs, loud:loud.map(b=>b.txt), says,
           quiet: mute.length + loud.length };})()`;

const run = async (name, seed) => {
  await S("Page.reload", { ignoreCache: true }); await wait(1800);
  await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
  if (seed) await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(seed))})`);
  await S("Page.reload", { ignoreCache: true }); await wait(2400);
  if (OLD) await ev(`document.body.classList.add("v104old"); window.__DOCLOCKOLD=1;`);
  await ev(`window.__openWin("doctrine")`); await wait(600);
  const r = await ev(MEASURE);
  console.log(`── ${name}`);
  console.log(`   벨트: ${r.belt.join(" ")}`);
  console.log(`   안 열린 소환수: ${r.locked.length ? r.locked.map(k => KO[k]).join(" · ") : "없음"}`);
  console.log(`   칸: ${r.tiles.map(t => t.id + (t.lock ? "(잠김)" : "") + (t.note ? "+줄" : "")).join(" · ")}`);
  console.log(`   셈줄: ${r.bs.map(b => b.txt + (b.off ? "(눌림)" : "")).join(" · ")}`);
  console.log(`   말없이 내건 자리: 칸 ${r.mute.length}[${r.mute.join(",")}] + 값 ${r.loud.length}[${r.loud.join(",")}] = ${r.quiet}`);
  console.log(`   「아직 못 연다」 줄: ${r.says.length ? r.says.join(" / ") : "없음"}`);
  await ev(`window.__closeAll()`); await wait(200);
  return r;
};

const a = await run("처음 켠 사람 (Lv.1 · 트리 빈 채)", null);
const b = await run("트리를 판 사람 (Lv.24 · ghoul·golem 찍음)",
  { gold: 9000, lv: 24, deepest: 28, runs: 3, up: { hp: 3, mp: 4, dmg: 2, army: 5 },
    equip: {}, bag: [], tree: { bone: 2, armor: 3, ghoul: 1, legion: 3, golem: 1, rot: 1, harvest: 1 } });

const need = a.locked.length === 2 && b.locked.length === 0;
console.log(`\n자 보정: 처음 켠 사람 잠김 2 · 판 사람 잠김 0 → ${need ? "옳다" : "★ 자가 틀렸다"}`);
console.log(`판정: 처음 켠 사람 «말없이 내건 자리» ${a.quiet} (문턱 0) · 판 사람 ${b.quiet} → ` +
            (need && a.quiet === 0 && b.quiet === 0 ? "통과" : "미달"));
await raw("Target.closeTarget", { targetId });
bws.close();
