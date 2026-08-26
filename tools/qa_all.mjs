/* necro 의 자를 한 줄로 — 「어느 자가 죽었는지」를 그 자리에서 말한다.
 * (몇 개인지는 `--list` 가 센다. 여기에 숫자를 적어 두면 자를 늘릴 때마다 낡는다 —
 *  실제로 「열여섯」이라 적힌 채 서른을 넘겼다.)
 *
 *   node tools/qa_all.mjs            빠른 자만 (기본 · 5분 안쪽)
 *   node tools/qa_all.mjs --all      느린 자까지 전부 (수십 분 — detached 로 돌릴 것)
 *   node tools/qa_all.mjs --only tap_qa,log_qa
 *   node tools/qa_all.mjs --list
 *   node tools/qa_all.mjs --no-revive   썩은 브라우저를 고치지 말고 멈춰라 (진단만)
 *
 * 왜 만들었나 (2026-08-13): 「스킬 자가 죽은 것」을 한참 뒤에야 알았다. 브라우저가
 * 썩어 있었는데 자는 exit 0 으로 조용히 끝났다 — 실패가 아니라 **아무 말도 안 한
 * 것**이 문제였다. 그래서 여기서는 세 가지를 갈라 본다:
 *   FAIL  자가 스스로 「틀렸다」고 말함 (exit != 0)
 *   DEAD  시간 안에 안 끝남 / 출력이 없음 / 있어야 할 낱말이 없음  ← 오늘의 그 사고
 *   PASS  끝났고 할 말을 했다
 * DEAD 를 PASS 와 같은 칸에 두면 또 못 본다. 그래서 판정 줄에 따로 센다.
 *
 * 앞서 브라우저부터 본다 — 자가 죽는 첫째 원인이 썩은 헤드리스 크롬이라서(TOOLS.md).
 * 썩었으면 말만 하지 않고 **그 자리에서 다시 세운다**(chrome_guard.mjs).
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ensureChrome } from "./chrome_guard.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const APP = "http://127.0.0.1:8774/index.html";

/* ── 자 목록 ────────────────────────────────────────────────────────────────
 * secs  : 이만큼 지나도 안 끝나면 DEAD (자가 스스로 재는 시간 + 넉넉히)
 * expect: 출력에 반드시 있어야 하는 낱말. 없으면 DEAD — exit 0 이어도.
 * tier  : fast = 기본 실행 · slow = --all 에서만
 */
