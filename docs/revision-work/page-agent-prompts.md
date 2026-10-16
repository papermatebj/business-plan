# 취소·환불(D53~D60) 프로토타입 페이지 반영 — 서브에이전트 지시문

> 2026-10-16 반영 세션에서 general-purpose 서브에이전트 3개에 보냈다가, 세션을 끊으면서 **읽는 단계에서 멈춘** 지시문입니다. 페이지·흐름 파일은 아무것도 바뀌지 않았습니다.
> 다음 세션은 이 세 개를 그대로(또는 고쳐서) 다시 보내면 됩니다. 보내기 전에 할 일:
> ① 로컬 서버를 띄웁니다: `cd prototype && python -m http.server 8765 --bind 127.0.0.1` (백그라운드)
> ② `git status`로 페이지가 그대로인지 봅니다.
> ③ 아래 spec.txt 줄 번호가 맞는지 봅니다(명세를 또 고쳤으면 `html2txt.py`로 다시 뽑고 `grep -n '^U-MY-01$'` 식으로 다시 셉니다).
>
> 기준선(2026-10-16, 새 엔진으로 전체 103개 실행, hub 제외): **94개 PASS, 9개 FAIL**. 실패는 모두 order 흐름입니다(`order-addon`·`-narrow`·`-collect`·`-collect-narrow`·`-paid`, `order-claims`, `order-more`, `order-objection`·`-narrow`). 엔진이 `partialCancel` 결과에서 `recalc`를 없애 `Cannot read properties of undefined (reading 'totals')`가 납니다. 예상한 실패입니다.
> 흐름 돌리기: `docs/prototype-work/tools`에서 `bash runone.sh flows/<이름>.json`. 전체는 `ls flows/*.json | xargs -P 3 -n 1 bash runone.sh`(메인은 3개씩, 페이지 에이전트는 2개씩).

---

## 1. order.html (D53·D56·D57·D58·S12 6번)

식업(외식업 소모품 B2B 오픈마켓) 대표 보고용 프로토타입에서 `prototype/order.html` 한 파일만 고쳐 2026-10-16 취소·환불 결정을 반영해 주세요. 작업 폴더(저장소 루트): `C:\MyProject\Papermate\Sikup\business-plan`. 한국어로 일하고 한국어로 보고합니다.

### 먼저 읽을 것
- 공통 지침: `docs/prototype-work/agent-brief.md` — 새 페이지가 아니라 기존 페이지 수정입니다. 화면 원칙·검증 방법·금지 사항은 그대로 따릅니다.
- 결정: `docs/revision-work/decisions.md` 맨 아래 'D53'~'D60', 'S12 6번'(D53으로 해소).
- 명세 텍스트 `docs/prototype-work/texts/spec.txt`. 기능 시작 줄(2026-10-16 기준): U-MY-01 778 · U-MY-02 800 · U-MY-03 822 · P-ORD-03 2261 · P-ORD-04 2282 · P-ORD-05 2303 · A-ORD-01 2946 · A-ORD-02 2968 · C-PRICE-03 3634 · C-PAY-02 3694(예시 1~3 포함) · C-STL-01 3788 · C-STATE-01 3886 · C-STATE-02 3966 · C-NOTI-01 4117(알림 채널). 디자인 요청서 `brief.txt`(고객 문구)도 고쳐졌습니다.
- 수정 금지(읽기만): `prototype/assets/engine.js`·`gc.css`·`ui.js`, 다른 페이지. 엔진에 바라는 점은 보고에 제안으로만 적습니다.

