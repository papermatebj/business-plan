# 프로토타입 영향 목록 (S7 입력 · S9~S12 입력·결과 · S13 입력 · D73 입력 · 정리 1단계 입력 · 정리 2단계 입력은 맨 아래)

> **확인 거리 기준(2026-10-17 D74):** 명세에 없는 세부(알림 채널·문구·묶음·재알림 시점, 상수 값, 드문 예외)는 개발·프로토타입에서 기본값으로 정해 ‘판단해서 넣은 것’에 적고 확인 거리로 올리지 않는다. 돈·법·고객 권리(고객이 손해를 보거나 권리를 잃는 것)에 걸리는 것만 확인 거리로 올린다.

> 작성: 2026-10-14 S6. 근거: 부록 B 반영(S2~S5)과 S6 교차 검사·결정(D17~D19)으로 바뀐 명세 규칙을 지금 프로토타입(`prototype/`)과 대조한 결과입니다.
> S7 진행 방법(서버·검증 도구·흐름 재실행·재게시)은 `docs/prototype-work/HANDOFF.md`를 그대로 따릅니다. 줄 번호는 2026-10-14 기준이라 고치다 보면 밀립니다. 함수 이름으로 찾으세요.
> E = `prototype/assets/engine.js`. 지금 엔진 검사 23개, 흐름 37개.

## 우선순위 표

돈 계산 → 상태 머신 → 화면 문구 순입니다. 크기: 작 = 몇 줄, 중 = 함수·패널 하나, 큼 = 새 흐름까지.

| 분류 | 항목 | 프로토타입 위치 | 지금 → 바꿀 내용 | 영향 검사·흐름 | 크기 |
| --- | --- | --- | --- | --- | --- |
| 엔진 계산 | B2(D1) 판비 공제 min | E `designCancel` · design.html `plate()`, 보류 답변 패널, 중재 패널 | 증빙만 있으면 판비 전액 공제 → 실비를 받아 `min(실비, 낸 판비)`. 파트너 '취소 보상'도 같은 값. 파트너 답변에 실비 입력 칸 | TC-09 보강 + 새 TC(실비 30,000 → 270,000·531,000 / 50,000 이상 → 250,000·511,000). 이 경로를 도는 흐름이 없어 새 design-after 흐름 필요 | 중 |
| 엔진 계산 | B1·D19 재주문 취소 | TC-09 REORDER 줄 · design.html 재주문 취소 | 검사 데이터를 판비 면제 250,000으로. **판비 0원 재주문**은 APPROVED·HANDED_OFF·**PREFLIGHT_REJECTED**에서 바로 취소·0원. **판비를 낸 재주문**은 확정 후 취소(CUSTOM_CANCEL)로 판비 공제 | TC-09 + 새 TC(판비 낸 재주문 → 공제) | 작~중 |
| 엔진 계산 | D18 확정 후 변경 건의 취소 | E `designCancel` · design.html 취소 버튼 | 변경 승인으로 DESIGNING이 된 건의 취소가 일반 취소(디자인비만) → CUSTOM_CANCEL(본사 중재, 디자인비 + 판비 공제). 생산 보류는 새 버전 전달 때까지 유지 | 새 TC | 중 |
| 엔진 계산 | 첫 시안 판정 = 기록 기준 | E `designCancel` | 상태(REQUESTED·ASSIGNED·IN_PROGRESS)로 판정하고 있으면 → ‘첫 시안 전달 시각’ 기록으로(전환 결제로 REQUESTED에 돌아가도 공제) | 새 TC | 작 |
| 엔진 계산 | B27 C-STL-01 예시 1 | settlement.html `events()`·`charges()`, 주석·하단 안내, 원장 | 프로 플랜 예시(274,550)뿐 → MVP 예시(재주문 10%·취소 보상 30,000 → 지급 655,000) 추가. 화면의 "예시 1·2"는 이제 "예시 2·3" | 새 TC(655,000, VAT 13,636·35,455·22,727) · settlement-flow·-view | 중 |
| 엔진 계산 | B51(D12=C) 사업자가 역전 경고 | E에 판정 함수 없음 · catalog.html `instantOf` | 즉시 할인 '사업자가 적용 안 함'으로 일반 할인가 < 사업자가면 경고만 띄움(계산은 그대로) | 새 TC | 작~중 |
| 엔진 계산 | B4 배송 묶음 3요소 | catalog.html 상세 안내 · benefit.html 쿠폰 문구 | 엔진은 이미 맞음. "같은 출고지끼리" → "같은 판매자·출고지·출고 유형", 쿠폰 "묶음당 1장"에 정의 | (선택) 새 TC: 같은 파트너 일반+맞춤 = 묶음 2개 | 작 |
| 상태 머신 | B11·B12 C-STATE-03 | E `DESIGN` 전이 · design.html `startRevision`·재업로드·보정 | REVISION → IN_PROGRESS를 REVISION → PROPOSED로. 재업로드·보정 → FILE_REVIEW(setState 우회 제거). 확정 후 변경 승인 출발 상태에 PREFLIGHT_REJECTED. 빠진 전이: 정리본 다름 → PROPOSED, 시안 회수, 템플릿형 → 맞춤형 전환(→ REQUESTED), 재주문 생성·취소, 자체 파일 반려 되돌림, 변경 건 취소(D18) | TC-16 보강 + 새 TC · design-flow.json(startRevision 클릭 삭제 — 확실히 깨짐) | 중 |
| 상태 머신 | B13(D3) 변경 건 30일 | design.html 시간 진행(tick) · E `DESIGN`·`ORDER_CUSTOM` | 변경 건도 자동 취소됨 → 본사 [이전 확정본 복원]: 디자인 요청 HANDED_OFF, 주문 항목 DESIGN_CONFIRMED, `NOTI_DESIGN_RESTORED` | 새 TC · 새 흐름 | 중 |
| 상태 머신 | B14(D4)·D17 재제작·EXCHANGED | E `ORDER_CUSTOM` · design.html 배송 완료 버튼·파트너 탭 | EXCHANGED·RETURNED와 재제작 갈래가 없음 → [재제작 요청], 파트너 '재제작' 탭, 재제작품 배송 완료 → EXCHANGED(끝 상태, 7일 뒤 정산), 이미 정산된 건은 새 정산 없음. **EXCHANGED에서도 불량 재제작·반품을 다시 받음**(기한은 그 물건 받은 날부터). 재제작 검수 2영업일 초과 = 재제작 승인 | 새 TC · 새 흐름 | 큼 |
| 상태 머신 | B25(D8) 이의 제기 | order.html `creqBox` · 페이지 정의 `ORDER_CANCEL_CLAIM` · E `CLAIM_RETURN` | 취소 거부 쪽은 안내 글만 → [이의 제기] 버튼과 중재 전이. '거부 유지' 전이를 엔진에(지금 setState 우회). 고객 라벨 '판매자 거부'. **확정 후 취소 기각은 이의 제기 없음**, 확정 후 취소 철회 전이 | order-claims 보강(rejectCancel 쓰는 흐름 없음) | 중 |
| 상태 머신 | B36 예고 24시간 | design.html 시간 진행 · room.html 무응답 처리 | +7일을 한 번에 누르면 예고와 본 처리가 같은 순간 → 예고 시각을 저장하고 24시간(`notify.notice_min_hours`) 지난 뒤에만 보류·자동 취소 | design-flow·room-flow | 작 |
| 상태 머신 | B15 P-PRD-07 수정본 | catalog.html `CATALOG_DESC` | FIX·EDITING만 → EDITING → IN_REVIEW → APPLIED / NEEDS_FIX / DECLINED, 본사 [수정 반려] | catalog-flow·-desc | 작~중 |
| 상태 머신 | B41(D10) 계정 상태별 열람 | partner.html 메뉴·주문·다운로드 | 계약 종료면 메뉴가 '정산'만 → 남은 주문 처리 가능, 엑셀·패키지 다운로드 막힘, 남은 주문 배송 완료 뒤 고객 정보 가림 | partner-flow | 작~중 |
| 상태 머신 | B16 정산 라벨 | E `SETTLEMENT` · settlement.html | '보류·확정' → '정산 보류·정산 확정' | settlement 흐름 4개(스크린샷만) | 작 |
| 상태 머신 | B38 파일 검사 결과 4종 | system.html `SYS_FILE` · room.html 파일 상태 | 결과 둘 → 넷(검사 불가·실패는 재검사 1회 뒤 격리 + `NOTI_INT_FILE_SCAN_FAILED`) | system-flow | 작~중 |
| 상태 머신 | B33 지급 결과 모름 | settlement.html PG 응답 | 성공·계좌 오류뿐 → '응답 없음'이면 지급 요청 '확인 중'(정산 확정 유지) | settlement-fail | 중 |
| 화면 문구 | B17 제작 기간 | catalog.html 상세 · design.html 타임라인 | "디자인 확정 후 N일" → "[인쇄 가능] 확인일부터". 예상 도착에 파트너 인쇄 확인 1일. 요청 출고일은 '확인일부터 N영업일' | catalog-flow·design-flow | 작 |
| 화면 문구 | B45·B50 버튼·배지 | design.html 주문·룸 버튼 | [문구 변경 요청] → [확정 후 변경 요청]. '변경 요청 중·취소 중재 중' 배지. 요청할 때 공제 동의(판비는 최대 낸 판비). 판비 면제 재주문은 [취소](바로, 0원) | design-flow | 작 |
| 화면 문구 | B5(D2) 판 보관 | catalog.html 맞춤 단가 · E `POLICY` | 읽기 전용 칸 → 관리자 값 이상으로 '늘리기만'. 라벨 '판 보관 최소 기간'. 결제 때 기간을 남긴다는 안내 | catalog-custom | 작 |
| 화면 문구 | B44 생년월일 | member.html 관리자 회원 상세 | '생년월일' 행 → "만 나이 확인 결과·시각만 저장, 생년월일·성별 저장 안 함" | member-flow | 작 |
| 화면 문구 | B43 로그인 유지·파트너 보안 | member.html · partner.html | `member.login_keep_days` → 웹 30일·앱 최대 90일 + [모든 기기에서 로그아웃]. 파트너: 5회 실패 잠금·OTP 앱·30분 자동 로그아웃 | member-flow·partner-flow | 작 |
| 화면 문구 | B28·B32 정산 | settlement.html | 직영 관련 줄에 '3차'. 마감 = "그날 자동 구매 확정 배치가 끝난 뒤, 그 뒤 기록된 이벤트는 다음 주기" | settlement-flow | 작 |
| 화면 문구 | B63 연간 멤버십 | benefit.html 손익 패널 | 연간 회원 손익 **약 −2,750원/월**(S6 검산값, 월간 회원보다 약 1,450원 나쁨) 한 줄 | benefit-flow | 작 |
| 화면 문구 | B46 원본 파일 | design.html `buySource` | 결제 뒤 [원본 파일 다운로드]와 환불 제한 고지(법률 자문 전 초안 표시) | — | 작 |
| 화면 문구 | 정책값 키 | E `POLICY` | 새 키 추가: `notify.notice_min_hours`·`calendar.*`·`file.scan_timeout_minutes`·`member.web_keep_login_days`·`member.app_keep_login_days`·`notify.ad_send_hours`·`product.detail_image_max`. 위 항목을 고칠 때 같이 | TC-18 영향 없음 | 작 |

**이미 맞음(확인만)**: B47 상품 상세 가격 두 벌(32,000원·1매당 28원~ / 31,000원·공급가 28,182원·1매당 27원~), B49 결제수단↔증빙(order.html).

**해당 없음**: B6·B7·B8·B21·B26(2차), B9·B10·B18~B20·B22·B30·B59~B62(기획서 수치·문구, 프로토타입에 사업 시뮬레이터 없음), B24(관리자 주문 상세 화면 없음), B29(검색 순위 식 없음), B31·B34·B37·B39(DB·결제창 이탈·배송지 변경·백업 화면 없음), B40·B42(선택), B48(여러 품목 디자인 없음).

**검사·흐름 예상**: 엔진 검사 23개 → 약 30개(TC-09·16 수정, 판비 min·MVP 정산 655,000·C-STATE-03 전이·재제작 EXCHANGED·변경 건 복원·변경 건 취소·판비 낸 재주문·사업자가 역전 판정 추가). 확실히 깨지는 흐름은 design-flow 하나(startRevision 클릭). 확정 후 취소, 재제작, 변경 건 복원, 취소 이의 제기는 지금 도는 흐름이 없어 새로 만들어야 합니다.

## S7 시작 때 정할 것

1. 정산 화면 기본 시나리오를 MVP 예시(655,000)로 바꿀지, 지금 프로 플랜 예시와 토글로 둘지.
2. 사업자가 역전 경고를 어디에 띄울지 — 파트너 즉시 할인 설정 화면이 없어서 catalog 파트너 가격 패널에 둘지.
3. 공휴일 달력(B35)을 엔진에 넣을지 — 넣으면 시나리오 기간의 10/9(금, 한글날)이 걸려 기한 숫자가 바뀔 수 있음.
4. B33(지급 결과 모름)·B38(파일 검사 결과 4종)은 명세 규칙이지만 프로토타입에서는 선택 — 넣을지.
5. 범위: 표 전체(약 25건, 새 흐름 4개)를 한 세션에 할지, 돈 계산·상태 머신만 먼저 할지.

## S7 결과 (2026-10-14)

**정한 것**(AskUserQuestion, 모두 추천안): ① 정산 화면은 토글, 기본은 MVP 예시(655,000원) ② 사업자가 역전 경고는 catalog 파트너 가격 패널 ③ 공휴일 달력은 정책값 키와 안내만, 계산은 주말만 ④ 범위는 표 전체 + B33·B38.

**검사**: 엔진 검사 23 → 33개(TC-09 판비 min으로 고침, TC-24~33 새로: 첫 시안 기록 판정 · D19 재주문 취소 · D18 변경 건 취소 · MVP 정산 655,000 · C-STATE-03 전이 · 재제작 EXCHANGED · 이의 제기 · 역전 경고 · 예고 24시간 · 새 정책값 키). 흐름 37 → 63개(hub 제외).

| 항목 | 처리 | 어디 |
| --- | --- | --- |
| B2(D1) 판비 공제 min | ☑ `designCancel`에 `plateCost`(증빙 실비) — 공제 = 취소 보상 = min(실비, 낸 판비). 파트너 답변 실비 30,000/70,000 선택 | E · design |
| B1·D19 재주문 취소 | ☑ 판비 0원 재주문은 APPROVED·HANDED_OFF·PREFLIGHT_REJECTED에서 [취소] 바로·0원(`reorder_cancel`), 판비 낸 재주문은 CUSTOM_CANCEL | E · design |
| D18 변경 건 취소 | ☑ `afterChange` 표시 → 확정 후 취소(본사 중재, 디자인비 + 판비), 생산 보류는 새 버전 전달까지 유지 | E · design |
| 첫 시안 = 기록 기준 | ☑ `designStage({state, firstProposed, afterChange})`. 맞춤형 전환으로 REQUESTED에 돌아가도 공제 | E · design |
| B27 MVP 정산 예시 | ☑ 토글(기본 MVP 655,000 / 예시 2 274,550), 옛 '예시 1·2' → '예시 2·3' | settlement |
| B51 사업자가 역전 | ☑ `GC.price.bizInversion` + 파트너 [즉시 할인] 패널(사업자가에도 적용/적용 안 함) 경고만 | E · catalog |
| B4 묶음 3요소 | ☑ 문구 | catalog · benefit |
| B11·B12 C-STATE-03 | ☑ DESIGN 전이표 전면 교체(16개 상태 모두 등장), REVISION → PROPOSED, 재업로드·보정 → FILE_REVIEW, 회수·전환 결제·정리본 재확정·자체 파일 반려 되돌림 | E · design |
| B13(D3) 변경 건 30일 | ☑ 30일째 운영 확인 목록 → 본사 [이전 확정본 복원] → HANDED_OFF·DESIGN_CONFIRMED·보류 해제·`NOTI_DESIGN_RESTORED` | E · design |
| B14(D4)·D17 재제작 | ☑ [재제작 요청]·파트너 '재제작' 탭·EXCHANGED(끝 상태, 정산된 항목은 새 정산 없음)·재제작품 재불량·검수 기한 초과 = 재제작 승인·환불 선택 → RETURNED | E · design |
| B25(D8) 이의 제기 | ☑ 취소 거부에도 [이의 제기]·본사 중재 두 갈래, `CLAIM_CANCEL` 엔진으로, 거부 유지 전이(`mediation_partner`), 라벨 '판매자 거부'. 확정 후 취소 기각·철회는 design | E · order · design |
| B36 예고 24시간 | ☑ `GC.notice.elapsed` — 예고 뒤 24시간 지나야 보류·자동 취소, 예고가 늦으면 그날은 예고만 | E · design · room |
| B15 수정본 상태 | ☑ `PRODUCT_REVISION`, 본사 [수정 반려] | E · catalog |
| B41(D10) 계정 상태별 열람 | ☑ 열람 표 5행, 정지·종료 뒤 다운로드·[인쇄 가능] 막힘, 배송 완료 뒤 고객 정보 가림 | partner |
| B16 정산 라벨 | ☑ '정산 보류·정산 확정' | E · settlement |
| B38 파일 검사 4종 | ☑ 통과/감염/검사 불가/실패·시간 초과(1회 재검사 → 격리 + `NOTI_INT_FILE_SCAN_FAILED`), 올린 사람에게 '확인 중' | system · room |
| B33 지급 결과 모름 | ☑ 요청 키 먼저 저장, 응답 없음 → 지급 요청 '확인 중'(정산 확정 그대로), PG 조회 세 갈래 | settlement |
| B17 제작 기간 | ☑ '[인쇄 가능] 확인일부터 영업일 N일', 예상 도착에 인쇄 확인 1영업일 | catalog · design |
| B45·B50 버튼·배지 | ☑ [확정 후 변경 요청]·[취소 요청], 배지 '답변 필요·변경 요청 중·취소 중재 중', 요청할 때 공제 동의, [요청 철회] | design |
| B5(D2) 판 보관 | ☑ 파트너 칸 늘리기만(짧으면 오류), 결제 스냅샷 안내 | catalog · design |
| B44 생년월일 | ☑ '만 나이 확인 결과·시각만 저장' | member |
| B43 로그인 | ☑ 엔진 키 웹 30일·앱 90일, [모든 기기에서 로그아웃] / 파트너 5회 잠금·OTP·30분 | member · partner |
| B28·B32 정산 | ☑ 직영 '3차', 마감 = 자동 구매 확정 배치 뒤 | settlement |
| B63 연간 멤버십 | ☑ 손익 패널 연간 회원 −2,749원/월(같은 가정으로 계산한 값, 옆에 기획서 11장 "약 −2,750원"을 함께 적음 · 월간보다 약 1,450원 나쁨) | benefit |
| B46 원본 파일 | ☑ 결제 뒤 [원본 파일 다운로드]·7일 링크·환불 제한 고지(초안) | design |
| 정책값 키 | ☑ 새 묶음 '공통 · 영업일·배치'(맨 앞) + 키 9개(문자열 값 3개는 보기만) | E · ui · system |

