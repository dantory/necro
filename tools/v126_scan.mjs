/* V-126 찾기 — **화면에 뜨는 모든 글에서 «날값»을 훑는다.**
   V-121 이 물건 툴팁의 `+197.9177682123602` 를 잡았는데, 그 고침은 `gearShow` 한 자리에만
   박혔다([[carry-fixes-forward]]). 같은 날값이 다른 창에도 서 있는지 **창을 전부 열어**
   본다 — 소수점 셋 이상 · 「NaN」·「undefined」·「Infinity」·「-0」 을 함께 센다. */
/* `node tools/v126_scan.mjs old` 면 V-121 이 남긴 문(`__NUMOLD`)으로 **고치기 전**을 다시
   세운다 — 그 결에서 자가 울어야 「0」이 관찰이 된다([[silent-zero-is-not-an-observation]]). */
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
const ev = async e => { const r = await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || JSON.stringify(r.exceptionDetails)); return r.result?.value; };

await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.navigate", { url: URL }); await wait(1200);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2200);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
/* 오래 논 사람 — 깊이 곱이 붙어야 날값이 드러난다(V-121 의 그 자리). */
await ev(`(()=>{const C=globalThis.__C,M=C.META;
  M.lv=46;M.gold=99999999;M.deepest=34;M.best=34;
  M.up={hp:12,mp:9,dmg:14,army:6};
  M.tree={bone:8,armor:5,ghoul:1,golem:1,elite:3,marrow:4,weaken:1,decrep:1,rot:4,wand:6};
  /* ★ 낀 것·가방을 반드시 심는다 — V-121 의 날값은 **물건 툴팁**에 있었으므로,
     빈손으로 훑고 「0」이라 적으면 그 자리를 안 본 채 깨끗하다고 말하는 셈이다. */
  M.plus={wand:9,robe:5,charm:3,helm:7,glove:2,ring:4};
  for(const k of ["wand","robe","charm","helm","glove","ring"]) M.equip[k]=C.mkItem(k,4,false,20);
  M.bag=[]; for(const k of ["wand","robe","charm","helm","glove","ring"])
    for(const t of [3,5]) M.bag.push(C.mkItem(k,t,false,34));
  C.syncSkills&&C.syncSkills();C.saveMeta();return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);

/* ★ 보정 — 자가 «잡을 수 있다»는 것을 먼저 보인다. 없는 이름을 읽으며 0 을 돌려주는
   자를 「깨끗하다」로 읽은 적이 있다([[silent-zero-is-not-an-observation]]). 일부러
   날값 한 줄을 심어 두고, 그것을 못 잡으면 이 자는 판정을 낼 자격이 없다. */
{
  const seen = await ev(`(()=>{const d=document.createElement('div');d.id='__cal';
    d.style.cssText='position:fixed;left:-9999px';d.innerText='보정 최대 마나 +197.9177682123602';
    document.body.appendChild(d);
    const re=new RegExp(${JSON.stringify(String.raw`(\d+\.\d{3,}|NaN|undefined|Infinity|-0(?![.\d]))`)},'g');
    const hit=re.test(document.body.innerText||''); d.remove(); return hit;})()`);
  console.log("  보정: 심은 날값을 " + (seen ? "잡았다" : "★ 못 잡았다 — 이 자는 못 믿는다"));
  if (!seen) { console.log("판정: 자가 보정에서 운다"); process.exit(1); }
}

if (OLD) await ev(`globalThis.__NUMOLD=1`);

const WINS = ["stat","bag","tree","forge","shop","doctrine","tactic","dive"];
const BAD = String.raw`(\d+\.\d{3,}|NaN|undefined|Infinity|-0(?![.\d]))`;
const hits = [];
for (const w of WINS) {
  const r = await ev(`(()=>{[...document.querySelectorAll('.win.on')].forEach(e=>e.classList.remove('on'));
    try{ window.__openWin(${JSON.stringify(w)}); }catch(e){ return {err:String(e)}; }
    const win=[...document.querySelectorAll('.win.on')][0];
    if(!win) return {err:'안 섰다'};
    const re=new RegExp(${JSON.stringify(BAD)},'g');
    const out=[];
    /* 칸 위 툴팁까지 보려면 칸을 눌러 봐야 한다 — 눌리는 칸을 전부 눌러 본다. */
    const cells=[...win.querySelectorAll('[data-tac],[data-doc],[data-tn],[data-spick],[data-bpick],[data-pick],[data-fpick],[data-dive]')];
    const scan=(tag)=>{ const t=document.body.innerText||''; let m;
      while((m=re.exec(t))){ const s=Math.max(0,m.index-45); out.push(tag+' :: …'+t.slice(s,m.index+m[0].length+15).replace(/\\n/g,' ')+'…'); }
      re.lastIndex=0; };
    scan('열자마자');
    for(const c of cells.slice(0,60)){ try{ c.dispatchEvent(new MouseEvent('mouseover',{bubbles:true})); c.click(); }catch(e){} scan('칸'); }
    return {out:[...new Set(out)].slice(0,12), cells:cells.length, id:win.id};
  })()`);
  if (r?.err) { console.log(`  ${w}: ${r.err}`); continue; }
  console.log(`  ${w} (${r.id} · 칸 ${r.cells}) : 날값 ${r.out.length}`);
  for (const s of r.out) { console.log(`      ${s}`); hits.push(`${w} ${s}`); }
}
console.log(`판정: 날값이 뜬 자리 ${hits.length}`);
await raw("Target.closeTarget", { targetId }); bws.close();
/* 옛 결(`old`)에서는 **울어야 맞다** — 그때는 0 이 지는 것이다. */
process.exit(OLD ? (hits.length ? 0 : 1) : (hits.length ? 1 : 0));
