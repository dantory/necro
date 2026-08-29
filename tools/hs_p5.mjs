/* hs/ 「누가 내 편인지」 자 (V-150) — 아군/적을 «스프라이트 색»으로 가른 것을 수로 잰다.
 *   node tools/hs_p5.mjs   → tmp/hs_p5_{swarm,giant,mix,loot}.png · hs_p5_before_*.png · tmp/hs_p5.log
 *
 * 같은 씨앗·같은 판에 소환수 무리와 적 무리를 세우고, 각 유닛의 «몸통 픽셀 평균색»을
 * board 캔버스에서 직접 읽어(getImageData) 두 무리의 평균색 사이 RGB 거리를 낸다.
 * window.__teamTint 를 껐다(before)·켰다(after) 하며 «같은 자»로 재고 몇 배 벌어졌는지 남긴다.
 * 링은 몸통을 재지 않으므로 이 자는 처음부터 링과 무관하다 — __rings=false 컷으로 눈으로도 확인. */
import { ensureChrome, CDP } from "./chrome_guard.mjs";
const URL = "http://127.0.0.1:8774/hs/index.html";
const fs = await import("node:fs");
const LOG = fs.createWriteStream("tmp/hs_p5.log");
const log = (...a) => { const s = a.join(" "); LOG.write(s + "\n"); process.stdout.write(s + "\n"); };
const HARD = setTimeout(() => { log("WATCHDOG 150s"); process.exit(9); }, 150000);

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

await ev(`window.__hs5 = {
  bigRoom(){let r=G.rooms[0],a=0;for(const x of G.rooms){const ar=x.w*x.h;if(ar>a){a=ar;r=x;}}return r;},
  center(){const r=this.bigRoom();return [r.cx,r.cy];},
  FOES:24,
  setup(){ const [cx,cy]=this.center(), p=G.player;
    p.x=cx; p.y=cy; p.dx=0; p.dy=1; p.state='idle'; p.hp=p.maxhp;
    cam.x=Math.max(0,Math.min(G.W-innerWidth/HSZ,cx-innerWidth/(2*HSZ)));
    cam.y=Math.max(0,Math.min(G.H-innerHeight/HSZ,cy-innerHeight/(2*HSZ)));
    G.minions.length=0; G.items.length=0; G.golds.length=0; G.floats.length=0;
    G.spears.length=0; G.parts.length=0; G.corpses.length=0; G.pickLog.length=0;
    for(const pk of G.packs){pk.awake=false;pk.done=true;for(const e of pk.enemies)e.alive=false;}
    const foes=[]; const bs=['mob/skelarch','mob/fallen','mob/zombie','mob/skelarch','mob/brute'];
    for(let i=0;i<this.FOES;i++){ const a=i/this.FOES*6.283, R=300+((i%3)*24);
      foes.push({ id:9000+i, base:bs[i%bs.length], x:cx+Math.cos(a)*R, y:cy+Math.sin(a)*R,
        hp:400, maxhp:400, dmg:0, spd:0, h:80, r:16, gold:[4,9],
        dx:-Math.cos(a), dy:-Math.sin(a), elite:false, hit:0, kb:{x:0,y:0}, atk:9, anim:0, alive:true }); }
    G.packs.push({ x:cx, y:cy, enemies:foes, room:0, awake:true, done:false });
    this._foes=foes;
  },
  mk(tier,n){ const T=window.SKEL_TIERS[tier], [cx,cy]=this.center();
    const base=G.minions.length;
    for(let i=0;i<n;i++){ const a=(base+i)/8*6.283, rr=44+Math.random()*44;
      G.minions.push({ base:'minion/skel', x:cx+Math.cos(a)*rr, y:cy+Math.sin(a)*rr,
        hp:9e9, maxhp:9e9, dmg:0, spd:0, atkCd:0.6*T.atkMul,
        r:15*T.scale, h:96*T.scale, tier, slot:T.slot, cleave:T.cleave, ring:T.ring, ringCol:T.ringCol,
        shake:T.shake, filt:T.filt, dx:1, dy:0.1, anim:Math.random()*6, state:'idle', atk:0, target:-1 }); } },
  build(kind){ this.setup();
    const want = kind==='swarm' ? {0:8} : kind==='giant' ? {2:1,0:2} : {1:2,0:2};
    for(const t in want) this.mk(+t, want[t]); },
  sampleTeams(){ const cv=document.getElementById('board'), g=cv.getContext('2d'), Z=window.HSZ;
    const boxAvg=(u)=>{ const cx=(u.x-cam.x)*Z, feet=(u.y-cam.y)*Z, cyp=feet-u.h*Z*0.5;
      const bw=Math.max(5,u.r*Z*0.7), bh=Math.max(7,u.h*Z*0.32);
      let x0=Math.round(cx-bw), y0=Math.round(cyp-bh), W2=Math.round(bw*2), H2=Math.round(bh*2);
      if(x0<0||y0<0||x0+W2>cv.width||y0+H2>cv.height) return null;
      const d=g.getImageData(x0,y0,W2,H2).data; let R=0,G2=0,B=0,n=0;
      for(let i=0;i<d.length;i+=4){ const r=d[i],gg=d[i+1],b=d[i+2];
        if(r+gg+b<64) continue; R+=r;G2+=gg;B+=b;n++; }
      return n<10? null : [R/n,G2/n,B/n]; };
    const grp=(arr)=>{ let R=0,G2=0,B=0,c=0; for(const u of arr){ const a=boxAvg(u); if(!a)continue; R+=a[0];G2+=a[1];B+=a[2];c++; } return c? {mean:[R/c,G2/c,B/c], n:c} : {mean:[0,0,0], n:0}; };
    const foes=this._foes.filter(e=>e.alive);
    const ally=grp(G.minions), foe=grp(foes);
    const dist=Math.hypot(ally.mean[0]-foe.mean[0], ally.mean[1]-foe.mean[1], ally.mean[2]-foe.mean[2]);
    const rnd=(a)=>a.map(v=>Math.round(v));
    return {ally:rnd(ally.mean), allyN:ally.n, foe:rnd(foe.mean), foeN:foe.n, dist:+dist.toFixed(1)};
  },
  lootDemo(){ const [cx,cy]=this.center(), p=G.player; p.x=cx; p.y=cy;
    cam.x=Math.max(0,Math.min(G.W-innerWidth/HSZ,cx-innerWidth/(2*HSZ)));
    cam.y=Math.max(0,Math.min(G.H-innerHeight/HSZ,cy-innerHeight/(2*HSZ)));
    G.pickLog = [ {name:'Wraith Boots of Bone',color:'#6fa8ff',t:99},
      {name:'Mastodon Locket of the Dead',color:'#c9c4b6',t:99},
      {name:'Savage Amulet of the Grave',color:'#6fa8ff',t:99},
      {name:'Dread Helm of the Legion',color:'#e0a83a',t:99},
      {name:'+2 소환 자리',color:'#7fe6a0',t:99},
      {name:'Battle Charm of the Necromancer',color:'#c9c4b6',t:99} ]; }
}; true`);

