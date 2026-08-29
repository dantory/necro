/* hs/ 「자리(칸) 저울」 밸런스 자 (V-146/V-149) — 세 빌드를 같은 자로 잰다.
 *   node tools/hs_p4.mjs   → tmp/hs_p4_{swarm,giant,mix}.png · tmp/hs_p4.log
 *
 * 같은 씨앗·같은 층·같은 적 무리(28기, 고정 스탯·고정 자리)에 세 빌드를 각각 몰아
 * 층 클리어 시간·죽은 소환수 수·주운 것 수를 낸다. 빌드는 8칸 예산으로:
 *   swarm = 해골 8            (8×1)
 *   giant = 뼈 거인 1 + 해골 2 (6+2)
 *   mix   = 거대 해골 2 + 해골 2 (2×3 + 2)
 * 소환수 스탯은 페이지의 window.SKEL_TIERS 를 그대로 읽어 만든다(main.js 수치와 자동 동기).
 * 판정: 가장 빠른 빌드와 가장 느린 빌드가 1.35배 이내. 플레이어 뼈창은 뺐다 — «군세»만 잰다. */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const fs = await import("node:fs");
const LOG = fs.createWriteStream("tmp/hs_p4.log");
const log = (...a) => { const s = a.join(" "); LOG.write(s + "\n"); process.stdout.write(s + "\n"); };
const HARD = setTimeout(() => { log("WATCHDOG 180s"); process.exit(9); }, 180000);

await ensureChrome({ log });
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = []; const neterr = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160));
  if (m.method === "Network.responseReceived" && m.params.response.status >= 400) neterr.push(m.params.response.status + " " + m.params.response.url);
  if (m.method === "Network.loadingFailed" && !/net::ERR_ABORTED/.test(m.params.errorText || "")) neterr.push("FAIL " + m.params.errorText);
});
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const shot = async out => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); log("  ▸", out); };

await wait(2600);
if (!await ev("!!(window.G && G.player && window.SKEL_TIERS)")) { log("MISS 부팅 실패", errs.slice(0, 4)); process.exit(2); }

/* 페이지 안에 붙박이 시험장. setup() 은 늘 같은 판을 세운다(고정 자리·고정 스탯). */
await ev(`window.__hs4 = {
  bigRoom(){let r=G.rooms[0],a=0;for(const x of G.rooms){const ar=x.w*x.h;if(ar>a){a=ar;r=x;}}return r;},
  center(){const r=this.bigRoom();return [r.cx,r.cy];},
  FOES: 28, FOE_HP: 70, FOE_DMG: 14, FOE_SPD: 72,
  setup(){
    const [cx,cy]=this.center(); const p=G.player;
    p.x=cx; p.y=cy; p.dx=0; p.dy=1; p.state='idle'; p.hp=p.maxhp;
    cam.x=Math.max(0,Math.min(G.W-innerWidth/HSZ,cx-innerWidth/(2*HSZ)));
    cam.y=Math.max(0,Math.min(G.H-innerHeight/HSZ,cy-innerHeight/(2*HSZ)));
    G.minions.length=0; G.items.length=0; G.golds.length=0; G.floats.length=0;
    G.spears.length=0; G.parts.length=0; G.corpses.length=0; G.picks=0; G.kills=0;
    for(const pk of G.packs){pk.awake=false;pk.done=true;for(const e of pk.enemies)e.alive=false;}
    const foes=[]; const bs=['mob/fallen','mob/zombie','mob/skelarch','mob/brute'];
    for(let i=0;i<this.FOES;i++){
      const a=i/this.FOES*6.283, R=300+((i%3)*26);
      foes.push({ id:9000+i, base:bs[i%bs.length], x:cx+Math.cos(a)*R, y:cy+Math.sin(a)*R,
        hp:this.FOE_HP, maxhp:this.FOE_HP, dmg:this.FOE_DMG, spd:this.FOE_SPD, h:80, r:16,
        gold:[4,9], dx:-Math.cos(a), dy:-Math.sin(a), elite:false, hit:0, kb:{x:0,y:0},
        atk:0.3+((i%5)*0.1), anim:0, alive:true });
    }
    G.packs.push({ x:cx, y:cy, enemies:foes, room:0, awake:true, done:false });
    this._foePack=G.packs[G.packs.length-1];
  },
  mk(tier,n){ const T=window.SKEL_TIERS[tier], [cx,cy]=this.center(), f=G.floor;
    const base=G.minions.length;
    for(let i=0;i<n;i++){ const a=(base+i)/8*6.283, rr=40+Math.random()*46;
      const hp=(200+f*40)*T.hpMul;
      G.minions.push({ base:'minion/skel', x:cx+Math.cos(a)*rr, y:cy+Math.sin(a)*rr,
        hp, maxhp:hp, dmg:(22+f*8)*T.dmgMul, spd:250*T.spdMul, atkCd:0.6*T.atkMul,
        r:15*T.scale, h:96*T.scale, tier, slot:T.slot, cleave:T.cleave, ring:T.ring, ringCol:T.ringCol,
        shake:T.shake, filt:T.filt, dx:1, dy:0.1, anim:Math.random()*6, state:'walk', atk:0, target:-1 }); } },
  build(kind){ this._want = kind==='swarm' ? {0:8} : kind==='giant' ? {2:1,0:2} : {1:2,0:2};
    this._spawned=0;
    for(const t in this._want){ this.mk(+t, this._want[t]); this._spawned+=this._want[t]; }
    return G.minions.reduce((s,m)=>s+m.slot,0); },
  countTier(t){ let n=0; for(const m of G.minions) if(m.tier===t) n++; return n; },
  freeCorpse(){ const [cx,cy]=this.center(); let best=-1,bd=560*560;
    for(let i=0;i<G.corpses.length;i++){ const c=G.corpses[i]; if(c.used) continue;
      const d=(c.x-cx)**2+(c.y-cy)**2; if(d<bd){bd=d;best=i;} } return best; },
  maintain(){ const used=G.minions.reduce((s,m)=>s+m.slot,0), p=G.player;
    for(const t in this._want){ const tier=+t, T=window.SKEL_TIERS[tier];
      let need=this._want[t]-this.countTier(tier);
      while(need>0 && used+T.slot<=p.slots){ const ci=this.freeCorpse(); if(ci<0) break;
        G.corpses[ci].used=true; this.mk(tier,1); this._spawned++; need--; } } },
  aliveFoes(){ let n=0; for(const e of this._foePack.enemies) if(e.alive) n++; return n; },
  deadMin(){ return this._spawned - G.minions.length; },
  top(){ G.player.hp=G.player.maxhp; },
  vacuum(){ const p=G.player; let best=null,bd=1e18;
    for(const it of G.items){ const d=(it.x-p.x)**2+(it.y-p.y)**2; if(d<bd){bd=d;best=it;} }
    if(best){ p.x+=(best.x-p.x)*0.5; p.y+=(best.y-p.y)*0.5; } return G.items.length; }
}; true`);