const RULERS = [
  // ── 빠른 자: 켜자마자 보이는 것들 (UI · 로그 · 한 번의 조작)
  { name: "cdp_verify",   args: ["/tmp/necro_qa_ui.png", "ui"], secs: 90,  tier: "fast", expect: /errors/ },
  { name: "tap_qa",       args: [],                             secs: 90,  tier: "fast", expect: /판정:/ },
  { name: "log_qa",       args: [],                             secs: 90,  tier: "fast", expect: /(  ok|FAIL)/ },
  { name: "dismiss_qa",   args: [],                             secs: 90,  tier: "fast", expect: /(  ok|FAIL)/ },
  { name: "winscroll_qa", args: [],                             secs: 90,  tier: "fast", expect: /(  ok|FAIL)/ },
  { name: "leave_qa",     args: [],                             secs: 150, tier: "fast", expect: /(  ok|FAIL)/ },
  { name: "offline_qa",   args: [],                             secs: 150, tier: "fast", expect: /PASS/ },
  { name: "skill_qa",     args: ["/tmp/necro_qa_skill.png"],    secs: 150, tier: "fast", expect: /판정/ },
  /* ★ skill_qa 는 「어디서 터지나」를 보고, 이건 「**무슨 그림**이 터지나」를 본다 —
     둘이 다르다. skill_qa 가 셋 다 통과하는 동안 태우기는 소환 그림, 제물은 폭발 그림으로
     나가고 저주는 아무것도 안 떴다(2026-08-15 병수님 지적). */
  { name: "fx_art",       args: [],                             secs: 150, tier: "fast", expect: /판정/ },
  { name: "icon_qa",      args: [],                             secs: 120, tier: "fast", expect: /검사한 칸/ },
  /* ★ 능력치 창의 **뜻 없는 줄** — 「깊이 ×1.00」·「금 획득 +0%」은 값이 붙기 전에는 접는다
     (병수님 지적). 접는 것은 쉬운데 **되돌아오는 것**을 안 재면 영영 사라져도 모른다 —
     그래서 값을 붙여 놓고 다시 뜨는지까지 한 판에 잰다. */
  { name: "statrow_qa",   args: [],                             secs: 120, tier: "fast", expect: /(PASS|FAIL)/ },
  /* ★ winscroll_qa 는 「구르는가」를 보고, 이건 「**안 굴러도 다 보이는가**」를 본다 — 가방창의
     페이퍼 돌은 아래 두 칸이 창 밖에 있었는데 winscroll 은 내내 통과했다(구르긴 굴렀으니까). */
  { name: "bagfit_qa",    args: [],                             secs: 150, tier: "fast", expect: /(PASS|FAIL)/ },
  /* ★ statrow_qa 는 「어느 줄이 서는가」를 보고, 이건 「**그 줄에 손댈 수 있는가**」를 본다
     (병수님 「능력치 창이 읽기 전용이다」). 단추가 있는지만 재면 아무것도 안 막으므로
     눌러서 값이 오르는 것 · 그 자리서 다시 그려지는 것 · 대장간 쪽 회귀까지 한 판에 잰다. */
  { name: "statup_qa",    args: [],                             secs: 150, tier: "fast", expect: /(PASS|FAIL)/ },
  { name: "necro_alive_probe", args: ["16"],                    secs: 120, tier: "fast", expect: /판정/ },

  { name: "win_qa",       args: [],                             secs: 150, tier: "fast" },
  { name: "motion_qa",    args: ["8", "/tmp/necro_qa_motion.png"], secs: 150, tier: "fast", expect: /프레임/ },
  { name: "quest_qa",     args: ["1,3,9"],                      secs: 200, tier: "fast", expect: /판정/ },
  /* ★ 옆 패널 — **눈으로 보고서야 안 것**을 자로 옮긴 것이다(병수님 2026-08-16 「PC UI 개판인데」).
     숫자가 전장 위에 얹히고 패널이 172px 로 눌린 것을 사진 두 장을 받고서야 봤다.
     좌표를 재는 자라 빠르다(3 폭 × 0.8초). */
  { name: "rail_qa",      args: [],                             secs: 120, tier: "fast", expect: /판정/ },
  /* ★ 창 발치의 단추 — **네모끼리 견주는 자로는 못 잡는다.** 무엇이 위에 있느냐(z-index)까지
     봐야 해서, 사람이 누르는 그 길(`elementFromPoint`)로 잰다. 2026-08-26 에 도킹 창의
     「나가기」가 84.8% 만 눌렸다(메뉴 띠가 발치를 덮었다). 세 폭에서 전/후를 다 잰다. */
  { name: "v77_hit",      args: [],                             secs: 240, tier: "fast", expect: /판정/ },
  /* ★ 스킬 트리에서 **고른 칸의 테가 이름을 밟나** — 네모가 아니라 **찍은 잉크**를 줄마다
     센다(`.tn` 상자는 글자보다 크고 `outline` 은 상자 밖이라, 상자끼리 견주면 0 이 나온다).
     2026-08-26 에 3px 을 밟고 있었고 트리를 열면 늘 보이는 자리였다. `V78_OLD=1` 로 운다. */
  { name: "v78_selink",   args: [],                             secs: 120, tier: "fast", expect: /판정/ },
  { name: "v79_morehint", args: [],                             secs: 150, tier: "fast", expect: /판정/ },
  /* ★ v77_hit 은 **도킹 창**(능력치·가방)의 발치를 보고, 이건 **마을 창 아홉 장**이
     메뉴 띠(#hudMenu · z 29) 밑으로 들어가는지를 본다 — 「어디부터」가 z 25 에 서서
     발치 40px 을 다섯 칸에 뺏기고 있었다(2026-08-26 · V-81). 네 폭을 다 재는 까닭은
     1512 에서는 편성·운용·환생이 멀쩡하고 **720 에서만 셋 다 울기** 때문이다.
     `V81_OLD=1` 로 옛 자리를 되돌려 운다(보정 확인 완료). */
  { name: "v81_overlap", args: [],                              secs: 150, tier: "fast", expect: /판정/ },
  { name: "v81_overlap", args: ["1280", "720"],                 secs: 150, tier: "fast", expect: /판정/ },
  /* V-82 — 관문의 주인이 제 몸으로 서는가(배어 나오는 시간 < 사는 시간). 90초면 주인
     여섯쯤을 본다. `old` 로 부르면 울어야 옳다(자가 무엇을 잡는지 그것으로 안다). */
  { name: "v82_lord_alpha", args: ["90"],                       secs: 180, tier: "fast", expect: /판정/ },
  /* V-83 — 창 안 설명칸(.tip)이 **말없이** 자르는가. 네 폭 × 창 다섯을 훑는다.
     `old` 로 부르면 울어야 옳다(설명칸에서 wScroll 을 떼면 띠가 없던 그 판). */
  { name: "v83_tipclip",  args: [],                             secs: 240, tier: "fast", expect: /판정/ },
  /* V-84 — 갈래의 「가는 금」이 이름을 뚫는가. 칸 크기(--tS)는 창 높이가 정하므로
     **네 폭을 다 훑어야** 안다(1512 에서도 9px 을 뚫고 있었다).
     `old` 로 부르면 울어야 옳다(못박은 top:26/height:20 으로 되돌리는 문). */
  { name: "v84_forkline", args: [],                             secs: 200, tier: "fast", expect: /판정/ },
  /* V-85 — 창이 뜨면 메뉴 띠가 «반쯤» 잘려 남는가 · 보이는데 안 눌리는가.
     v81_overlap 은 「띠가 창을 밟는가」를 보고 이건 그 **뒤집힌 쪽**을 본다.
     두 폭만 둔다 — 높이가 흠을 가르므로 제일 큰 것(안 눌림)과 제일 낮은 것(잘림).
     `BAND_OLD=1` 로 부르면 울어야 옳다(보정 확인 완료). */
  { name: "v85_bandcut",  args: [],                             secs: 200, tier: "fast", expect: /판정/ },
  { name: "v85_bandcut",  args: ["1512", "863"],                secs: 200, tier: "fast", expect: /판정/ },
  { name: "v86_roomcut",  args: [],                             secs: 200, tier: "fast", expect: /판정/ },
  { name: "v86_roomcut",  args: ["1280", "720"],                secs: 200, tier: "fast", expect: /판정/ },
  /* V-87 — 트리 칸의 그림이 «빈칸»으로 보이는가. 원본 png 가 아니라 **그린 뒤**를
     제 빈칸(`.tIco` 를 숨긴 같은 칸)과 견준다 — 흠은 opacity·filter 를 지나온 뒤에
     생긴다. 한 폭이면 된다: 칸 크기는 `--tS` 하나가 정하고 그림의 어둠은 폭을 안 탄다.
     `DIM_OLD=1` 로 부르면 울어야 옳다(보정 확인 완료). */
  { name: "v87_dimicon",  args: [],                             secs: 200, tier: "fast", expect: /판정/ },
  /* V-88 — 정산 칸의 «갈림 표식»(착용·가방·재료·합침·금)이 물건 그림에 깔리지 않는가.
     「어둡다」가 아니라 **「가려졌다」**를 잰다 — 넉 장을 찍어 글자가 실제로 닿은 몫을
     안 가렸을 때 닿을 몫으로 나눈다. `FATE_OLD=1` 로 부르면 운다(보정 확인 완료). */
  { name: "v88_fatecover", args: [],                            secs: 200, tier: "fast", expect: /판정/ },
  { name: "v88_fatecover", args: ["1280", "720"],               secs: 200, tier: "fast", expect: /판정/ },
  /* V-89 — 이름 뒤 조사가 「이(가)」로 굳어 화면에 **괄호가 그대로** 뜨던 것. 소스의 자국을
     세고(주석은 뺀다), 주인 넷을 하나씩 세워 **관문 층에서 실제 일지 줄을 읽는다.**
     `JOSA_OLD=1` 로 부르면 운다(보정 확인 완료). */
  { name: "v89_josa",     args: [],                             secs: 200, tier: "fast", expect: /판정/ },
  /* V-90 — 저주나무의 「더 있다」 흐림이 **정작 넘치는 창에서만** 꺼져 있던 것. 칸이 22px
     바닥에 닿아도 안 들어가는 창(1152×648)에서 한 칸이 23px 잘리는데, 그 표식은 창이
     **닫혀 있는 동안** 「다 봤다」로 정해져 다시 안 물었다. 네 폭에서 넘침과 흐림을 같이
     재고 끝까지 굴려도 본다. `node tools/v90_treefade.mjs old` 로 부르면 운다(보정 확인 완료). */
  { name: "v90_treefade", args: [],                             secs: 260, tier: "fast", expect: /판정/ },
  /* V-90b — 그 창에서 **잘리는 것 자체**를 없앤 2단 맞추기. 칸(`--tS`)이 22px 바닥을 쳐도
     안 들어가면 **칸 사이**(`--tV`)를 깎는다. 네 폭에서 넘침·잘린 칸을 재고, 2단이
     **바닥을 친 창에서만** 돌았는지도 본다. `node tools/v90b_treefit.mjs old` 로 부르면
     운다(24px 넘침 · 보정 확인 완료). */
  { name: "v90b_treefit", args: [],                             secs: 260, tier: "fast", expect: /판정/ },
  /* 창 열셋의 **모든 글자**가 바탕에 안 묻히는지 — 잉크를 뺀 판·형광으로 칠한 판과
     견줘 «화면에 정말 닿은 잉크»로 잰다(CSS 색이 아니다). `node tools/v91_ink.mjs old`
     로 부르면 운다(옛 그늘·옛 흐림 · 보정 확인 완료). */
  { name: "v91_ink",      args: [],                             secs: 300, tier: "fast", expect: /판정/ },
  /* 덮는 창이 열렸을 때 **띠 옆 글줄**(가방 · Lv · 군세)이 반쯤 먹히지 않는지 —
     그려진 줄은 2.2:1 을 지키고, 물러난 줄은 통과로 센다(V-93).
     `node tools/v93_shade.mjs 1512 863 old` 로 부르면 운다(1.85:1 · 보정 확인 완료). */
  { name: "v93_shade",    args: ["1512", "863"],                secs: 200, tier: "fast", expect: /판정/ },
  /* 물건 이름의 「의」 사슬 — 브라우저를 안 쓰므로 몇 초면 끝난다.
     `node tools/v94_names.mjs old` 로 부르면 운다(32/256 · 보정 확인 완료). */
  { name: "v94_names",    args: [],                             secs: 60,  tier: "fast", expect: /판정/ },
  /* 판이 끝나고 보는 창(정산 · 그동안)의 «글» — 자릿점 · 「N시간 0분」 · 존댓말(V-95).
     `node tools/v95_text.mjs old` 로 부르면 운다(미달 4 · 보정 확인 완료). */
  { name: "v95_text",     args: [],                             secs: 120, tier: "fast", expect: /미달/ },
  /* V-96 — 넓은 창에서 창이 떠도 일지가 뒤에 남던 것(없앤 옆 패널이 깔아 둔 CSS 예외).
     **두 크기를 다 본다** — 1366 에서는 예외 밖이라 여태 멀쩡했다.
     `node tools/v96_wide.mjs old` 로 부르면 ①이 운다(12/12 · 보정 확인 완료). */
  { name: "v96_wide",     args: [],                             secs: 240, tier: "fast", expect: /PASS|FAIL/ },
  /* V-97 — 화면에 뜬 수의 «자릿점». 마을·전장·덮는 창 열둘을 한 자로 훑는다.
     `node tools/v97_digits.mjs old` 로 부르면 운다(미달 5 · 보정 확인 완료). */
  { name: "v97_digits",   args: [],                             secs: 240, tier: "fast", expect: /판정/ },
  { name: "arena_qa",     args: [],                             secs: 150, tier: "fast", expect: /판정/ },
  /* 브라우저 없이 core.js 식을 두드리는 자 — 몇 초면 끝나므로 fast 에 둔다.
     ★ 「제일 싼 것부터」로 되돌아가면 여기가 운다(보정 확인 완료). */
  { name: "forge_mix",    args: [],                             secs: 60,  tier: "fast", expect: /통과|미달/ },
  /* ★ 초기화 — **지우는 기능은 틀리는 방향이 둘**이고, 그중 「안 눌렀는데 지워진다」는
     되돌릴 수가 없다. 두 갈래를 다 켜서 보정해 둔 자다(둘 다 실제로 운다). */
  { name: "wipe_qa",      args: [],                             secs: 150, tier: "fast", expect: /판정/ },
  /* ★ 죽고 마을로 왔을 때 구슬이 **0 을 들고** 서 있었다(병수님 2026-08-17 19:59).
     실제로는 다음 판이 어차피 가득 채우므로 **없는 위험을 그리던** 것이다.
     셈(S.hp)과 **구슬에 적힌 글자** 둘 다 본다 — 하나만 맞으면 고친 게 아니다. */
  { name: "townhp_qa",    args: ["40"],                         secs: 180, tier: "fast", expect: /판정/ },
  /* ★ 단축키 — **적어 두기는 쉽고 안 도는 줄은 아무도 모르는** 자리다(벨트 칸에 1~8 이
     적혀만 있고 오래 안 먹었다). 진짜로 키를 눌러 보고, 자동소환이 대신 눌러 준 것과
     **가려서** 본다(그걸 안 가르면 키를 끊어 놓고도 통과한다 — 실제로 그랬다). */
  { name: "hotkey_qa",    args: [],                             secs: 180, tier: "fast", expect: /판정/ },
  /* ★ **자를 재는 자.** 남은 자 열넷은 전부 빨리 감아 재는데, 배수를 올리면 판이 뒤집히고
     있었다(×8 은 2~3초에 죽었다 — main.js 의 auto() 가 벽시계로 돌아 «머리»만 안 빨라졌다).
     이것이 무너지면 나머지 열넷이 낸 숫자가 전부 남의 판 것이 된다. ×1 을 24 «게임»초
     기다리므로 빠른 자 중에선 느린 편(≈70초)이다. */
  { name: "speed_probe",  args: ["24", "1,3,8"],                secs: 200, tier: "fast", expect: /PASS|틀림/ },
  /* ★ **켜서 보는 자.** 여기 열여섯이 다 통과해도 화면이 틀린 날이 있었다 —
     08-17 아침 항목 넷 중 셋을 자가 아니라 **사진과 눈**이 잡았다. 사진은 예쁜지를
     판정 못 하지만 「**어느 화면을 찍었는가**」는 잰다(이 자는 그것조차 안 재서
     45초 굴린 «깊은 층» 이 내내 마을 사진이었다). 사람이 볼 그림 넷도 같이 남긴다. */
  { name: "look_shots",   args: [],                             secs: 180, tier: "fast", expect: /판정/ },

  /* ★ 건너뛰기는 **창을 지나는 길**이라 훅으로는 못 잰다 — 입구를 진짜로 누르고 칸을 눌러 본다.
     그런데 **입력을 쓰는 자는 앞에 있어야** 닿는다(Page.bringToFront). 빠른 자 열넷과 섞어
     돌리면 서로 앞자리를 뺏어 그때그때 다르게 진다 — 홀로 돌리면 늘 통과한다.
     그래서 여기(따로 도는 자리)에 둔다: `node tools/qa_all.mjs --only dive_qa`. */
  { name: "dive_qa",     args: [],                secs: 240,  tier: "slow", expect: /판정/ },

  // ── 느린 자: 판을 실제로 굴려서 재는 것들 (--all)
  { name: "walk_qa",     args: ["25", "3"],       secs: 240,  tier: "slow" },
  { name: "march_qa",    args: ["40", "3"],       secs: 300,  tier: "slow", expect: /판정/ },
  { name: "boss_qa",     args: ["5", "30", "3"],  secs: 300,  tier: "slow" },
  { name: "gatelord_probe", args: ["12", "1,7,13"], secs: 900, tier: "slow", expect: /판정/ },
  { name: "unique_probe", args: [],                secs: 900, tier: "slow", expect: /판정/ },
  { name: "run_end",     args: [],                secs: 600,  tier: "slow" },
  { name: "rebirth_qa",  args: ["10", "1,7"],     secs: 1500, tier: "slow", expect: /판정/ },
  { name: "loop_health", args: [],                secs: 1500, tier: "slow" },
  { name: "corpse_probe", args: ["30", "1,13"],   secs: 1500, tier: "slow", expect: /판정/ },
  /* ★ **군대가 한 종으로 무너지는 것**은 다른 자가 아무도 안 본다 — 편성표가 셋을 섞는다고
     적혀 있어도 판에 서는 것은 해골뿐일 수 있고, 그때도 최고층·처치는 멀쩡하다.
     `fresh` 로 갓 만든 세이브를 쓴다(쌓인 프로필로 재면 「처음 켠 사람」의 답이 아니다).
     720초를 주는 까닭: 골렘 첫 등장이 ≈360초라 짧게 돌리면 미달이 정상이다. */
  { name: "kind_probe",  args: ["720", "fresh"], secs: 900,  tier: "slow", expect: /판정/ },
];

