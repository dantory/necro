/* V-108 자 — **처음 켠 사람에게 「가장 깊이 1층」이라고 말한다.**
   `META.deepest` 의 밑값이 **1** 이라, 던전 문 앞에 서서 아직 한 걸음도 안 뗀 사람의
   화면에 세 자리나 「1층까지 내려가 봤다」가 뜬다 — 마을 머리글 · 「어디부터」 창 ·
   초기화 창. V-99b 에서 눈으로 보고 적어 둔 것을 여기서 잰다.
   V-101 「×1.00」· V-105 「0/0」· V-106 「밝은 0」· V-107 「▲ 14」와 같은 자리다
   ([[carry-fixes-forward]]) — **뜻 없는 수가 화면에서 가장 크게 거짓말한다.**

   ★ **값은 화면이 아니라 «심은 세이브»에서 읽는다** — `META.deepest`·`META.runs` 를 자가
     직접 물어 「이 사람이 정말 안 내려갔는가」를 스스로 판정한 뒤 글월과 견준다.
     화면 글자에서 층수를 되읽으면 자가 제 고침을 되읽는다
     ([[silent-zero-is-not-an-observation]]).
   ★ **세 사람을 잰다.** ① 처음 켠 사람(runs 0 · deepest 1) ② **1층에서 죽고 온 사람**
     (runs 1 · deepest 1) — 이 사람에게 「가장 깊이 1층」은 **맞는 말**이라 그대로여야
     한다(가장 얇은 막이다) ③ 깊이 간 사람(runs 40 · deepest 23) — 과잉 수정 막이.
   ★ 폭 셋을 다 본다(1512×863 · 1366×700 · 1280×620) — 머리글은 좁으면 말을 버리므로
     (`.lw`) **수·뜻이 살아남는지**를 폭마다 본다.
   node tools/v108_deep.mjs [old]                    (old = 옛 결로 되돌려 자를 보정) */
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
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;

/* 「N층까지 내려가 봤다」로 읽히는 글월 — 층수를 **말하는** 자리만 센다.
   구역 카드의 「4~8층」이나 「15층까지 내려가면 열린다」는 **내 기록이 아니라 판의 규칙**
   이므로 안 센다(그래서 「가장 깊이」·「표를 세운 데까지」 뒤에 붙은 것만 본다). */
const 읽기 = `(()=>{
  const t=n=>((n&&n.innerText)||"").replace(/\\s+/g," ").trim();
  const 머리=t(document.getElementById("hLeft"));
  const hl=document.getElementById("hLeft");
  const 머리넘침=hl?Math.max(0,hl.scrollWidth-hl.clientWidth):0;
  const 창=(sel)=>{const n=document.querySelector(sel);
    return (n&&n.classList.contains("on"))?t(n.querySelector(".wBody")||n):null;};
  return { 머리, 머리넘침, dive:창("#winDive"), wipe:창("#winWipe") };})()`;

/* 두 말은 **뜻이 다르다** — 「가장 깊이」는 deepest 와 **똑같아야** 하고,
   「표를 세운 데까지」는 그보다 깊을 수 **없을** 뿐이다(수식은 diveMax 안에 있으니
   여기서 베끼지 않는다 — 베끼면 자와 코드가 갈릴 때 자를 못 믿는다). */
const 층말 = (s) => { const out = []; if (!s) return out; let m;
  const re = /(가장 깊이|표를 세운 데까지)\s*(\d+)\s*층/g;
  while ((m = re.exec(s))) out.push({ 말: m[1], n: +m[2] }); return out; };