async function measure(kind) {
  await ev(`window.__teamTint=false; window.__rings=true; __hs5.build('${kind}'); true`);
  await wait(320);
  const before = await ev("JSON.stringify(__hs5.sampleTeams())").then(JSON.parse);
  await shot(`tmp/hs_p5_before_${kind}.png`);
  await ev("window.__teamTint=true; true");
  await wait(320);
  const after = await ev("JSON.stringify(__hs5.sampleTeams())").then(JSON.parse);
  await shot(`tmp/hs_p5_${kind}.png`);
  const ratio = before.dist > 0 ? +(after.dist / before.dist).toFixed(2) : Infinity;
  log(`[${kind}] 아군${after.allyN}·적${after.foeN}  거리 before ${before.dist} → after ${after.dist}  (×${ratio})`);
  log(`   before 색  아군 rgb(${before.ally})  적 rgb(${before.foe})`);
  log(`   after  색  아군 rgb(${after.ally})  적 rgb(${after.foe})`);
  return { kind, before: before.dist, after: after.dist, ratio };
}

log("== hs_p5 : 「누가 내 편인지」 색 자 (V-150) ==");
const res = [];
for (const k of ["swarm", "giant", "mix"]) res.push(await measure(k));

await ev("window.__teamTint=true; window.__rings=false; __hs5.build('mix'); true");
await wait(340);
const noRing = await ev("JSON.stringify(__hs5.sampleTeams())").then(JSON.parse);
await shot("tmp/hs_p5_norings_mix.png");
log(`[norings] 링을 끈 채(스프라이트만)  아군${noRing.allyN}·적${noRing.foeN}  거리 ${noRing.dist}  — 링 없이도 갈린다`);
await ev("window.__rings=true; true");

await ev("document.body.classList.add('noreadchip'); __hs5.build('mix'); __hs5.lootDemo(); true");
await wait(360); await shot("tmp/hs_p5_before_loot.png");
await ev("document.body.classList.remove('noreadchip'); __hs5.lootDemo(); true");
await wait(200); await shot("tmp/hs_p5_loot.png");

const avgB = res.reduce((s, r) => s + r.before, 0) / res.length;
const avgA = res.reduce((s, r) => s + r.after, 0) / res.length;
log(`\n평균 색거리  before ${avgB.toFixed(1)} → after ${avgA.toFixed(1)}  (×${(avgA / avgB).toFixed(2)})`);
log("콘솔 오류:", errs.length, errs.slice(0, 6));
log("네트워크 오류:", neterr.length, neterr.slice(0, 6));
for (const f of ["swarm", "giant", "mix", "loot", "norings_mix"].map(k => `tmp/hs_p5_${k}.png`))
  log("  ", f, fs.existsSync(f) ? fs.statSync(f).size + "B" : "MISSING");
await S("Target.closeTarget", { targetId });
const list = await (await fetch(CDP + "/json/list")).json();
for (const t of list) if (t.type === "page") { try { await fetch(CDP + "/json/close/" + t.id); } catch {} }
log("CDP 남은 탭 정리 완료");
clearTimeout(HARD);
process.exit(0);