/* ── 인자 ── */
const argv = process.argv.slice(2);
const ALL = argv.includes("--all");
const onlyIdx = argv.indexOf("--only");
const ONLY = onlyIdx >= 0 ? new Set((argv[onlyIdx + 1] || "").split(",").filter(Boolean)) : null;

if (argv.includes("--list")) {
  for (const r of RULERS) console.log(`${r.tier.padEnd(4)}  ${r.name.padEnd(13)} ${r.secs}s  node tools/${r.name}.mjs ${r.args.join(" ")}`);
  console.log(`\n총 ${RULERS.length} 자 (fast ${RULERS.filter(r => r.tier === "fast").length} · slow ${RULERS.filter(r => r.tier === "slow").length})`);
  process.exit(0);
}

const pick = RULERS.filter(r => (ONLY ? ONLY.has(r.name) : ALL || r.tier === "fast"));
if (ONLY) {
  const unknown = [...ONLY].filter(n => !RULERS.some(r => r.name === n));
  if (unknown.length) { console.error("모르는 자: " + unknown.join(", ") + "  (--list 로 확인)"); process.exit(2); }
}

/* ── 앞서 보기: 브라우저와 서버가 살아 있나 ────────────────────────────────
 * 죽은 브라우저에 열여섯 번 절하고 「전부 DEAD」를 받아 봐야 원인은 하나다.
 * 브라우저는 **여기서 고친다** — 진단(RSS·나이·CDP)이 곧 처방이라서(chrome_guard).
 * 고쳐지지 않을 때만 멈춘다. 앱 서버는 여전히 멈춤 사유다(띄우는 자리가 사람 쪽).
 */
