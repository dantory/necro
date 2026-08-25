/* **가방창의 인물이 통째로 보이는가** — 병수님 2026-08-17: 페이퍼 돌의 아래 칸
   (신발·반지)이 창 밖으로 나가 있었다(넘침 94px @1512×863). 「아래에 더 있다」 표시(▾)가
   뜨긴 했지만 **인물 하나가 다 안 보이는 것은 표시로 덮을 일이 아니다.**
     node tools/bagfit_qa.mjs [폭 높이]  (안 주면 PC 세 크기를 다 돈다)

   ★ 「넘침 0」만 보면 안 된다 — 칸을 3px 로 줄여도 넘침은 0 이 된다. 그래서 셋을 같이 본다:
     ① 가방칸(#bagBody)이 안 넘친다
     ② 열 슬롯이 **하나도 빠짐없이** 보이는 자리 안에 있다(잘린 것 0)
     ③ 칸이 **읽을 만한 크기**로 남는다(≥34px) — 맞추느라 콩알이 되면 그것도 결함이다
   ★ 그리고 **채워 놓고 잰다** — 빈 가방은 표본이 아니다([[probe-must-walk-the-real-path]]). */
import { waitUntil, settle, BOOTED, PAINTED, cannotMeasure } from "./qa_ready.mjs";
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const SIZES = process.argv[2]
  ? [[+process.argv[2], +(process.argv[3] || 863)]]
  : [[1512, 863], [1440, 900], [1280, 800]];
const MIN_CELL = 34;

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
/* ★ **못박은 잠으로 「이제 됐겠지」 하지 않는다**(V-57c · 2026-08-25). 예전엔 4.2초를
   자고 시작했는데, 브라우저가 바쁜 판에서는 글꼴·그림이 아직 안 서 있었다 —
   그 상태로 창을 열면 `fitDollStat` 이 **틀린 크기로** 맞춰 반지 칸이 18.4px 잘렸다.
   따로 돌리면 늘 통과하고 `qa_all` 안에서만 우는 까닭이 이것이다. */
{
  const g = await waitUntil(ev, BOOTED, { secs: 30 });
  if (!g.ok) cannotMeasure("앱이 섬", g);
  const p = await waitUntil(ev, PAINTED, { secs: 30 });
  if (!p.ok) cannotMeasure("글꼴·그림", p);
}

/* 가방을 꽉 채우고 낀 것도 심는다 — 슬롯 이름은 **게임에서 가져온다**(손으로 적었다가
   GEAR 에 없는 물건을 저장에 심어 다음 자를 터뜨린 적이 있다 · 2026-08-13). */
await ev(`(()=>{const M=window.META; M.lv=40; M.bag=[];
  const K=window.__GEAR_KEYS||["wand","robe","charm"];
  for(let i=0;i<12;i++) M.bag.push({k:K[i%K.length], tier:(i%5), af:[{id:"dmg",v:12},{id:"hp",v:60}]});
  window.saveMeta();})()`);

let bad = 0;
const say = (ok, s) => { if (!ok) bad++; console.log(`${ok ? "PASS" : "FAIL"}  ${s}`); };

