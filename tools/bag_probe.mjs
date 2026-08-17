/* 가방이 **뜻대로 도는가** — 판을 굴리지 않고 core.js 를 불러 물건을 직접 넣어 잰다.
   affix_probe 와 같은 뼈대(CDP 9333 + 8774/index.html)다. 저건 「붙는 옵션이 맞나」,
   이건 「가방이 차면 제일 나쁜 것부터 녹나」.

   가방이 6×2=12칸(물건 하나가 한 칸)에서 D2 처럼 10×4=40칸(물건마다 차지하는 칸이 다름)으로
   바뀌어, 자는 **「칸 수」가 아니라 「들어가느냐(bagPack.overflow)」로** 잰다. 재는 뜻은 그대로다.

   재는 것 — 하나라도 FAIL 이면 exit code 1:
     ①ㄱ **진짜 길**(takeDrop)로 200개를 주워도 overflow 0·40칸을 안 넘고 유니크가 가방을 안 먹는가
     ①ㄴ 40칸을 채운 뒤 하나 더 넣으면 **점수 제일 낮은 것부터** 녹는가(크기 1 로 결정적으로)
     ② 넘칠 때 녹은 금이 meltGold 와 일치하고 META.gold 가 그만큼 늘었는가
     ③ 더 좋은 것을 주우면 착용되고 **벗은 것이 가방에 들어갔는가**
     ④ 더 나쁜 것을 주우면 가방으로 가고, 가방이 꽉 차고 그것이 제일 나쁘면 **그 자리서 금**인가
     ⑤ 저장이 모르는 슬롯을 들고 와도 걸러지고 넘쳐도 안 터지는가
     ⑥ 200개를 줍는 **내내** bagPack.overflow 가 늘 0 이고 찬 칸이 40을 안 넘는가

     node tools/bag_probe.mjs */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [], netfail = [];
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push("EXC " + (m.params.exceptionDetails?.exception?.description || ""));
  if (m.method === "Network.loadingFailed") netfail.push(m.params.errorText); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");

/* META 를 깨끗한 바닥에서 시작하려 저장을 지우고 새로 뜬다 — 지난 판이 남긴
   장비·금이 있으면 ③④ 의 「벗은 것」·「늘어난 금」을 셈이 어긋난다. */
await S("Page.navigate", { url: PAGE });
await new Promise(r => setTimeout(r, 1200));
await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4200));

