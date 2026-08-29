/* V-141b 자 — **대장간 재련 줄에서 «첫눈에 보이는 슬롯이 몇이냐»를 창 크기마다 잰다.**
   V-141 이 슬롯 열을 냈는데 1366×700 에서는 여섯만 보이고 넷은 굴려야 나온다.
   고치기 전에 재고, 고친 뒤 같은 자로 다시 잰다([[cause-written-in-the-item-is-a-guess]]).

   재는 것(창 크기마다):
     · 재련 줄에서 **온전히 보이는 칸 수** / 열  ← 이 항목의 본문
     · 재련 줄의 못 본 px(scrollHeight-clientHeight)
     · 설명칸(.tip)이 구르는가 · 못 본 px  ← 240px 바닥과 다투는 자리
     · 밑자락(.winFoot)이 상자 안에 있는가(footBot ≤ frameBot)  ← V-141 이 한 번 잃은 자리
   node tools/v141b_fit.mjs */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev2 => { const m = JSON.parse(ev2.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;

/* v57 과 **같은 사람** — 자마다 딴 사람을 쓰면 칸 수·글 길이가 달라져 못 견준다. */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: {}, bag: [], tree: { bone: 8, armor: 3, ghoul: 1, golem: 1, legion: 2 }, quests: {}, relics: 0, rebirths: 0,
  best: 52, lastSeen: 0, corpses: 0 };

const SIZES = [[1512, 863], [1366, 768], [1366, 700], [1280, 620]];
const MEASURE = `(()=>{
  const w=document.getElementById("winForge"); if(!w||!w.classList.contains("on")) return {off:true};
  const fr=w.querySelector(".frame"), g=document.getElementById("forgeReGrid"),
        up=document.getElementById("forgeGrid"), tip=document.getElementById("forgeTip"),
        foot=w.querySelector(".winFoot");
  const gr=g.getBoundingClientRect(), frr=fr.getBoundingClientRect(), ftr=foot.getBoundingClientRect();
  /* 온전히 보이는 칸 — 줄의 «보이는 상자» 안에 위아래가 다 든 것만 센다.
     그늘 띠가 있으면 그만큼 위로 당긴다(반쯤 덮인 칸은 「보인다」가 아니다). */
  const fade=g.classList.contains("more")?(parseFloat(getComputedStyle(g,"::after").height)||0):0;
  const lim=gr.bottom-fade;
  const cells=[...g.children]; let seen=0; const hid=[];
  for(const c of cells){ const r=c.getBoundingClientRect();
    if(r.top>=gr.top-.5 && r.bottom<=lim+.5) seen++; else hid.push((c.querySelector(".cn")?.textContent||c.title||"?").trim()); }
  const tcs=getComputedStyle(tip);
  return { cells:cells.length, seen, hid:hid.slice(0,6),
    gridH:Math.round(gr.height), gridUnseen:Math.round(Math.max(0,g.scrollHeight-g.clientHeight)),
    upH:Math.round(up.getBoundingClientRect().height),
    tipH:Math.round(tip.getBoundingClientRect().height),
    tipUnseen:Math.round(Math.max(0,tip.scrollHeight-tip.clientHeight)),
    tipMin:tcs.minHeight,
    footBot:Math.round(ftr.bottom), frameBot:Math.round(frr.bottom),
    out:Math.round(Math.max(0,ftr.bottom-frr.bottom)) };})()`;

const rows = [];
for (const [W, H] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
  await S("Page.reload", { ignoreCache: true }); await wait(2000);
  await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
  await S("Page.reload", { ignoreCache: true }); await wait(1900);
  await ev(`try{window.__openWin("forge")}catch(e){}`); await wait(460);
  const r = await ev(MEASURE);
  rows.push({ size: `${W}×${H}`, ...(r || { off: true }) });
}
let bad = 0;
for (const r of rows) {
  if (r.off) { console.log(`${r.size}  창을 못 열었다`); bad++; continue; }
  const ok = r.seen === r.cells && !r.out;
  if (!ok) bad++;
  console.log(`${r.size}  보이는 칸 ${r.seen}/${r.cells}` +
    (r.gridUnseen ? ` · 못 본 줄 ${r.gridUnseen}px` : "") +
    ` · 강화줄 ${r.upH} · 재련줄 ${r.gridH} · 설명칸 ${r.tipH}(min ${r.tipMin}` +
    (r.tipUnseen ? ` · 못 본 ${r.tipUnseen}px` : "") + `)` +
    ` · 밑자락 ${r.footBot}/${r.frameBot}` + (r.out ? ` ← **${r.out}px 나갔다**` : "") +
    (r.hid.length ? `\n     안 보이는 칸: ${r.hid.join(" · ")}` : ""));
}
console.log(`\n판정: ${bad ? "미달 " + bad : "통과"} / 잰 자리 ${rows.length} · 콘솔오류 ${errs.length}`, errs.slice(0, 3));
await raw("Target.closeTarget", { targetId });
process.exit(0);
