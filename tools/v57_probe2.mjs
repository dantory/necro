/* 겹침을 **네모로** 잰다 — ① 이름(.tn)을 잇는 선/화살표(.tLink)가 관통하는가
   ② 랭크 배지(.tRank)가 옆 칸·선과 겹치는가 ③ 이름끼리 겹치는가. */
const CDP="http://127.0.0.1:9333",URL="http://127.0.0.1:8774/index.html";
const ver=await (await fetch(CDP+"/json/version")).json();
const bws=new WebSocket(ver.webSocketDebuggerUrl);
let id=0;const pend=new Map();
const raw=(m,p={},s)=>{const i=++id;bws.send(JSON.stringify({id:i,method:m,params:p,sessionId:s}));return new Promise((res,rej)=>pend.set(i,{res,rej}));};
bws.addEventListener("message",e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);return m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result);}});
await new Promise(r=>bws.addEventListener("open",r));
const {targetId}=await raw("Target.createTarget",{url:URL});
const {sessionId}=await raw("Target.attachToTarget",{targetId,flatten:true});
const S=(m,p)=>raw(m,p,sessionId);await S("Page.enable");await S("Runtime.enable");
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ev=async e=>(await S("Runtime.evaluate",{expression:e,returnByValue:true})).result?.value;
const meta={gold:182400,lv:26,xp:0,deepest:52,runs:6,dive:1,diveSet:1,up:{hp:8,mp:6,dmg:9,army:5},plus:{wand:6,robe:4,charm:5},equip:{},bag:[],tree:{bone:8,armor:3,ghoul:1,golem:1,legion:2},quests:{},relics:0,rebirths:0,best:52,lastSeen:0,corpses:0};
for(const [W,H] of [[1512,863],[1366,700],[1280,620]]){
 await S("Emulation.setDeviceMetricsOverride",{width:W,height:H,deviceScaleFactor:2,mobile:false});
 await S("Page.reload",{ignoreCache:true});await wait(2000);
 await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
 await S("Page.reload",{ignoreCache:true});await wait(1800);
 await ev(`window.__openWin("tree")`);await wait(500);
 const r=await ev(`(()=>{const w=document.getElementById("winTree");
  const ins=(a,b)=>{const x=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left));
   const y=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));return x>1&&y>1?Math.round(x*y):0;};
  const R=el=>el.getBoundingClientRect();
  const names=[...w.querySelectorAll(".tn")], links=[...w.querySelectorAll(".tLink")],
        ranks=[...w.querySelectorAll(".tRank")], tiles=[...w.querySelectorAll(".tTile")],
        icos=[...w.querySelectorAll(".tIco")];
  const nameXlink=[]; for(const n of names) for(const l of links){const a=ins(R(n),R(l)); if(a) nameXlink.push(n.textContent.trim()+"("+a+"px²)");}
  const nameXname=[]; for(let i=0;i<names.length;i++) for(let j=i+1;j<names.length;j++){const a=ins(R(names[i]),R(names[j])); if(a) nameXname.push(names[i].textContent.trim()+"×"+names[j].textContent.trim());}
  const rankOut=ranks.map(b=>{const br=R(b), t=R(b.parentElement); return {v:b.textContent,
     out:Math.round(br.right-t.right), w:Math.round(br.width)};});
  const rankXother=[]; for(const b of ranks){const br=R(b);
    for(const t of tiles){ if(t===b.parentElement) continue; if(ins(br,R(t))) rankXother.push(b.textContent+"→칸"); }
    for(const l of links){ if(ins(br,R(l))) rankXother.push(b.textContent+"→선"); }
    for(const n of names){ if(ins(br,R(n))) rankXother.push(b.textContent+"→이름 "+n.textContent.trim()); } }
  /* 이름이 제 칸보다 넓어 옆으로 삐져나온 것 */
  const nameWide=names.filter(n=>{const nr=R(n), t=n.previousElementSibling; if(!t) return false;
    return nr.width>R(t).width+2;}).length;
  return {nameXlink, nameXname, rankOut, rankXother:[...new Set(rankXother)], nameWide,
    tS:getComputedStyle(w.querySelector(".tTile")).width, names:names.length};})()`);
 console.log(`── ${W}×${H} 칸 ${r.tS} 이름 ${r.names}`);
 console.log(`   이름×선 겹침 ${r.nameXlink.length}`, r.nameXlink.slice(0,6));
 console.log(`   이름×이름 겹침 ${r.nameXname.length}`, r.nameXname.slice(0,5));
 console.log(`   배지가 칸 밖으로 ${r.rankOut.map(x=>x.v+":"+x.out+"px").join(" ")}`);
 console.log(`   배지×다른 것 ${r.rankXother.length}`, r.rankXother.slice(0,8));
 console.log(`   제 칸보다 넓은 이름 ${r.nameWide}`);
}
await raw("Target.closeTarget",{targetId});process.exit(0);
