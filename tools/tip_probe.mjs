/* ⑦ 떠 있는 툴팁 검수기 — bag_probe 의 뼈대(CDP 9333 + 8774/index.html)를 그대로 베낀다.
   「창 아래 붙박이 한 칸」이 아니라 **칸 옆에 뜨는 검은 상자**인지 잰다. 하나라도 FAIL 이면 exit 1.

   재는 것:
     ① 뜬다 — 칸에 mouseover 하면 #ftip 이 보이고(width>0) 그 안에 고른 물건 이름이 든다
     ② 칸 옆이다 — 상자가 칸과 안 겹치고, 가장 가까운 변까지 틈이 20px 이내다(「칸 옆」의 뜻)
     ③ 화면 안이다 — 네 귀퉁이 칸에서 상자가 화면(0,0,w,h) 밖으로 1px 도 안 난다. 세 크기에서
        재고(1512×863·1440×900·1280×800), 오른쪽 끝 칸에서는 왼쪽으로 뒤집혔는지도 본다
     ④ 벗어나면 사라진다 — mouseleave 뒤 #ftip 이 안 보인다(붙박이 아닐 때)
     ⑤ 눌러 붙박으면 남고 「끼기」가 돈다 — 칸을 눌러 붙박고, 상자 안 「끼기」로 **실제로 착용**된다.
        붙박인 동안은 마우스가 칸을 벗어나도 상자가 남는다
     ⑥ 붙박이 칸이 없어졌다 — #bagTip 이 문서에 없고, 가방 칸이 예전 58/55/47(문턱 34)보다 안 작다
     ⑦ 콘솔 오류 0 · 네트워크 실패 0

   ★ tmp/tip_hover.png — 칸에 올린 상태로 한 장 남긴다(1512×863@2x · 사람이 눈으로 본다).
     node tools/tip_probe.mjs */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
const SIZES = [[1512, 863], [1440, 900], [1280, 800]];
const CELL_MIN = { 1512: 58, 1440: 55, 1280: 47 };   // 예전 칸 한 변(ROADMAP ⑥) — 이보다 작지 않아야
const FLOOR = 34, GAP_MAX = 20;

const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [], netfail = [];
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push("EXC " + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || "?"));
  if (m.method === "Runtime.consoleAPICalled" && (m.params.type === "error" || m.params.type === "assert")) errs.push("CON " + (m.params.args || []).map(a => a.value ?? a.description ?? "").join(" "));
  if (m.method === "Network.loadingFailed") netfail.push(m.params.errorText); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.value;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");

/* 깨끗한 바닥에서 시작한다 — 지난 판의 장비가 남으면 ⑤ 의 「착용」 셈이 어긋난다. */
await S("Page.navigate", { url: PAGE });
await wait(1200);
await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.reload", { ignoreCache: true });
await wait(4200);

/* 판을 안 굴리고 가방을 **1×1 부적 40개**로 꽉 채운다 — 네 귀퉁이 칸이 다 물건 칸이라
   [data-bpick] 로 잡히고, 한 칸이 열 한 칸(콩알로 못 속인다). 0번은 이름을 잴 알아볼 물건.
   낀 것은 비워 ⑤ 의 착용이 깨끗하게 바뀌게 한다. */
await ev(`(async()=>{
  const C = await import("/js/core.js"); window.__C = C;
  window.__fill = () => {
    const M = C.META; if (window.S) window.S.speed = 0;
    M.bag = [{ k:"charm", tier:4, af:[{id:"dmg", v:77}] }];
    for (let i=1;i<40;i++) M.bag.push({ k:"charm", tier:(i%5), af:[{id:"dmg", v:10+i}] });
    for (const k of C.GEAR_KEYS) M.equip[k] = null;
    window.saveMeta && window.saveMeta();
    window.__closeAll && window.__closeAll();
    window.__openWin("bag");
  };
  window.__cell = (i) => document.querySelector('.win.on #bagBody [data-bpick="' + i + '"]');
  window.__rr = (el) => { const b = el.getBoundingClientRect();
    return { l:+b.left.toFixed(1), t:+b.top.toFixed(1), r:+b.right.toFixed(1), b:+b.bottom.toFixed(1), w:+b.width.toFixed(1), h:+b.height.toFixed(1) }; };
  window.__hover = (i) => { const c = window.__cell(i); c && c.dispatchEvent(new MouseEvent('mouseover', { bubbles:true })); };
  window.__leave = (i) => { const c = window.__cell(i); c && c.dispatchEvent(new MouseEvent('mouseout', { bubbles:true, relatedTarget:document.body })); };
  window.__vis = () => { const f = document.getElementById('ftip'); return f.classList.contains('on') && f.getBoundingClientRect().width > 0; };
  return true;
})()`);

