/* **로그가 반 줄로 잘리지 않는가** — 병수님 2026-08-13 "전투화면에서 메시지 하단부분도 짤리는데".
     node tools/log_qa.mjs [폭 높이]
   ★ 「넘침 0」으로는 못 잡는다 — overflow:hidden 상자는 잘라 놓고도 넘침을 0 으로 답한다.
     그래서 **줄의 아래끝이 상자(또는 자락)의 끝을 넘는가**를 직접 견준다.

   ★★ 2026-08-17 다시 세웠다. 여태 이 자는 **전투 로그를 한 번도 안 봤다**:
     · 폭이 360×800 이었다 — 08-16 에 모바일 규칙을 걷어낸 뒤로 그 폭은 데스크톱 값이
       360px 창에 든 **일부러 깨진 화면**이다(안쪽 키가 −12px 로 나왔다). 남은 자 52 개는
       전부 1512×863 으로 옮겼는데 이 자 하나만 폰 폭에 남아 있었다.
     · `__toDungeon()` 뒤 speed=8 로 9초를 감았는데, 본인이 **2~3초 만에 1층에서 죽어**
       마을로 돌아왔다. 마을은 `S.log` 를 비우고 두 줄만 세운다(main.js toTown) —
       그런데 표본 문턱이 **「보이는 줄 ≥2」** 였다. 마을 일지 두 줄이 그 문턱을 딱 채워
       매번 「통과」가 나왔다. 빈 표본을 통과로 읽고 있었다([[probe-must-walk-the-real-path]]).
     · 그래서 이제 ① **던전에 서 있는지 먼저 묻고**(`__MODE.at`) ② 상자가 넘치도록
       진짜 꼴의 줄을 `battle.js` 의 say() 로 밀어 넣은 뒤 재고 ③ 문턱을 10 줄로 올렸다.
       (say/fmtSay/렌더는 게임 것 그대로다 — 흉내 내는 것은 **사건이 나는 부분**뿐이다.
        1층에서 죽을 때까지 실제로 나는 줄은 두 개뿐이라 실전으로는 상자를 못 채운다.)
     · 자락(mask) 을 셈에 넣는다 — 지금 rails 는 아래 26px 을 **일부러 흐리게 지운다**
       (hud.css 514). 그 안에서 끝나는 줄은 잘린 게 아니라 사라지는 것이다. 자락 밖에서
       끊기는 줄만 실패로 센다. 자락을 없애면 옛 판정으로 그대로 돌아온다.
     · 낱말 꺾임(두 줄로 접힘)은 rails 에서 **설계다**(word-break:keep-all · 폭 220).
       실패로 세지 않고 수만 적는다. 안쪽 키의 정수배 판정도 rails 밖에서만 묻는다 —
       rails 의 로그는 flex 로 남은 자리를 다 먹으므로 정수배일 까닭이 없다. */
const CDP="http://127.0.0.1:9333",PAGE="http://127.0.0.1:8774/index.html";
const W=+(process.argv[2]||1512), H=+(process.argv[3]||863);
const ver=await (await fetch(CDP+"/json/version")).json();const bws=new WebSocket(ver.webSocketDebuggerUrl);
let id=0;const pend=new Map();const errs=[];function raw(m,p={},s){const i=++id;bws.send(JSON.stringify({id:i,method:m,params:p,sessionId:s}));return new Promise((res,rej)=>pend.set(i,{res,rej}));}
bws.addEventListener("message",e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result);}
 if(m.method==="Runtime.exceptionThrown")errs.push((m.params.exceptionDetails?.exception?.description||"").slice(0,140));});
await new Promise(r=>bws.addEventListener("open",r));
const {targetId}=await raw("Target.createTarget",{url:PAGE});const {sessionId}=await raw("Target.attachToTarget",{targetId,flatten:true});
const S=(m,p)=>raw(m,p,sessionId);const wait=ms=>new Promise(r=>setTimeout(r,ms));const ev=async e=>JSON.parse((await S("Runtime.evaluate",{returnByValue:true,expression:e})).result.value);
await S("Page.enable");await S("Runtime.enable");await S("Network.enable");await S("Network.setCacheDisabled",{cacheDisabled:true});
await S("Emulation.setDeviceMetricsOverride",{width:W,height:H,deviceScaleFactor:2,mobile:W<900});
await S("Page.navigate",{url:PAGE});await wait(5000);
/* 던전으로 내려가서 **거기 서 있는 동안** 잰다. speed 를 낮춰 두는 것은 재는 사이에
   죽어서 마을로 끌려가지 않게 하려는 것이다(1층에서 기본 속도로 20초면 죽는다). */
