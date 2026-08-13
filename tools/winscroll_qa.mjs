/* **창의 발이 붙박이고 가운데만 구르는가** — 병수님 2026-08-13:
   "능력치나 인벤토리도 스킬처럼 하단에 나가기 버튼은 고정이고 컨텐츠만 스크롤 처리".
     node tools/winscroll_qa.mjs [폭 높이]

   ★ 「스크롤 된다」만 보면 안 된다. 진짜로 봐야 하는 것은 셋이다:
     ① 발(나가기)이 **화면 안**에 있고 창틀 아래에 붙어 있나
     ② 가운데를 끝까지 굴려도 **발이 안 움직이나** (창 전체가 구르면 발이 밀려 올라간다)
     ③ 창틀 자체는 안 구르나 (frame.scrollHeight ≤ clientHeight)
   ★ 그리고 **구를 것이 실제로 있어야** 표본이다 — 가방을 채우고 좁은 화면에서 잰다.
     빈 창에서는 무엇을 해도 통과한다([[probe-must-walk-the-real-path]]). */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
/* ★ 기본을 **360×640**(작은 폰)으로 둔다 — 800 에서는 내용이 다 들어가 「구를 것 0」이
   나오고, 그러면 이 자는 아무것도 못 잡는다. 잴 값은 최악으로 만들어 놓고 읽는다. */
const W = +(process.argv[2] || 360), H = +(process.argv[3] || 640);
for (const t of (await (await fetch(CDP + "/json/list")).json()).filter(t => t.type === "page" && t.url.startsWith("http://127.0.0.1:8774")))
  await fetch(`${CDP}/json/close/${t.id}`).catch(() => {});
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId); const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => JSON.parse((await S("Runtime.evaluate", { returnByValue: true, expression: e })).result.value);
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: W < 900 });
/* ★ 여기서 다시 `Page.navigate` 를 부르지 말 것. 창은 이미 위에서 PAGE 로 **열렸다**.
   같은 주소로 한 번 더 실으면 처음 로드와 겹쳐 세션이 도중에 끊긴다
   (-32001 "Session with given id not found" — 창 두셋을 재고 나서야 터져서 코드 탓으로 오진하기 쉽다). */
await wait(5200);

/* **구를 것을 만든다** — 가방을 꽉 채우고 트리 점수도 넉넉히. 빈 창은 표본이 아니다. */
await S("Runtime.evaluate", { expression: `(()=>{const M=window.META;
  /* ★ 슬롯 이름은 **GEAR 에서 가져온다** — 여기에 "amul" 이라고 손으로 적었다가
     GEAR 에 없는 물건 넷을 저장에 심었고, 그 저장을 물려받은 다음 자(leave_qa)가
     가방이 넘치는 순간 meltGold 에서 터졌다(2026-08-13). 자가 게임을 망가뜨렸다. */
  M.lv=40; M.bag=[]; const K=window.__GEAR_KEYS || ["wand","robe","charm"];
  for(let i=0;i<12;i++) M.bag.push({k:K[i%3], tier:(i%4), af:[{id:"dmg",v:12},{id:"hp",v:60}]});
  window.saveMeta();})()` });

let bad = 0, skipped = 0;
const say = (ok, s) => { if (!ok) bad++; console.log(`${ok ? "  ok" : "FAIL"}  ${s}`); };
/* ★ **「구를 것이 없다」는 결함이 아니다** — 넓은 화면에서는 내용이 다 들어가는 것이
   맞다. 그렇다고 통과로 세면 「잰 적 없음」이 「이상 없음」으로 둔갑한다(오늘도 그
   함정을 밟았다). 그래서 **셋째 결과**를 둔다 — 실패도 통과도 아닌 「잴 것 없음」. */
const skip = (s) => { skipped++; console.log(`··    ${s}`); };

for (const [which, winId, bodySel] of [["stat","winStat",".wScroll"],["bag","winBag",".wScroll"],["tree","winTree","#treeCols"]]) {
  await S("Runtime.evaluate", { expression: `window.__openWin(${JSON.stringify(which)})` });
  await wait(500);
  const r = await ev(`(()=>{const w=document.getElementById(${JSON.stringify(winId)});
    if(!w) return JSON.stringify({없음:"창"});           // 옛 코드에는 없는 창일 수 있다(A/B 를 곱게)
    const f=w.querySelector(".frame"), b=w.querySelector(${JSON.stringify(bodySel)}), ft=w.querySelector(".winFoot");
    if(!f||!b||!ft) return JSON.stringify({없음:!f?"frame":!b?"body":"foot"});
    const fb=ft.getBoundingClientRect(), rb=f.getBoundingClientRect();
    return JSON.stringify({ 발밑: Math.round(fb.bottom), 창밑: Math.round(rb.bottom), 화면: ${H},
      구를것: b.scrollHeight-b.clientHeight, 창이구름: f.scrollHeight-f.clientHeight,
      발위치: Math.round(fb.top) });})()`);
  if (r.없음) { say(false, `${which}: ${r.없음} 를 못 찾음`); continue; }
  say(r.발밑 <= H + 1, `${which}: 발이 화면 안에 있다 (발 밑 ${r.발밑} ≤ ${H})`);
  say(r.창이구름 <= 1, `${which}: 창틀 자체는 안 구른다 (넘침 ${r.창이구름})`);
  if (r.구를것 <= 20) { skip(`${which}: 내용이 다 들어감(${r.구를것}px) — 이 크기에선 구를 것이 없다`); continue; }
  say(true, `${which}: 구를 것이 있다 (${r.구를것}px)`);
  /* ② 끝까지 굴려도 발이 그대로냐 */
  await S("Runtime.evaluate", { expression: `(()=>{const b=document.querySelector("#"+${JSON.stringify(winId)}+" "+${JSON.stringify(bodySel)}); if(b) b.scrollTop=99999;})()` });
  await wait(250);
  const a2 = await ev(`(()=>{const w=document.getElementById(${JSON.stringify(winId)});
    const ftE=w&&w.querySelector(".winFoot"), b=w&&w.querySelector(${JSON.stringify(bodySel)});
    if(!ftE||!b) return JSON.stringify({발위치:-1, 굴린값:0});
    return JSON.stringify({발위치:Math.round(ftE.getBoundingClientRect().top), 굴린값:Math.round(b.scrollTop)});})()`);
  say(a2.굴린값 > 10, `${which}: 가운데가 실제로 굴렀다 (${a2.굴린값}px)`);
  say(Math.abs(a2.발위치 - r.발위치) <= 1, `${which}: 굴려도 발이 안 움직인다 (${r.발위치} → ${a2.발위치})`);
}
say(errs.length === 0, `예외 없음 ${errs.length ? "→ " + errs[0] : ""}`);
console.log(bad ? `\n✗ ${W}×${H}: ${bad}건 실패${skipped?` · 잴 것 없음 ${skipped}`:""}`
                : `\n✓ ${W}×${H} 창 스크롤: 전부 통과${skipped?` (잴 것 없음 ${skipped} — 좁은 크기로도 돌릴 것)`:""}`);
await raw("Target.closeTarget", { targetId }); bws.close(); process.exit(bad ? 1 : 0);