async function preflight() {
  const bad = [];
  const g = await ensureChrome({ revive: !argv.includes("--no-revive") });
  if (!g.ok) bad.push(`브라우저를 세우지 못했다 — ${g.notes.join(" · ")}`);

  try {
    const r = await fetch(APP, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) bad.push(`앱 서버 HTTP ${r.status}`); else console.log(`앱 서버  200  ${APP}`);
  } catch (e) { bad.push(`앱 서버 8774 응답 없음 (${e.message}) — python3 -m http.server 8774 를 띄울 것`); }
  return bad;
}

/* ── 자 하나 돌리기 ── */
function run(r) {
  return new Promise(res => {
    const t0 = Date.now();
    const p = spawn("node", [`tools/${r.name}.mjs`, ...r.args], { cwd: REPO });
    let out = "", killed = false;
    const timer = setTimeout(() => { killed = true; p.kill("SIGKILL"); }, r.secs * 1000);
    p.stdout.on("data", d => out += d);
    p.stderr.on("data", d => out += d);
    p.on("close", code => {
      clearTimeout(timer);
      const sec = Math.round((Date.now() - t0) / 1000);
      const lines = out.split("\n").filter(l => l.trim()).length;
      let verdict, why = "";
      if (killed)                          { verdict = "DEAD"; why = `${r.secs}s 안에 안 끝났다`; }
      else if (lines < 2)                  { verdict = "DEAD"; why = `아무 말도 안 했다 (${lines}줄)`; }
      else if (r.expect && !r.expect.test(out)) { verdict = "DEAD"; why = `있어야 할 낱말이 없다 ${r.expect}`; }
      /* 자가 「못 쟀다」고 말하고 나가면 그것은 **게임 판정이 아니다** — 그렇게 적어 준다.
         (08-24 fx_art 이 TypeError 로 터져 「죽음」으로 세어졌던 자리) */
      else if (code !== 0)                 { verdict = "FAIL"; why = /못 쟀다/.test(out) ? `자가 못 쟀다 (exit ${code}) — 게임 판정이 아니다` : `exit ${code}`; }
      else                                 { verdict = "PASS"; }
      res({ ...r, verdict, why, sec, lines, out });
    });
  });
}

