/* ══ V-111 자 ══ 능력치 창에서 **뜻 없는 「×1.00」이 진짜 값과 똑같이 밝다.**
   처음 켠 사람의 능력치 창은 여섯 줄인데 그 가운데 둘이 `본인 피해 ×1.00` ·
   `소환수 피해 ×1.00` 이다. 마을에서 depthMul=1 · up.dmg=0 · lv=1 · 옵션 없음이라
   **한 번도 뜻을 가진 적이 없는 수**인데, 빛깔은 체력 56 · 마나 40 과 같은 `#c9bda4` 다.

   ★ **같은 창이 이미 셋을 숨기고 있다** — 유해·깊이·금 획득은 「값이 붙었을 때만」 적는다.
     피해 두 줄에만 안 옮겨졌다([[carry-fixes-forward]] · V-101 「×1.00」의 바로 그 못).
   ★ **숨기지 않고 가라앉힌다** — 소환수 피해 줄에는 **강화 단추**가 달려 있어서, 줄을
     지우면 사는 길이 사라진다. V-106 이 배지 0 에 쓴 `.off`(#8a7c60)를 그대로 옮긴다.
   ★ **두 사람을 잰다** — 처음 켠 사람(×1.00 둘)과 갖춘 사람(강화·레벨로 배수가 붙은 사람).
     뒤엣것이 **과잉 수정 막이**다: 진짜 값은 한 톨도 안 가라앉아야 한다.
   ★ **같은 창 안에도 막이가 있다** — 체력·마나·군세·마나 회복 넷은 처음 켠 사람에게도
     진짜 값이라 그대로 밝아야 한다.
   ★ 값은 **화면 글자가 아니라 core.js 함수**에서 읽는다 — 화면에서 되읽으면 자가 제
     고침을 되읽는다([[silent-zero-is-not-an-observation]]). 빛깔도 수를 손으로 안 적고
     `.tipStat b` 의 바탕 빛깔을 **그 창에서 그대로 물어** 견준다.

   쓰기:  node tools/v111_neutral.mjs [old]
          old → window.__NEUTOLD 로 옛 결(전부 밝게)을 되돌려 자가 정말 우는지 보정한다. */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const OLD = process.argv.includes("old");

const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });

/* 줄 하나하나의 이름·값·빛깔. 「밝다」는 손으로 적은 수가 아니라 **바탕 빛깔**과 견준다 —
   `.tipStat b` 의 기본색은 CSS 가 쥐므로, 아무 클래스도 안 붙은 `b` 하나를 그 창 안에
   임시로 세워 그 색을 물어 온다(고치면서 기본색을 바꿔도 자가 안 어긋난다). */
const MEASURE = `(()=>{
  const box=document.querySelector("#statBody .sStat"); if(!box) return {오류:"능력치 창이 없다"};
  const probe=document.createElement("div"); probe.className="tipStat";
  probe.innerHTML="<span class='sN'>x</span><b>x</b>"; probe.style.position="absolute";
  probe.style.visibility="hidden"; box.appendChild(probe);
  const 바탕=getComputedStyle(probe.querySelector("b")).color; probe.remove();
  const 줄=[...box.querySelectorAll(":scope > .tipStat")].map(r=>({
    이름:(r.querySelector(".sN")?.textContent||"").trim(),
    값:(r.querySelector("b")?.textContent||"").trim(),
    색:getComputedStyle(r.querySelector("b")).color,
    단추:!!r.querySelector("button.upBtn"),
  }));
  return { 바탕, 줄, 단추수:box.querySelectorAll("button.upBtn").length };
})()`;

/* 참값은 core.js 함수에서 직접 읽는다 — 화면 글자를 되읽지 않는다. */
const TRUTH = `(()=>{const T=window.__STATTRUTH; return T?T():null})()`;