### 엔진에서 이미 바뀐 것 (engine.js를 읽어 확인)
- `GC.refund.partialCancel({ input, paid, refunded, cancel, cancelIds, alreadyCanceled, deduction, mode, restoreDesignCoupon })` — D53. **결제 시점 스냅샷(결제 때 수량 그대로)** 을 input으로 넘깁니다.
  - `cancel: [{ id, qty? }]`(qty가 없으면 남은 수량 전부), `alreadyCanceled: { [id]: 이미 취소·반품한 수량 }`. 남은 항목은 다시 계산하지 않습니다.
  - 돌려주는 값: `{ blocked, reason:'TIER_CHANGE', blockedBy, last, refund, pointRefund, pgRefund, itemsRefund, designRefund, shipRefund, deduction, lines:[{id,qty,all,amount,designShare}], couponsRestored:[{kind:'hq'|'partner'|'ship'|'design', name}], shortfall?, balance, remainingTotal }`.
  - `recalc`·`zeroRefund`는 **없어졌습니다**. 그래서 지금 order 흐름 9개가 실패합니다.
  - 출고 전 부분 취소로 그 항목 남은 수량의 구간 단가가 바뀌면 `blocked:true, reason:'TIER_CHANGE'`입니다. 반품(`mode:'return'`)은 막지 않습니다.
  - 고객 부담 반품 배송비(deduction)가 환불액보다 크면 `refund:0, shortfall`(모자란 만큼 추가 결제)입니다.
  - 남은 항목이 없으면 `last`로 잔액 전부를 돌려줍니다.
- 도우미:
  - `GC.refund.linePaid(line)`
  - `GC.refund.designShare(designFees, id)`
  - `GC.refund.dueAt(startAt)`: 환불 기한 = 시작 + `claim.refund_due_bd` 영업일, 그날 끝
  - `GC.refund.delayComp({ amount, dueAt, doneAt, excludeDays })` → `{ days, rate, comp }`
- `GC.order.overdueAt(promisedAt)`(약속 출고일 + `order.overdue_grace_bd` 영업일, 그날 끝), `GC.order.isOverdue({ promisedAt, now, shipped })`.
- `GC.claim.RETURN_REASONS`(단순 변심 / 불량·오배송·표시와 다름 / 늦게 받음(출고 지연) — 귀책 포함), `GC.claim.shippedLate({ promisedAt, shippedAt })`.
- 상태 머신:
  - ORDER `delay_cancel`(ACCEPTED → CANCELED, 출고 지연 뒤 고객 바로 취소)
  - CLAIM_RETURN `partial_approve`(RETURN_INSPECTING → RETURN_APPROVED, 일부 수량만 승인)
  - ORDER_CUSTOM `delay_cancel_approved` · `delay_cancel_collected`
- 정책값 키: `order.overdue_grace_bd`(1영업일) · `claim.refund_due_bd`(3영업일, 초안) · `claim.refund_delay_rate`(연 15%, 초안).
- 알림 코드(채널은 C-NOTI-01 표대로):
  - 고객: `NOTI_SHIP_OVERDUE`(출고 지연·바로 취소) · `NOTI_REFUND_DELAY_PAID`(지연배상금 지급)
  - 파트너: `NOTI_PARTNER_SHIP_OVERDUE`(출고 기한 넘김·무단 지연 기록)
  - 재무: `NOTI_INT_REFUND_DUE` · `NOTI_INT_REFUND_OVER`(환불 기한 전날·초과)

### 반영할 것
1. **D53 부분 취소·반품 환불액**
   - `refundCalc`와 `pcAddonSelfCalc` 등 `partialCancel`을 부르는 곳을 새 API로 바꿉니다. 원래 결제 스냅샷과 수량을 넘깁니다.
   - 환불 미리보기는 '취소하는 항목에 낸 금액' + (묶음 전부 취소면) 돌려받는 배송비 + 돌려받는 쿠폰(`couponsRestored`) − 공제로 보여 줍니다.
   - 없앨 것: '남은 주문 다시 계산' 설명, 0원 이하 환불·차액 추가 결제·혜택 포기 동의 UI(`zeroAgree` 등), 할인 회수.
   - 구간 단가가 바뀌는 출고 전 부분 취소는 막고 "전체 취소 후 남길 수량으로 다시 주문해 주세요"를 보여 주며 전체 취소 길로 안내합니다. 같은 구간 안이면 그대로 부분 취소합니다.
   - 페이지에 C-PAY-02 예시 1(냅킨 → 수저집 두 번 취소) 장면이 있으면 새 값으로 맞춥니다.
     - 1차: 51,207원(750P·50,457원), 냅킨 쿠폰만 돌려줌
     - 2차: 84,793원(1,250P·83,543원), 본사 쿠폰·배송비 쿠폰 돌려줌
