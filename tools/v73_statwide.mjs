/* **「능력치」 창이 제 폭을 쓰는가** — V-73.
     node tools/v73_statwide.mjs [폭 높이]   (안 주면 PC 네 크기를 다 돈다)

   ★ 자가 재는 것은 넷이다:
     ① **인물이 선 줄에 남는 빈 폭.** 처음엔 「인물 덩어리 / 상자 폭」으로 쟀는데
        그 자로는 고친 쪽이 되레 나빠 보였다 — 수치판이 옆으로 오면 인물은 그대로인데
        분모만 같으니 비율이 안 움직인다. 묻는 것은 「인물이 폭을 먹었나」가 아니라
        **「그 줄이 비었나」**다([[threshold-and-ruler-must-match]]).
        빈 폭 = 상자폭 − (덩어리폭 + gap + 수치폭[옆에 섰을 때만]).
     ② 인물 칸(--pdS). 옆에 세우면 세로가 남으니 **커져야** 한다 — 안 커지면
        옆으로 옮긴 값어치가 없다. 이것이 사람 눈에 보이는 그 수다.
     ③ 수치판의 폭이 SBS_NUMS_MIN(240) 아래로 안 눌리는가 · 수치판이 **다 보이는가**
        (밑자락 그늘 34px 위까지) · **줄이 안 접히는가** · **오른쪽이 안 잘리는가**.
        한쪽을 밀면 반대쪽이 온다([[equilibrium-pushes-back]]).
        ★ 접힘·잘림은 처음 자에 없었다 — 「넘침 0」만 보고 통과를 냈는데 찍어 보니
          「소환수 / 피해」가 두 줄로 접히고 ▲6.6k 가 오른쪽에서 잘려 있었다
          ([[play-it-before-measuring-it]] · 자를 믿기 전에 켜서 본다).
     ④ **인물도 다 보이는가.** 옆에 세우면 넘치는 것이 수치가 아니라 인물일 수 있다 —
        하나만 물으면 「넘침 0」이라 하고 다리가 잘린다([[silent-zero-is-not-an-observation]]).
   ★ 전/후를 같은 판에서 견준다 — `window.__NOSBS=true` 면 「전」이다.
   ★ 「전」의 쓴비율이 50%를 넘으면 **미달**을 낸다 — 옛 꼴을 못 세운 것이니 잰 값을
     안 믿는다(양성 씨앗 · [[floor-far-from-threshold]]). */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const SIZES = process.argv[2] ? [[+process.argv[2], +(process.argv[3] || 800)]]
                              : [[1512, 863], [1440, 900], [1366, 768], [1280, 800], [1280, 620]];
