/* **납작한 칸이 읽을 만한가** — V-71b(발견): 낮은 창에서 허리띠가 14.5px 이라 안 읽힌다.
     node tools/v72_belt.mjs [폭 높이]   (안 주면 PC 네 크기를 다 돈다)

   ★ 자가 재는 것은 셋이다:
     ① 허리띠 칸의 **짧은 변**(≥16px 이어야 읽힌다 — doll_shape 와 같은 문턱)
     ② 허리띠가 선 **줄의 높이**(= 같은 줄의 방패 칸). 허리띠에 바닥을 두면 여기가
        늘어나는지가 「고쳐도 되는가」를 가른다 — 안 늘면 공짜다.
     ③ 인물 전체 높이와 **넘침**. ②가 안 늘어도 여기서 울면 딴 데를 민 것이다
        ([[equilibrium-pushes-back]]).
   ★ 전/후를 같은 판에서 견준다 — `--pdBeltMin:0px` 를 걸면 「전」이다. */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const SIZES = process.argv[2] ? [[+process.argv[2], +(process.argv[3] || 800)]]
                              : [[1512, 863], [1440, 900], [1280, 800], [1280, 620]];
const MIN_SIDE = 16;

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
  const cell=k=>{ const s=doll.querySelector(".pd-"+k); if(!s) return null;
    const g=(s.querySelector(".cell")||s).getBoundingClientRect();
    return {w:+g.width.toFixed(1), h:+g.height.toFixed(1)}; };
  const body=doll.closest(".wScroll")||doll.parentElement;
  return JSON.stringify({
    pdS: getComputedStyle(doll).getPropertyValue("--pdS").trim()||"(없음)",
    집: doll.closest("#statBody") ? "능력치" : doll.closest("#bagBody") ? "가방" : "?",
    수치먼저: document.body.querySelector("#statBody.numsFirst") ? "예" : "아니오",
    belt: cell("belt"), shield: cell("shield"), helm: cell("helm"),
    돌높이: +doll.getBoundingClientRect().height.toFixed(1),
    넘침: Math.max(0, (body.scrollHeight||0)-(body.clientHeight||0)),
  });
})()`;

let bad = 0;
const say = (ok, s) => { if (!ok) bad++; console.log(`${ok ? "PASS" : "FAIL"}  ${s}`); };

for (const [W, H] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
  const t = `${W}×${H}`;
  const shot = async (old) => {
    await ev(`document.documentElement.style.setProperty("--pdBeltMin", ${old ? '"0px"' : '""'});
              window.__closeAll&&window.__closeAll(); window.__openWin("bag");`);
    await wait(700);
    return JSON.parse(await ev(READ));
  };
  const 전 = await shot(true), 후 = await shot(false);
  if (전.없음 || 후.없음) { say(false, `${t}: pdoll 이 없다`); continue; }
  const line = (r) => `칸 ${r.pdS} · ${r.집}${r.수치먼저==="예"?"(수치먼저)":""} · 허리띠 ${r.belt.w}×${r.belt.h} · 방패줄 ${r.shield.h} · 돌 ${r.돌높이} · 넘침 ${r.넘침}`;
  console.log(`      ${t} 전: ${line(전)}`);
  console.log(`      ${t} 후: ${line(후)}`);
  say(Math.min(후.belt.w, 후.belt.h) >= MIN_SIDE,
      `${t}: 허리띠가 읽을 만하다 (${Math.min(후.belt.w, 후.belt.h)}px ≥ ${MIN_SIDE})`);
  say(후.shield.h <= 전.shield.h + 0.5,
      `${t}: 허리띠 줄이 안 늘었다 (방패줄 ${전.shield.h} → ${후.shield.h})`);
  say(후.돌높이 <= 전.돌높이 + 0.5,
      `${t}: 인물이 안 커졌다 (${전.돌높이} → ${후.돌높이})`);
  say(후.넘침 <= 전.넘침, `${t}: 넘침이 안 늘었다 (${전.넘침} → ${후.넘침})`);
}
say(errs.length === 0, `콘솔 예외 0 (${errs.slice(0, 2).join(" | ") || "없음"})`);
console.log(bad ? `\n✗ 허리띠: ${bad} 곳 틀림` : `\n✓ 허리띠: 전부 통과`);
await raw("Target.closeTarget", { targetId });
process.exit(bad ? 1 : 0);