/* 한 크기에서: 칸 폭과 네 귀퉁이 상자를 잰다(귀퉁이는 자리로 고른다 — bagPack 순서에 안 기댄다). */
const measure = async (W, H) => {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
  await ev(`window.__fill()`); await wait(600);
  return JSON.parse(await ev(`(()=>{
    const vw = innerWidth, vh = innerHeight, rr = window.__rr;
    const cells = [...document.querySelectorAll('.win.on #bagBody [data-bpick]')];
    const cw = cells.length ? Math.round(rr(window.__cell(0)).w) : 0;
    const R = cells.map(c => ({ i:+c.getAttribute('data-bpick'), r:rr(c) }));
    const minL = Math.min(...R.map(x=>x.r.l)), maxR = Math.max(...R.map(x=>x.r.r));
    const minT = Math.min(...R.map(x=>x.r.t)), maxB = Math.max(...R.map(x=>x.r.b));
    const near = (a,b) => Math.abs(a-b) < 2;
    const at = (fx) => (R.find(fx) || {}).i;
    const corners = [
      { n:'왼위',   i:at(x=>near(x.r.l,minL)&&near(x.r.t,minT)), right:false },
      { n:'오른위', i:at(x=>near(x.r.r,maxR)&&near(x.r.t,minT)), right:true  },
      { n:'왼아래', i:at(x=>near(x.r.l,minL)&&near(x.r.b,maxB)), right:false },
      { n:'오른아래', i:at(x=>near(x.r.r,maxR)&&near(x.r.b,maxB)), right:true },
    ];
    const out = [];
    for (const co of corners) {
      window.__hover(co.i);
      const b = rr(document.getElementById('ftip')), c = rr(window.__cell(co.i));
      const over = Math.max(0, -b.l, -b.t, b.r-vw, b.b-vh);
      out.push({ n:co.n, i:co.i, right:co.right, vis:window.__vis(),
                 over:+over.toFixed(1), flip:(b.r <= c.l + 1) });
    }
    return JSON.stringify({ vw, vh, cw, nCells:cells.length, corners:out });
  })()`));
};

const per = {};
let detail = null;
for (const [W, H] of SIZES) {
  per[W] = await measure(W, H);
  if (W !== 1512) continue;
  /* ①②: 물건 있는 칸 0 위에서 — 뜨고, 이름이 들고, 칸 옆이다. 그 상태로 스냅샷도 남긴다. */
  const one = JSON.parse(await ev(`(()=>{
    window.__hover(0);
    const f = document.getElementById('ftip'), b = window.__rr(f), c = window.__rr(window.__cell(0));
    const nm = window.__C.nameOf(window.__C.META.bag[0]);
    const overlap = (Math.min(b.r,c.r)-Math.max(b.l,c.l) > 1) && (Math.min(b.b,c.b)-Math.max(b.t,c.t) > 1);
    const sep = b.l >= c.r ? b.l-c.r : (c.l >= b.r ? c.l-b.r : 0);
    return JSON.stringify({ vis:window.__vis(), hasName:f.textContent.includes(nm), nm,
                            overlap, sep:+sep.toFixed(1) });
  })()`));
  const shot = await S("Page.captureScreenshot", { format: "png" });
  fs.mkdirSync("tmp", { recursive: true });
  fs.writeFileSync("tmp/tip_hover.png", Buffer.from(shot.data, "base64"));
  /* ④ 벗어나면 사라진다(붙박이 아닐 때). */
  const gone = JSON.parse(await ev(`(()=>{ window.__leave(0); return JSON.stringify({ vis:window.__vis() }); })()`));
  /* ⑤ 눌러 붙박고 → 벗어나도 남고 → 「끼기」로 실제 착용.
     가방을 **부적 하나**로 되채운다 — 부적이 여럿이면 끼우는 순간 합성(bagFuse)이 돌아
     낀 것이 그 물건이 아니게 된다(게임 규칙). 「그 슬롯의 equipped() 가 그 물건이 된다」만 잰다. */
  const pin = JSON.parse(await ev(`(()=>{
    const C = window.__C, M = C.META;
    M.bag = [{ k:"charm", tier:4, af:[{id:"dmg", v:77}] }];
    for (const k of C.GEAR_KEYS) M.equip[k] = null;
    window.saveMeta && window.saveMeta(); window.__closeAll && window.__closeAll(); window.__openWin("bag");
    const target = M.bag[0];
    window.__cell(0).click();                       // 붙박는다
    const pinnedVis = window.__vis();
    const hadBtn = !!document.querySelector('#ftip [data-bagwear]');
    window.__leave(0);                              // 칸을 벗어나도
    const stays = window.__vis();                   // 남는다
    const btn = document.querySelector('#ftip [data-bagwear]');
    if (btn) btn.click();                           // 「끼기」
    const worn = window.__C.equipped('charm') === target;
    return JSON.stringify({ pinnedVis, hadBtn, stays, worn });
  })()`));
  detail = { one, gone, pin };
}

