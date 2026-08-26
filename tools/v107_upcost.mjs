/* V-107 자 — **능력치 창의 강화 단추가 «값어치»를 «값»처럼 적는다.**
   「체력 56 ▲ 14」에서 14 는 **금값**인데, 값(`<b>56</b>`) 바로 오른쪽에 ▲(이 게임에서
   「오른다」의 표 · `.tipStat.up`)를 달고 서 있어 **「14 오른다」**로 읽힌다. 정작 오르는
   몫은 25% 다. 게임의 다른 값어치는 어디서나 **「N 금」**이다(좌판 · 대장간 ·
   「다음 재련 20 금」) — 여기만 낱말을 뺐다([[carry-fixes-forward]]).

   ★ **값은 화면이 아니라 «심은 세이브»에서 푼다** — `META.up` 과 UPS 밑값(14·16·22·40)으로
     자가 **제 손으로 다시 셈해** 단추 글자와 견준다. 단추에서 읽으면 자가 제 고침을
     되읽는다([[silent-zero-is-not-an-observation]]). 밑값이 바뀌면 자가 운다 — 그러라고 둔다.
   ★ 두 사람을 잰다: 처음 켠 사람(금 0 · 강화 0)과 **갖춘 사람**(금 5백만 · 군세 강화 25단 →
     값이 「2.3M 금」이라 **상자를 넘는지**의 최악을 여기서 본다). 뒤엣것이 과잉 수정 막이다 —
     살 수 있는 단추는 그대로 금빛이어야 한다.
   ★ 폭 셋을 다 본다(1512×863 · 1366×700 · 1280×620).
   node tools/v107_upcost.mjs [old]                   (old = 옛 결로 되돌려 자를 보정) */
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

/* 자가 제 손으로 푸는 값 — core.js 를 안 부른다(같은 식이 두 곳이면 갈라지는 것을 본다). */
const BASE = { hp: 14, mp: 16, dmg: 22, army: 40 };
const 셈 = (k, n) => Math.round(BASE[k] * Math.pow(1.55, n | 0));
const 줄임 = (v) => { v = Math.max(0, Math.round(v));
  return v < 1000 ? String(v) : v < 10000 ? (v / 1000).toFixed(1).replace(/\.0$/, "") + "k"
       : v < 999500 ? Math.round(v / 1000) + "k" : (v / 1000000).toFixed(1).replace(/\.0$/, "") + "M"; };

const 읽기 = `(()=>{
  const cs=getComputedStyle(document.documentElement);
  const 금빛=cs.getPropertyValue("--gold").trim().toLowerCase();
  const hex=c=>{const m=c.match(/\\d+/g);return m?("#"+m.slice(0,3).map(v=>(+v).toString(16).padStart(2,"0")).join("")):c;};
  const box=document.querySelector("#winStat .sStat:not(.jList)"); if(!box) return null;
  const 단추=[...box.querySelectorAll("button.upBtn")].map(b=>({
    칸:b.getAttribute("data-up"), 글:(b.textContent||"").trim(),
    넘침:b.scrollWidth-b.clientWidth, 색:hex(getComputedStyle(b).color.toLowerCase()),
    막힘:b.disabled }));
  /* 값 칸의 오른끝 — 단추 글월과 아무 상관 없는 자리다(폭이 흔들리면 여기가 어긋난다).
     ★ 좁은 자리에서는 줄이 **두 판**으로 선다(hud.css) — 판마다 따로 모은다.
       한 줄로 뭉쳐 세면 판 사이 거리(287px)를 「어긋남」으로 읽는다. */
  const 판별={};
  for(const row of box.querySelectorAll(".tipStat")){
    const b=row.querySelector("b"); if(!b) continue;
    const k=Math.round(row.getBoundingClientRect().left);
    (판별[k]=판별[k]||[]).push(Math.round(b.getBoundingClientRect().right));
  }
  const 오른끝=Object.values(판별).map(v=>Math.max(...v)-Math.min(...v));
  return { 단추, 오른끝, 금빛, 창밖:(()=>{const w=document.querySelector("#winStat .wBody");
    return w? Math.max(0, w.scrollWidth-w.clientWidth):0;})() };})()`;