2. **S12 6번**: 제작 파트너 변경 때 붙은 구성품 금액은 경로와 상관없이 결제 금액 그대로입니다(고객이 먼저 따로 취소해도 같음). 예전 '48,588원 / 48,612원' 차이를 만들던 재계산 문구·숫자를 없앱니다. 판비 공제 상한은 원래 판비 줄 결제 금액 그대로입니다.
3. **D56 사용·훼손된 회수품**
   - 파트너 검수에 [일부 승인]을 둡니다. 멀쩡한 수량만 승인해 그 수량에 낸 금액을 환불하고(항목 분할, `partial_approve`), 사용·훼손된 수량은 사유·사진과 함께 거부합니다(RETURN_REJECTED). 한 개짜리는 승인·거부만 있습니다.
   - 거부 수량은 고객에게 되돌려 보내고 배송비는 고객이 냅니다. 고객이 원하면 파트너가 폐기합니다. 거부 수량에도 [이의 제기]가 됩니다.
   - 금액을 깎는 '부분 환불 제안'은 없습니다.
   - 고객 반품 신청 화면에 "사용·훼손된 수량은 반품되지 않고 되돌려 보냅니다(원하시면 판매자가 폐기)"를 넣습니다.
4. **D58 안내 없는 출고 지연**
   - 장면: 발주 확인(ACCEPTED)한 일반 상품을 송장 없이 두고 시계로 `overdueAt`을 넘깁니다. 시스템이 '출고 지연'을 표시하고 고객·파트너에게 알리며 파트너 무단 지연을 기록합니다(기록만, 페널티 2차).
   - 고객 주문 상세에 [바로 취소]가 열립니다. 파트너 승인 없이 전액 환불하고, 송장 등록 전까지만 됩니다(`delay_cancel`).
   - 반품 사유 '늦게 받음(출고 지연)'은 약속 출고일(지연 안내를 했으면 새 예정일)을 넘겨 출고된 항목에만 보입니다. 파트너 귀책이라 반품 배송비는 파트너가 내고, 받은 날부터 7일 안에 신청합니다.
   - 예고 간격(`notify.notice_min_hours`)은 두지 않습니다. 취소를 열기만 하고 자동 취소가 아니기 때문입니다.
5. **D57 환불 지연배상금(법률 자문 전 초안 표시)**
   - 짧은 장면 하나면 충분합니다. 예: 파트너 반품 거부 → 고객 이의 → 본사 중재에서 고객 인정 → 환불 기한(`dueAt`, 회수 완료 + 3영업일)을 넘겨 환불.
   - `delayComp`로 계산해 환불 계좌로 따로 보냅니다(카드 환불은 승인 금액을 못 넘으니 따로). `NOTI_REFUND_DELAY_PAID`를 보내고, 재무에게 `NOTI_INT_REFUND_DUE` · `NOTI_INT_REFUND_OVER`를 보냅니다.
   - 늦게 만든 쪽이 냅니다. 파트너 거부가 뒤집혀 늦어진 건은 파트너 부담이고 '중재 판정' 정산 이벤트(−)로 남깁니다. 고객 사정 기간(계좌 입력 대기) 제외도 보여 주면 좋습니다.
   - 외부 송금은 `app.ext`로 처리합니다.
6. 그 밖에 D55·D59(확정 후 취소 기본 승인, 맞춤 생산 지연 취소 DELAY_CANCEL)는 design·partner 페이지 담당입니다. order 페이지에 그 문구가 있으면 말만 맞춥니다.

