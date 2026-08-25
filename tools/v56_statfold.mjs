/* V-56 자 — **「능력치」 창의 수치판이 «줄 한가운데»에서 잘린다.**
   창 이름이 「능력치」인데 정작 수치 여덟 줄 중 대여섯만 서고, 마지막 줄은
   글자의 위 절반만 보인 채 접힌다. `fitDollStat()` 이 인물을 30px 바닥까지
   줄여도 안 들어가면 **그대로 포기**하기 때문이다(바닥에 닿으면 break).

   재는 것(창 크기 여섯 · 그리는 자리의 네모를 그대로 읽는다):
     · 수치 줄 가운데 **접힌 자리 아래로 통째로 숨은 줄**
     · **반쯤 잘린 줄**(위는 보이는데 아래가 없다 — 사람이 제일 싫어하는 것)
     · 수치판이 상자 밖으로 넘친 **px**
     · 그때 인물 칸(`--pdS`)이 몇 px 인지 = 바닥(30)에 닿았는가
   node tools/v56_statfold.mjs   (문 없이 · 지금 그대로) */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev2 => { const m = JSON.parse(ev2.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const shot = async (out) => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); };

/* look_shots 와 **같은 사람**을 심는다 — 자마다 딴 사람을 쓰면 줄 수가 달라져 못 견준다. */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: {}, bag: [], tree: { bone: 8, armor: 3, ghoul: 1, golem: 1, legion: 2 }, quests: {}, relics: 0, rebirths: 0,
  best: 52, lastSeen: 0, corpses: 0 };

const SIZES = [[1512, 863], [1512, 800], [1366, 768], [1366, 700], [1440, 660], [1280, 620]];
const out = [];
for (const [W, H] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
  await S("Page.reload", { ignoreCache: true }); await wait(2200);
  await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
  await S("Page.reload", { ignoreCache: true }); await wait(1800);
  await ev(`window.__openWin && window.__openWin("stat")`); await wait(700);
  if (!await ev(`!!document.getElementById("winStat")?.classList.contains("on")`)) { out.push([`${W}×${H}`, "창이 안 열렸다"]); continue; }
  const r = await ev(`(()=>{const body=document.getElementById("statBody");
    const nums=body.querySelector(".sStat:not(.jList)"); if(!nums) return {none:true};
    const br=body.getBoundingClientRect(), nr=nums.getBoundingClientRect();
    const rows=[...nums.querySelectorAll(".tipStat")].map(x=>x.getBoundingClientRect());
    const doll=body.querySelector(".pdoll");
    /* ★ 「밑자락 그늘」(.wScroll::after · 34px)이 덮는 띠는 **안 읽히는 자리**다.
       네모만 재면 「다 들어갔다」인데 켜서 보면 잘려 있다 — 자를 눈에 맞춘다. */
    const fade=parseFloat(getComputedStyle(body,"::after").height)||34;
    const lim=br.bottom-fade;
    const cut=rows.filter(x=>x.top<lim-.5&&x.bottom>lim+.5);
    return {rows:rows.length,
      hidden:rows.filter(x=>x.top>=lim-.5).length, fade:Math.round(fade),
      cut:cut.length, cutName:cut.map(x=>x.height?"":"").length,
      over:Math.round(Math.max(0,nr.bottom-lim)),
      rowH:rows.length?Math.round(rows[0].height):0,
      pdS:doll?getComputedStyle(doll).getPropertyValue("--pdS").trim():"(인물없음)",
      dollH:doll?Math.round(doll.getBoundingClientRect().height):0,
      boxH:Math.round(br.height), inner:Math.round(body.scrollHeight)};
  })()`);
  out.push([`${W}×${H}`, r.none ? "수치판이 없다"
    : `수치 ${r.rows}줄(줄높이 ${r.rowH}px) · 숨은 줄 ${r.hidden} · **반쯤 잘린 줄 ${r.cut}** · 넘침 ${r.over}px · 인물칸 ${r.pdS}(높이 ${r.dollH}) · 상자 ${r.boxH}`]);
  await shot(`tmp/v56_stat_${W}x${H}${process.env.V56TAG || ""}.png`);
}
for (const r of out) console.log("── " + r[0] + "\n   " + r[1]);
console.log("콘솔오류", errs.length, errs.slice(0, 3));
await raw("Target.closeTarget", { targetId });
process.exit(0);
