/* V-97 — **화면에 떠 있는 수의 «자릿점»을 한 자로 잰다.**
   V-95 가 정산·그동안·초기화 세 창에서 「금 +13,640 대 경험치 +8420」을 잡았다.
   그런데 그 못은 **그 세 창에만** 박혔다 — 사람이 가장 오래 보는 «전장 HUD» 와
   마을 HUD 는 안 봤다([[carry-fixes-forward]]).
   네 자리 이상인데 자릿점이 없는 수를 **눈에 보이는 줄에서만** 센다.
   node tools/v97_digits.mjs [old]     (old = 고치기 전 결로 짜서 자를 보정한다) */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const OLD = process.argv[2] === "old";
const W = 1512, H = 863;
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
await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;

const it = (k, tier, af) => ({ k, tier, af });
/* 「몇 시간 논 사람」 — 수가 커진 뒤라야 자릿점이 뜻을 갖는다 */
const meta = { gold: 182400, lv: 26, xp: 1720, deepest: 52, runs: 6, dive: 1, diveSet: 1, diveTold: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: it("wand", 3, [{ id: "dmg", v: 22 }]), robe: it("robe", 3, [{ id: "hp", v: 88 }]),
           charm: it("charm", 2, [{ id: "mdmg", v: 18 }]) },
  bag: [], tree: {}, quests: {}, relics: 3, rebirths: 1, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2400);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(2000);
/* 옛 결 — 자가 정말 우는지 먼저 본다. 고침이 쓰는 `nfmt` 를 날것으로 되돌린다. */
if (OLD) await ev(`window.__NFMT_OLD = 1;`);

/* «보이는 줄»만 센다 — display:none · visibility:hidden · 화면 밖은 뺀다.
   글자 마디마다 따로 읽는다: 통으로 읽으면 줄과 줄이 붙어 «없는 수»가 생긴다
   ([[silent-zero-is-not-an-observation]] · V-95 에서 1408 을 지어냈다). */
const SCAN = `(()=>{
  const bad=[]; const seen=new Set();
  const vis=e=>{ for(let n=e;n&&n!==document.body;n=n.parentElement){
    const c=getComputedStyle(n); if(c.display==="none"||c.visibility==="hidden"||c.opacity==="0") return false; }
    const b=e.getBoundingClientRect(); return b.width>0&&b.height>0&&b.top<innerHeight&&b.bottom>0; };
  const wk=document.createTreeWalker(document.getElementById("app")||document.body,NodeFilter.SHOW_TEXT);
  for(let n;(n=wk.nextNode());){
    const t=(n.nodeValue||"").trim(); if(!t) return_if_empty: if(!t) continue;
    const p=n.parentElement; if(!p||!vis(p)) continue;
    /* 앞뒤가 숫자·자릿점이 아닌 «네 자리 이상 맨숫자» */
    const m=t.match(/(?<![\\d,.])\\d{4,}(?![\\d,.])/g); if(!m) continue;
    for(const s of m){ const k=(p.id||p.className||p.tagName)+"|"+s;
      if(seen.has(k)) continue; seen.add(k);
      bad.push({ where:(p.id||p.className||p.tagName), num:s, line:t.slice(0,42) }); } }
  return bad;})()`;

const step = async (name) => {
  const bad = await ev(SCAN);
  console.log(name.padEnd(12), bad.length ? "★ " + bad.length : "통과",
    bad.map(b => `${b.where}:${b.num}「${b.line}」`).join(" | "));
  return bad.length;
};
let n = 0;
n += await step("마을");
await ev(`window.__toDungeon()`); await wait(9000);
n += await step("전장");
/* 창 셋 — V-95 가 고친 자리가 그대로인지도 같은 자로 본다(되돌아가지 않게) */
await ev(`(()=>{const R=window.__LASTRUN; Object.assign(R,{floor:52,from:26,dead:true,
  killed:1284,gold:13640,xp:8420,leveled:true,summoned:412,used:389,secs:734,loot:[]});
  window.__openWin("end");})()`); await wait(600);
n += await step("정산");
await ev(`(()=>{document.querySelectorAll(".win.on").forEach(w=>w.classList.remove("on"));
  window.__lastOffline={min:480,gold:24800,corpses:312,corpsesIn:140,corpseFull:true,capped:true};
  window.__openWin("offline");})()`); await wait(600);
n += await step("그동안");
/* 나머지 덮는 창 여덟 — V-93·V-94 가 «눈»으로 본 자리를 이번엔 «자»로 본다.
   마을로 돌아가서 연다(전장에서는 안 열리는 창이 있다). */
await ev(`(()=>{document.querySelectorAll(".win.on").forEach(w=>w.classList.remove("on"));
  window.__toTown&&window.__toTown();})()`); await wait(1200);
for (const [k, nm] of [["stat","능력치"],["bag","가방"],["shop","상인"],["forge","대장간"],
                       ["tree","트리"],["tactic","편성"],["doctrine","운용"],["reborn","환생"],
                       ["dive","어디부터"],["wipe","초기화"]]) {
  const ok = await ev(`(()=>{document.querySelectorAll(".win.on").forEach(w=>w.classList.remove("on"));
    window.__openWin(${JSON.stringify(k)});
    const w=document.getElementById("win"+${JSON.stringify(k)}[0].toUpperCase()+${JSON.stringify(k)}.slice(1));
    return !!(w&&w.classList.contains("on"));})()`);
  await wait(450);
  if (!ok) { console.log(nm.padEnd(12), "★ 안 열렸다 — 이 창은 안 재졌다"); n += 1; continue; }
  n += await step(nm);
}
console.log(n === 0 ? "판정: 통과(문턱 0)" : `판정: 미달 ${n}`);
await raw("Target.closeTarget", { targetId });
process.exit(n === 0 ? 0 : 1);