const ex = `(async()=>{
  const C = await import("/js/core.js");
  window.S && (window.S.speed = 0);                 // 판을 멈춘다 — 굴러가는 드랍이 META 를 건드리면 셈이 어긋난다
  const M = C.META;
  const reset = () => { M.bag.length = 0; M.gold = 0; M.equip = {}; for (const k of C.GEAR_KEYS) M.equip[k] = null; };
  const charm = (v) => ({ k:"charm", tier:4, af:[{id:"dmg",v}], v:0 });   // 1×1 · 최고등급이라 안 합쳐진다 · v 로 점수를 가른다
  const pack = () => C.bagPack(M.bag);
  const out = [];
  const rec = (name, ok, detail) => out.push({ name, ok, detail });

  /* ①ㄱ **사람이 지나는 길로 잰다**(2026-08-15). rollDrop 을 bagPut 에 직접 넣으면 유니크가
     쌓여 FAIL 하므로(bagPut 은 유니크를 안 녹인다) 진짜 길(takeDrop)로 200개를 줍고, 매
     걸음 bagPack 을 재 overflow 가 0·40칸을 안 넘는지(⑥) 함께 본다. */
  reset();
  let 터짐1 = null, 넘친적 = 0, 초과 = 0;
  try { for (let i=0;i<200;i++){ C.takeDrop(C.rollDrop(20));
        const p = pack(); if (p.overflow.length) 넘친적++; if (p.used > C.BAG_MAX) 초과++; } }
  catch (e) { 터짐1 = String(e && e.message || e); }
  const 낀유니크  = C.GEAR_KEYS.map(k=>M.equip[k]).filter(x=>x&&x.uid).map(x=>x.uid);
  const 가방유니크 = M.bag.filter(x=>x&&x.uid).map(x=>x.uid);
  const uids = 낀유니크.concat(가방유니크);
  const 중복없음 = new Set(uids).size === uids.length;          // 같은 유니크는 두 번 안 쌓인다(둘째는 그 자리서 금)
  const 평범 = M.bag.filter(x=>!x.uid).length;                  // 유니크가 가방을 통째로 먹지 않는다(합성 고리가 산다)
  const p1 = pack();
  const ok1 = 터짐1===null && p1.overflow.length===0 && p1.used<=C.BAG_MAX
              && 중복없음 && 가방유니크.length<=C.UNIQUE.length && 평범>=5;
  rec("①ㄱ 진짜 길(takeDrop) 200개 → overflow 0 · 40칸 유지 · 유니크가 가방을 안 먹는다", ok1,
      "used="+p1.used+" overflow="+p1.overflow.length+" 유니크(낀/가방)="+낀유니크.length+"/"+가방유니크.length
      +" 평범="+평범+" 중복없음="+중복없음+" 터짐="+터짐1);

  // ⑥ 200개를 줍는 내내 overflow 0 · 40칸 초과 0 (①ㄱ 이 매 걸음 잰 것)
  rec("⑥ 줍는 내내 overflow 0 · 40칸 초과 0", 넘친적===0 && 초과===0,
      "넘친적="+넘친적+" 40초과="+초과);

  // ①ㄴ 40칸을 채운 뒤 하나 더 → 점수 최저부터 녹는다(크기 1 로 결정적으로)
  reset();
  for (let i=0;i<40;i++) M.bag.push(charm(100+i));             // 점수 100..139 로 40칸 꽉
  const g0b = M.gold, expB = C.meltGold(charm(0));
  const melt1 = C.bagPut(charm(500));                          // 제일 높은 것 → 제일 낮은(v=100)이 녹는다
  const vals1 = M.bag.map(x=>x.af[0].v).sort((a,b)=>a-b);
  const 낮은게녹음 = melt1.length===1 && vals1[0]===101 && vals1.includes(500)
                    && melt1[0].gold===expB && (M.gold-g0b)===expB && pack().used===40;
  const melt2 = C.bagPut(charm(1));                            // 제일 낮은 것 → 그 자리서 녹는다(안 남는다)
  const 나쁜건그자리서 = melt2.length===1 && !M.bag.some(x=>x.af[0].v===1) && pack().used===40;
  rec("①ㄴ 40칸 참 → 점수 최저부터 녹는다 · 제일 나쁜 것은 그 자리서", 낮은게녹음 && 나쁜건그자리서,
      "낮은게녹음="+낮은게녹음+" 나쁜건그자리서="+나쁜건그자리서+" 남은최저="+vals1[0]);

  // ② 넘칠 때 녹은 금 = meltGold · META.gold 그만큼 증가
  reset();
  for (let i=0;i<40;i++) M.bag.push(charm(200+i));             // 높은 점수로 40칸 꽉
  const worst  = C.mkItem("wand",1,true);                      // 제일 나쁜 것(1×3 · 점수 100) — 넣는 순간 녹아야 한다
  const expect = C.meltGold(worst), g2 = M.gold;
  const melted = C.bagPut(worst);
  const ok2 = melted.length===1 && melted[0].gold===expect && (M.gold-g2)===expect
              && !M.bag.includes(worst) && pack().used===40;
  rec("② 넘침 → 녹은 금 = meltGold · gold 증가", ok2,
      "expect="+expect+" got="+(melted[0]&&melted[0].gold)+" Δgold="+(M.gold-g2)+" used="+pack().used);

  // ③ 더 좋은 것 → 착용 · 벗은 것이 가방으로
  reset();
  M.equip.wand = C.mkItem("wand",2,true);
  const oldTier = M.equip.wand.tier;
  const r3 = C.takeDrop({ k:"wand", tier:4, af:[{id:"dmg",v:30},{id:"mdmg",v:40}] });
  const ok3 = r3.worn===true && r3.bagged===false && M.bag.length===1 && M.bag[0].tier===oldTier;
  rec("③ 더 좋은 것 → 착용 · 벗은 것 가방행", ok3,
      "worn="+r3.worn+" bag="+M.bag.length+" 벗은등급="+(M.bag[0]&&M.bag[0].tier));

  // ④ 더 나쁜 것 · 가방 꽉 참 · 제일 나쁨 → 그 자리서 금
  reset();
  M.equip.wand = C.mkItem("wand",4);                          // 낀 것은 세다 → 갈아 끼우지 않는다
  for (let i=0;i<40;i++) M.bag.push(charm(200+i));            // 높은 점수로 40칸 꽉
  const worse = { k:"wand", tier:1, af:[] };
  const expect4 = C.meltGold(worse), g4 = M.gold;
  const r4 = C.takeDrop(worse);
  const ok4 = r4.worn===false && r4.bagged===false && r4.gold===expect4
              && (M.gold-g4)===expect4 && pack().used===40;
  rec("④ 더 나쁨 · 가방 꽉 참 → 그 자리서 금", ok4,
      "worn="+r4.worn+" bagged="+r4.bagged+" gold="+r4.gold+" expect="+expect4);

  return JSON.stringify(out);
})()`;
const r = await S("Runtime.evaluate", { expression: ex, awaitPromise: true, returnByValue: true });
const results = JSON.parse(r.result.value);