**판단해서 넣은 것(결정과 다르면 고칠 것)**
- design: 확정 후 변경 기각·취소 기각 뒤에도 변경 건이면 생산 보류 유지 · 재제작 대신 환불은 '상품 대금·판비'를 돌려주고 디자인비는 귀책 판정(A-ORD-02)에 따른다고만 표시 · '답변 필요' 동안 SLA는 멈췄다가 기다린 시간만큼 미룸 · 회수(10분 안)·수정 요청 취소(10분 안) 버튼 추가.
- order: 취소 거부 이의에서 고객 주장 인정 = 회수 뒤 환불(반품 규칙 준용), 주문 항목은 반품 완료로 닫음 · 이의 내용·사진 입력 칸은 생략.
- settlement: 일반 주문을 한 줄로(항목별로 나누면 VAT 공급가 13,637 vs 명세 13,636) · '송금 안 됨' 확인 → 정산 보류 → 다음 지급일에 같은 키로 재요청(A-STL-02) · 계좌 오류 뒤 새 요청 키 회차 2 · 토글은 [처음부터] 뒤에도 유지.
- catalog: 진행 중 즉시 할인은 키우는 변경만, '적용 안 함 → 적용'은 키우는 변경으로 봄 · 페이지 상수 `print_check_bd`(1영업일)·`promo_max_days`(90일).
- partner·member: 비밀번호 '3종 조합' = 영문·숫자·특수문자 · 정지·종료 중 배송 완료 주문은 90일 안이어도 가림 · [모든 기기에서 로그아웃]은 지금 기기 포함.
- system·room: 공통 묶음 권한은 최고관리자 · `notify.notice_min_hours` 범위 24~72시간 · 디자이너에게는 검사 중 파일의 개수만 보임.

**남은 확인 거리(명세·엔진, 이번엔 손대지 않음)**
- C-STATE-01·엔진 ORDER에 '출고 뒤 취소가 이의로 인정된 경우' 줄이 없음(지금은 반품 완료로 닫음).
- `PRODUCT_REVISION`에 IN_REVIEW → EDITING '검수 요청 취소'(P-PRD-07 예외)·수정본 버리기·판매 종료 때 닫기 전이 없음. `SETTLEMENT`에 정산 보류 → 지급 완료 직행 없음(재지급은 다음 주기).
- 정책값 키 후보: `partner.password_min_length`·`partner.login_fail_max`·`partner.idle_logout_minutes`, 파트너 인쇄 확인 기간(1영업일), 즉시 할인 기간 최대(90일).
- 알림 코드 없음: 파트너 계정 잠금·OTP 재등록, 고객 '제작 파트너 변경', 올린 사람에게 파일 검사 결과(감염·검사 불가).
- 클레임 완료의 고객 라벨이 결과별(거부 확정·철회)로 나뉘지 않음(페이지에서 덮어씀).
- 일반 주문 정산의 VAT 반올림 단위(주문 한 줄 vs 항목별).


---

# S9 입력 — S8 결정(D20~D33)과 맞춤 목록의 프로토타입 영향 (2026-10-15 작성)

> 근거: `decisions.md` 맨 아래 'S8 남은 확인 거리 — D20~D33'과 'S8 맞춤 목록'. 명세·기획서·요청서는 S8에 고쳤고, 프로토타입은 아직 그대로입니다.
> 진행 방법(서버·검증 도구·흐름 재실행·재게시)은 S7과 같이 `docs/prototype-work/HANDOFF.md`를 따릅니다. 지금 엔진 검사 33개, 흐름 63개(hub 제외). 줄 번호 대신 함수·상수 이름으로 찾으세요.
> 위 'S7 결과'의 '남은 확인 거리' 6건은 S8에서 모두 정리됐습니다(출고 뒤 취소 = D23, 수정본 전이 = D27 + 맞춤, 정책값 키 = 맞춤, 알림 코드 = D32 + 맞춤, 클레임 완료 라벨 = D30, VAT 단위 = D22).

| 분류 | 결정 | 프로토타입 위치 | 지금 → 바꿀 내용 | 영향 검사·흐름 | 크기 |
| --- | --- | --- | --- | --- | --- |
| 돈 | D22 VAT 단위 | E `vatSplit`·`confirmEvent`, settlement MVP 모드(일반 주문 한 이벤트) | MVP 모드도 항목별 2행(수저집 81,000 · 냅킨 58,000, 배송비는 냅킨 행), 일반 주문 공급가 13,636 → **13,637**·VAT 1,363 | tests/engine.test.js(13636 기대값), flows/settlement-mvp*.json('13,636') | 중 |
| 돈 | D20 판비 | E 가격 계산(`priceCalc` 계열), catalog 맞춤 단가·주문서 미리보기, design 판비 공제 | 판비를 ① 상품 금액 줄로(즉시 할인 '판비 범위' 선택 시 할인, 본사 상품 쿠폰 안분 대상, 50만원 판정 제외). 판비 공제 상한 = 판비 줄의 결제 금액(할인·안분 뒤) | 엔진 검사 새로(판비 할인·안분·공제 상한) | 중 |
| 돈 | D21 쿠폰 | E `hqCoupon.includeDesignFee` → 상품 할인 쿠폰(장바구니·상품 중 1) + `designCoupon`(디자인비에만) 두 자리, benefit·order 쿠폰 선택 | '디자인비 포함' 켜기 없앰. 신규 가입 쿠폰 + 첫 디자인 무료 쿠폰 동시 적용 예 | 엔진 검사 새로(두 자리 동시), benefit 흐름 | 중 |
| 돈·상품 | D24 추가 구성품 + 옵션 3단 | catalog(파트너 옵션 등록·고객 상품 상세), order(장바구니·주문서·주문 상세), E 가격 계산·상태 | 옵션 3단 조합, 추가 구성품 등록(최대 20, `product.addon_max`)·고객 선택(본 상품 필요, 품절 구성품만 막음)·본 상품 줄 아래 붙은 줄·따로 된 주문 항목(혼자 취소, 본 상품 취소 시 출고 전 함께 취소)·파트너 할인 제외·50만원 제외 | 새 흐름(catalog-addon), 엔진 검사 새로 | 큼 |
| 상태 | D23 출고 뒤 취소 이의 인정 | order(취소 거부 이의 → 인정), E `CLAIM_CANCEL` | 지금 동작(회수 뒤 환불, RETURNED)은 그대로. 완료 결과 `REFUNDED`로 표시, 엔진에 '취소 이의 인정 회수' 이벤트 이름 정리 | order 흐름 | 작 |
| 상태 | D27 수정본 | E `PRODUCT_REVISION`·`PRODUCT`, catalog 수정본 패널 | IN_REVIEW → EDITING [검수 요청 취소], EDITING·NEEDS_FIX → DISCARDED [수정본 버리기], 판매 종료 때 열린 수정본 DISCARDED(SUSPENDED 중엔 그대로), `PRODUCT` IN_REVIEW → DRAFT | 엔진 검사 새로, catalog 흐름 | 중 |
| 상태 | 맞춤(정산 보류 해제) | E `SETTLEMENT` | ON_HOLD → CONFIRMED(지급 실패·장애 보류 해제, 확정 금액 그대로 다음 지급 목록) 추가. 지금은 SCHEDULED로만 감 | settlement 흐름 | 작 |
| 상태·문구 | D30 클레임 완료 라벨 | E `CLAIM_RETURN`·`CLAIM_CANCEL` 고객 라벨, order·design의 페이지 덮어쓰기(`REMAKE_LABEL` 등) | `result`(REFUNDED·EXCHANGED·REMADE·REJECTED·WITHDRAWN·DISMISSED)에서 라벨을 뽑고 페이지 덮어쓰기 제거 | order·design 흐름 라벨 기대값 | 중 |
| 상태 | D33 제작 파트너 변경 | partner(정지·종료 일괄 처리, 임시 상태 `MOVED`), order(주문 상세), E | `MOVED` 없앰 → 운영 제안 → 고객 [변경 동의]/[전액 환불], 7일(`order.partner_change_reply_days`)·하루 전 다시 알림·예고 뒤 24시간 무응답 환불, 동의 시 상태 그대로 파트너만 바뀜·확정 건 패키지 재전달(HANDED_OFF), 차액(싸면 환불, 비싸도 더 안 받음). 알림 `NOTI_ITEM_PARTNER_CHANGE_PROPOSED`·`NOTI_ITEM_PARTNER_CHANGED` | 새 흐름(partner-change), partner 흐름 | 큼 |
| 화면 | D28 허용 오차 | design 확정 체크리스트·사양 요약·스냅샷 | '±3%' → '수량 ±3%·인쇄 위치 ±2mm(상품 설정값)' | design 흐름 문구 | 작 |
| 화면 | D29 규제 안내 | catalog 상품 상세(고객), system 또는 catalog 카테고리 관리 | 카테고리 '규제 안내 문구' 칸 + 상품 상세 접힌 상자(고친 날짜) | catalog 흐름 | 중 |
| 화면 | D25 재입고 | catalog 품절 표시 | '재입고 알림 받기' 버튼이 있으면 2차 표시, MVP는 예정일만 | — | 작 |
| 화면 | D31 알림 채널 | member 알림 설정 | 필수 알림 채널 선택이 있으면 없앰(마케팅 채널만) | member 흐름 | 작 |
| 정책값 | 맞춤 + D26 | E 정책값 목록(`policies`), system 정책값 화면, catalog(`print_check_bd`·`promo_max_days` 페이지 상수), partner(보안 값) | 새 키: `security.password_min_length`·`security.login_fail_lock`·`security.idle_logout_minutes`·`production.print_check_bd`·`promo.instant_discount_max_days`·`promo.instant_discount_max_targets`·`product.addon_max`·`order.partner_change_reply_days`, `file.max_size` → `file.max_size_chat`·`_original`·`_logo`·`_image`. 페이지 상수를 키로 바꿈. system 파일 표: 로고 100MB(1개)·참고 이미지·간판 사진 행, 칼선 500MB | 엔진 검사(TC-33 정책값 키 목록) | 중 |
| 알림 | D32 + 맞춤 | partner·catalog·system·room의 `app.notify('코드 없음', …)` | 코드 붙이기: `NOTI_PARTNER_ACCOUNT_LOCKED`·`NOTI_PARTNER_OTP_RESET`(대표자), `NOTI_FILE_SCAN_REJECTED`·`NOTI_PARTNER_FILE_SCAN_REJECTED`·`NOTI_INT_FILE_SCAN_REJECTED`, `NOTI_PARTNER_PRODUCT_SUSPENDED`·`NOTI_PARTNER_DOC_EXPIRY_NOTICE`, `NOTI_PARTNER_ACCOUNT_SUSPENDED`·`NOTI_PARTNER_TERMINATED`, `NOTI_PARTNER_PRINT_CHECK_DUE`·`NOTI_INT_PRINT_CHECK_LATE`, `NOTI_BIZ_STATUS_CHECK`, `NOTI_PARTNER_INVESTIGATION_NOTICE`·`_RESULT` | 흐름의 알림 로그 기대값 | 작 |
| 화면 | 맞춤(버튼 이름) | catalog 상품 상세 | 맞춤 진입 버튼이 [디자인 요청하고 주문]이면 [맞춤 제작으로 주문하기]로, 옵션·수량 → 방식 선택 순서 | catalog 흐름 | 작 |

**S9 시작 때 정할 것(추천안)**: ① 추가 구성품을 catalog·order 두 페이지 모두에 넣을지(추천: 둘 다, 흐름 하나로 이어 보기) ② 제작 파트너 변경을 partner(운영 일괄 처리)와 order(고객 동의) 중 어디서 시작해 보여줄지(추천: partner에서 정지 → order에서 동의/환불로 이어지는 흐름 하나) ③ 범위(추천: 표 전체).

**S9에 함께 할 것(2026-10-16 추가, HANDOFF S9 행)**: ④ 쿠폰·포인트 소멸 알림 기준 — U-BEN-01은 ‘만료 7일 전, 마케팅 동의자만’, C-NOTI-01 `NOTI_BENEFIT_EXPIRE_SOON`은 ‘30일 전, 제한 없음’이라 하나로 정해야 함(결정 거리, 정하면 명세 → 필요하면 benefit 페이지 알림) ⑤ 인쇄 원본 형식 — D-ROOM-03 표 ‘AI·PDF, 최대 500MB’와 C-FILE-01 ‘AI·PDF·PSD·SVG, 500MB’를 맞춤(C-FILE-01이 단일 기준이라 D-ROOM-03을 따라 고칠 가능성 큼) ⑥ 요청서 390px 가로 넘침 — S8에 표 글자·와이어 한 줄이 늘었는데 브라우저로 다시 보지 않음. 흐름 재실행 때 `sikup-design-brief.html`도 390px로 열어 가로 스크롤 0인지 확인.


---

# S9 결과 (2026-10-16, 반영·재게시 끝)

> 시작 때 정한 것: ① 추가 구성품 = catalog·order 둘 다 ② 제작 파트너 변경 = partner에서 시작 → order에서 고객 동의/환불 ③ 범위 = 표 전체 ④ 소멸 알림 = 쿠폰·포인트 두 행으로 나눔(**D34**) ⑤ 인쇄 원본 = C-FILE-01을 AI·PDF로 좁힘(**D35**). 모두 추천안. 결정 내용은 `decisions.md` 맨 아래 'S9 남은 확인 거리 — D34~D35'.
> 진행 방식: 엔진은 메인 세션, 페이지는 서브에이전트 6개(catalog / order / partner+member / settlement+benefit / system+room / design)가 자기 파일만 고침.

## 끝난 것

**문서(원본 HTML)**
- ④ D34: 명세 C-NOTI-01 `NOTI_BENEFIT_EXPIRE_SOON` 한 행 → `NOTI_COUPON_EXPIRE_SOON`(쿠폰 만료 7일 전, 마케팅 수신 동의자만·광고성 여부 확인 전, 앱 푸시 ○·이메일 ○·알림센터 ●) + `NOTI_POINT_EXPIRE_SOON`(포인트 소멸 30일 전, 2차, 정보성, 앱 푸시 ○·이메일 ●·알림센터 ●). U-BEN-01·U-BEN-02 문장, C-NOTI-01 규칙 첫 줄('마케팅 수신 동의자만' 행 제외), 기획 07장 H 포인트 줄.
- ⑤ D35: 명세 C-FILE-01 '시안 원본 · 인쇄 원본 AI·PDF·PSD·SVG' → '인쇄 원본(디자이너, D-ROOM-03) AI·PDF', 고객 자체 인쇄 파일 보관 칸 '인쇄 원본과 같음', A-SYS-03 `file.max_size_original` 설명.
- 결정 기록: 명세 `#g-dec4`·기획 15장 10-15 표에 2행 더하고 제목·머리말을 '2026-10-15~16 … 16건/16가지'로.
- ⑥ 요청서 390px: 가로 넘침 0(라이트·다크). 같이 본 **명세서가 390px에서 가로로 넘침**(S8 커밋에서 생김 — D-PRD-02·P-ONB-04 규칙 목록의 긴 코드 이름) → 명세 CSS `.fsec ol,.fsec ul`에 `grid-template-columns:minmax(0,1fr)`, `.fsec code{overflow-wrap:anywhere}` 추가로 해결(390·1440 모두 0). 기획서 390px도 0.
- 요청서 S-16 와이어 '10,000매(±3%)' → '(수량 ±3%·위치 ±2mm)'(D28 남은 곳, design 에이전트가 찾음).
- 검사: 명세 기능 162(mvp 119·p2 34·p3 9)·중복 ID 없음·태그 맞음, 기획서·요청서 태그 맞음. texts/spec·plan·brief 다시 뽑음.

