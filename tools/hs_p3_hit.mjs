/* hs/ 2차 — 「때리는 순간」을 실제 코드 경로(뼈창→hurtEnemy)로 일으켜 연속 스샷을 찍는다.
   입력 주입은 헤드리스에서 세션을 멈추므로, 팩을 깨워 세우고 적마다 뼈창을 얹어 같은 프레임에 맞힌다.
   node tools/hs_p3_hit.mjs   → tmp/hs_p3_hit_1..6.png (측정) + tmp/hs_p3_hit.png (대표 컷)
   [SHOT_MS] 로 캡처 간격, [DMG] 로 피해(살려두려 작게)만 바꾼다. */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/hs/index.html";
const fs = await import("node:fs");
const LOG = fs.createWriteStream("tmp/hs_p3_hit.log");
const log = (...a) => { const s = a.join(" "); LOG.write(s + "\n"); process.stdout.write(s + "\n"); };
const HARD = setTimeout(() => { log("WATCHDOG 60s"); process.exit(9); }, 60000);
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const shot = async out => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); log("  ▸", out); };

const SHOT_MS = 60, DMG = 60;

await wait(2600);
if (!await ev("!!(window.G && G.player)")) { log("MISS 부팅 실패", errs.slice(0, 4)); process.exit(2); }

/* 큰 방 한가운데로 옮기고 배율(HSZ) 로 화면 중앙에 둔다. 적 팩 하나를 플레이어 오른쪽에 세우고
   해골 셋을 곁들여 전투 장면으로 만든다. 적은 제자리에 세워(spd 0) 넉백 미끄러짐이 또렷이 보이게. */
const setup = await ev(`(()=>{
  const p=G.player; let r=G.rooms[0],a=0; for(const x of G.rooms){const ar=x.w*x.h; if(ar>a){a=ar;r=x;}}
  p.x=r.cx-120; p.y=r.cy; p.dx=1; p.dy=0; p.state='idle';
  cam.x=Math.max(0,Math.min(G.W-innerWidth/HSZ, p.x-innerWidth/(2*HSZ)));
  cam.y=Math.max(0,Math.min(G.H-innerHeight/HSZ, p.y-innerHeight/(2*HSZ)));
  G.minions.length=0; G.items.length=0; G.floats.length=0; G.spears.length=0; G.parts.length=0;
  for(const pk of G.packs){pk.awake=false;pk.done=true;for(const e of pk.enemies)e.alive=false;}
  let pk=null,bd=1e9; for(const q of G.packs){const d=Math.hypot(q.x-p.x,q.y-p.y);if(d<bd){bd=d;pk=q;}}
  pk.awake=true; pk.done=false; pk.x=p.x+220; pk.y=p.y;
  let k=0; for(const e of pk.enemies){ if(k>=6) break;
    e.alive=true; e.hp=e.maxhp=99999; e.x=p.x+180+((k%3)*54); e.y=p.y-70+((k/3|0)*72);
    e.dx=-1; e.dy=0; e.state='walk'; e.anim=k; e.atk=9; e.hit=0; e.kb={x:0,y:0}; e.spd=0; k++; }
  const S=[{s:1,slot:1,h:96,hp:9999,dmg:200,spd:0}];
  for(let i=0;i<3;i++){const s=S[0];G.minions.push({base:'minion/skel',x:p.x-20+i*40,y:p.y+60+i*10,hp:s.hp,maxhp:s.hp,dmg:s.dmg,spd:s.spd,r:15,h:s.h,tier:0,slot:1,filt:null,dx:1,dy:0,anim:i,state:'walk',atk:9,target:-1});}
  return k;
})()`);
log("적 세움:", setup, "· 오류", errs.length);
await wait(500);
await shot("tmp/hs_p3_hit_0.png");

/* 같은 프레임에 적마다 뼈창을 얹어 hurtEnemy 를 동시에 일으킨다(실제 코드 경로). */
const nspear = await ev(`(()=>{let n=0; for(const pk of G.packs) if(pk.awake) for(const m of pk.enemies) if(m.alive){
  G.spears.push({x:m.x-8, y:m.y-4, vx:760, vy:0, life:0.4, dmg:${DMG}}); n++; } return n;})()`);
log("뼈창 얹음:", nspear);

for (let i = 1; i <= 6; i++) {
  await wait(SHOT_MS);
  const st = JSON.parse(await ev(`JSON.stringify({
    hit:G.packs.reduce((a,pk)=>a+(pk.awake?pk.enemies.filter(e=>e.alive&&e.hit>0).length:0),0),
    parts:G.parts.length, floats:G.floats.filter(f=>f.txt).length,
    kbx:(()=>{let m=null;for(const pk of G.packs)if(pk.awake)for(const e of pk.enemies)if(e.alive){m=e;break;}return m?+(m.kb.x||0).toFixed(0):0})() })`));
  log(`  t=+${(SHOT_MS * i)}ms  hit중=${st.hit} 파편=${st.parts} 숫자=${st.floats} kbx=${st.kbx}`);
  await shot(`tmp/hs_p3_hit_${i}.png`);
}

/* 대표 컷: 앞줄 셋은 처치(뼛조각 파편+흔들림+시체·전리품), 뒷줄은 타격 — 손맛이 한창일 때. */
const killed = await ev(`(()=>{const es=[]; for(const pk of G.packs) if(pk.awake) for(const m of pk.enemies) if(m.alive) es.push(m);
  es.forEach((m,i)=>{ m.hp = i<3 ? 40 : 99999; G.spears.push({x:m.x-8,y:m.y-4,vx:760,vy:0,life:0.4,dmg:${DMG}}); });
  return es.length;})()`);
log("대표 컷 대상:", killed, "(앞줄 3 처치)");
await wait(45);
log("  처치", await ev("G.kills"), "· 시체", await ev("G.corpses.length"), "· 파편", await ev("G.parts.length"), "· 바닥템", await ev("G.items.length"));
await shot("tmp/hs_p3_hit.png");

log("콘솔 오류:", errs.length, errs.slice(0, 6));
await S("Target.closeTarget", { targetId });
process.exit(0);
