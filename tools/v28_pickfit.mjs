/* **고르는 칸이 제 이름을 대는가** — 편성(4)·운용(4) 여덟 칸을 하나씩 재는 자.
   사람이 창을 열었을 때 **누르기 전에** 무엇을 고르는지 알 수 있어야 한다.
   재는 것 셋 (창 높이마다):
     ① 이름이 칸 안에 보이나 — 그 칸이 제 이름 글자를 칸 네모 **안에** 그리는가
        (글자 높이 ≥9px · 상자가 칸 밖으로 안 나감). 「몇/여덟」로 센다.
     ② 칸 안 글자가 얼마나 큰가 — 글쇠(.lvl)와 이름의 **글자 크기 ÷ 칸 높이**(%).
        ★ 상자 넓이로 재면 안 된다 — `.lvl` 은 `inset:0` 이라 글쇠가 좁쌀이어도 상자는
          늘 칸을 꽉 채워 **100% 라는 상수**가 나온다([[floor-far-from-threshold]]).
     ③ 뜻 없는 빈 칸 수 — 고를 것이 넷인데 여섯 칸을 그리면 둘은 「잠긴 것」으로 읽힌다.
   node tools/v28_pickfit.mjs            (고친 뒤)
   NOPICKNAME=1 node tools/v28_pickfit.mjs   (문 — 고치기 전을 같은 자로 잰다)  */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const OFF = process.env.NOPICKNAME === "1";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;

const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };

/* 한 칸을 재는 눈 — 칸 안의 «글쇠(.lvl)»와 «이름(.cn)»을 따로 재고, 이름이 칸 밖으로
   삐져나가면 안 보이는 것으로 친다(hud.css 의 옛 .cn 사고가 바로 그것이었다). */
const PROBE = (gridId) => `(()=>{
  const g=document.getElementById(${JSON.stringify(gridId)}); if(!g) return {err:"격자 없음"};
  const cells=[...g.querySelectorAll(".cell")];
  const real=cells.filter(c=>!c.classList.contains("empty"));
  const out=real.map(c=>{
    const cr=c.getBoundingClientRect();
    const ico=c.querySelector(".lvl"), nm=c.querySelector(".cn");
    const box=el=>{ if(!el) return null; const r=el.getBoundingClientRect();
      const st=getComputedStyle(el);
      if(st.display==="none"||st.visibility==="hidden"||+st.opacity===0) return null;
      if(r.width<1||r.height<1) return null; return r; };
    const ir=box(ico), nr=box(nm);
    const inside=r=>!!r && r.left>=cr.left-1 && r.right<=cr.right+1 && r.top>=cr.top-1 && r.bottom<=cr.bottom+1;
    const nmTxt=(nm&&nm.textContent||"").trim();
    const nmFs=nm?parseFloat(getComputedStyle(nm).fontSize):0;
    const icoFs=ico?parseFloat(getComputedStyle(ico).fontSize):0;
    return { key:c.getAttribute("data-doc")||c.getAttribute("data-tac"),
      cw:Math.round(cr.width), ch:Math.round(cr.height),
      named: !!nmTxt && !!nr && inside(nr) && nmFs>=9,
      nmTxt, nmFs:Math.round(nmFs*10)/10, nmOver: !!nr && !inside(nr),
      icoPct: Math.round((ir?icoFs:0)/Math.max(1,cr.height)*1000)/10,
      nmPct: Math.round((nr?nmFs:0)/Math.max(1,cr.height)*1000)/10 };
  });
  return { real:real.length, empty:cells.length-real.length, cells:out };
})()`;