const 재기 = async (이름, 씨앗, W, H) => {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await S("Page.reload", { ignoreCache: true }); await wait(1500);
  await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
  await S("Page.reload", { ignoreCache: true }); await wait(2200);
  if (OLD) await ev(`window.__DEEPOLD=1`);
  if (씨앗) await ev(씨앗);
  await wait(400);                                  // 머리글은 매 프레임 그려진다
  /* ★ 자가 **제 손으로** 판정한다 — 화면이 아니라 세이브를 본다. */
  const 세이브 = await ev(`(()=>({deepest:window.META.deepest|0, runs:window.META.runs|0, best:window.META.best|0}))()`);
  const 안내려감 = 세이브.runs === 0 && 세이브.deepest <= 1;
  const a = await ev(읽기);
  await ev(`window.__openWin("dive")`); await wait(500);
  const b = await ev(읽기);
  await ev(`window.__closeAll&&window.__closeAll()`); await wait(120);
  await ev(`window.__openWin("wipe")`); await wait(500);
  const c = await ev(읽기);
  await ev(`window.__closeAll&&window.__closeAll()`); await wait(120);

  const 글 = { 머리: a.머리, dive: b.dive, wipe: c.wipe };
  let 못열림 = (b.dive ? 0 : 1) + (c.wipe ? 0 : 1);
  /* ① 거짓말 — 안 내려간 사람 화면에 「가장 깊이 N층」류가 하나라도 있으면 센다. */
  let 거짓 = 0, 참값틀림 = 0, 뜻없음 = 0;
  for (const [자리, s] of Object.entries(글)) {
    const 층 = 층말(s);
    if (안내려감) 거짓 += 층.length;
    /* ② 참값 — 내려간 사람에게는 **세이브의 수 그대로** 적혀야 한다. */
    else for (const { 말, n } of 층) {
      if (말 === "가장 깊이" ? n !== 세이브.deepest : !(n >= 1 && n <= 세이브.deepest)) 참값틀림++;
    }
    /* ③ 안 내려간 사람에게 **대신 적은 말**이 정말 있는가 — 자리를 통째로 비우면 안 된다. */
    if (안내려감 && s !== null && !/안 내려/.test(s)) 뜻없음++;
  }
  const 머리넘침 = a.머리넘침;
  console.log(`  ${이름} ${W}×${H} — 거짓 ${거짓} · 참값틀림 ${참값틀림} · 대신할 말 없음 ${뜻없음} · 머리글 넘침 ${머리넘침}px · 못 연 창 ${못열림}`);
  console.log(`      머리글: 「${글.머리}」`);
  return { 이름, W, H, 거짓, 참값틀림, 뜻없음, 머리넘침, 못열림, 안내려감 };
};

const 처음 = null;
/* 1층에서 죽고 온 사람 — 「가장 깊이 1층」이 **맞는 말**인 사람. 가장 얇은 막이다. */
const 죽고온 = `(()=>{const M=window.META; M.runs=1; M.deepest=1; window.saveMeta&&window.saveMeta(); return 1;})()`;
const 깊이간 = `(()=>{const M=window.META; M.runs=40; M.deepest=23; M.best=23; M.lv=26; M.gold=90000;
  window.saveMeta&&window.saveMeta(); return 1;})()`;
console.log(OLD ? "── 옛 결(__DEEPOLD) ──" : "── 지금 결 ──");
const 판 = [];
for (const [W, H] of [[1512, 863], [1366, 700], [1280, 620]]) {
  판.push(await 재기("처음 켠 사람  ", 처음, W, H));
  판.push(await 재기("1층에서 죽음 ", 죽고온, W, H));
  판.push(await 재기("깊이 간 사람  ", 깊이간, W, H));
}
const 합 = (k) => 판.reduce((s, r) => s + (r[k] | 0), 0);
const 기록남은사람 = 판.filter(r => !r.안내려감);
const 기록말수 = 기록남은사람.length;
console.log(`\n합계 — 거짓 ${합("거짓")} · 참값틀림 ${합("참값틀림")} · 대신할 말 없음 ${합("뜻없음")} · `
  + `머리글 넘침 ${합("머리넘침")}px · 못 연 창 ${합("못열림")} · 기록이 남아야 할 사람 ${기록말수}/6`);
const 통과 = 합("거짓") === 0 && 합("참값틀림") === 0 && 합("뜻없음") === 0
  && 합("머리넘침") === 0 && 합("못열림") === 0 && 기록말수 === 6;
console.log(통과 ? "판정: 통과" : "판정: 미달");
await raw("Target.closeTarget", { targetId }); bws.close();
process.exit(통과 ? 0 : 1);
