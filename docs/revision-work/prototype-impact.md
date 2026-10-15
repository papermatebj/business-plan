# 프로토타입 영향 목록 (S7 입력 · S9 입력은 맨 아래)

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