const 재기 = async (name, seed) => {
  await S("Page.reload", { ignoreCache: true }); await wait(1500);
  await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
  await S("Page.reload", { ignoreCache: true }); await wait(2400);
  if (OLD) await ev(`window.__NEUTOLD=1`);
  if (seed) { await ev(seed); await wait(150); }
  await ev(`window.__openWin("stat")`); await wait(600);
  const m = await ev(MEASURE);
  if (m?.오류) { console.log(`── ${name}: ${m.오류}`); return null; }
  const 참 = await ev(TRUTH);
  const 중립 = v => v === "×1.00";
  const 밝다 = c => c === m.바탕;
  const 뜻없는데밝다 = m.줄.filter(r => 중립(r.값) && 밝다(r.색));
  const 진짜인데가라앉음 = m.줄.filter(r => !중립(r.값) && !밝다(r.색));
  const 빈값 = m.줄.filter(r => !r.값).length;
  console.log(`── ${name}   (줄 ${m.줄.length} · 단추 ${m.단추수} · 바탕 ${m.바탕})`);
  console.log(`   ` + m.줄.map(r => `${r.이름}=${r.값}${밝다(r.색) ? "" : "(가라앉음)"}`).join(" · "));
  if (참) console.log(`   참값: 본인 ${참.self.toFixed(4)} · 소환수 ${참.minion.toFixed(4)} · 깊이 ${참.depth.toFixed(4)}`);
  /* ★ **참값과 어긋나는가** — 「가라앉았다」와 「core.js 가 정말 1 이다」가 같은 말인지
     본다. 글자만 견주면 자가 제 고침을 되읽는다([[silent-zero-is-not-an-observation]]). */
  const 참쌍 = [["본인 피해", 참?.self], ["소환수 피해", 참?.minion]];
  /* 문(old)이 열려 있으면 「가라앉힌다」 자체가 없으므로 이 자는 안 잰다. */
  const 참어긋남 = OLD ? 0 : (참 ? 참쌍.filter(([n, t]) => {
    const r = m.줄.find(x => x.이름 === n); if (!r) return true;
    return (Math.abs(t - 1) < 1e-9) !== !밝다(r.색);
  }).length : -1);
  console.log(`   ★ 뜻 없는데 밝다: ${뜻없는데밝다.length}${뜻없는데밝다.length ? " [" + 뜻없는데밝다.map(r => r.이름).join(", ") + "]" : ""}` +
              `   진짜인데 가라앉음: ${진짜인데가라앉음.length}   값이 빈 줄: ${빈값}   참값과 어긋남: ${OLD ? "문 열림 · 안 잼" : 참어긋남}`);
  return { 뜻없는데밝다: 뜻없는데밝다.length, 진짜인데가라앉음: 진짜인데가라앉음.length,
           빈값, 줄: m.줄.length, 단추: m.단추수, 참, 참어긋남, 줄들: m.줄, 밝다, 바탕: m.바탕 };
};

const a = await 재기("처음 켠 사람 (아무것도 없음)", null);
/* 갖춘 사람 — 강화 셋 · 레벨 다섯이면 dmgMulOf 가 1.36 이라 **두 줄 다 진짜 값**이 된다.
   여기 화면은 한 톨도 안 달라져야 한다(과잉 수정 막이). */
const b = await 재기("갖춘 사람 (강화 3 · Lv.5 · 과잉 수정 막이)",
  `(()=>{const M=window.META; M.up.dmg=3; M.lv=5; return 1})()`);

/* 같은 창 안의 막이 — 처음 켠 사람에게도 진짜인 넷은 그대로 밝아야 한다. */
const 안막이 = a ? ["체력", "마나", "군세", "마나 회복"]
  .map(n => a.줄들.find(r => r.이름 === n))
  .filter(r => r && !a.밝다(r.색)).length : -1;

console.log(`\n── 같은 창 안의 막이 (체력·마나·군세·마나 회복이 가라앉았는가): ${안막이}   (문턱 0)`);
const 통과 = a && b && a.뜻없는데밝다 === 0 && a.진짜인데가라앉음 === 0 && b.뜻없는데밝다 === 0 &&
             b.진짜인데가라앉음 === 0 && a.빈값 === 0 && b.빈값 === 0 && a.줄 === b.줄 &&
             a.단추 === b.단추 && 안막이 === 0 && a.참어긋남 === 0 && b.참어긋남 === 0;
console.log(`판정: ${통과 ? "통과" : "★ 미달"}   (처음 켠 사람 뜻 없는데 밝다 ${a?.뜻없는데밝다} · ` +
            `갖춘 사람 진짜인데 가라앉음 ${b?.진짜인데가라앉음} · 줄 ${a?.줄}/${b?.줄} · 단추 ${a?.단추}/${b?.단추})`);
await S("Target.closeTarget", { targetId });
process.exit(통과 ? 0 : 1);