/* ⑤ **저장이 모르는 슬롯을 들고 와도 판이 안 터진다.** 2026-08-13 winscroll_qa 가 GEAR 에
   없는 `amul` 넷을 저장에 심었고, 그것을 물려받은 leave_qa 가 **가방이 넘치는 순간**
   `meltGold` 의 `GEAR[it.k].cost` 에서 터졌다 — 하필 그 자리가 「물러남」이라 판을 접을
   때마다 맞았다. 슬롯 이름은 언제든 바뀌므로(옛 이름·오타·지워진 슬롯) 저장을 믿지 않는다.
   ★ 씨앗을 심고 **새로 띄워서** 잰다 — 거르는 자리가 모듈이 뜰 때라 reload 없이는 못 잰다.
     그리고 「걸러졌나」만 보지 않고 **넘치게 넣어 터지는지까지** 본다(터지던 그 자리가 거기다). */
await S("Runtime.evaluate", { expression: `localStorage.setItem("necro.meta.v1", JSON.stringify({
  gold: 0, bag: [ {k:"amul",tier:1,af:[]}, {k:"wand",tier:1,af:[]}, {k:"robe",tier:99,af:[]} ],
  equip: { wand: {k:"amul",tier:2,af:[]}, robe: null, charm: null } }))` });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4200));
const errs0 = errs.length;
const r5 = await S("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: `(async()=>{
  const C = await import("/js/core.js"); const M = C.META;
  window.S && (window.S.speed = 0);
  const 남은것 = M.bag.map(x=>x.k+":"+x.tier);
  const 낀것   = C.equipped("wand");
  let 터짐 = null;
  try { for (let i=0;i<20;i++) C.bagPut(C.mkItem("wand",1,true)); }   // 넘치게 넣어 녹이는 길을 지난다
  catch (e) { 터짐 = String(e && e.message || e); }
  return JSON.stringify({ 남은것, 낀것: 낀것 ? 낀것.k : null, 터짐,
    used: C.bagPack(M.bag).used, 넘침: C.bagPack(M.bag).overflow.length });
})()` });
const g5 = JSON.parse(r5.result.value);
const ok5 = g5.남은것.length === 1 && g5.남은것[0] === "wand:1" && g5.낀것 === null
            && g5.터짐 === null && g5.used <= 40 && g5.넘침 === 0 && errs.length === errs0;
results.push({ name: "⑤ 모르는 슬롯이 든 저장 → 걸러지고 넘쳐도 안 터진다", ok: ok5,
  detail: "남은가방=" + JSON.stringify(g5.남은것) + " 낀것=" + g5.낀것 + " 터짐=" + g5.터짐 + " used=" + g5.used + " 넘침=" + g5.넘침 });

let bad = 0;
for (const t of results) { if (!t.ok) bad++; console.log((t.ok ? "PASS" : "FAIL") + "  " + t.name + " — " + t.detail); }
if (errs.length || netfail.length) console.log("errors:", errs.slice(0,4), "netfail:", netfail.slice(0,4));
await raw("Target.closeTarget", { targetId }); bws.close();
process.exit(bad ? 1 : 0);
