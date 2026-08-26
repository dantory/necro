/* V-96 — **넓은 창(≥1500px)에서 창이 떠도 일지가 뒤에 남는가**를 잰다.
   2026-08-12 에 병수님이 「정산 창이 떠 있는데 밖에 «전멸»이 붉게 남아 시선이
   갈린다」고 하셨고 `body.winopen #log{display:none}` 으로 고쳤다. 그런데
   08-16 에 옆 패널을 세우며 «패널 안이면 안 겹치니 보여도 된다»는 예외를
   `@media (min-width:1500px)` 에 넣었고, 08-17 에 **패널을 없애면서 그 예외만
   남았다** — 로그는 전장 위로 돌아왔는데 예외는 그대로라 넓은 창에서만
   옛 결함이 되살아났다([[floor-erases-the-ramp]] · [[carry-fixes-forward]]).
   ★ **한 크기만 보면 안 된다** — 1366×700 은 예외 밖이라 여태 멀쩡했고,
     그래서 어느 자에도 안 걸렸다([[probe-must-walk-the-real-path]]).
   ★ 곁들여 **정산 칸의 등급 배지**도 잰다 — 같은 물건인데 가방 칸과 정산 칸의
     `.q` 클래스가 갈려 «같은 숫자가 두 빛깔»로 나온다.
   node tools/v96_wide.mjs [old]      old 면 고치기 전 결로 짜서 자가 우는지 본다
   ★ `old` 는 **①의 문만** 되돌린다(없앤 CSS 예외를 다시 깐다). ③ 은 화면을 그리는
     식 자체가 바뀐 것이라 되돌릴 문이 없다 — 고치기 **전에** 재서 보정했다
     (2026-08-26 · 가방=t4/4 · 정산=r1/4 → 미달). */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const OLD = process.argv[2] === "old";
const SIZES = [[1512, 863], [1366, 700]];          // 예외 안 · 예외 밖 둘 다
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
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;

const it = (k, tier, af) => ({ k, tier, af });
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1, diveTold: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: it("wand", 3, [{ id: "dmg", v: 22 }]), robe: it("robe", 3, [{ id: "hp", v: 88 }]),
           charm: it("charm", 2, [{ id: "mdmg", v: 18 }]) },
  bag: [it("wand", 4, [{ id: "dmg", v: 31 }]), it("robe", 2, [{ id: "hp", v: 51 }])],
  tree: {}, quests: {}, relics: 3, rebirths: 1, best: 52, lastSeen: 0, corpses: 0 };

/* 옛 결로 되돌리는 문 — 없앤 예외를 그대로 다시 깔아 «자가 정말 우는지» 본다. */
const OLDCSS = `@media (min-width:1500px){ body.winopen #log{display:block} }`;

