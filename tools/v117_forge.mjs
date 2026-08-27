/* V-117 자 — **저절로 타는 금을 판이 말하는가.**
   재는 것 셋:
     ㉠ **막이(결정적)** — 저장을 심고 `autoForge()` 를 손으로 마흔 번 부른 뒤
        {금 · 강화 · 재련} 지문을 뜬다. 고치기 전과 **한 톨도 안 달라야** 한다.
        (여기엔 난수도 벽시계도 없다 — 판을 굴리지 않으므로 되풀이가 정확하다.)
     ㉡ **말하는가** — 실제로 판을 굴려(사람이 걷는 길 그대로 · [[probe-must-walk-the-real-path]])
        로그에 「금이 어디로 갔는지」 말하는 줄이 몇이나 서는가.
     ㉢ **얼마가 조용히 사라졌나** — 같은 판에서 줄어든 금.
     ㉣ **로그를 뒤덮지 않는가** — 전체 줄 대비 강화 줄의 몫.
   문: `node tools/v117_forge.mjs old` → `__FORGESAYOLD` 로 고치기 «전»을 잰다. */
import fs from "node:fs";
const OLD = process.argv[2] === "old";
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
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
const shot = async n => { const { data } = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync("tmp/" + n + ".png", Buffer.from(data, "base64")); };

/* 오래 논 사람을 심는다 — 이 흠은 **은행이 있어야** 보인다(처음 켠 사람은 금이 세 자리다). */
const SEED = `(()=>{const C=globalThis.__C,M=C.META;
  M.lv=46;M.xp=200;M.gold=1823400;M.deepest=34;M.best=34;M.corpses=880;M.relics=7;M.rebirths=2;
  M.up={hp:12,mp:9,dmg:14,army:6};M.plus={wand:9,robe:7,charm:5,helm:6,glove:4,ring:8};
  const ks=["wand","robe","charm","helm","glove","ring"];
  ks.forEach((k,i)=>{M.equip[k]=C.mkItem(k,(C.GEAR[k].tiers.length-1)-(i%2),false,30)});
  M.bag=[];for(let i=0;i<20;i++){const k=ks[i%6];M.bag.push(C.mkItem(k,1+(i%(C.GEAR[k].tiers.length-1)),false,30))}
  C.saveMeta();return M.gold})()`;
const boot = async (w = 1512, h = 863) => {
  await S("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 2, mobile: false });
  await S("Page.reload", { ignoreCache: true }); await wait(1100);
  await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
  await S("Page.reload", { ignoreCache: true }); await wait(2500);
  await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
  await ev(SEED);
  await S("Page.reload", { ignoreCache: true }); await wait(2600);
  await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
  if (OLD) await ev(`window.__FORGESAYOLD=1`);
};

/* ══ ㉠ 막이 — 사는 셈이 한 톨도 안 바뀌었는가(결정적) ══ */
await boot();
/* ★ **끝 금만 견주면 두 판이 858 만큼 달라 보인다** — 판이 굽는 동안에도 전리품 금이
   들어오므로 «시작 금»이 실행마다 다르다([[threshold-and-ruler-must-match]]).
   재야 하는 것은 남은 금이 아니라 **쓴 금**이다. */
const 지문 = await ev(`(()=>{const C=globalThis.__C,M=C.META; const g0=M.gold|0;
  let n=0; for(let i=0;i<40;i++){const b=C.autoForge(); if(!b.length)break; n+=b.length;}
  return JSON.stringify({산것:n, 쓴금:g0-(M.gold|0), 강화:JSON.stringify(M.up), 재련:JSON.stringify(M.plus)})})()`);
console.log("㉠ 막이 " + 지문);

/* ══ ㉡㉢㉣ 판을 굴린다 — 마을 → 입구 → (표) → 25초 ══ */
await boot();
const 마을금 = await ev(`(()=>globalThis.__C.META.gold|0)()`);
await ev(`(()=>{const g=document.getElementById('goGate');if(g)g.click();return 1})()`); await wait(900);
await ev(`(()=>{const rows=[...document.querySelectorAll('#winDive .wayRow,#winDive [data-way],#winDive .cell')].filter(r=>!r.classList.contains('lock'));const last=rows.pop();if(last)last.click();return rows.length})()`);
await wait(350);
await ev(`(()=>{const b=[...document.querySelectorAll('#winDive button')].find(x=>!/나가기|그만/.test(x.textContent));if(b)b.click();return 1})()`);
await wait(2000);
/* ★ **흐르는 로그를 곁눈질로 재면 놓친다**(V-114b ③) — 로그는 34줄만 들고 있어서
   판이 시끄러우면 강화 줄이 밀려 나간다. 판 «안»에 거둠이를 세워 지나간 줄을 다 줍는다. */
await ev(`(()=>{const C=globalThis.__C,S=C.S; const seen=new Set(); globalThis.__FG={lines:[],gold:0};
  globalThis.__FGT=setInterval(()=>{ for(const l of (S.log||[])){ if(!/대장간/.test(l)||seen.has(l))continue;
    seen.add(l); const t=l.replace(/<[^>]*>/g,'');
    const m=t.match(/금\\s*([\\d.]+)([kM])?/); let g=m?parseFloat(m[1]):0;
    if(m&&m[2]==='k')g*=1000; if(m&&m[2]==='M')g*=1000000;
    const n=(t.match(/×(\\d+)\\s*$/)||[])[1]; g*= n?+n:1;
    globalThis.__FG.lines.push(t); globalThis.__FG.gold+=g; } },500); return 1})()`);
/* ★ **끝 프레임만 찍으면 그 줄이 안 보인다** — 판 위 로그는 세 줄만 서고 대장간은
   들어선 직후에 몰아서 탄다. 줄이 «판에 실제로 서 있는» 그 순간을 찍는다
   ([[play-it-before-measuring-it]]). */
globalThis.__SHOTDONE = false;
const 봄 = async () => (await ev(`(()=>{const el=document.getElementById('log')||document.querySelector('#log,.log');
  return !!(el&&/대장간/.test(el.textContent))})()`));
const 든층 = await ev(`(()=>{const C=globalThis.__C;return JSON.stringify({at:MODE.at,floor:C.S.floor,gold:C.META.gold|0})})()`);
for (let i = 0; i < 46; i++) {            /* 23초를 0.5초씩 쪼개 보며 그 순간을 노린다 */
  await wait(500);
  if (!globalThis.__SHOTDONE && await 봄()) { await shot(OLD ? "v117_say_old" : "v117_say"); globalThis.__SHOTDONE = true; }
}
const 잰것 = await ev(`(()=>{const C=globalThis.__C,S=C.S; clearInterval(globalThis.__FGT);
  const F=globalThis.__FG||{lines:[],gold:0};
  return JSON.stringify({금:C.META.gold|0, 층:S.floor, 게임초:+(S.t||0).toFixed(1),
    강화줄:F.lines.length, 적힌금:Math.round(F.gold), 첫줄:F.lines[0]||"", 끝줄:F.lines[F.lines.length-1]||""})})()`);
await shot(OLD ? "v117_old" : "v117_new");
console.log("㉡ 든 곳 " + 든층);
console.log(`㉢ 마을 금 ${마을금.toLocaleString()}`);
console.log("㉡㉣ " + 잰것);
await raw("Target.closeTarget", { targetId });
process.exit(0);
