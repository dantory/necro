/* 합성이 **뜻대로 도는가** — 판을 굴리지 않고 core.js 를 불러 물건을 직접 넣어 잰다.
   bag_probe 와 **같은 뼈대**(CDP 9333 + 8774/index.html)다. 저건 「가방이 차면 제일 나쁜
   것부터 녹나」, 이건 「녹기 전에 같은 슬롯·같은 등급 셋이 한 단계 위로 합쳐지나」.

   재는 것 여섯 — 하나라도 FAIL 이면 exit code 1:
     ① tier 1 셋 → 가방에 tier 2 하나 · tier 1 은 0개
     ② tier 1 아홉 → tier 3 하나(연쇄) · 중간 산물(tier 1·2) 안 남음
     ③ 꼭대기 등급(마지막 tier) 셋은 안 합쳐진다 — 셋이 그대로
     ④ 슬롯이 다르면 안 합쳐진다(wand 둘 + robe 하나 → 그대로 셋)
     ⑤ 합쳐진 것이 낀 것보다 좋으면 자동 착용 · 벗은 것이 가방에
     ⑥ 200개를 던져도 가방은 12칸을 안 넘고, 금 이중가산이 없다(Δgold = Σ녹은금)

   ⑦(cdp_verify ui 오류·netfail 0)은 별도 명령으로 잰다: node tools/cdp_verify.mjs <out.png> ui

     node tools/fuse_probe.mjs */
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

/* 깨끗한 바닥에서 시작하려 저장을 지우고 새로 뜬다 — 지난 판의 장비·금이 있으면 셈이 어긋난다. */
await S("Page.navigate", { url: PAGE });
await new Promise(r => setTimeout(r, 1200));
await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 2, mobile: true });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4200));

const ex = `(async()=>{
  const C = await import("/js/core.js");
  window.S && (window.S.speed = 0);
  const M = C.META;
  const reset = () => { M.bag.length = 0; M.gold = 0; M.equip = { wand:null, robe:null, charm:null }; };
  /* 합쳐진 것이 자동 착용돼 가방에서 빠지면 개수 셈이 흔들린다 — 견줄 슬롯을 **넘볼 수 없게**
     낀 것을 큰 옵션으로 잠가 둔다(합성 산물의 점수보다 훨씬 높게). */
  const lock = (k) => { M.equip[k] = { k, tier: C.GEAR[k].tiers.length - 1, af: [{ id:"army", v:50 }] }; };
  const cnt = (k, t) => M.bag.filter(x => x.k === k && x.tier === t).length;
  const out = [];
  const rec = (name, ok, detail) => out.push({ name, ok, detail });

  // ① tier 1 셋 → 가방에 tier 2 하나 · tier 1 은 0개
  reset(); lock("wand");
  for (let i=0;i<3;i++) C.bagPut(C.mkItem("wand",1,true));
  rec("① tier1 셋 → tier2 하나 · tier1 0", cnt("wand",1)===0 && cnt("wand",2)===1 && M.bag.length===1,
      "t1="+cnt("wand",1)+" t2="+cnt("wand",2)+" bag="+M.bag.length);

  // ② tier 1 아홉 → tier 3 하나(연쇄) · 중간 산물 안 남음
  reset(); lock("wand");
  for (let i=0;i<9;i++) C.bagPut(C.mkItem("wand",1,true));
  rec("② tier1 아홉 → tier3 하나(연쇄) · 중간 없음",
      M.bag.length===1 && M.bag[0] && M.bag[0].tier===3 && cnt("wand",1)===0 && cnt("wand",2)===0,
      "bag="+M.bag.length+" tier="+(M.bag[0]&&M.bag[0].tier)+" t1="+cnt("wand",1)+" t2="+cnt("wand",2));

  // ③ 꼭대기 등급 셋은 안 합쳐진다 — 셋이 그대로
  reset();
  const top = C.GEAR.wand.tiers.length - 1;
  for (let i=0;i<3;i++) C.bagPut(C.mkItem("wand",top,true));
  rec("③ 꼭대기 등급 셋은 안 합쳐진다", M.bag.length===3 && M.bag.every(x=>x.tier===top),
      "bag="+M.bag.length+" tiers=["+M.bag.map(x=>x.tier).join(",")+"] top="+top);

  // ④ 슬롯이 다르면 안 합쳐진다(wand 둘 + robe 하나 → 그대로 셋)
  reset(); lock("wand"); lock("robe");
  C.bagPut(C.mkItem("wand",2,true)); C.bagPut(C.mkItem("wand",2,true)); C.bagPut(C.mkItem("robe",2,true));
  rec("④ 슬롯 다르면 안 합쳐짐(wand2 + robe1)", M.bag.length===3 && cnt("wand",2)===2 && cnt("robe",2)===1,
      "bag="+M.bag.length+" wand2="+cnt("wand",2)+" robe2="+cnt("robe",2));

  // ⑤ 합쳐진 것이 낀 것보다 좋으면 자동 착용 · 벗은 것이 가방에
  reset();
  M.equip.wand = C.mkItem("wand",1,true);                 // 낮게 — 합쳐진 tier2 가 이겨야 한다
  for (let i=0;i<3;i++) C.bagPut(C.mkItem("wand",1,true));
  rec("⑤ 합친 것이 낀 것보다 좋으면 자동 착용 · 벗은 것 가방행",
      M.equip.wand && M.equip.wand.tier===2 && M.bag.length===1 && M.bag[0] && M.bag[0].tier===1,
      "낀등급="+(M.equip.wand&&M.equip.wand.tier)+" bag="+M.bag.length+" 벗은등급="+(M.bag[0]&&M.bag[0].tier));

  // ⑥ 200개 → 12칸 안 넘음 · 금 이중가산 없음(Δgold = Σ녹은금)
  reset();
  const g0 = M.gold; let meltSum = 0, maxBag = 0;
  for (let i=0;i<200;i++){ const melted = C.bagPut(C.rollDrop(20)); for (const m of melted) meltSum += m.gold; maxBag = Math.max(maxBag, M.bag.length); }
  rec("⑥ 200개 → 12칸 유지 · Δgold = Σ녹은금", maxBag<=12 && (M.gold-g0)===meltSum,
      "maxBag="+maxBag+" Δgold="+(M.gold-g0)+" Σ녹은금="+meltSum);

  return JSON.stringify(out);
})()`;
const r = await S("Runtime.evaluate", { expression: ex, awaitPromise: true, returnByValue: true });
const results = JSON.parse(r.result.value);
let bad = 0;
for (const t of results) { if (!t.ok) bad++; console.log((t.ok ? "PASS" : "FAIL") + "  " + t.name + " — " + t.detail); }
if (errs.length || netfail.length) console.log("errors:", errs.slice(0,4), "netfail:", netfail.slice(0,4));
await raw("Target.closeTarget", { targetId }); bws.close();
process.exit(bad ? 1 : 0);
