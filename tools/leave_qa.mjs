/* **「나가기」가 진짜로 나가는가** — 던전에서 스스로 물러나는 길을 손가락으로 지나 본다.
     node tools/leave_qa.mjs [url]

   병수님 2026-08-13: "전투 포기 같은게 없어, 중간에 포기하고(현재까지 보상만 받고)
   마을로 돌아가는 기능같은게 있어야 할듯".

   ★ 「보상만 받고」가 핵심이라 **잃은 것이 없는지**까지 잰다 — 나가기 전후로 금과
   전리품 수가 같아야 한다. 창이 뜨는 것만 보면 「나갔는데 빈손」을 놓친다.
   ★ 누르는 것은 `el.click()` 이 아니라 elementFromPoint + 진짜 CDP 탭이다
   (그 함정은 tools/tap_qa.mjs 머리말 참조).
   ★ 폭은 **360** — 제일 좁은 데서 위 띠가 안 잘리는지 같이 본다(단추를 하나 늘렸다). */
const CDP = "http://127.0.0.1:9333";
const PAGE = process.argv[2] || "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const ev = async (e) => JSON.parse((await S("Runtime.evaluate", { returnByValue: true, expression: e })).result.value);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
await S("Page.navigate", { url: PAGE });
await wait(5200);

let bad = 0;
const say = (ok, s) => { if (!ok) bad++; console.log(`${ok ? "  ok" : "FAIL"}  ${s}`); };

/* ① 마을에서는 안 보인다 — 나갈 데가 없으니 자리만 차지하면 안 된다. */
const town = await ev(`JSON.stringify({ 있나:!!document.getElementById("hLeave"),
  보이나: !!(document.getElementById("hLeave")||{}).offsetParent, 어디: window.__MODE.at })`);
say(town.있나, `단추가 문서에 있다`);
say(town.어디 === "town" && !town.보이나, `마을에선 숨는다 (at=${town.어디}, 보임=${town.보이나})`);

/* ★ **마을에서도 잘리는지 본다.** 여태 던전만 봤다 — 던전 왼쪽은 「적 9」로 짧고
   마을은 「가장 깊이 12층」이라 훨씬 길다. 자가 짧은 쪽만 지나서, 가방 단추를 늘렸을 때
   마을이 「깊이…」로 잘린 것을 눈으로 먼저 봤다([[probe-must-walk-the-real-path]]). */
{
  await S("Runtime.evaluate", { expression: `window.META.deepest = 37; window.META.lv = 12; window.saveMeta(); window.__townHits && 0;` });
  await wait(400);
  const t = await ev(`(()=>{const out=[];
    /* ★ **담는 상자가 아니라 글자 칸을 본다.** .res 를 통째로 재었더니 늘 22px 넘쳤는데,
       범인은 글자가 아니라 좌우로 -22px 뻗은 **배경 장식**(.mid .res::before)이었다 —
       절대 배치된 장식도 scrollWidth 를 늘린다. 잘림은 **글자가 든 칸**에서만 뜻이 있다. */
    const cells = ["#hLeft","#hFloor"].map(q=>document.querySelector(q))
      .concat([...document.querySelectorAll(".who > *, .res > *")]);
    for (const e of cells) { if(!e || !e.textContent.trim()) continue;
      if (getComputedStyle(e).display === "none") continue;
      if (e.scrollWidth - e.clientWidth > 1) out.push((e.id||e.className||e.tagName)+" ⟨"+e.textContent.trim()+"⟩"); }
    return JSON.stringify(out);})()`);
  say(t.length === 0, `마을에서 말줄임으로 먹힌 글자 없음 ${t.length ? "→ " + t.join(", ") : ""}`);
}

/* ② 던전으로 들어가 한동안 굴린다 — 전리품과 금이 쌓여야 「잃은 것」을 잴 수 있다. */
await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
await wait(600);
await S("Runtime.evaluate", { expression: "window.S.speed = 8" });   // 빨리 감아 전리품을 쌓는다
await wait(9000);
await S("Runtime.evaluate", { expression: "window.S.speed = 1" });
const b4 = await ev(`JSON.stringify({ 금: window.META.gold, 전리품: window.S.loot.length, 층: window.S.floor,
  죽었나: window.S.dead, 잡은수: window.S.killed })`);
say(!b4.죽었나, `아직 살아 있다 (${b4.층}층, 잡은 수 ${b4.잡은수}, 전리품 ${b4.전리품})`);

/* ③ 좁은 폭에서 위 띠가 안 잘린다 — 단추를 하나 늘렸으니 여기가 제일 위험하다. */
const top = await ev(`(()=>{const t=document.getElementById("top");
  return JSON.stringify({ 넘침: t.scrollWidth - t.clientWidth, 폭: t.clientWidth });})()`);
say(top.넘침 <= 1, `360px 에서 위 띠가 안 잘린다 (넘침 ${top.넘침}px)`);
/* ★ **넘침 0 은 「안 잘린다」가 아니다.** text-overflow:ellipsis 가 걸린 칸은 잘려도
   넘침이 0 이다 — 실제로 마을 「가장 깊이…」가 그렇게 층수를 먹은 채 통과했다.
   그래서 낱칸마다 scrollWidth 로 **말줄임이 실제로 먹었는지**를 따로 본다. */