const lines = [];
for (const [W, H] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
  await S("Page.reload", { ignoreCache: true }); await wait(2200);
  await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
  await S("Page.reload", { ignoreCache: true }); await wait(2000);
  if (OLD) await ev(`(()=>{const s=document.createElement("style");s.id="v96old";s.textContent=${JSON.stringify(OLDCSS)};document.head.appendChild(s);})()`);

  /* 일지에 할 말을 심는다 — **빈 일지는 늘 통과한다**(빈 자를 못 믿는다). */
  await ev(`(()=>{const l=document.getElementById("log");
    l.innerHTML='<div><b style="color:#c33">쓰러짐</b> — 마을로 돌아옴</div><div>마을 · 채비가 끝나면 입구로</div>';})()`);

  /* 창 하나하나를 «여는 진짜 길»(__openWin)로 연다 — .on 을 손으로 붙이면
     body.winopen 이 안 서서 이 결함 자체가 사라진다. */
  const WINS = ["shop", "forge", "stat", "bag", "tree", "end", "reborn", "offline", "doctrine", "tactic", "dive", "wipe"];
  const bad = [];
  for (const w of WINS) {
    /* ★ 열기 전에 **먼저 닫는다** — `__openWin` 은 같은 창을 다시 부르면 «토글»이라
       닫아 버린다. 능력치·가방은 넓은 창에서 한 벌로 같이 열리므로, 앞 차례가
       stat 이면 bag 차례에 그대로 닫혀 「안 열림」이 됐다(자 쪽 흠이었다). */
    const r = await ev(`(()=>{ window.__closeAll();
      /* 「그동안」은 **쌓인 것이 있어야** 열린다 — 안 심으면 «안 열림»으로 빠져
         이 창만 조용히 안 재진다([[silent-zero-is-not-an-observation]]). */
      window.__lastOffline={min:480,gold:24800,corpses:312,corpsesIn:140,corpseFull:true,capped:true};
      try{ window.__openWin(${JSON.stringify(w)}); }catch(e){ return {err:String(e).slice(0,60)}; }
      const lg=document.getElementById("log");
      const rects=[...lg.getClientRects()].filter(r=>r.width>.5&&r.height>.5);
      const anyOn=[...document.querySelectorAll(".win.on")].map(x=>x.id);
      return { on:anyOn, drawn:rects.length>0, winopen:document.body.classList.contains("winopen") };})()`);
    await wait(60);
    if (!r || r.err) { bad.push(`${w}:열림실패`); continue; }
    if (!r.on.length) { bad.push(`${w}:안열림`); continue; }
    if (r.drawn) bad.push(`${w}:일지남음`);
  }
  /* 닫으면 돌아와야 한다 — 감추기만 하고 안 돌아오면 일지를 잃은 것이다. */
  const back = await ev(`(()=>{ window.__closeAll ? window.__closeAll() : document.querySelectorAll(".win.on").forEach(w=>w.classList.remove("on"));
    document.body.classList.remove("winopen","winover","charOpen");
    const lg=document.getElementById("log");
    return [...lg.getClientRects()].some(r=>r.width>.5&&r.height>.5);})()`);
  lines.push([`① ${W}×${H} — 창이 뜨면 일지가 안 그려진다`, bad.length === 0, bad.join(" ") || `창 ${WINS.length}개 모두 감춰짐`]);
  lines.push([`② ${W}×${H} — 닫으면 일지가 돌아온다`, back === true, `돌아옴=${back}`]);
}

/* ③ 같은 물건의 등급 배지가 가방 칸과 정산 칸에서 같은가.
   숫자는 둘 다 tier 를 적는데 색만 갈리면 «같은 숫자가 두 빛깔»이 된다. */
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.reload", { ignoreCache: true }); await wait(2200);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(2000);
const badge = await ev(`(()=>{
  const pick = c => { const q=c.querySelector(".q"); return q ? (q.className.replace(/^q\\s*/,"").trim()+"/"+q.textContent.trim()) : "없음"; };
  /* 가방 — meta.bag 첫째(wand t4 · 옵션 1개라 magic) */
  window.__openWin("bag");
  const bagCell = [...document.querySelectorAll("#winBag .grid .cell")].find(c=>c.querySelector("i.gear-wand"));
  const bagQ = bagCell ? pick(bagCell) : "칸없음";
  /* 정산 — 같은 물건을 전리품으로 놓는다 */
  const R = window.__LASTRUN;
  Object.assign(R,{floor:52,from:26,dead:true,killed:1284,gold:13640,xp:8420,leveled:false,
    loot:[{k:"wand",tier:4,af:[{id:"dmg",v:31}],worn:true}]});
  window.__openWin("end");
  const endCell = [...document.querySelectorAll("#winEnd #endBody .grid .cell")].find(c=>c.querySelector("i.gear-wand"));
  const endQ = endCell ? pick(endCell) : "칸없음";
  return { bagQ, endQ };})()`);
await wait(300);
lines.push(["③ 등급 배지 — 가방 칸 == 정산 칸", badge.bagQ === badge.endQ, `가방=${badge.bagQ} 정산=${badge.endQ}`]);

let ok = true;
for (const [n, p, d] of lines) { if (!p) ok = false; console.log(`${p ? "PASS" : "FAIL"}  ${n}  — ${d}`); }
await raw("Target.closeTarget", { targetId });
bws.close();
process.exit(ok ? 0 : 1);