await S("Runtime.evaluate",{expression:"window.__toDungeon(); window.S.speed=0.05"});await wait(900);
const 실전줄 = await ev(`JSON.stringify(window.S.log.length)`);
/* 상자가 넘치도록 채운다 — 게임이 실제로 내는 꼴 그대로(굵은 머리말 + 딸린 말 + 등급색).
   같은 말은 say() 가 「×N」으로 접으므로 **전부 다른 줄**이어야 한다. */
await S("Runtime.evaluate",{awaitPromise:true,expression:`(async()=>{const B=await import("/js/battle.js");
  const 줄=[];
  for(let i=1;i<=6;i++) 줄.push('<b>'+(i+1)+'층</b> 진입');
  for(const n of ["해골 전사","해골 궁수","구울","망령"]) 줄.push('<b>'+n+'</b> 소환');
  줄.push('<b style="color:#ff8000">시체 폭발</b> ×3 · 7마리 · 412');
  줄.push('<b style="color:#ff8000">시체 태우기</b> 시체 4구 → 마나 +38');
  줄.push('<b style="color:#c8c0b0">백골 벽</b> 시체 3구 · 길목을 막는다');
  줄.push('<b style="color:#6a6aff">약화의 저주</b> 12초 지속');
  줄.push('<b style="color:#a06ad0">제물</b> · 뼈무덤의 군주이(가) 약해진다');
  줄.push('<b class="t3">해골왕의 인장</b> 착용 — 반지 · 지능 +14 · 소환수 피해 +9%');
  줄.push('가방이 차서 <b class="t2">묵은 뼛가루</b> → 금 320');
  줄.push('같은 것 셋이 하나로 — <b class="t3">망자의 손</b> (3등급) · 착용');
  줄.push('<b style="color:#ffff64">레벨 12</b> 달성 · 체력·마나 회복');
  줄.push('<b style="color:#ffcf5a">일지</b> 「첫 관문」 달성 · 유해 <b class="t3">+40</b>');
  줄.push('<b style="color:#d0a06a">뼈무덤의 군주</b>이(가) <b>지친다</b> — 받는 피해가 점점 는다');
  줄.push('스킬 점수 <b>3</b> 자동 배분 · 트리에서 바꿀 수 있다');
  for(const s of 줄) B.say(s);
  return JSON.stringify("ok")})()`});
