/* 「위 띠가 **가끔** 말줄임에 먹힌다」 — 그 **가끔**이 어느 값인지 잰다.
     node tools/topbar_stress.mjs [url]

   leave_qa 가 두 줄로 운 날(2026-08-14 09:1x) 홀로 돌리면 통과했다. 되풀이가 안 되는
   까닭은 하나뿐이다 — **재는 값이 판 상태에서 온다.** 위 띠 오른쪽 「금」은
   `toLocaleString()` 이라 자릿수가 자랄수록 넓어지고(1,234,567 은 아홉 글자),
   그 줄에서 줄어들 수 있는 칸은 `overflow:hidden` 이 걸린 **왼쪽 하나뿐**이다.
   즉 금이 불어난 세이브로 자를 돌리면 왼쪽이 먹히고, 새 세이브로 돌리면 통과한다.

   그래서 이 자는 **금·레벨·깊이를 손으로 키워 가며** 어느 자리에서 넘치는지 찾는다.
   ★ 폭은 360(제일 좁은 폰) · 414 · 560(그 위는 `.lw` 가 살아나는 다른 줄) 셋을 다 본다.
   ★ 마을·던전 둘 다 — 왼쪽 글자가 다르다(「깊이 37층」 vs 「적 24」).
   통과 조건: 세 폭 × 두 곳 × 모든 금 자릿수에서 넘침 0. */
const CDP = "http://127.0.0.1:9333";
const PAGE = process.argv[2] || "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const ev = async (e) => JSON.parse((await S("Runtime.evaluate", { returnByValue: true, expression: e, awaitPromise: true })).result.value);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });

const GOLDS = [0, 999, 9999, 99999, 999999, 9999999];
const WIDTHS = [360, 414, 560];
let bad = 0;
const rows = [];

for (const w of WIDTHS) {
  await S("Emulation.setDeviceMetricsOverride", { width: w, height: 800, deviceScaleFactor: 2, mobile: true });
  await S("Page.navigate", { url: PAGE });
  await wait(5200);
  for (const gold of GOLDS) {
    /* 제일 나쁜 판 — 깊이 세 자리 · 레벨 두 자리 · 배수도 네 자리(×1.2k) 자리를 먹는 층. */
    await S("Runtime.evaluate", { expression:
      `window.META.gold = ${gold}; window.META.deepest = 137; window.META.lv = 42; window.saveMeta();` });
    for (const where of ["town", "dungeon"]) {
      if (where === "dungeon") {
        await S("Runtime.evaluate", { awaitPromise: true, expression: `(async()=>{
          const bat = await import("/js/battle.js"), core = await import("/js/core.js");
          window.toDungeon(); bat.enterFloor(137);
          for (let i=0;i<40 && !core.S.mobs[0];i++) await new Promise(r=>setTimeout(r,100));
          const m0 = core.S.mobs[0]; if (m0) while (core.S.mobs.length < 24) core.S.mobs.push({...m0});
        })()` });
      } else {
        await S("Runtime.evaluate", { expression: `window.toTown && window.toTown()` });
      }
      await wait(450);
      /* leave_qa 와 **같은 눈**으로 본다 — 글자가 든 칸만, display:none 은 뺀다. */
      const r = await ev(`(()=>{const out=[];
        const cells = ["#hLeft","#hFloor","#hDepth"].map(q=>document.querySelector(q))
          .concat([...document.querySelectorAll(".who > *, .res > *")]);
        for (const e of cells) { if(!e || !e.textContent.trim()) continue;
          if (getComputedStyle(e).display === "none") continue;
          const clip = e.scrollWidth - e.clientWidth;
          if (clip > 1) out.push({ 칸:(e.id||e.className||e.tagName), 글자:e.textContent.trim(), 넘침:clip }); }
        return JSON.stringify({ 왼쪽: document.getElementById("hLeft").textContent.trim(),
                                금: (document.getElementById("hGold")||{}).textContent, 먹힘: out });})()`);
      const ok = r.먹힘.length === 0;
      if (!ok) bad++;
      rows.push(`${ok ? "  ok" : "FAIL"}  ${w}px ${where === "town" ? "마을" : "던전"} 금 ${String(r.금).padStart(9)} · 왼쪽 ⟨${r.왼쪽}⟩`
        + (ok ? "" : "  → " + r.먹힘.map(x => `${x.칸} ⟨${x.글자}⟩ ${x.넘침}px`).join(", ")));
    }
  }
}
console.log(rows.join("\n"));
console.log(bad === 0 ? "\n통과 — 어느 금 자릿수에서도 안 먹힌다" : `\n틀림 ${bad}건 — 위 띠가 금 자릿수에 따라 먹힌다`);
await S("Target.closeTarget", { targetId }).catch(() => {});
bws.close();
process.exit(bad === 0 ? 0 : 1);
