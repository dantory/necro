/* V-95 자 — **판이 끝나고 보는 창의 «글»을 잰다**(정산 · 그동안).
   ① 네 자리가 넘는 수에는 자릿점이 있어야 한다 — 한 줄 안에서 「금 +13,640」과
      「경험치 +8420」이 갈리면 그 줄은 표가 아니라 흐트러진 낱말이 된다.
   ② 「N시간 0분」이 없어야 한다 — 상한(480분)에 걸린 판은 **언제나** 분이 0 이라
      밤새 껐다 켠 사람이 늘 보는 줄이 그것이었다.
   ③ 존댓말이 없어야 한다 — 이 세계의 말투는 「~다」다(「쌓입니다」 한 줄만 튀었다).
   node tools/v95_text.mjs [old]     old = 고치기 전 글로 짜서 자가 정말 우는지 본다 */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const OLD = process.argv[2] === "old";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;

const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1, diveTold: 1,
  up: {}, plus: {}, equip: {}, bag: [], tree: {}, quests: {}, relics: 3, rebirths: 1, best: 52,
  lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2200);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(2000);

/* 값은 **자릿점이 필요한 크기**로 박는다 — 세 자리로 재면 어느 결이든 통과한다
   ([[floor-far-from-threshold]] · 바닥이 문턱에서 멀면 그 수는 눈금이 아니다). */
await ev(`(()=>{const R=window.__LASTRUN;
  Object.assign(R,{floor:52,from:26,dead:true,killed:1284,gold:13640,xp:8420,leveled:true,
    summoned:4120,used:3890,secs:734,loot:[]});
  window.__openWin("end");})()`); await wait(600);
/* 상한에 걸리고 창고도 찬 갈래 — 줄이 가장 많다. corpses 는 «번 것», corpsesIn 은 «실린 것». */
await ev(`(()=>{window.__lastOffline={min:480,gold:24800,corpses:312,corpsesIn:140,
  corpseFull:true,capped:true}; window.__openWin("offline");})()`); await wait(600);

if (OLD) await ev(`(()=>{
  const R=window.__LASTRUN, o=window.__lastOffline;
  document.getElementById("endSub").innerHTML =
    '<div class="eWhere">'+R.floor+'층에서 쓰러짐</div><div class="eTally">'
    +'<span>잡은 수 <b>'+R.killed+'</b></span><span>금 <b>+'+R.gold.toLocaleString()+'</b></span>'
    +'<span>경험치 <b>+'+R.xp+'</b></span><span><b class="t2">레벨 업!</b></span></div>';
  const hrs=Math.floor(o.min/60), mins=o.min%60;
  document.getElementById("offBody").innerHTML =
    '<div class="tip"><div class="tipStat">그동안 <b>'+hrs+'시간 '+mins+'분</b> 자리를 비웠다</div>'
    +'<div class="tipStat">금 <b>+'+o.gold.toLocaleString()+'</b></div>'
    +'<div class="tipStat">시체 <b>+'+o.corpsesIn.toLocaleString()+'</b></div>'
    +'<div class="tipStat dim">8시간까지만 쌓입니다</div></div>';})()`);

/* ★ 통 하나의 textContent 로 읽지 않는다 — 줄과 줄이 «붙어» 「시체 +140」과 「8시간」이
   `1408` 이라는 **없는 수**로 읽혔다(old 결에서 실제로 그랬다 · [[silent-zero-is-not-an-observation]]).
   줄마다 따로 읽어 「 · 」로 잇는다. */
const txt = await ev(`(()=>{const line=(id)=>{const r=document.getElementById(id); if(!r) return "";
    const kids=[...r.querySelectorAll("div")].filter(d=>!d.querySelector("div"));
    const src=kids.length?kids:[r];
    return src.map(d=>(d.textContent||"").replace(/\\s+/g," ").trim()).filter(Boolean).join(" · ");};
  return {end:line("endSub"), off:line("offBody")};})()`);
await raw("Target.closeTarget", { targetId });

const bad = [];
for (const [name, t] of Object.entries({ "정산": txt.end, "그동안": txt.off })) {
  console.log(name.padEnd(6), t);
  /* ① 자릿점 — 앞뒤로 숫자·쉼표·콜론이 붙지 않은 «네 자리 이상» 덩이를 찾는다
     (12:14 같은 시각과 「0/7」 같은 분수는 걸리면 안 된다). */
  for (const m of t.matchAll(/(?<![\d,:\/])\d{4,}(?![\d,:\/])/g)) bad.push(`${name} 자릿점 없음 「${m[0]}」`);
  if (/\d+시간\s*0분/.test(t)) bad.push(`${name} 「N시간 0분」`);
  for (const m of t.matchAll(/[가-힣]*(?:습니다|입니다|세요)/g)) bad.push(`${name} 존댓말 「${m[0]}」`);
}
console.log(bad.length ? bad.map(b => "  ✗ " + b).join("\n") : "  ✓ 셋 다 통과");
console.log(`v95_text ${OLD ? "(old)" : ""} · 미달 ${bad.length}`);
process.exit(bad.length ? 1 : 0);