**엔진**(`prototype/assets/engine.js`, 검사 33 → **40개 모두 통과**)
- 가격(D20·D21·D24): `calcOrder` — 판비는 ① 상품 금액(steps 'tier' 바로 아래 'plate'), `items[].instant.plate`(판비 범위 즉시 할인: 정률 내림·정액 한 번), 파트너 쿠폰·본사 상품 할인 쿠폰이 판비 줄에도 안분, `lines[].platePaid` = 고객이 낸 판비(공제 상한). `hqCoupon`(상품 할인 쿠폰) + `designCoupon`(디자인비에만, 이미 0원이면 안 씀) 두 자리, `includeDesignFee` 없앰. `items[].addonOf`(추가 구성품: 판매가 × 수량, 파트너 할인 없음, 50만원 판정 제외, 본사 쿠폰 안분 대상). `GC.order.addonCascade`.
- 환불(D33): `GC.refund.partnerChange`(거절·무응답 = 공제 없이 전액, 더 싸면 차액 × 결제 비율 내림, 비싸면 0원 + 본사 '조정').
- 상태: ORDER `parent_canceled`·`cancel_objection_return`(D23), ORDER_CUSTOM·DESIGN `partner_change_refund`, DESIGN `partner_changed`(D33), CLAIM_CANCEL `collected_refund`, CLAIM_RETURN·CLAIM_CANCEL의 완료 줄마다 `result`(D30) + `GC.claim.RESULT_LABEL/result/label`(CLAIM_COMPLETED 고객 라벨 기본값은 '완료'), PRODUCT `cancel_review`, PRODUCT_REVISION `DISCARDED`·`cancel_review`·`discard`·`product_ended`(D27), SETTLEMENT `release_confirmed`(ON_HOLD → CONFIRMED).
- 정책값 키 14개: `security.*` 3(새 묶음 '공통 · 보안'), `product.addon_max`, `promo.instant_discount_max_days`·`_targets`, `claim.tolerance`(문자열), `order.partner_change_reply_days`, `production.print_check_bd`, `file.max_size_chat`·`_original`·`_logo`·`_image`.
- 검사: TC-27을 항목별(13,637 + 1,363)로, 새 TC-34~40(판비·쿠폰 두 자리·추가 구성품·새 전이·클레임 라벨·파트너 변경·새 키).

**페이지**(에이전트 보고 기준 — 아래 '다음 세션 1번'에서 전체 흐름으로 다시 확인)
| 페이지 | 반영 | 흐름(보고) | 새 흐름 |
| --- | --- | --- | --- |
| design | D28 허용 오차(`claim.tolerance`, 6곳), D30 `REMAKE_LABEL` 없애고 엔진 라벨, D20 판비 줄·공제 상한 = 고객이 낸 판비(쿠폰 몫 735원 → 49,265원), D35 시안 등록 파일 표(인쇄 원본 AI·PDF), `production.print_check_bd` | 11개 PASS | design-claims |
| settlement | D22 MVP 일반 주문 이벤트 두 줄(81,000·58,000, 13,637 + 1,363), 10월 세금계산서 71,818 → 71,819(저장값 합), 확정 뒤 보류(지급 실패·송금 안 됨·계좌 변경 24시간) 해제 = `release_confirmed` | 9개 PASS(흐름 4개 수정) | — |
| benefit | D21 '디자인비 포함' 없앰·쿠폰 세 자리·신규 가입 5,000원 + 첫 디자인 무료 함께(490,000원), D34 `NOTI_COUPON_EXPIRE_SOON` | 6개 PASS | benefit-coupon-slots(+narrow) |
| system | '공통 · 보안' 묶음 권한(최고관리자)·안내, 파일 표 8행(C-FILE-01·D35), 파일 검사 결과 알림 3코드, D31 알림 설정 '확인 필요' 지움 | 14개 PASS | system-policy-security(+narrow), system-file-kinds(+narrow) |
| room | 첨부 한도 `file.max_size_chat`, 인쇄 원본 AI·PDF 안내, 검사 결과 알림 코드 | 4개 PASS | — |
| partner | D33 `MOVED` 없앰 → 정지·종료 뒤 운영 제안·고객 결과 시연(동의 → HANDED_OFF 재전달 / 환불·무응답 → CANCELED, [인쇄 가능] 뒤는 '대상 아님'), 알림 코드(대표자 보안 알림·정지·종료·조사), `security.*`·`claim.tolerance`·`production.print_check_bd` | 8개 PASS(흐름 2개 수정) | partner-change(+narrow) |
| member | `NOTI_BIZ_STATUS_CHECK`, D31 필수 알림 문구 | 5개 PASS | — |
| order | '시작 장면' 고르기 새로, D24 장바구니·주문서·주문 상세 붙은 줄·혼자 취소·본 상품과 함께 취소, D33 고객 [변경 동의](싸면 18,463원 환불 / 비싸면 본사 조정 +20,000)·[전액 환불] 383,000원·무응답(하루 전 예고 + 24시간), D23 `collected_refund`·D30 라벨, 쿠폰 세 자리·판비 줄 | 10개 PASS | order-addon(+narrow), order-partner-change(+2, +narrow) |
| catalog | D24 등록 단계 '옵션·추가 구성품'(옵션명 3개·조합 자동 생성·조합별 추가 금액·재고, 구성품 `product.addon_max`)·고객 옵션 3단(품절 조합 막힘)·구성품(본 상품 있을 때만)·[장바구니] 뒤 붙은 줄 결과 + order.html 링크, D20 즉시 할인 '상품 대금만 / 판비 포함'(맞춤 상품에도 패널), D27 [검수 요청 취소](신규·수정본)·[수정본 버리기]·판매 종료 때 함께 닫힘(본사 중지 중엔 그대로), D29 본사 카테고리 탭 규제 안내 편집기(500자·고친 날짜·이력) + 고객 접힌 상자, D25 품절 = 재입고 예정일·비슷한 상품, '재입고 알림 받기' 2차, [맞춤 제작으로 주문하기] → 옵션·수량·구성품 → 방식 선택 → design.html, 정책값 키 6개, 알림 코드 2개 | 17개 PASS(revision 2개 수정) | catalog-addon(+dark, +narrow), catalog-reg |
| index(메인) | 개요 문구(옵션 3단·추가 구성품·쿠폰 자리·파트너 변경·수정본 버리기·규제 안내), 시안 캡션 허용 오차 | — | — |

**판단해서 넣은 것(결정과 다르면 고칠 것)**
- system: 새 키 값 범위(잠금 3~10회, 자동 로그아웃 5~60분, 비밀번호 8~64자, 파일 1~2,000MB, 추가 구성품 1~50개, 즉시 할인 대상 1~5,000개), 시연 파일 2개 추가(디자이너 PSD 인쇄 원본 → 형식에서 막힘, 디자이너 악성코드 파일), 알림 표 발췌에 `NOTI_FILE_SCAN_REJECTED` 행.
- settlement: 계좌 변경 24시간 보류도 확정 뒤 보류라 `release_confirmed`, 9월분 공급가 예시 데이터(38,019원).
- benefit: 디자인비 쿠폰은 '전액 무료'만, 디자인비 쿠폰은 따로 줄 없이 디자인비 줄 안에서 뺌(요청서), 페이지 상수 `pointNoticeDays`(30일).
- design: 재제작 진행 중 문구('확정본 대조 검수 중' 등)는 페이지 것 유지, 끝난 클레임 카드에 환불액·사유.
- partner: 맞춤 주문은 '맞춤 인쇄 가능' 파트너에만 시드, 운영 목록은 표 대신 카드(본사 패널 폭 480px), 유예 끝 혜택 해제 알림도 `NOTI_BIZ_STATUS_CHECK`, 새 파트너 패키지 알림 `NOTI_PARTNER_PACKAGE_HANDED_OFF`.
- catalog: 조합 최대 100개·추가 금액 −50%~+200%는 페이지 상수(키 없음), 상세를 열면 재고 있는 첫 조합 선택·선택 목록 한 줄(요청서는 여러 줄), 일반+맞춤 상품의 즉시 할인은 일반·맞춤 단가 모두에, 할인 진행 중엔 기간 늘리기만, 규제 안내 예시 문구에 '법률 자문 전 초안'.
- order: 파트너 변경 차액 계산의 '할인 전 금액'·'결제 비율'에서 판비를 뺌, 새 파트너 판비는 '새로 받지 않음' 표시, 본 상품 일부 취소면 구성품은 그대로, 시계를 한 번에 +7일 넘겨 예고가 늦으면 그때부터 24시간.

**새로 찾은 명세 확인 거리(6번만 S9 마무리에 맞춤, 나머지 12건은 아래 ‘S10 입력’)**
1. 제작 파트너 변경 차액에 판비가 들어가는지, 새 파트너의 정산 기준(A-ORD-01 ④·C-PAY-02) — partner·order 둘 다 지적. D20으로 판비가 상품 금액이 돼서 생긴 빈칸.
2. 파트너 정지가 풀리면 열린 변경 제안은 어떻게 되는지(A-ORD-01·A-PTN-02).
3. 정산 보류 해제 뒤 '확정 금액 그대로 다음 지급'인지 다시 확정하는지가 A-STL-02·C-STL-02·P-STL-01 문장에 분명하지 않음(S8 맞춤 목록·엔진은 '그대로').
4. 추가 구성품: '출고된 구성품은 반품'(C-STATE-01)은 같은 송장이라 실제로 드묾. 출고 뒤 취소 이의 인정으로 본 상품이 RETURNED일 때 구성품 처리 없음.
5. A-MKT-01 쿠폰 만들기는 할인 방식(정액·정률)이 필수인데 디자인비 쿠폰(보통 전액 무료)과 맞지 않음.
6. C-NOTI-01 `NOTI_COUPON_EXPIRE_SOON` 행의 ○(앱 푸시·이메일) 조건을 칸에 안 적음(D34로 새로 만든 행 — 이번에 바로 고칠 수 있음). → **S9 마무리에 맞춤**: 두 칸에 ‘마케팅 채널로 켰을 때(앱 설치·권한)’, 같은 마케팅 행 `NOTI_PLATE_EXPIRY_NOTICE`도 ● → ○, 규칙 첫 줄에 한 문장(U-MY-06).
7. 내부 알림 코드 없음: 신규 입점 신청·샘플 미도착·계약 미서명·OTP 재등록 MD 확인(P-ONB-02~04), 사업자 서류 심사 대기열(A-MEM-02), 파트너 잠금 해제·비밀번호 변경 알림, 관리자 계정 잠금 알림 수신자.
8. A-SYS-01 권한 표에 '보안 정책값' 행 없음(프로토타입은 최고관리자만으로 가정).
9. C-FILE-01 참고 이미지가 AI·PDF·SVG도 받는데 한도 키는 '이미지 장당'(`file.max_size_image`).
10. C-STATE-02에 재제작 진행 중 고객 라벨 없음(엔진은 '반품 진행 중').
11. P-PRD-02 옵션 조합 수(100개)·추가 금액 범위를 '정책값'이라 하는데 키가 없음.
12. P-PRM-01 '상품 대금 / 판비' 범위가 판비만 할인하는 경우도 되는지 모호. U-PDP-02 추가 구성품 수량 상한 없음(프로토타입은 재고까지).
13. A-PRD-01 검수 기한 초과 알림·상품 신고 접수 알림 코드 없음.

**엔진 제안(에이전트들, 다음 세션에 판단)**: `product.option_combo_max`·`product.option_extra_range` 키, `calcOrder` 고객용 단계 이름('판매자 할인'), DISCARDED 사유 저장, `GC.settle.sumEvents`(이벤트별 공급가·VAT 합), `partnerChange`에 새로 생긴 판비·판비 차이 입력, 예고·기한 공통 도우미(하루 전 예고 → 기한·24시간 뒤 처리), `claim.label`에 클레임 유형별 진행 중 라벨, `claim.tolerance`를 수량 %·위치 mm 숫자 키 둘로, `calcOrder` 줄에 판비 뺀 상품 결제액, `addonCascade`가 본 상품 남은 수량도 보기, 업로드 주소 10분·다운로드 5분·변환 5분 정책값 키.

## S9 마무리 (2026-10-16)
- 원본 HTML·프로토타입이 S9 커밋 뒤 바뀌지 않음 확인. 전체 흐름 81개(hub 제외) 모두 PASS, `node --test prototype/tests/` 40개 통과.
- 확인 거리 6번 맞춤(위 6번 줄). 프로토타입은 system ○ 조건 설명에 한 마디(system 흐름 12개 다시 PASS), 개요 ‘근거’ 줄에 ‘2026-10-15~16 남은 확인 거리 결정(D20~D35)’. benefit은 이미 ‘고객이 고른 마케팅 채널’로 적혀 있어 그대로.
- 나머지 12건은 사용자 결정으로 S10에(추천안: 재게시로 S9을 닫고 S10에서 결정 → 문서 → 프로토타입).
- 재게시: `build_publish.py` → https://claude.ai/artifact/WcNnk7zXsAEJq6jwuhPjDd 버전 7(파일 13개). 게시 도구가 ‘읽지 않은 기존 파일’이라며 한 번 막아서, 게시본 12개를 받아 S9 이전 커밋 프로토타입과 해시(줄바꿈 무시)로 같음을 확인한 뒤 덮어씀.

# S10 입력 — S9에서 새로 찾은 명세 확인 거리 12건 (2026-10-16 작성)

> 근거: 위 ‘새로 찾은 명세 확인 거리’ 1~5·7~13과 ‘엔진 제안’. 분류는 S9 마무리 때 대강 나눈 것 — S10 조사에서 바뀔 수 있음.
> 순서: 원본 HTML 바뀜 확인 → 결정 거리 조사(읽기 전용 서브에이전트) → AskUserQuestion으로 D36~(추천안 먼저) → 명세(필요하면 기획서·요청서) → 엔진·페이지 → 흐름 전체 재실행·엔진 검사 → 같은 URL 재게시.

| # | 요약 | 종류 | 명세 | 프로토타입 영향 |
| --- | --- | --- | --- | --- |
| 1 | 제작 파트너 변경 차액에 판비가 들어가는지, 새 파트너 정산 기준 | 결정 | A-ORD-01 ④·C-PAY-02 | 엔진 `GC.refund.partnerChange`(판비 입력), order·partner |
| 2 | 파트너 정지가 풀리면 열린 변경 제안은 | 결정 | A-ORD-01·A-PTN-02 | partner |
| 3 | 정산 보류 해제 뒤 ‘확정 금액 그대로 다음 지급’ 문장 | 맞춤(엔진·S8 목록이 이미 ‘그대로’) | A-STL-02·C-STL-02·P-STL-01 | 없음(문구 확인만) |
| 4 | 출고 뒤 취소 이의 인정으로 본 상품이 RETURNED일 때 추가 구성품, ‘출고된 구성품은 반품’ 문장 | 결정 | C-STATE-01 | 엔진 `addonCascade`, order |
| 5 | 디자인비 쿠폰과 A-MKT-01 할인 방식(정액·정률 필수) | 결정 | A-MKT-01 | benefit |
| 7 | 내부 알림 코드 없음(입점 신청·샘플 미도착·계약 미서명·OTP 재등록 MD 확인, 사업자 서류 심사 대기열, 파트너 잠금 해제·비밀번호 변경, 관리자 계정 잠금 알림 수신자) | 맞춤(관리자 잠금 알림 수신자만 결정) | C-NOTI-01·P-ONB-02~04·A-MEM-02·A-SYS-01 | partner·member·system 알림 코드 |
| 8 | A-SYS-01 권한 표에 ‘보안 정책값’ 행 | 결정(추천: 최고관리자만 — 프로토타입 가정) | A-SYS-01 | system(지금 가정 그대로면 없음) |
| 9 | 참고 이미지가 AI·PDF·SVG도 받는데 한도 키는 ‘이미지 장당’ | 맞춤 | C-FILE-01·A-SYS-03 `file.max_size_image` | system 키 설명 |
| 10 | 재제작 진행 중 고객 라벨 | 맞춤 | C-STATE-02 | 엔진 `claim.label`(유형별 진행 중 라벨), design |
| 11 | 옵션 조합 수(100개)·추가 금액 범위(−50%~+200%) 정책값 키 | 맞춤 | P-PRD-02·A-SYS-03 | 엔진 키 `product.option_combo_max`·`product.option_extra_range`, catalog 상수 → 키 |
| 12 | 즉시 할인 ‘판비만’ 가능 여부, 추가 구성품 수량 상한 | 결정 | P-PRM-01·U-PDP-02 | catalog |
| 13 | 검수 기한 초과·상품 신고 접수 알림 코드 | 맞춤 | A-PRD-01·C-NOTI-01 | catalog 알림 코드 |

엔진 제안(S10에서 위 항목과 함께 판단): 위 표에 붙은 것 말고 `calcOrder` 고객용 단계 이름(‘판매자 할인’)·줄에 판비 뺀 상품 결제액, DISCARDED 사유 저장, `GC.settle.sumEvents`, 예고·기한 공통 도우미, `claim.tolerance`를 수량 %·위치 mm 두 키로, `addonCascade`가 본 상품 남은 수량도 보기, 업로드 주소 10분·다운로드 5분·변환 5분 정책값 키.

# S10 결과 (2026-10-16, 결정·반영·재게시 끝)

> 시작: 원본 HTML·프로토타입이 S9 커밋 뒤 바뀌지 않음 확인. 조사(읽기 전용 서브에이전트 3갈래: 돈·주문 / 운영·권한 / 맞춤 위치) → 결정 **D36~D45** + PG 질문 추가(AskUserQuestion 3번, `decisions.md` 맨 아래). **추천안과 다른 것: D41**(디자인비 쿠폰도 정액·정률, 첫 시안 뒤 취소 공제는 낸 디자인비만 — 쿠폰으로 깎인 몫은 본사 부담, 쿠폰으로 전액 무료면 0원).
> 진행: 명세는 메인, 기획서·요청서·법률·PG 질문서는 포크 1개, 엔진은 메인, 페이지는 서브에이전트 5개(order / partner+member / benefit+design / system / catalog).

