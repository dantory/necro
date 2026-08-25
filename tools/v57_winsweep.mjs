/* V-57 자 — **창 열둘을 창 크기 여섯에서 «다 보이는가»로 한 번에 훑는다.**
   V-52~V-56 이 창을 하나씩 잡아 고쳤는데, 남은 창(대장간·건너뛰기·교리·전술·
   정산·환생·이탈)은 **한 번도 낮은 창에서 재 본 적이 없다.** 어디가 제일
   나쁜지 먼저 알고 집는다.

   재는 것(창마다 · 크기마다):
     · 창 상자가 화면 밖으로 넘친 px (세로/가로)
     · 구르는 상자의 **못 본 내용** px (scrollHeight-clientHeight)
     · 그 상자가 **구를 수 있는가**(overflow-y)  ← 못 구르는데 넘치면 그건 잃은 것
     · 밑자락 그늘(.wScroll::after) 선에 **반쯤 걸린 줄** 수
     · 창 안에서 **가로로 넘친** 요소 수(글자 잘림)
   node tools/v57_winsweep.mjs */
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

/* v56 과 **같은 사람** — 자마다 딴 사람을 쓰면 줄 수가 달라져 못 견준다. */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: {}, bag: [], tree: { bone: 8, armor: 3, ghoul: 1, golem: 1, legion: 2 }, quests: {}, relics: 0, rebirths: 0,
  best: 52, lastSeen: 0, corpses: 0 };

const WINS = ["shop", "forge", "dive", "tree", "stat", "bag", "doctrine", "tactic", "end", "reborn", "wipe"];
const SIZES = [[1512, 863], [1512, 800], [1366, 768], [1366, 700], [1440, 660], [1280, 620]];
const MEASURE = (key) => `(()=>{const idOf={shop:"winShop",forge:"winForge",dive:"winDive",stat:"winStat",bag:"winBag",tree:"winTree",end:"winEnd",reborn:"winReborn",wipe:"winWipe",doctrine:"winDoctrine",tactic:"winTactic"}["${key}"];
  const w=document.getElementById(idOf); if(!w||!w.classList.contains("on")) return {off:true};
  const wr=w.getBoundingClientRect(), VW=innerWidth, VH=innerHeight;
  const boxes=[...w.querySelectorAll(".wScroll")];
  let unseen=0, stuck=0, cut=0;
  for(const b of boxes){ const cs=getComputedStyle(b); const scrollable=/auto|scroll/.test(cs.overflowY);
    const u=Math.max(0,b.scrollHeight-b.clientHeight); unseen=Math.max(unseen,u);
    if(u>2&&!scrollable) stuck=Math.max(stuck,u);
    /* 그늘은 «넘칠 때»만 켜진다(.wScroll.more::after) — 늘 깎으면 멀쩡한 줄이
       「반쯤 걸렸다」로 잡힌다(V-59b 가 bag 2/6 · stat 6/6 을 그렇게 만들어 냈다). */
    const fade=b.classList.contains("more")?(parseFloat(getComputedStyle(b,"::after").height)||0):0;
    const br=b.getBoundingClientRect(), lim=br.bottom-fade;
    for(const el of b.children){ const r=el.getBoundingClientRect();
      if(r.height>4&&r.top<lim-.5&&r.bottom>lim+.5) cut++; } }
  /* 가로 잘림 — «자르는 요소»만 본다.
     overflow-x 가 visible 이면 넘쳐도 다 보인다(스킬트리 랭크 배지·잇는 선이 그렇다).
     hidden/clip 이라야 «영영 못 읽는 것», auto/scroll 은 굴려서 닿으니 따로 센다. */
  let hcut=0, hscr=0; const hits=[];
  const nameOf=(el)=>el.id?("#"+el.id):(el.className&&typeof el.className==="string"
    ?el.tagName.toLowerCase()+"."+el.className.trim().split(/\s+/).slice(0,2).join("."):el.tagName.toLowerCase());
  for(const el of w.querySelectorAll("*")){
    const over=el.scrollWidth-el.clientWidth;
    if(!(over>2&&el.clientWidth>0)) continue;
    const cs=getComputedStyle(el);
    if(/visible/.test(cs.overflowX)) continue;              /* 안 자른다 — 위양성의 정체 */
    if(/auto|scroll/.test(cs.overflowX)){ hscr++; continue; } /* 굴리면 닿는다 */
    if(!el.getClientRects().length) continue;                /* 안 그려진 것 */
    hcut++; if(hits.length<6) hits.push(nameOf(el)+" +"+Math.round(over)+"px"
      +(/ellipsis/.test(cs.textOverflow)?"(…)":""));
  }
  return {below:Math.round(Math.max(0,wr.bottom-VH)), above:Math.round(Math.max(0,-wr.top)),
    right:Math.round(Math.max(0,wr.right-VW)), left:Math.round(Math.max(0,-wr.left)),
    h:Math.round(wr.height), unseen:Math.round(unseen), stuck:Math.round(stuck), cut, hcut, hscr, hits};})()`;