### 검증
- 로컬 서버 `http://127.0.0.1:8765/`가 떠 있습니다. 끄지 마세요.
- 흐름은 `docs/prototype-work/tools`에서 `bash runone.sh flows/<이름>.json`으로 돌립니다(PASS/FAIL 출력). 다른 에이전트도 서버를 쓰므로 **동시에 2개까지만** 돌립니다. ERR_CONNECTION_REFUSED 같은 일시 오류는 한 번 더 돌려 보고 판단합니다.
- 기존 order 흐름 14개(`flows/order-*.json`)를 모두 PASS로 만듭니다. 바뀐 규칙에 맞춰 흐름 파일의 기대값·단계를 고치는 것은 괜찮습니다.
- 새 장면마다 흐름을 하나씩 추가합니다(예: `order-overdue.json`·`order-overdue-narrow.json`·`order-inspect-split.json`·`order-refund-delay.json`). 이름은 `order-`로 시작하고, 좁은 폭은 `-narrow`, 다크는 `-dark`를 붙입니다(runone.sh가 이름으로 폭·테마를 정함).
- 인라인 스크립트는 `node --check`로 검사합니다. 스크린샷 몇 장을 직접 열어 겹침·잘림을 봅니다.
- 임시 스크립트는 세션 scratchpad 아래 `order_agent\` 폴더에 둡니다(다른 에이전트와 겹치지 않게).

### 보고(400단어 이내)
- 반영한 것(결정 번호별)
- 흐름 목록과 결과(전부 PASS인지, 새 흐름 이름)
- 판단해서 넣은 것(결정과 다를 수 있는 것)
- 새로 찾은 명세 확인 거리(기능 ID와 함께)
- 엔진 제안
- 페이지 안에 따로 둔 정책값 상수

커밋하지 마세요.

---

## 2. design.html + partner.html (D54·D55·D59)

식업(외식업 소모품 B2B 오픈마켓 + 본사 디자인팀 맞춤 인쇄) 대표 보고용 프로토타입에서 `prototype/design.html`과 `prototype/partner.html` 두 파일만 고쳐 2026-10-16 취소·환불 결정을 반영해 주세요. 작업 폴더(저장소 루트): `C:\MyProject\Papermate\Sikup\business-plan`. 한국어로 일하고 한국어로 보고합니다.

### 먼저 읽을 것
- 공통 지침: `docs/prototype-work/agent-brief.md` — 새 페이지가 아니라 기존 페이지 수정입니다. 화면 원칙·검증 방법·금지 사항은 그대로 따릅니다.
- 결정: `docs/revision-work/decisions.md` 맨 아래 'D53'~'D60'. 특히 D54·D55·D59와 D59 세부 ①~⑤를 봅니다.
- 명세 텍스트 `docs/prototype-work/texts/spec.txt`. 기능 시작 줄(2026-10-16 기준): U-MY-01 778 · U-MY-02 800 · D-REQ-04 1182 · D-APV-01 1412 · D-APV-02 1448 · D-RE-01 1693 · P-ORD-03 2261 · P-ORD-04 2282 · P-ORD-06 2327 · A-ORD-01 2946 · A-ORD-02 2968 · C-PAY-02 3694(예시 2) · C-STL-01 3788 · C-STATE-01 3886 · C-STATE-02 3966 · C-STATE-03 4045 · C-NOTI-01 4117. 디자인 요청서 `brief.txt`(고객 문구)도 고쳐졌습니다.
- 수정 금지(읽기만): `prototype/assets/engine.js`·`gc.css`·`ui.js`, 다른 페이지. 엔진에 바라는 점은 보고에 제안으로만 적습니다.

### 엔진에서 이미 바뀐 것 (engine.js를 읽어 확인)
- `GC.refund.designCancel(...)`
  - D54: `freeCustom`은 무시합니다. 첫 시안 뒤 공제는 실제로 낸 디자인비(`paidDesignFee`)만이고, 50만원 무료·멤버십 이용권·디자인비 쿠폰으로 무료였으면 0원입니다.
  - CUSTOM_CANCEL 결과에 `defaultApprove: true`가 붙습니다(D55).
  - `productionDelay: true`이고 PRODUCTION 단계면 `{ allowed:true, claimType:'DELAY_CANCEL', mediation:true, deduction:0, refund: total, designFeeToPartner, restoreBenefits:true }`입니다(D59).
- `GC.order.overdueAt(promisedAt)`(출고 예정일 + `order.overdue_grace_bd` 영업일, 그날 끝), `GC.order.isOverdue({ promisedAt, now, shipped })`.
- 상태 머신:
  - ORDER_CUSTOM `delay_cancel_approved`(IN_PRODUCTION → CANCELED), `delay_cancel_collected`(DELIVERED → RETURNED, 요청 중 출고된 건을 승인)
  - DESIGN `delay_cancel_approved`(IN_PRODUCTION → CANCELED)
  - CLAIM_CANCEL `mediation_approve`·`mediation_dismiss`를 DELAY_CANCEL에도 씁니다(기각 결과 DISMISSED '취소 기각').
  - `GC.claim.OPEN_LABEL.DELAY_CANCEL = '취소 중재 중'`이고, `canObject`는 DELAY_CANCEL을 뺍니다.
- 정책값 키: `order.overdue_grace_bd`(1영업일).
- 알림 코드(채널은 C-NOTI-01 표대로):
  - 고객: `NOTI_PRODUCTION_OVERDUE`(생산 지연·[취소 요청] 가능)
  - 파트너: `NOTI_PARTNER_SHIP_OVERDUE`(출고 기한 넘김)
  - 내부: 기존 `NOTI_INT_MEDIATION_NEW`를 생산 지연 취소 요청에도 씁니다.
  - 중재 결과: 기존 `NOTI_MEDIATION_DECIDED` · `NOTI_PARTNER_MEDIATION_DECIDED`

### 반영할 것
1. **D54**: design·partner의 '50만원·멤버십 무료 맞춤형은 39,000원 공제' 문구·계산(`freeCustom`)을 없앱니다. 첫 시안 뒤 공제는 낸 디자인비만이고 무료였으면 0원이며, 이용권·쿠폰은 사용 처리합니다. 주문 때 '무료 디자인 39,000원 공제' 별도 고지·동의가 화면에 있으면 없앱니다.
2. **D55 확정 후 취소(CUSTOM_CANCEL)**
   - 본사 중재는 그대로 둡니다. 관리자 중재 화면에 '기본은 승인'임을 보여 주고 근거(요청 사유·판 제작 증빙·협의 기록)를 함께 보입니다.
   - [승인]하면 낸 디자인비 + 판비 min(증빙 실비, 낸 판비)을 공제합니다. [기각]은 관리자 판단이고 판정 근거 입력이 필수입니다. 결과는 양측에 알리고 최종입니다.
   - 고객 안내 문구: "확정 후 취소는 본사 확인 뒤, 낸 디자인비와 (판을 만들었으면) 판비를 빼고 환불합니다"
   - 확정 화면의 제한 동의 문구(D-APV-01): "확정 후 단순 변심 반품은 할 수 없습니다. 생산 시작 전 취소는 본사 확인 뒤, 낸 디자인비와 (판을 만들었으면) 판비를 빼고 환불합니다"
   - '원칙적으로 불가' 같은 말이 있으면 고칩니다.
3. **D59 맞춤 제작 생산 지연 취소(DELAY_CANCEL)** — design 페이지에 장면을 만듭니다.
   - [인쇄 가능] 뒤 출고 예정일([인쇄 가능] + 리드타임, 지연 안내를 했으면 새 예정일) 다음 영업일이 끝날 때까지 송장이 없으면, 시계로 넘겼을 때 '생산 지연'을 표시하고 고객·파트너에게 알립니다.
   - 고객 주문 상세에 [취소 요청]이 열립니다("본사가 확인해 승인하면 낸 금액 전부를 돌려드려요").
   - 요청하면 클레임 DELAY_CANCEL이 생기고 '취소 중재 중'으로 표시됩니다. **생산 보류 플래그는 켜지 않고 생산은 계속합니다.** 파트너는 출고 가능 시점·생산 진행(사진·기록)을 올립니다.
   - 관리자 [승인]:
     - 공제 없이 그 항목에 낸 금액 전부(디자인비·판비 포함)를 환불하고, 멤버십 이용권·쿠폰을 되살립니다.
     - 인쇄물·판은 파트너가 폐기합니다.
     - 재주문 연결 보장은 사유 '생산 지연 취소'로 자동 해제합니다(다른 파트너로 다시 주문하면 디자인비 0원·판비만).
     - 돌려준 디자인비는 파트너가 부담합니다('중재 판정' 정산 이벤트 −, 모자라면 미수금).
     - 주문 항목·디자인 요청은 CANCELED가 됩니다.
   - 관리자 [기각]: 파트너에게 출고를 독촉하고 새 출고 예정일을 받습니다. 결과는 '취소 기각'이고 이의 제기가 없습니다. 그 새 예정일 다음 영업일까지도 송장이 없으면 [취소 요청]이 **다시 열립니다**.
   - 요청 중 파트너의 송장 등록은 막지 않습니다. 승인하면 회수 뒤 환불(회수 배송비 파트너)합니다. 이 갈래는 안내 문구만 있어도 됩니다.
   - 지연으로 보지 않는 경우: 디자인팀 원인(인쇄 반려), 본사 일괄 공지 지연.
4. **partner 페이지(파트너 센터)**
   - 생산 큐나 주문 목록에 DELAY_CANCEL 건은 '취소 중재 중' 표시와 [출고 가능 시점·진행 올리기]를 둡니다(생산은 계속할 수 있음).
   - 출고 기한 넘김(`NOTI_PARTNER_SHIP_OVERDUE`)과 무단 지연 기록(일반 상품은 고객 [바로 취소]가 열림 — MVP는 기록만, 페널티 2차)을 페이지 흐름에 맞게 표시합니다. 지금 파트너 페이지가 무엇을 다루는지 먼저 읽고 자연스러운 곳에 둡니다.
   - partner 페이지의 '39,000' · '부분 환불' 문구가 옛 규칙이면 맞춥니다. 반품 검수는 이제 금액을 깎지 않고 수량으로 나눕니다(멀쩡한 수량만 승인, D56).
5. 그 밖의 결정(D53 부분 취소, D56~D58 주문 쪽)은 order 페이지 담당입니다. design·partner에 그 문구가 있으면 말만 맞춥니다.

### 검증
- 로컬 서버 `http://127.0.0.1:8765/`가 떠 있습니다. 끄지 마세요.
- 흐름은 `docs/prototype-work/tools`에서 `bash runone.sh flows/<이름>.json`으로 돌립니다(PASS/FAIL 출력). 다른 에이전트도 서버를 쓰므로 **동시에 2개까지만** 돌립니다. ERR_CONNECTION_REFUSED 같은 일시 오류는 한 번 더 돌려 보고 판단합니다.
- 기존 흐름을 모두 PASS로 유지합니다: `flows/design-*.json` 15개, `flows/partner-*.json` 11개(기준선에서 모두 PASS). 바뀐 규칙에 맞춰 기대값을 고치는 것은 괜찮습니다.
- 새 장면마다 흐름을 추가합니다(예: `design-delay.json`·`design-delay-narrow.json`·`design-delay-dismiss.json`·`partner-overdue.json`). 이름은 페이지 이름으로 시작하고, 좁은 폭은 `-narrow`, 다크는 `-dark`를 붙입니다.
- 인라인 스크립트는 `node --check`로 검사합니다. 스크린샷 몇 장을 직접 열어 겹침·잘림을 봅니다.
- 임시 스크립트는 세션 scratchpad 아래 `design_agent\`에 둡니다.

### 보고(400단어 이내)
- 반영한 것(결정 번호별)
- 흐름 목록과 결과
- 판단해서 넣은 것
- 새로 찾은 명세 확인 거리(기능 ID와 함께)
- 엔진 제안
- 페이지 안에 따로 둔 정책값 상수

커밋하지 마세요.

---

## 3. benefit.html + settlement.html + system.html (D54·D57·D59·D60)

식업(외식업 소모품 B2B 오픈마켓 + 본사 디자인팀 맞춤 인쇄) 대표 보고용 프로토타입에서 `prototype/benefit.html`, `prototype/settlement.html`, `prototype/system.html` 세 파일만 고쳐 2026-10-16 취소·환불 결정을 반영해 주세요. 작업 폴더(저장소 루트): `C:\MyProject\Papermate\Sikup\business-plan`. 한국어로 일하고 한국어로 보고합니다.

### 먼저 읽을 것
- 공통 지침: `docs/prototype-work/agent-brief.md` — 새 페이지가 아니라 기존 페이지 수정입니다. 화면 원칙·검증 방법·금지 사항은 그대로 따릅니다.
- 결정: `docs/revision-work/decisions.md` 맨 아래 'D53'~'D60'. 특히 D54·D57·D59 세부 ①·⑤·D60을 봅니다.
- 명세 텍스트 `docs/prototype-work/texts/spec.txt`. 기능 시작 줄(2026-10-16 기준): U-BEN-01은 `grep -n '^U-BEN-01$'`로 찾습니다 · U-BEN-05 969 · P-STL-01 2587 · P-ONB-03은 grep · A-ORD-02 2968 · A-SYS-03 3401 · C-PRICE-01 3551 · C-PAY-02 3694(디자인 단계 공제·지연배상금·생산 지연 취소 규칙, 예시 2) · C-STL-01 3788('중재 판정' 이벤트) · C-NOTI-01 4117.
- 수정 금지(읽기만): `prototype/assets/engine.js`·`gc.css`·`ui.js`, 다른 페이지. 엔진에 바라는 점은 보고에 제안으로만 적습니다.

### 엔진에서 이미 바뀐 것 (engine.js를 읽어 확인)
- `GC.refund.designCancel(...)`: D54로 `freeCustom`을 무시합니다. 첫 시안 뒤 공제는 실제로 낸 디자인비(`paidDesignFee`)만이고 무료였으면 0원입니다. `productionDelay: true`면 DELAY_CANCEL 결과에 `designFeeToPartner`(파트너가 부담할 돌려준 디자인비)가 있습니다.
- `GC.refund.designShare(designFees, id)`: 품목별 디자인비 몫입니다. 멤버십 이용권 묶음은 첫 품목 0원, 추가 품목 19,000원입니다.
- `GC.price.calcOrder`는 이용권 묶음에 디자인비 쿠폰을 쓰지 않습니다(D60, 원래도 그랬음).
- `GC.refund.dueAt(startAt)`, `GC.refund.delayComp({ amount, dueAt, doneAt, excludeDays })` → `{ days, rate, comp }`.
- 새 정책값 키(`GC.Policy.list()`에 자동으로 나옴, 묶음 '주문·클레임·CS'):
  - `order.overdue_grace_bd`(1영업일)
  - `claim.refund_due_bd`(3영업일, `draft: true`)
  - `claim.refund_delay_rate`(연 15%, `draft: true`, 법정 값이라 고객에게 불리하게 낮추지 않음)
- 새 알림 코드: `NOTI_SHIP_OVERDUE` · `NOTI_PRODUCTION_OVERDUE` · `NOTI_PARTNER_SHIP_OVERDUE` · `NOTI_REFUND_DELAY_PAID` · `NOTI_INT_REFUND_DUE` · `NOTI_INT_REFUND_OVER`(채널은 spec.txt C-NOTI-01 표).

### 반영할 것
1. **benefit**
   - D54: '50만원·멤버십 이용권으로 무료가 된 맞춤형은 39,000원 공제' 문구·계산(`freeCustom`)을 없앱니다. 첫 시안 뒤 공제는 낸 디자인비만이고, 이용권·쿠폰은 사용 처리합니다.
   - D60: 멤버십 이용권을 쓴 묶음(품목 2개 이상)은 디자인비 39,000원만 0원이고 추가 품목 19,000원씩은 그대로 냅니다. 그 묶음에는 디자인비 쿠폰을 쓰지 않고, 쿠폰은 쿠폰함에 남아 다른 묶음·다음 주문에 씁니다. 그 묶음을 첫 시안 뒤 취소하면 공제는 낸 추가 품목 디자인비입니다.
   - 이미 이용권·쿠폰 장면이 있으면 거기에 안내·숫자를 맞추고, 없으면 짧은 장면을 하나 넣습니다.
2. **settlement**
   - '중재 판정' 정산 이벤트에 두 갈래를 보여 줍니다.
     - (a) 생산 지연 취소(DELAY_CANCEL) 승인: 고객에게 돌려준 디자인비(예: 39,000원)를 그 파트너 정산에서 뺍니다(−). 정산액이 모자라면 미수금(분쟁 조정)으로 넘깁니다. 세금계산서 처리는 '세무 확인 필요'로 표시합니다. 구매 확정이 없으니 그 항목의 구매 확정 이벤트도 없습니다.
     - (b) 파트너 거부가 중재에서 뒤집혀 늦어진 환불의 지연배상금(파트너 부담, −). '법률 자문 전 초안'으로 표시합니다.
   - 제작 파트너 변경의 전액 환불은 디자인비를 자동으로 빼지 않습니다(D59 ⑤). 비교 문장 정도면 됩니다.
   - `cancelComp`(designCancel 사용)가 그대로 맞는지 확인합니다.
3. **system**
   - 정책값 화면에 새 키 3개가 제대로 보이는지 확인합니다(묶음·단위·값 범위 검증이 페이지에 있으면 범위를 정함 — 예: 유예 0~5영업일).
   - 법정 값 키(`claim.refund_due_bd`·`claim.refund_delay_rate`)에 '법률 자문 전 초안' 표시를 붙이고, 이율을 15%보다 낮추면 경고합니다(명세 A-SYS-03 행 설명 참고). `Policy.permRow(key)` 권한 행도 확인합니다.
   - 알림 시연 표가 있으면 새 알림 코드 행을 넣습니다.
   - system의 '39,000'이 옛 공제 규칙이면 맞춥니다.

### 검증
- 로컬 서버 `http://127.0.0.1:8765/`가 떠 있습니다. 끄지 마세요.
- 흐름은 `docs/prototype-work/tools`에서 `bash runone.sh flows/<이름>.json`으로 돌립니다(PASS/FAIL 출력). 다른 에이전트도 서버를 쓰므로 **동시에 2개까지만** 돌립니다. ERR_CONNECTION_REFUSED 같은 일시 오류는 한 번 더 돌려 보고 판단합니다.
- 기존 흐름을 모두 PASS로 유지합니다: `flows/benefit-*.json` 10개, `flows/settlement-*.json` 8개, `flows/system-*.json` 16개(기준선에서 모두 PASS). 바뀐 규칙에 맞춰 기대값을 고치는 것은 괜찮습니다.
- 새 장면마다 흐름을 추가합니다(예: `benefit-voucher-bundle.json`(+`-narrow`), `settlement-delay.json`, `system-refund-keys.json`). 이름은 페이지 이름으로 시작하고, 좁은 폭은 `-narrow`, 다크는 `-dark`를 붙입니다.
- 인라인 스크립트는 `node --check`로 검사합니다. 스크린샷 몇 장을 직접 열어 겹침·잘림을 봅니다.
- 임시 스크립트는 세션 scratchpad 아래 `benefit_agent\`에 둡니다.

### 보고(350단어 이내)
- 반영한 것(결정 번호별)
- 흐름 목록과 결과
- 판단해서 넣은 것
- 새로 찾은 명세 확인 거리(기능 ID와 함께)
- 엔진 제안
- 페이지 안에 따로 둔 정책값 상수

커밋하지 마세요.