## 끝난 것
**문서**
- 명세: D36·D37(A-ORD-01 ④ 합계 비교·정산 기준 다시 저장, C-PAY-02, C-STL-01 한 줄, C-STATE-01) · D38(A-ORD-01 ⑥, C-STATE-01 두 줄) · D39(C-STATE-01·02, U-MY-02, A-ORD-02, P-PRD-02, 00장 두 행) · D40(A-ORD-01 ⑦, A-PTN-02, D-REQ-04, U-MY-01, C-STATE-01·03, C-NOTI-01 `NOTI_ITEM_PARTNER_CHANGE_WITHDRAWN`·`NOTI_PARTNER_ACCOUNT_REINSTATED`) · D41(공제 문장 11곳, A-MKT-01 할인 방식·최대 할인액, U-BEN-01, U-ORD-02 디자인비 줄, C-PRICE-01 ④ 안분, D-REQ-03) · D42(A-SYS-03 '누가 바꾸나'·'공통 · 보안' 소제목, A-SYS-01) · D43(A-SYS-01, A-SYS-03, C-SEC-01, C-NOTI-01 `NOTI_INT_ADMIN_ACCOUNT_LOCKED`, '보안 담당' → 최고관리자) · D44(P-PRM-01, C-PRICE-01 ②) · D45(U-PDP-02). 맞춤 ③ C-STL-02·P-STL-01·A-STL-02 · ⑦ 알림 8개 · ⑨ `file.max_size_image`·D-REQ-03·D-ROOM-05 · ⑩ C-STATE-02 '진행 중 고객 라벨' · ⑪ 키 2개 · ⑬ 키 2개·알림 2개. `#g-dec4` 16 → 26행, 머리말 26건. 기능 162 그대로, 검사 통과.
- 기획서(포크): 15장 10-15~16 표 26행, D33 행·07장 F·H·11장 디자인 가격표·04장 쿠폰. 요청서(포크): S-25 판매자 변경 카드(합계 비교·구성품·제안 거둠), 추가 구성품(D39·D45), 주문서 노트 1·3(D41), 상태 라벨 '클레임 진행 중'. 법률: L-14(D41), T-05(D37). PG: **PG-71 '결제 뒤 판매자 변경'**(질문 70 → 71개).
- 메인 마무리 맞춤: 요청서 주문서 '낸 금액' → '낼 금액'(명세 U-ORD-02와 같게), system 에이전트 지적으로 `design.free_threshold`(A-REV-04 화면 값) → '디자인 옵션 가격' 행, `membership.*`·`ads.*` → '쿠폰 · 캠페인 · 멤버십 · 광고 운영' 행(요금은 최고관리자 승인), `NOTI_INT_BIZ_VERIFY_NEW` Slack ○ → —, 승인 뒤 환불 대기 라벨은 '취소 승인'·'반품 승인'(order 에이전트 지적, 명세 C-STATE-02 문단에도).

**엔진**(검사 40 → **41개 통과**, TC-36·39 고침, TC-41 새로)
- `GC.refund.partnerChange`: oldPlate·newPlate·addonsPaid 입력, 합계 비교(D36), `settle:{sale, partnerDisc:0, platformDisc}`(D37), `addonRefund`·`totalRefund`(D38). `hqAdjust` 없앰.
- `GC.order.addonCascade(items, cancel, shippedIds)`: 남은 수량을 봄, `partialParents`. ORDER 새 이벤트 `parent_collected`(DELIVERED → RETURNED, D39)·`partner_change_cancel`(PAID·ACCEPTED → CANCELED, D38).
- calcOrder 디자인비 쿠폰: `designFees[].couponAlloc`(묶음 품목별 안분), 멤버십 이용권이면 쓰지 않음(D-REQ-04·U-BEN-01과 맞춤). designCancel 라벨·주석(D41).
- `GC.claim.label(…, claimType)` 유형별 진행 중 라벨·`GC.claim.step`·`OPEN_LABEL`. `GC.Policy.permRow(key)`(D42). `GC.price.optionExtraRange()`.
- 정책값: 새 키 `product.option_combo_max`·`product.option_extra_range`(text)·`product.review_bd`·`product.review_priority_hours`(2차), 묶음 이름을 명세 영역 이름으로('주문·클레임·CS'·'디자인·파일'·'회원·혜택·알림').

**페이지**(흐름 82 → **92개**, hub 제외 91개 모두 PASS)
| 페이지 | 반영 | 흐름 | 새 흐름 |
| --- | --- | --- | --- |
| order | D36 후보별 판비·'상품만 싼' 장면, D37 '새 파트너 정산 기준' 표(조정 문구 없앰), D38 이쑤시개 구성품 시드, D39 `cascadeOf` → 엔진·`parent_collected`, ⑩ 라벨 | 10개 PASS(2개 eval 고침) | order-addon-collect(+narrow) |
| partner·member | D40 정지 해제(사유·감사 로그·대표자 알림·제안 거둠·[인쇄 가능] 다시 열림), D36·D37 `chgMoney`, D38 구성품 시드, ⑦ 내부 알림 4개·`NOTI_PARTNER_PASSWORD_CHANGED`, member `NOTI_INT_BIZ_VERIFY_NEW` | 13개 PASS(eval 3개 고침) | partner-change-withdraw |
| benefit·design | D41 쿠폰 만들기 정액·정률·최소 주문, 주문서 디자인비 쿠폰 칸·일부 할인 표시·공제 안내, design 공제(쿠폰 무료 0원·50만원 무료만 39,000원 + 동의 체크), 재제작 진행 중 라벨 | 17개 PASS | benefit-design-coupon(+narrow), design-d41(+narrow) |
| system | D42 키 단위 권한(`permRow`, 디자인 팀장 시나리오를 `design.fee`로), D43 관리자 잠금 시연·알림 행, '보안 담당' → 최고관리자, ⑦⑬ 알림 3개, ⑨ 파일 표, 새 키 값 범위 | 12개 PASS(eval 8개 고침) | system-admin-lock(+narrow), system-policy-perm |
| catalog | ⑪ 옵션 키 → 엔진, ⑬ 검수 기한·신고 알림 코드·`product.review_bd`, D44 라벨, D39 문구 3곳 | 17개 PASS | — |
| index(메인) | 개요 '근거' D20~D45, 도메인 설명 5곳 | — | — |

**계산 예시**: order — 원래 합계 370,000(결제 344,166) → 340,000이면 환불 27,905·플랫폼 부담 할인 23,739·새 파트너 295,800(13%), 상품만 싸고 판비가 늘어 375,000이면 0원(상계). partner — 180,000 → 175,000이면 환불 4,791·플랫폼 부담 할인 7,291·정산 예정 152,250. benefit — 디자인비 정액 1만원 쿠폰이면 39,000 · −10,000 · 29,000, 첫 시안 뒤 공제 29,000원 / 정률 100%면 0원 / 50만원 무료면 39,000원 + 동의 체크.

**판단해서 넣은 것(결정과 다르면 고칠 것)**
- 디자인비 쿠폰 최대 할인액은 정률이어도 선택, 묶음 안분은 품목별 디자인비 비율(남는 원은 첫 품목), 이용권과 같이 못 씀(기존 문장대로 — 엔진이 이용권 뒤 남은 추가 품목 디자인비에 쓰던 것을 막음).
- 정책값 권한 대응: 무료 기준(`design.free_threshold`)은 디자인 옵션 가격 행, 멤버십·광고 키는 쿠폰·캠페인 행(권한 표 행 이름대로).
- 붙은 구성품은 본 상품 남은 수량 전부에 취소 요청이 열려 있는 동안 그 클레임 안에 있는 것으로 봄(구매 확정 버튼 숨김·자동 확정 제외, order).
- 정지 해제 사유 목록 4개(임시), 거둔 제안은 다시 정지되면 새로 제안 가능(partner). 새 키 값 범위: 옵션 조합 10~500개, 검수 기한 1~5영업일, 우선 검수 1~24영업시간, 우선 검수가 일반 검수보다 길면 저장 막음(system). 수정본 재검수도 기한 초과 알림(catalog). 시연 쿠폰 '맞춤 디자인 10,000원 할인'(benefit).
- 참고 파일: C-FILE-01·D-REQ-03·D-ROOM-05의 행 이름은 화면 말 그대로 '참고 이미지'로 두고 형식·키 설명만 맞춤.

## S10 마무리
- 전체 흐름 91개(hub 제외) PASS, 엔진 검사 41개 통과. 다섯 문서 검사 통과(명세 기능 162 = 119·34·9, 중복 ID 없음, 태그 맞음, 깨진 링크 없음 — 명세 스크립트 템플릿 오탐 2건), texts 5개 다시 뽑음.
- 재게시: 게시본 13개가 S9 커밋과 같음을 확인(index는 게시 뼈대만 다름)한 뒤 `build_publish.py` → https://claude.ai/artifact/WcNnk7zXsAEJq6jwuhPjDd **버전 8**.

# S11 입력 — S10에서 새로 찾은 확인 거리 (2026-10-16 작성)

> 결정이 급하지 않은 것들입니다. 범위 밖으로 남는 큰 것은 법률·PG 자문 답 반영(PG-71 포함).

| # | 요약 | 종류(대강) | 명세 | 찾은 곳 |
| --- | --- | --- | --- | --- |
| 1 | 제안을 거둔 뒤 [인쇄 가능] 확인 기한(`production.print_check_bd`)을 언제부터 다시 세는지, 원래 파트너에게 '이어서 만드세요' 알림 코드 | 맞춤(코드)·결정(기한) | A-ORD-01 ⑦·D-PRD-02·C-NOTI-01 | partner |
| 2 | 정지 해제 사유 목록 없음 | 맞춤 | A-PTN-02 | partner |
| 3 | 국세청 재조회로 정지된 파트너가 다시 계속사업자로 확인되면 자동 해제인지 본사가 푸는지 | 결정 | A-PTN-02·P-ONB-04 | partner |
| 4 | C-NOTI-01 Slack 칸의 ○ 조건이 적혀 있지 않은 행들(`NOTI_INT_ROOM_MESSAGE` 등) | 맞춤 | C-NOTI-01 | partner·system |
| 5 | 맞춤 항목에 붙은 추가 구성품을 파트너가 언제 발주 확인하는지 | 맞춤 | C-STATE-01·P-ORD-01 | order |
| 6 | 붙은 구성품이 본 상품 취소 클레임에 들어가는 시점(지금 프로토타입은 요청 때부터) | 맞춤 | C-STATE-01·02 | order |
| 7 | A-MKT-01 '적용 대상(카테고리·파트너·상품)'이 디자인비 쿠폰에서 무엇을 뜻하는지, 디자인비 쿠폰 최소 주문 기준이 주문 전체인지 그 맞춤 품목인지 | 결정 | A-MKT-01·C-PRICE-01 | benefit |
| 8 | `product.price_change_alert`(−50% / +200%) 키가 엔진에 없음(catalog는 페이지 상수), '200% 이상 올리면'이 2배인지 3배인지 | 맞춤 | P-PRD-03·A-SYS-03 | catalog |
| 9 | 엔진 CLAIM_RETURN에 명세 EXCHANGE 행의 `EXCHANGE_REQUESTED` 상태가 없음 | 맞춤(엔진) | C-STATE-02 | S10 조사 |
| 10 | A-MEM-02 수동 검토 영업일 1일·A-PTN-01 서류 심사 3일·전체 10일 '(정책값)'에 키 없음(키 없는 정책값 약 100곳 중 일부) | 맞춤 | A-MEM-02·A-PTN-01·A-SYS-03 | S10 조사 |

엔진 제안(S9부터 남은 것, 채택 안 함): `calcOrder` 고객용 단계 이름('판매자 할인'), DISCARDED 사유 저장, `GC.settle.sumEvents`, 예고·기한 공통 도우미, `claim.tolerance`를 수량 %·위치 mm 두 키로, 업로드 주소 10분·다운로드 5분·변환 5분 정책값 키. S10에서 채택: `partnerChange` 판비 입력, `addonCascade` 남은 수량, `claim.label` 유형별, 옵션 키 2개.

# S11 결과 (2026-10-16, 결정·반영 끝)

> 시작: 원본 HTML·프로토타입이 S10 커밋 뒤 바뀌지 않음 확인. 조사(읽기 전용 서브에이전트 4갈래: 파트너 1·2·3 / 디자인비 쿠폰 7 / 정책값·알림 4·8·10 / 주문·클레임 5·6·9) → 결정 **D46~D52**(AskUserQuestion 2번, 7건 모두 추천안, `decisions.md` 맨 아래). 5·6번은 '맞춤'으로 적었지만 명세에 근거가 없어 결정(D49·D52)으로 올림.
> 진행: 명세·엔진은 메인, 기획서·요청서는 포크 1개, 페이지는 서브에이전트 5개(partner / order / benefit / catalog+member+system / room+design), index는 메인.

## 끝난 것
**문서**
- 명세: D46·D47(A-ORD-01 ⑦ 거둔 때부터 새로·정지 중 기한 알림 없음, D-PRD-02·P-ORD-06·A-SYS-03 `production.print_check_bd` '전달된 때부터') · D48(P-ONB-04·A-PTN-02 MD 확인 뒤 해제, A-MEM-02 회원은 '확인 필요' 자동 지움) · D49(C-STATE-01 PAID → ACCEPTED 행·구성품 규칙, P-ORD-01 새 줄) · D50·D51(A-MKT-01 최소 주문·적용 대상, C-PRICE-01 ④·판단 기준 표를 상품 할인/디자인비 두 행으로, U-BEN-01 두 곳, U-MY-02·C-PAY-02 부분 취소 때 다시 보지 않음) · D52(C-STATE-01 구성품 규칙, C-STATE-02 열린 클레임 줄, '기각' 포함). 맞춤 ① `NOTI_PARTNER_CHANGE_WITHDRAWN` ② 정지·해제 사유 목록 ④ `NOTI_INT_ROOM_MESSAGE` Slack '○ 10분 동안 안 읽으면 묶어 1회'·규칙 문장·`notify.room_digest_minutes` 설명 ⑧ 가격 경고 '절반 이하·3배 이상'(P-PRD-03·A-PRD-01·A-SYS-03) ⑩ 키 7개 표·본문(A-MEM-02·U-MEM-05·A-PTN-01·P-ONB-02), 판단 `NOTI_INT_BIZ_VERIFY_LATE`·`NOTI_INT_PARTNER_BIZ_RESUMED`. `#g-dec4` 26 → 33행, 머리말 33건, 함께 맞춘 것 한 문장. 기능 162 그대로, 검사 통과.
- 기획서(포크): 15장 10-15~16 표 33행·머리말 33가지, '정지가 풀릴 때 변경 제안' 행, 07장 디자인비 쿠폰, 12장 50만원 기준 행. 요청서(포크): 06장 인쇄 준비 '넘겨받은 때부터', 08장 주문서 노트 5(쿠폰 조건 표기), S-28 쿠폰함, 주문 상세 구성품 노트(D49·D52). 메인 마무리: D52 '기각'을 명세·기획서·요청서에(order 에이전트 지적).

**엔진**(검사 41 → **43개 통과**, TC-42·43 새로)
- `calcOrder` 디자인비 쿠폰: 최소 주문 = 묶음의 맞춤 품목 금액(`designFees[].basis`), 조건을 채운 묶음 가운데 할인 큰 곳(같으면 앞), 못 채우면 `designFees[].couponShort`(D51). `partialCancel`이 디자인비 쿠폰을 원래 묶음·최소 주문 없이 고정(benefit 에이전트 지적 — 전엔 할인을 거둬 감).
- ORDER `parent_printable`(PAID → ACCEPTED, D49). CLAIM_RETURN `EXCHANGE_REQUESTED`(pickup·withdraw), 이름 '반품·교환·재제작 클레임', `claim.step(…, claimType)` 유형별.
- `price.priceChangeAlert()`·`priceChangeCheck(prev, next)`(공통 `pctRange`). 새 키 `product.price_change_alert`(text)·`partner.onboard_review_bd`·`onboard_sample_bd`·`onboard_total_bd`·`member.biz_manual_bd`·`member.biz_closed_grace_days`. `production.print_check_bd` 라벨.
- 공통 CSS: 규칙 패널 `.rules .rule-row` 이름 칸 최소 5em(값이 길면 이름이 한 글자 폭으로 깨지던 것 — order·benefit 에이전트 지적).

**페이지**(흐름 92 → **104개**, hub 제외 103)
| 페이지 | 반영 | 흐름 | 새 흐름 |
| --- | --- | --- | --- |
| partner | D47 전달 시각 기준 기한·기한 넘김 알림, D46 거둔 때 새 기한·`NOTI_PARTNER_CHANGE_WITHDRAWN`·정지 중 알림 멈춤, 정지·해제 사유 목록('파트너 요청'은 계약 종료만), D48 재조회 정상 → MD 알림·확인표·해제, 입점 키 3개 → 엔진, D49 구성품 PAID → [인쇄 가능] 때 ACCEPTED·함께 출고 | 11개 PASS(2개 사유 고침) | partner-biz-resumed(+narrow) |
| order | D49 구성품 PAID·즉시 취소·남은 주문 기준 재계산, D52 문구·거부 확정 뒤 원래대로, 반품 칩 곁가지 정리·`claim.step` 유형별 | 14개 PASS | order-addon-paid(+narrow) |
| benefit | D50 대상 칸 숨김·'맞춤 디자인비 고정', D51 '맞춤 품목 N원 이상'·맞춤+일반 장면(부족 60,000원)·요청 2건 장면(할인 큰 요청), 부분 취소 안내 | 10개 PASS | benefit-design-coupon-min(+narrow) |
| catalog·member·system | 가격 경고 → 엔진(절반·3배, 사업자가 결과 단가), member 키 2개 → 엔진·`NOTI_INT_BIZ_VERIFY_LATE`·D48 배너, system `TEXT_HOW`·Slack ○ 안내·알림 시연 22개 | 41개 PASS | catalog-price-alert, member-late, system-s11 |
| room·design | 디자이너 Slack 10분 묶음(읽으면 안 보냄), design 고객 알림 코드 `NOTI_ROOM_MESSAGE`, D47 파트너 화면 기한·다시 전달 때 새로 | 20개 PASS | design-d47(+narrow), room-slack |
| index(메인) | 개요 '근거' D20~D52 | — | — |