await wait(500);
let bad=0;const say=(ok,s)=>{if(!ok)bad++;console.log(`${ok?"  ok":"FAIL"}  ${s}`);};
const o=await ev(`(()=>{const g=document.getElementById("log"),cs=getComputedStyle(g),gb=g.getBoundingClientRect();
  const rails=document.body.classList.contains("rails");
  const lh=parseFloat(cs.lineHeight), pt=parseFloat(cs.paddingTop), pb=parseFloat(cs.paddingBottom);
  const inner=gb.height-pt-pb, rows=[...g.children].filter(e=>getComputedStyle(e).display!=="none");
  /* 자락 — 흐려지기 **시작하는** 자리를 마스크에서 직접 읽는다.
     ★ 계산된 값이라고 다 풀려 있지 않다 — 크롬은 \`calc(100% - 26px)\` 을 **그대로** 돌려준다.
       px 만 훑으면 [0, 26] 이 잡혀 「자락이 상자 처음부터」가 되고, 그러면 **모든 줄이
       자락 안**이라 이 판정이 통째로 무력해진다(처음 쓴 판이 그랬다 — 자락 584px).
     자락을 못 읽으면 상자의 아래끝이 곧 끝이다(옛 판정과 같아진다 — 무르게가 아니라 되게). */
  const mask=cs.webkitMaskImage||cs.maskImage||"none";
  const calc=/calc\\(\\s*100%\\s*-\\s*([\\d.]+)px/.exec(mask);
  const 정지=(mask.match(/([\\d.]+)px/g)||[]).map(parseFloat);
  const 깊이 = calc ? +calc[1] : (/gradient/.test(mask)&&정지.length>=2 ? gb.height-정지[정지.length-2] : 0);
  const 자락있음 = 깊이>0 && 깊이<gb.height;
  const 자락시작=자락있음? gb.bottom-깊이 : gb.bottom-pb;
  const top=gb.top+pt, bot=gb.bottom-pb;
  let 잘린줄=null, 위잘림=null, 옆으로넘침=null, 접힌줄=0, 자락에걸친줄=0;
  for(const e of rows){const b=e.getBoundingClientRect();
    if(b.height>lh+1) 접힌줄++;
    if(b.bottom>top+1 && b.top<top-1) 위잘림=e.textContent.trim().slice(0,28);
    if(b.right>gb.right+1 || b.left<gb.left-1) 옆으로넘침=e.textContent.trim().slice(0,28);
    /* ★ 끊기는 자리는 **덩이가 아니라 글줄**이다 — 두 줄로 접힌 덩이는 첫 줄이 자락 위에
       멀쩡히 있어도 아래끝은 자락 안에 든다. 덩이의 위끝으로 재면 그런 덩이가 전부
       「잘렸다」로 잡힌다(처음 쓴 판이 그랬다). 상자 아래끝이 걸친 **그 글줄**만 본다. */
    if(b.top<bot-1 && b.bottom>bot+1){
      const 글줄위 = b.top + Math.floor((bot-b.top)/lh)*lh;
      if(글줄위 < 자락시작-0.5) 잘린줄=e.textContent.trim().slice(0,28); else 자락에걸친줄++; }}
  return JSON.stringify({rails,줄높이:+lh.toFixed(2),안쪽키:+inner.toFixed(2),
    줄수:+(inner/lh).toFixed(2), 보이는줄:rows.length, 잘린줄, 위잘림, 옆으로넘침, 접힌줄,
    자락있음, 자락깊이:자락있음?+(gb.bottom-자락시작).toFixed(1):0, 자락에걸친줄,
    글자:cs.fontSize, 어디:window.__MODE.at});})()`);
say(o.어디==="dungeon", `던전 화면에서 잰다 (지금 "${o.어디}" — 마을 일지 두 줄은 표본이 아니다)`);
say(o.보이는줄>=10, `상자가 넘치도록 찼다 — 보이는 줄 ${o.보이는줄} (실전에서 난 줄은 ${실전줄})`);
say(o.자락깊이+0.5>=o.줄높이, `자락이 한 글줄보다 깊다 (${o.자락깊이}px ≥ ${o.줄높이}px) — 얕으면 마지막 줄이 흐려지다 만 채 끊긴다`);
say(o.잘린줄===null, `자락 밖에서 끊긴 줄이 없다 ${o.잘린줄?`→ "${o.잘린줄}…"`:`(자락 ${o.자락깊이}px · 걸친 줄 ${o.자락에걸친줄})`}`);
say(o.위잘림===null, `위끝에서 잘린 줄이 없다 ${o.위잘림?`→ "${o.위잘림}…"`:""}`);
say(o.옆으로넘침===null, `옆으로 삐져나온 줄이 없다 ${o.옆으로넘침?`→ "${o.옆으로넘침}…"`:""}`);
if(o.rails) console.log(`  ·   접힌 줄 ${o.접힌줄}개 — rails 에서는 설계다(낱말 경계로 꺾는다). 실패로 안 센다`);
else{ say(Math.abs(o.줄수-Math.round(o.줄수))<0.06, `안쪽 키가 줄 수로 딱 떨어진다 (${o.안쪽키}px / ${o.줄높이}px = ${o.줄수}줄)`);
      say(o.접힌줄===0, `두 줄로 접힌 덩이가 없다 (${o.접힌줄}개)`); }
say(errs.length===0,`예외 없음 ${errs.length?"→ "+errs[0]:""}`);
console.log(bad?`\n✗ ${W}×${H}: ${bad}건 실패`:`\n✓ ${W}×${H} 로그: 전부 통과`);
await raw("Target.closeTarget",{targetId});bws.close();process.exit(bad?1:0);
