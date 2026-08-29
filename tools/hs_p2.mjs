/* hs/ 2차 다듬기 검수 — 던전으로 보이나 · 자리 저울이 눈으로 갈리나 · 이름표가 안 겹치나.
   입력 주입은 헤드리스에서 세션을 멈추게 해서, 상태를 직접 얹어 장면을 세운다(페이지 루프가 애니메이션을 돌린다).
   node tools/hs_p2.mjs   → tmp/hs_p2_{dungeon,swarm,elite,loot}.png */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/hs/index.html";
const fs = await import("node:fs");
const LOG = fs.createWriteStream("tmp/hs_p2.log");
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
const dark = async () => ev(`(()=>{const cv=document.querySelector('canvas');const t=document.createElement('canvas');t.width=160;t.height=90;const c=t.getContext('2d');c.drawImage(cv,0,0,160,90);const d=c.getImageData(0,0,160,90).data;let b=0;for(let i=0;i<d.length;i+=4)if(d[i]<12&&d[i+1]<12&&d[i+2]<12)b++;return Math.round(b/(160*90)*100)})()`);

await wait(2600);
if (!await ev("!!(window.G && G.player)")) { log("MISS 부팅 실패", errs.slice(0, 4)); process.exit(2); }
log("decals", await ev("G.decals.length"), "· props", await ev("G.props.length"), "· braziers", await ev("G.props.filter(p=>p.brazier).length"));

await ev(`window.__hs={
  bigRoom(){let r=G.rooms[0],a=0;for(const x of G.rooms){const ar=x.w*x.h;if(ar>a){a=ar;r=x;}}return r;},
  tele(){const p=G.player,r=this.bigRoom();p.x=r.cx;p.y=r.cy;p.dx=0;p.dy=1;p.state='idle';cam.x=Math.max(0,Math.min(G.W-innerWidth,p.x-innerWidth/2));cam.y=Math.max(0,Math.min(G.H-innerHeight,p.y-innerHeight/2));return [r.cx|0,r.cy|0];},
  clear(){G.minions.length=0;G.items.length=0;G.floats.length=0;G.spears.length=0;},
  killFoes(){for(const pk of G.packs){pk.awake=false;pk.done=true;for(const e of pk.enemies)e.alive=false;}return true;},
  skel(tier,n){const p=G.player;const S=[{s:1,slot:1,h:96,hp:160,dmg:22,spd:250,f:null},{s:1.35,slot:2,h:129.6,hp:352,dmg:41,spd:224,f:'brightness(0.9) saturate(1.5) sepia(0.28) hue-rotate(-8deg)'},{s:1.7,slot:3,h:163.2,hp:576,dmg:66,spd:198,f:'brightness(0.82) saturate(1.9) sepia(0.5) hue-rotate(-16deg)'}][tier];p.slots=8;p.enhance=tier;const base=G.minions.length;for(let i=0;i<n;i++){const a=(base+i)/8*6.283,rr=82+Math.random()*46;G.minions.push({base:'minion/skel',x:p.x+Math.cos(a)*rr,y:p.y+Math.sin(a)*rr-24,hp:S.hp,maxhp:S.hp,dmg:S.dmg,spd:S.spd,r:15*S.s,h:S.h,tier,slot:S.slot,filt:S.f,dx:1,dy:0.15,anim:Math.random()*6,state:'walk',atk:0,target:-1});}return G.minions.reduce((a,m)=>a+m.slot,0)+'/'+p.slots;},
  foes(n){const p=G.player;let pk=null,bd=1e9;for(const q of G.packs){const d=Math.hypot(q.x-p.x,q.y-p.y);if(d<bd){bd=d;pk=q;}}if(!pk)return 0;pk.awake=true;pk.done=false;let k=0;for(const e of pk.enemies){if(k>=n)break;e.alive=true;e.hp=e.maxhp;e.x=p.x+300+((k%3)*46);e.y=p.y-70+((k/3|0)*54);e.dx=-1;e.dy=0;e.state='walk';e.atk=0.5;e.hit=0;e.kb={x:0,y:0};k++;}pk.x=p.x+330;pk.y=p.y;return k;},
  corpses(n){const p=G.player,bs=['mob/fallen','mob/zombie','mob/skelarch'];for(let i=0;i<n;i++)G.corpses.push({x:p.x+(Math.random()*460-230),y:p.y+(Math.random()*320-150),base:bs[i%3],dir:'south',h:100,used:false,t:0});return G.corpses.length;},
  parts(){const p=G.player;for(let i=0;i<30;i++){const a=Math.random()*6.283,s=60+Math.random()*220;G.parts.push({x:p.x+120,y:p.y-30,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.5,col:i%2?'#c0303a':'#ff7a3c',r:2+Math.random()*3});}}
};true`);