**판단해서 넣은 것(결정과 다르면 고칠 것)**
- `NOTI_PARTNER_CHANGE_WITHDRAWN` 이메일 ●(이웃 행은 ○ — 조건 없는 ○를 늘리지 않음), 프로토타입은 SMS 대체도 보냄(명세 행대로). 정지 중 기한 알림 멈춤은 디자인 확정 건 전체에(partner), 생산 보류 중에도 기한 알림을 멈추고 원래 기한 유지(design).
- 정지 사유 '사업자 휴업·폐업'·'페널티 판매 중지(2차)'는 목록에 보이되 누를 수 없음, 수동 정지 해제 사유 기본값 '정지 사유 해소'(partner). [인쇄 가능] 때 디자인 상태도 IN_PRODUCTION으로(partner).
- 디자인비 쿠폰 최소 주문을 50만원 이상으로 넣으면 경고만(저장은 됨), 조건 안 맞는 쿠폰은 흐리게 보여 주고 이유, 시연 쿠폰 최소 30만원(benefit).
- 구성품을 먼저 취소한 뒤 판매자 변경 금액은 남은 주문을 다시 계산한 몫으로(판비 공제 상한 48,588원 — 결제 때 몫은 48,612원)(order).
- 디자이너 Slack 묶음: 관리자 화면에서 10분 안에 읽으면 보내지 않음, 생산 협의 채널을 읽어도 풀리지 않음. 작업 시간만 흘러 10분이 지난 뒤 읽으면 '10분 안에 읽음'으로 남던 기존 버그도 고침(room).
- 알림 시연 표(발췌)에 S11 코드 3개 + `NOTI_INT_ROOM_MESSAGE` 행(system). 회원 사업자 '확인 필요' 자동 해제 때 고객 알림은 넣지 않음(아래 확인 거리 11).

## S11 마무리
- 공통 CSS·엔진(`partialCancel`)을 마지막에 고친 뒤 전체 흐름 103개(hub 제외) 3개씩 다시 실행 — 모두 PASS, 엔진 검사 43개 통과. 다섯 문서 검사 통과(명세 기능 162 = 119·34·9, 중복 ID 없음, 태그 맞음), texts spec·plan·brief 다시 뽑음.
- 재게시: 게시본 13개가 S10 커밋과 같음을 확인(index는 게시 뼈대만 다름)한 뒤 `build_publish.py` → https://claude.ai/artifact/WcNnk7zXsAEJq6jwuhPjDd **버전 9**.

# S12 입력 — S11에서 새로 찾은 확인 거리 (2026-10-16 작성)

> 결정이 급하지 않은 것들입니다. 범위 밖으로 남는 큰 것은 법률·PG 자문 답 반영(PG-71 포함).

| # | 요약 | 종류(대강) | 명세 | 찾은 곳 |
| --- | --- | --- | --- | --- |
| 1 | 생산 보류(확정 후 변경·취소 중재) 중 [인쇄 가능] 기한 알림을 멈추나, 보류가 풀리면 기한을 새로 세나 이어서 세나(프로토타입은 멈추고 원래 기한 유지) | 결정 | D-PRD-02·D-APV-02 | design |
| 2 | 변경 제안을 하기 전에 정지가 풀린 디자인 확정 건의 [인쇄 가능] 기한(D46은 '거두면'만 — 풀리자마자 지연 알림이 갈 수 있음) | 결정 | D-PRD-02·A-ORD-01 ⑦ | partner |
| 3 | 파트너가 생산 협의 채널에 답했을 때 담당 디자이너에게 가는 알림 코드 없음 | 맞춤 | C-NOTI-01·D-PRD-03 | design |
| 4 | 디자인비 쿠폰 최소 주문을 50만원 이상으로 넣는 것을 막을지(쓰일 일이 없음) | 맞춤 | A-MKT-01 | benefit |
| 5 | 멤버십 이용권을 쓴 묶음(품목 2개 이상)의 남는 추가 품목 디자인비 19,000원에 디자인비 쿠폰을 쓸 수 있나, 그 묶음 첫 시안 뒤 취소 공제가 19,000원인지 39,000원을 더하는지 | **해소(2026-10-16 D60 — 못 씀, 공제는 낸 19,000원)** | U-BEN-01·U-BEN-05·C-PAY-02 | benefit |
| 6 | 같은 구성품 환불이 경로에 따라 다름(고객이 먼저 취소 = 재계산 6,000원 / 판매자 변경으로 함께 취소 = ⑥ 결제 금액 그대로 5,834원), A-ORD-01 ④ '원래 항목의 결제 비율'이 결제 때 기준인지 재계산 뒤 기준인지 | **해소(2026-10-16 D53 — 어느 경로든 결제 금액 그대로, ④는 결제 때 기준)** | A-ORD-01 ④⑥·C-PAY-02 | order |
| 7 | 정지 사유가 하나뿐 — 수동 정지 중 폐업까지 확인되는 겹친 경우(계정 상태표에 정지 → 폐업 이동 없음) | 결정 | A-PTN-02·P-ONB-04 | partner |
| 8 | 정지 사유 '기타'의 메모가 필수인지 | 맞춤 | A-PTN-02 | partner |
| 9 | 휴업이면 사업자 혜택을 바로 멈추나: U-MEM-05·`NOTI_BIZ_STATUS_CHECK`('사업자가 적용 중지')는 바로 멈춤, A-MEM-02는 '확인 필요' 표시·폐업만 30일 유예 — 서로 어긋남, 휴업의 유예·해제 규칙 없음 | 결정 | U-MEM-05·A-MEM-02·C-NOTI-01 | member |
| 10 | C-NOTI-01 이메일 칸의 조건 없는 ○ 11행(`NOTI_VBANK_EXPIRED`·`NOTI_PARTNER_ORDER_NEW` 등) — 범례 '앱 설치·권한'은 이메일에 맞지 않음 | 맞춤 | C-NOTI-01 | S11 조사 |
| 11 | D48로 회원 '확인 필요'가 자동으로 지워질 때 고객에게 알리나(경고 알림은 보냄) | 맞춤 | A-MEM-02·C-NOTI-01 | member |
| 12 | 키 없는 '(정책값)' 남은 것(명세 약 100곳 가운데 일부, 프로토타입 member 페이지 상수 6개 — 재조회 날짜·인증번호 시간 등) | 맞춤 | A-SYS-03 | S10·S11 조사 |

참고(명세 문제 아님): 사업자가 할인율 방식은 상한 50%라 할인율만 바꿔서는 '절반 이하' 경고가 나지 않음(P-PRD-03). 프로토타입은 '[인쇄 가능] 2일을 넘기면 담당 MD 연락'을 넣지 않음.

엔진 제안(채택 안 함, S12에서 판단): `GC.production.printDue`(디자인 확정 건 [인쇄 가능] 기한 — design·partner·order 계산 맞춤), 디자인 [인쇄 가능] 전이에 주문 항목 상태 연결, `CLAIM_STEP_BY_TYPE.REMAKE` 단계 더하기(design 페이지 상수 `REMAKE_STEP` 지우기 — '재제작품 출고'/'재제작품 보내는 중' 말 맞추기), `addBusinessDays`가 영업시간 밖 시작 시각을 그대로 잇는 것, `priceChangeCheck`가 `{kind, pct}`·문구를 돌려주기. S9부터 남은 것: `calcOrder` 고객용 단계 이름('판매자 할인'), DISCARDED 사유 저장, `GC.settle.sumEvents`, 예고·기한 공통 도우미, `claim.tolerance` 두 키, 업로드·다운로드·변환 시간 키.

# 취소·환불 결과 (2026-10-16 반영 세션 → 2026-10-17 마무리, 끝)

> 시작: 원본 HTML·프로토타입이 마지막 커밋(eb5de50) 뒤 바뀌지 않음 확인. 사용자 결정(AskUserQuestion 3번, 모두 추천안): 더 고칠 항목 없음, S12 5·6번을 함께 정리(**D60**·D53으로 해소), D59 세부 ②~⑤(새 클레임 유형 DELAY_CANCEL, 기각 뒤 다시 열림, 폐기 + 연결 보장 자동 해제, 제작 파트너 변경은 그대로 — ⑤는 사용자가 예시 설명을 듣고 다시 확인). `decisions.md` 맨 아래.
> 진행: 명세·엔진은 메인, 기획서·요청서는 포크 1, 법률·PG 질문서는 포크 1. 페이지 서브에이전트 3개(order / design+partner / benefit+settlement+system)를 보냈으나 **사용자 요청으로 세션을 끊으며 읽는 단계에서 멈춤 — 페이지·흐름 파일은 바뀌지 않음.** 지시문은 `docs/revision-work/page-agent-prompts.md`.

## 끝난 것
**문서**(다섯 문서 검사 통과: 명세 기능 162 = 119·34·9, 중복 ID 없음, 태그 맞음. texts 5개 다시 뽑음)
- 명세(메인):
  - C-PAY-02: 본문·상세 동작·규칙·예외·예시 1·2·3을 다시 씀. 낸 금액 그대로, 품목별 디자인비 몫, 배송비·쿠폰 복원, 구간 차단, 환불 기한·지연배상금, 디자인 단계 공제(낸 디자인비만·D60), 생산 지연 취소.
  - C-STATE-01: 출고 지연 바로 취소 줄, IN_PRODUCTION → CANCELED, 이의 인정 회수 줄에 생산 지연, 분할 줄, 구성품 클레임에 DELAY_CANCEL, 교정쇄 문장.
  - C-STATE-02: DELAY_CANCEL 유형·전이 4줄, 검수 일부 승인 줄, 늦게 받음 반품, 라벨·완료 결과, 규칙 3개, 예외, 키.
  - C-STATE-03: 생산 지연 취소 묶음 3줄, 확정 후 취소 기본 승인.
  - C-NOTI-01: 새 행 4개(고객 2, 파트너 1, 재무 1)·기존 행 2개 고침.
  - A-SYS-03: 키 3개(`order.overdue_grace_bd`·`claim.refund_due_bd`·`claim.refund_delay_rate`).
  - 주문 쪽:
    - P-ORD-03: 다시 씀(무단 지연, 늦게 받은 상품 반품, 맞춤 생산 지연).
    - P-ORD-04: 낸 금액 그대로·구간 차단·DELAY_CANCEL.
    - P-ORD-05: [일부 승인]·부분 환불 제안 없앰.
    - P-ORD-06.
  - 고객 화면: U-MY-01(버튼·출고/생산 지연 표시), U-MY-02(공제·환불 미리보기·구간 차단), U-MY-03(늦게 받음·훼손 안내·0원 이하 없앰·지연배상금).
  - D-APV-01(확정 동의 문구), D-APV-02(기본 승인·생산 지연 예외), D-REQ-04(39,000원 별도 고지 줄 없앰).
  - A-ORD-01(연결 보장 자동 해제·모니터링·강제 환불·④ 결제 때 기준·⑤·⑥), A-ORD-02(중재 건·판정 방식·CUSTOM_CANCEL/DELAY_CANCEL 판정·지연배상금 부담).
  - C-PRICE-01(그룹 설명·③ 이용권·예외), C-PRICE-03(재계산 없앰·늦게 받음), P-PRD-04·P-PRM-02·P-PRM-03(재계산 문장).
  - C-STL-01('중재 판정' 이벤트 설명), P-STL-01(이벤트 표), P-ONB-03(계약 조항 '취소·환불 부담'), D-RE-01(해제 사유 '생산 지연 취소').
  - U-BEN-01·U-BEN-05·U-ORD-02, D-OPT-01·A-REV-01·A-REV-04(39,000원 공제 문장).
  - 00장: `#g-dec` 2행 고침·1행 보탬, 공통 용어 3행 새로(생산 지연 취소·출고 지연/무단 지연·환불 기한/지연배상금)·확정 후 취소 행, **`#g-dec4`에 '취소·환불 정책 수정' 묶음 8행**(지금 41행 + 묶음 머리 1).
- 기획서(포크):
  - 06장 선결제 상자에 남는 위험 한 문장.
  - 07장 E(무단 지연), 07장 F(출고 지연·부분 취소·환불 기한 항목, 맞춤 단계 표 3행, 법적 근거 문단), 07장 H(D60), 07장 J ④ 해제 사유·⑤ 생산 지연 표 새로.
  - 11장 수익원 문장(손익 숫자에는 영향 없음).
  - 15장: 새 소제목 '확정 (2026-10-16 추가 · 취소·환불)' 8행 표, 옛 행 3개 고침(10-12 '무료 디자인 취소'는 '없앰' 표시), 기본값 표 2행.
- 디자인 요청서(포크): 알아 둘 말, 흐름 D·S-26, 주문서 주석(39,000원 별도 체크 없앰, D60), 확정 화면 주석, 주문 상세 메모 3줄, 환불 금액 절을 다시 씀, 반품 신청 항목, 상태 표, 10장 규칙·초안 경고 목록. 390px 가로 넘침 0.
- 법률 질문서(포크): 질문 61·1순위 29 그대로.
  - L-14: '설계 변경으로 해소' 표시.
  - L-18: 제목·내용을 다시 씀.
  - L-21: D56·D57 '지금 설계'와 질문을 덧붙임.
  - L-61: 맞춤 생산 지연, 민법 제544조 질문.
  - L-11·L-13·L-15·L-16·L-17·L-22·L-39·L-43(계약 조항 ①②)도 맞춤.
  - 세무 T-07에 '생산 지연 디자인비 파트너 청구·지연배상금' 질문, T-09에서 '무료 디자인 공제'를 뺌.
- PG 질문서(포크): PG-22(지연배상금 따로 송금)·PG-27·PG-70의 '왜 묻나'를 맞춤. 새 질문은 없음.
- 취소·환불 정리본 `refund-policy.html`: 머리 '반영함', D59 세부·D60 줄. 게시본 https://claude.ai/artifact/EjAuQ29zfAmfFABhg6PMeq **버전 12**.

**엔진**(검사 43 → **44개 통과**. TC-07·08·09·41·43을 새 규칙으로 고치고 TC-44를 새로 만듦)
- `partialCancel`을 다시 씀(D53).
  - 결제 스냅샷과 `cancel: [{id, qty}]`·`alreadyCanceled`를 받고, 줄 결제 금액 그대로·끝전은 마지막 수량에 둠.
  - 품목별 디자인비 몫(`designShare`), 묶음 전부 취소 때 배송비, 쿠폰 복원(`couponsRestored`), 구간 바뀌면 `TIER_CHANGE` 차단, 반품 배송비가 크면 `shortfall`.
  - `recalc`·`zeroRefund` 없앰.
- `designCancel`: `freeCustom` 무시(D54), `defaultApprove`(D55), `productionDelay` → DELAY_CANCEL·`designFeeToPartner`(D59).
- 새 도우미:
  - `refund.linePaid`·`designShare`·`dueAt`·`delayComp`(D57)
  - `order.overdueAt`·`isOverdue`(D58·D59)
  - `claim.RETURN_REASONS`·`shippedLate`, `OPEN_LABEL.DELAY_CANCEL`, `canObject`에서 DELAY_CANCEL 제외
- 새 전이: ORDER `delay_cancel`, ORDER_CUSTOM `delay_cancel_approved`·`delay_cancel_collected`, DESIGN `delay_cancel_approved`, CLAIM_RETURN `partial_approve`. CLAIM_CANCEL 중재 라벨.
- 새 키 3개.
- `prototype/index.html` 근거 줄에 D53~D60.

**흐름 기준선**(새 엔진으로 103개, hub 제외): 94 PASS / 9 FAIL. 실패는 order 흐름 9개뿐이고, `recalc`가 없어진 탓(예상한 것).

## 판단해서 넣은 것(결정과 다르면 고칠 것)
- **품목별 디자인비 몫도 '그 항목에 낸 금액'으로 봄**(C-PAY-02 상세 동작 2): 묶음의 한 품목을 취소하면 그 품목 몫(첫 39,000·추가 19,000에서 쿠폰 안분을 뺀 금액)을 돌려주고, 첫 시안 뒤면 디자인 단계 공제로 다시 뺌. 예전 엔진은 묶음 디자인비를 고정해 돌려주지 않았음. TC-43: 150,000 → 165,725원.
- 생산 지연 취소 요청 중에도 송장 등록은 막지 않음. 승인하면 '이미 출고' 취소 이의 인정처럼 회수 뒤 검수 없이 환불(회수 배송비 파트너, ORDER_CUSTOM `delay_cancel_collected`).
- 무단 지연·생산 지연 판정에는 예고 간격(`notify.notice_min_hours`)을 두지 않음(자동 취소가 아니라 취소를 여는 것).
- 지연 안내 뒤 새 예정일도 넘기면 고객에게 `NOTI_SHIP_OVERDUE`를 다시 보냄.
- 맞춤 항목에 붙은 구성품은 무단 지연(D58)이 아니라 본 항목의 생산 지연(D59) 규칙을 따름.
- 이름: 알림 코드 6개(`NOTI_SHIP_OVERDUE`·`NOTI_PRODUCTION_OVERDUE`·`NOTI_PARTNER_SHIP_OVERDUE`·`NOTI_REFUND_DELAY_PAID`·`NOTI_INT_REFUND_DUE`·`NOTI_INT_REFUND_OVER`)와 키 3개. 고객 지연배상금 행은 이메일 ●.
- 반품 배송비가 환불액보다 크면 모자란 만큼 추가 결제(U-MY-03 기존 '차감 또는 추가 결제'를 그대로 둠).
- '중재 판정' 정산 이벤트에 생산 지연 디자인비·지연배상금을 넣고, 디자인비 청구의 세금계산서는 '세무 확인 필요'로 표시함.
- 입점 계약 조항은 명세 P-ONB-03에 '취소·환불 부담'으로, 법률 질문서는 L-43에 넣음(포크 판단).
- 기획서 15장 새 표는 명세 `#g-dec4`로 링크함. 명세도 `#g-dec4` 안에 묶음으로 넣어 맞춤.