for (const [W, H] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
  await ev(`window.__openWin("bag")`);
  /* ★ **보정** — 새로 가른 문턱이 «틀릴 줄 아는지» 먼저 본다(안 우는 검사는 검사가 아니다 ·
     [[pixel-verification-calibration]]). BAGQA_OLD=1 이면 구르는 칸을 **못 구르게** 막고
     낮춘다 — 08-17 의 진짜 결함(굴려도 안 나오는 인물)과 같은 자리다. 둘 다 울어야 한다.
       BAGQA_OLD=1 node tools/bagfit_qa.mjs 1280 800   → 두 줄이 FAIL 이면 자가 성하다 */
  if (process.env.BAGQA_OLD === "1")
    await ev(`(()=>{const d=document.querySelector(".win.on .pdoll"); if(!d) return;
      const b=d.closest(".wScroll")||d.closest(".frame");
      b.style.overflow="hidden"; b.style.maxHeight="260px";})()`);
  /* 크기를 바꾸면 `fitDoll` 이 되짚고, 글꼴이 늦게 서면 **한 번 더** 되짚는다 —
     600ms 를 세는 대신 **자리가 멎을 때까지** 본다(보통 2~3판, ≈0.3초). */
  {
    const st = await settle(ev, `(()=>{const d=document.querySelector(".win.on .pdoll");
      if(!d) return null; const g=d.getBoundingClientRect();
      return [Math.round(g.width),Math.round(g.height),d.style.getPropertyValue("--pdS")];})()`,
      { need: 2, secs: 8 });
    if (!st.ok) cannotMeasure(`${W}×${H} 인물 자리가 멎음`, st);
  }
  const r = JSON.parse(await ev(`(()=>{
    /* ★ 인물은 **가방창 안에만 있는 것이 아니다**(2026-08-17 20:5x). D2 처럼 도킹하면
       페이퍼 돌이 **왼쪽 능력치 패널**로 간다 — bagBody 안에서만 찾던 이 자는 그때
       「슬롯 열이 다 잘렸다(44px)」로 울었다. 자리를 묻지 말고 **떠 있는 인물**을 찾는다.
       ★ 이 주석은 **바깥 템플릿 문자열 안**이다 — 백틱을 쓰면 거기서 문자열이 끊겨
         파일 전체가 SyntaxError 가 된다(방금 그렇게 자를 한 번 죽였다). */
    const vis=el=>{ if(!el) return false; const g=el.getBoundingClientRect(); return g.width>1&&g.height>1; };
    const doll=[...document.querySelectorAll(".win.on .pdoll")].find(vis);
    if(!doll) return JSON.stringify({없음:"pdoll"});
    /* 인물이 «구르는 칸» 안에 있으면 그 칸이 보이는 자리이고, 아니면 패널이 그 자리다. */
    const b=doll.closest(".wScroll")||doll.closest(".frame");
    const bb=b.getBoundingClientRect();
    /* ★ 가방 칸은 **인물과 다른 창**에 있을 수 있다(도킹). 칸 크기는 인물 쪽 --pdS 가
       아니라 **실제로 선 가방 칸**을 잰다 — 예전엔 --pdS 를 읽어 도킹 뒤 0 이 나왔다.
       ★ 물건 칸은 이제 여러 칸을 잇는다(grid-area span) — 빈 칸(.cell.empty)만 1×1 이라
         **한 칸의 진짜 폭**이다. 그걸 재야 콩알 격자를 큰 물건으로 못 속인다. */
    const cell=[...document.querySelectorAll(".win.on #bagBody .grid .cell.empty")].find(vis)
             ||[...document.querySelectorAll(".win.on #bagBody .grid .cell")].find(vis);
    const cw=cell?Math.round(cell.getBoundingClientRect().width):0;
    /* 「보이는 자리」는 구르는 칸의 **눈에 보이는 네모** — 그 밖으로 1px 이라도 나가면 잘린 것이다. */
    const slots=[...doll.querySelectorAll(".pdSlot")].map(e=>{
      const g=e.getBoundingClientRect();
      return {n:e.className.replace("pdSlot ",""), out:+Math.max(0, g.bottom-bb.bottom, bb.top-g.top).toFixed(1)};
    });
    /* ★ **V-56 이 이 자의 문턱을 낡게 만들었다**(2026-08-25 · V-57c 에서 잡음).
       낮은 창에서는 수치가 인물 «위»로 올라서고(numsFirst) 인물은 그 아래에서
       **굴려 본다** — V-56 이 일부러 고른 자리다(창 이름이 「능력치」라 능력치가 먼저).
       그런데 이 자는 08-17 에 적힌 「인물이 다 보여야 한다」를 그대로 들고 있어
       1280×800 에서 반지 칸 18.4px 를 **설계대로 된 것**에다 대고 울었다
       ([[threshold-and-ruler-must-match]] · 문턱과 자가 어긋난 자리).
       ★ 그렇다고 검사를 **지우지는 않는다** — 08-17 의 진짜 결함(굴려도 안 나오는 인물)은
         그대로 잡아야 한다. 문턱을 둘로 가른다:
           · numsFirst 아님 → 예전 그대로. 인물이 **보이는 네모 안에** 다 있어야 한다.
           · numsFirst 임   → ① 인물이 **굴리면 다 나온다**(구르는 내용 안에 있다)
                                ② 그 대신 얻기로 한 것이 **실제로 왔는가** — 능력치 줄이
                                   하나도 안 잘리고 다 선다. 안 오면 헛되이 판 것이다. */
    const sb = document.getElementById("statBody");
    const numsFirst = !!(sb && sb.classList.contains("numsFirst"));
    const moreH = sb ? (parseFloat(getComputedStyle(sb, "::after").height) || 34) : 34;
    /* 굴리면 나오는가 — 구르는 칸의 **내용 높이** 안에 인물의 밑이 들어오면 닿는다. */
    const dr = doll.getBoundingClientRect();
    /* ★ scrollHeight 는 overflow:hidden 이어도 **내용 높이를 그대로 돌려준다** — 그것만
       보면 「못 구르게 막아 놓아도 닿는다」가 된다(보정에서 실제로 그렇게 새어 나갔다).
       구를 수 있는지를 **먼저** 묻는다. */
    const ov = getComputedStyle(b).overflowY;
    const 구름 = /(auto|scroll|overlay)/.test(ov) && b.scrollHeight > b.clientHeight + 1;
    const 닿음 = 구름 && (dr.bottom - bb.top) <= b.scrollHeight + 1 && (dr.top - bb.top) >= -1;
    /* 능력치 줄 — 「수치 먼저」로 얻기로 한 바로 그것. 잘리면 헛되이 판 것이다. */
    /* ★ 줄은 .tipStat 이다 — 처음엔 없는 이름(.sRow)을 물어 **늘 0** 이 나왔다.
       0 이 「다 선다」와 같은 얼굴로 온다([[silent-zero-is-not-an-observation]]).
       그래서 **몇 줄을 봤는지도 같이 돌려준다** — 0 줄이면 그것부터 틀린 것이다. */
    const 줄 = [...(sb ? sb.querySelectorAll(".sStat:not(.jList) .tipStat") : [])];
    const 안선줄 = 줄.filter(e => { const g = e.getBoundingClientRect();
        return g.bottom > bb.bottom - moreH + 0.5 || g.top < bb.top - 0.5; }).length;
    const 줄수 = 줄.length;
    return JSON.stringify({
      numsFirst, 닿음, 안선줄, 줄수, 구름,
      /* ★ 「넘침」은 **가방 격자가 제 패널을 넘치는지**다. 예전엔 인물이 든 칸의
         scrollHeight 를 봤는데, 도킹 뒤 그 칸은 능력치·일지까지 든 **일부러 구르는 칸**이라
         569px 이 늘 남는다 — 그건 고장이 아니라 설계다. 묻는 자리를 옮긴다. */
      넘침:(()=>{ const g=document.querySelector(".win.on #bagBody .grid");
        if(!g) return 0; const p=g.closest(".wScroll")||g.closest(".frame");
        const gr=g.getBoundingClientRect(), pr=p.getBoundingClientRect();
        return +Math.max(0, gr.bottom-pr.bottom, pr.top-gr.top).toFixed(1); })(),
      칸:cw,
      잘린것:slots.filter(s=>s.out>1),
      슬롯수:slots.length,
    });})()`));
  const t = `${W}×${H}`;
  if (r.없음) { say(false, `${t}: ${r.없음} 이 없다`); continue; }
  say(r.넘침 === 0, `${t}: 가방칸이 안 넘친다 (넘침 ${r.넘침}px)`);
  if (!r.numsFirst) {
    say(r.잘린것.length === 0 && r.슬롯수 === 10,
      `${t}: 슬롯 열이 다 보인다 (${r.슬롯수}개 · 잘린 것 ${r.잘린것.map(s=>s.n+" "+s.out+"px").join(", ") || "없음"})`);
  } else {
    /* 창이 낮아 수치가 먼저 선 자리 — 인물은 굴려 본다(V-56). 두 가지를 대신 묻는다. */
    say(r.닿음 && r.슬롯수 === 10,
      `${t}: [수치 먼저] 인물이 굴리면 다 나온다 (${r.슬롯수}개 · 구름 ${r.구름} · 밖으로 ${r.잘린것.map(s=>s.n+" "+s.out+"px").join(", ") || "없음"})`);
    say(r.줄수 > 0 && r.안선줄 === 0,
      `${t}: [수치 먼저] 그 대신 능력치 줄이 다 선다 (${r.줄수}줄 중 안 선 줄 ${r.안선줄})`);
  }
  say(r.칸 >= MIN_CELL, `${t}: 칸이 읽을 만하다 (${r.칸}px ≥ ${MIN_CELL})`);
  await ev(`window.__closeAll&&window.__closeAll()`);
  await wait(200);
}
say(errs.length === 0, `콘솔 예외 0 (${errs.slice(0, 2).join(" | ") || "없음"})`);
console.log(bad ? `\n✗ 가방 맞춤: ${bad} 곳 틀림` : `\n✓ 가방 맞춤: 전부 통과`);
await raw("Target.closeTarget", { targetId });
process.exit(bad ? 1 : 0);