const rows = [];
for (const [W, H] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
  await S("Page.reload", { ignoreCache: true }); await wait(2200);
  await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
  await S("Page.reload", { ignoreCache: true }); await wait(1900);
  /* 정산 창은 판을 한 번 죽여야 값이 있다 — 자가 손수 채운다(v51 과 같은 결). */
  await ev(`window.LASTRUN=window.LASTRUN||{floor:52,kills:1840,gold:13600,xp:9400,time:720,corpses:236,best:true,drops:[]}`);
  for (const k of WINS) {
    await ev(`try{window.__openWin(${JSON.stringify(k)})}catch(e){}`); await wait(420);
    const r = await ev(MEASURE(k)); await ev(`window.__openWin(${JSON.stringify(k)})`); await wait(120);
    rows.push({ size: `${W}×${H}`, win: k, ...(r || { off: true }) });
  }
}
const bad = rows.filter(r => !r.off && (r.below || r.above || r.stuck || r.cut || r.hcut || r.unseen > 8));
const byWin = {};
for (const r of bad) { (byWin[r.win] ||= []).push(r); }
console.log("── 나쁜 자리 " + bad.length + " / 잰 자리 " + rows.filter(r => !r.off).length + " (못 연 창 " + rows.filter(r => r.off).length + ")");
for (const [k, v] of Object.entries(byWin).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n■ ${k} — ${v.length}/${SIZES.length}`);
  for (const r of v) console.log(`   ${r.size}  창높이 ${r.h}` +
    (r.below ? ` · 아래로 넘침 ${r.below}px` : "") + (r.above ? ` · 위로 넘침 ${r.above}px` : "") +
    (r.right ? ` · 오른쪽 ${r.right}px` : "") + (r.left ? ` · 왼쪽 ${r.left}px` : "") +
    (r.unseen > 8 ? ` · 못 본 내용 ${r.unseen}px` : "") + (r.stuck ? ` · **못 구르는데 넘침 ${r.stuck}px**` : "") +
    (r.cut ? ` · 반쯤 걸린 줄 ${r.cut}` : "") + (r.hcut ? ` · 가로 잘린 것 ${r.hcut}` : "")
    + (r.hscr ? ` · 굴러야 닿는 것 ${r.hscr}` : "")
    + (r.hits && r.hits.length ? `\n        ${r.hits.join(" · ")}` : ""));
}
const off = rows.filter(r => r.off).map(r => r.win + "@" + r.size);
if (off.length) console.log("\n못 연 창:", [...new Set(off.map(x => x.split("@")[0]))].join(" "));
console.log("\n콘솔오류", errs.length, errs.slice(0, 3));
await raw("Target.closeTarget", { targetId });
process.exit(0);