const noBagTip = await ev(`document.getElementById('bagTip') === null`);

/* ── 판정 ── */
const out = [];
const rec = (name, ok, d) => out.push({ name, ok, d });

rec("① 뜬다 · 이름이 든다", detail.one.vis && detail.one.hasName,
    `보임=${detail.one.vis} 이름="${detail.one.nm}" 들어있음=${detail.one.hasName}`);
rec("② 칸 옆이다(안 겹치고 틈 ≤ " + GAP_MAX + "px)", !detail.one.overlap && detail.one.sep > 0 && detail.one.sep <= GAP_MAX,
    `겹침=${detail.one.overlap} 틈=${detail.one.sep}px`);

let inAll = true, flipAll = true; const cdesc = [];
for (const [W] of SIZES) { for (const co of per[W].corners) {
  if (co.over > 1 || !co.vis) inAll = false;
  if (co.right !== co.flip) flipAll = false;   // 오른쪽 끝 칸만 뒤집힌다
  cdesc.push(`${W}/${co.n}:넘침${co.over}${co.right ? (co.flip ? "·뒤집힘" : "·안뒤집힘✗") : ""}`);
} }
rec("③ 화면 안이다 · 오른쪽 끝은 뒤집힌다(세 크기 네 귀퉁이)", inAll && flipAll, cdesc.join(" "));

rec("④ 벗어나면 사라진다", detail.gone.vis === false, `벗어난뒤보임=${detail.gone.vis}`);
rec("⑤ 눌러 붙박으면 남고 「끼기」가 돈다", detail.pin.pinnedVis && detail.pin.hadBtn && detail.pin.stays && detail.pin.worn,
    `붙박임=${detail.pin.pinnedVis} 끼기단추=${detail.pin.hadBtn} 벗어나도남음=${detail.pin.stays} 착용됨=${detail.pin.worn}`);

let cellOk = noBagTip; const csz = [];
for (const [W] of SIZES) { const cw = per[W].cw; csz.push(`${W}:${cw}px≥${CELL_MIN[W]}`);
  if (cw < CELL_MIN[W] || cw < FLOOR) cellOk = false; }
rec("⑥ 붙박이 칸 없음(#bagTip) · 가방 칸이 안 작아졌다", cellOk, `#bagTip없음=${noBagTip} 칸 ${csz.join(" ")}`);

rec("⑦ 콘솔 오류 0 · 네트워크 실패 0", errs.length === 0 && netfail.length === 0,
    `오류=${errs.length} netfail=${netfail.length}`);

let bad = 0;
for (const t of out) { if (!t.ok) bad++; console.log((t.ok ? "PASS" : "FAIL") + "  " + t.name + " — " + t.d); }
if (errs.length || netfail.length) console.log("errors:", errs.slice(0, 4), "netfail:", netfail.slice(0, 4));
console.log("saved tmp/tip_hover.png");
console.log(bad ? `\n✗ 떠 있는 툴팁: ${bad} 곳 틀림` : `\n✓ 떠 있는 툴팁: 전부 통과`);
await raw("Target.closeTarget", { targetId }); bws.close();
process.exit(bad ? 1 : 0);