const ell = await ev(`(()=>{const out=[];
    /* ★ **담는 상자가 아니라 글자 칸을 본다.** .res 를 통째로 재었더니 늘 22px 넘쳤는데,
       범인은 글자가 아니라 좌우로 -22px 뻗은 **배경 장식**(.mid .res::before)이었다 —
       절대 배치된 장식도 scrollWidth 를 늘린다. 잘림은 **글자가 든 칸**에서만 뜻이 있다. */
    const cells = ["#hLeft","#hFloor"].map(q=>document.querySelector(q))
      .concat([...document.querySelectorAll(".who > *, .res > *")]);
    for (const e of cells) { if(!e || !e.textContent.trim()) continue;
      if (getComputedStyle(e).display === "none") continue;
      if (e.scrollWidth - e.clientWidth > 1) out.push((e.id||e.className||e.tagName)+" ⟨"+e.textContent.trim()+"⟩"); }
  return JSON.stringify(out);})()`);
say(ell.length === 0, `말줄임으로 먹힌 글자 없음 ${ell.length ? "→ " + ell.join(", ") : ""}`);

/* ④ 손가락이 실제로 닿는가 — #top 은 pointer-events:none 이라 여기서 두 번 데였다. */
const g = await ev(`(()=>{const e=document.getElementById("hLeave"); if(!e) return JSON.stringify({없음:1});
  const b=e.getBoundingClientRect(), cx=b.left+b.width/2, cy=b.top+b.height/2, hit=document.elementFromPoint(cx,cy);
  return JSON.stringify({cx,cy, 제것: !!(hit && (hit.id==="hLeave" || hit.closest("#hLeave"))),
                         닿는것: hit?(hit.id||hit.className||hit.tagName)+"":null});})()`);
say(!!g.제것, `던전에서 손가락이 단추에 닿는다 (닿는 것: ${g.닿는것})`);

/* ⑤ 진짜 탭 → 정산이 뜨고, 마을에 있고, **잃은 것이 없다.** */
await S("Input.dispatchMouseEvent", { type: "mousePressed",  x: g.cx, y: g.cy, button: "left", clickCount: 1 });
await S("Input.dispatchMouseEvent", { type: "mouseReleased", x: g.cx, y: g.cy, button: "left", clickCount: 1 });
await wait(700);
const af = await ev(`JSON.stringify({ 정산: document.getElementById("winEnd").classList.contains("on"),
  어디: window.__MODE.at, 죽음판정: window.__LASTRUN.dead, 금: window.META.gold,
  전리품: window.__LASTRUN.loot.length, 층: window.__LASTRUN.floor,
  부제: (document.querySelector("#endSub .eWhere")||{}).textContent||"",
  로그: [...document.querySelectorAll("#log > *")].slice(-6).map(e=>e.textContent).join(" | ") })`);
say(af.정산, `정산 창이 뜬다`);
say(af.어디 === "town", `마을로 돌아왔다 (at=${af.어디})`);
say(af.죽음판정 === false, `「쓰러짐」이 아니라 「물러남」으로 적힌다 (dead=${af.죽음판정})`);
say(af.금 >= b4.금, `금을 잃지 않았다 (${b4.금} → ${af.금})`);
say(af.전리품 === b4.전리품, `전리품을 다 지고 왔다 (${b4.전리품} → ${af.전리품})`);
say(af.층 === b4.층, `끝난 층이 맞다 (${b4.층} → ${af.층})`);
say(/발길을 돌림/.test(af.부제), `정산 부제: "${af.부제}"`);
say(/물러남/.test(af.로그), `기록에 물러남이 남는다`);

/* ⑥ 돌아온 마을에서 다시 숨는다 + 다시 들어가도 멀쩡하다(두 번 부르면 정산이 덮인다). */
const again = await ev(`JSON.stringify({ 보이나: !!(document.getElementById("hLeave")||{}).offsetParent })`);
say(!again.보이나, `마을에서 다시 숨는다`);
await S("Runtime.evaluate", { expression: `document.querySelectorAll(".win.on").forEach(w=>w.classList.remove("on")); window.__toDungeon()` });
await wait(2500);
const re = await ev(`JSON.stringify({ 죽었나: window.S.dead, 층: window.S.floor, 어디: window.__MODE.at,
  보이나: !!(document.getElementById("hLeave")||{}).offsetParent })`);
say(!re.죽었나 && re.어디 === "dungeon" && re.보이나, `다시 들어가면 새 판이 돈다 (${re.층}층, 단추 보임=${re.보이나})`);

say(errs.length === 0, `예외 없음 ${errs.length ? "→ " + errs[0] : ""}`);
console.log(bad ? `\n✗ ${bad}건 실패` : `\n✓ 나가기: 전부 통과`);
await raw("Target.closeTarget", { targetId });
bws.close(); process.exit(bad ? 1 : 0);
