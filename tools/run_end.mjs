// ④ 정산 검수기 — 판을 끝내고 「이번 판에 얻은 것」 창을 잰다.
//   node tools/run_end.mjs <out.png>
// stat_ui.mjs 와 **같은 뼈대**(CDP 9333 + 127.0.0.1:8774/index.html). 각 줄을
// PASS/FAIL 로 찍고, 하나라도 FAIL 이면 exit code 1 로 나가 커밋을 막는다.
const [, , OUT = "tmp/run_end.png"] = process.argv;
const CDP = "http://127.0.0.1:9333";
const URL = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");

const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const errors = [];
function raw(method, params = {}, sessionId) {
  const mid = ++id; bws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  return new Promise((res, rej) => pend.set(mid, { res, rej }));
}
bws.addEventListener("message", ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id);
    return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown")
    errors.push("EXC " + (m.params.exceptionDetails?.exception?.description || "?"));
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error")
    errors.push("CON " + (m.params.args || []).map(a => a.value ?? a.description ?? "").join(" "));
});
await new Promise(r => bws.addEventListener("open", r));

const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const ev = async (expression) => {
  const r = await S("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4000));

/* ① 던전에 들어가 몇 층 돌린다 — 전리품이 실제로 S.loot 에 쌓이는지 파이프라인을 태운다. */
await ev(`window.__toDungeon()`);
await ev(`window.__S.speed = 8`);
await new Promise(r => setTimeout(r, 3500));

/* ② 스냅샷을 결정론적으로 굳힌다 — 실제로 쌓인 것 대신 **아는 것 셋**으로 덮어(등급/갈림을
   대조하려면 값을 알아야 한다) 강제로 죽인다. 낀 것(wand t4)·금(robe t1)·가방(charm t3). */
const R = await ev(`(function(){
  const S = window.__S;
  const real = S.loot.length;                       // 실제로 쌓인 개수(정보용)
  S.loot = [
    { k:"wand",  tier:4, af:[{id:"dmg",v:10}], worn:true,  gold:0, bagged:false, n:"x", slot:"지팡이" },
    { k:"robe",  tier:1, af:[],                worn:false, gold:9, bagged:false, n:"y", slot:"망토" },
    { k:"charm", tier:3, af:[{id:"mp",v:1}],   worn:false, gold:0, bagged:true,  n:"z", slot:"부적" },
  ];
  S.floor = 9; S.killed = 20;
  window.__die();
  return { real };
})()`);

await new Promise(r => setTimeout(r, 300));          // rAF 의 사망 갈래가 정산 창을 연다

/* ③ 정산 창이 떴고, 그 순간 다른 창은 하나도 안 떠 있는가. 칸 수 == 스냅샷 loot 길이.
   칸 하나(wand t4)를 골라 등급 클래스가 tier 와 맞는지 대조. */
const O = await ev(`(function(){
  const q = s => [...document.querySelectorAll(s)];
  const on = q(".win.on").map(w => w.id);
  const cells = q("#winEnd #endBody .grid .cell");
  const lootLen = window.__LASTRUN ? window.__LASTRUN.loot.length : -1;
  // 등급 클래스 대조 — wand(t4) 칸을 찾아 .q 가 t4 이고 숫자도 4 인가
  let tierOk = false, tierDetail = "no cell";
  const wandCell = cells.find(c => c.querySelector("i.gear-wand"));
  if (wandCell) {
    const g = wandCell.querySelector(".q");
    tierOk = !!g && g.classList.contains("t4") && g.textContent.trim() === "4";
    tierDetail = g ? (g.className + " / " + g.textContent.trim()) : "no .q";
  }
  // 갈림 표식 — 세 칸이 착용·금·가방으로 갈렸는가
  const fates = cells.map(c => (c.querySelector(".eFate")||{}).textContent || "?");
  /* 창 뒤의 로그 — 「전멸 · 20층에서 쓰러짐」이 창 밖에 붉게 남아 시선이 갈렸다.
     ★ 「안 보인다」만 재면 로그가 **원래 비어 있어도** 통과한다(빈 자를 못 믿는다).
     그래서 **할 말이 있는데도** 창을 안 건드리는지를 잰다.
     ★★ 2026-08-16 — 묻는 말을 바꿨다. 예전엔 「안 그려졌는가」였는데, 옆 패널이 서면서
       로그가 **전장 위가 아니라 패널 안**에 산다. 거기서는 창과 겹칠 일이 없으니
       감출 이유도 없다(감추면 「일지」가 빈 상자로 남는다). 진짜 묻고 싶었던 것은
       처음부터 「**창을 가리는가**」였다 — 안 겹치면 보여도 된다. */
  const lg = document.getElementById("log");
  const logSaid = (lg.textContent || "").trim().length > 0;
  const logDrawn = [...lg.getClientRects()].some(r => r.width > .5 && r.height > .5);
  const fr = document.querySelector("#winEnd .frame");
  const hit = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
  const fb = fr ? fr.getBoundingClientRect() : null;
  const logOverWin = !!fb && [...lg.getClientRects()].some(r => r.width > .5 && r.height > .5 && hit(r, fb));
  return { on, endOn: on.includes("winEnd"), nCells: cells.length, lootLen, tierOk, tierDetail, fates,
           logSaid, logDrawn, logOverWin, inRail: (lg.parentElement.id === "logSlot"),
           logText: (lg.textContent || "").trim().slice(0, 40),
           modeTown: window.__MODE ? window.__MODE.at === "town" : null };
})()`);

/* ④ 닫으면 정산이 사라지고 마을에 있다. */
const C = await ev(`(function(){
  document.querySelector("#winEnd [data-close]").click();
  const lg = document.getElementById("log");
  return { endOn: document.getElementById("winEnd").classList.contains("on"),
           /* 닫으면 **돌아와야** 한다 — 영영 끈 것이면 로그를 지운 것이지 창을 고친 게 아니다 */
           logDrawn: [...lg.getClientRects()].some(r => r.width > .5 && r.height > .5),
           modeTown: window.__MODE ? window.__MODE.at === "town" : null };
})()`);

/* ⑤ 다시 던전에 들어가면 창이 닫혀 있고 이번 판 전리품이 비어 있다. */
const D = await ev(`(function(){
  window.__toDungeon();
  return { endOn: document.getElementById("winEnd").classList.contains("on"),
           lootLen: window.__S.loot.length };
})()`);

/* 스크린샷은 **채워진** 정산 창으로 찍는다(재입장이 loot 를 비웠으므로 다시 심어 죽인다)
   — 빈손 화면이 아니라 잰 그 화면(등급 색·갈림 표식)이 남아야 눈으로도 대조된다. */
await ev(`(function(){
  const S = window.__S;
  S.loot = [
    { k:"wand",  tier:4, af:[{id:"dmg",v:10}], worn:true,  gold:0, bagged:false, n:"x", slot:"지팡이" },
    { k:"robe",  tier:1, af:[],                worn:false, gold:9, bagged:false, n:"y", slot:"망토" },
    { k:"charm", tier:3, af:[{id:"mp",v:1}],   worn:false, gold:0, bagged:true,  n:"z", slot:"부적" },
  ];
  S.floor = 9; S.killed = 20; window.__die();
})()`);
await new Promise(r => setTimeout(r, 300));

/* ⑧ 부제가 **어중간하게** 꺾이는가(병수님 2026-08-12) — 「경험치 +0」에서 「+0」만
   다음 줄로 떨어졌다. 값 길이에 달린 결함이라 판 한 벌로는 못 잡는다: LASTRUN 을
   손수 채워 여러 벌을 그려 보고, **토막(·으로 가른 한 덩이) 하나가 두 줄에 걸치면**
   FAIL. 자리(rect)로 재므로 markup 이 바뀌어도 그대로 쓴다.
   ★ 「글자 수로 어림잡기」는 안 쓴다 — 폭·글꼴·굵기가 다 걸린다. 그린 자리를 읽는다. */
const CASES = [
  ["병수님이 본 그 판", { floor: 20, killed: 0, gold: 0, xp: 0, leveled: false }],
  ["레벨 업까지 붙은 판", { floor: 20, killed: 7, gold: 640, xp: 120, leveled: true }],
  ["자릿수가 큰 판", { floor: 137, killed: 1284, gold: 128400, xp: 9640, leveled: true }],
  ["가장 짧은 판", { floor: 1, killed: 0, gold: 0, xp: 0, leveled: false }],
];
const wrapRuns = [];
for (const [label, vals] of CASES) {
  wrapRuns.push(await ev(`(function(){
    const L = window.__LASTRUN;
    Object.assign(L, ${JSON.stringify(vals)}, { has: true, loot: [] });
    window.__openWin("end");
    const el = document.getElementById("endSub");
    /* 글자 자리를 **Range 로** 읽는다 — <b> 로 잘려 있어도 한 줄로 이어 센다. */
    const nodes = []; let text = "";
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) { nodes.push({ n, at: text.length }); text += n.nodeValue; }
    const loc = (p) => {
      for (const it of nodes) if (p >= it.at && p <= it.at + it.n.nodeValue.length) return [it.n, p - it.at];
      return null;
    };
    const rects = (s, e) => {
      const a = loc(s), b = loc(e); if (!a || !b) return [];
      const r = document.createRange(); r.setStart(a[0], a[1]); r.setEnd(b[0], b[1]);
      return [...r.getClientRects()].filter(x => x.width > .5 && x.height > .5);
    };
    const tops = (s, e) => new Set(rects(s, e).map(x => Math.round(x.top))).size;
    /* 낱개를 무엇으로 보느냐 — markup 이 [data-u] 로 **스스로 밝히면** 그것을 쓰고,
       안 밝히면(옛날처럼 한 줄로 흘린 부제) 「·」로 가른 토막을 낱개로 본다. 뒤엣것을
       남겨 두는 이유는 되돌아갔을 때도 잡히게 하려는 것 — 실제로 고치기 전 이 자로
       네 벌 모두 FAIL 이 났다(«경험치 +0» «금 +128,400»). */
    const marked = [...el.querySelectorAll("[data-u]")];
    const segs = []; const topSet = new Set();
    if (marked.length) {
      for (const m of marked) {
        const r2 = [...m.getClientRects()].filter(x => x.width > .5 && x.height > .5);
        const t2 = new Set(r2.map(x => Math.round(x.top)));
        t2.forEach(v => topSet.add(v));
        segs.push({ t: m.textContent.trim(), lines: t2.size });
      }
    } else {
      let i = 0;
      for (const part of text.split("·")) {
        const s = i, e = i + part.length; i = e + 1;
        if (!part.trim()) continue;
        const ls = s + (part.length - part.trimStart().length);
        const le = e - (part.length - part.trimEnd().length);
        segs.push({ t: part.trim(), lines: tops(ls, le) });
      }
    }
    /* 줄 수는 **낱개가 앉은 자리**로 센다 — Range 로 통째 재면 flex 통이 rect 를 하나 더
       내어 두 줄짜리가 3줄로 잡혔다(자가 거짓말을 하면 판정을 못 믿는다). */
    return { label: ${JSON.stringify(label)}, lines: marked.length ? topSet.size : tops(0, text.length),
             split: segs.filter(x => x.lines > 1).map(x => x.t), text: text.trim() };
  })()`));
}
const wrapBad = wrapRuns.filter(x => x.split.length);

/* 잰 것만으로는 「꺾인 자리가 보기 좋은가」를 못 본다 — 제일 긴 벌(자릿수가 큰 판)의
   부제만 잘라 남긴다. 숫자는 판정에 쓰고, 이 그림은 눈으로 보는 몫이다. */
{
  const box = await ev(`(function(){
    const L = window.__LASTRUN;
    Object.assign(L, ${JSON.stringify(CASES[2][1])}, { has: true, loot: [] });
    window.__openWin("end");
    const r = document.getElementById("endSub").getBoundingClientRect();
    return { x: r.x - 8, y: r.y - 6, width: r.width + 16, height: r.height + 12 };
  })()`);
  const shot = await S("Page.captureScreenshot", { format: "png", clip: { ...box, scale: 2 } });
  fs.mkdirSync(OUT.replace(/\/[^/]+$/, ""), { recursive: true });
  fs.writeFileSync(OUT.replace(/\.png$/, "_sub_wide.png"), Buffer.from(shot.data, "base64"));
}

/* ⑨ **빈손 판** — 좌판이 비면 창 가운데가 통째로 비었다(병수님 2026-08-12). 이제
   「이번 판의 자취」 넉 장이 대신 선다. 넉 장이 서는가 · 값이 LASTRUN 그대로인가 ·
   글자가 칸 안에서 안 넘치는가(scrollWidth) · 격자가 창 밖으로 안 삐져나가는가.
   ★ 값은 **자릿수가 큰 벌**로 잰다 — 짧은 벌만 재면 넘침을 영영 못 본다. */
const EMPTY = { has: true, loot: [], floor: 137, from: 21, killed: 0, gold: 0, xp: 0,
                leveled: false, summoned: 1284, used: 2560, secs: 3725 };
const E = await ev(`(function(){
  Object.assign(window.__LASTRUN, ${JSON.stringify(EMPTY)});
  window.__openWin("end");
  const body = document.getElementById("endBody");
  const cells = [...body.querySelectorAll(".runGrid .cell.run")];
  const br = body.getBoundingClientRect();
  const over = [];                       // 칸 안에서 글자가 넘쳤거나 칸이 창 밖으로 나간 것
  for (const c of cells) {
    for (const s of c.querySelectorAll("span"))
      if (s.scrollWidth > s.clientWidth + 1) over.push(s.textContent.trim());
    const r = c.getBoundingClientRect();
    if (r.left < br.left - 1 || r.right > br.right + 1) over.push("밖으로:" + c.textContent.trim());
  }
  /* 빈손 한 줄이 **두 줄로 꺾이면** 안 된다 — 길게 써 봤더니 「이만/큼은 했다」로
     갈라져 되레 어중간했다(2026-08-13). 줄 수는 rect 의 top 가짓수로 센다. */
  /* ★ 블록(div)에 대고 getClientRects 를 부르면 **접혀도 rect 는 하나**다 — 글자를
     Range 로 감싸야 줄마다 rect 가 나온다(⑧ 에서 배운 그 자). */
  const emptyEl = body.querySelector(".eEmpty");
  let emptyLines = 0;
  if (emptyEl) {
    const rg = document.createRange(); rg.selectNodeContents(emptyEl);
    emptyLines = new Set([...rg.getClientRects()].filter(r => r.width > .5 && r.height > .5)
                          .map(r => Math.round(r.top))).size;
  }
  return { n: cells.length, over, emptyLines,
           vals: cells.map(c => (c.querySelector(".rVal")||{}).textContent || "?"),
           lbls: cells.map(c => (c.querySelector(".rLbl")||{}).textContent || "?"),
           empty: (body.querySelector(".eEmpty")||{}).textContent || "" };
})()`);
/* 값 대조는 **깊이·소환·시체·시간** 넷 다 — 하나만 보면 자리를 바꿔 끼워도 안 잡힌다. */
const eWant = ["21→137층", "1,284", "2,560", "62:05"];
const eValsOk = E.vals.length === 4 && eWant.every((w, i) => E.vals[i] === w);
{
  const box = await ev(`(function(){
    const r = document.getElementById("winEnd").getBoundingClientRect();
    return { x: r.x - 4, y: r.y - 4, width: r.width + 8, height: r.height + 8 };
  })()`);
  const shot = await S("Page.captureScreenshot", { format: "png", clip: { ...box, scale: 2 } });
  fs.writeFileSync(OUT.replace(/\.png$/, "_empty.png"), Buffer.from(shot.data, "base64"));
}

/* 스크린샷은 잰 화면 그대로 — 마지막 벌을 지우고 원래 스냅샷을 되살린다. */
await ev(`(function(){
  const S = window.__S;
  S.loot = [
    { k:"wand",  tier:4, af:[{id:"dmg",v:10}], worn:true,  gold:0, bagged:false, n:"x", slot:"지팡이" },
    { k:"robe",  tier:1, af:[],                worn:false, gold:9, bagged:false, n:"y", slot:"망토" },
    { k:"charm", tier:3, af:[{id:"mp",v:1}],   worn:false, gold:0, bagged:true,  n:"z", slot:"부적" },
  ];
  S.floor = 9; S.killed = 20; window.__die();
})()`);
await new Promise(r => setTimeout(r, 300));
const { data } = await S("Page.captureScreenshot", { format: "png" });
fs.mkdirSync(OUT.replace(/\/[^/]+$/, ""), { recursive: true });
fs.writeFileSync(OUT, Buffer.from(data, "base64"));

/* ── 판정 ── 각 줄 PASS/FAIL, 하나라도 FAIL 이면 exit 1 ── */
const wearBagGold = O.fates.includes("착용") && O.fates.includes("가방") && O.fates.includes("금");
const lines = [
  ["① 정산만 떴다(다른 창 0)", O.endOn && O.on.length === 1, `열린창=[${O.on.join(",")}]`],
  ["② 칸 수 == 스냅샷 loot", O.nCells === O.lootLen && O.lootLen === 3, `칸=${O.nCells} loot=${O.lootLen} (실제쌓임=${R.real})`],
  ["③ 등급 클래스 = tier", O.tierOk, O.tierDetail],
  ["④ 갈림 표식(착용·가방·금)", wearBagGold, `[${O.fates.join(",")}]`],
  ["⑤ 닫으면 town", !C.endOn && C.modeTown, `endOn=${C.endOn} town=${C.modeTown}`],
  /* ⑩ 창이 뜨면 로그가 **창을 가리지 않는다.** 푸는 길이 둘이고 둘 다 옳다 —
     패널 안이면 그대로 두고(안 겹친다), 전장 위면 감춘다. 어느 쪽이든 닫으면 돌아온다. */
  ["⑩ 창이 뜨면 로그가 창을 안 가린다",
    O.logSaid && !O.logOverWin && (O.inRail ? O.logDrawn : !O.logDrawn) && C.logDrawn,
    `할말=${O.logSaid}«${O.logText}» 패널안=${O.inRail} 창가림=${O.logOverWin} 창중그려짐=${O.logDrawn} 닫은뒤=${C.logDrawn}`],
  ["⑥ 재입장 — 창 닫힘·loot 0", !D.endOn && D.lootLen === 0, `endOn=${D.endOn} loot=${D.lootLen}`],
  ["⑦ 콘솔 오류 0", errors.length === 0, errors.slice(0, 3).join(" | ") || "없음"],
  ["⑧ 부제 토막이 안 꺾인다", wrapBad.length === 0,
    wrapRuns.map(x => `${x.label}:${x.lines}줄${x.split.length ? "«" + x.split.join("/") + "»" : ""}`).join(" ")],
  ["⑨ 빈손 — 자취 넉 장이 선다", E.n === 4 && eValsOk && E.over.length === 0 && E.emptyLines === 1,
    `칸=${E.n} 값=[${E.vals.join(",")}] 이름=[${E.lbls.join(",")}] 빈손줄=${E.emptyLines}줄`
    + `${E.over.length ? " 넘침«" + E.over.join("/") + "»" : ""}`],
];
let ok = true;
for (const [name, pass, detail] of lines) {
  if (!pass) ok = false;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}  — ${detail}`);
}
console.log(`saved ${OUT}`);

await raw("Target.closeTarget", { targetId });
bws.close();
process.exit(ok ? 0 : 1);