/* ── 본문 ── */
const bad = await preflight();
if (bad.length) {
  console.log("\n═══ 앞서 보기에서 멈춘다 ═══");
  for (const b of bad) console.log("  ✗ " + b);
  process.exit(3);
}
console.log(`\n자 ${pick.length} 개 ${ALL ? "(전부)" : ONLY ? "(고른 것)" : "(빠른 것만 — 전부는 --all)"}\n`);

const results = [];
for (const r of pick) {
  process.stdout.write(`  … ${r.name.padEnd(13)}`);
  const x = await run(r);
  results.push(x);
  process.stdout.write(`\r  ${x.verdict === "PASS" ? "ok  " : x.verdict === "FAIL" ? "FAIL" : "DEAD"} ${r.name.padEnd(13)} ${String(x.sec).padStart(4)}s  ${x.why}\n`);
}

/* 틀린 자·죽은 자만 말을 다시 들려 준다 — 통과한 자의 수다까지 다 찍으면 안 읽는다. */
for (const x of results.filter(v => v.verdict !== "PASS")) {
  console.log(`\n──── ${x.name} (${x.verdict}: ${x.why}) ────`);
  console.log(x.out.split("\n").slice(-25).join("\n").trimEnd() || "(출력 없음)");
}

const fail = results.filter(v => v.verdict === "FAIL").length;
const dead = results.filter(v => v.verdict === "DEAD").length;
console.log(`\n═══ ${results.length - fail - dead}/${results.length} 통과 · 틀림 ${fail} · ★죽음 ${dead} ═══`);
if (dead) console.log("★ 죽은 자는 「통과」가 아니다 — 자가 먼저 고장 났다는 뜻이다.");
process.exit(fail || dead ? 1 : 0);
