/* **가방창의 인물이 통째로 보이는가** — 병수님 2026-08-17: 페이퍼 돌의 아래 칸
   (신발·반지)이 창 밖으로 나가 있었다(넘침 94px @1512×863). 「아래에 더 있다」 표시(▾)가
   뜨긴 했지만 **인물 하나가 다 안 보이는 것은 표시로 덮을 일이 아니다.**
     node tools/bagfit_qa.mjs [폭 높이]  (안 주면 PC 세 크기를 다 돈다)

   ★ 「넘침 0」만 보면 안 된다 — 칸을 3px 로 줄여도 넘침은 0 이 된다. 그래서 셋을 같이 본다:
     ① 가방칸(#bagBody)이 안 넘친다
     ② 열 슬롯이 **하나도 빠짐없이** 보이는 자리 안에 있다(잘린 것 0)
     ③ 칸이 **읽을 만한 크기**로 남는다(≥34px) — 맞추느라 콩알이 되면 그것도 결함이다
   ★ 그리고 **채워 놓고 잰다** — 빈 가방은 표본이 아니다([[probe-must-walk-the-real-path]]). */
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
await wait(4200);

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
  await wait(600);
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
       아니라 **실제로 선 가방 칸**을 잰다 — 예전엔 --pdS 를 읽어 도킹 뒤 0 이 나왔다. */
    const cell=[...document.querySelectorAll(".win.on #bagBody .grid .cell")].find(vis);
    const cw=cell?Math.round(cell.getBoundingClientRect().width):0;
    /* 「보이는 자리」는 구르는 칸의 **눈에 보이는 네모** — 그 밖으로 1px 이라도 나가면 잘린 것이다. */
    const slots=[...doll.querySelectorAll(".pdSlot")].map(e=>{
      const g=e.getBoundingClientRect();
      return {n:e.className.replace("pdSlot ",""), out:+Math.max(0, g.bottom-bb.bottom, bb.top-g.top).toFixed(1)};
    });
    return JSON.stringify({
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
  say(r.잘린것.length === 0 && r.슬롯수 === 10,
    `${t}: 슬롯 열이 다 보인다 (${r.슬롯수}개 · 잘린 것 ${r.잘린것.map(s=>s.n+" "+s.out+"px").join(", ") || "없음"})`);
  say(r.칸 >= MIN_CELL, `${t}: 칸이 읽을 만하다 (${r.칸}px ≥ ${MIN_CELL})`);
  await ev(`window.__closeAll&&window.__closeAll()`);
  await wait(200);
}
say(errs.length === 0, `콘솔 예외 0 (${errs.slice(0, 2).join(" | ") || "없음"})`);
console.log(bad ? `\n✗ 가방 맞춤: ${bad} 곳 틀림` : `\n✓ 가방 맞춤: 전부 통과`);
await raw("Target.closeTarget", { targetId });
process.exit(bad ? 1 : 0);