/* ── ① 던전으로 보이는 판 ── */
await ev("__hs.tele();__hs.clear();__hs.corpses(7);__hs.skel(0,5);__hs.foes(10);__hs.parts();true");
await wait(900);
log("dungeon 새까만%", await dark());
await shot("tmp/hs_p2_dungeon.png");

/* ── ② 작은 해골 여덟이 우르르 (자리 8/8 · 강화 0) ── */
await ev("__hs.tele();__hs.clear();__hs.killFoes();__hs.skel(0,8);true");
log("swarm", await ev("G.minions.reduce((a,m)=>a+m.slot,0)+'/'+G.player.slots"));
await wait(150);
log("  높이", await ev("JSON.stringify(G.minions.map(m=>[m.tier,m.h|0]))"));
log("  HUD", await ev("document.getElementById('slots').textContent+' · '+document.getElementById('enh').textContent"));
await shot("tmp/hs_p2_swarm.png");

/* ── ③ 거대 해골이 쿵쿵 (같은 자리 예산 8 · 강화 2) ── */
await ev("__hs.tele();__hs.clear();__hs.killFoes();__hs.skel(1,1);__hs.skel(2,2);true");
log("elite", await ev("G.minions.reduce((a,m)=>a+m.slot,0)+'/'+G.player.slots"));
await wait(150);
log("  높이", await ev("JSON.stringify(G.minions.map(m=>[m.tier,m.h|0]))"));
log("  HUD", await ev("document.getElementById('slots').textContent+' · '+document.getElementById('enh').textContent"));
await shot("tmp/hs_p2_elite.png");

/* ── ④ 이름표가 겹치지 않고 쌓인 순간 (한 자리에 몰아 세로로 쌓인다) ── */
await ev(`(()=>{__hs.tele();G.minions.length=0;G.items.length=0;G.floats.length=0;const p=G.player;
  const cx=p.x+120, cy=p.y-140;
  const N=[['Mastodon Iron Ring','#6fa8ff',1.14,1.07],['Battle Belt of King','#6fa8ff',1.14,1.07],['Locket of Skill','#6fa8ff',1.14,1.07],['Grim Skull of Ruin','#e8cf52',1.24,1.11],['Ancient Wand of the Void','#e6e0d0',1.06,1.03],['Dread Sigil of the Dead','#e8cf52',1.24,1.11],['+1 소환 자리','#7fe6a0'],['소환수 강화 +1단계','#e8a24a']];
  for(const a of N){const build=a.length<3?{kind:a[1]==='#7fe6a0'?'slot':'enhance'}:null;G.items.push({x:cx+(Math.random()*30-15),y:cy+(Math.random()*24-12),vx:0,vy:0,item:{name:a[0],rarity:{color:a[1]},dmg:a[2]||1,body:a[3]||1,build},t:3});}
  for(let i=0;i<40;i++){const ag=Math.random()*6.283,s=30+Math.random()*80;G.golds.push({x:cx,y:cy+30,vx:Math.cos(ag)*s,vy:Math.sin(ag)*s,val:5,t:0});}
  __hs.corpses(4);return G.items.length})()`);
await wait(250);
log("  라벨수", await ev("G.items.length"));
await shot("tmp/hs_p2_loot.png");

log("콘솔 오류:", errs.length, errs.slice(0, 6));
for (const f of ["dungeon", "swarm", "elite", "loot"]) { const p = "tmp/hs_p2_" + f + ".png"; log("  ", p, fs.existsSync(p) ? fs.statSync(p).size + "B" : "MISSING"); }
await S("Target.closeTarget", { targetId });
process.exit(0);