const NUMS_MIN = 240, OLD_MIN_EMPTY = 250;   /* 「전」은 인물 줄이 250px 넘게 비어 있어야 옛 꼴이다 */

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
  const vis=el=>{ if(!el) return false; const g=el.getBoundingClientRect(); return g.width>1&&g.height>1; };
  const doll=[...document.querySelectorAll(".win.on .pdoll")].find(vis);
  if(!doll) return JSON.stringify({없음:"pdoll"});
  const body=document.getElementById("statBody");
  if(!doll.closest("#statBody")) return JSON.stringify({없음:"인물이 능력치 창에 없다"});
  const nums=body.querySelector(".sStat:not(.jList)");
  const bx=body.getBoundingClientRect(), db=doll.getBoundingClientRect();
  const 옆=body.classList.contains("sideBySide");
  const nb=nums?nums.getBoundingClientRect():{width:0,bottom:0};
  const gap=parseFloat(getComputedStyle(body).columnGap)||0;
  const moreH=parseFloat(getComputedStyle(body,"::after").height)||34;
  const lim=bx.bottom-moreH;
  return JSON.stringify({
    칸: Math.round(parseFloat(getComputedStyle(doll).getPropertyValue("--pdS"))||0),
    상자폭:+bx.width.toFixed(1), 덩어리폭:+db.width.toFixed(1),
    빈폭:+(bx.width - db.width - (옆 ? gap + nb.width : 0)).toFixed(1),
    수치폭: nums?+nums.getBoundingClientRect().width.toFixed(1):null,
    수치넘김: nums?+(nums.getBoundingClientRect().bottom-lim).toFixed(1):null,
    인물넘김:+(db.bottom-lim).toFixed(1),
    /* 줄이 접히면 그 줄의 높이가 한 줄 높이의 1.5배를 넘는다 */
    접힌줄: nums ? [...nums.querySelectorAll(".tipStat")].filter(r=>{
        const lh=parseFloat(getComputedStyle(r).lineHeight)||16;
        return r.getBoundingClientRect().height > lh*1.5; }).length : 0,
    /* 오른쪽이 잘리는가 — 줄 안의 어느 조각이든 판 바깥으로 나가면 잘린 것이다 */
    잘린줄: nums ? [...nums.querySelectorAll(".tipStat")].filter(r=>{
        const R=nums.getBoundingClientRect().right - parseFloat(getComputedStyle(nums).paddingRight)+0.5;
        return [...r.children].some(c=>c.getBoundingClientRect().right > R); }).length : 0,
    결: body.classList.contains("sideBySide") ? "옆" : body.classList.contains("numsFirst") ? "수치먼저" : "위아래",
  });})()`;

let bad = 0;
const say = (ok, s) => { if (!ok) bad++; console.log(`${ok ? "PASS" : "FAIL"}  ${s}`); };

for (const [W, H] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
  const t = `${W}×${H}`;
  const look = async (old) => {
    await ev(`window.__NOSBS=${old ? "true" : "false"};
              window.__closeAll&&window.__closeAll(); window.__openWin("stat");`);
    await wait(700);
    return JSON.parse(await ev(READ));
  };
  const 전 = await look(true), 후 = await look(false);
  if (전.없음 || 후.없음) { say(false, `${t}: ${전.없음 || 후.없음}`); continue; }
  const line = r => `칸 ${r.칸} · ${r.결} · 덩어리 ${r.덩어리폭}/${r.상자폭} · 인물줄 빈폭 ${r.빈폭} · 수치폭 ${r.수치폭} · 넘김 수치 ${r.수치넘김} 인물 ${r.인물넘김} · 접힌줄 ${r.접힌줄} 잘린줄 ${r.잘린줄}`;
  console.log(`      ${t} 전: ${line(전)}`);
  console.log(`      ${t} 후: ${line(후)}`);
  say(전.빈폭 >= OLD_MIN_EMPTY, `${t}: 「전」이 옛 꼴로 섰다 (인물줄 빈폭 ${전.빈폭} ≥ ${OLD_MIN_EMPTY})`);
  if (후.결 === "옆") {
    say(후.빈폭 <= 전.빈폭 * .25, `${t}: 인물 줄이 안 빈다 (빈폭 ${전.빈폭} → ${후.빈폭})`);
    say(후.칸 > 전.칸, `${t}: 인물이 커졌다 (칸 ${전.칸} → ${후.칸})`);
    say(후.수치폭 >= NUMS_MIN - 0.5, `${t}: 수치판이 안 눌렸다 (${후.수치폭} ≥ ${NUMS_MIN})`);
    say(후.수치넘김 <= 0.5, `${t}: 수치가 다 보인다 (넘김 ${후.수치넘김})`);
    say(후.인물넘김 <= 0.5, `${t}: 인물이 다 보인다 (넘김 ${후.인물넘김})`);
    say(후.접힌줄 <= 전.접힌줄, `${t}: 수치 줄이 안 접힌다 (${전.접힌줄} → ${후.접힌줄})`);
    say(후.잘린줄 <= 전.잘린줄, `${t}: 수치가 오른쪽에서 안 잘린다 (${전.잘린줄} → ${후.잘린줄})`);
  } else {
    console.log(`      ${t}: 폭이 모자라 옛 결로 물러났다 — 전과 같아야 한다`);
    say(후.칸 === 전.칸 && 후.결 === 전.결, `${t}: 물러난 자리가 전과 같다 (${전.결}/${전.칸} → ${후.결}/${후.칸})`);
  }
}
say(errs.length === 0, `콘솔 예외 0 (${errs.slice(0, 2).join(" | ") || "없음"})`);
console.log(bad ? `\n✗ 능력치 폭: ${bad} 곳 틀림` : `\n✓ 능력치 폭: 전부 통과`);
await raw("Target.closeTarget", { targetId });
process.exit(bad ? 1 : 0);
