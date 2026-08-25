/* V-59 자 — **「가방」 창이 낮은 창에서 «반쯤 걸린 줄»을 남긴다.**
   V-57b 훑개가 `bag` 을 3/6 으로 찍었다(1366×700 · 1440×660 · 1280×620).
   무엇이 밑자락 그늘에 걸리는지, 못 본 내용 40~48px 이 어디서 오는지 이름으로 찍는다.

   ★ **그늘은 «넘칠 때만» 켜진다**(`.wScroll.more::after`). 훑개는 그것을 안 묻고 늘
     34px 을 깎아서, 다 들어가는 1366×700 까지 「반쯤 걸린 줄 1」로 찍었다 — 위양성이다
     ([[silent-zero-is-not-an-observation]] 의 반대쪽 얼굴 · 자가 낸 큰 수도 안 믿는다).
     여기서는 `.more` 를 먼저 묻는다.
   ★ 전/후를 **한 판에** 잰다 — 상한을 지우면 「전」, `window.__fitBagGrid()` 를 부르면
     「후」다. 딴 판에서 재면 창 크기·글꼴이 갈려 못 견준다.
   ★ **채워 놓고 잰다** — 빈 가방은 표본이 아니다([[probe-must-walk-the-real-path]]).
   node tools/v59_bagfoot.mjs [--shots] */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
const SHOTS = process.argv.includes("--shots");
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
const shot = async (out) => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); };

/* V-56·V-57b 와 **같은 사람** — 자마다 딴 사람을 쓰면 줄 수가 달라져 못 견준다. */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: {}, bag: [], tree: { bone: 8, armor: 3, ghoul: 1, golem: 1, legion: 2 }, quests: {}, relics: 0, rebirths: 0,
  best: 52, lastSeen: 0, corpses: 0 };

const SIZES = [[1512, 863], [1512, 800], [1366, 768], [1366, 700], [1440, 660], [1280, 620]];
const M = `(()=>{const body=document.getElementById("bagBody");
  if(!body) return {none:true};
  const br=body.getBoundingClientRect();
  /* * 그늘은 .more 일 때만 켜진다 — 안 묻고 깎으면 멀쩡한 창이 「잘렸다」로 나온다.
     (이 주석은 바깥 템플릿 문자열 안이라 백틱을 쓰면 거기서 끊긴다 · bagfit_qa 와 같은 덫) */
  const fade=body.classList.contains("more")?(parseFloat(getComputedStyle(body,"::after").height)||0):0;
  const lim=br.bottom-fade;
  const nameOf=(el)=>el.id?("#"+el.id):(el.className&&typeof el.className==="string"
    ?el.tagName.toLowerCase()+"."+el.className.trim().split(/\\s+/).slice(0,2).join("."):el.tagName.toLowerCase());
  /* 그늘 선에 «반쯤 걸린 것» — 아이 뿐 아니라 격자 칸까지 내려가 이름으로 찍는다 */
  const cut=[];
  for(const el of body.querySelectorAll("*")){
    const r=el.getBoundingClientRect();
    if(r.height<=4||!el.getClientRects().length) continue;
    if(r.top<lim-.5&&r.bottom>lim+.5) cut.push(nameOf(el)+" ▾"+Math.round(r.bottom-lim)+"px");
  }
  const grid=body.querySelector(".sSec.bag .grid");
  /* 물건 칸은 여러 칸을 잇는다(grid-area span) — 빈 칸만 1×1 이라 «한 칸의 진짜 크기»다
     (bagfit_qa 와 같은 셈). 이은 칸을 재면 콩알 격자를 큰 물건으로 속일 수 있다. */
  const cell=grid&&(grid.querySelector(".cell.empty")||grid.querySelector(".cell"));
  const doll=body.querySelector(".pdoll");
  const eq=body.querySelector(".sSec.eq"), bag=body.querySelector(".sSec.bag");
  const rr=(e)=>e?{t:Math.round(e.getBoundingClientRect().top-br.top),h:Math.round(e.getBoundingClientRect().height)}:null;
  return {boxH:Math.round(br.height), fade:Math.round(fade), more:body.classList.contains("more"),
    gridW:grid?Math.round(grid.getBoundingClientRect().width):0,
    unseen:Math.round(Math.max(0,body.scrollHeight-body.clientHeight)),
    scrollable:/auto|scroll/.test(getComputedStyle(body).overflowY),
    eq:rr(eq), bag:rr(bag), grid:rr(grid),
    cellH:cell?Math.round(cell.getBoundingClientRect().height):0,
    cellW:cell?Math.round(cell.getBoundingClientRect().width):0,
    pdS:doll?getComputedStyle(doll).getPropertyValue("--pdS").trim():"(없음)",
    cutN:cut.length, cut:cut.slice(0,6)};})()`;

