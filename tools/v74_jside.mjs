/* **일지가 몇 줄이나 «온전히» 보이는가** — V-74.
     node tools/v74_jside.mjs [폭 높이]   (안 주면 PC 네 크기를 다 돈다)

   V-73 이 수치를 인물 옆에 세우자 둘째 칸 **아래가 통째로 비었다**(빈틈 123~154px).
   그런데 일지는 인물 «밑»에서 시작해 남은 26~126px 안에 431px 를 밀어 넣고 있었다.

   ★ **높이로 재면 안 된다.** 옆으로 옮기면 일지가 받는 폭이 649 → 274~390px 로 줄어
     설명줄이 접힌다 — 「보이는 높이」는 늘었는데 **읽을 수 있는 줄은 줄 수도** 있다.
     그래서 묻는 것은 **온전히 보이는 줄 수**다([[threshold-and-ruler-must-match]]).
     ★ 「보임 높이」도 같이 찍는다 — 판정은 안 하되 왜 그런지가 남는다.
   ★ 밑자락 그늘(`.wScroll::after` 34px)까지 뺀 자리를 「보인다」로 친다 — 네모만 재면
     통과인데 눈에는 덮여 있다(V-24 에서 겪었다 · [[silent-zero-is-not-an-observation]]).
   ★ 한쪽을 밀면 반대쪽이 온다([[equilibrium-pushes-back]]) — **수치·인물이 안 밀렸는지**
     를 같이 묻는다(칸 크기 · 수치폭 · 밑자락 넘김).
   ★ **문턱은 「적어도 한 줄」이다.** 상자가 제일 낮은 1366×768 에서는 일지에 돌아오는
     자리가 123px 뿐이라(수치 217 을 뺀 나머지) 줄 하나가 한계다 — 「+2」 같은 수를
     걸면 고칠 수 없는 것을 자가 계속 붉게 운다. 잰 바닥은 **네 크기 모두 0** 이고,
     문턱 1 은 그 바닥에서 떨어져 있다([[floor-far-from-threshold]]).
   ★ 전/후를 같은 판에서 견준다 — `window.__NOJSIDE=true` 면 「전」이다.
     「전」의 온전한 줄이 2 를 넘으면 **미달**을 낸다(옛 꼴을 못 세운 것이니 값을 안 믿는다
     · 양성 씨앗 · [[floor-far-from-threshold]] — 잰 바닥은 0~1 이고 문턱은 2 다). */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const SIZES = process.argv[2] ? [[+process.argv[2], +(process.argv[3] || 800)]]
                              : [[1512, 863], [1440, 900], [1366, 768], [1280, 800]];
const NUMS_MIN = 240, OLD_MAX_ROWS = 2, WANT_MIN_ROWS = 1;

const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "?").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.value;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: SIZES[0][0], height: SIZES[0][1], deviceScaleFactor: 2, mobile: false });
await wait(4200);
/* 채워 놓고 잰다 — 빈 칸은 표본이 아니다([[probe-must-walk-the-real-path]]). */
await ev(`(()=>{const M=window.META; M.lv=40; M.bag=[];
  for(const k of (window.__GEAR_KEYS||[])) M.equip[k]={k, tier:2, af:[{id:"dmg",v:12}]};
  window.saveMeta();})()`);