const 재기 = async (이름, 씨앗, W, H) => {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await S("Page.reload", { ignoreCache: true }); await wait(1500);
  await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
  await S("Page.reload", { ignoreCache: true }); await wait(2200);
  if (OLD) await ev(`window.__UPCOSTOLD=1`);
  if (씨앗) await ev(씨앗);
  const 세이브 = await ev(`(()=>({gold:window.META.gold|0, up:JSON.parse(JSON.stringify(window.META.up))}))()`);
  await ev(`window.__openWin("stat")`); await wait(600);
  const r = await ev(읽기);
  await ev(`window.__closeAll&&window.__closeAll()`); await wait(120);
  if (!r) { console.log(`  ${이름} ${W}×${H} — 창을 못 찾았다`); return { 이름, W, H, 못읽음: 1 }; }
  const 참값 = {}; for (const k of Object.keys(BASE)) 참값[k] = 셈(k, 세이브.up[k]);
  let 금없음 = 0, 넘침 = 0, 값틀림 = 0;
  for (const b of r.단추) {
    if (!/금/.test(b.글)) 금없음++;
    if (b.넘침 > 1) 넘침++;
    if (!b.글.includes(줄임(참값[b.칸]))) 값틀림++;
  }
  /* 값 오른끝은 줄마다 한 자리여야 한다 — 폭이 흔들리면 여기가 벌어진다.
     ★ 1px 은 옛 결에서도 났다(부분픽셀 반올림) — 늘리지만 않으면 된다. */
  const 어긋남 = r.오른끝.length ? Math.max(...r.오른끝) : 0;
  const 금빛단추 = r.단추.filter(b => !b.막힘 && b.색 === r.금빛.toLowerCase()).length;
  console.log(`  ${이름} ${W}×${H} — 금 없는 단추 ${금없음}/${r.단추.length} · 상자 넘침 ${넘침} · `
    + `값 틀림 ${값틀림} · 값 오른끝 벌어짐 ${어긋남}px(판 ${r.오른끝.length}) · 살 수 있는 금빛 ${금빛단추} · 창밖 ${r.창밖}px`);
  console.log(`      글: ${r.단추.map(b => b.글).join(" | ")}`);
  return { 이름, W, H, 금없음, 넘침, 값틀림, 어긋남, 금빛단추, 창밖: r.창밖, 수: r.단추.length };
};

const 처음 = null;
const 갖춘 = `(()=>{const M=window.META; M.gold=5000000; M.up.army=25; M.up.hp=8; M.up.mp=4; M.up.dmg=12;
  window.saveMeta&&window.saveMeta(); return 1;})()`;
console.log(OLD ? "── 옛 결(__UPCOSTOLD) ──" : "── 지금 결 ──");
const 판 = [];
for (const [W, H] of [[1512, 863], [1366, 700], [1280, 620]]) {
  판.push(await 재기("처음 켠 사람", 처음, W, H));
  판.push(await 재기("갖춘 사람  ", 갖춘, W, H));
}
const 합 = (k) => 판.reduce((s, r) => s + (r[k] | 0), 0);
const 살수있는 = 판.filter(r => r.이름.trim() === "갖춘 사람").reduce((s, r) => s + (r.금빛단추 | 0), 0);
console.log(`\n합계 — 금 없는 단추 ${합("금없음")} · 상자 넘침 ${합("넘침")} · 값 틀림 ${합("값틀림")} · `
  + `값 오른끝 벌어짐 최대 ${Math.max(...판.map(r=>r.어긋남|0))}px · 창밖 ${합("창밖")}px · 갖춘 사람의 금빛 단추 ${살수있는}/12`);
const 통과 = 합("금없음") === 0 && 합("넘침") === 0 && 합("값틀림") === 0
  && 판.every(r => (r.어긋남 | 0) <= 1) && 합("창밖") === 0 && 살수있는 === 12;
console.log(통과 ? "판정: 통과" : "판정: 미달");
await raw("Target.closeTarget", { targetId }); bws.close();
process.exit(통과 ? 0 : 1);