async function runBuild(kind) {
  await ev("__hs4.setup(); true");
  const slots = await ev(`__hs4.build('${kind}')`);
  const start = Date.now();
  let clearMs = null, mid = false;
  for (let i = 0; i < 300; i++) {          // 최대 36초 (120ms × 300)
    await ev("__hs4.top(); __hs4.maintain(); true");
    const alive = await ev("__hs4.aliveFoes()");
    if (!mid && Date.now() - start > 700) { await shot(`tmp/hs_p4_${kind}.png`); mid = true; }
    if (alive === 0) { clearMs = Date.now() - start; break; }
    await wait(120);
  }
  if (!mid) await shot(`tmp/hs_p4_${kind}.png`);
  const deadMin = await ev("__hs4.deadMin()");
  for (let i = 0; i < 26; i++) { await ev("__hs4.vacuum(); __hs4.top(); true"); await wait(60); }  // ~1.6s 훑기
  const picks = await ev("G.picks");
  const clearS = clearMs == null ? null : +(clearMs / 1000).toFixed(2);
  log(`[${kind}] 자리 ${slots}/8 · 클리어 ${clearS == null ? "TIMEOUT" : clearS + "s"} · 죽은 소환수 ${deadMin} · 주운 것 ${picks}`);
  return { kind, slots, clearS, deadMin, picks };
}

log("== hs_p4 : 자리 저울 밸런스 ==");
log("소환수 수치(window.SKEL_TIERS):", await ev("JSON.stringify(window.SKEL_TIERS.map(t=>({k:t.key,slot:t.slot,hp:t.hpMul,dmg:t.dmgMul,atk:t.atkMul,spd:t.spdMul})))"));
log(`적: ${await ev("__hs4.FOES")}기 · hp ${await ev("__hs4.FOE_HP")} · dmg ${await ev("__hs4.FOE_DMG")} · spd ${await ev("__hs4.FOE_SPD")}`);
const res = [];
for (const k of ["swarm", "giant", "mix"]) res.push(await runBuild(k));

const times = res.map(r => r.clearS).filter(x => x != null);
if (times.length === res.length) {
  const fast = Math.min(...times), slow = Math.max(...times), ratio = +(slow / fast).toFixed(3);
  log(`\n최속 ${fast}s ↔ 최저 ${slow}s · 비 ${ratio}x  (판정 ${ratio <= 1.35 ? "통과 ✓ (≤1.35)" : "실패 ✗ (>1.35) — 수치 고쳐 다시"})`);
} else log("\n일부 빌드 TIMEOUT — 수치를 고쳐야 한다");

log("콘솔 오류:", errs.length, errs.slice(0, 6));
log("네트워크 오류:", neterr.length, neterr.slice(0, 6));
for (const k of ["swarm", "giant", "mix"]) { const f = `tmp/hs_p4_${k}.png`; log("  ", f, fs.existsSync(f) ? fs.statSync(f).size + "B" : "MISSING"); }
await S("Target.closeTarget", { targetId });
clearTimeout(HARD);
process.exit(0);