const READ = `(()=>{
  const b=document.getElementById("statBody");
  const d=b&&b.querySelector(".pdoll"), n=b&&b.querySelector(".sStat:not(.jList)"), j=b&&b.querySelector(".jList");
  if(!b||!d||!j) return JSON.stringify({없음: !b?"statBody": !d?"pdoll":"jList"});
  const moreH=parseFloat(getComputedStyle(b,"::after").height)||34;
  const bb=b.getBoundingClientRect(), lim=bb.bottom-moreH+0.5;
  const db=d.getBoundingClientRect(), nb=n?n.getBoundingClientRect():{width:0,height:0,bottom:db.top};
  const rows=[...j.querySelectorAll(".jRow")];
  const rb=rows.map(r=>r.getBoundingClientRect());
  /* 「온전히 보인다」 = 줄 전체가 상자 안이고 밑자락 그늘 위다 */
  const 온전=rb.filter(r=>r.top>=bb.top-0.5 && r.bottom<=lim).length;
  const 잘린=rb.filter(r=>r.top<lim-1 && r.bottom>lim+1).length;
  /* 접힘 — 이름(.jN) 이나 설명(.jD) 이 제 줄높이의 1.5 배를 넘으면 접힌 것이다 */
  const 접힘=rows.filter(r=>[...r.querySelectorAll(".jN,.jD")].some(t=>{
      const lh=parseFloat(getComputedStyle(t).lineHeight)||14;
      return t.getBoundingClientRect().height > lh*1.5; })).length;
  return JSON.stringify({
    결: b.classList.contains("jSide") ? "옆" : b.classList.contains("sideBySide") ? "밑" : "옛결",
    칸: Math.round(parseFloat(getComputedStyle(d).getPropertyValue("--pdS"))||0),
    수치폭:+nb.width.toFixed(1), 수치넘김:+(nb.bottom-lim).toFixed(1), 인물넘김:+(db.bottom-lim).toFixed(1),
    일지폭:+j.getBoundingClientRect().width.toFixed(1),
    일지보임:Math.max(0,Math.round(Math.min(lim,j.getBoundingClientRect().bottom)-Math.max(bb.top,j.getBoundingClientRect().top))),
    온전:온전, 잘린:잘린, 접힘:접힘, 줄수:rows.length,
  });})()`;

let bad = 0;
const say = (ok, s) => { if (!ok) bad++; console.log(`${ok ? "PASS" : "FAIL"}  ${s}`); };
for (const [W, H] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
  const t = `${W}×${H}`;
  const look = async (old) => {
    await ev(`window.__NOJSIDE=${old ? "true" : "false"};
              window.__closeAll&&window.__closeAll(); window.__openWin("stat");`);
    await wait(700);
    return JSON.parse(await ev(READ));
  };
  const 전 = await look(true), 후 = await look(false);
  if (전.없음 || 후.없음) { say(false, `${t}: ${전.없음 || 후.없음}`); continue; }
  const line = r => `${r.결} · 온전 ${r.온전}/${r.줄수} · 잘린 ${r.잘린} · 접힘 ${r.접힘} · 일지 ${r.일지폭}px 보임 ${r.일지보임} · 칸 ${r.칸} · 수치폭 ${r.수치폭} 넘김 ${r.수치넘김} · 인물넘김 ${r.인물넘김}`;
  console.log(`      ${t} 전: ${line(전)}`);
  console.log(`      ${t} 후: ${line(후)}`);
  if (후.결 !== "옆") { console.log(`      ${t}: 폭이 모자라 옛 결이다 — 전과 같아야 한다`);
    say(전.결 === 후.결 && 전.온전 === 후.온전, `${t}: 물러난 자리가 전과 같다`); continue; }
  say(전.온전 <= OLD_MAX_ROWS, `${t}: 「전」이 옛 꼴로 섰다 (온전한 줄 ${전.온전} ≤ ${OLD_MAX_ROWS})`);
  say(후.온전 > 전.온전, `${t}: 온전히 보이는 줄이 늘었다 (${전.온전} → ${후.온전})`);
  say(후.온전 >= WANT_MIN_ROWS, `${t}: 굴리지 않고도 한 줄은 읽힌다 (${후.온전} ≥ ${WANT_MIN_ROWS})`);
  say(후.칸 === 전.칸, `${t}: 인물 칸이 안 밀렸다 (${전.칸} → ${후.칸})`);
  say(후.수치폭 >= NUMS_MIN - 0.5, `${t}: 수치판이 안 눌렸다 (${후.수치폭} ≥ ${NUMS_MIN})`);
  say(후.수치넘김 <= 0.5, `${t}: 수치가 다 보인다 (넘김 ${후.수치넘김})`);
  say(후.인물넘김 <= 0.5, `${t}: 인물이 다 보인다 (넘김 ${후.인물넘김})`);
}
say(errs.length === 0, `콘솔 예외 0 (${errs.slice(0, 2).join(" | ") || "없음"})`);
console.log(bad ? `\n✗ 일지 자리: ${bad} 곳 틀림` : `\n✓ 일지 자리: 전부 통과`);
await raw("Target.closeTarget", { targetId });
process.exit(bad ? 1 : 0);
