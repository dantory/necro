/* V-106 자 — **좌판·대장간 칸 구석의 «0» 배지가 처음 켠 사람에게 가장 밝다.**
   배지 빛깔은 등급색이다(상인 --t0 #d6d0c4 흰색 · 대장간 --t2 #ffff64 노랑). 그런데
   아무것도 안 가진 사람에게 그 값은 **0** 이라, 열 칸 + 넷이 전부 「가장 밝은 0」이 된다.
   D2 에서 칸 구석의 밝은 수는 «가진 물건»의 표시다 — V-102 가 같은 창의 **툴팁**에서
   이미 거둔 거짓말(「없음」이 흰색이라 일반 등급 물건으로 읽힘)과 **같은 못**인데,
   격자에는 안 옮겼다([[carry-fixes-forward]]).

   ★ **값은 화면이 아니라 «심은 세이브»에서 읽는다**(META.equip[k].tier · META.up[k]) —
     고칠 쪽(배지)과 재는 쪽이 갈려야 자가 제 고침을 되읽지 않는다
     ([[silent-zero-is-not-an-observation]]).
   ★ 두 사람을 잰다: 처음 켠 사람(값 0 이 열넷) · 갖춘 사람(값 ≥1 · 과잉 수정 막이).
   ★ 무덤 파기 칸은 처음 켠 사람에게도 값이 1 이다 — **같은 창 안의 막이**다.
   node tools/v106_zeroq.mjs [old]                    (old = 옛 결로 되돌려 자를 보정) */
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
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;

/* 등급 빛깔인가 — 팔레트의 --t0~--t4 를 그대로 물어본다(수를 손으로 안 적는다). */
const MEASURE = (grid, sel) => `(()=>{
  const cs=getComputedStyle(document.documentElement);
  const 등급색=["t0","t1","t2","t3","t4"].map(n=>cs.getPropertyValue("--"+n).trim().toLowerCase());
  const hex=c=>{const m=c.match(/\\d+/g);return m?("#"+m.slice(0,3).map(v=>(+v).toString(16).padStart(2,"0")).join("")):c;};
  const out=[];
  for(const cell of document.querySelectorAll(${JSON.stringify(grid)}+" .cell")){
    const q=cell.querySelector(".q"); if(!q) continue;
    const c=hex(getComputedStyle(q).color.toLowerCase());
    out.push({ 칸:cell.getAttribute("data-pick")||cell.getAttribute("data-fpick")||"?",
               글:(q.textContent||"").trim(), 색:c, 밝다:등급색.includes(c) });
  }
  return out;})()`;

const 재기 = async (name, seed) => {
  await S("Page.reload", { ignoreCache: true }); await wait(1500);
  await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
  await S("Page.reload", { ignoreCache: true }); await wait(2200);
  if (OLD) await ev(`window.__ZEROQOLD=1`);
  if (seed) await ev(seed);
  /* ★ 값은 세이브에서 읽는다 — 배지에서 읽으면 자가 제 고침을 되읽는다 */
  const 참값 = await ev(`(()=>{const M=window.META,o={};
    for(const k of Object.keys(M.equip)) o[k]=(M.equip[k]?.tier)|0;
    for(const k of Object.keys(M.up)) o["up:"+k]=M.up[k]|0; return o;})()`);
  await ev(`window.__openWin("shop")`); await wait(500);
  const 좌판 = await ev(MEASURE("#shopGrid"));
  await ev(`window.__closeAll&&window.__closeAll()`); await wait(150);
  await ev(`window.__openWin("forge")`); await wait(500);
  const 대장간 = await ev(MEASURE("#forgeGrid"));
  await ev(`window.__closeAll&&window.__closeAll()`); await wait(150);

  const 다 = [...좌판.map(r => ({ ...r, 참: r.칸 === "dig" ? 1 : (참값[r.칸] | 0) })),
             ...대장간.map(r => ({ ...r, 참: 참값["up:" + r.칸] | 0 }))];
  const 밝은0 = 다.filter(r => r.참 === 0 && r.밝다).length;
  const 가라앉은진짜 = 다.filter(r => r.참 >= 1 && !r.밝다).length;
  const 수사라짐 = 다.filter(r => !/^\d+$/.test(r.글)).length;
  console.log(`── ${name}   (배지 ${다.length})`);
  console.log(`   값 0 인 칸 ${다.filter(r => r.참 === 0).length} · 값 ≥1 인 칸 ${다.filter(r => r.참 >= 1).length}`);
  console.log(`   ★ 밝은 0: ${밝은0}   가라앉은 진짜 값: ${가라앉은진짜}   수가 사라진 배지: ${수사라짐}`);
  console.log(`   빛깔: ` + 다.map(r => `${r.칸}=${r.글}${r.밝다 ? "" : "(가라앉음)"}`).join(" "));
  return { 밝은0, 가라앉은진짜, 수사라짐, n: 다.length };
};

const a = await 재기("처음 켠 사람 (아무것도 없음)", null);
/* 갖춘 사람 — 열 칸 다 2등급 · 강화 넷 다 3단계. 여기 화면은 **한 톨도 안 달라져야 한다.** */
const b = await 재기("갖춘 사람 (장비 2등급 · 강화 3단계)",
  `(()=>{const M=window.META;
     for(const k of Object.keys(M.equip)) M.equip[k]={k,tier:2,il:12,af:[],v:0};
     for(const k of Object.keys(M.up)) M.up[k]=3; return 1})()`);

const ok = a.밝은0 === 0 && a.가라앉은진짜 === 0 && a.수사라짐 === 0 &&
           b.밝은0 === 0 && b.가라앉은진짜 === 0 && b.수사라짐 === 0 && a.n === 15 && b.n === 15;
console.log(`\n판정: 처음 켠 사람 밝은 0 ${a.밝은0}(문턱 0) · 갖춘 사람 가라앉은 진짜 값 ${b.가라앉은진짜}(문턱 0) · ` +
            `수는 그대로 ${a.수사라짐 + b.수사라짐 === 0 ? "있다" : "★ 사라졌다"} → ${ok ? "통과" : "미달"}`);
await raw("Target.closeTarget", { targetId }); bws.close();
process.exit(ok ? 0 : 1);