const HEIGHTS = [863, 720, 620];
const rows = [];
for (const H of HEIGHTS) {
  await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: H, deviceScaleFactor: 1, mobile: false });
  await S("Page.reload", { ignoreCache: true }); await wait(2200);
  await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
  await S("Page.reload", { ignoreCache: true }); await wait(1800);
  if (OFF) await ev(`document.body.classList.add("noPickName")`);
  for (const [which, gid] of [["doctrine", "docGrid"], ["tactic", "tacGrid"]]) {
    await ev(`window.__openWin && window.__openWin(${JSON.stringify(which)})`); await wait(500);
    const wid = which === "doctrine" ? "winDoctrine" : "winTactic";
    const on = await ev(`!!document.getElementById(${JSON.stringify(wid)}).classList.contains("on")`);
    const r = await ev(PROBE(gid));
    if (!on || !r || r.err || !r.real) { rows.push({ H, which, bad: `창=${on} ${r && r.err || "칸 0"}` }); }
    else rows.push({ H, which, on, ...r });
    await ev(`window.__openWin && window.__openWin(${JSON.stringify(which)})`); await wait(200);
  }
}
/* ★ **이름을 누를 수 있는가** — 이름 글자는 칸 «안»의 새 조각이라, 누르는 자리가
   그 조각이면 고르기가 죽는다(closest 를 안 쓰면 그렇게 된다). 그림만 보면 못 잡는
   흠이라 자에 같이 넣는다([[probe-must-walk-the-real-path]] — 사람이 지나는 길). */
let clickOk = "건너뜀(문)";
if (!OFF) {
  await ev(`window.__openWin && window.__openWin("doctrine")`); await wait(400);
  const r = await ev(`(()=>{
    const c=document.querySelectorAll("#docGrid .cell.pick")[3]; if(!c) return {err:"칸 없음"};
    const nm=c.querySelector(".cn"); if(!nm) return {err:"이름 없음"};
    nm.dispatchEvent(new MouseEvent("click",{bubbles:true}));
    const sel=document.querySelector("#docGrid .cell.sel");
    return { now:(document.getElementById("docNow")||{}).textContent,
             selKey: sel && sel.getAttribute("data-doc"), want:c.getAttribute("data-doc") };
  })()`);
  clickOk = (r && !r.err && r.selKey === r.want && r.now === "골렘 벽")
    ? `통과 (이름을 눌러 «${r.now}» 로 바뀌고 금테가 따라갔다)` : `미달 — ${JSON.stringify(r)}`;
  await ev(`window.__openWin && window.__openWin("doctrine")`); await wait(200);
}

console.log(`문 NOPICKNAME=${OFF ? 1 : 0}\n`);
let namedTot = 0, cellTot = 0, emptyTot = 0, over = 0;
for (const r of rows) {
  if (r.bad) { console.log(`  ${r.H} ${r.which}: 못 쟀다 — ${r.bad}`); continue; }
  const nn = r.cells.filter(c => c.named).length;
  namedTot += nn; cellTot += r.cells.length; emptyTot += r.empty;
  over += r.cells.filter(c => c.nmOver).length;
  const icoP = r.cells.map(c => c.icoPct), nmP = r.cells.map(c => c.nmPct);
  console.log(`  ${r.H} ${r.which.padEnd(8)} 칸 ${r.cells[0].cw}×${r.cells[0].ch} · 이름 보임 ${nn}/${r.cells.length}` +
    ` · 글쇠 ${Math.min(...icoP)}% · 이름 ${Math.min(...nmP)}% (칸 높이 대비) · 뜻 없는 빈 칸 ${r.empty}` +
    (nn ? ` · [${r.cells.map(c => c.nmTxt).join("·")}]` : ""));
}
console.log(`\n이름을 눌러 고르기: ${clickOk}`);
console.log(`합계: 이름 보임 ${namedTot}/${cellTot} (${cellTot ? Math.round(namedTot / cellTot * 100) : 0}%) · 뜻 없는 빈 칸 ${emptyTot} · 칸 밖으로 삐짐 ${over} · 콘솔오류 ${errs.length}`);
const ok = cellTot > 0 && namedTot === cellTot && emptyTot === 0 && over === 0 && errs.length === 0 && !clickOk.startsWith("미달");
console.log(`판정: ${ok ? "통과 — 여덟 칸이 다 제 이름을 댄다" : "미달"}`);
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(ok ? 0 : 1);
