# NOW — hs/ 감시가 «제일 먼저» 읽는 파일
(크론 본문의 항목번호보다 이게 우선이다. 축을 띄울 때마다 여기를 갱신한다.)

> ## ★★ 워커에게 — 물러서기 금지 (상시)
> **이 문서를 워커로서 읽고 있다면, 「지금 도는 판」은 «너 자신»이다.**
> `ps` 에 보이는 opencode/claude 프로세스도, :9333 에 떠 있는 헤드리스 크롬도 전부 네 것이다.
> 그걸 「다른 워커가 이미 하고 있다」로 읽고 물러선 판이 **네 번**(V-222·V-232·V-235·V-264) 있었고
> 매번 rc=0 no-op 으로 한 시간을 버렸다.
> **물러설 수 있는 유일한 근거는 `git log` 에 그 축의 «구현/검증» 커밋이 이미 있는 것 하나뿐이다**
> (「… 착수 · 검증 전」 커밋은 근거가 아니다 — 그건 네가 이어서 끝내야 할 표시다).
> 「지켜보겠다 · 중복을 피하겠다 · 다음에 검증하겠다」로 끝나는 턴 = 실패한 판.

## ✔ 끝난 판: V-281 — 14:00 감시 흠 셋(㉮㉯㉰) + 바닥 타일 둘(blood·abyss) (2026-09-03)
14:00 감시가 V-280 컷 넷을 직접 열어 흠 셋을 넘겼다. 만진 곳 `hs/main.js`(그리기)+`assets/floor/{blood,abyss}_tile.png`(에셋 교체). **새 자 파일 없음**(베이커 `tmp/hs_v281_cut.mjs`·타일 자 `tmp/hs_v280_tilemeas.mjs`·화면 `tmp/hs_v281_floor.mjs`·지문 `tmp/_v276_fp.mjs`·되돌림 `assets/floor/_pre_v280/`).
- **㉮ `__FOOTRING`** — 발밑 쨍한 순노랑 닫힌 고리(#e8cf52·α0.9·lw3)가 RTS 선택 원처럼 화면에서 제일 밝아 먼지·바닥무늬를 덮던 것을, 채도·밝기 낮춘 던전 호박빛 «접지 풀»(부드러운 그라디언트·닫힌 테 없음·groundMark 접촉선과 안 싸움)로 낮춤. 사람은 금빛 rim(RIM_FILTER)으로 여전히 읽힘. 노란 화소%(사람 둘레 96px 상자) **13%→6.96%**(줄음)·짝 화소차 **21%**(≥3%). 소환수·적 고리(ringsOn)는 안 건드림. 컷 `footring_before`(=`__FOOTRING=false`)·`footring_after`(+_crop3). `__FOOTRING=false` → 옛(V-280) 쨍한 노란 고리.
- **㉯ `__ROLLDUST2`** — V-280 먼지가 한 점도 안 보이던 «까닭»: 어두운 갈색(#4e3d24)을 α≈0.2 로 어두운(빛으로 눌린) 바닥에 얹어 명도차가 시각 문턱 아래였다(그리기·좌표·z 순서·빛 다 정상 — drawLight 는 drawPlayer 앞이라 안 덮음). 흙먼지를 «밝게»(#e2d2ad 알갱이·#b7a074 경로 스커프) 올리고 알파를 높여 정지 컷에서도 「굴렀다」가 읽히게. 짝 화소차 **10.72%**(≥3%). 컷 `rolldust2_before`(=V-280)·`rolldust2`(+_crop3). `__ROLLDUST2=false` → 옛(V-280) 어두운 두 톤.
- **㉰ `__STUCKFRONT`** — 꽂힌 화살 대 절반이 벽 위 경계를 넘어 V-279 검은 바깥에 잠기던 것을, 박힌 자리를 발사 반대쪽(사람 쪽)으로 16px 당겨 촉 끝이 딱 벽면 impact 에 오고 대·깃은 전부 방 쪽에 오게(앞쪽 화소가 impact 를 안 넘음). 컷으로 검은 영역에 걸친 화살 화소 없음 확인. 짝 화소차 **3.38%**(≥3%). 컷 `stuckfront_before`(=`__STUCKFRONT=false`·검은 영역에 걸침)·`stuckfront`(+_crop3). `__STUCKFRONT=false` → 옛(V-280) 자리.
- **⑤ 바닥 타일 blood·abyss** — V-272 마지막 둘. V-280 이 style_images 로 sd<25(blood 7·abyss 9)라 못 넣던 것을 **shape mode segmentation**(`create_tiles_pro`·square_topdown·top-down 90°·32px·outline_mode segmentation·16변주 중 sd·mean·이음매로 골라)로 다시 구움. blood 무늬 **7.0→27.7**(mean 67.9→35.3·어두워짐·이음매 ~1·붉은 판석) · abyss **9.3→37.8**(mean 38.9→19.8·어두워짐·이음매 5/2.6·검은 갈라진 바위) — 둘 다 **sd≥25·mean 옛것보다 안 밝음**. 컷 `floor_{blood,abyss}_{before,after}` 직접 열어 봄: before 는 뜬 tan/밝은 회색이라 「무늬」로 안 읽히던 것이 after 는 붉은 판석·검은 균열로 읽힘·격자 안 보임(4×4 회전이 흩음). 콘솔 오류 0.
- 되돌림 지문: ㉮㉯㉰ 는 그리기·⑤ 는 에셋 PNG 교체 → **genFloor 무접촉** → F1/3/5/10/30 **byte-동일**(4341720539·cebe184b88·07968a97a3·e9e3aa0cbf·b2bea5b359).
- 회귀(있는 자로만): `hs_v207_walk` **벽밖 0%·오류 0**(WAKE 3000/820) · `hs_v219_foeshot` **frame p95 1.6ms·오류 0·에셋 100%·쏜화살 239**. 컷 직접 열어 봄·콘솔 오류 **0**·`md5 -q tmp/hs_v281_*.png|sort|uniq -d` **비었음**.
- **못 한 것**: 없음(㉮㉯㉰⑤ 다 함). 미흡: ㉮ 노란 화소 6.96% 잔여는 사람 몸의 금빛 rim(before/after 둘 다·위치 읽힘용)이지 발밑 접지 아님. ㉰ 표본은 dx=1(세로 벽에 박힌 가로 화살)이라 당김이 사람 쪽으로 옳음(어느 벽 방향이든 «발사 반대쪽»이 바깥 반대). abyss after 균열이 다소 촘촘하나 격자로는 안 읽힘.

## ✔ 끝난 판: V-280 — 13:00 감시 흠 넷(㉮㉯㉰㉱) + 바닥 타일 둘(crypt·sanctum) (2026-09-03)
13:00 감시가 V-278 컷 여덟을 직접 열어 흠 넷을 넘겼다. 만진 곳 `hs/main.js`(그리기)+`assets/floor/{crypt,sanctum}_tile.png`(에셋 교체). **새 자 파일 없음**(베이커 `tmp/hs_v280_cut.mjs`·타일 자 `tmp/hs_v280_{tilemeas,tilepreview,floor}.mjs`·지문 `tmp/_v276_fp.mjs`·되돌림 `assets/floor/_pre_v280/`). 코드 커밋 `6c35bc6`.
- **㉮ `__ROLLGLOW`** — 구르는 중 노란 «사람 실루엣» 색면(rim 이 변형 전 선 자세로 그려짐)을, rim 을 구르기 회전/squash 변환 «안»에서 떠 기운 몸을 따라가게. 속은 몸이 덮어 **테두리만**·알파 0.4 로 바닥 비침. 컷 `rollglow_mid`(속 찬 노란 덩어리 **0**)·`rollglow_mid_off`(옛 색면 — 서 있는 노란 실루엣 보임)·`rollglow_end`(끝 반짝 유지). `__ROLLGLOW=false` → 옛(V-278) 꼴.
- **㉯ `__ROLLDUST`** — 먼지가 컷에 한 점도 안 보이던 것(흙빛이 바닥색과 겹침)을 **어두운 긁힘 + 옅은 먼지 두 톤 + 경로 자국**으로 어떤 바닥에서도 읽히게(정지 컷에서도 「굴렀다」가 읽힘). 컷 `rolldust`(+`_crop3`). `__ROLLDUST=false` → 옛(V-278) 작은 흙빛 점 다섯.
- **㉰ `__HOLEDEPTH`** — 발사구가 벽과 안 갈리던(잿빛 홈) 것에 **깊이**(순검정 속·위 안쪽 밝은 테·아래 그림자 턱·화로 불빛 은은한 테 반짝). 꽂힌 화살은 바닥에 누운 듯하던 것을 **벽면에 박히게**(기울임 없음·촉이 벽 속·박힌 자리 부스러기+벽 그림자). 컷 `hole_depth`(+`_crop3`)·`stuck_wall`(+`_crop3`). `__HOLEDEPTH=false` → 옛(V-278) 꼴.
- **㉱ 짝 컷 화소차 잣대** — md5 만으로는 「눈으로 같은 그림」을 못 걸러 베이커 안에 `PXDIFF`(브라우저 안 getImageData 화소차%·`tools/` 새 자 없음)를 두고, 짝 컷은 **바뀐 화소 ≥3%**: **rollglow off↔on 6.83% · rolldust off↔on 7.36% · hole_depth off↔on 15.45%**(다 통과). 처음엔 hole 을 240px 상자로 재 0.71% 였으나 구멍(~18px)이 너무 작아 상자를 좁혀 다시 잼.
- **⑤ 바닥 타일** — V-272 남은 넷 중 **crypt·sanctum 둘 적용**(PixelLab `create_tiles_pro` **style_images 에 rot 타일**을 주고 색은 각 지역 것·`color_palette:false`). crypt 무늬 **8.9→28.6**(mean 42→45·안 밝아짐) · sanctum **7.4→31.2**(mean 59→39·어두워짐·「어둠의 성소」답게) — 둘 다 **sd≥25**. 컷 `floor_{crypt,sanctum}_{before,after}` 직접 열어 봄: 격자 안 보임(`buildFloorPat` 4×4 회전이 이음매를 흩음 — bone 이 이음매 58 이어도 통과한 그 이치)·crypt 는 또렷한 판석·sanctum 은 금빛 알갱이 돌바닥. 콘솔 오류 0.
- 되돌림 지문: **genFloor 무접촉**(㉮㉯㉰ 는 그리기·⑤ 는 에셋 PNG 교체) → F1/3/5/10/30 **byte-동일**(4341720539·cebe184b88·07968a97a3·e9e3aa0cbf·b2bea5b359).
- 회귀(있는 자로만): `hs_v207_walk` **벽밖 0%·오류 0**(WAKE 3000/820) · `hs_v219_foeshot` **frame p95 1.7ms·오류 0·에셋 100%·쏜화살 271**. 컷 직접 열어 봄·콘솔 오류 **0**·`md5 -q tmp/hs_v280_*.png|sort|uniq -d` **비었음**.
- **못 한 것**: **⑤ blood·abyss 못 함.** style_images 로 굽되 blood(무늬 14)·abyss(무늬 10)는 **sd<25**(목표 미달·현재 7.0/9.3 보다는 낫지만 「무늬」로 안 읽힘) — crypt(28)은 이음매 58 이나 4×4 회전이 흩어 통과, blood/abyss 는 무늬 자체가 옅어 억지로 안 넣음(브리프 「나쁘면 옛것을 둔다」). 남은 둘은 다음 판 — 씨앗·프롬프트를 바꾸거나(대비·알갱이 더) shape mode segmentation 재시도.

## ✔ 끝난 판: V-278 — 12:30 감시 흠 넷(㉮㉯㉰㉱) (흠 넷 닫음 2026-09-03 · ⑤ 바닥 타일은 못 함)
12:30 감시가 V-277 컷 열 장을 직접 열어 통과 판정하고 흠 넷을 넘겼다. 만진 곳 `hs/`(main.js·hud.css). **새 자 파일 없음**(베이커 `tmp/hs_v278_cut.mjs`·지문은 있는 것 `tmp/_v276_fp.mjs` 되씀). ★ 이 판은 V-279 워커와 **한 브라우저(:9333)를 겹쳐** 돌던 판 — 내 main.js 흠넷 코드가 V-279 커밋(`3569c24`)에 함께 실려 origin 에 올라갔고, 빠져 있던 `body.bottomread` CSS 한 줄을 `1bc8413` 로 마저 올려 완결했다.
- **㉮ `__WARNBAND`** — 발사 예고 띠가 「각진 점선 marquee(선택 상자)」로 보이던 것을, 구멍→반대 벽 **가장자리가 흐려지는 빛 띠**로(점선 테 없앰·구멍 쪽 밝고 멀수록 옅어지는 gradient·가운데 굵고 끝 가는 마름모꼴+밝은 심지 한 겹). 임박할수록(작은 `w.cd`) **맥박이 빨라짐**(`spd=55+150*(cd/ARROW_WARN)`). 컷 `warn_band`(초반)·`warn_band_late`(발동 직전) 각진 점선 **0**. `__WARNBAND=false` → 옛(V-277) 점선 사각.
- **㉯ `__ARROWHOLE`** — 발사구가 벽 무늬와 안 갈리던 것을 **키우고**(어깨 폭 15×32 돌 테+검은 속+아래로 **그림자 턱**). 꽂힌 화살은 1~2px 조각 → **벽에 비스듬히 박힌 굵은 화살**(대 굵고 붉은 깃·벽 그림자·`drawArrowStuck`·기울기 0.28rad)로, 남는 시간 0.5s→**2.5s**(`t0` 로 알파). 컷 `hole_idle`(문틈과 갈림)·`hole_stuck`(비스듬히 박힘·t0=2.5 실측). `__ARROWHOLE=false` → 옛 작은 「[」+0.5s.
- **㉰ `__ROLLPOSE`** — 구르기가 「선 자세로 미끄러짐」이던 것을, 0.25s 동안 몸을 **기울이고(±0.46rad·`p.dashDx` 부호)·squash/stretch**(`sin(rp·π)` 로 가운데 최대 납작)·**그림자도 납작**·출발 자리 **먼지 퍼프**(`drawRollDust`·흙빛 점 다섯 퍼지며 옅어짐). 컷 `roll_mid`(기운 몸·먼지)·`roll_end`(일어서며 반짝 dashEnd). `__ROLLPOSE=false` → 옛 선 자세.
- **㉱ `__BOTTOMREAD`** — 아래 조작 안내가 던전에 묻히던 것을, `body.bottomread #hint.short` **위아래로 흐려지는 어두운 띠**+글자 밝힘(hud.css). 구르기 게이지 칸을 **찬 칸 호박빛·빈 칸 어두운 테두리·15px**(JS dashHTML). 컷 `bottom_read`(안내 읽힘)·`roll_gauge`(`구르기 ▮▯▯▯` 찬/빈 칸 갈림). `__BOTTOMREAD=false` → 옛 꼴.
- 되돌림 지문: **genFloor 무접촉**(전부 그리기/HUD/CSS·map.js 안 만짐) → OFF=ON=BASE **byte-동일** F1/F3/F5/F10/F30(`tmp/_v276_fp.mjs`: 4341720539·cebe184b88·07968a97a3·e9e3aa0cbf·b2bea5b359).
- 회귀(있는 자로만): `hs_v207_walk` **벽밖 0%·오류 0** / `hs_v219_foeshot` **frame p95 1.6ms(≤16.7)·오류 0·에셋 100%·쏜화살 363**. 컷 8장 직접 열어 봄·콘솔 오류 **0**·`md5 -q tmp/hs_v278_*.png|sort|uniq -d` **비었음**.
- **못 한 것**: **⑤ 바닥 타일(crypt·blood·abyss·sanctum) 못 함.** V-279 워커가 «방·복도 밖을 검정으로»(바닥 렌더링 인접)를 같은 브라우저로 돌며 화면 판정을 기다리는 중이라, ⑤ 의 before/after 컷이 :9333 을 또 잡으면 겹친다(AGENTS.md 「두 판 겹치지 말 것」). PixelLab 타일 굽기+에셋 파일 교체도 V-279 의 바닥 작업과 충돌 위험. 흠 넷을 먼저 굳혀 올리고 ⑤ 는 다음 판으로 미뤘다 → 「다음 차례」 V-272 칸에 그대로 남긴다.

## ✔ 끝난 판: V-277 — 11:30 감시 흠 넷 + 구르기(`__DASH`) (닫음 2026-09-03)
11:30 감시가 V-276 컷 다섯을 직접 열어 통과 판정하고 흠 넷을 넘겼다. 만진 곳 `hs/main.js` **하나**(map.js·hud.css 무접촉)·**새 자 파일 없음**(베이커 `tmp/hs_v277_cut.mjs`·지문은 V-276 것 `tmp/_v276_fp.mjs` 되씀).
- **㉮㉯ `__ARROWLOOK`** — 화살이 「허공에서 나오고 UI 아이콘 같던」 것을 고침. 발사구를 **벽면에 실제로 그리고**(어두운 구멍+돌 테·idle 에도 늘 보임·`drawArrowWalls` 새 꼴), 예고 때 구멍이 크게 빛나며 발사선을 **바닥에 호박빛 띠**로(불길 예고 결·발동 순간 사라짐). 화살은 **픽셀 결**(나무대·쇠촉·깃·눕고·그림자·잔상·`drawArrowPixel`), 벽에 닿으면 **잠깐 꽂힌 채 남음**(`G.arrowStuck` 0.5s). 컷 `arrow_idle`·`arrow_warn`·`arrow_fire`·`arrow_pix`·`arrow_stuck`. `__ARROWLOOK=false` → 옛(V-276) 소켓·선 화살(`drawArrowWallsOld`).
- **㉰ `__SHRINEGLOW`** — 저주 신전 자줏빛 광원이 화로보다 밝던 것을 어둡게(r 42→28·α 0.62→0.4·색 덜 희게), 붉은 축복 신전은 광원 낮춰(top r×0.7·α 0.9→0.5·바닥 0.3→0.2) **기둥 실루엣이 먼저 읽히게**(네 갈래 같은 규칙). 컷 `shrine_glow`(축복 넷+저주+화로 한 화면·화로가 제일 밝음). `__SHRINEGLOW=false` → 옛 밝기.
- **㉱ 컷 위생** — `md5 -q tmp/hs_v277_*.png | sort | uniq -d` **비었음**(10장 다 다름).
- **⑤ 구르기 `__DASH`(새 컨텐츠)** — **Space** 로 바라보는(또는 이동) 쪽으로 짧게 구른다(150px·0.25s·`stepToP` 로 벽 못 뚫음). 구르는 동안 **무적**(`dashInvuln()`: 근접=iframe·도트/함정/화살=`!dashInvuln()` 가름 — 실측 발사선 위 (A)hp 3315→2899 Δ416 vs (B)무적 Δ0)·끝나는 순간 몸 반짝(`dashEnd`)→원래대로. **쿨 0.9s** HUD 태세 띠 옆 게이지. 구르는 중 공격·시전 안 먹음(끝나고 받음). 조작 안내에 「Space 구르기」. 컷 `dash_roll`·`dash_dodge`·`dash_wall`·`dash_hud`. `__DASH=false` → 키 죽고 옛 꼴.
- 되돌림 지문: **genFloor 무접촉**(전부 그리기/조작) → OFF=ON=BASE **byte-동일** F1/F3/F5/F10/F30(`tmp/_v276_fp.mjs`: 4341720539·cebe184b88·07968a97a3·e9e3aa0cbf·b2bea5b359 = V-276 기준선).
- 회귀(있는 자로만): `hs_v207_walk` **벽밖 0%·오류 0** / `hs_v219_foeshot` **frame p95 1.9ms(≤16.7)·오류 0·에셋 100%·쏜화살 114**. 컷 10장 직접 열어 봄·콘솔 오류 **0**.
- **못 한 것**: 없음(㉮㉯㉰㉱⑤ 다 함). 미흡: 화살/신전 컷은 적·조준선 치워(`DECLUTTER`) 주제만 찍음(플레이엔 그대로). dash_dodge 무적 판정은 표본 경합 피해 제자리 무적+벽 한 발로 격리(실제 구르기는 무적+이동으로 같이 피함).

다음 후보: ① ROADMAP 맨 끝 열린 `- [ ]`. ② 함정 변주(굴러오는 바위·회전 칼날) / 신전 변주(연쇄 축복) / 정예 수식어 새 갈래 / 새 물건. ③ 감춘 방·수수께끼.

## ✔ 끝난 판: V-276 — 11:00 감시 흠 넷 + 화살 벽(`__ARROWWALL`) (닫음 2026-09-03)
11:00 감시가 V-275 컷 다섯을 직접 열어 통과 판정하고 흠 넷을 넘겼다. 만진 곳 `hs/`(main.js·map.js·hud.css)·**새 자 파일 없음**(베이커 `tmp/hs_v276_cut.mjs`·지문 `tmp/_v276_fp.mjs`).
- **㉮ `__TOASTSTACK`** — 층 제목·축복 띠·대가 띠·**토스트**가 서로 안 겹치게. `reserveTopUI()` 가 drawFloats **전에** 제목·띠 사각을 `reservedFloatRects` 에 올려 토스트(floatNote)가 이 위를 피해 쌓는다(손으로 y 안 적음 — `topBandCursor` 하나가 순서를 정함·`drawTopBand` 에 재는 패스 `topBandMeasure` 추가). 컷 `toaststack_title`(제목·축복·대가·토스트 넷 안 겹침·토스트가 제목 위로 밀림)·`toaststack_two`(토스트 셋도 안 겹침). `__TOASTSTACK=false` → 옛 꼴.
- **㉯ `__CURSEDLOOK`** — 저주 신전을 붉음→**검보라 자줏빛+기울어 깨진 기둥+가시·사슬**(붉은 축복 신전과 색·꼴로 갈림)·표식도 **자줏빛 마름모**(신전 청록·함정방 붉음·저주제단 자줏빛 ✚ 와 갈림). 컷 `shrine_vs_cursed`(붉음/자줏빛 나란히·60~80px 갈림)·`cursed_marks_map`(표식 넷 갈림). `__CURSEDLOOK=false` → 옛 검붉음.
- **㉰ `__HUDREAD`** — 좌상단 `.mult`(피해·생명)·좌하단 `.gearline.readable`(태세 띠)를 13→15px·밝힘으로 1배율에서 읽히게. 피해가 ×1.00 이 아니면 **색으로**(축복 붉음 #ff7a52/약화 잿빛·JS). 컷 `hudread`(피해 ×2.21 붉게·태세 띠 읽힘). `__HUDREAD=false` → 옛 작고 어두운 글.
- **㉱ 컷 위생** — `md5 -q tmp/hs_v276_*.png | sort | uniq -d` **비었음**(9장 다 다름).
- **⑤ 화살 벽 `__ARROWWALL`(새 컨텐츠)** — 여섯째 함정(「지나갈 때를 고른다」). `genFloor` 맨 끝(cursed 뒤)·산술 PRNG(`aw`)·Math.random 무소비·`arrowWalls` fp 밖·**층4부터·층당 0~2**. 좁은 복도 벽 구멍이 주기(2.4s·예고 0.5s 구멍 빛남→비행 540)로 반대 벽까지 쏜다. **예고 동안 비키면 안 맞음**(불길 규격)·피해 `10+층×2`(dotPlayer — 층8 hp 3315→2899 Δ416)·**사람 좌표만**(소환수·적 안 맞음)·**뼈창으로 구멍 막음**(`hitArrowWall`·뼈 마개). 미니맵/전체지도 호박빛 화살 표식+범례. 컷 `arrow_warn`·`arrow_flight`·`arrow_hit`(Δ416·「화살!」)·`arrow_blocked`(뼈 마개). `__ARROWWALL=false` → 빠짐.
- 되돌림 지문: genFloor 를 만지는 것은 `__ARROWWALL` 뿐(맨 끝·산술 PRNG·`arrowWalls` fp 밖) → OFF=ON=BASE **byte-동일** F1/F3/F5/F10/F30(`tmp/_v276_fp.mjs`: 4341720539·cebe184b88·07968a97a3·e9e3aa0cbf·b2bea5b359 = V-275 기준선). 나머지 넷은 그리기/UI. 화살 벽/층 ON: F1=0 F3=0 F5=1 F10=1 F30=2.
- 회귀(있는 자로만): `hs_v207_walk` **벽밖 0%·오류 0** / `hs_v219_foeshot` **frame p95 1.8ms(≤16.7)·오류 0·에셋 100%·쏜화살 125**. 컷 9장 직접 열어 봄·콘솔 오류 **0**.
- **못 한 것**: 없음(㉮㉯㉰㉱⑤ 다 함). 미흡: `toaststack_two` 토스트 셋이 천장에서 가로로 1px 간격으로 붙음(겹치진 않음·읽힘·기존 float 천장 회피). 화살 비행 컷은 사람을 옆으로 비켜 찍음(발사선 위면 맞아 사라짐).

다음 후보: ① ROADMAP 맨 끝 열린 `- [ ]`. ② 함정 변주(굴러오는 바위·회전 칼날) / 신전 변주(연쇄 축복) / 정예 수식어 새 갈래 / 새 물건. ③ 감춘 방·수수께끼.

## ✔ 끝난 판: V-275 — 10:00 감시 흠 넷 + 저주받은 신전(`__CURSEDSHRINE`) (닫음 2026-09-03)
10:00 감시가 V-274 컷 열둘을 직접 열어 대체로 통과 판정하고 흠 넷을 넘겼다. 만진 곳 `hs/`(main.js·map.js)·**새 자 파일 없음**(베이커 `tmp/hs_v275_cut.mjs`·`tmp/hs_v275_branches.mjs`·지문 `tmp/_v275_fp.mjs`).
- **㉮ `__TOPSTACK`** — 층 제목·축복 띠·대가 띠를 **한 근원**(`topBandLayout`: `topBandBegin`/`drawTopBand`/`drawTopBands`)이 세로로 쌓는다. 제목이 뜨면 띠가 `zoneTitleY()+40` 아래로, 사라지면 y74 로 올라온다(손으로 y 안 적음 → 다음 띠도 안 겹침). 컷 `topstack_title`/`topstack_notitle` 제목과 안 겹침. `__TOPSTACK=false` → 옛 고정 y74.
- **㉯ `__SHRINELOOK`** — 신전을 랜드마크로: 기둥 44→64px(사람 키 1.4배)·바닥 갈래색 광원 한 겹·몸에 갈래색 룬 띠 둘. 밝기(윗불 0.9·pulse)는 옛값 → **제일 밝은 건 화로**(HS_STYLE). 컷 `shrine_look_on/off`·`shrine_branches`(피 붉음·뼈 창백·재빠름 푸름·탐욕 금 넷 갈림). `__SHRINELOOK=false` → 옛 꼴.
- **㉰ armed 이중선** — 어두운 금 바깥 테(`#241a0e`)+그 옆 밝은 하이라이트(`#e2cf98`) → 밝은/어두운 바닥 어디서도 대비가 선다. 발동 뒤 구멍은 손 안 댐. 컷 `trap_fall_bright`(층8)·`trap_fall_dark`(층3) 1배율 전체에서 눈에 들어옴.
- **㉱ 컷 위생** — `md5 -q tmp/hs_v275_*.png | sort | uniq -d` **비었음**(11장 다 다른 상태).
- **⑤ 저주받은 신전 `__CURSEDSHRINE`(새 컨텐츠)** — `genFloor` 맨 끝·산술 PRNG(`cs`)·Math.random 무소비·`cursed` fp 밖·층3부터·층당 0~1. **E** 로 축복 하나 + **대가 하나**를 같이(시간제·`recalc` 끝 누수 0·층 넘으면 둘 다 끊김): 피의 계약 피해×1.8/받는 피해×1.45(`p.takenMul`·hurtPlayer 가 읽음) · 뼈 자리+8/최대체력−25% · 굶주린 드랍×2.0/소환수체력−40% · 성급한 속도×1.45/시전간격×1.35. 검붉게 갈라진 큰 기둥+붉은 균열(멀쩡한 신전과 꼴로 갈림)·미니맵/전체지도 검붉은 마름모+범례. HUD 는 ㉮ 로 축복(붉음)+대가(잿빛) 함께. 컷 `cursed_idle`·`cursed_hud`(dmgMul 1→1.8·takenMul 1→1.45·제목과 안 겹침)·`cursed_map`·`cursed_numbers`(같은 화살 hp피해 40→61 ≈×1.5). `__CURSEDSHRINE=false` → 빠짐.
- 되돌림 지문: genFloor 를 만지는 것은 `__CURSEDSHRINE` 뿐 → OFF=ON=BASE **byte-동일** F1/F3/F5/F10/F30(`tmp/_v275_fp.mjs`: 4341720539·cebe184b88·07968a97a3·e9e3aa0cbf·b2bea5b359 = V-274 기준선). 저주받은 신전/층 ON: F1=0 F3=1 F5=1 F10=1 F30=1.
- 회귀(있는 자로만): `hs_v207_walk` **벽밖 0%·오류 0** / `hs_v219_foeshot` **frame p95 1.9ms(≤16.7)·오류 0·에셋 100%·쏜화살 330**. 컷 11장 직접 열어 봄·콘솔 오류 **0**.
- **못 한 것**: 없음(㉮㉯㉰㉱⑤ 다 함). 미흡: `cursed_numbers` hp 피해비 ×1.52 로 기댓값 1.45 보다 살짝 높다(두 표본 방어·반올림 차이)·방향/크기 맞음(takenMul 1.45 는 `__pactInfo` 로 정확히 확인).

다음 후보: ① ROADMAP 맨 끝 열린 `- [ ]`. ② 신전 변주(다른 계약·연쇄 축복) / 함정 변주(화살 벽) / 정예 수식어 새 갈래 / 새 물건. ③ 감춘 방·수수께끼.

## ✔ 끝난 판: V-274 — 09:00 감시 흠 넷 + 신전(`__SHRINE`·얻는 쪽) (닫음 2026-09-03)
09:00 감시가 V-273 컷 여섯을 열어 통과 판정하고 흠 넷을 넘겼다. 만진 곳 `hs/`(main.js·map.js)·**새 자 파일 없음**(베이커 `tmp/hs_v274_cut.mjs`·`_trapfall`·`_camroom`·`_title`·지문 `tmp/_v274_fp.mjs`).
- **① `__TRAPFALL_LOOK`** — 바닥 꺼짐이 컷에서 안 보이던 것(어두운 원반)을 흙/재빛 **「금 간 사각 + 꺼진 중앙」**으로 다시 그림·발동=검은 사각 구멍+돌 테. 다른 넷 색(쇳/초록/보라/주황)과 안 겹침. 크롭 88px 변화 **11.6%**·3배 확대해 눈으로 또렷. `__TRAPFALL_LOOK=false` → 옛 원반.
- **② `__CAMROOM`(줌)** — clamp 만으론 남던 「화면 절반이 벽」을, **사람 든 방**을 화면에 채우는 줌으로 푼다(fit·상한 1.6). `const Z`→`let Z`(모든 소비처 라이브·마우스/히트박스/컬링 안 어긋남). 방 430×252 에서 Z **1.15→1.6**·walkable **24.6→43.1%**(+18.5%p)·죽은 벽 눈에 띄게 줆. `__CAMROOM=false` → Z_BASE 고정.
- **③ `__FLOORTITLE`** — 층 제목이 방 가운데(0.34H)를 덮던 것을 **화면 위(0.13H)**로(`zoneTitleY()` 한 근원). 컷 제목 y≈112px·방 물건 안 가림. `__FLOORTITLE=false` → 옛 가운데.
- **④ `__MAPOPAQUE`** — 전체지도 뒤 HUD 글자 비침(V-270 ㉱)을 판 배경 **불투명**(#050303)으로 덮음. 컷 지도 안쪽 읽히는 남의 글자 **0**. `__MAPOPAQUE=false` → 옛 반투명.
- **⑤ `__SHRINE`(새 컨텐츠)** — `grep shrine`=0, 통째로 없던 축. 방에 신전(층당 0~2·genFloor 맨 끝·산술 PRNG·fp 밖)·**E** 로 쓰면 시간제 축복 넷(피 ×1.5·뼈 자리 +5·재빠름 속도 ×1.28·탐욕 금 ×1.6/드랍 ×1.5)·`recalc` 끝에서 얹어 누수 0·층 넘으면 끊김·HUD 남은시간 띠·미니맵/전체지도 표식(청록)+범례. 절차적 그림(기둥/대야·쓰면 빛 꺼짐). 컷 idle 붉은 빛·used 꺼짐·hud 「피의 신전 45s」+피해 ×1.00→×1.50. `__SHRINE=false` → 빠짐.
- 되돌림 지문: genFloor 만지는 것은 `__SHRINE` 뿐(맨 끝·산술 PRNG·shrines 는 fp 밖) → ON=OFF=BASE **byte-동일** F1/F3/F5/F10/F30(`tmp/_v274_fp.mjs`: 4341720539·cebe184b88·07968a97a3·e9e3aa0cbf·b2bea5b359). 넷은 그리기/카메라/UI. 신전/층 ON: F1=1 F3=1 F5=2 F10=1 F30=2.
- 회귀 `hs_v207_walk` 벽밖 **0%**·오류 **0**(줌 켜고 걸어도) / `hs_v219_foeshot` frame p95 **1.9ms**·오류 **0**·에셋 **100%**·쏜화살 114. 컷 `tmp/hs_v274_{trap_fall_crop,trap_fall_off,trap_fall_sprung,cam_room_before,cam_room_after,title_fixed,map_opaque,map_legend4,shrine_idle,shrine_used,shrine_hud}.png` 직접 열어 봄·콘솔 **0**.
- **못 한 것**: 없음(①~⑤ 다 함). 미흡: ② 줌은 **사람이 방 안에 있을 때만** 켜진다(복도·맵 가장자리의 큰 방에선 Z_BASE 라 벽이 좀 남을 수 있다·설계상 fit·상한 1.6). ⑤ 축복 HUD 띠(y74)가 층 진입 직후 ~2.8s 동안 제목과 살짝 겹칠 수 있으나 제목은 곧 사라진다.

다음 후보: ① ROADMAP 맨 끝 열린 `- [ ]`. ② 함정 변주(화살 벽) / 정예 수식어 새 갈래 / 새 저주 / 새 물건. ③ 신전 변주(저주받은 신전·위험/보상).

## ✔ 끝난 판: V-273 — 08:00 감시 흠 다섯 + V-272 화면 판정 + 함정 변주(바닥 꺼짐) (닫음 2026-09-03)
08:00 감시가 V-271 컷 여덟을 열어 통과 판정하고 흠 다섯을 넘겼다. 만진 곳 `hs/`(main.js·map.js)·**새 자 파일 없음**(베이커 `tmp/hs_v273_cut.mjs`·지문 `tmp/_v273_fp.mjs`).
- **① `__MAPLEGEND3`** — 범례를 「지도에 그려지는 표식 전부」와 맞춤: **나**(흰 점·drawMapLive)·**길**(복도·__MAPPATH) 더함·한 줄 넘치면 두 줄. 컷 `map_legend3` 눈판정(1512px 엔 14항목 한 줄).
- **② `__TRAPHUE`** — 함정 결 노랑 뺌: 알람 룬 노랑→보랏빛(#a066d6/#8a54c0)·가시 검정→쇳빛(#464e58/#5a636e)·독 초록·불길 주황 유지. 낱개 알람 룬 90px 노란 화소 **310→30**(≈−90%)·룬 보라(눈판정). 제일 밝은 건 화로.
- **③ `__ITEMLABEL`** — 이름표를 아이콘 «위»로 띄우고·실측 폭 겹침 밀어내기·이름표→아이콘 실선. 컷 `item_label`(신화 다섯 뭉침) 이름표 2·겹침 **0**·둘 다 아이콘 위.
- **④ `__CAMROOM`** — 화면 절반이 방 밖 벽이던 것을 `localBounds`(walkable 덩어리 bbox) clamp 로 방을 끌어온다(「보이는 walkable 안 자름」 불변식 → void 안 늘어남). walkable **39.8%→41.1%**·방<화면이면 가운데·lerp 부드럽게.
- **⑤ V-272 화면 판정 — 통과.** rot/bone pro 타일이 결을 더하고 방 대비를 안 벌린다: rot sd **86.9→77.9**(오히려 좁힘·mean↑)·bone sd ±2. 밝기 맞출 필요 없음 → ROADMAP V-272 닫음.
- **⑥ `__TRAPFALL`** — 다섯째 갈래 `fall`: 밟으면 다음 층으로(피해 maxhp×0.06·층+1·계단 건너뜀·착지 임의 walkable)·「바닥이 꺼졌다!」·뼈창으로 미리 터뜨리면 구멍만. 기능 컷 floor **8→9**.
- 되돌림 지문: genFloor 만지는 것은 `__TRAPFALL` 뿐(traps 는 fp 밖·push 는 RNG 무소비) → ON=OFF=BASE **byte-동일** F1/F3/F5/F10/F30(`tmp/_v273_fp.mjs`: 4341720539·cebe184b88·07968a97a3·e9e3aa0cbf·b2bea5b359). 넷은 그리기/UI.
- 회귀 `hs_v207_walk` 벽밖 **0%**·오류 **0** / `hs_v219_foeshot` frame p95 **1.5ms**·오류 **0**·에셋 **100%**·쏜화살 298. 컷 `tmp/hs_v273_{map_legend3,trap_hue,item_label,cam_room_before,cam_room_after,trap_fall,floor_v272_{bone,rot}_{before,after}}.png` 직접 열어 봄·콘솔 **0**.
- **못 한 것**: 없음(①~⑥ 다 함). 미흡: ② 룬 «보라 화소 수»는 알파 블렌딩+따뜻한 바닥 때문에 픽셀 임계로 못 셌다(노란 화소 310→30 감소로 대신 잼·눈으로는 또렷). ⑥ 바닥 꺼짐 결은 은은해 컷에서 잘 안 보임(설계상 화로가 제일 밝음).

다음 후보: ① ROADMAP 맨 끝 열린 `- [ ]`. ② 함정 변주(화살 벽) / 정예 수식어 새 갈래 / 새 저주 / 새 물건. ③ 감춘 방·함정 방 수수께끼.

## ✔ 끝난 판: V-271 — 함정 방(`__TRAPROOM`) · 불길 함정(`__FLAME`) · 07:00 감시 흠 넷 (닫음 2026-09-03)
07:00 감시가 컷 여덟을 열어 V-270 을 「기능은 통과·그림이 결이 아님」으로 판정하고 흠 넷을 넘겼다. 만진 곳 `hs/`(map.js·main.js)·**새 자 파일 없음**(일회용 베이커 `tmp/hs_v271_cut.mjs`·지문 `tmp/_v271_fp.mjs`).
- **① 함정 방 `__TRAPROOM`**(기본 켬) — `genFloor` **맨 끝**(`__TRAP` 바로 뒤) 블록. **`__TRAP`처럼 층 번호로 씨앗 잡는 산술 PRNG(`ts`/`tr`)만 굴리고 Math.random 은 한 톨도 안 쓴다.** `traps` 는 지문 밖·**후한 상자는 `chests` 에 안 넣고 `traproom.chest` 에 담아 런타임(`start`)이 `G.chests` 로 얹는다** → 켜도 꺼도 지문 byte-동일. 층3부터 확률(35%+층×2%p·70% 상한)로 방 하나(시작·계단(far)·제단/사건·상자 낀 방·감춘 방 제외·넓이 ≥260×220)를 골라 `rm.trapRoom=true`, 함정을 밀도 높게(6~10·상자 둘레 70·서로 60) 깔고(`room:true`) 가운데에 **층+6 후한 상자**(`openChest` 새 `traproom` 갈래·rollItem 층+6·정예 유니크 40%). **문턱에서 보이게** `drawTraps` 의 결 반경을 이 방 함정만 `TRAP_REVEAL_R×1.7`(510)로 넓힘. 미니맵·전체지도 표식 `traproom`(붉은 마름모+금 속)+범례(층에 있을 때만).
- **② 불길 `__FLAME`**(기본 켬·네 번째 갈래) — `KINDS`/`TKINDS` 에 `flame` 추가(`__FLAME=false` 면 빠짐·`traps` 지문 밖이라 무관). `stepTraps(dt)` 가 사람이 밟으면 `t.armed` 로 잡고 **6초 주기**(`FLAME_CYCLE`)로 `emitFlame` — 그 자리에 hazard(warn 0.5 예고→life 1.2 발동·dmg `10+층×2`·gas 와 같은 `dotPlayer` 규격·r 56). **예고 동안 비키면 안 맞는다.** 소환수·적은 사람 좌표만 재므로 안 밟고, 뼈창(`hitTrap`→`springTrap` flame 갈래)이 미리 `t.disarmed`. 실측 층8 서 있으면 hp **3261→2966**·예고 warn 0.28·발동 life 1.08.
- **③ 07:00 컷 흠 넷**:
  - **㉮ `__AURAFIX`** — 발밑 초록 빛무리가 「두 판 연속 0픽셀」이던 진짜 까닭은 **값이 아니라 좌표**였다. `drawSetAura` 가 그라디언트를 `translate(p.x,p.y)` **앞** 좌표로 잡고 `arc` 는 **뒤** local(0,0)에 그려 둘이 수백 px 어긋나 arc 가 투명 꼬리만 샘플했다(「조용히 버리는 코드」 [[knob-that-does-nothing]]). 그라디언트를 지금 좌표계(local 0,0)로 옮겨 맞추고, 어깨 룬 셋은 sprite **뒤**(위·`drawSetRunes`)에 그려 몸에 안 가려 셋 다 뜨게. **실측 초록 화소 100→1429**.
  - **㉯㉰ `__TRAPART`** — 함정 바닥 결(`drawTrapMarkPixel`)·발동 장판(`drawHazardPixel`)을 **도트 결**로 다시 그림(안티에일리어스 끔·정수 격자 3~4px 사각·격자 해시 디더·반경별 링). 독은 **어둡고 탁한 초록**(화면 제일 밝은 건 화로)·발동 독구름 r **116→64**·불길 r 56·**walkable 밖 화소는 안 그림**(벽 밖으로 안 샘). 불길 예고는 도트 링. 옛(벡터) 판은 `drawTrapMarkVector`·radial 로 `__TRAPART=false` 되돌림.
  - **㉱ `__TITLEFIX2`** — `titleHidden()` 이 UI 창(`anyModalOpen`)에 **전체지도(`bigOpen`)**를 더해 Tab 겹판 뒤로 층 제목이 안 비침. 덤: 미니맵/전체지도 **상인 색 청록(#48c8b4)→하늘빛(#3f86e0)**(치운 방 초록과 안 헷갈리게).
- **되돌림 실측(genFloor 지문)**: `__TRAPROOM=false __FLAME=false` → **F1/F3/F5/F10/F30 byte-동일**(`tmp/_v271_fp.mjs`: 4341720539·cebe184b88·07968a97a3·e9e3aa0cbf·b2bea5b359 = V-270/V-269 기준선). 산술 PRNG 라 **ON=OFF** 도 동일. ㉮㉯㉰㉱ 는 그리기/UI 라 지문 무관.
- **회귀(있는 자로만)**: `hs_v207_walk` **벽밖 0%·오류 0**(WAKE 3000·820) · `hs_v219_foeshot` **frame p95 1.2ms(≤16.7)·오류 0·에셋 100%·쏜화살 448**.
- **컷 직접 열어 봄**(1512×863·씨앗1337·모달 먼저 닫음): `tmp/hs_v271_{traproom_door,traproom_in,traproom_chest,flame_warn,flame_burst,trapart,aura_fix,map_title}.png`. traproom_door=문턱에서 방 함정 8 보임 · traproom_in=밀도 · traproom_chest=닫힌 후한 상자 · flame_warn=주황 도트 예고 링 · flame_burst=도트 불길+hp 3261→2966 · trapart=가시/독/경보/불길 도트 결(독 탁한 초록) · aura_fix=발밑 초록 빛무리+어깨 룬 셋(초록 화소 1429) · map_title=제목 안 비침+범례에 함정 방·상인 하늘빛. 콘솔 오류 0. 컷 베이커 실제 문 `window.__traproomInfo·__toTrapRoom·__springTrap·__giveSet`(자 아님).
다음 후보: ① ROADMAP 맨 끝 열린 `- [ ]`. ② 함정 변주(바닥 꺼짐·화살 벽) / 정예 수식어 새 갈래 / 새 저주 / 새 물건. ③ 감춘 방·함정 방 수수께끼.

## ✔ 끝난 판: V-270 — 바닥 함정(`__TRAP`) · 05:30 감시 흠 넷 (닫음 2026-09-03)
05:30 감시가 컷을 열어 보니 층에 **「밟으면 다치는 것」이 없었다**(`grep -rn "함정\|trap" hs/*.js` = 적 우리·보물방 함정뿐·바닥 함정 0). 빈 방을 지나는 동안 긴장이 0 이었다. 만진 곳 `hs/`(map.js·main.js)·**새 자 파일 없음**(일회용 베이커 `tmp/hs_v270_cut.mjs`·지문 `tmp/_v270_fp.mjs`).
- **① 바닥 함정 `__TRAP`**(기본 켬) — `genFloor` **맨 끝**(secret 뒤) 블록. **`__FLOORMIX`처럼 층 번호로 씨앗 잡는 산술 PRNG(`ur`)만 굴리고 Math.random 은 한 톨도 안 쓴다** → 켜도 꺼도 앞선 굴림 그대로 = 지문 byte-동일. 층 비례 개수 **`min(6, max(1, floor(층/2)+{0,1}))`**(1층 ~1개·상한 6). **계단(반경210)·시작 자리(220)·제단/상인(150)** 반경엔 안 놓는다(들어서자마자 밟는 사고 방지)·서로 92px 이상. 갈래 셋(런타임 `springTrap`):
  · **가시(spike)** — 밟으면 즉발 피해 **최대체력×(0.09+층×0.007)·28% 상한**(실측 층8 = **481·14.5%**·FOE_DMG_MUL 안 거침) + **0.32s 경직**(`p.stun` — stepPlayer 가 이동을 막음). 발동하면 쇠가시가 솟은 채 남는다.
  · **독구름(gas)** — 밟으면 그 자리에 **독 장판**(`G.hazards`·기존 `stepHazards` 재사용) 4.2s. dmg 는 **flat `8+층×2` 기본**(dotPlayer 가 FOE_DMG_MUL 을 곱하는 규격 — 독 장판과 같은 결·실측 층8 서 있으면 ~360/s). 비켜서면 적게 맞는다.
  · **경보(alarm)** — 피해 없음. 밟으면 그 자리에 적 한 무리(**`3+min(4,층/4)` 해골**·`spawnAdd` 재사용)가 awake 로 깨어난다.
- **밟는 규칙**: 사람 좌표만 잰다 → **소환수·적은 함정을 안 밟는다**(실측 소환수를 spike 위에 둬도 sprung=false). **뼈창으로 미리 터뜨릴 수 있다**(`hitTrap`·spear 가 함정 위 `r+22`px 지나면 `springTrap(remote)` — 어깨 높이(p.y-34) 발사 여유·실측 사람 hp 불변·sprung=true). **보이게 하는 손**: 밟기 전에도 바닥에 결(가시=판 이음매+구멍 점 넷·독=녹빛 얼룩+김·경보=팽팽한 줄+바닥 룬)이 **빛 반경 300 안에서만** 뜬다(`drawTraps`·`drawSecretWall` 결). **감춘 방(V-269) 안에도 하나** — 「후한 상자에는 값이 붙는다」(부수기 전엔 못 밟는다).
- **② 05:30 컷 흠 넷**: **㉠**(`bannerBandY`·`drawZoneTitle`/`drawItems`) 큰 층 제목 띠(가운데 세로 띠) 안의 바닥 이름표를 감춰 겹침 제거 + UI 창 열리면 제목을 안 그림(창 뒤 겹침·`anyModalOpen`·`__TITLEFIX`). **㉡**(`drawItems`) 아이콘 둘레(위·아래)가 벽이면(`!walkable`) 아이콘 뒤에 **어두운 판 한 겹** → 벽 띠에 걸쳐도 읽힘. **㉢**(`drawSetAura`) 세트 발밑 초록 빛무리 알파 바닥 **0.5→0.82**·중간 스톱 **2a→52**·반경 **48→56**(노란 고리 밖까지)·룬을 **머리옆→어깨(0.62→0.40)**·컷은 맥박 최대(`__AURAMAX`). **㉣**(`drawBigLegend`·`__MAPLEGEND2`) 전체지도 범례에 **안 치운 방(올리브)·치운 방(초록)·적(빨간 점)** 추가 → 「범례 = 지도에 있는 전부」.
- **되돌림 실측(genFloor 지문)**: `__TRAP=false` → **F1/F3/F5/F10/F30 byte-동일**(`tmp/_v270_fp.mjs`: 4341720539·cebe184b88·07968a97a3·e9e3aa0cbf·b2bea5b359 = V-269 기준선). 산술 PRNG 라 **ON=OFF** 도 동일. ㉠~㉣ 는 그리기/UI 라 지문 무관.
- **회귀(있는 자로만)**: `hs_v207_walk` **벽밖 0%·오류 0**(WAKE 3000·820) · `hs_v219_foeshot`(25초×씨앗1/2/3) **frame p95 1.7ms(≤16.7)·오류 0·에셋 100%·쏜화살 254·밝기 통과**.
- **기능 실측**(일회용 조각·자 아님): spike sprung+hp 3315→2834(−481)+stun · gas hazard(trap)+hp 도트 · alarm 팩 awake 5마리 · 소환수 위 sprung=false · 뼈창 remote sprung=true·사람 hp 불변. 콘솔 오류 0.
- **컷 직접 열어 봄**(1512×863·씨앗1337·모달 먼저 닫음): `tmp/hs_v270_{trap_idle,trap_spike,trap_gas,trap_alarm,title_fix,floor_edge,setaura_fix,map_legend}.png`. trap_idle=세 갈래 바닥 결 · trap_spike=쇠가시 솟음+hp 하강 · trap_gas=초록 장판 · trap_alarm=무리 깨어남+「경보가 울렸다!」 · title_fix=제목 깨끗(띠 안 이름표 수=0) · floor_edge=벽 띠 물건이 어두운 판 위에 읽힘 · setaura_fix=발밑 초록 빛무리+어깨 룬 셋 · map_legend=범례에 방/적 색칠 들어감. 콘솔 오류 0. 컷 베이커 실제 문 `window.__trapInfo·__toTrap·__springTrap`(자 아님).
다음 후보: ① ROADMAP 맨 끝 열린 `- [ ]`(「게임 안에 새로 생기는 것」 우선). ② 함정 변주(불길·바닥 꺼짐·화살 벽) / 정예 수식어 새 갈래 / 새 저주 / 새 물건. ③ 감춘 방·함정 방 수수께끼.

## ✔ 끝난 판: V-269 — 감춘 방(`__SECRET`) · 04:30 감시 흠 넷 (닫음 2026-09-03)
04:30 감시가 컷을 열어 보니 층에 **「내가 찾아낼 것」이 없었다**(`grep -rn "비밀\|secret" hs/*.js`=0). 방은 다 지도에 그려져 걷다 발견하는 게 없었다. 만진 곳 `hs/`(map.js·main.js·hud 무접촉)·**새 자 파일 없음**(일회용 베이커 `tmp/hs_v269_cut.mjs`·지문 `tmp/_v269_fp.mjs`).
- **① 감춘 방 `__SECRET`**(기본 켬) — `genFloor` **맨 끝** 블록: 층 비례 확률(기본 45%+층×2%p·80% 상한)로 「갈라진 벽」 하나 뒤에 **지도에 안 그려지는 방**을 둔다. host 방 벽 밖 void 에 방(340×300)+목(neck)+벽(straddle)을 놓고 **rooms/corridors/chests/packs 엔 안 넣는다**(secret 에 담기만). **찾는 손**: 갈라진 벽은 반경 340 안에서만 결이 뜬다(둘레보다 밝은 돌+큰 균열+곁 균열+먼지·`drawSecretWall`). **여는 손**: 뼈창으로 때리면(hp 4·`hitSecretWall`) 무너지고 `breakSecret` 이 방·목을 G.rooms/G.corridors 에 얹어(그제야 inFree/지도) 상자(레어도 층+8 후하게)+금(+층10↑ **정예 하나 잠**)이 드러난다. ★ 뼈창은 12px/프레임이라 프레임머리 검사만으론 새서 **지형 벽 죽는 자리도 hitSecretWall 로 재검**(functional 검증 hp추이 [4,4,0]→broken). 되돌림 `__SECRET=false` → 블록 short-circuit(RNG 무소비).
- **② 04:30 컷 흠 넷**: **㉠**(`drawItems`) 바닥 아이콘 20→**28px**(이름표 글자 ~2배)+바닥 그림자 한 겹(`__FLOORICONBIG`). **㉡**(`floorLabel` 한 근원) 죽음/HUD/상점의 「B7층」/「지하 8층」 표기를 **「지하 N층」**으로 통일(`__FLOORLABEL`). **㉢**(`iconBase(it,border)`) 가방·장비줄·상점·툴팁 아이콘의 제 레어도 테를 뺀다(칸이 테를 가짐 → 「액자 속 액자」 없앰·작은 칸도 같은 결·`__BAGONEFRAME`)·바닥 캔버스만 테 남김. **㉣**(`drawSetAura`) 세트 발밑 오라를 «선(반경26)»에서 **«채운 빛무리»(반경48 방사)**로 — 노란 선택 고리(반경36)와 안 겹침·어깨 룬 셋을 점→**마름모**로 키움(`__SETLOOK`).
- **되돌림 실측(genFloor 지문)**: `__SECRET=false` → **F1/F3/F5/F10/F30 byte-동일**(`tmp/_v269_fp.mjs`: 4341720539·cebe184b88·07968a97a3·e9e3aa0cbf·b2bea5b359 = V-268 기준선). ON 도 secret 은 fp 필드 밖·굴림이 맨 끝이라 ON=OFF. ㉠~㉣ 는 그리기/UI 라 지문 무관.
- **회귀(있는 자로만)**: `hs_v207_walk` **벽밖 0%·오류 0**(WAKE 3000·820) · `hs_v219_foeshot` **frame p95 1.3ms(≤16.7)·오류 0·에셋 100%·쏜화살 372**.
- **컷 직접 열어 봄**(1512×863·씨앗1337): `tmp/hs_v269_{secret_hint,secret_open,secret_map,floor_icon,died_floor,bag_frame,setlook_fix}.png`. secret_hint=사람 곁 갈라진 벽(밝은 돌+균열) · secret_open=무너진 뒤 방+닫힌 상자+금+정예(「사나운 뼈술사 약탈자」) · secret_map=전체지도에 그 방(상자 노랑·정예 붉음) 뜸 · floor_icon=커진 부위 아이콘 · died_floor=「지하 7층」 · bag_frame=테 한 겹 통일 · setlook_fix=노란 고리+초록 빛무리(안 겹침)+마름모 룬 셋. 콘솔 오류 0. 컷 베이커 실제 문 `window.__secretInfo·__breakSecret·__toSecret`(자 아님).
다음 후보: ① ROADMAP 맨 끝 열린 `- [ ]`(「게임 안에 새로 생기는 것」 우선). ② 정예 수식어 새 갈래 / 새 저주 / 새 물건. ③ 감춘 방 변주(함정 방·수수께끼).

## ✔ 끝난 판: V-267 — 세트 장비(짝을 맞추면 판이 달라진다) · 03:00 감시 흠 셋 (닫음 2026-09-03)
`grep -c "세트|SET_|setBonus" hs/loot.js hs/main.js` = **0·0** 이라 통째로 없던 축. D2 의 「또 돌 이유」 절반(유니크=한 방 뽑기 / 세트=여러 판에 걸쳐 짝 모으기). 만진 곳 `hs/`(loot.js·main.js·hud.css)·**새 자 파일 없음**(일회용 베이커 `tmp/hs_v267_cut.mjs`·`tmp/hs_v267_corpse2.mjs`·지문 `tmp/_v267_fp.mjs`). map.js 무접촉.
- **① 세트 장비 `__SETGEAR`**(기본 켬) — loot.js 에 **세 셋 각 3점**(서로 다른 부위): 뼈수확자의 예장(무기·투구·갑옷=군세) · 역병 사제의 유물(부적·반지·장갑=시체 폭발) · 무덤지기의 굴레(신발·투구·부적=생존). `rollItem` 맨 앞에서 층 비례 확률(기본 4.5%+층×0.6%p·10% 상한)로 굴림 — 유니크(가중 2·넷 소진)보다 잦게(실측 층10 **9.97%**·세 셋 고름). **짝 보너스는 `setBonuses()` 가 recalc 끝에서 얹어 누수 0**(V-239 배수 자리): 2점=작은 것(자리+2 / 폭발범위+25% / 생명+15%) · **3점=규칙**(옛 유니크 키를 p.uniques 에 더해 검증된 경로로: twinRaise / doubleNova / bloodCast)+수치. **세트색(초록 `#4fe06a`) 툴팁**(tooltipHTML 한 근원): 세트 3점 다 적고 **가진 것 ◆밝게·없는 것 ◇어둡게**, 맨 밑 (2점)/(3점) 보너스는 켜진 것만 밝게. 이름·바닥 이름표·가방·장비줄·상점 다 `it.rarity.color`(초록) 한 근원. 되돌림 `__SETGEAR=false` → `rollItem` 이 세트를 안 굴리고(RNG 무소비 short-circuit) `setBonuses` 도 통째로 건너뜀(옛 판).
- **② 03:00 감시 흠 셋**: **㉠**(map.js `renderMapStatic`) 지도에서만 복도를 **더 어둡게**(가 본 복도 84,68,42→52,42,26)+**가늘게**(가로/세로 얇은 쪽 50% 인셋) → 방=밝은 블록·길=어두운 가는 선으로 갈림(컷 `map_on`). **㉡**(`drawMyCorpse`) 내 시체에 **바닥 그림자 한 겹**(drawCorpse 와 같은 결)+**푸른빛을 납작한 타원**으로 눕힘(둥근 원이 UI 아이콘처럼 뜨던 것) → 「바닥에 놓인 것」(컷 `corpse`). **㉢** `josa()` 도우미(받침·숫자 읽는 소리로 가름) → 「금 1.5천 을」→「금 380을」(죽음 판·보석 박기 둘 다).
- **되돌림 실측(genFloor 지문)**: 세트는 런타임 드랍(loot.js rollItem)·그리기라 genFloor(map.js·loot 에서 bossKindFor 만 씀) 무접촉 → `__SETGEAR=false` **F1/F3/F5/F10/F30 byte-동일**(`tmp/_v267_fp.mjs`: 4341720539·cebe184b88·07968a97a3·e9e3aa0cbf·b2bea5b359 = V-266 기준선 그대로).
- **회귀(있는 자로만)**: `hs_v207_walk` **벽밖 0%·오류 0**(WAKE 3000·820) · `hs_v219_foeshot` **frame p95 1.2ms(≤16.7)·오류 0·에셋 100%·쏜화살 351**.
- **컷 직접 열어 봄**(1512×863·씨앗1337): `tmp/hs_v267_{set_drop,set_tip2,set_tip3,set_bonus,map_on,corpse,death}.png`. set_tip2=2/3(◆낌 둘·◇빈 하나·2점 밝고 3점 어둡)·set_tip3=3/3(다 ◆·2·3점 다 밝음·twinRaise 붙음·minionMul 1.72) / set_bonus=장비줄·가방 초록 / map_on=방 블록·복도 가는 선 / corpse=바닥 그림자+눕힌 푸른빛 / death=「금 380을 …」. 콘솔 오류 0. 컷 베이커 실제 문 `window.__giveSet`·`__setItem`·`__dropSet`·`__openInv`(자 아님 — 있는 `__giveMythic` 패턴).

## ✔ 끝난 판: V-266 — 죽음에 값을 매긴다 · 시체 회수 (닫음 2026-09-03)
V-250(15:03 착수·15:15 중단)이 열었던 축을 이어받아 끝냈다. 만진 곳 `hs/`(main.js·index.html·hud.css)·**새 자 파일 없음**(일회용 베이커 `tmp/hs_v266_cut.mjs`·지문 `tmp/_v266_fp.mjs`). 죽음/회수는 다 런타임(die·step·draw)이라 `genFloor`(map.js) 무접촉.
- **① 죽음의 값 `__DEATHCOST`**(기본 켬) — 죽으면 판이 안 끝난다. `reviveToTown` 이 `carryState`(minions 비움)로 마을을 열고 hp/마나 가득 채움 · 계단은 `returnFloor`(=deepest) 그대로. **잃는 것 둘**: 낀 장비 전부(`p.equipped` 비움 · 가방 `p.bag` 불변) + 소지 금 25%(`Math.floor`). 죽음 판(`#dead`)을 갈아엎어 두 갈래(「**Space/R 부활한다(마을)**」/「**Shift+R 처음부터(1층)**」)와 **잃은 것을 수로**(「장비 7점 · 금 1.5천 을 B7층에 두고 왔다」) 보여 준다. 되돌림 `__DEATHCOST=false` → 옛 판(dstat·dhint 옛 글·R 하나로 `start(1,null)`).
- **② 시체 회수 `__CORPSERUN`**(기본 켬) — 죽은 층·좌표·장비·금을 `G.corpse` 에 담아 `carryState`/`fresh` 로 층·마을 넘어 지님. 그 층에 내려가면 바닥에 **내 시체(drawCorpseBody + 푸른 후광·테)**. 닿으면(반경 60·`stepCorpseRun`) 장비·금 전액 복구 + `floatNote("모든 것을 되찾았다")`. **시체는 하나뿐** — 되찾기 전에 또 죽으면 앞 시체는 사라지고 새 것이 그 자리를, 이때 「B7층의 시체를 잃었다」를 붉게. 층 씨앗은 고정 못 해(귀환 시 층 재생성) **좌표를 걸을 수 있는 자리로 스냅**(`snapCorpse`: 저장 좌표 둘레 40~420 링 → 계단 곁 · 사람 발치엔 안 둠 → 부활 즉시 회수 방지). **표식**: 미니맵·전체지도 `mapIcon` 에 **✖ 푸른색** 하나(한 근원)+범례+HUD 한 줄(「✖ 시체: B7층」).
- **③ 복도 대비(V-265 감시 흠)** — `__MAPPATH` 안에서 복도 칠을 방보다 한 단계 어둡게(가 본 복도 `rgba(84,68,42)` vs 방 `rgba(170,136,80)` · 안 가 본 복도 더 어둡게). 방=밝은 칸·길=어두운 선으로 갈림(컷 `map_on` 방 밝고 복도 어두운 선 / `map_off` 복도 안 그려 방이 허공).
- **되돌림 실측(genFloor 지문)**: `__DEATHCOST=false __CORPSERUN=false` → **F1/F3/F5/F10/F30 byte-동일**(`tmp/_v266_fp.mjs`: 4341720539·cebe184b88·07968a97a3·e9e3aa0cbf·b2bea5b359 ON=OFF).
- **회귀(있는 자로만)**: `hs_v207_walk` **벽밖 0%·오류 0**(WAKE 3000·820) · `hs_v219_foeshot` **frame p95 1.2ms(≤16.7)·오류 0·에셋 100%·쏜화살 392**.
- **컷 직접 열어 봄**(1512×863·씨앗1337): `tmp/hs_v266_{death,naked,corpse,corpse_map,recover,lost,map_on,map_off}.png`. death=두 갈래+잃은 수 / naked=마을·장비 빈 칸·피해 ×1.11→×1.00 / corpse=푸른 후광 시체+미니맵 ✖(dist 220>60) / recover=장비 7 복구·피해 ×1.11·「모든 것을 되찾았다」 / lost=붉은 「B7층의 시체를 잃었다」 / map=복도 어두운 선. 콘솔 오류 0. 베이커 컷용 실제 문 `window.__die`·`__reviveTown`·`__returnFloor`·`__corpseInfo`(자 아님 — 있는 window.__ 패턴).

## ✔ 끝난 판: V-265 — 지도에 «길»을 그린다 · 전체지도 대비 · 발사체 벽밖 0% (닫음 2026-09-03)
그리기·이동 판정 전용. 만진 곳 `hs/main.js` **하나**(map.js 무접촉)·새 자 파일 없음(일회용 `tmp/hs_v265_cut.mjs`·`tmp/_v265_shot.mjs`·`tmp/_v265_fp.mjs`). +44/−9 줄.
- **① 지도에 «길» `__MAPPATH`**(미니맵·전체지도 «한 근원» `renderMapStatic`) — 방보다 **한 켜 아래**에 `G.corridors`(V-263 짧은 목 포함)를 먼저 깐다. **가 본 복도만 밝게**(`markVisited` 가 방과 같이 `c.visited` 를 켬 · 복도 새로 밝아질 때 `bigDirty`). 미니맵에서도 읽히게 폭 최소 1px. 옛 판(`off`)은 방이 허공에 떠 계단까지 길이 안 읽혔다(컷 `path_off`·`mini_off` 로 확인) → `on` 은 방이 선으로 이어져 계단까지 읽힌다.
- **② 전체지도 대비 `__BIGMAPDIM`**(`big` 인자로 갈라 미니맵은 안 건드림) — 겹판 뒤판 `0.82→0.95` 로 어둡게 · 방/복도/글씨 대비 올림 · `ZONE_MINI` wash 는 전체지도에서 알파 0.45×. 층 10(`path_deep`)에서 뒤 게임화면 비침이 사라지고 방 경계가 또렷.
- **③ 발사체 벽밖 0% `__SHOTWALL`**(ROADMAP **V-224** 닫음) — 자로 갈라 보니 «지형 벽»은 이미 0% 였고(V-206 끝점 검사가 막음) V-222 의 5~8.6% 은 **발사체가 소품/상자/제단 위를 지나던 것**이었다. 발사체 벽 검사를 **몸과 같은 근원 `walkable`(=inFree && !blockedByProp)** 로 바꾸고 이동을 `PROJ_STEP` 조각으로 쪼개 터널링도 막음(뼈벽 넘김 불변).
- **되돌림 실측(genFloor 지문)**: 셋 다 그리기/이동이라 genFloor 무접촉 → `__MAPPATH·__BIGMAPDIM·__SHOTWALL` ON=OFF **byte-동일 F1/F3/F5/F10/F30**(`tmp/_v265_fp.mjs`).
- **회귀(있는 자로만)**: `hs_v207_walk` **벽밖 0%·오류 0** · `hs_v219_foeshot` **frame p95 1.7ms(≤16.7)·오류 0·에셋 100%·쏜화살 279·맞힘 29**(hurtPlayer 불변). ③ 실측(`_v265_shot.mjs` 씨앗1~4×층3/10): 발사체벽밖 **2.55%(최악 6.81%)→0.00%**·지형 0.00%.
- **컷 직접 열어 봄**(1512×863·씨앗1337): `tmp/hs_v265_{path_on,path_off,path_deep,mini_on,mini_off,shot}.png`. 모달은 베이커가 먼저 닫음(`DISMISS`). 콘솔 오류 0. `__MAPPATH=false __BIGMAPDIM=false __SHOTWALL=false` → 옛 판.

## ✔ 끝난 판: V-264 — 지도를 «한눈에» · 마지막 색 튐 둘 (닫음 2026-09-03)
그리기·UI 전용 세 손잡이. 만진 곳 `hs/`(main.js·index.html·hud.css)·새 자 파일 없음(일회용 `tmp/hs_v264_cut.mjs`·`tmp/_v264_fp.mjs`·`tmp/_v264_fp95.mjs`). 착수 커밋 **9ddef2e**(NOW.md 뿐 — 앞 워커가 코드 무접촉 no-op 로 끝냄 · 이번 판이 셋 다 구현).
- **① 전체 지도 `__BIGMAP`**(키 Tab, 다시 눌러/ESC 닫음·게임 안 멈춤) — `#bigmap` 반투명 겹판. 미니맵과 **한 근원**(`renderMapStatic`/`drawMapLive` 를 미니맵·전체지도가 같이 부름 · 배율(sx,sy)·자리(ox,oy)만 다름 — 코드 복사 없음). 정적층(방·표식·범례·제목)은 캐시에 굽고 **층이 바뀌거나 새 방을 밟을 때만** 다시 굽는다(`bigDirty`·`markVisited`) · 매 프레임은 캐시 위에 사람·적만. `CONTROLS` 한 근원에 Tab 추가(힌트·H 판 자동).
- **② 표식을 꼴로 가름 `__MAPICONS`**(미니맵·전체지도 공통 `mapIcon`) — 계단 ▼흰 · 보물방 ◆금 · 소굴 ▲붉 · 저주제단 ✚보라 · 뼈제단 ✚상아 · 그밖 제단 ✚흐린금 · 상인 ■청록 · **보통 상자는 작은 점**(사건방보다 낮게). 옛 판은 상자·보물방이 **같은 노랑 마름모**라 안 갈렸다(컷 `icons_off` 로 확인) → `icons_on` 은 상자가 점·제단이 ✚·계단이 ▼ 로 갈림. 전체지도 밑 **범례 한 줄**. `__MAPICONS=false` → 옛 마름모/원.
- **③ 남은 색 튐 둘 `__MOBTINT2`**(`MOB_TINT2`·되돌림=V-262 `MOB_TINT`) — 컷 `tint_off/on` 을 5갈래 한 줄(사수·돌진꾼·자폭병·시체도둑·망령)로 나란히 봄: ⓐ **자폭병(bomb)이 라임 → 썩은 올리브**(hue 38→20·채도 1.15→0.92·밝기 1.12 지킴). ⓑ **시체도둑(thief) 자주 로브 채도 0.72→0.6**·대비 올려 잿빛 보라. 다섯 갈래 **여전히 갈림**(뭉치지 않음)·0 오류.
- **되돌림 실측(genFloor 지문)**: 셋 다 main.js 그리기라 genFloor 무접촉 → `__BIGMAP·__MAPICONS·__MOBTINT2` ON=OFF **byte-동일 F1/F4/F5/F10/F30**(`tmp/_v264_fp.mjs`).
- **회귀(있는 자로만)**: `hs_v207_walk` **벽밖 0%·오류 0**(WAKE 3000·820) · `hs_v219_foeshot` **frame p95 1.2ms(≤16.7)·오류 0·에셋 100%·쏜화살 214**. **지도 연 채로도** frame p95 **1.8ms**(≤16.7·`tmp/_v264_fp95.mjs`·층10·닫힘 2.3ms 보다 안 무거움 — 캐시가 먹힘).
- **컷 직접 열어 봄**(1512×863·씨앗1337): `tmp/hs_v264_{bigmap(층3),bigmap_deep(층10),icons_{on,off},tint_{on,off}}.png`. 모달(「돌아왔다」)은 베이커가 먼저 닫음(`DISMISS`). 콘솔 오류 0. `__BIGMAP=false __MAPICONS=false __MOBTINT2=false` → 옛 판과 눈으로 같음.

## ✔ 끝난 판: V-263 — D2 문법 마지막 하나: 방을 붙이고 복도를 짧게 (`__ROOMSTIGHT`, 닫음 2026-09-03)
`docs/D2_DUNGEON.md` 다섯 중 마지막(⑤ 복도를 짧게·방을 붙여서). V-262 ②가 넘긴 것. 만진 곳 `hs/map.js` **하나**·새 자 파일 없음(한 번 쓰는 조각 `tmp/_v263_fp.mjs`·`tmp/_v263_meas.mjs`·베이커 `tmp/hs_v263_cut.mjs`). 구현 커밋은 아래 git log(착수 **6d7c3f4**).
- **BSP 잎에 `pull`(형제 경계 쪽) 태그** — `bspSplit` 이 자식 칸에 분할축 쪽 방향을 심고(v: 왼쪽 +x·오른쪽 −x / h: 위 +y·아래 −y), 방을 뽑을 때 그 벽에 붙인다(옛 무작위 자리 대신). 형제 둘이 경계로 당겨져 사이 복도가 짧은 목이 된다.
- **마주 보고 가까운 두 방은 복도 대신 «짧은 목(문)»으로 직결** — `connect` 가 잇기 전에 `tryDoor`: 두 방의 마주 보는 면이 겹치고(≥cw+8) 사이 빈틈 ≤`LEAF_PAD·2+40` 이면 겹치는 구간 가운데에 폭 cw 목 하나만 뚫는다(방을 뭉개지 않음). `hitsOther` 로 **제3의 방에 닿으면 안 뚫고** 옛 복도로 물러난다 → ㄱ자 곁방.
- ③ 방 크기 편차는 이미 `ZONE_ROOM` 이 가르므로 손대지 않음(브리프대로 ①② 만).
- **재는 수(8씨앗×층1/3/5/10/30, ON/OFF 나란히)**: 복도 총 길이 **−29~36%**(≥20% 목표 넘음) · 맞닿은 방 쌍 **0.0~3.0 → 6.6~38.1**(0→여럿) · 방 넓이 합 **ON=OFF**(방 안 뭉개짐 없음). **관통 0 · 도달 100%**(모든 씨앗·층). `minW` ON 여전히 **≥126**(문 목이 __CORRWIDE 안 깸).
- **되돌림 실측: `__ROOMSTIGHT=false` → genFloor 지문 F1 `7091eb7e98`·F3 `56792354a2`·F5 `3eef65dfdc`·F10 `bfa3e79029`·F30 `6d5009640f` = 착수 전 기준선과 byte-동일** ✔(두 Math.random 오프셋은 tight 여부와 무관하게 늘 소비·`connect`/`tryDoor` 는 RNG 무소비). ON 은 방·팩 좌표가 옮겨져 지문이 다른 게 당연(세계 데이터 변경).
- 회귀(있는 자로만): `hs_v207_walk` **벽밖 0%**·오류 **0**(WAKE 3000·820·fp95 50.1ms 옛값) · `hs_v219_foeshot` frame p95 **1.2ms**(≤16.7)·오류 **0**·에셋 100%·쏜화살 160.
- 컷 **직접 열어 봄**(1512×863·씨앗1337·층3): `tmp/hs_v263_{layout,corridor,minimap}_{on,off}.png`. `minimap` OFF=방이 떨어져 긴 파란 복도로 이어짐 / ON=방이 당겨져 붙고 초록 짧은 목(문)으로 직결(D2 곁방). `corridor` ON=두 방이 문 하나 사이로 맞닿음. 콘솔 오류 0.

## ✔ 끝난 판: V-262 — D2 문법: 적 색조를 크립트 결로 · 벽에 아치 (③① 닫음 2026-09-02 · ② 넘김)
`docs/ref/d2_catacombs.png` 나머지 둘 + V-261 컷이 드러낸 무지개. 만진 곳 `hs/main.js` **하나**·새 자 파일 없음(베이커 `tmp/hs_v262_cut.mjs`). 구현 커밋 **2527ad0**.
③ **적 색조 크립트 결로(`__MOBTINT`)** — 옛 `MOB_TINT` 채도 2.2~2.7 이 초록·노랑·분홍·파랑 사탕 상자였다. 팔레트를 뼈빛·재빛·핏빛·썩은 황록으로 좁히고 채도 **0.7~1.25**(밝기 ≥1.06 지켜 어둠에 안 먹힘). `BOSS_TINT` 넷째 **마젠타→강철 재보라**(V-167 이 「자주는 크립트 색 아니다」라 한 것이 또 나왔었다). `ELITE_TINT` 2.3→1.55. 갈래(돌진·폭탄·궁수)는 실루엣·크기·표식으로 이미 갈리니 색은 거들기만. 되돌림 `__MOBTINT=false`(보스는 `BOSS_TINT_OLD`).
① **북벽 아치 벽감(`__WALLARCH`)+벽 횃불** — 민 벽돌 한 겹이 「창고」였다. `wallArches` 가 북벽(WTOP30)에 반원 벽감을 연속으로 판다(안쪽 그늘=깊이·밝은 테=두께), 한 칸 건너 기둥에 `wallTorch`(자루+후광+불꽃). `northWall` 뒤·복도 뚫기 전에 그린다. 되돌림 `__WALLARCH=false`.
② **방 붙이기 — 안 함(넘김).** 브리프의 「못 하면 ①③ 을 확실히」를 따랐다. 다음 판 후보.
- ③① 은 draw-only(filter·canvas path) → **genFloor 지문 무관**(② 를 안 했으니 지문 검사 불필요).
- 회귀(있는 자로만): `hs_v207_walk` 벽밖 **0%**·오류 **0**(WAKE3000·820) · `hs_v219_foeshot` frame p95 **2.3ms**(≤16.7)·오류 **0**. ★ ㉢「에셋 0/0」미달은 내 회귀 아님(V-261 과 같은 결·자의 화살 표본이 이 환경에서 빔).
- 컷 **직접 열어 봄**(1512×863·씨앗1337·층3): `tmp/hs_v262_{tint,bosstint,arch}_{on,off}.png`. tint OFF 사탕(핑크·시안)→ON 뼈/재/올리브/녹슨 핏빛 통일 · bosstint OFF 마젠타 아우라→ON 가라앉은 재보라 · arch OFF 민 벽 띠→ON 아치 아케이드+횃불(도면과 나란히).

## ✔ 끝난 판: V-261 — 던전 꼴: 불·랜드마크·바닥 결 (닫음 2026-09-02)
V-260 이 남긴 ③ 이자 D2 카타콤 도면(`docs/ref/d2_catacombs.png`)에서 읽은 ①③④. 만진 곳 `hs/map.js`·`hs/main.js`·**새 자 파일 없음**(베이커 `tmp/hs_v261_cut.mjs`·지문 `tmp/_v261_fp.mjs`·셈 `tmp/_v261_count.mjs`). 구현 커밋 **505f1d2**+배치 손질.
① **방마다 바닥 결(`__FLOORMIX`·main.js `floorBase`/`roomMix`)** — 층 하나가 타일 한 종이라 방을 열 개 지나도 같은 회색 판이 이어져 「창고」로 읽혔다(V-259 문제 진술의 절반). 방 인덱스로 **이웃 타일 하나**를 골라 옅게 겹치고(α0.20~0.30) 그 위에 큰 얼룩 셋을 더 짙게 얹어 한 방 안도 고르지 않게 한다. **순수 그리기**(세계 데이터·RNG 무접촉·층 바뀌면 캐시 비움).
② **불을 열댓 개로** — scatter 가 22% 로 흘려 층 전체에 두셋뿐이던 화로를 **방마다 둘(넓으면 셋)** 벽에 못박았다. 실측 층3 **8→28** · 층1 4→27 · 층4 18→48 · 층30 128→287. 화로마다 `warmGlow` 가 붙으니 **불빛이 방을 만든다** — 컷에서 제일 큰 차이가 이것.
③ **방마다 랜드마크 하나** — 방이 다 같은 창고로 읽히던 것. 벽에 붙여 남보다 **키 1.18배** 인 것 하나(석상·기둥·해골전신·석관)를 세운다. 벽이 다 차면 안쪽 고리로 물러나되 **가운데 20% 는 비운다**(싸움을 안 가림). 실측 **방 20 중 14** · 층4 21 중 18 · 층30 71 중 70. `assignZoneLook` 재굴림에서 뺐다(`pr.dungeon` — 안 빼면 지역 굴림이 랜드마크를 잡석으로 바꿔 버린다).
④ **바닥 자취 두 배** — scatter 밀도(넓이/13000) 위에 같은 만큼(넓이/12000)을 더 얹었다. 층3 얼룩 **172→357**.
- **되돌림 실측: 블록이 `Math.random` 을 한 톨도 안 쓴다**(층 번호로 씨앗 잡는 산술 PRNG `dr`) → genFloor 지문 **F1/F4/F5/F10/F30 다 ON=OFF byte-동일** ✔(`node tmp/_v261_fp.mjs`).
- 회귀(있는 자로만): `hs_v207_walk` **벽밖 0%**·오류 **0**(WAKE 3000·820·fp95 50.1ms=옛값 그대로) · `hs_v219_foeshot` frame p95 **0.8→1.2ms**(≤16.7 규격 안·바닥 겹칠·얼룩 두 배의 값)·오류 **0**.
  ★ `hs_v219` 의 ㉢「에셋 0/0」미달은 **내 회귀가 아니다** — V-260 을 닫은 커밋 `bca49de` 트리에서 같은 자를 돌려도 **똑같이 0/0 미달**이 난다(A/B 실측). 그 자의 화살 표본이 이 환경에서 비는 것(NOW 에 이미 적힌 「쏜화살 표본<30」 결). 자를 고치지 않고 눈으로 판정하고 넘어간다.
- 컷 **직접 열어 봄**(1512×863·씨앗1337·층3·사람을 옮겨 찍음 — 카메라만 밀면 루프가 되돌린다): `tmp/hs_v261_{mix,fire,room}_{on,off}.png`. `mix_off` 는 두 방이 **한 장의 평평한 회색 판**에 화로 하나 / `mix_on` 은 방마다 바닥 색이 갈리고 오른 방에 화로 셋이 타 **불빛으로 방이 읽힌다**. `room_on` 은 큰 방 오른 벽에 화로 넷·왼쪽에 후드 석상 랜드마크.

## ✔ 끝난 판: V-260 — 길을 «단순하고 넓게» (①② 닫음 2026-09-02)
병수님 21:53 「맵 이동 안되는게 너무 많은데, 길 굳이 꼬불꼬불 꼬아놓지 말고 단순하게」. 만진 곳 `hs/map.js` **하나**·새 자 파일 없음(있는 자 회귀·베이커 `tmp/hs_v260_cut.mjs`). 구현 커밋 **43f2e8b**.
① **복도 최소 폭(`__CORRWIDE`)** — 지역계수로 87~105px 까지 좁던 통로에 `Math.max(126, CORRIDOR_W×계수)` 못박음. 실측 minW: 묘지 **87→126**·썩은굴 **105→126**·피의회랑 **96→126** / 넓은 지역(135·173·150)은 이미 ≥126 라 불변.
② **두 토막 L자 + 모서리 여유칸(`__CORRSIMPLE`)** — 옛 세 토막 Z(H-V-H)=「꼬불꼬불」. 관통 안 하면 L, 관통하면 옛 Z 로 물러난다(순수 L 은 V-202 관통 0 을 깨서 자 `crosses` 로 걸러냄). 꺾임엔 정사각 여유칸(폭×폭)으로 «대각 병목»(몸반지름 깎으면 walkable 이 대각선으로만 닿던 것) 제거. 실측: 대부분 연결이 L(F4 20 L+1 Z). ★ 통로 막는 소품(기둥·석관…)은 배치 뒤 걷어냄(층당 12~105개·배치 중 props 불변→RNG 무변).
- 되돌림 실측: `__CORRWIDE=false __CORRSIMPLE=false` → genFloor 지문 **F1/F4/F5/F10/F30 다 ON=OFF byte-동일** ✔(connect·cw RNG 무소비·소품 걷어냄 배치 뒤).
- 회귀(있는 자로만): `hs_v202_map`(씨앗8·층1/3/5/10) **관통 0·도달 100%**·≤4ms ✅ · `hs_v207_walk` **벽밖 0%**·오류 **0** · `hs_v219_foeshot` frame p95 **0.9ms**·에셋 **100%**·오류 **0**. (바닥비 25% 는 옛부터·OFF 도 같음·이 판 무관.)
- 컷 **직접 열어 봄**(1512×863·씨앗1337·층3): `tmp/hs_v260_{corridor,corner,walk}_{on,off}.png` — ON 이 OFF 좁은 채널보다 넓고 단순·모서리 안 막힘.
- ③ (바닥 섞기·자취 밀도·벽 붙는 것 = 옛 V-259 던전 꼴)은 다음 판(`__FLOORMIX`)으로 넘김 — 브리프대로 ①② 먼저 끝냄.

## ✔ 끝난 판: V-257 — 층마다 «사건 방» · 시체 두개골 축소 (닫음 2026-09-02)
V-256 ③(사건 방)이 본체. 만진 곳 `hs/`(main.js·map.js·index.html·hud.css)·새 자 파일 없음(베이커/되돌림 `tmp/hs_v257_*.mjs`·있는 `tmp/hs_v256_fp.mjs` 되씀).
① **층마다 «사건 방»(`__EVENTROOM`)** — `genFloor` 맨 끝(scatter 뒤) `if(__EVENTROOM!==false)` 블록: 방 하나를 골라 `rm.eventKind`∈{lair·treasure·curse}, 그 방의 보통 팩은 걷어낸다(splice). off 면 블록 통째 건너뜀 → **RNG 무소비·byte-동일**(실측 F4=3270493314·F30=1688181880). 런타임(main.js):
   · **소굴(lair)** — 들어서면 `G.lair.locked`(붉은 장막 테 `drawLairSeal`·방 밖으로 못 나감 `clampToLair`), 세 물결(sealed 팩을 `stepLair` 이 앞물결 전멸마다 하나씩 풀어줌) → 다 잡으면 열리고 숨겼던 보상 상자(`hidden`) 드러남.
   · **보물방(treasure)** — 적 0·상자 셋(`rich` 금·물건 ×2), 하나는 `trap`(열면 잠자던 무리 `G.packs.push`). 
   · **저주 제단(curse)** — B 로 「받겠는가」 3택 모달(`#pact`·renderPact): 탐욕(적 ×1.5↔드랍 ×2)·피(내 생명 ½↔피해 ×2)·금(소환 못함↔금 ×3). `G.pact` 에 담아 recalc·dropLoot·summonBlocked 이 읽고, 층 바뀌면 `fresh()` 가 G 새로 지어 사라짐(이 층 한정).
   · 입장 배너 `G.zoneBanner`(sub 줄)·미니맵 마름모(종류별 색: 소굴 붉음·보물 금빛·저주 보라)·`ALTAR_META.curse` 되씀.
② **군세 진형 튜닝 — 못 함(V-256 값으로 되돌림).** 자(소환수 14·프리즈 적 1)에선 근접이 사거리 안에서 그 자리 때려 minionSlot 반경을 키워도 안 갈렸다(최소 몸간격 off 12.7·on 16.1 — 차이 미미). 실측으로 on>off 를 못 보여 **안 실었다**(검증 안 된 코드 안 커밋). 다음 축: 슬롯에서 때리게 stepMinions 교전 가지 손질.
③ **시체 두개골 축소(`drawCorpseBody`)** — `s=c.h*0.21→0.12`(≈0.57배)·눕힌 몸 실루엣(어두운 덩이) 밑에 깖. 컷에서 사람 머리보다 작게(해적기 아님).
- 되돌림 실측: `__EVENTROOM=false` → genFloor 지문 **F4=3270493314·F30=1688181880** = V-256 착수와 동일(byte-동일). ③ 은 그리기 전용·genFloor 무접촉.
- 컷 직접 열어 봄(1512×863): `tmp/hs_v257_{treasure,curse,curse_modal,lair_banner,lair_locked,minimap,corpse_crop}.png` — 세 방 배너·소굴 붉은 장막+세 물결·보물방 상자 셋 적0·저주 3택 모달·시체 사람보다 작음. 콘솔 오류 0.
- 회귀: 남은 시간에 못 돌림(있는 자 hs_v219_foeshot·hs_v207_walk). ★ 다음 감시가 돌려 규격 확인할 것.

## ✔ 끝난 판: V-256 — ①② 닫음·③(사건 방) 은 V-257 로 넘김 (2026-09-02)
감시가 V-255 컷(`hs_v255_form_on.png`·`_corpse_on.png`)을 직접 열어 골랐다. 만진 곳 `hs/main.js` **하나**·새 자 파일 없음(베이커 `tmp/hs_v256_cut12.mjs`·지문 `tmp/hs_v256_fp.mjs`). 구현 커밋 **4db79d8**.
① **군세도 진형(`__MINIONFORM`)** — `stepMinions` 의 교전 가지에서 근접 소환수가 표적 한 점에 다 포개지던 것을, `foeSlot` 과 같은 결의 **`minionSlot`**(안쪽 고리=근접 사거리 바로 안 reach-6·넘치면 42px 몸간격으로 바깥 고리·세로 0.68)으로 **에워싼다**. 표적당 카운터(`besiege` Map)로 앞줄부터 채운다. **바라보는 방향·근접 명중은 진짜 표적 그대로**(사거리 불변). off 면 이동 목표가 옛대로 표적 중심 → **byte-동일**. 컷 `tmp/hs_v256_minform_{off,on}.png`(소환수 14가 프리즈 적 1 에 off=한 덩이·on=여러 겹 고리로 낱낱이 갈림).
② **누운 시체를 «뼈»로(`__CORPSEBODY`)** — 세 판째(V-243·245·255) 「흰 타원 고리」였다(스프라이트 눕히기가 `mob/*` 시체 base 로 안 읽힘). 이번엔 **직접 그렸다** — `drawCorpseBody` 가 **두개골(눈구멍+코)+엇갈린 긴뼈**를 친다. 쓸 수 있는 것=상아빛 온전한 해골 / 이미 쓴 것=잿빛 부서진 조각(두개골 없음)이라 **빛만이 아니라 꼴로도** 갈린다. 몸을 그리니 옛 «타원 고리»(펄스 링)는 __CORPSEBODY 판에서 뺐고, `__CORPSEGLOW` 후광은 몸을 안 덮게 옅게(r26·α0.14). 컷 `tmp/hs_v256_corpse_{off,on}.png`+`_crop.png`(시체 여덟·상아 넷/잿빛 넷·한눈에 유해로 읽힘).
③ **층마다 «사건 방»(`__EVENTROOM`) — 아직 안 함(다음 세션).** 설계는 아래 ROADMAP·axis 에 적었다. 소굴(문 잠김+세 물결)·보물방(상자 셋·하나는 함정)·저주 제단(3택) — genFloor 에 방 하나 표식+미니맵+입장 배너, off 면 `genFloor` 지문 byte-동일이어야 한다(기준선 F4=3270493314·F30=1688181880).
- 되돌림 실측: ①② 는 다 **런타임(AI·그리기)** 이라 `genFloor` 무접촉 → 지문 불변(기준선 위와 같음). ③ 착수 전 상태.
- 회귀(있는 자로만): `hs_v219_foeshot` 에셋 **100%**·오류 **0**·frame p95 **0.7ms**·쏜화살 64 → 규격 안 ✅(①② 그리기·AI 변경이 렌더/성능 안 깸). `hs_v207_walk` 은 플레이어 이동 미변경이라 생략.

## ✔ 끝난 판: V-255 — 무리가 «진형»으로 싸운다 (닫음 2026-09-02)
감시가 V-254 컷(`tmp/hs_v254_order_{follow,attack,hold}.png`)을 직접 열어 골랐다. 만진 곳 `hs/main.js` **하나**·새 자 파일 없음(베이커 `tmp/hs_v255_cut.mjs`·되돌림 `tmp/hs_v255_revert.mjs`).
① **무리 진형(`__FORMATION`)** — 사람을 노리는 근접이 다 사람 정중앙 한 점으로 직진해 한 덩이로 포개지던 것을, `foeSlot` 로 **에워싸는 슬롯**(안쪽 열=근접 사거리·넘치면 뒤로 겹)에 흩는다. 바라보는 방향·근접 공격 판정은 진짜 표적 그대로라 사거리·명중 불변. 자폭병은 멀리서 **접선 성분**을 섞어 옆으로 돌아 붙는다. 사수 kite·도둑/망령 시체 샘은 이미 있던 결(그대로 살림). **`__CROWDSPREAD` 는 손 안 댐** — 원인 파보니 벽밖 무리 클럼프는 V-254 컷의 «얼린 포즈»(전 무리 강제 awake·spd 0) 아티팩트였고, 실전 교전 무리는 슬롯 흩기로 갈린다. (벽붙은 무리 slide-되돌림도 대 봤으나 `hs_v219_foeshot` 에셋 렌더를 깨 되돌림 — 있는 자가 잡았다.)
② **아래 힌트 띠 겹침** — `#hint` 는 이미 V-254 ④ `applyHintFold` 로 짧은 한 줄이었다(28개 아님). 진짜 겹침은 **화면 밑에 선 적의 세계-공간 이름표**(정예 붉은 이름·부하 이름표)가 고정 HUD 힌트 줄과 포개진 것. `liftLabel`(`__LABELBAND`)로 `drawEliteNames`·`drawFoldedKindLabels` 가 아래 HUD 띠(`hudBandRect`: #hint·#bl)에 드는 이름표를 그 위로 물린다. **`CONTROLS` 한 근원은 안 깸.**
③ **「여기 지켜」 깃발 클램프(`clampWalkPoint`/`setHold`)** — `cycleStance`·`__setStance` 가 지켜 자리를 가장 가까운 통행 칸으로 물린다(벽점 x=147 → x=207·+60px). 실전 cycleStance 는 늘 사람 자리(통행 칸)라 무변화지만 안전망을 남겼다.
④ **어두운 바닥 시체(`__CORPSEGLOW`)** — `drawLight` 의 lighter 판에서 안 쓴 시체마다 옅은 상아빛 빛(반경 40·α0.30)을 얹어 저광에 삼켜지던 시체를 들어 올린다(주울 것이 어디 있는지 읽힘). 그리기 전용.
- 되돌림 실측: 내 변경은 다 **런타임(AI·그리기·UI)** 이라 `genFloor` 경로엔 한 줄도 안 든다 → 지문 **F4=3270493314·F30=1688181880** = V-255 착수(pre-change, git stash) **byte-동일**(핸들 무관·`separateEnemies` 는 옛 코드로 되돌려 byte-동일).
- 회귀(있는 자로만): `hs_v207_walk` 벽밖 **0%**·오류 **0**(WAKE 3000·820) · `hs_v219_foeshot` 에셋 **100%**·오류 **0**·frame p95 **0.6ms**·쏜화살 64 → 다 규격 안 ✅.
- 컷 **직접 열어 봄**(게임 크기 1512×863): `tmp/hs_v255_form_{off,on}.png`(적 14가 off=덩이·on=에워싼 진형·낱낱 이름표·최소 몸간격 42px)·`_hold_clamp.png`(깃발 방 안)·`_corpse_{off,on}.png`(시체 상아빛)·`_hint_{off,on}.png`(밑 이름표가 힌트 줄 위로 물림). 구현 커밋은 아래 git log.

## ✔ 끝난 판: V-254 — 군세에 「명령」 · 평범이 어둠에 먹힌다 (닫음 2026-09-02)
감시가 V-253 컷을 직접 열어 넷을 골랐다(+새 컨텐츠 하나). 만진 곳 `hs/main.js`·`hs/index.html`·새 자 파일 없음(베이커 `tmp/hs_v254_cut.mjs`).
① **군세 태세 셋(`__ORDERS`·`O` 키)** — 소환수에 명령이 한 줄도 없던 것에 태세를 얹었다. `stepMinions` 가 태세마다 «묶이는 자리»와 «싸우러 나갈 반경»을 가른다: **따라와**(사람 곁 반경 240·수비) · **쳐라**(겨눈 자리로 몰려가 반경 600 안 문다) · **여기 지켜**(그 자리 반경 240만·끌려가지 않음·바닥 초록 깃발). HUD 「자리 N/M」 끝에 태세 낱말·`O` 는 힌트·H 판에도.
② **평범이 어둠에 먹힘** — `MOB_TINT.plain` 밝기 **0.82→1.34**(채도 0.9 지켜 넷과 안 겹침). 어두운 바닥에서 몸이 녹아 발밑 고리만 보이던 것 → 몸이 읽힘.
③ **다섯째 이름표** — 평범 `mobKind="plain"`+`MOBKIND_META.plain={label:"망령"}` 으로 같은 `drawKindLabel` 한 길로 뜬다(갈래 안 나눔).
④ **힌트 한 근원** — 손목록 셋(짧은 #hint·긴 #hint·H 판)이 갈라지던 것을 `CONTROLS` 배열 하나로. `buildControls()` 가 긴 #hint·#help 격자를 둘 다 이 배열로 그린다(index.html 이 손목록 안 듦 → 새 키 한 번에).
⑤ **계단 우물 — 안 집음**(V-251·252·253 세 판 실패·로컬 base64 막다른 길).
- 되돌림 실측: `__ORDERS=false __MOBTINT=false` → genFloor 지문 **F4=349422190·F30=245310424** = V-253(git stash HEAD) **byte-동일**. 태세는 순수 AI·색조/이름표/저광은 그리기 전용 → 세계 생성 무변경.
- 회귀(있는 자로만): `hs_v207_walk` 벽밖 **0%**·오류 **0**(WAKE 3000·820) · `hs_v219_foeshot` 에셋 **100%**·오류 **0**·frame p95 **0.5ms**·쏜화살 64 → 다 규격 안 ✅.
- 컷 **직접 열어 봄**(게임 크기): `tmp/hs_v254_order_{follow,attack,hold}.png`(같은 자리·태세만 바꿔 소환수가 실제 다르게 섬)·`_kinds_dark.png`+`_plain_crop.png`(어두운 바닥 망령 몸+이름표 읽힘). 구현 커밋은 아래 git log.

## ✔ 끝난 판: V-253 — 「어느 놈인지」가 한눈에 · 이름표가 어디서나 (닫음 2026-09-02)
감시가 V-252 컷(`tmp/hs_v252_kinds_after.png`)을 직접 열어 셋을 골랐다. 만진 곳 `hs/main.js` **하나**·새 자 파일 없음(베이커 `tmp/hs_v253_cut.mjs`·되돌림 `tmp/hs_v253_revert.mjs`).
① **「평범」에 제 낯**(`assignZoneMix`+`MOB_TINT.plain`+`drawEnemy`) — 평범이 사수와 같은 `skelarch` 몸·무채색이라 「쏘는 놈이 둘」로 읽혔다. 넷(shoot/charge/bomb/thief)이 skelarch·brute·zombie·shaman 을 다 쓰니 **그 넷이 안 쓰는 유일한 몸 `mob/fallen`**(8방향+walk/attack 다 있음)으로 평범을 갈랐고, 색조도 `MOB_TINT.plain`(흙빛 회록·저채도 `sepia(1) saturate(0.85) hue-rotate(6deg) brightness(0.82)`)로 넷과 안 겹치게 얹었다. **새로 굽지 않고 있는 몸을 되씀**(V-252 zombie 되쓴 길). 다섯이 **색+실루엣**으로 갈림.
② **이름표를 어디서나**(`drawKindLabel`) — 정예 이름표(`drawEliteNames`)와 «한 길»로 합쳤다: 어두운 밑판(`rgba(8,6,4,0.5)`)+두꺼운 외곽선(lineWidth 2.5). 옛 검은 그림자 한 겹만으론 밝은 기둥 머리 위에서 사라졌다. 갈래를 안 나누고 한 함수만 고침.
③ **계단 — 접었다(이 길도 안 됐다).** V-172d 의 `background_image`+`inpainting` 을 실제로 시도 — `inpaint_image` 에 현 `stairs.png`(내부 검은 우물만 마스크·돌테 동결)로 「내려가는 계단」을 넣으려 했으나 **MCP 가 base64 를 잘라/깨뜨려**(truncate·byte 변조) 두 번 다 디코드 실패했다. pixellab 은 클라우드라 `:8774`(localhost) URL 도 못 준다 → `_url` 변주도 막힘. **옛 asset 한 장도 안 바꿈.** 다음 길: 이미지를 **공개 URL 로 호스팅**해 `image_url` 로 넘기는 것뿐(로컬 base64 경로는 이 환경에선 막다른 길).
④ **V-224(발사체 벽밖) — 손 안 댐**(①②③ 으로 예산 씀). ROADMAP 그대로 열려 있다.
- 되돌림 실측: `__MOBTINT=false` → genFloor 지문 **F4=349422190·F30=245310424** = V-252(git stash HEAD) **byte-동일**(같은 플래그로 두 트리 재서 일치). 켜면 평범 base 만 `fallen`(F4 130·F30 561) — rooms/packs(25·63, 67·237) 는 둘 다 같다 → 세계 생성 무변경.
- 회귀(있는 자로만): `hs_v207_walk` 벽밖 **0%**·오류 **0**(WAKE 3000·820) · `hs_v219_foeshot` 에셋 **100%**·오류 **0**·frame p95 **0.5ms**·밝기 통과(쏜화살 표본<30 은 죽음형·단일씨앗 환경 — 코드 회귀 아님, 렌더/에셋 코드 안 건드림).
- 컷 **직접 열어 봄**(게임 크기): `tmp/hs_v253_kinds.png`(다섯 색+실루엣 갈림)·`_kinds_off.png`(__MOBTINT=false 되돌림)·`_labels.png`+`_labels_crop.png`(돌진꾼 이름표가 밝은 기둥 머리 위에서도 읽힘). 구현 커밋 **ca6bbbe**.

## ✔ 끝난 판: V-252 — 적이 «수법대로» 달라 보이게 (닫음 2026-09-02)
병수님 15:15 「에셋 전체적으로 잘 만들어봐」. 감시가 살아 있는 여덟의 south.png(`tmp/hs_v252_chars.png`)를 직접 보고 골랐다 — 낱장 품질이 아니라 **판에서 안 갈리는 것**이 문제. 만진 곳 `hs/main.js` **하나**(map.js 안 건드림)·새 자 파일 없음.
① **폭탄병에게 제 몸**(`main.js:1707`) — `mob/brute`→**`mob/zombie`**(부푼 몸 h×1.06). 돌격병과 픽셀 하나 안 다르던 것이 부푼 zombie 몸+병색 노랑으로 「저건 터진다」가 60px 에서도 읽힌다. ★ **굽지 않고 있는(zombie) 몸을 되썼다** — 8방향 `create_character` 는 아는 실패벽이라(브리프도 허용) 더 미더운 길을 택했다. zombie 는 8방향+walk/attack 다 있어 안전.
② **갈래마다 색이 갈리게**(`__MOBTINT`) — `drawEnemy` 색조를 **sepia(1) 먼저** 얹어 원본 색(붉은 brute·창백 skelarch)을 지운 뒤 갈래별로 다시 얹음(MOB_TINT: 쏘는 놈 파랑·달려드는 놈 주황·터지는 놈 노랑·훔치는 놈 보라). 옛 hue-rotate 만 얹던 것은 붉은 몸 위에서 안 갈렸다. 보스는 BOSS_TINT(넷 이미 갈림) 그대로 둠.
③ **계단 우물 — 접었다.** V-251 이 네 변주 실패, 나도 한 번 더(high top-down 「내려가는 계단」) 구웠으나 **옆-원근 사다리**로 나와 top-down 바닥에 안 맞고 옛 우물보다 낫지 않다 → **옛 asset 지킴**. 남은 길: 실제 바닥 조각을 `background_image` 로(브리프 B4·미착수). asset 은 한 장도 안 바꿨다.
- 컷 **직접 열어 봄**(게임 크기 h 66~82px): `tmp/hs_v252_kinds_after.png` — 사수 파랑·돌진 주황·자폭 초록 zombie(제 몸)·평범 상아·도둑 보라 다섯이 **색+실루엣**으로 갈림 / `_before.png`(__MOBTINT=false): 자폭=붉은 brute(돌격과 **같은 몸**).
- 되돌림: `__MOBTINT=false`(+폭탄병 다시 brute·옛 색조). **map.js 안 건드림**(`git diff --stat`=hs/main.js 하나) → genFloor 지문 byte-동일(base·h 는 지문에 안 들어가고 assignZoneMix 는 genFloor 밖·산술 PRNG·Math.random 안 갉음).
- 회귀(있는 자로만): `hs_v207_walk` 벽밖 **0%**·오류 **0**(WAKE 3000·820) · `hs_v219_foeshot`(씨앗 1,2,3) 에셋 **100%**·오류 **0**·frame p95 **0.5ms**·쏜화살 154 → 다 규격 안 ✅. 구현 커밋 **7563616**.

## ✔ 끝난 판: V-251 — 에셋 품질(살아 있는+나쁜 것만 다시 구움) (닫음 2026-09-02)
병수님 15:15 「에셋 전체적으로 잘 만들어봐, 퀄리티가 너무 안좋은듯」.
★ 먼저 **화면에 실제로 그려지는 것**을 가렸다 — fx 파일 16 중 살아 있는 건 다섯(spear·spearhit·boom·gold·foeshot)뿐,
  나머지(curse·raise·nova·offerfx·bonewall·corpse_bones…)는 **죽은 파일**(연출은 canvas 절차적) → 안 구웠다.
★ **살아 있으면서 나쁜 것**만 다시 구움 → `floor/bone_tile`·`floor/rot_tile`·`decor/bones2` 세 장 교체(create_tiles_pro shape mode·create_map_object).
  `sanctum_tile`·`stairs` 는 재굽기가 옛것보다 낫지 않아 **안 옮김**(옛것 지킴). stairs 다음 길: 실제 게임 화면을 background_image 로.
회귀 `hs_v219_foeshot` 에셋100%·오류0·frame p95 0.7ms · `hs_v207_walk` 벽밖0%·오류0. 코드 안 건드림·새 자 없음. ROADMAP·시트 tmp/hs_v251_sheet_after.png.

## ⤳ 넘긴 판: V-259 — 판을 «던전»으로 (V-260 ③ = `__FLOORMIX` 로 이어서)
병수님 21:52 「던전같은 느낌으로 맵 다시」 → 21:53 「길 굳이 꼬불꼬불 꼬아놓지 말고 단순하게」로
**이동 문제(V-260 ①②)가 먼저**였다(못 지나가는 것은 게임이 안 되는 문제). ①② 를 끝냈으니 다음 판이 이 던전 꼴을 집는다:
· ① 바닥을 **섞는다**(주+곁 타일 · 자리로 결정 · 지역마다 조합) — **에셋 안 구움**(있는 여섯 종 섞기)
· ② 바닥 자취(깨짐·핏자국·이끼) 밀도 2~3배 · 얼룩은 방 물들이기 아래(V-165)
· ③ **벽에 붙는 것** — 벽 횃불 · 사슬 · 쇠창살 벽감 (여기만 PixelLab·`tmp/wallbake/`)
· ④ 방 모양을 직사각형에서 벗어나게(모서리 깎기 · 기둥 열 · 가로 홀)
지시문 `tmp/hs_v259_prompt.md`

## ★ 던전 꼴은 `docs/D2_DUNGEON.md` 를 따른다 (병수님 09-02 21:54 「디아블로2의 던전 스타일 참고 좀 해」)
D2 카타콤 **실제 도면**(`docs/ref/d2_catacombs.png`)을 받아 읽고 적었다. 가져올 것 다섯 —
**① 불을 열댓 개로**(지금 화로 두셋 · 이것 하나로 던전이 반은 온다) ② **벽에 아치**
③ 바닥 자취 촘촘히 ④ 방마다 랜드마크 하나 ⑤ 복도를 짧게·방을 붙여서.
★ 아이소메트릭 시점과 「밖을 검정으로」는 **안 가져온다**(에셋 여든 장이 탑다운 · V-212 암반).

## ▶ 다음 차례 — V-272 바닥 타일 (병수님 09-03 07:25 「맵 타일 안 바꿀거야?」)
09-02 21:51 에 「`create_tiles_pro` 로 다시 굽겠다」고 해 놓고 **안 띄웠다.** 그 뒤 열 판이
던전 꼴·지도·함정으로 갔다. 재 보니 여섯 중 **다섯이 민무늬**(표준편차 <10 = 색면)였다.
· **이미 구워 둔 것이 있었다** — V-251 이 `tmp/assetbake/*2_tiles` 에 16장씩 구워 놓고
  **안 옮겼다**(`*_tile_tiles` 는 투명 배경 오브젝트라 못 쓰는 게 맞았지만, `*2_tiles` 는 바닥이다).
· 07:35 적용: **rot** 무늬 9.6→**34.9**(이음매 0.4 — 거의 seamless) · **bone** 12.4→**45.7**.
  ★ bone 은 밝기가 71.8→86.3 이고 이음매 33 이라 **화면에서 격자로 보이면 되돌린다**
    (되돌릴 것: `assets/floor/_pre_v272/`).
· **crypt·sanctum 은 V-280 이 적용**(crypt 8.9→28.6 · sanctum 7.4→31.2 · style_images 에 rot 타일). **남은 둘: blood(7.0) · abyss(9.3).**
  V-280 이 style_images 로 blood/abyss 도 구웠으나 무늬 14/10 로 **sd<25** 라 안 넣었다(tmp/_gs_t5~11).
  다음 판: 프롬프트에 대비·알갱이를 더 못박거나 shape mode segmentation 재시도 → **sd≥25** 되면 넣는다(되돌림 `assets/floor/_pre_v280/`).

## ✔ V-279 — 방·복도 밖을 «검정»으로 (2026-09-03 12:46 · **13:00 감시가 화면으로 통과 판정**)
병수님 12:44: 「맵에서 문제는 **바깥 공간**인 거 같아, 그냥 타일 깔지 말고 **까맣게** 해」
`hs/main.js` 의 암반 칠하기를 껐다(`__BEDROCK` 이 true 일 때만 칠한다 — 기본 꺼짐).
★ **아직 화면으로 못 봤다** — V-278 이 브라우저를 쓰고 있었다. **다음 판이 컷을 찍어**
  ① 방이 도드라지는가 ② 너무 휑하지 않은가(V-212 가 걱정한 그것)를 **눈으로** 판정할 것.
  휑하면 암반을 되살리지 말고 **벽을 더 두껍게** 하거나 어둠 가장자리를 부드럽게 한다.
`docs/D2_DUNGEON.md` 의 「밖을 검정으로는 안 가져온다」 줄은 **틀린 판단이라 고쳐 적었다.**

**13:00 감시 판정 — 통과.** V-278 컷(`roll_mid` 층8 · `hole_idle` 층10)을 직접 열어 봤다.
① 방이 도드라진다 — 밝은 방이 **어둠 속 섬**으로 읽히고 벽 경계가 또렷하다(암반 잿빛이 경계를 흐리던 것이 사라짐).
② 휑하지 않다 — 화로 불빛·벽 기둥·복도 그림자가 검정 위에서 오히려 더 산다. V-212 의 걱정은 안 일어났다.
→ **되살리지 말 것.** `__BEDROCK` 은 꺼진 채로 둔다.

## ★★★ 자(검수기)를 만들지 마라 — 병수님 2026-09-01 23:07
> 「**"자" 좀 그만 건드려라, 게임 컨텐츠를 만들어**」

**V-225·226·227·228·229 다섯 판이 연속으로 자였다** — 간선 규칙 · 자에 팔 붙이기 ·
진척 눈금 · 자에 물러섬 붙이기 · 물러섬 유지 시간. 그동안 게임 코드는 **하나**뿐.
**병수님이 만지는 것은 한 톨도 안 늘었다.**

### 규칙
- **새 자 파일(`tools/hs_*`)을 만들면 그 판은 실패다.** 있는 자로 **회귀만** 본다
  (콘솔 오류 0 · 벽밖 0% · frame p95).
- 검증은 **켜서 눈으로** 한다. 컷을 직접 열어 보고 판정한다.
- 고를 항목은 **「게임 안에 새로 생기는 것」**이어야 한다 — 적 수법 · 주인 · 물건 ·
  스킬 · 쓸 곳. 「무엇을 어떻게 재는가」는 항목이 아니다.
- 자가 틀린 것 같으면 **자를 고치지 말고 눈으로 판정하고 넘어간다.**

## ★ 워커에게: 아래 「지금 도는 판」은 **이 글을 읽는 너**를 가리킨다
`ps` 에 보이는 `opencode` 는 **너 자신**이다. 그걸 「남이 돌고 있다」로 읽고 물러나면 그 판은 실패다
(2026-09-02 02:33 판이 그렇게 rc=0 no-op 으로 죽었다). 구현 커밋이 `git log` 에 있을 때만 물러선다.

## ✔ 닫음: **V-250** — 죽음의 값 · 시체 회수 → **V-266 이 이어받아 끝냈다**(2026-09-03)
병수님 15:15 지시로 그때 에셋 품질 축(V-251)으로 갈아탔던 축. 중단분 커밋 `7854bac` 은 V-249 컷 흠(공포 색·crowd 6패스·돌진 띠·벽 무늬)뿐이라 죽음/회수와 무관 → 버리고 V-266 이 새로 짰다(`__DEATHCOST`·`__CORPSERUN`). 위 「✔ 끝난 판: V-266」 참조.

## ✔ 끝난 판: V-249 — 저주 셋(플레이어가 직접 거는 것·`__CURSE`·키 5·6·7) · V-248 컷 흠 다섯 (닫음 2026-09-02)
① **플레이어 저주 셋**(네크로 셋째 기둥·소환·시체에 이은 «규칙을 거는» 손·겨눈 자리 반경 178·머리 위 도형+발밑 색고리·마나·지속):
   · **약화**(5·마나 28·6초) 걸린 적 주는 피해 **×0.5**(버티기·실측 64→32) · **역병**(6·마나 46·6초) 초당 부패 14+**죽으면 반경 156 터져 번지고 시체 두 배**(한 죽음 시체 2·곁 8 재감염) · **공포**(7·마나 24·3.5초) 사람에게서 **1.15배로 달아남**(실측 160→351). 표식: 보라 ∨·초록 방울 셋·노랑 !.
② **V-248 컷 흠 다섯**: (a) 북벽 띠 좌우뒤집기+밝기(주기 64→384·`__WALLVARY`) (b) 배너 어두운 밑띠(`__BANNERBG`) (c) 사건방 제단 판 44px 더 물림(`__EVPANEL`) (d) 미니맵 `ZONE_MINI` α강화+테 두른 큰 마름모(`__EVDIAMOND`) (e) 성소 기둥 무게 4→9·석상 5+성소서만 기둥 1.3배(«기둥 전당»).
- 되돌림(`__CURSE=false`+V-248 OFF): F4 **377768629**·F30 **2420594269** = V-248 **byte-동일**(저주·다섯 흠 고침은 genFloor 밖·전역 Math.random 안 갉음).
- 회귀: `hs_v207_walk` 벽밖 **0%**·오류 **0** · `hs_v219_foeshot` frame p95 **0.5ms**·오류 **0**(쏜화살 표본<30 은 baseline 동일·환경). 컷 `tmp/hs_v249_*` 직접 열어 봄. 만진 곳 `hs/`(main.js·index.html)·새 자 없음. 새 키 5·6·7.

## ✔ 끝난 판: V-248 — 지역이 «꼴»로도 갈리게(`__ZONEROOM`·방 배치·지역 사건방 넷) · V-247 컷 흠 다섯 (닫음 2026-09-02)
① **지역 방-꼴**(map.js `genFloor` 에 지역 씨앗 손잡이 `ZONE_ROOM[zi]` 붙임·새 생성기 아님): 방 개수·채움·통로 폭·죽은방 비율이
   지역마다 갈린다. 실측(색 빼고도 갈림): 피의회랑 방43·**677×234**(얇은 가로 홀) · 심연 방25·**1080×774**(큰 방) · 성소 방64·기둥 열.
   **사건방 넷**(확률 0.7·있는 소품·적·물건 조합): 뼈 무더기 · 피의 제단 · 깨진 균열(큰 무리+금) · 봉인된 관(정예+상자).
   소품 실측: 성소 기둥157·석상143(옛 「항아리뿐」 고침) · 심연 기둥0·석상0.
② **V-247 컷 흠 다섯**: (a) 무리 겹침 `separateEnemies` gap14+세 패스(`__CROWDSPREAD`·반경40 점유 중앙값 2→0) (b) 배너 교전 중 페이드아웃(`__BANNERFADE`) (c) 우리 고리 온전한 자리로 중심 이동(`__CAGEFIT`·벽밖 18→0) (d) 성소/심연 소품 갈림 (e) 미니맵 지역 색조 `ZONE_MINI`+사건방 금빛 마름모.
- 되돌림(재씨앗·한 evaluate·두 층·`__ZONEROOM=false`): genFloor 지문 F4 **377768629**·F30 **2420594269** = V-247 **byte-동일**(ZR_NEUTRAL 이 옛 값·옛 RNG 순서 재현).
- 회귀: `hs_v207_walk` 벽밖 **0%**·오류 **0** · `hs_v219_foeshot` frame p95 **0.8ms**·에셋 100%·오류 **0**·쏜화살 30·다 규격 안 ✅. 컷 `tmp/hs_v248_{room1..6,event_bone,event_blood,event_rift,event_coffin,crowd_off,crowd_spread,banner_fade,cage_ring,props_count,minimap_zone}.png`(직접 열어 봄·베이커 오류 0). 만진 곳 `hs/`(main.js·map.js)·새 자 파일 없음. 새 키 없음.

## ✔ 끝난 판: V-247 — 지역 여섯(구간마다 다른 곳·`__ZONE`) · V-246 컷 흠 다섯 (닫음 2026-09-02)
① **지역 여섯**(5층 묶음): 죽은 자의 묘지·뼈 무덤·썩은 굴·피의 회랑·심연·성소. 구간마다 이름(HUD region1 +
   첫 진입 가운데 배너 `drawZoneTitle`·D2 결)·빛(전체 색칠 wash·어둠 dark 0.15~0.40·화톳불 warm — 눈으로 바로 갈림)·
   소품 구성(`assignZoneLook`: 뼈무덤=유골·관 / 심연=부서진 돌·기둥 없음 / 성소=기둥·석상)·적 갈래 비중
   (`assignZoneMix`)이 갈린다. 적 비중·소품은 genFloor 밖(fresh)에서 「층 씨앗」 산술 PRNG 로 굴려 전역 Math.random
   안 갉음(mob0 로 평범 복원 → 지문 불변).
② **V-246 컷 흠 다섯**: (a) 우리뼈 스프라이트도 벽 밖이면 안 그림(실측 18 중 11 안 그림) (b)(c) 모든 경고 도형을
   **한 함수** `warnRingPath`(각도마다 teleReach 로 반지름 줄임)로 벽에서 끊음(주인 원·부채꼴·장판·번개 십자)
   (d) 뼈 껍질 육각 테 위끝을 머리(체력 바 밑)까지만 `drawShellOutline` (e) 정예 이름 어두운 밑판+외곽선 `drawEliteNames`.
- 되돌림 실측(재씨앗·한 evaluate·두 층·`__ZONE=false`): genFloor 지문 F4 **377768629**·F30 **2420594269** = V-246 **byte-동일**.
- 지역 적 비중 실측(`window.__zoneMix`): F3 묘지 사수 34% · F8 뼈무덤 도둑 24% · F13 썩은굴 사수 **45%** · F18 피의회랑 돌진 **41%** · F23 심연 평범 **70%** · F28 성소 돌진 34% — 여섯 다 갈림.
- 회귀: `hs_v207_walk` 벽밖 **0%**·오류 **0** · `hs_v219_foeshot` frame p95 **1.5ms**·오류 **0**·다 규격 안 ✅. 컷 `tmp/hs_v247_{zone1..6,zone_title,zone_mix,cage_clip2,tell_shapes,affix_shell2,elite_name}.png`(직접 열어 봄·베이커 오류 0). 만진 곳 `hs/`(main.js·map.js mob0 한 줄)·새 자 파일 없음. 새 키 없음.

## ✔ 끝난 판: V-246 — 정예 수식어(접두) 다섯(`__AFFIX`) · V-245 컷 흠 다섯 (닫음 2026-09-02)
① **정예 수식어** — 정예/팩 주인에 하나~둘 굴려 붙임(팩마다 다른 놈·D2 정예 접두). genFloor 밖(`fresh`)에서 「층 씨앗」 산술 PRNG(`assignAffixes`)로 굴려 전역 Math.random 안 갉음 → 지문 불변. 다섯 전부 «규칙»(%증가 아님):
   · 불꽃 두른(곁90 초당 화상·5층 3초 hp −1098) · 번개 튀는(죽을 때 십자 번개 넷·경고 0.4s) · 날랜(spd 104→157·공격 0.7배·잔상) · 되살아나는(40%체력 1회·이름표 「(부활)」) · 뼈 껍질(소환수 피해 1000→400·60% 막음·육각 테). 이름표 「불꽃 두른 정예」·수식어 색 갈림.
② 큰 수 흠 둘 — (a) `fmtNum` 999,999→**1.0백만**(옛 「1000천」·반올림이 1000 닿으면 위 단위) · `fmtPair` 분자·분모 같은 자(옛 「5.2백만 / 500」→`5.2 / 0.0백만`) (b) 일지 알림 `foldNums`(「금 9000」→「9.0천」)+천장서 아래로 흘려 안 겹침.
③ 그리기 흠 셋 — (c) 갈래 이름표 앵커 −3→−9(머리 바로 위) (d) 정예/주인 이름표 `drawEliteNames` 배우 뒤 한 판(늘 유닛 위 z순서)·계단 안내 `drawStairsLabel` 이름표 피함 (e) 우리 원 `strokeCageRing` walkable 로 잘라 벽 밖 안 그림.
- 되돌림 실측(재씨앗·한 evaluate·두 층): genFloor 지문 F4 **377768629**·F30 **2420594269** = V-244/245 **byte-동일**(`__AFFIX` false·true 둘 다·수식어가 RNG 안 갉음).
- 회귀: `hs_v207_walk` 벽밖 **0%**·오류 **0** · `hs_v219_foeshot` frame p95 **1.5ms**·오류 **0**·다 규격 안 ✅. 컷 `tmp/hs_v246_{affix_fire,affix_bolt,affix_swift,affix_revive,affix_shell,bignum_roll,label_z,boss_name3,cage_clip}.png`(직접 열어 봄·베이커 오류 0). 만진 곳 `hs/`(main.js)·새 자 파일 없음. 새 키 없음.

## ✔ 끝난 판: V-245 — 숫자가 커져도 안 무너지게(PLAN ⑧·`__BIGNUM`·`fmtNum`) · V-244 컷 흠 다섯 (닫음 2026-09-02)
① 짧은 표기 **한 함수**(`fmtNum`) — HUD 체력/마나·금·xp·피해 숫자·상점 값·정산창이 전부 이 하나를 지난다. 넉 자리부터 접음(천·백만·억). 경계값: 999→999 · 1000→1.0천 · 9999/10000→10.0천 · 999999→1000천 · 1000000→1.0백만 · 1234567→1.2백만 · 123456789→1.2억. 40층 HUD 안 넘침. 정확값(원수)은 성장창·툴팁에.
① 떠오르는 피해 뭉침 — 같은 대상 0.25초(`DMG_MERGE_WIN`) 안 여러 타 → 한 덩이(합계+타수 ×N). 실측 269×6 → 「1.6천 ×6」 한 장. 동시 상한 `DMG_CAP` 14(20타→14).
② (a) 시체 고리 정렬 — 몸 한가운데를 고리 중심에·밝게(0.82→1.08) (b) 우리뼈 z순서 — `drawCageOverlay` 유닛 위에 반투명 덧그림 → 왼쪽 안 끊김 (c) 주인 이름 `nameLift=totalH+8` → 바 위로 온전히 (d) 골렘 `GOLEM_DRAW_BULK 1.16`+돌·흙빛 갈색 색조 → 해골(상아)·구울(초록)과 갈림 (e) 이름표 앵커 -16→-3 머리 바로 위.
- 되돌림 실측(재씨앗·한 evaluate): `__BIGNUM=false`+V-244 flags=false → genFloor 지문 F4 **377768629**·F30 **2420594269** = V-244 **byte-동일**(다 순수 표기/그리기 → genFloor 밖).
- 회귀: `hs_v207_walk` 벽밖 **0%**·오류 **0** · `hs_v219_foeshot` frame p95 **1.6ms**·오류 **0**·다 규격 안 ✅. 컷 `tmp/hs_v245_{bignum_hud,bignum_edge,dmg_merge,corpse_ring,bonecage3,boss_name2,golem_bulk,labels_anchor}.png`. 만진 곳 `hs/`(main.js)·새 자 파일 없음. 새 키 없음.

## ✔ 끝난 판: V-244 — 군세 종류(구울·골렘·`__MINIONKIND`·PLAN ③) · V-243 컷 흠 넷(시체 눕힘 `__CORPSELAY`·우리뼈 촘촘 CAGE_SEG 18+테·경고선 컷 재포착·부하 이름표 쌓기) · 12h 정산 문구 (닫음 2026-09-02)
① **사실**: 구울(K)·골렘(G)·도발/막음·피 빨기·군세 HUD·`#hint`·H 판은 **V-240 이 이미 세웠다**(브리프의 「해골뿐」은 낡음). V-244 는 윗손잡이 `__MINIONKIND`(끄면 K/G 막히고 골렘=센 해골)·시체값(해골 1·구울 2·**골렘 5→3**)·실측·컷을 얹었다. 세 결 갈림(F12 해골 dps257 · 구울 dps282·drain0.35 · 골렘 hp2720·dps445·도발+막음). 실측: 구울 hp 79→198+주인 +110 · 골렘 반경240 안 **8 도발·6 벽에 잼**. **70% 판정: 최대 점유 50.0%** ≤70% ✅.
② (a) 시체를 발축 ±72°·납작(0.72)·어둡게 눕혀 서 있는 소환수와 갈림 (b) 우리뼈 CAGE_SEG 11→18 + `drawCageRails` 위·아래 상아 테 → 가두는 우리로 읽힘 (c) 경고선을 warn 단계·가장 긴 방향(reach 264)으로 겨눠 또렷이 잡음 (d) `drawFoldedKindLabels` 가 다른 갈래끼리도 겹치면 아래로 쌓음(placed 사각) → 「사수 ×2·사수 ×3·시체 도둑」 안 뭉침.
③ 정산 12h 문구: 「그동안 **12시간 0분** 이 흘렀다 · **상한 8시간까지만 쌓임**」(computeOffline 에 elapsedMin 얹음).
- 되돌림 실측(결정적 재씨앗·한 evaluate): `__MINIONKIND/__CORPSELAY=false` → genFloor 지문 F4 **377768629**·F30 **2420594269** = HEAD(git stash) **byte-동일**(=V-243 값). 소환·CAGE_SEG·시체 그리기·이름표·정산은 다 genFloor 밖.
- 회귀(있는 자로만): `hs_v207_walk` 벽밖 **0%**·오류 **0** · `hs_v219_foeshot` frame p95 **1.7ms**·오류 **0**·다 규격 안 ✅. 컷 `tmp/hs_v244_{minion_three,ghoul_leech,golem_hold,mix_ratio,corpse_dead,bonecage2,tell_clip2,minion_labels,offline_12h}.png`. 새 키 없음(K/G 는 V-240·`#hint`·H 판에 있음). 만진 곳 `hs/`(main.js·index.html)·새 자 파일 없음.

## ✔ 끝난 판: V-243 — 오프라인 진행(PLAN ②·`__OFFLINE`) · V-242 컷 흠 넷(주인 이름 `__BOSSNAME`·흰 우리뼈 `__BONECAGE`·경고선 벽 뚫음 `__TELLCLIP`·시체 붉은 얼룩 `__CORPSEART`) (닫음 2026-09-02)
① **오프라인 진행** — boot 에서 `necro_offline_v1`(마지막 시각·deepest·금)을 읽어 정산창(`#offline`)으로 보여준다. **분당 = deepest × 효율 0.5 × {금 0.5·시체 0.02·경험 0.8}·상한 480분(8h)·음수→0**. 금·경험 얹고 시체는 곁에 깔아 준다(곧장 자원). loop 5s·unload 저장.
   - 판정(deepest=10): 1h→분60·금150·시체6·경험240 / 8h→분480·금1200·시체48·경험1920 / 12h→**8h 동일(상한)** / 음수→**0**. 컷 `tmp/hs_v243_off_{1h,8h,12h,neg}.png`.
② (a) 주인 큰 배너 폐지·이름은 머리 위 한 자리·부하 이름표/체력바와 겹치면 위로 물림(drawFloats 쌓기 결) (b) 우리뼈를 `drawBoneChunk` 상아 기둥으로(파랑−32 누런 상아·테두리·그림자) (c) 돌진 경고선을 `teleReach`(walkable 레이캐스트)로 벽에서 끊음 (d) 시체가 붉은 얼룩만 뜨던 건 `dir:"s"`→`mob/skelarch/s.png`(없음) 실패 탓 → `CORPSE_DIR` 로 `south` 로 폄 + 상아빛 몸 + 발밑 뼈 고리(화장/제물/소환 대상 표식). 컷 `boss_name·bonecage·tell_clip·corpse_art`.
- 되돌림 실측(결정적 재씨앗): 다섯 플래그 off → genFloor 지문 F4 **377768629**·F30 **2420594269** = HEAD(git stash) **byte-동일**. ★ 옛 기록값(2280763142/2526265781)과 다른 건 fp 자가 두 round-trip 으로 재 그 사이 루프가 전역 Math.random 을 갉은 «표류»(코드 회귀 아님). 만진 곳 `hs/`(main.js·index.html·hud.css)·새 자 파일 없음.
- 회귀(있는 자로만): `hs_v207_walk` 벽밖 **0%**·오류 **0** · `hs_v219_foeshot` frame p95 **1.4ms**·오류 **0**·다 규격 안 ✅. 새 키 없음(정산창은 아무 키·받기 단추로 닫음).

## ✔ 끝난 판: V-242 — 관문 주인 순서 판마다 굴림(①) · 시체 쓰는 길 둘(② M 화장·U 제물) · 떠오르는 글 겹침(③) (닫음 2026-09-02)
V-230 이 이미 주인 넷·수법·경고를 지었으니 ①은 **「굴리되」 하나**로 좁혔다 — bossKindFor 를 판 시작에 심는 base/step 산술로 바꿔 판마다 순서가 갈리고(뼈왕이 매 판 5층 지키던 것 사라짐) 이웃 층이 안 겹친다(step∈{1,3}·4와 서로소·Math.random 안 써 지문 불변). 만진 곳 `hs/`(loot.js·main.js·index.html), 새 자 파일 없음(베이커 `tmp/hs_v242_bake.mjs`·되돌림 `tmp/hs_v242_revert.mjs`).
① **주인 순서 굴림**(`__BOSSKIND`): s1=[2,3,0,1…] s2=[2,1,0,3…] — 이웃 안 겹침✓·고정식과 다름✓·판마다 다름✓. 넷은 컷·수법으로 갈림(뼈왕 우리뼈11+소환3 · 역병 독장판1 · 도살자 돌진 warn선 · 사제 저주4s+소환3).
② **시체 쓰는 길 둘**(`__CORPSEUSE`·새 키 **M**·**U**): M 화장 = 곁 시체 최대 2구를 태워 구당 마나 +34(실측 4→2·마나+68·남은 시체로 해골 2 → 소환과 다툼) · U 제물 = 곁 주인에 시체 3구를 바쳐 6초 피해 −40%·받는 피해 +35%(실측 4→1·저주6s·받는피해 1000→1350). 시체 부족하면 안 쓴다(고르는 맛).
③ 떠오르는 글 겹침: 유니크 둘이 한 자리에 떨어지면 이름+규칙 네 줄이 2px 로 겹쳐 안 읽혔다 → drawFloats 근접감지(INF)+줄 틈 9px(FGAP)로 쌓고(`__FLOATSTACK`) 주인 두 물건을 (m.x+54,m.y+22) 로 떼어 바닥 이름표도 안 겹침. 컷 float_text 다섯 줄 다 읽힘.
- 컷 **직접 열어 봄**: `tmp/hs_v242_{boss_a,boss_b,boss_c,boss_d,boss_tell,corpse_use1,corpse_use2,float_text}.png` — 넷 색조(창백·초록·핏빛·보라)·이름·수법·경고 갈림 · 화장 마나+68 · 제물 보라 저주 · 떠오르는 글 안 겹침. 콘솔 오류 0.
- 회귀(있는 자로만): `hs_v207_walk` 벽밖 **0%**·오류 **0**(WAKE 3000·820) · `hs_v219_foeshot` frame p95 **1.4ms**·오류 **0**·다 규격 안 ✅.
- 되돌림 실측: `__BOSSKIND=false __CORPSEUSE=false __FLOATSTACK=false` → genFloor 지문 F4 **2280763142**·F30 **2526265781** = V-239/240/241 동일(byte-동일·bossKind 는 지문에 안 들어감·산술이라 RNG 불변). 새 키 **M**(화장)·**U**(제물) → `#hint`·H 판·belt 갱신.

## ✔ 끝난 판: V-241 — 유니크(규칙형 넷) · 일지(도전 과제·L) · V-240 컷 흠 둘(막대 clamp · 해골 소품 크기) (닫음 2026-09-02)
물건이 전부 «수가 커지는 옵션»이라 주워도 노는 법이 안 바뀌고(PLAN ⑤) 되풀이할 목표도 없었다(PLAN ⑦). 만진 곳 `hs/`(loot.js·main.js·map.js·index.html·hud.css), 새 자 파일 없음(베이커 `tmp/hs_v241_bake.mjs`·되돌림 `tmp/hs_v241_revert.mjs`).
① **규칙형 유니크 넷**(`__UNIQUE`·보라 #c774ff·「유니크·규칙」·주인 35%+깊은상자 ≥8층 15%): 쌍생의 뼈지팡이(**twinRaise**·해골을 일으키면 둘) · 골수를 마시는 그릇(**corpseMana**·적 처치당 마나 +6) · 부서지는 유해의 투구(**boneBurst**·소환수 사망 시 반경 130 파편 (30+8·층)·소환수배수) · 피의 계약 인장(**bloodCast**·마나 모자라면 피로 시전 1마나=피2). 툴팁에 「~하면 ~한다」 규칙 글.
② **일지**(`__JOURNAL`·새 키 **L** — J 는 이미 보석구입이라 비어 있는 L 로) 도전 10개를 판이 자동으로 세고, 달성 시 영구 보상(자리+1·금·소환수%). localStorage `necro_journal_v1` 로 **회차·죽음·새로고침을 넘어** 남고 recalc 끝에서 얹는다.
③ 곁들임: `updateHUD` hp/mp/xp 막대 폭 `Math.max(0,Math.min(100,…))` clamp(값이 최대 넘어도 패널 안) · 서 있는 해골 소품(bones2)은 PROP_H(88~104) 그대로 두고 **그리기만 ×0.78**(69~81≈사람 75)해 발자국·RNG 불변.
- **판정(규칙 on/off 숫자)**: twinRaise off=1·**on=2** / bloodCast 마나0 off 실패·**on hp −50·ghoul+1·mana0** / boneBurst off=0·**on=103** / corpseMana off=0·**on=+6** — 넷 다 «규칙»(%증가 아님) ✅.
- 컷 **직접 열어 봄**: `tmp/hs_v241_{unique_drop,unique_tip,unique_a,unique_b,journal,journal_done,bar_clamp,prop_scale}.png` — 유니크 보라 라벨·툴팁 규칙 글·twin 3캐스트→해골 6·마나0 피 시전·일지 8/10 ✔+보상·막대 3배값에도 패널 안·해골 소품 사람 키. 콘솔 오류 0.
- 회귀(있는 자로만): `hs_v207_walk` 벽밖 **0%**·오류 **0**(WAKE 3000·820) · `hs_v219_foeshot` frame p95 **1.3ms**·오류 **0**·다 규격 안 ✅.
- 되돌림 실측: `__UNIQUE=false __JOURNAL=false` → genFloor 지문 F4 **2280763142**·F30 **2526265781** = V-239/240 동일(byte-동일). ★ 첫 시도에서 bones2 표를 줄였더니 F30 이 어긋났다(seed LCG 가 fp 사이에 안 리셋 → 층4 scatter 가 층30 을 민다) → 표는 두고 그리기만 줄여 고침. 새 키 **L**(일지) → `#hint`·H 판·NOW 갱신.

## ✔ 끝난 판: V-240 — 군세 갈래(구울 K · 골렘의 결 도발/막음) · 군세 구성 HUD · 이름표 접기/잘림 (닫음 2026-09-02)
적은 V-237 에서 갈래 셋으로 벌어졌는데 내 편은 «해골 하나»였다(골렘은 같은 스프라이트의 「센 해골」·구울은 없음). 「내가 짠 군대」를 벌렸다. 만진 곳 `hs/`(main.js·index.html), map.js·loot.js 안 건드림. 새 자 파일 없음(베이커 `tmp/hs_v240_bake.mjs`·되돌림 `tmp/hs_v240_revert.mjs`).
① **구울**(`__GHOUL`·기본 켬·새 키 **K**) — 시체 2·마나 25(해골 0 보다 조금 비싸고 골렘 40 보다 쌈)·자리 1칸. 싸고 빠르고 물러 터진다: hp ×0.45·spd ×1.5·dmg ×0.55 지만 atkCd 0.30s(짧은 연타)라 dps 는 해골과 엇비슷(F12 해골 257·구울 282). **피 빨기** drain 0.35 — 준 피해의 35%를 제 hp 로, 꽉 차면 남는 만큼 주인 회복(실측 주인 hp 1658→2083·+425). 초록 색조+작은 몸+초록 링+머리표로 갈린다.
② **골렘의 결**(`__GOLEMKIND`·기본 켬) — 「센 해골」을 그만둔다. **도발**(3.5s 마다 반경 240 안 적의 표적을 자기로 끌어옴·발밑 금빛 고리·실측 적 8마리 골렘에 붙음) + **몸으로 막음**(적을 골렘r+적r+4 밖으로 밀어 길을 튼다·닿는 자리라 도발 걸린 적은 골렘을 때린다). 돌빛 색조+큰 몸+머리표.
③ **군세 구성 HUD** — 「자리 n/8」 곁에 종별 수(해골·구울·골렘)를 적는다(실측 「자리 9/24 · 해골 3 구울 4 골렘 1」).
④ **이름표 접기/잘림**(`__LABELFOLD`·기본 켬) — 같은 이름 + 화면상 가까운 것끼리 묶어 「사수 ×N」 한 장으로(실측 사수 8 → 「×2」+「×5」 두 장) · 주인 이름표가 화면 상단 밖으로 잘리던 것을 글자 높이만큼 안으로 물린다(label_off 컷에서 「저주받은 사제」 화면 안).
- **판정(PLAN ③)**: 3해골·3구울·1골렘 8자리 군세에서 최대 점유 수 **42.9%**·자리 **37.5%** — 어느 종도 70% 안 넘음 ✅.
- 컷 **직접 열어 봄**: `tmp/hs_v240_{ghoul,ghoul_drain,golem_taunt,army_mix,hud_count,label_fold,label_off}.png` — 구울 초록·작음 · 골렘 도발 고리에 적 8 붙음 · HUD 종별 수 · 사수 ×N 접힘 · 주인 이름표 안 잘림. 콘솔 오류 0.
- 회귀(있는 자로만): `hs_v207_walk` 벽밖 **0%**·오류 **0**(WAKE 3000·820) · `hs_v219_foeshot` frame p95 **1.3ms**·오류 **0**·다 규격 안 ✅.
- 되돌림 실측: `__GHOUL=false __GOLEMKIND=false __LABELFOLD=false` → genFloor 지문 F4 **2280763142**·F30 **2526265781** = V-239 기록과 동일(genFloor·map.js 안 건드림·byte-동일). 새 키 **K**(구울) → `#hint`·H 판·NOW 갱신.

### 지난 후보(V-240 뒤에 집을 것)
다음 후보(전부 게임 안에 새로 생기는 것): **오프라인 진행**(PLAN ②·껐다 켜면 정산) · **군세 종류**(구울/골렘이 해골과 결이 다르게·PLAN ③) · **유니크 규칙형**(옵션 아닌 「판이 달라지는 물건」·PLAN ⑤) · **일지(도전 과제)**(PLAN ⑦). 자 축은 집지 않는다(09-01 23:07 지시).

## ✔ 끝난 판: V-239 — 회차(승천) · 21층+ 곡선 · V-238 컷 흠 둘(재고 잘림·소켓 표식) (닫음 2026-09-02)
한 바퀴(V-238)가 닫혔지만 «왜 계속 도나»가 「더 깊이」 하나뿐이었다. 되풀이할 이유(회차)와 깊은 층의 지루함(직선 곡선)을 함께 팠다. 만진 곳 `hs/`(main.js·map.js·loot.js 안 건드림·index.html·hud.css), 새 자 파일 없음(베이커 `tmp/hs_v239_bake.mjs`·되돌림 `tmp/hs_v239_revert.mjs`).
① **회차(승천)**(`__ASCEND`·`ASCEND_FLOOR=20`) — 마을에 승천 제단(genTown 소품 하나 더·statue 재사용+금빛 고리). `Y`(제단 곁): deepest≥20 이면 3택 창(핏빛 각인 피해+25% · 뼈 군세 자리+1·소환수+20% · 탐욕의 손 금+35%·드랍운) → 즉시 1층부터 다시(장비·성장·금 유지·deepest 0 되감아 다음 회차 재문턱). 회차마다 적 ×(1+0.12·회차). 배수는 `recalc` 끝에서 얹어 누수 0(실측 minion 픽 → 자리 8→9·소환수 1→1.2 / dmg 픽 → 1→1.25·겹치면 2회차 dmg 1.25). HUD mult 줄·enh 줄·성장창(C) 맨 위에서 회차·배수 읽힘.
② **21층+ 곡선**(`__DEEPCURVE`·20층 이하 불변) — hp 팽창을 꺾는다(20층 ×8.0 에서 기울기 0.35→0.22). 실측 적 hp중앙 F40 720→670·F50 999→**788(−21%)** / **dmg 는 안 건드림**(위험 유지·중앙 F50 64→64). 판의 결도 바꿈: 엘리트 2.1→3.8% · 무리 2~3→3~4(F50 팩 387→552) · **30층+ 주인 둘**(다른 주인·다른 방, 컷 deep40 에서 「저주받은 사제+뼈 왕」).
③ **상점 재고 마지막 줄 잘림** — `.shoplist` box-sizing+min-height 26·아래 여백·밑단 mask 페이드로 「잘린 글」이 아니라 「더 있음」으로 읽힘. **소켓 표식 ㅇ** — ○/● 글리프가 CJK 대체로 ㅇ 처럼 떨어지던 것을 «색 있는 작은 네모»(빈=테두리·낀=보석 색 채움)로 바꿈(툴팁·가방·장비줄·상점 넷 다).
- 컷 **직접 열어 봄**: `tmp/hs_v239_{ascend_locked,ascend_ready,ascend_pick,ascend_after,char_panel,deep21,deep40,shop_fix}.png` — 잠김「B20층 필요·12층 더」·준비「Y 승천」·3택 창·회차 후 1층인데 HUD「승천 1회」·성장창 ascline·21층 밀집·40층 주인 둘·재고 안 잘리고 소켓 네모. 콘솔 오류 0.
- 회귀(있는 자로만): `hs_v207_walk` 벽밖 **0%**·오류 **0**(WAKE 3000·820) · `hs_v219_foeshot` frame p95 **1.3ms**·오류 **0**·다 규격 안 ✅.
- 되돌림 실측: `__DEEPCURVE=false __ASCEND=false` → genFloor 지문(적 id·자리·hp·dmg·상자·제단·계단 포함) = 옛 코드(git stash) **동일** — F4 **2280763142**·F30 **2526265781** 둘 다 일치(21층+ 곡선도 끈 상태에선 byte-동일). 새 키 **Y**(승천) → `#hint`·H 판·NOW 갱신.

## ✔ 끝난 판: V-238 — 마을 · 상인(사고팔기) · 귀환/복귀 (닫음 2026-09-02)
`grep -c town|shop|마을|상점 hs/` = 0 이라 안전한 자리가 없었다 — 금은 제단 하나에만, 못 쓰는 물건은 가방에서 죽고, 숨 돌릴 자리가 없었다. 핵앤슬래시 한 바퀴의 «마을 절반»을 만들었다. 만진 곳 `hs/`(main.js·map.js·index.html·hud.css), 새 자 파일 없음(베이커 `tmp/hs_v238_bake.mjs`·되돌림 `tmp/hs_v238_revert.mjs`).
① **마을**(`__TOWN`·`genTown`) — `N` 귀환(적 안전반경 460 밖일 때·시전 1.4s·적 들면 끊김·발밑 금빛 고리) → 고정된 한 방(화톳불 둘·기둥·석상·관·항아리, 적 0·위험 0). 미니맵/#floor 가 「마을/안전 지대」로 읽힘. 문(`F`)으로 **가장 깊었던 층**(`G.deepest`)으로 복귀 — 진행 안 되감김(실측 복귀 후 `지하 6층`, deepest 6). 마을에선 웨이브·독장판 정지.
② **상인 둘**(`__MERCHANT`·`T` 로 곁에서 연다·같은 shaman 스프라이트에 색조+이름표 — 장물장수 호박빛·잡화상 청록, 컷에서 눈으로 갈림). **장물장수**: 재고 6~8칸(들를 때마다 `rollItem` 재굴림·값 레어도색·소켓 표식) · **팔기**(값 `itemValue`×0.30, 살 때 ×1.25) — ㉠ 한 칸 팔기 ㉡ **쓰레기 한꺼번에 팔기**(흰·매직). **잡화상**: 물약(벨트로)·보석을 제단 없이 산다.
- 값(재서): 귀환 1.4s·안전 460 · 팔기 30%·살 때 ×1.25 · 재고 6~8 · (6층) 물약 90◈·보석 440◈. 창은 `#inv` 결(`#shop`·hud.css).
- 컷 **직접 열어 봄**: `tmp/hs_v238_{town,merchant_stock,sell_before,sell_after,sell_junk,consum,back}.png` — 마을 전경(적0·상인 둘 눈으로 갈림)·재고 8칸 값·레어도색·팔기 전 gold6000→한 칸 +102(6102)→쓰레기 7개 +70(6172·junk 0)·잡화 구입 6172→5642(보석440+물약90)·복귀 `지하 6층`.
- 회귀(있는 자로만): `hs_v207_walk` 벽밖 **0%**·오류 **0**(WAKE 3000·820) · `hs_v219_foeshot` frame p95 **1.3ms**·오류 **0**·다 규격 안 ✅.
- 되돌림 실측: `__TOWN=false·__MERCHANT=false` genFloor 지문해시 = 옛 코드(git stash)와 **동일**(FP **4033867910**·씨앗7 층4·rooms13·packs30·town false·merchants0). genFloor 는 손 안 댐(map.js diff 는 genTown **추가**뿐) → RNG 안 흔들림. 새 키 **N**(마을)·**T**(상인) → `#hint`·H 판·NOW 갱신.

## ✔ 끝난 판: V-237 — 잡몹 갈래 셋(돌진꾼·사수·시체 도둑) · 겹치는 글판 · 장비줄 낀 칸 (닫음 2026-09-02)
적이 V-234~236 세 판 내내 그대로여서(잡몹은 `elite`·숨은 사수 빼면 다 같은 수법·자원인 시체를 위협하는 적 0) 갈래를 벌렸다. 만진 곳 `hs/`(main.js·map.js·hud.css), 새 자 파일 없음(베이커·되돌림자는 `tmp/hs_v237_*.mjs`).
① **잡몹 갈래 셋**(`__MOBKIND`) — 사수(`__RANGED_MOB` 정식 편입) · 돌진꾼(예고선→돌진) · **시체 도둑**(shaman 스프라이트+보라, 바닥 시체를 삼켜 없앤다·보라 넋 연출·삼키면 자기 회복). 실루엣(skelarch/brute/shaman)·색조·머리 위 이름표로 **눈에** 갈린다. 도둑 처치 시 삼킨 넋이 시체로 돌아옴(먼저 잡을 이유). 비율(재서): 사수35·돌진12·자폭6·도둑7 %p → 잡몹~40%(`THIEF_FRAC=0.14`, 위 셋 뒤에 얹음·off 면 Math.random 단락).
   재미 판정: **먹어 없앰**을 골랐다(되살림 아님) — 「서둘러 써라」 압박이 곧고 세다. 실측 컷에서 바닥 시체 **5→0**.
② **떠 있는 글판 안 겹침**(`__NOTESTACK`) — 세계-공간 판(제단 안내판) 화면 사각을 `reservedFloatRects` 로 남겨 drawFloats 가 피해 쌓는다(초록 구입글이 제단 판을 덮던 것을 위로 밀어냄) · 바닥 이름표에 화면-폭 clamp(「완벽 루비」 왼쪽 잘림) · 집는 글 칩에 금빛 왼쪽 띠.
③ **장비줄 낀 칸/빈 칸**(`__GEARCOLOR`) — 낀 칸 레어도 색+발광, 빈 칸 흐린 회색(`#5b5044`). V-235 는 둘 다 밝아 컷에서 안 갈렸다([[knob-that-does-nothing]] 확인).
- 컷 **직접 열어 봄**: `tmp/hs_v237_{kinds,charge_tell,thief_before,thief_after,notes,gear_crop}.png` — 갈래 셋 눈으로 갈림·붉은 돌진 예고선·시체 5→0·제단 판/구입글 안 겹침(둘 다 읽힘)·집는 글 화면 안·낀 칸 레어도 색(투구 노랑·부적 파랑)·빈 칸 흐림.
- 회귀(있는 자로만): `hs_v207_walk` 벽밖 **0%**·오류 **0**(WAKE 3000·820) · `hs_v219_foeshot` frame p95 **1.4ms**·오류 **0**·다 규격 안 ✅ (적이 늘어도 p95 안 넘음).
- 되돌림 실측: `__MOBKIND=false` genFloor 지문해시 = 옛 코드(git stash)와 **동일**(FP 2277375761·씨앗 고정 층4·513마리·thieves 0) → RNG 안 흔들림(byte-동일). `__NOTESTACK`·`__GEARCOLOR` 는 순수 렌더/HUD → 끄면 V-235/236 그림. 새 키 없음(도둑은 AI) → `#hint`·H 판 그대로.

## ✔ 끝난 판: V-236 — 아이템 심화(소켓·보석 박기) · 제단 이름표 화면 밖 잘림 (닫음 2026-09-02)
주운 물건에 사람이 손대는 길이 없던 것을 디아 결 «소켓+보석»으로 열었다. 만진 곳 `hs/`(loot.js·main.js·index.html·hud.css), 새 자 파일 없음.
① **소켓** 1~2칸 — 낮은 레어도에 더 잘(흰 0.55·매직 0.35·레어 0.18·유니크 0.08 +층 +0.015). 툴팁·장비줄·가방에 `○/●`(보석 색). 소켓 보석은 `sumAffixes` 합산(실측 gear.dmg 6→26·dmgMul 1.06→1.26).
② **보석 네 종×등급 셋** — 루비 피해%·사파이어 최대 생명·토파즈 금 획득%·에메랄드 소환수 피해% / 흠집난·보통·완벽. 처치 시 바닥 드랍(밝은 후광 원석) → 밟으면 주머니 → 인벤 창에서 보석 누르고 소켓 장비 누르면 박힘(못 뺌).
③ **제단에서 보석 구입 J**(`(70+30·(층-1))·(등급+1)`◈·층이 등급 올림) — 실측 금 9999→9929(−70). ④ **제단 이름표 clamp**(`clampLabelX`·떠 있는 panel 글도).
되돌림 실측(`__SOCKET`·`__GEM`·`__LABELCLAMP` 셋 다 끔): 소켓달린장비 0·보석구입 금 5000→5000·주머니 0·콘솔 오류 0.
- 컷 **직접 열어 봄**: `tmp/hs_v236_{socket,socket_before,socket_after,gem_floor,gem_buy,label,label_off}.png` — 소켓 ○→●·+20% 루비·바닥 원석 넷·금 줄어듦·이름표 잘림 vs 들어옴.
- 회귀(있는 자로만): `hs_v207_walk` 벽밖 **0%**·오류 **0**(WAKE 3000·820) · `hs_v219_foeshot` frame p95 **1.1ms**·오류 **0**·다 규격 안 ✅.
- ★ 새 키: **J** = 보석 구입(제단 근처). `#hint`·H 판·`docs/NOW.md` 갱신함.

### 다음 후보(V-235 뒤)
(전부 게임 안에 새로 생기는 것): 21층+ 곡선(밸런스) ·
아이템 심화 · 마을·상점(docs/PLAN.md) · 시체 쓸 곳 더. 자 축(`RET_OUT`·커버리지)은 집지 않는다(23:07 지시).

## ✔ 끝난 판: V-235 — 물약 벨트(1~4 살림) · 다 쓴 제단 구분 · 구매글/장비줄 읽히게 (닫음 2026-09-02)
V-234 컷 셋을 감시가 직접 열어 보고 낸 네 항목을 전부 고쳤다. 만진 곳은 `hs/`(main.js·hud.css·index.html), 새 자 파일 없음.
① **물약·벨트 1~4** — 생명(붉은)·마나(푸른) 두 종. 회복 비율(생명 maxhp×0.35·마나 maxmana×0.40, 즉효)이라 층이 오르면 등급이 오른다.
   처치 시 낮은 확률(잡몹 0.09·정예 0.22)로 병이 떨어짐 → 밟으면 벨트 칸에 쌓임(칸당 9). 칸이 물약 색·오른쪽 위 개수·오른쪽 아래 키.
   숫자 키로 마심. 금 쓰는 **새 길**: 제단(다 쓴 것 포함) 반경 90 안 **P** 로 물약 구입(`30+12*(층-1)`◈·여러 번·낮은 자원 쪽).
② 다 쓴 제단에 **꺼진 잿빛 점선 고리** — 흐린 석상과 갈린다. ③ 구매글에 검은 판+외곽선·키움(sz16) — 어둠에서 읽힘. ④ `#gear` 빈 칸을 `#a89468` 로 밝힘.
되돌림 각각: `__POTION=false`(①) · `__ALTARSPENT=false`(②) · `__BUYTEXT=false`(③) · `__GEARLINE=false`(④). 넷 다 끄면 콘솔 오류 0·물약 0·벨트 색 0·gear.readable false(실측).
- 컷 **직접 열어 봄**: `tmp/hs_v235_belt.png`(색·개수) · `_drink_bar_{before,after}.png`(생명 936→2111·벨트 4→3) · `_altar_close.png`(점선 고리·흐린 석상) · `_hud.png`(구매글 판·장비줄) · `_floor.png`(바닥 병이 후광으로 뜸).
- 회귀(있는 자로만): `hs_v207_walk` 벽밖 **0%**·오류 **0**(WAKE 3000·820 둘 다) · `hs_v219_foeshot` frame p95 **1.3ms**·오류 **0**·다 규격 안 ✅.
- ★ **바뀐 키(병수님 직접 조작)**: `1·2·3·4` = 물약 벨트(옛 소환 등급) · `X` = 소환 등급 순환(옛 등급 해금은 C 창) · `P` = 물약 구입.

## ✔ 끝난 판: V-234 — 금을 쓸 곳(뼈 제단) · 손잡이 줄이 손잡이를 덮는다 (닫음 2026-09-02)
V-233 컷 셋을 감시가 직접 열어 보고 낸 두 항목을 고쳤다.
① **뼈 제단** — 금을 쓰는 첫 자리. 층마다 방 하나에 하나(상자와 같은 길: 스폰·`propFits` 회피·몸막기·미니맵),
   피/뼈/재 셋 중 굴림 · **B**(반경 70)로 산다 · 한 층 한 번. 값 `120+60*(층-1)±조금`. 새 에셋 없이 `statue.png`+금빛 룬 고리+이름표(V-170 밑변).
   · 피 = 최대 생명 ×1.08(recalc `altarHpMul`·생명 둘 다·층 이월) · 뼈 = 소환 자리 +1(`altarSlots`) · 재 = 최저 `itemScore` 물건 옵션 다시 굴림(`rollAffixes`).
② **`#hint` 짧은 한 줄**(`.short` nowrap+max-width, 벨트 안 덮음) + **H** 로 전체 조작 판(`#inv`/`#char` 결·V·R·G·B 다 적음).
되돌림 `__ALTAR=false`(genFloor byte-동일 **실측 확인**) · `__HINTFOLD=false`(옛 긴 줄·H 안 켬).
- 컷 **직접 열어 봄**: `tmp/hs_v234_altar.png`(룬 고리·이름표) · `_buy.png`(금 5000→4860·생명 3315→3580·제단 꺼짐) · `_hint.png`(짧은 줄·H 판 열림).
- 회귀(있는 자로만): 벽밖 **0%**(`hs_v207_walk` WAKE 3000·820 둘 다·오류 0) · frame p95 **1.1ms**·오류 **0**(`hs_v219_foeshot`). 새 자 파일 안 만듦.

## ✔ 끝난 판: V-233 — 뼈벽을 뼈로 · 제물 붉은 기(핏빛) · 뼈 골렘 G (닫음 2026-09-02)
V-232 컷을 감시가 직접 열어 보고 낸 세 항목을 전부 고쳤다 — 컷 `tmp/hs_v233_{wall,feed,golem}.png` 를 **직접 열어 눈으로** 판정.
① 뼈벽 `drawBones` 의 `b.foe` 를 **뼈 토막(`drawBoneChunk`)**으로 — 하늘색 UI 막대가 뼈 마디 기둥이 됐다(적이 벽 밖에 막힘).
② 제물 `drawActor` 에서 **hue-rotate 를 빼고** 핏빛 덧칠 + 붉은 외곽 발광 — 먹인 것은 붉게 빛나고(보라 아님) 안 먹인 것은 푸르다.
③ **뼈 골렘 (G)** `raiseGolem` — 시체 5구를 모아 큰 소환수 하나(scale 1.9·slot 2·spd 0.6×·maxhp 4×·근접·마나 40). 컷에서 해골보다 ~1.9배·자리 3/8(2칸).
되돌림 `__GOLEM=false`·`__FEED=false`(끄면 옛 판과 byte-동일) · `__skillPose("golem")` 손잡이 추가.
회귀(있는 자로만): 벽밖 **0%**·오류 **0**(`hs_v207_walk`, WAKE 3000/820) · frame p95 **1.1ms**·오류 **0**·다 규격 안(`hs_v219_foeshot`).

## ✔ 끝난 판: V-232 — 시체를 쓰는 길 둘 더 (뼈벽 V · 시체 제물 R) (닫음 2026-09-02)
시체를 쓰는 길이 `raiseSkeleton`·`corpseNova` 둘뿐(둘 다 「없애 공격력으로」)이라 바닥 시체에 값이 없었다.
**지키는 쓸모(뼈벽)·키우는 쓸모(제물)**를 더했다. V-230 뼈 우리 자료(`G.bones`)를 되쓰고 새 에셋 없음.
① **뼈벽 (V)** — 마우스 반경 220 안 시체 ≤3구 → 마우스-사람 방향 **수직** 곧은 벽(토막 7·길이 170·마나 25).
   `foe:true` 라 `foeWallBlock` 이 **stepTo(적·소환수)** 한 자리에서 막고, `bonesBlock`(사람)은 `b.foe` 건너뜀 →
   사람은 제 벽 지남. `unstick`(walkable)은 안 건드려 **벽밖 0% 불변**. hp 기본×구수 · 유지 `PWALL_LIFE` 10초 ·
   뼈창/폭발이 제 벽 안 부숨(`!b.foe`) · `drawBones` 에서 푸른 토막.
② **시체 제물 (R, 살아 있을 때만)** — 사람 최근접 소환수에 반경 200 안 시체 1구(마나 20). `feed`+1(≤5) →
   완전 회복 + dmg ×(1+0.20feed)·maxhp ×(1+0.15feed) · 몸 `1+0.06feed` 커지고 붉은 기(drawActor 배율·hue-rotate).
   죽음 R 재시작 그대로(`!G.dead` 로 가름) · `raiseSkeleton` 에 `feed:0`.
③ 손잡이 줄(#hint)에 `V 뼈벽 · R 제물` · 되돌림 `__BONEWALL=false`·`__FEED=false`(끄면 옛 판과 byte-동일).
- 컷 **직접 열어 봄**: `tmp/hs_v232_wall.png`(푸른 세로 뼈벽·적이 벽 밖에 막힘) · `tmp/hs_v232_feed.png`(먹인 소환수 크고 붉음·안 먹인 것 작고 푸름).
- 회귀(있는 자로만): 벽밖 **0%**(`hs_v207_walk`, WAKE 3000/820 둘 다·오류0) · frame p95 **0.6~1.1ms** · 콘솔 오류 **0**(`hs_v219_foeshot`). 새 자 파일 안 만듦.

## ✔ 끝난 판: V-231 — 잡몹 수법 둘 (돌진 예고 · 자폭) (닫음 2026-09-02)
원거리 하나뿐이던 잡몹을 **셋**으로 갈랐다 — 돌진(예고 켬)·자폭 둘을 더했다. 새 에셋 없이 색조·몸피로 가른다.
① **돌진병 켬**(`__CHARGER_MOB` 기본 켬) + **예고 단계**(`CHARGE_TELE` 0.45s 멈춰 겨눔 → 방향 한 번 못박고 달림, 재조준 안 함) +
   `drawMobTele` 의 **붉은 돌진선** · 비율 0.30→0.18 · 색조 -40deg.
② **자폭병 새로**(`stepBomber`/`bombExplode`) — `m.r+46` 붙으면 점화(`BOMB_FUSE` 0.9s) → 반경 150 안 소환수 dmg×2.4·사람 dmg×1.5,
   자기도 `killEnemy` 로 죽어 시체 남김 · 발밑 붉은 고리+몸 부풂 · 비율 0.12 · 색조 +30deg · 스턴이면 fuse 정지.
되돌림 `__CHARGER_MOB=false` · `__BOMBER_MOB=false` (둘 다 끄면 옛 판과 byte-동일).
- 컷 **직접 열어 봄**: `tmp/hs_v231_mob_charge.png`(돌진선+마젠타 몸) · `tmp/hs_v231_mob_bomb.png`(블라스트 고리+붉은 부푼 몸) — 셋 색조 구분됨.
- 회귀(있는 자로만): 콘솔 오류 **0** · 몸벽밖 **0%**(`hs_v207_walk`, WAKE 3000/820 둘 다) · frame p95 **1.1ms**(`hs_v219_foeshot`). 새 자 파일 안 만듦.

## ✔ 끝난 판: V-230 — 층 주인 넷 (닫음 2026-09-01)
5·10·15·20층에 수법이 서로 다른 주인 넷 — 뼈 왕 · 역병 주술사 · 무덤 도살자 · 저주받은 사제. 예고·색조로 가름, 유니크 확정 드랍.
컷 `tmp/hs_v230_boss{5,10,15,20}.png`. 회귀: 오류 0 · 몸벽밖 0% · frame p95 2.8ms.

## ★ 검수기는 «한 번에 하나만» 돌린다 (2026-09-01 23:25 에 데였다)
V-229 가 다 못 돌고 **CDP timeout 으로 죽었다**(rc=1, 씨앗 1 만 마침). 코드 탓이 아니다 —
**V-230 판이 같은 시각에 같은 헤드리스 크롬(:9333)을 잡고 재기동**했다. 한 브라우저를 둘이
나눠 쓰면 뒤에 붙은 쪽이 통째로 날아간다. **띄우기 전에 `ps | grep hs_v2` 로 도는 판이 있는지 본다.**

## 다음 감시가 할 일 (순서대로)
1. **V-230·V-231 둘 다 닫혔다**(ROADMAP·NOW 둘 다). 다시 집지 말 것.
2. **다음 축을 하나 골라 띄운다**(아래 후보). 띄우면 `tmp/hs_current_axis.txt` + 위 「지금 도는 판」을 갱신한다.
3. 후보(전부 **게임 안에 새로 생기는 것**):
   · **21층+ 곡선** — 지금 주인 넷은 되풀이되되 체력·피해만 오르게만 해 뒀다(밸런스 손질).
   · 시체 쓸 곳(마나/벽/제물) · 아이템 심화 · 마을·상점(docs/PLAN.md).
   · 대기: V-224(발사체 벽밖) — 게임 결함이라 자가 아니다.
3. 자 축(`RET_OUT` · 커버리지 눈금)은 **집지 않는다.** 병수님 23:07 지시.
   ★ 자를 두 개 동시에 돌리지 마라 — 같은 헤드리스 크롬(:9333)을 나눠 쓰면 뒤엣것이 CDP timeout 으로 죽는다(23:25 에 데임).

## 닫힌 것 — 다시 집지 말 것
- **V-229** 닫음 = **기각** (23:25). 물러섬 유지 1.2s 로도 커버리지가 안 올랐다(면적 중앙 7.4% · 굶은 층 1).
  진동이 원인이 아니었다. 되돌림 `RET_HOLD=0`. **자 축은 여기서 끝.**
  덤: BEFORE 팔이 죽음 20% · 밴드 60% 로 V-228 AFTER(21.4%/71.4%)와 겹쳤다 — 눈금은 그만큼 믿는다.
- **V-228** 닫음 (2026-09-01 22:32). **게임 탓이 아니라 «자» 탓이었다.** 게임 손잡이 전부 고정,
  물러섬만 달았더니 죽음 53.3→21.4% · 밴드 33.3→71.4%. ⇒ **곱(16)·적 dmg 는 아직 만지지 않는다.**
  남은 흠은 커버리지 붕괴 하나이고 그게 V-229 다. 되돌림 `BOT_RETREAT=0`.
- **V-227** 닫음 = **기각**. 「길 위 남은 거리」 진척은 모든 깊은 층에서 더 나빴다. 되돌림 `NAV_PATHPROG=1`.
  ★ 축을 띄운 근거가 한 판짜리 표본이었다 — 깊은 층 커버리지는 **씨앗 편차가 증상보다 크다.**
- **V-226** 닫음 (`c64a282`). 깊이 곡선을 떼니 층5 압박비 5.97 → 1.01.
- **V-225** 닫음. 간선 규칙은 고쳤고 기본으로 남겼지만 게임 안에서는 경로없음 0 이라 원인이 아니었다. 되돌림 `NAV_LEGACY=1`.

## 지금 믿는 눈금 (물러서는 자 · 씨앗 1/2/3 × 층 1→5 · 2026-09-01 22:32 · V-228 AFTER)
  교전층 14/15(굶음 1) · 밴드 **71.4%** [≥25% ✓] · 죽음 **21.4%** [5~20% · 한 판 차이]
  hp최저 중앙 19% · 완주 271.2s [✓] · 커버리지 면적 **7.9%** / 방문 **23.1%** ◀ **이 자의 흠**
  회귀 벽밖 0% · 발사체벽밖 2.9% · 오류 0 · frame p95 50.1ms
  ★ 커버리지가 이 값인 동안에는 **이 눈금으로 새 축을 판정하지 말 것**([[ruler-coverage-is-a-number]]).

NOTE=병수님 07:23 「긴장은 니가 알아서 만들어라 왜 자꾸 나한테 정하래」 — 값은 재서 정하고
  되돌릴 손잡이만 남긴다. 「선택 대기」 금지.

--- 2026-09-03 V-268 닫음 (구현+검증·푸시) ---
AXIS=(열린 축 없음) — V-268 닫음 2026-09-03. 물건에 «그림»(__ITEMICON) · 세트 겉모습(__SETLOOK) · 「YOU DIED」→「죽었다」.
LAST=V-268
V-268 결과(다음 감시가 병수님께 보고할 것):
  만진 곳 hs/(main.js·index.html·hud.css)·loot.js/map.js 무접촉·새 자 없음(일회용 tmp/hs_v268_{fp,cut}.mjs).
  ① 물건 그림 __ITEMICON = 한 근원 drawItemIcon(iconBase 32×32 캐시·부위별 실루엣·레어도 테/광택·◆유니크).
     가방·장비줄(#gear)·바닥(drawItems)·상점(재고+팔기)·툴팁이 다 그것만 부름. DOM 칸은 iconDataURL 캐시.
     여덟 부위 갈림(낫/지팡이 두 갈래·투구·갑옷·장갑·신발·반지·부적).
     ★ 덫: cellDiv 의 `d.style.background=rc+"22"`(shorthand)가 background-repeat 를 repeat 로 되돌려 32px 아이콘이 타일됨
       → `backgroundColor` 로 고침(.icell.hasicon 은 contain·no-repeat).
  ② 세트 겉모습 __SETLOOK(그리기 전용) = 3점 다 낀 동안 발밑 초록(#4fe06a) 오라 + 어깨 룬 셋(맥박 ≈1.8초·알파 낮).
     2점은 표식 없음. V-266 시체 후광(푸름)과 색 안 겹침.
  ③ 「YOU DIED」→「죽었다」(index.html·.dtitle letter-spacing .08em·같은 붉은 결).
  되돌림 실측: __ITEMICON=false __SETLOOK=false → genFloor 지문 F1 4341720539·F3 cebe184b88·F5 07968a97a3·F10 e9e3aa0cbf·F30 b2bea5b359
    = 브리프 기준선 byte-동일(그리기/UI 전용·map.js 무접촉·tmp/hs_v268_fp.mjs).
  회귀(있는 자로만): hs_v207_walk 벽밖 0%·오류 0(WAKE 3000·820) · hs_v219_foeshot frame p95 1.4ms(≤16.7)·오류 0·에셋 100%·쏜화살 325.
    ① 매 프레임 그리기 늘어도 p95 규격 안(iconBase 캐시가 먹음).
  컷(직접 열어 판정·1512×863·씨앗1337): tmp/hs_v268_{icon_bag(여덟 부위+레어도 테),icon_bag_off(옛 글자 칸),
    icon_floor(바닥 부위 그림+이름표),icon_shop(재고·팔기 부위 그림),setlook_on(발밑 초록 오라),setlook_off(2점 표식 없음),died(죽었다)}.png. 콘솔 오류 0.
다음 감시: git log 에 V-268 구현 커밋 있으면 물러서도 된다. 컷 직접 열어 보고 병수님께 보고.
  ★ 크론 텍스트의 항목번호는 낡았다 — 이 파일 맨 끝(LAST=V-268)이 우선. docs/ROADMAP.md 맨 끝 열린 - [ ] 항목으로 다음을 고른다.

--- 2026-09-03 04:35 V-268 닫음 · V-269 착수 ---
AXIS=V-269 (감춘 방 `__SECRET` · 04:30 감시 흠 넷) — 04:34 띄움(PID 13322 · 브리프 `tmp/v269_brief.md`).
LAST=V-268 (닫음 · 통과)
V-268 컷 판정(04:30 감시가 일곱 장을 직접 열어 봄) = **통과**. 가방에서 여덟 부위가 한눈에 갈리고,
레어도 테 색도 갈린다. `icon_bag_off` 는 옛 글자 칸 그대로라 되돌림이 눈으로도 선다.
남은 흠 넷은 V-269 가 받았다: ㉠ 바닥 아이콘이 이름표 폭 1/4(글을 읽어야 안다) · ㉡ 죽음 화면 「B7층」 vs HUD 「지하 8층」 ·
㉢ 가방 칸 테 두 겹(작은 칸은 한 겹 — 들쭉날쭉) · ㉣ 세트 초록 오라가 노란 선택 고리 안에 겹쳐 고리 둘.
V-269 는 그 넷에 더해 **층에서 「찾아낼 것」**을 만든다 — `grep "비밀|secret" hs/*.js` = 0 이라 통째로 없던 축.

---
★ 14:30 감시 메모(다음 축 후보): `~/.openclaw/workspace/tmp/hs_watch_notes.txt` — ringsOn() 고리·크롭 상자·컷 DISMISS.