const out = [];
for (const [W, H] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
  await S("Page.reload", { ignoreCache: true }); await wait(2200);
  await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
  await S("Page.reload", { ignoreCache: true }); await wait(1800);
  /* 가방을 채운다 — 슬롯 이름은 **게임에서 가져온다**(손으로 적었다가 GEAR 에 없는
     물건을 심어 자를 터뜨린 적이 있다 · bagfit_qa 의 주석과 같은 까닭). */
  await ev(`(()=>{const M=window.META; M.bag=[];
    const K=window.__GEAR_KEYS||["wand","robe","charm"];
    for(let i=0;i<12;i++) M.bag.push({k:K[i%K.length], tier:(i%5), af:[{id:"dmg",v:12},{id:"hp",v:60}]});
    window.saveMeta();})()`);
  await ev(`window.__openWin && window.__openWin("bag")`); await wait(900);
  if (!await ev(`!!document.getElementById("winBag")?.classList.contains("on")`)) { out.push([`${W}×${H}`, { none: true }]); continue; }
  const after = await ev(M);
  if (SHOTS) await shot(`tmp/v59_bag_${W}x${H}.png`);
  /* 「전」 — 폭 상한을 지우고 그늘 표시를 다시 셈한다(둘이 함께 움직인다) */
  await ev(`(()=>{const g=document.querySelector("#bagBody .sSec.bag .grid"); if(g) g.style.maxWidth="";
    const b=document.getElementById("bagBody"); b.classList.toggle("more", b.scrollHeight-b.scrollTop-b.clientHeight>2);})()`);
  await wait(160);
  const before = await ev(M);
  if (SHOTS) await shot(`tmp/v59_bag_${W}x${H}_before.png`);
  await ev(`window.__fitBagGrid && window.__fitBagGrid()`);
  out.push([`${W}×${H}`, after, before]);
}
const one = (r) => !r || r.none ? "(못 잼)"
  : `격자 ${r.gridW}×${r.grid?.h} · 칸 ${r.cellW}×${r.cellH}px · 못 본 내용 ${r.unseen}${r.scrollable ? "" : "(못 구른다)"} · 그늘 ${r.more ? r.fade : "꺼짐"} · 걸린 것 ${r.cutN}`;
let worse = 0;
for (const [size, after, before] of out) {
  console.log(`\n■ ${size}  상자 ${after?.boxH}`);
  console.log(`   전  ${one(before)}`);
  console.log(`   후  ${one(after)}`);
  if (after && before && !after.none && !before.none) {
    if (after.cutN > before.cutN || after.unseen > before.unseen) { worse++; console.log("   ★ 나빠졌다"); }
    if (after.cut.length) console.log(`      아직 걸린 것 — ${after.cut.join(" · ")}`);
  }
}
console.log(`\n나빠진 자리 ${worse}`);
console.log("\n콘솔오류", errs.length, errs.slice(0, 3));
await raw("Target.closeTarget", { targetId });
process.exit(0);