## 다음 세션에서 할 일 (2026-10-17 마무리 세션에서 모두 끝냄 — 아래 ‘취소·환불 마무리’)
1. 로컬 서버를 띄우고, `docs/revision-work/page-agent-prompts.md`의 지시문 3개로 페이지 서브에이전트를 보냄. 줄 번호·기준선을 먼저 확인.
2. 보고를 모아 흐름 전체를 재실행(메인은 3개씩)하고 엔진 검사 44개를 돌림. 공통 자산 제안은 메인이 판단해 반영.
3. `build_publish.py`를 돌리고 프로토타입을 같은 URL(https://claude.ai/artifact/WcNnk7zXsAEJq6jwuhPjDd, 지금 버전 9)로 재게시.
4. 페이지 에이전트가 찾은 확인 거리와 위 '판단해서 넣은 것'을 사용자에게 짧게 확인함. S12 입력은 5·6번이 빠져 10건.

## 취소·환불 마무리 (2026-10-17)

> 시작: 원본 HTML·프로토타입이 커밋 96cf7ce 뒤 바뀌지 않음, spec.txt 줄 번호가 지시문과 같음, 엔진 검사 44개 통과, 게시본 버전 9 = S11 커밋(3308b45) `prototype/`(해시, index는 게시 뼈대만 다름)을 확인. `page-agent-prompts.md` 지시문 3개를 스크래치 경로만 바꿔 그대로 보냄(general-purpose, 흐름은 에이전트마다 2개씩).

**페이지**(흐름 104 → **122개**, hub 제외 121 — 마무리 때 전체 3개씩 실행 **모두 PASS**, 엔진 검사 44개 통과, 엔진·공통 자산은 바꾸지 않음)
| 페이지 | 반영 | 흐름 | 새 흐름 |
| --- | --- | --- | --- |
| order | D53 `refundCalc`·`pcAddonSelfCalc`를 새 `partialCancel`로(낸 금액 미리보기·묶음 배송비·돌려받는 쿠폰, 구간 바뀌면 막고 [전부 취소로 바꾸기]·[주문 전체 취소], `zeroAgree`·`bears` 지움, 예시 1 = 51,207 / 84,793원), S12 6번(구성품 5,834원·동의 차액 27,905원·먼저 취소 뒤 전액 환불 383,166원), D56 [일부 승인](항목 분할·거부 수량 되돌려 받기/폐기·이의), D58 시작 장면 ‘안내 없는 출고 지연’([바로 취소]·송장 넣으면 닫힘·‘늦게 받음’ 사유), D57 시작 장면 ‘반품 검수 · 환불 지연’(기한 저장·재무 DUE·OVER·지연배상금 19원 `app.ext` 송금·정산 ‘중재 판정’ −19원) | 14개 PASS(`order-addon-paid` 기대값·`order-claims` 예시 1 검사 고침) | order-overdue(+narrow), order-inspect-split, order-inspect-dark, order-refund-delay |
| design·partner | D54 `freeCustom`·주문서 무료 디자인 별도 체크(`co_free`) 없앰, D55 관리자 중재 ‘기본은 승인’·근거·[기각]은 판정 근거 입력 필수·양측 알림·고객 안내·D-APV-01 동의 문구, D59 design 장면(생산 지연 → [취소 요청] → ‘취소 중재 중’(생산 보류 없음) → 파트너 출고 가능 시점·진행 → 승인: 전액 환불·쿠폰 복원·‘중재 판정’ 차감·연결 보장 해제·폐기 확인 / 기각: 새 예정일, 넘기면 다시 열림 / 요청 중 출고 → 회수 환불), partner 주문 탭 출고 기한·무단 지연 기록·‘취소 중재 중’·[출고 가능 시점·진행 올리기], 정산 탭 ‘중재 판정’ 차감, 계약서 생산 지연 부담 문장(초안) | design 15·partner 11개 PASS(`design-claims` 기각 전 근거 입력, `design-d41`(+narrow) `co_free` 제거) | design-delay(+narrow), design-delay-dismiss, partner-overdue(+narrow) |
| benefit·settlement·system | benefit D54 문구·계산 없앰, D60 ‘이용권 묶음’ 체험(3품목·추가 품목 디자인비 38,000원 그대로·쿠폰은 쿠폰함에·첫 시안 뒤 공제 38,000원·`designShare` 몫), settlement ‘다온인쇄’ 갈래((a) 생산 지연 취소 디자인비 −39,000원·세무 확인 필요·구매 확정 이벤트 없음, (b) 지연배상금 −1,380원·초안, 정산액 27,000원을 넘는 13,380원은 미수금, D59 ⑤ 비교 문장, `cancelComp` 그대로 맞음), system 새 키 3개(권한 행 최고관리자만, 법정 값 2개 ‘법률 자문 전 초안’·‘법정 값’), 알림 매트릭스 6행 | benefit 10·settlement 8·system 16개 PASS(기대값 안 고침) | benefit-voucher-bundle(+narrow·dark), settlement-delay(+narrow·dark), system-refund-keys(+narrow) |
| index(메인) | 도메인 설명 3줄(order 부분 취소·일부 승인·바로 취소·지연배상금, design 기본 승인·생산 지연 취소, settlement ‘중재 판정’ 차감) | — | — |

**문서(메인, 맞춤)**: 명세 `#d-flow` 맞춤형 행 ‘무료로 받았으면 39,000원’ → ‘무료였으면 0원, 이용권·쿠폰은 사용 처리’(D54 누락, benefit 에이전트), C-PAY-02 생산 지연 취소 ‘파트너 정산 이벤트는 생기지 않음’ → ‘그 항목의 구매 확정 정산 이벤트는 생기지 않음’(‘중재 판정’ 이벤트와 한 단락에서 어긋남). **D61**(아래) 명세 A-ORD-02·P-ORD-04·C-STATE-02·`#g-dec4`, 기획서 07장 F·15장. 명세·기획서 검사 통과(기능 162, 중복 ID 없음, 태그 맞음), texts spec·plan 다시 뽑음. 정리본 `refund-policy.html` D59 줄·M12 상자에 D61 → 게시본 **버전 13**.

**재게시**: `build_publish.py` → https://claude.ai/artifact/WcNnk7zXsAEJq6jwuhPjDd **버전 10**.

**사용자 확인(AskUserQuestion, 모두 추천안 — `decisions.md` 맨 아래)**: ① 품목별 디자인비 몫 환불 그대로 ② 법정 값(이율 15% 미만·환불 기한 3영업일 초과) 저장 막기 그대로 ③ **D61** 생산 지연 취소 기각 때 새 출고 예정일 = 파트너가 올린 출고 가능 시점(올리기 전에는 기각 못 함).

**판단해서 넣은 것(페이지 에이전트, 고칠 일이 생기면 여기서)**
- order: 반품 배송비는 클레임당 한 번(일부 승인 때 뺐으면 거부분이 인정돼도 다시 안 뺌), 검수 기한 자동 승인은 배치가 검수 기한에 돈 것으로 보고 지연배상금 계산, 재무 ‘기한 전날’ 알림은 전날 0시, 판매자 품절 취소는 구간 단가가 바뀌어도 막지 않음, 반품 안내 문구 해요체. 페이지 상수 `LOCAL.lateDays` 7일(늦게 받음 반품 기한 — 키 없음), `REFUND_ACCT` 예시 계좌.
- design·partner: 판정 근거 필수는 기각에만, system 탭에 ‘본사 일괄 공지’ 켜기·끄기, 계약서 품질 조항·계약 조건 표에 생산 지연 부담 문장(초안). 체험용 출고 가능 시점 +2영업일, 파트너 시드 주문 리드타임 7영업일. 생산 지연 취소 요청 중 출고 → 승인·회수 뒤 디자인 요청 끝 상태는 COMPLETED.
- benefit·settlement·system: 회수 뒤 검수 기한이 환불 기한보다 짧아야 저장, 환불 키 2개 ‘영향 큼’(최고관리자 승인 + 공지), settlement 시스템 화면에 ‘환불 기한 감시’ 행. system 상수 `order.overdue_grace_bd` 범위 0~5영업일·법정 값 기준 표. system의 ‘39,000’은 디자인비 변경 시나리오라 그대로.

**엔진 제안(채택 안 함, S12에서 판단)**: `overdueAt`·`dueAt`에 영업일 인자 선택(지금 system 미리보기가 계산을 다시 짬), 정책값 메타에 법정 값 방향 필드, `payout`이 정산액을 넘는 ‘중재 판정’을 미수금으로, CLAIM_CANCEL `collected_refund` 설명에 생산 지연 회수 갈래, DESIGN ‘회수 환불로 끝남’ 이동, `designCancel` 결과에 되살릴 혜택 목록, `partialCancel` `lines`에 할인 안분 내역, 반품 모드 마지막 반품의 배송비(아래 S12 14번), `claim.late_return_days` 키, 기한 전날 시각 도우미.

# S12 입력 보탬 — 취소·환불 마무리에서 찾은 확인 거리 (2026-10-17)

> ‘S12 입력’ 10건(5·6번 해소) 뒤에 이어 붙입니다. 결정 번호는 **D66~**(D61은 마무리, D62~D65는 10-17 환경·배포에서 씀).

| # | 요약 | 종류(대강) | 명세 | 찾은 곳 |
| --- | --- | --- | --- | --- |
| 13 | ‘중재 판정’ 이벤트(−)가 그 주기 정산액보다 클 때: C-STL-01 지급 식은 마이너스 이월인데 미수금은 본사 청구에서만 생김(C-STL-02). 화면은 명세 문장대로 분쟁 조정과 같은 순서·한도로 미수금 처리 | 맞춤 | C-STL-01·C-STL-02·C-PAY-02 | settlement |
| 14 | 남은 항목이 없는 반품은 잔액 전부라 처음 낸 배송비까지 돌려주고(엔진 `last`), 다른 항목이 남은 반품은 배송비를 돌려주지 않음 — 같은 묶음을 전부 반품해도 순서에 따라 달라짐. 명세는 낸 배송비를 ‘출고 전에 모두 취소’일 때만 돌려줌(C-PRICE-03 무료배송 전부 반품 = 왕복). 파트너 귀책 전부 반품 때 처음 배송비를 돌려주는지는 비어 있음 | 결정(엔진 맞춤 포함) | C-PAY-02·C-PRICE-03·U-MY-03 | order |
| 15 | 일부 승인 때 고객 부담 반품 배송비를 빼는 시점, 거부 수량을 되돌려 보내는 배송비를 받는 방법(환불금에서 / 따로 결제) | 결정 | U-MY-03·P-ORD-05 | order |
| 16 | 생산 지연 취소 요청 중 출고된 건을 승인·회수한 뒤 디자인 요청의 끝 상태(프로토타입은 COMPLETED) | 맞춤 | C-STATE-03 | design |
| 17 | 무단 지연으로 고객이 [바로 취소]했을 때 파트너 알림 코드 없음(프로토타입은 `NOTI_PARTNER_CLAIM_NEW`) | 맞춤 | C-NOTI-01·P-ORD-03 | design |
| 18 | DELAY_CANCEL 기각: 명세 표는 CANCEL_REJECTED를 거쳐 끝나는데 엔진은 요청 상태에서 바로 완료(DISMISSED) | 맞춤(엔진) | C-STATE-02 | design |
| 19 | 본사 일괄 공지 지연이 끝난 뒤 생산 지연 판정 시각을 공지 기간만큼 미루는지, 일괄 공지 알림 코드 없음 | 결정 | P-ORD-03·C-NOTI-01 | design |
| 20 | 카드 환불 고객이 환불 계좌를 안 넣었을 때 지연배상금 송금 대기와 지연 일수의 관계(고객 사정 기간으로 빼는지) | 맞춤 | C-PAY-02 | order |
| 21 | 발주 확인 전(PAID)에 약속 출고일을 넘긴 주문도 무단 지연으로 기록하는지 | 맞춤 | P-ORD-03 | order |
| 22 | ‘늦게 받음’ 반품 기한 7일이 정책값 키가 없음(프로토타입 `LOCAL.lateDays`) — 12번(키 없는 정책값)과 함께 | 맞춤 | A-SYS-03·C-STATE-02 | order |

# S12 결과 (2026-10-17, 결정·반영·재게시 끝)

> 시작: 원본 HTML·프로토타입이 커밋 c3b0b06 뒤 바뀌지 않음(작업 트리 깨끗), 엔진 검사 44개·문서 다섯 검사 통과. 법률·PG 문의는 아직 보내기 전(사용자 확인)이라 S12를 그대로 진행.
> 조사(읽기 전용 서브에이전트 4갈래: 디자인·생산 1·2·3·16·17·18·19 / 파트너·회원 7·8·9·11 / 주문·클레임·정산 13·14·15·20·21·22 / 알림·정책값·쿠폰 4·10·12) → 결정 **D66~D72**(AskUserQuestion 2번, 7건 모두 추천안) + 12번 범위(추천안: MVP 키 + 프로토타입 상수). `decisions.md` 맨 아래.
> 진행: 명세(결정·맞춤)·엔진·index는 메인, 기획서·요청서·법률 질문서는 포크 1개, 명세 12번(정책값 키)은 포크 1개(메인이 엔진을 고치는 동안), 페이지는 서브에이전트 5개(order / design+room / partner / member+benefit+catalog / settlement+system — 지시문은 `page-agent-prompts.md` 맨 아래 ‘S12 페이지 지시문’).

## 끝난 것
**문서**
- 명세(메인): D66·D67(D-APV-02·D-PRD-02·A-ORD-01 ⑦·A-SYS-03 `production.print_check_bd`·C-STATE-03 보류 해제 줄·C-NOTI-01 `NOTI_PARTNER_PACKAGE_HANDED_OFF` 행) · D68·⑧(A-PTN-02 정지 사유 여러 개·메모·[사유 해소]·열람 표 ‘남은 사유가 모두 풀릴 때’·계약 종료 사유 ‘사업자 폐업’, P-ONB-04, A-STL-01, 알림 행 이름) · D69·⑪(U-MEM-05·A-MEM-01·A-MEM-02 휴업 30일 유예·세금계산서 폐업만·U-MEM-07·U-ORD-02 회원 유형 바뀜·키 설명, `NOTI_BIZ_STATUS_RESTORED`) · D70(C-PRICE-03·C-PAY-02 처음 배송비·‘마지막 = 잔액 전부’ 고침·예시, U-MY-03, 정산 이벤트 ‘돌려주지 않은 처음 배송비’ 3곳·배송비 정산 시점 2곳) · D71(P-ORD-05 새 줄 ‘거부 수량 되돌려 보내기’, U-MY-03, C-STATE-02 두 행, 키 `claim.return_back_pay_days`·`claim.return_back_ship_bd`, `NOTI_RETURN_BACK_DUE`·`NOTI_PARTNER_RETURN_BACK`) · D72·⑰·㉑(P-ORD-03 예외·무단 지연·바로 취소 알림, P-ORD-01 키 2개·자동 취소 없음, A-ORD-01 ‘지연 예외 기간’, A-PTN-03, U-CS-04, C-STATE-01·02, `NOTI_BULK_DELAY_NOTICE`·`NOTI_PARTNER_BULK_DELAY_NOTICE`·`NOTI_PARTNER_ITEM_CANCELED`) · ③(D-PRD-03, `NOTI_INT_CHANNEL_MESSAGE`, 묶음 규칙·키 설명) · ④(A-MKT-01 저장 막기, A-REV-04 영향 범위) · ⑩(C-NOTI-01 이메일 조건 없는 ○ 11행·범례) · ⑬(C-STL-01 ‘중재 판정’ = 받을 돈 +만·파트너 부담은 본사 청구 ‘분쟁 조정’, P-STL-01·C-STL-02 본사 청구 목록·세금계산서, C-PAY-02·A-ORD-02 문장 4곳) · ⑯(C-STATE-03 SHIPPED 줄, D-STU-01·D-PRD-04) · ⑱(C-STATE-02 두 행·쓰는 상태 칸·공통 용어 — 기각은 바로 완료) · ⑳(C-PAY-02·A-ORD-01 송금 대기) · ㉒(`claim.late_return_days` 키·본문 4곳·C-STATE-02 키 목록). `#g-dec4`에 ‘남은 확인 거리 S12’ 묶음 7행 + 표 위 ‘함께 맞춘 것’. 알림 코드 새로 7개.
- 명세 12번(포크): A-SYS-03 키 120 → **164개**(MVP 키 35개 + 한 키에 여러 값이던 7개를 16개로 나눔 + `settlement.payout_min`), 키 없이 남은 MVP ‘(정책값)’ 0, 2·3차 20곳은 ‘(정책값, 2차에 키)’, 키로 두지 않을 것(법정·약관·계약·화면 설계·배포 설정·D53 원칙)은 근거 표시. 기능 162 그대로, 검사 통과.
- 기획서·요청서·법률 질문서(포크): 기획 15장 ‘확정 (2026-10-17 추가 · 남은 확인 거리 S12)’ 절 7행·머리말 건수, 07장 E(D72)·F(D70·D71). 요청서 S-04(휴업 배너)·S-25(일괄 공지 안내)·S-26(처음 배송비·되돌려 받기/폐기 14일)·법률 초안 상자. 법률 L-21(처음 배송비 반환 의무·14일 뒤 폐기·소액 지연배상금 송금)·L-61(늦게 받음과 3개월·30일) 덧붙임, 질문 61·1순위 29 그대로. 메인 마무리: 기획 15장 기본값 ‘부분 취소 시 포인트’ 행의 ‘계산 없이 잔액 전부’ 고침.
- 정리본 `refund-policy.html`: ‘2026-10-17에 정한 것’ 상자(D70·D71·D72·카드 환불 송금 대기), R3·R8·X4 상자, T13 키 이름, T15·T16 새 행 → 게시본 **버전 14**.
- 다섯 문서 검사 통과(명세 기능 162 = 119·34·9, 중복 ID 없음, 태그 맞음), texts spec·plan·brief·legal-consult 다시 뽑음.

**엔진**(검사 44 → **45개 통과**, TC-45 새로)
- `partialCancel` D70: `fault`(파트너 귀책 반품이면 묶음이 빌 때 처음 배송비 환불)·`keptBefore`(앞서 남긴 금액), 결과 `shipKept`·`shipKeptLines`·`kept`, 마지막 건 = 잔액 − 이번 공제 − 돌려주지 않는 처음 배송비 − 앞서 남긴 금액(모자라면 `shortfall`). 품목 디자인비 몫은 그 품목의 마지막 수량이 빠질 때(예전엔 처음부터 전부 취소할 때만).
- `GC.production.printDue`(D66·D67), `GC.order.inNotice`·`afterNotice`·`isOverdue({ notice })`(D72), `overdueAt`·`refundDueAt` 영업일 인자, `Policy.legalOk`·메타 `legal`('min'·'max'), `RETURN_REASONS` LATE 기한을 정책값에서·CHANGE_MIND `legal`, `CLAIM_STEP_BY_TYPE.REMAKE` 단계 5개, DESIGN `complete`·CLAIM_CANCEL `collected_refund` 설명.
- 정책값 키 87 → **142개**(S12 키 55개쯤 — 새 묶음 ‘광고·검색·앱’). 명세 A-SYS-03에만 남은 22개는 2·3차 기능 키이고 프로토타입이 쓰지 않음.

**페이지**(흐름 122 → **145개**, hub 제외 144 — 마무리 때 전체 3개씩 실행 **모두 PASS**, 엔진 검사 45개 통과. 엔진·공통 자산은 페이지 에이전트가 바꾸지 않음)
| 페이지 | 반영 | 흐름 | 새 흐름 |
| --- | --- | --- | --- |
| order | D70(`fault`·`keptBefore` 누적 `o.kept`, ‘돌려받는 배송비’/‘판매자 몫’ 줄, 무료배송 묶음 전부 변심 반품 왕복, 정산 ‘클레임 완료(+)’, ‘묶음 전부 반품’ 장면·본사 비교 64,000 / 56,000 / 30,000 + 34,000 / 26,000 + 26,000), D71(거부 확정 뒤 [되돌려 받기] 모의 결제·[폐기]·남은 기한·3일 전 알림·기한 뒤 폐기·파트너 송장 2영업일·폐기 확인), ⑰, ⑳(계좌 있음/없음 옵션·7일 뒤 재알림·모니터링 ‘송금 대기’), ㉑(PAID 무단 지연·모니터링), D72(출고 지연 장면에 일괄 공지), ㉒·⑫ 상수 → 키, ⑩ | 19개 PASS(`order-inspect-split` 거부 확정 뒤 [폐기] 순서로 고침) | order-retall(+narrow), order-returnback(+narrow), order-refund-noacct, order-paid-overdue, order-bulk-notice-dark |
| design·room | D66(철회·기각 때 `printDue` 새로·`NOTI_PARTNER_PACKAGE_HANDED_OFF`, 고객 코드 `NOTI_CLAIM_WITHDRAWN` 뺌, 보류 중 ‘기한 알림 멈춤’), D72(공지 시작·끝 기록, `isOverdue({notice})`·`afterNotice`, 고객 공지 카드는 요청서 S-25 문구), `REMAKE_STEP` 지움, ⑯ [폐기 확인 올리기], room ③ `NOTI_INT_CHANNEL_MESSAGE`(협의 룸과 따로 셈), ⑫·⑩ | 23개 PASS(`design-delay-narrow` 공지 끝 뒤 +1일 두 번, `design-delay-dismiss` 폐기 확인 단계) | design-hold-release, design-hold-withdraw-narrow, design-bulk(+dark), room-channel |
| partner | D68(사유 목록·[정지 사유 더하기]·재조회 휴업/폐업 사유 추가·사유별 [사유 해소]·마지막만 ACTIVE·종료 사유 ‘사업자 폐업’·배너·목록), ⑧ 메모 200자, D67(제안 없던 확정 건도 새 기한·알림 하나), D72 [공지 시작]·[공지 끝] 체험, ⑰, ⑩, ⑫ 상수 4개 → 키 | 13개 PASS(기대값 안 고침) | partner-stops(+narrow), partner-notice-dark |
| member·benefit·catalog | member D69(재조회 ‘휴업’·30일 유예·`NOTI_BIZ_STATUS_RESTORED`·세금계산서 폐업만·휴업/폐업 문구 나눔·결제 끝난 주문 안내) + 상수 6개(와 로그인 잠금·개인정보 조회 잠금) → 키, benefit ④ 입력 즉시 오류·[승인 요청] 막음(체험용 ‘무료 기준 올림 예약’ 토글), catalog 상수 5개 → `product.*`(1,200px는 화면 설계 값), ⑩ | 37개 PASS(`benefit-design-coupon-min`(+narrow) 경고 → 오류 검사) | member-suspend(+narrow), benefit-design-coupon-block(+narrow) |
| settlement·system | settlement ⑬ ‘확인 필요’ 안내 → 명세 문장·표 나눔, D70 ‘돌려주지 않은 처음 배송비’ 줄(엔진으로 계산 — 환불 56,000원·클레임 완료 +8,000원), ⑫ 상수 → 키. system 새 단위 범위·글자 키 안내 8개·`LEGAL` → 엔진 `legal`/`legalOk`·미리보기 영업일 인자·`K` 상수 정리(조회 잠금 → 키, 나머지 ‘보안 고정값’·‘약관·계약 조항에 고정’·‘법정 값’), 알림 매트릭스 새 코드 7행·이메일 조건 문구 | 29개 PASS(`settlement-delay`(+dark·narrow) 새 문장 검사, `system-policy-security`(+narrow) 글자 값 행 — 고치기 전부터 FAIL) | settlement-s12(+narrow), system-s12(+narrow) |
| index(메인) | 개요 ‘근거’ D53~D61·S12(D66~D72), 도메인 설명 4줄(order·design·partner·member) | — | — |

**재게시**: 게시본 12개가 커밋 c3b0b06 `prototype/`과 같음을 확인(해시, 줄바꿈 무시)한 뒤 `build_publish.py` → https://claude.ai/artifact/WcNnk7zXsAEJq6jwuhPjDd **버전 11**. 정리본 게시본 **버전 14**.

## 판단해서 넣은 것(결정과 다르면 고칠 것)
- 명세: ⑧ 해제 사유 ‘본사 오처리 정정’도 메모 필수(감사 기록), ⑯ 회수품은 파트너가 받아 폐기 확인, D71 송장 기한 키 `claim.return_back_ship_bd` 2영업일·3일 전 재알림, D72 공지 범위 ‘전체 또는 택배사’, `NOTI_PARTNER_ITEM_CANCELED` 이메일 —(파트너 출고 지연 행과 같게), `NOTI_RETURN_BACK_DUE` 이메일 ●. 12번(포크): 룸 위반 반복 기준을 디자이너·고객 두 키로, 고객 로그인 잠금 5회·10분도 키로, 재조회 시각은 `batch.` 접두어, U-CS-02 `cs.answer_bd`를 MVP 키로, 단순 변심 7일은 법정 값이라 키로 두지 않음.
- 엔진: 마지막 건의 끝전 정리는 호출하는 쪽이 넘긴 `keptBefore`에 기댐(넘기지 않으면 앞서 뺀 공제를 다시 돌려줌 — 예전과 같음).
- order: 출고 뒤 취소 이의가 인정돼 회수하는 건은 판매자 귀책으로 보고 묶음이 비면 처음 배송비도 환불, ‘무료배송 묶음’은 템플릿 기본 배송비 0원만(쿠폰으로 0원은 제외), 되돌려 보낸 물건의 고객 알림은 `NOTI_SHIPPED`.
- design: 확정 후 **변경** 요청이 기각돼도 D66 적용, 패키지를 아직 안 보냈거나(APPROVED) 파트너가 반려한(PREFLIGHT_REJECTED) 건은 보류만 풀고 기한은 다음 전달 때, 중재 기각 때 파트너는 중재 결과 + 새 기한 두 알림, 생산 지연 취소를 고객이 철회하면 파트너 알림 없이 기록만.
- partner: 휴·폐업 사유는 재조회가 정상일 때 ‘사업자 상태 정상 확인’으로만 해소(다른 사유에는 이 해소 사유를 못 씀), ‘사업자 폐업’ 종료는 국세청 폐업 확인 때만, 계약 종료 때 남은 정지 사유는 ‘계약 종료로 마감’.
- member·benefit: 유예 중 휴업↔폐업이 바뀌면 해제 예정일은 그대로, 세금계산서 기준만 바꾸고 `NOTI_BIZ_STATUS_CHECK` 다시. 고객이 [다시 인증하기]로 직접 풀면 `NOTI_BIZ_STATUS_RESTORED`를 보내지 않음.
- settlement·system: 접속 기록 보관(1년, 5만 명 이상 2년)도 법정 값 표시, 발주 확인 리마인드가 운영팀 알림보다 늦으면 저장 막음, 되돌려 받기 기한 최솟값 4일, 직거래 위약금 배수 ‘영향 큼’, 판매 중지 예고는 납부 기한 3일 전(아래 S13 1번).

## S12 마무리
- 전체 흐름 144개(hub 제외) 3개씩 다시 실행 — 모두 PASS(엔진 검사 45개 통과). 다섯 문서·정리본 검사 통과.
- 남은 페이지 상수(키 없음 — 아래 S13 12번): order `rbRemind` 3일·`acctRemind` 7일, partner `sample_wait_days`·`contract_sign_days` 14·`acct_max_fail` 3·`acct_fee` 50·`doc_max_mb` 20·`new_months` 3·`holdback_days` 90·`REMIND_DAYS`, settlement 판매 중지 예고 3일·대사 불일치 팀장 알림 3일·유보 90일, catalog `doc_notice_days`·`fix_repeat_md`, benefit `codeFailMax`·`codeLockMin`·`expireNoticeDays`(2차 값과 법정 값은 주석으로 성격 표시).

# S13 입력 — S12에서 새로 찾은 확인 거리 (2026-10-17 작성)

> 급하지 않은 것들입니다. 결정 번호는 **D73~**. 범위 밖으로 남는 큰 것은 법률·PG 자문 답 반영(아직 문의 전).

| # | 요약 | 종류(대강) | 명세 | 찾은 곳 |
| --- | --- | --- | --- | --- |
| 1 | 미수금 청구서 미납 때 판매 중지 예고(`NOTI_PARTNER_SALES_STOP_NOTICE`)를 언제 보내는지 없음(페이지는 납부 기한 3일 전) | 맞춤 | C-STL-02·C-NOTI-01 | settlement |
| 2 | 한 키에 두 값: `settlement.final_holdback`(30% · 90일), `commission.new_partner_discount`(−2%p · 3개월) — 기간 키를 나눌지 | 맞춤 | A-SYS-03 | settlement·partner |
| 3 | 유예 중 회원 사업자 상태가 휴업↔폐업으로 바뀔 때(해제 예정일·세금계산서·다시 알림), 정지 중 파트너의 재조회 결과가 휴업↔폐업으로 바뀔 때 다시 알릴지 | 결정 | U-MEM-05·A-MEM-02·P-ONB-04 | member·partner |
| 4 | 폐업 ‘확인 필요’ 중 새 사업자등록번호로 바꾸는 경로가 없음(같은 번호 재조회만) | 결정 | U-MEM-05·A-MEM-02 | member |
| 5 | `NOTI_MEMBERSHIP_PAY_FAILED` 재시도 실패 알림도 이메일 ● — ‘리마인드는 —’ 원칙과 맞는지 | 맞춤 | C-NOTI-01 | benefit |
| 6 | 서류 만료 사전 알림 30일·같은 사유 보완 3회 → MD(MVP)에 키·‘(정책값)’ 표시 없음 | 맞춤 | P-PRD-06·P-PRD-07·A-SYS-03 | catalog |
| 7 | 고객이 확정 후 취소·생산 지연 취소 요청을 철회할 때 파트너에게 보낼 알림 코드가 없음 | 맞춤 | P-ORD-04·C-NOTI-01 | design |
| 8 | D-PRD-03 ‘파트너 답변 기한 영업일 1일’이 `partner.confirm_request_days`와 같은 값인지 | 맞춤 | D-PRD-03·A-SYS-03 | design |
| 9 | D67 ‘한 건에 알림 하나’와 중재 기각 때 파트너가 받는 두 알림(중재 결과 + 새 기한)을 하나로 묶을지 | 결정 | D-APV-02·C-NOTI-01 | design |
| 10 | 정지 사유가 일부만 풀리고 다른 사유가 남을 때 파트너 알림이 없음(지금 감사 로그만) | 맞춤 | A-PTN-02·C-NOTI-01 | partner |
| 11 | `NOTI_PARTNER_ONBOARD_RESULT` 알림센터 ●가 계약 전(신청용 로그인만 있는) 신청자에게 맞는지 | 맞춤 | C-NOTI-01·P-ONB-01 | partner |
| 12 | 키 없는 페이지 상수 남은 것(위 ‘S12 마무리’ 목록 — 샘플 도착·서명 기한 14일, 되돌려 받기·계좌 입력 재알림 3일·7일 등) | 맞춤 | A-SYS-03·P-ONB-02·03 등 | 여러 페이지 |
| 13 | D71 ‘거부 유지 + 파트너 귀책’과 `claim.return_back_ship_bd` 설명 ‘파트너 귀책이면 거부가 뒤집힌 뒤’의 뜻이 서로 모호 | 맞춤 | P-ORD-05·A-SYS-03 | order |
| 14 | 되돌림 배송비 결제 건의 정산 귀속(파트너 몫인지)·증빙이 없음 | 결정 | P-STL-01·C-STL-01 | order |
| 15 | 되돌려 보내기 송장 기한(영업일 2일)을 파트너가 넘겼을 때 처리 없음 | 맞춤 | P-ORD-05 | order |
| 16 | C-PRICE-03 ‘무료배송으로 받은 묶음’이 쿠폰으로 0원이 된 경우를 포함하는지(페이지는 템플릿 기본 0원만) | 결정 | C-PRICE-03 | order |
| 17 | 판단 확인: 출고 뒤 취소 이의 인정 회수 = 판매자 귀책으로 처음 배송비 환불(order), 확정 후 **변경** 요청 기각에도 D66(design) | 확인 | C-PAY-02·D-APV-02 | order·design |

엔진 제안(S13에서 판단): C-NOTI-01 채널 표를 엔진 데이터로(페이지마다 CH 표를 두지 않게), `calendar.business_hours`를 시각 숫자로 읽는 도우미, 공지 여러 개를 받는 `isOverdue`/`afterNotice`, 정지 사유 도우미 `GC.partner.stops`, 정책값 메타에 값 범위(min·max·소수), 반품 배송비(편도·왕복)와 묶음이 비는지 계산하는 함수, 거부 수량 되돌려 보내기 상태 기계, 다시 알림 간격 키. S12에서 보류한 것: `priceChangeInfo`, `claim.tolerance` 두 키, `GC.notice.dueAt`, DISCARDED 사유, `designCancel` 되살릴 혜택 목록, `GC.settle.sumEvents`, 기한 전날 도우미, [인쇄 가능] 전이 항목 연결 메타, `partialCancel` `lines` 할인 안분, `calcOrder` 고객용 단계 이름.

---

# D73 입력 — 표준안 정리를 프로토타입에 반영 (2026-10-17 작성, 다음 세션)

> 문서(결정 `decisions.md` D73 · 명세 · 기획서 · 요청서 · 법률/PG 질문서 · 정리본)는 2026-10-17 ‘표준안’ 세션에서 고쳤습니다. 프로토타입(엔진·페이지·흐름·재게시)은 이 표대로 다음 세션에서. **S13보다 먼저** 합니다(S13 일부가 이걸로 없어짐 — 아래 맨 끝).

| # | 무엇 | 명세 | 고칠 곳(찾은 것) |
| --- | --- | --- | --- |
| 1 | 클레임 유형: `CUSTOM_CANCEL` 없앰, `DELAY_CANCEL` → `MANUAL`(‘관리자 처리 요청’ — 맞춤 생산 지연 고객 요청 + CS가 연 건). 진행 라벨 ‘관리자 처리 중’, 기각 결과 `DISMISSED` ‘요청 기각’. 자동 승인 없음, 결과 전 철회 가능 | C-STATE-02 · 공통 용어 | engine.js · engine.test.js · design · partner · settlement · index(‘취소 중재’) |
| 2 | 맞춤 확정 뒤 ~ [인쇄 가능] 전(확정 후 변경 건·재주문 포함)은 고객 [취소] 바로(`CANCEL`) — 공제는 첫 시안 뒤 낸 디자인비만, 판비 전액 환불. 파트너에게 `NOTI_PARTNER_ITEM_CANCELED`. 생산 보류는 확정 후 **변경** 요청 때만 | C-STATE-01·03 · D-APV-02 · C-PAY-02 예시 2 · U-MY-02 | engine `designCancel` · design · partner |
| 3 | 판비 공제 = 취소 보상 = min(증빙, 낸 판비)·판 제작 증빙(영업시간 4시간)·‘취소 보상’ 정산 이벤트 없앰. 판은 [인쇄 가능] 뒤에 만든다는 안내 | C-PAY-02 · P-ORD-04·06 · C-STL-01 · P-STL-01 | design · partner · settlement · system(판 제작 증빙 설명) · engine |
| 4 | C-STL-01 예시 1 지급액 **655,000 → 625,000**(취소 보상 30,000 줄 뺌) | C-STL-01 | engine.test.js TC-27 · settlement 페이지 · 흐름 `settlement-mvp.json`(‘655,000’·‘30,000’ 확인 식) |
| 5 | 지연배상금: 자동 계산·자동 송금·카드 환불 송금 대기 없앰 → 기한 저장·감시·모니터링 ‘환불 기한 초과’는 그대로, 관리자 처리 화면이 기준액(환불액 × 연 15% × 일수 ÷ 365)을 보여 주고 관리자가 금액·부담 입력 | C-PAY-02 · A-ORD-01·02 · A-SYS-03 | engine(지연배상금 계산은 ‘기준액’ 함수로만) · order · settlement · system |
| 6 | 검수 거부 확정 물건: 파트너가 영업일 2일(`claim.return_back_ship_bd`) 안에 **착불**로 되돌려 보냄. [되돌려 받기] 결제·[폐기] 선택·14일·다시 알림 없앰. 키 `claim.return_back_pay_days`·코드 `NOTI_RETURN_BACK_DUE` 없앰(명세 정책값 키 164 → 163) | P-ORD-05 · U-MY-03 · C-STATE-02 · A-SYS-03 · C-NOTI-01 | engine 정책값 키·`RETURN_BACK` 흐름 · order · system |
| 7 | 제작 파트너 변경 차액: 계산식((할인 전 금액 차이) × 결제 비율) 없앰 → 운영팀이 제안 때 차액 환불 금액을 넣음(상한 = 낸 금액) | A-ORD-01 ④ · C-PAY-02 | engine `priceChange`류 · order · partner · catalog · settlement |
| 8 | **관리자 처리 화면**(A-ORD-02): 들어오는 건 4가지(이의 제기 · 생산 지연 요청 · 환불 기한 초과 · CS가 연 건). 입력 = 처리 방식(환불/재제작·교환/기각), 환불 금액, 그중 파트너 부담액(나머지 본사 — 본사 부담·고객 손해 표시), 회수 여부, 반품·회수 배송비·재제작 비용 부담, 지연배상금, 인쇄물·판 처리·연결 보장 해제, 이용권·쿠폰 되살리기, 사유(필수). 검사 = 환불 금액 ≤ 낸 금액 중 남은 몫 · 불량/오배송/표시와 다름이면 전액 고정 · 파트너 부담액 ≤ 환불 + 지연배상금 · 사유 필수. 파트너 부담액은 본사 청구 ‘분쟁 조정’ 차감 | A-ORD-02 · C-PAY-02 · C-STL-01 | engine 새 검사 함수 + 관리자 중재 화면이 있는 페이지(다음 세션에 찾음) |
| 9 | 맞춤 생산 지연: [취소 요청] → [관리자 처리 요청]. 승인 = 전액·디자인비 파트너 부담·연결 보장 자동 해제 / 기각 = 새 출고 예정일·다시 요청 규칙 없앰(D59·D61). D72 일괄 공지 문구도 버튼 이름만 | P-ORD-03 · D-RE-01 · A-ORD-01 | engine · design · partner · order |
| 10 | 확정 때 별도 동의 문구: ‘판매자가 인쇄를 시작하면([인쇄 가능]) 단순 변심 취소·반품을 할 수 없습니다. 인쇄 시작 전에는 바로 취소되고, 낸 디자인비만 빼고 환불합니다’ | D-APV-01 | design(확정 화면) |
| 11 | ‘결과는 최종’ 문구 → ‘플랫폼 안 재판정 없음 + 외부 분쟁 조정 안내’, 파트너는 입점 계약 분쟁 절차 | A-ORD-02 · C-STATE-02 · U-MY-02·03 · P-ORD-04·05 | order · partner |

흐름: 위 2·4·6·8·9를 확인하는 흐름을 고치거나 더하고(확정 뒤 바로 취소 금액, 관리자 처리 상한·하한, 착불 되돌림, 625,000) 전체 흐름 재실행 → 같은 URL로 프로토타입 재게시.

**S13 입력 중 D73으로 바뀐 것:** 7(확정 후 취소 철회 알림 → 관리자 처리 요청 철회 알림만 남음) · **9 없어짐**(생산 지연 기각의 새 기한 알림이 없음) · 12 일부 없어짐(되돌려 받기·지연배상금 계좌 재알림 상수) · **13 해소**(명세 `claim.return_back_ship_bd` 설명을 ‘거부 확정 뒤 착불 되돌림’으로 고침) · **14 없어짐**(되돌림 배송비 결제가 없음) · **15 해소**(기한을 넘기면 관리자 처리). 3·4·16·17 결정 거리는 그대로.

---

# 정리 1단계 입력 — 정책값·알림 범위 줄이기를 프로토타입에 반영 (2026-10-17 작성, 프로토타입 세션)

> 문서(결정 `decisions.md` D74~D76 · 명세 A-SYS-03·C-NOTI-01·본문 표시 · 기획서 08·15장 · 법률 L-48 · 정리본 T 표)는 2026-10-17 ‘정리 1단계’ 세션에서 고쳤습니다. **값·계산·상태는 바뀌지 않았으므로** 엔진 계산과 흐름 기대 금액은 그대로이고, 표시·분류만 바뀝니다. ‘D73 입력’과 정리 2단계 변경과 함께 한 번에 반영합니다.
> **확인 거리 기준(D74):** 명세에 없는 세부(알림 채널·문구·묶음·재알림 시점, 상수 값, 드문 예외)는 페이지에서 기본값으로 정해 ‘판단해서 넣은 것’에 적고 확인 거리로 올리지 않습니다. 돈·법·고객 권리에 걸리는 것만 확인 거리로 올립니다.

| # | 무엇 | 명세 | 고칠 곳(찾은 것) |
| --- | --- | --- | --- |
| 1 | 엔진 정책값 키 142개를 **관리자 설정 키**(명세 첫 표 — MVP 29 + 2차·3차 19)와 **상수**로 나눔. 값은 그대로. 예: POLICY 항목에 `kind: 'key' \| 'const'`, `GC.Policy.meta(key).kind`. 명세에 없는 페이지 상수(S13 12번)는 상수로 엔진에 모아도 되고 페이지에 둬도 됨 | A-SYS-03 | engine.js · engine.test.js(키 수 검사) |
| 2 | system 정책값 화면: 편집하는 목록은 키만(영역 = 달력 · 수수료 · 디자인 가격·무료 수정·SLA · 할인 · 주문·클레임·생산 기한 · 2차·3차 요금·혜택). 상수는 편집 칸 없이 읽기 전용 목록으로 두거나 숨김. 보안 값 ‘최고관리자만’ 설명 → ‘상수, 배포로 바꿈’ | A-SYS-03 · A-SYS-01 | system |
| 3 | 페이지 문구의 ‘(정책값 …)’ 중 상수가 된 것 → ‘(상수 …)’(또는 표시 없앰). 키 목록은 명세 A-SYS-03 첫 표 | 본문 전체 | 모든 페이지(grep `정책값`) |
| 4 | 알림: system 알림 표·페이지별 채널 표(CH)를 C-NOTI-01 새 형태로 — ‘채널 원칙(등급 5줄)’ + ‘필수 알림 목록(코드 91)’. 목록에서 빠진 35개 코드(진행 안내·메시지·업무 대기)는 페이지에서 계속 써도 되고, 채널은 등급 원칙(진행 안내 = 앱 푸시 또는 알림톡 + 알림센터, 이메일 없음)으로 보여 줌 | C-NOTI-01 · C-NOTI-02 | system · 알림 미리보기가 있는 페이지(order·design·partner·benefit·settlement) |
| 5 | 진행 안내 알림(디자이너 배정·수정본 도착·생산 시작·입금 기한 하루 전·구매 확정 하루 전·리마인드)에 이메일·SMS를 함께 표시하던 곳이 있으면 원칙대로 고침. 필수 알림의 이메일은 돈·결과·계약일 때만 | C-NOTI-01 | 위와 같음 |

흐름: 정책값 화면·알림 표를 보는 system 흐름의 기대값(키 수·영역 이름·채널 표시)을 고치고 전체 흐름 재실행. 금액 흐름은 바뀌지 않아야 합니다.

**S13 입력 정리(정리 1단계 뒤):** 2·5·6·8·10·11·12는 D74~D76으로 확인 거리에서 뺌(2 = 상수·키 나누기는 개발 때, 5 = 멤버십 결제 실패는 필수(돈)라 이메일 그대로, 6·8·12 = 상수 값, 10·11 = 알림 세부). 1(판매 중지 예고 시점)·7(관리자 처리 요청 철회 알림)도 D74(상수 값 · 알림 세부)로 개발 때 기본값 — 페이지의 지금 값(납부 기한 3일 전 · 철회 알림 없음 또는 진행 안내)을 그대로 씀. 9·13·14·15는 D73에서 정리됨. **남은 것:** 3·4(사업자·파트너 상태) → 정리 2단계 6번과 함께, 16(쿠폰으로 0원이 된 무료배송) → 정리 2단계 3번(할인·쿠폰)과 함께, 17(페이지 판단 확인) → 프로토타입 세션에서 확인. 엔진 제안 중 ‘C-NOTI-01 채널 표를 엔진 데이터로’는 위 4번(등급 원칙)으로, ‘정책값 메타에 값 범위’는 키에만.

---

# 정리 2단계 입력 — 할인·쿠폰 · 제작 파트너 변경 · 추가 구성품 · 사업자·파트너 상태를 프로토타입에 반영 (2026-10-18 작성, 프로토타입 세션)

> 문서(결정 `decisions.md` D77~D80 · 명세 C-PRICE-01~03·C-PAY-02·C-STL-01·C-STATE-01~03·C-NOTI-01·U-ORD-02·05·07·U-BEN-01·05·U-MY-01·02·U-MEM-05·07·A-MEM-01·02·A-PTN-01·02·A-ORD-01·02·A-STL-01·A-MKT-01·A-REV-04·A-SYS-03·P-PRD-02·P-ONB-02~04·P-ORD-01·03·P-PRM-02·03·D-REQ-03·04·D-OPT-01·D-PRD-02·`#g-dec4` ‘정리 2단계’ 4행 · 기획서 03·05·07·11·15장 · 요청서 S-04·S-21·S-25·S-26·S-28·09·11장 · 법률 L-01·21·25·26·41·43·T-04·05 · PG PG-05·71 · 정리본 버전 17)는 2026-10-18 ‘정리 2단계’ 세션에서 고쳤습니다. **동작이 바뀝니다** — 엔진 계산·상태·흐름 기대값이 바뀝니다. ‘D73 입력’·‘정리 1단계 입력’과 함께 한 번에 반영합니다. 줄 번호는 조사 때(2026-10-18) 프로토타입 기준입니다.

| # | 무엇 | 명세 | 고칠 곳(조사 때 찾은 것) |
| --- | --- | --- | --- |
| 1 | **D77 본사 쿠폰 1장(엔진):** `calcOrder`의 본사 상품 쿠폰·디자인비 쿠폰·배송비 쿠폰을 쿠폰 하나(`coupon {kind}`)로 합침, 할인이 가장 큰 쿠폰 자동 추천, `couponDiscount`·`designCouponDiscount` 합침, 배송비 쿠폰의 ‘본사 쿠폰 후’ 기준 → 파트너 할인 뒤, `steps` 표시. 이용권(`voucher`) 경로는 2차 규칙으로 남기되 쿠폰 칸 밖. `allocate`(안분)는 그대로. `partialCancel` 쿠폰 복원(680~702)·`designShare`(628) 확인. C-PRICE-01 예시 **134,000 → 137,000**(멤버십 배송비 쿠폰 줄 없앰), C-PAY-02 예시 1 수단 안분 750P·50,457 → **730P·50,477**, 2차 1,270P·86,523, 누적 카드 137,000 | C-PRICE-01·02·03 · C-PAY-02 | engine.js `calcOrder`(427–569) · 검사 TC-01·02·07(예시 숫자) · TC-35(D21) · TC-41·42·43(D41·D51) · TC-44(이용권) |
| 2 | **D77 페이지:** 쿠폰 시트·발행 폼·쿠폰함·주문서 쿠폰 칸을 1장으로, 디자인비 판정 표시에서 ‘50만원 → 이용권 → 쿠폰’ 문구 없앰, 정산 보전 예시(예시 2 냅킨 배송비 = 고객이 낸 4,000) | U-ORD-02 · U-BEN-01 · A-MKT-01 · C-STL-01 | benefit.html · order.html · design.html · settlement.html |
| 3 | **D77 S13 16번:** 본사 쿠폰으로 0원이 된 배송비 묶음의 단순 변심 전부 반품 = 편도. 프로토타입은 이미 템플릿 0원만 왕복(order.html 478–485) — 엔진 TC-45에 사례만 더함 | C-PRICE-03 | engine.test.js |
| 4 | **D78 판매자 사정 취소(엔진):** `partnerChange`(792)·내보내기(1306)·상수 `order.partner_change_reply_days`(81)·이벤트 `partner_change_cancel`(1029)·`partner_changed`(1142) 없앰. `partner_change_refund`(1071·1143) → 일반 품절 취소 이벤트(1024)를 맞춤 항목([인쇄 가능] 전 DESIGNING·DESIGN_CONFIRMED, 주체 본사)까지 넓힘. 출고 전 구성품은 `parent_canceled`(1028)로. `printDue` 주석(612) | A-ORD-01 · C-STATE-01·03 · C-PAY-02 | engine.js · TC-39 다시 씀 · TC-45의 D67 부분 확인 |
| 5 | **D78 페이지:** 고객 ‘판매자 변경 확인 필요’ 카드·[변경 동의]·[전액 환불] → ‘판매자 사정으로 취소’ 안내(전액 환불 + 같은 디자인으로 새로 주문, 디자인비는 새 주문 기준), 관리자 [판매자 사정 취소](일괄), 정산 다시 저장 예시·정지 해제 때 제안 거두기 없앰 | U-MY-01 · A-ORD-01 · A-PTN-02 · C-STL-01 | order.html(장면 pc_lo·pc_mid·pc_hi, 117·173~230·261·344~362·2000~2265) · partner.html(208~233·436~477·858~877·1099~1222·1511·1612~1620·1739~1758·1906~1959·2042) · settlement.html(222~223·684) · system.html(208) · index.html(207·214) |
| 6 | **D79 추가 구성품:** `addonCascade`(576) → 출고 전 함께 취소만(회수 쪽 지움), 이벤트 `parent_printable`(1022)·`parent_collected`(1034) 없앰, `parent_canceled`(1028) 남김. 맞춤에 붙은 구성품도 파트너 [발주 확인], 출고 지연 때 [바로 취소] | P-PRD-02 · C-STATE-01·02 · P-ORD-01·03 | engine.js · TC-36(541~544)·TC-41(630~633)·TC-42(673) · order.html(`cascadeOf` 443, 1516~1519, 1940~1951, 351~361·2154) · partner.html(1520) |
| 7 | **D80 사업자 상태:** 상수 `member.biz_closed_grace_days`(engine 157) 없앰, `batch.biz_recheck_schedule` 설명. 회원 BIZ_CHECK·`closure_detected`·`reverified`·`grace_over` → 정기 조회 결과 표시 + 관리자 [사업자 해제]. 파트너 `biz_closed` 자동 정지 없앰, 정지 사유 쌓기(STOP_REASONS·`addStop`·`liveStops`·`relFor`)·사유별 해소 → 정지 사유 + 이력, 해제는 한 번(해제 때 재조회), 심사 자동 반려 → MD 반려, 미수금 정지는 납부 뒤 MD 해제. `taxBlocked`(폐업 세금계산서 막기)는 남김 | U-MEM-05 · A-MEM-02 · P-ONB-04 · A-PTN-02 · A-STL-01 | engine.js · TC-42(655·690 기대값에서 키 뺌) · member.html(121·127~135·721~·780~) · partner.html(150~187·284·1032~1072·1318·1717~1753·1808~1838) · system.html(103·195·215) · index.html(205·214) |
| 8 | **알림:** 필수 목록 코드 91 → 86(`NOTI_ITEM_PARTNER_CHANGE_PROPOSED`·`NOTI_ITEM_PARTNER_CHANGED`·`NOTI_ITEM_PARTNER_CHANGE_REFUNDED`·`NOTI_ITEM_PARTNER_CHANGE_WITHDRAWN`·`NOTI_PARTNER_CHANGE_WITHDRAWN` 없앰), `NOTI_ITEM_STOCKOUT_CANCELED`를 맞춤 판매자 사정 취소에도 씀, `NOTI_BIZ_STATUS_CHECK` 뜻(폐업 확인 · 관리자 해제) | C-NOTI-01 | system · 알림 미리보기가 있는 페이지 |

흐름(`docs/prototype-work/tools/flows/`): **고치거나 지울 것** — benefit 쪽 `benefit-coupon-slots`(+narrow)·`benefit-design-coupon`·`-block`·`-min`(각 +narrow)·`benefit-voucher-bundle`(+dark·narrow)·`benefit-flow`·`flow2`·`dark`·`narrow`, order 쪽 `order-flow`·`order-claims`·`order-retall`(+narrow), 파트너 변경 `order-partner-change`·`order-partner-change2`·`order-partner-change-narrow`·`partner-change`·`partner-change-narrow`·`partner-change-withdraw`(없애거나 판매자 사정 취소로), 구성품 `order-addon-collect`(+narrow)·`order-addon-paid`(+narrow), 사업자 상태 `member-suspend`(+narrow)·`member-flow`·`member-hq`·`member-late`(재조회 단계)·`partner-stops`(+narrow)·`partner-biz-resumed`(+narrow)·`system-s11`·`system-s12`(+narrow)·`system-policy-security`(상수 정규식). **확인만** — `partner-flow`·`partner-overdue`·`order-addon`(+narrow)·`catalog-addon`(+narrow·dark). 그 뒤 전체 재실행 → 같은 URL 재게시.

**‘D73 입력’ 중 바뀐 것:** 7행(제작 파트너 변경 차액은 관리자 입력)은 D78로 없어짐 — 제작 파트너 변경 자체가 판매자 사정 취소로 바뀜(위 4·5).

**S13 입력 정리(정리 2단계 뒤):** 3(유예 중·정지 중 휴업↔폐업)·10(정지 사유 일부 해소 알림)은 D80으로 없어짐 · 4(새 사업자번호)는 D80으로 답함(회원 [사업자 정보 변경]으로 다시 인증, 파트너 새 입점 + 기존 계약 종료) · 16(쿠폰으로 0원이 된 무료배송)은 D77로 답함(편도). **남은 것은 17(페이지 판단 확인)뿐** → 프로토타입 세션에서 확인.
