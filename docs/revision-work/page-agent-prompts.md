# 취소·환불(D53~D60) 프로토타입 페이지 반영 — 서브에이전트 지시문

> **2026-10-17 마무리 세션에서 이 세 지시문을 그대로(스크래치 경로만 바꿔) 다시 보내 반영을 끝냈습니다.** 결과는 `docs/revision-work/prototype-impact.md` ‘취소·환불 마무리’. 이 파일은 기록으로만 둡니다(다음 페이지 지시문을 쓸 때 본보기).

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


---

# S12 페이지 지시문 (2026-10-17, D66~D72 · S12 맞춤 목록)

> S12 세션에서 general-purpose 서브에이전트 5개에 보낸 지시문입니다. 아래 ‘공통’ 블록을 각 지시문 앞에 붙여 보냈습니다. 결과는 `prototype-impact.md` ‘S12 결과’.

## 공통 (모든 지시문 앞에 붙임)

식업(외식업 소모품 B2B 오픈마켓 + 본사 디자인팀 맞춤 인쇄) 대표 보고용 프로토타입에서 **아래 ‘맡은 파일’만** 고쳐 2026-10-17 S12 결정을 반영해 주세요. 작업 폴더(저장소 루트): `C:\MyProject\Papermate\Sikup\business-plan`. 한국어로 일하고 한국어로 보고합니다.

### 먼저 읽을 것
- 공통 지침: `docs/prototype-work/agent-brief.md` — 새 페이지가 아니라 기존 페이지 수정입니다. 화면 원칙·검증 방법·금지 사항은 그대로 따릅니다.
- 결정: `docs/revision-work/decisions.md` 맨 아래 ‘S12 남은 확인 거리 — D66~D72’, ‘S12 맞춤 목록’, ‘S12 엔진 제안 판단’.
- 명세 텍스트 `docs/prototype-work/texts/spec.txt`(2026-10-17 다시 뽑음). 기능 시작 줄: U-MEM-02 212 · U-MEM-05 281 · U-ORD-02 663 · U-MY-01 794 · U-MY-02 816 · U-MY-03 838 · D-APV-02 1465 · D-PRD-02 1654 · D-PRD-03 1673 · P-ONB-04 1928 · P-ORD-01 2238 · P-ORD-03 2278 · P-ORD-04 2299 · P-ORD-05 2320 · P-ORD-06 2345 · P-STL-01 2605 · A-MEM-02 2757 · A-PTN-02 2819 · A-ORD-01 2965 · A-ORD-02 2987 · A-STL-01 3034 · A-MKT-01 3096 · A-REV-04 3256 · A-SYS-03 3420 · C-PRICE-03 3702 · C-PAY-02 3762 · C-STL-01 3856 · C-STL-02 3928 · C-STATE-01 3954 · C-STATE-02 4034 · C-STATE-03 4113 · C-NOTI-01 4186 · C-FILE-01 4450 · C-SEC-01 4489. 기획서 `plan.txt`·디자인 요청서 `brief.txt`도 고쳐졌습니다(고객 문구는 brief를 따름).
- 수정 금지(읽기만): `prototype/assets/engine.js`·`gc.css`·`ui.js`, 맡지 않은 페이지. 엔진에 바라는 점은 보고에 제안으로만 적습니다.

### 엔진에서 이미 바뀐 것 (engine.js를 읽어 확인, 엔진 검사 45개 통과)
- **정책값 키 142개.** S12에서 더한 키는 POLICY의 ‘2026-10-17 S12’ 주석 아래에 있습니다(예: `order.cart_keep_days`·`order.checkout_hold_minutes`·`order.accept_remind_bd`·`order.accept_alert_bd`·`claim.mediation_bd`·`claim.pickup_register_bd`·`claim.exchange_ship_bd`·`claim.late_return_days`·`claim.return_back_pay_days`·`claim.return_back_ship_bd`·`production.hold_reply_hours`·`partner.apply_draft_keep_days`·`partner.shipping_info_days`·`partner.circumvent_reply_days`·`partner.circumvent_penalty_multiple`·`settlement.receivable_weeks`·`settlement.receivable_pay_days`·`settlement.cycle`·`member.identity_daily_max`·`member.biz_verify_fail_max`·`security.member_*`·`security.pii_view_lock_per_hour`·`batch.biz_recheck_schedule`·`product.ship_lead_max_bd`·`product.doc_valid_months`·`product.detail_slice_px`·`product.detail_html_max_kb`·`product.revision_keep_months`·`design.*` 여럿, 새 묶음 ‘광고·검색·앱’). **페이지 안에 따로 둔 상수 가운데 엔진 키가 생긴 것은 `GC.Policy.get(키)`로 바꾸고 페이지 상수를 지웁니다.** 법정 값(단순 변심 7일·불량 3개월·30일·야간 21~08시)과 화면 설계 값은 키가 아니므로 상수로 두되 주석에 ‘법정 값’·‘화면 설계 값’이라고 적습니다.
- `GC.production.printDue(handedAt, bd?)` — [인쇄 가능] 확인 기한(D66·D67: 다시 전달한 것으로 보는 때를 handedAt으로 넘김).
- `GC.order.overdueAt(promisedAt, bd?)`, `GC.order.inNotice(now, notice)`, `GC.order.afterNotice({ judgeAt, notice, bd? })`, `GC.order.isOverdue({ promisedAt, now, shipped, notice })` — `notice = { start, end }`는 본사 일괄 공지(‘지연 예외 기간’, D72). 공지 중에는 판정하지 않고, 끝나면 판정 시각이 기간 안에 들었거나 끝나기 전에 지난 건만 ‘끝난 날 + 1영업일의 끝’.
- `GC.refund.dueAt(startAt, bd?)`.
- `GC.refund.partialCancel({ …, fault, keptBefore })` — D70. `fault`는 반품이 파트너 귀책인지(불량·오배송·표시와 다름·늦게 받음·중재에서 파트너 귀책), `keptBefore`는 앞선 취소·반품 결과의 `kept`를 더한 값(주문 기록에 쌓아 넘김). 결과에 `shipRefund`·`shipKept`·`shipKeptLines`·`kept`가 더해졌고, 마지막 건은 잔액에서 이번 공제·돌려주지 않는 처음 배송비·`keptBefore`를 뺀 금액입니다. 예: 냅킨 2박스 60,000 + 배송비 4,000, 반품 배송비 4,000 → 파트너 귀책 64,000(나눠도 30,000 + 34,000) / 단순 변심 56,000(나누면 26,000 + 26,000).
- `GC.Policy.legalOk(key, value)` → `{ ok, dir, bound }`, `GC.Policy.meta(key).legal`(`'min'` 이율 · `'max'` 환불 기한).
- `GC.claim.RETURN_REASONS`: LATE의 `days`는 정책값 `claim.late_return_days`, CHANGE_MIND에 `legal: true`.
- `GC.claim.step('CLAIM_RETURN', state, 'REMAKE')` = 재제작 요청됨 · 확정본 대조 검수 중 · 재제작 승인 · 판매자 거부 · 재제작품 출고.
- 알림 코드(C-NOTI-01 새 행 — 채널: 알림톡 · SMS 대체 · 앱 푸시 · 이메일 · 알림센터 · Slack): `NOTI_INT_CHANNEL_MESSAGE`(담당 디자이너 · — · — · — · — · ● · ○ 10분 동안 안 읽으면 묶어 1회, 협의 룸과 따로 셈), `NOTI_PARTNER_ITEM_CANCELED`(파트너 주문 담당 · ● · ● · — · — · ● · —), `NOTI_BULK_DELAY_NOTICE`(고객 · ● · ● · ● · — · ● · —), `NOTI_PARTNER_BULK_DELAY_NOTICE`(파트너 · ● · ● · — · — · ● · —), `NOTI_BIZ_STATUS_RESTORED`(고객 · ● · ● · ○ · ● · ● · —), `NOTI_RETURN_BACK_DUE`(고객 · ● · ● · ○ · ● · ● · —), `NOTI_PARTNER_RETURN_BACK`(파트너 · ● · ● · — · — · ● · —).
- **이메일 칸의 조건 없는 ○가 없어졌습니다(⑩).** ● = `NOTI_VBANK_EXPIRED`·`NOTI_ITEM_STOCKOUT_CANCELED`·`NOTI_PAYMENT_AUTO_CANCELED`·`NOTI_PARTNER_ORDER_NEW`·`NOTI_PARTNER_ADDRESS_CHANGED`·`NOTI_PARTNER_PACKAGE_HANDED_OFF`·`NOTI_PARTNER_PRODUCTION_HOLD`, 조건 ○ = `NOTI_CLAIM_UPDATED`(거부·환불 완료 때)·`NOTI_FILE_REVIEWED`(반려 때)·`NOTI_FILE_SCAN_REJECTED`(화면을 떠났을 때)·`NOTI_PARTNER_CLAIM_NEW`(요청 접수 때 — `CLAIM_DUE`는 —)·`NOTI_PARTNER_AD_BUDGET`(결제 실패·일시 중지 때). 맡은 페이지가 이 코드를 보낼 때 채널을 표대로 맞춥니다.

### 검증
- 로컬 서버 `http://127.0.0.1:8765/`가 떠 있습니다. 끄지 마세요.
- 흐름은 `docs/prototype-work/tools`에서 `bash runone.sh flows/<이름>.json`(PASS/FAIL 출력). 다른 에이전트 4개도 서버를 쓰므로 **동시에 2개까지만** 돌립니다. ERR_CONNECTION_REFUSED 같은 일시 오류는 한 번 더 돌려 보고 판단합니다.
- 맡은 페이지의 기존 흐름(`flows/<페이지>-*.json`)을 모두 PASS로 만듭니다. 바뀐 규칙에 맞춰 흐름의 기대값·단계를 고치는 것은 괜찮습니다(무엇을 왜 고쳤는지 보고).
- 새 장면마다 흐름을 추가합니다. 이름은 페이지 이름으로 시작하고 좁은 폭은 `-narrow`, 다크는 `-dark`(runone.sh가 이름으로 폭·테마를 정함).
- 인라인 스크립트는 `node --check`로 검사합니다. 스크린샷 몇 장을 직접 열어 겹침·잘림을 봅니다.
- 임시 스크립트는 세션 scratchpad 아래 `<페이지>_agent\` 폴더에 둡니다(다른 에이전트와 겹치지 않게).

### 보고(400단어 이내)
반영한 것(결정·맞춤 번호별) · 흐름 목록과 결과(전부 PASS인지, 새 흐름 이름, 기대값을 고친 흐름) · 판단해서 넣은 것 · 새로 찾은 명세 확인 거리(기능 ID와 함께) · 엔진 제안 · 아직 페이지 안에 남긴 정책값 상수. 커밋하지 마세요.
- **확인 거리 기준(2026-10-17 D74, 다음 지시문부터 꼭 붙임):** 명세에 없는 세부(알림 채널·문구·묶음·재알림 시점, 상수 값, 드문 예외)는 페이지에서 기본값으로 정해 ‘판단해서 넣은 것’에 적고 확인 거리로 올리지 않습니다. 돈·법·고객 권리(고객이 손해를 보거나 권리를 잃는 것)에 걸리는 것만 ‘새로 찾은 명세 확인 거리’로 올립니다. 정책값은 명세 A-SYS-03 첫 표의 키만 ‘(정책값 키)’, 나머지 숫자는 상수입니다(D75). 알림 채널은 C-NOTI-01 등급 원칙을 따릅니다(D76).

## 1. order.html

맡은 파일: `prototype/order.html` 하나.
1. **D70 처음 배송비**: 반품 환불 미리보기·처리에서 `partialCancel`에 `fault`(반품 사유 귀책 — DEFECT·LATE·중재 파트너 귀책이면 true)와 `keptBefore`(앞선 결과 `kept`의 누적, 주문 기록에 저장)를 넘깁니다. 묶음 전부 반품이면 파트너 귀책은 ‘돌려받는 배송비(처음 낸 배송비)’ 줄을, 고객 사정은 ‘처음 배송비는 돌려드리지 않아요(판매자 몫)’를 보여 줍니다. 무료배송으로 받은 묶음을 변심으로 전부 반품하면 왕복 반품 배송비(템플릿 교환 배송비)를 뺍니다(C-PRICE-03 — 지금 편도만 뺌). 새 장면 또는 기존 반품 장면에 ‘반품 배송비 비교’(냅킨 2박스 60,000 + 배송비 4,000: 귀책 64,000 / 변심 56,000 / 나눠서 26,000 + 26,000 / 30,000 + 34,000)를 넣고, 돌려주지 않은 처음 배송비는 정산 ‘클레임 완료(+)’로 파트너 몫이라는 문장을 둡니다.
2. **D71 거부 수량 되돌려 보내기**: 일부 승인 뒤 거부가 확정되면(이의 기한 지남·중재 거부 유지) 고객에게 [되돌려 받기](되돌림 배송비 따로 결제 — 모의 결제 단계)·[폐기]와 남은 기한(`claim.return_back_pay_days` 14일)을 보여 줍니다. 시계로 기한 3일 전 `NOTI_RETURN_BACK_DUE`, 기한이 지나면 폐기로 보고 파트너 폐기 기록과 `NOTI_PARTNER_RETURN_BACK`. 결제되면 파트너에게 `NOTI_PARTNER_RETURN_BACK` + 송장 기한(`claim.return_back_ship_bd` 2영업일). 중재에서 파트너 귀책이면 결제 없이 보냄. 지금의 ‘추가 결제라고 기록만’ 하는 부분을 바꿉니다. 반품 배송비는 일부 승인 때 한 번(지금 그대로).
3. **⑰** 출고 지연 안내 뒤·무단 지연 뒤 고객 [바로 취소] → 파트너에게 `NOTI_PARTNER_ITEM_CANCELED`(지금 order.html의 바로 취소 갈래는 파트너 알림이 없음).
4. **⑳** 카드 환불 지연배상금: 환불 계좌가 없는 갈래를 시연(‘반품 검수 · 환불 지연’ 장면에 토글 정도). 지연 일수는 PG 취소 성공일에 끝나 금액이 정해지고, `NOTI_REFUND_ACCOUNT_REQUIRED`로 계좌 입력을 요청해 등록되면 송금합니다. 7일 넘게 안 넣으면 한 번 더 알리고 재무 모니터링에 ‘지연배상금 송금 대기’.
5. **㉑** 발주 확인 전(PAID)도 판정 시각을 넘기면 무단 지연 기록·알림, [바로 취소]는 따로 열지 않음(원래 즉시 취소). 모니터링 줄과 `isOverdueRec`이 ACCEPTED만 보던 것을 PAID까지. 발주 확인 리마인드·운영팀 알림은 `order.accept_remind_bd`·`order.accept_alert_bd`.
6. **D72** 무단 지연 장면에 본사 일괄 공지 시연(공지 중에는 판정하지 않음, 끝나면 `GC.order.isOverdue({ notice })` 하루 유예, 공지 전에 이미 열린 [바로 취소]는 그대로, 시작·끝 때 고객 `NOTI_BULK_DELAY_NOTICE`). 길게 만들 필요는 없습니다.
7. **㉒·⑫** `LOCAL.lateDays` → `claim.late_return_days`(또는 `RETURN_REASONS`의 days). `cartKeepDays`·`checkoutHoldMin`·`acceptRemindBd`·`acceptAlertBd`·`mediationBd`·`pickupBd` 등 엔진 키가 생긴 상수를 `GC.Policy.get`으로. 변심 7일·불량 기한은 법정 값 상수로 두고 주석.
8. **⑩** 이 페이지가 보내는 알림의 이메일 채널을 표대로(`NOTI_VBANK_EXPIRED` ●, `NOTI_CLAIM_UPDATED` 거부·환불 완료 때만, `NOTI_PARTNER_CLAIM_NEW` 요청 접수 때 ●, 그 밖 위 목록).

## 2. design.html + room.html

맡은 파일: `prototype/design.html`, `prototype/room.html`.
1. **D66** 생산 보류가 고객 철회·취소 중재 기각으로 풀리면 `GC.production.printDue(풀린 시각)`로 [인쇄 가능] 기한을 새로 세고 파트너 주문 담당자에게 `NOTI_PARTNER_PACKAGE_HANDED_OFF`(새 기한)를 다시 보냅니다(지금은 원래 기한 그대로라 풀리자마자 지연 알림). 보류 중 알림 멈춤은 그대로. 철회 때 파트너에게 보내던 고객 코드 `NOTI_CLAIM_WITHDRAWN`은 이 알림으로 바꿉니다. 페이지의 [인쇄 가능] 기한 계산(`startPrintCheck` 등)은 `GC.production.printDue`로.
2. **D72** 본사 일괄 공지 토글: 공지 기간(시작·끝)을 기록하고, 공지 중에는 생산 지연 판정을 하지 않으며, 끝나면 `GC.order.afterNotice`로 ‘끝난 날 + 1영업일의 끝’까지 유예합니다(지금은 ‘저장한 판정 시각으로 다시 판정’). 공지 전에 이미 열린 [취소 요청]은 그대로. 시작·끝 때 고객 `NOTI_BULK_DELAY_NOTICE`·파트너 `NOTI_PARTNER_BULK_DELAY_NOTICE`. 흐름 `design-delay-narrow`는 ‘공지 끝 → 바로 생산 지연’을 기대하므로 공지 끝 뒤 1영업일 넘게 시계를 보내도록 고칩니다.
3. 페이지 상수 `REMAKE_STEP`을 지우고 `GC.claim.step('CLAIM_RETURN', rc, 'REMAKE')`만 씁니다(‘재제작품 보내는 중’ → ‘재제작품 출고’).
4. **⑯** 생산 지연 취소 요청 중 출고된 건을 승인·회수하면 디자인 요청은 COMPLETED(지금 그대로). 회수품은 파트너가 받아 폐기 확인한다는 안내를 그 갈래에 넣습니다.
5. **room ③** 생산 협의 채널에서 파트너가 답하면 담당 디자이너에게 `NOTI_INT_CHANNEL_MESSAGE`(알림센터 바로, Slack은 10분 동안 안 읽으면 묶어 1회 — 협의 룸의 고객 메시지와 따로 셈, `notify.room_digest_minutes`). 지금 room은 파트너 답에 디자이너 알림이 없습니다.
6. **⑫·⑩** 두 페이지의 상수 가운데 엔진 키가 생긴 것(`production.hold_reply_hours`·`claim.mediation_bd`·`design.max_first_drafts`·`design.pins_per_version_max`·`design.room_violation_alert_*`·`design.reorder_free_fixes` 등)을 `GC.Policy.get`으로, 보내는 알림의 이메일 채널을 표대로.

## 3. partner.html

맡은 파일: `prototype/partner.html` 하나.
1. **D68 정지 사유 여러 개**: 한 칸(`suspendReason`)을 사유 목록(사유 · 주체 본사/시스템 · 시각 · 메모 · 해소 시각 · 해소 사유)으로 바꿉니다. 정지 중에도 본사가 사유를 더할 수 있고(지금 휴·폐업 정지 중엔 [본사 정지]가 숨음), 정기 재조회에서 휴·폐업이 나오면 사유를 더하고 대표자에게 `NOTI_PARTNER_ACCOUNT_SUSPENDED`(지금은 로그만 남기고 저장 안 함 — 아무 해제 사유로 풀면 폐업 파트너가 ACTIVE로 돌아가는 구멍). 사유별 [사유 해소](해제 사유 목록), **마지막 사유가 풀릴 때만** ACTIVE + `NOTI_PARTNER_ACCOUNT_REINSTATED` + 변경 제안 거두기 + 아래 D67. 휴·폐업 사유는 D48 그대로(재조회 정상 → MD 알림 → MD가 그 사유만 해소). 폐업은 자동 종료 없이 MD [계약 종료](종료 사유에 ‘사업자 폐업’ — 지금은 ‘기타’만 됨). 배너·처리 대기·안내에 남은 사유를 모두 보여 줍니다.
2. **⑧** 정지·계약 종료·해소에 메모 입력 칸(200자). 정지·종료 ‘기타’면 필수, 해소 ‘기타’·‘본사 오처리 정정’이면 필수. 메모를 알림·감사 로그·배너에.
3. **D67** 정지(또는 판매 중지)가 풀릴 때 변경 제안이 없던 디자인 확정 건([인쇄 가능] 전)도 handedAt = 풀린 시각으로 새로 세고(`GC.production.printDue`) 주문 담당자에게 `NOTI_PARTNER_PACKAGE_HANDED_OFF`(새 기한). 제안이 있던 건은 지금처럼 거두기 + `NOTI_PARTNER_CHANGE_WITHDRAWN`(한 건에 알림 하나). 지금은 제안 없던 건이 원래 기한이라 해제 직후 지연 알림이 나갑니다.
4. **⑰** 고객 바로 취소를 알릴 때 쓰던 `NOTI_PARTNER_CLAIM_NEW` → `NOTI_PARTNER_ITEM_CANCELED`.
5. **D72** 파트너 주문 탭 출고 기한에 본사 일괄 공지를 반영(공지 중 ‘본사 일괄 공지 — 지연으로 보지 않아요’, 끝나면 새 판정 시각), `NOTI_PARTNER_BULK_DELAY_NOTICE`. 작게.
6. **⑫·⑩** `draft_keep_days`·`ship_info_days`·`reply_days`·`penalty_x` 등 엔진 키가 생긴 상수 → `GC.Policy.get`(`partner.apply_draft_keep_days`·`partner.shipping_info_days`·`partner.circumvent_reply_days`·`partner.circumvent_penalty_multiple`), 보내는 알림의 이메일 채널(`CH_PT_CLAIM` 등)을 표대로.

## 4. member.html + benefit.html + catalog.html

맡은 파일: `prototype/member.html`, `prototype/benefit.html`, `prototype/catalog.html`.
1. **member D69** 정기 재조회 응답에 ‘휴업’을 더합니다. 휴업도 폐업처럼 ‘확인 필요’ + 30일 유예(사업자가 그대로) + 해제 예정일 알림(`NOTI_BIZ_STATUS_CHECK`). 다음 조회에서 계속사업자면 자동으로 지우고 **`NOTI_BIZ_STATUS_RESTORED`(⑪ — 지금은 알림 없이 배너만 사라짐)**, 유예가 끝나면 혜택 해제 + 알림 + 다시 인증. 세금계산서는 폐업만 ‘확인 필요’ 때부터 막고, 휴업은 발행하되 ‘세무 확인 필요’ 표시. 문구를 휴업·폐업에 맞게(휴업은 ‘영업을 다시 시작했다면 [다시 인증하기]’ — ‘새 사업자등록번호로’는 폐업에만). 결제가 끝난 주문은 결제 때 금액 그대로라는 안내 한 줄.
2. **member ⑫** 페이지 상수 6개(`biz_verify_fail_max`·`biz_recheck_day`·`email_code_minutes`·`email_code_fail_max`·`password_rule`·`identity_daily_max`) → `member.biz_verify_fail_max`·`batch.biz_recheck_schedule`·`security.member_email_code_minutes`·`security.member_email_code_fail_max`·`security.member_password_rule`·`member.identity_daily_max`. 그 밖에 엔진 키가 생긴 상수도.
3. **benefit ④** 디자인비 쿠폰의 최소 주문이 `design.free_threshold`(지금 값과 예약된 새 값 중 큰 값) 이상이면 승인 요청을 막습니다(지금은 경고만). 경고 문구를 오류 문구로.
4. **catalog ⑫** `ship_days_max`·`doc_valid_months`·`detail_slice_px`·`detail_html_kb`·`detail_ver_keep` → `product.ship_lead_max_bd`·`product.doc_valid_months`·`product.detail_slice_px`·`product.detail_html_max_kb`·`product.revision_keep_months`. `detail_fold_px`(처음 1,200px)는 화면 설계 값이라 상수 그대로, 주석.
5. **⑩** 세 페이지가 보내는 알림의 이메일 채널을 표대로.

## 5. settlement.html + system.html

맡은 파일: `prototype/settlement.html`, `prototype/system.html`.
1. **settlement ⑬** ‘중재 판정’ 파트너 부담을 본사 청구 ‘분쟁 조정’으로 빼고 모자라면 미수금 — 지금 화면 동작 그대로가 명세가 됐으므로, ‘확인 필요’ 안내(명세와 다를 수 있다는 문장)를 지우고 명세 문장으로 바꿉니다. 이 문구를 검사하는 흐름(settlement-delay 등)을 고칩니다.
2. **settlement D70** 정산 예시에 ‘클레임 완료(+) 돌려주지 않은 처음 배송비’ 한 줄(고객 사정으로 묶음을 전부 반품하면 처음 배송비가 파트너 몫으로 남음). 작게.
3. **settlement ⑫** `recv_*`·`schedule` 상수 → `settlement.receivable_weeks`·`settlement.receivable_limit`·`settlement.receivable_pay_days`·`settlement.cycle`·`settlement.period`(2차 플랜 강등 주기는 그대로).
4. **system 정책값 화면**: 새 키 41개쯤이 목록에 나타납니다. 새 단위(건/시간·px·KB·배·주·안·건) 값 범위를 `RANGE_UNIT`(또는 `RANGE_KEY`)에, 새 글자 값 키(`batch.biz_recheck_schedule`·`security.member_password_rule`·`design.room_link_allowlist`·`design.file_retention`·`settlement.cycle`·`settlement.period`·`search.rank_weights`·`app.min_os`)의 안내를 `TEXT_HOW`에. 페이지 상수 `LEGAL`을 `GC.Policy.meta(key).legal`·`GC.Policy.legalOk`로 바꾸고(이유 문구는 페이지에 남겨도 됨), 환불·출고 미리보기에서 다시 짠 계산을 `GC.order.overdueAt(at, nv)`·`GC.refund.dueAt(start, nv)`로. `K` 상수: `PII_MAX` → `security.pii_view_lock_per_hour`, `PRESIGN_*`·`CONVERT_MIN`은 ‘보안 고정값(키 아님)’, `NOTICE_*`는 ‘약관·계약 조항에 고정’, `NIGHT_*`는 ‘법정 값’으로 표시.
5. **system 알림 매트릭스**: 새 코드 7개 행, 이메일 칸에 조건 없는 ○가 없어진 것을 반영(지금 ‘조건부 · 이번엔 안 보냄’으로 처리하는 곳을 조건 문구로), 이벤트 목록의 채널 값.

---

# 정리 2단계 조사 지시문 (2026-10-17 작성 — 다음 세션에서 다시 보냄)

> 2026-10-17 정리 2단계 세션에서 3·4번 에이전트를 보낸 직후 사용자 요청으로 멈춤(결과 없음). 5·6번은 아직 안 보냄. **다음 세션은 네 개를 모두 새로 보낸다**: 일반(general-purpose) 서브에이전트, 백그라운드, 한 메시지에 네 개(읽기 전용이라 서버·파일 충돌 없음). 지시문 = 아래 ‘공통’ + 영역 블록 하나.

## 공통 (네 지시문 앞에 붙임)

저장소: C:\MyProject\Papermate\Sikup\business-plan — '식업'(인쇄·포장재 오픈마켓 + 맞춤 디자인) 기획 문서 묶음. 지금 '정리 2단계'(복잡하게 쌓인 규칙을 표준안으로 줄이기)를 위해 영역 하나를 조사한다.

- **읽기 전용.** 어떤 파일도 만들거나 고치지 마라. 결과는 마지막 메시지로만 돌려준다.
- 읽을 것(추출본, 원본 HTML 대신): `docs/prototype-work/texts/spec.txt`(명세, 670KB — 통째로 읽지 말고 Grep으로 기능 ID·문구를 찾아 근처만 Read), `plan.txt`(기획서), `brief.txt`(디자인 요청서), `legal-consult.txt`·`pg-consult.txt`(법률·PG 질문서). 결정은 `docs/revision-work/decisions.md`(D1~D76 — 필요한 D번호만 grep), 정리 계획은 `docs/revision-work/simplify-plan.md`(2단계 표), 취소·환불 정리본은 `docs/revision-work/refund-policy.html`(항목 ID G·R·M·K·T·O·S·P·X). 프로토타입 영향은 `prototype/*.html`·`prototype/assets/engine.js`·`prototype/tests/`에서 grep으로만.
- 사용자 원칙: ① 법이 요구하는 것 ② 대부분의 오픈마켓·인쇄 쇼핑몰이 하는 것(자동) ③ 나머지는 '관리자 처리'(관리자가 사유·금액·부담을 입력). 새 세부 규칙을 만들지 않는다. 예시는 decisions.md의 D73(취소·환불 세 층)·D74(확인 거리 기준: 돈·법·고객 권리에 걸리는 것만 질문으로 올리고, 나머지는 개발 때 기본값)·D75(정책값 키 = 돈 + 약속 기한, 나머지 상수).
- 표준 근거: 네이버 스마트스토어·쿠팡·11번가·G마켓 등 오픈마켓, 인쇄 쇼핑몰(레드프린팅·성원애드피아·비즈하우스 등)이 실제로 어떻게 하는지 — WebSearch/WebFetch로 2~4번 짧게 확인해도 된다(ToolSearch "select:WebSearch,WebFetch"로 불러 씀). 확인한 사실과 추정을 구분해 적어라.
- 결과 형식(한국어, 쉬운 말, 2,500단어 안쪽):
  1. **지금 규칙** — 명세 기능 ID별로 무엇이 정해져 있는지(spec.txt 줄 번호 함께), 관련 결정 D번호와 한 줄 요약
  2. **표준안** — 무엇이 남고 무엇이 없어지는지, 근거(법·업계 관행)
  3. **선택지 2~4개**(첫째 = 추천 = 표준안). 각각 장단점·고객 손해/권리·돈 영향. AskUserQuestion에 그대로 쓸 수 있게 짧은 라벨(5단어 안쪽) + 설명 1~2문장
  4. 선택지마다 **따라 나올 세부 질문**(있으면) — D74 기준으로 걸러서(돈·법·고객 권리만)
  5. **고칠 곳 목록** — 명세(기능 ID·섹션, 대략 줄 번호), 기획서(장·절), 요청서(화면 ID), 법률(L-번호)·PG(PG-번호) 질문서, 정리본 항목 ID(해당 있으면), 명세 결정 표 `#g-dec`/`#g-dec3`/`#g-dec4`와 기획서 15장 표에서 '정리로 바뀜' 표시가 필요한 예전 행
  6. **프로토타입 영향**(엔진 함수·검사 번호, 페이지, 흐름 파일 이름) — 짧게
  7. **다른 영역과 얽힘** — 같은 2단계의 다른 영역(할인·쿠폰 / 제작 파트너 변경 / 추가 구성품 / 사업자·파트너 상태 자동 처리)과 겹치는 곳(같은 곳을 두 번 고치지 않게)

## 3. 할인·쿠폰 쌓기 (2026-10-17 보냈다가 멈춤)

- 대상: C-PRICE-01·02(금액 계산 순서·쿠폰 자리), C-PRICE-03(배송비), U-BEN-01~05, U-ORD-02, A-MKT-01, P-PRM-01, C-PAY-02(부분 취소·쿠폰 복원 D53), 멤버십 이용권(D60), 포인트. 관련 결정 D12·D20·D21·D41·D44·D50·D51·D53·D60 등(decisions.md에서 '쿠폰'·'할인'·'포인트'·'이용권'·'무료배송'으로 grep).
- 지금: 6단계 — 파트너 즉시 할인 · 파트너 쿠폰 · 디자인비 50만원 무료(`design.free_threshold`) · 멤버십 이용권 · 디자인비 쿠폰 · 본사 쿠폰 자리(상품 할인/디자인비 등) · 배송비 쿠폰 · 포인트. 각각 MVP/2차/3차가 무엇인지 정확히 확인할 것.
- 표준안 후보(simplify-plan): 오픈마켓 MVP = 판매자 즉시 할인 + 쿠폰 1장 + 무료배송 기준. 없어지는 것: 쿠폰 자리·안분·판단 기준 금액 표·디자인비 무료 판정 순서.
- **마케팅 계획과 얽힘을 꼭 정리**: 기획서(plan.txt)의 마케팅·프로모션·멤버십·쿠폰·첫 구매 혜택·사업자가·재주문 할인 관련 내용, 11장 손익·시나리오의 할인/마케팅 비용 가정. 표준안으로 줄이면 기획서 숫자(손익·필요 자금)나 마케팅 수단이 달라지는지. 어떤 마케팅 수단이 MVP에 꼭 필요한지(예: 첫 주문 쿠폰, 디자인비 쿠폰) 사용자가 판단할 수 있게 정리.
- 디자인비 50만원 무료 판정이 할인 순서(어느 금액 기준인지)에 어떻게 얽혀 있는지, 표준안에서 어떻게 단순하게 쓸 수 있는지.
- **S13 16번도 이 영역에서 답할 수 있게**: C-PRICE-03 '무료배송으로 받은 묶음'(반품 때 처음 배송비 차감 등)이 쿠폰으로 0원이 된 배송비 묶음을 포함하는지(프로토타입은 템플릿 기본 0원만). 표준안에서 이 질문이 없어지거나 어떻게 답해지는지.
- 법: 할인·쿠폰 표시(전자상거래법·표시광고법), 부분 취소 때 쿠폰 처리 관행(쿠팡·스마트스토어는 부분 취소로 쿠폰 조건이 깨지면 어떻게 하는지) 확인.

## 4. 제작 파트너 변경 (2026-10-17 보냈다가 멈춤)

- 대상: A-ORD-01 ④~⑦(제작 파트너 변경 제안·고객 동의·정산 기준 다시 저장·구성품 처리·정지 해제 때 제안 철회), C-PAY-02, C-STL-01, U-MY-01·02, P-ORD-*, A-PTN-02(파트너 정지·해제), C-NOTI-01의 `NOTI_ITEM_PARTNER_CHANGE_*` 코드, A-SYS-03 상수(파트너 변경 응답 7일 등). 관련 결정 D33·D36·D37·D38·D40, D73(차액 환불 계산식 → 관리자가 차액 환불 금액 입력). decisions.md에서 '파트너 변경'·'제작 파트너'로 grep.
- 지금: 파트너가 만들 수 없게 되면(정지·폐업·사정) 본사가 다른 파트너 상품을 제안 → 고객 [변경 동의]/[전액 환불], 7일 무응답 전액 환불, 더 싸면 차액 환불(관리자 입력), 더 비싸도 더 안 받음, 정산 기준 다시 저장, 붙은 추가 구성품 처리(D38), 정지 해제 때 제안 철회(D40).
- 표준안 후보(simplify-plan): 판매자 사정으로 못 만들면 '판매자 사정 취소' = 전액 환불(품절 취소와 같음 — 전자상거래법 제15조 제2항: 공급 곤란 시 지체 없이 알리고 3영업일 안에 환급), 다른 판매자로 옮기기는 관리자 처리(예: CS가 고객에게 다른 상품을 안내하고 고객이 새로 주문, 또는 관리자 처리로 옮김). 없어지는 것: 제안·동의 흐름, 정산 기준 다시 저장, 구성품 처리, 정지 해제 때 제안 철회.
- 꼭 확인: 맞춤 제작(디자인 확정본·판·재주문 연결 보장)이 걸린 항목은 다른 파트너로 옮기면 디자인 파일·판이 어떻게 되는지 지금 규칙, 그리고 표준안에서 고객이 손해를 보는지(이미 낸 디자인비, 디자인 확정본을 새 주문에 쓸 수 있는지 — 재주문·디자인 파일 소유(D-OWN-*) 규칙). 파트너 귀책으로 취소될 때 비용(디자인비 등) 부담 지금 규칙(D73 관리자 처리 정산과의 관계). 스마트스토어·쿠팡의 '판매자 사정 취소(품절 취소)' 때 판매자 페널티·고객 보상 관행.

## 5. 추가 구성품 (아직 안 보냄)

- 대상: P-PRD-02(추가 구성품 등록), U-PDP-*·U-ORD-*(고르기·주문), C-PRICE-01(구성품 금액·할인·배송 묶음), C-STATE-01·02, U-MY-01·02, P-ORD-*(발주 확인·송장), A-ORD-01 ⑥(파트너 변경 때 붙은 구성품 — D38, 4번 영역과 얽힘), A-ORD-02, C-PAY-02. 관련 결정 D24(②), D38·D39·D45·D49·D52(decisions.md에서 '구성품'으로 grep).
- 지금: 결정 6건 — 본 상품과 함께 취소, 같은 송장, 맞춤 항목에 붙으면 본 항목 [인쇄 가능] 때 발주 확인(D49), 본 상품 취소 요청 때부터 클레임 대상(D52), 남은 수량 전부 취소 때 출고된 구성품은 같은 회수로(D39) 등. 각 결정이 정확히 무엇을 정했는지 확인.
- 표준안 후보(simplify-plan): 네이버 스마트스토어 ‘추가상품’처럼 독립 주문 항목(같은 배송 묶음, 각자 취소·반품) — 또는 2차로 미룸. 없어지는 것: 본 상품과 엮인 규칙 전부.
- **사용자는 D24에서 추천안과 다른 C(옵션 3단 + 추가 구성품 MVP, 추가 구성품은 따로 된 주문 항목)를 골랐다** — 구성품을 MVP에 넣기를 원했다는 점을 고려해, ‘2차로 미룸’은 추천이 아니라 선택지로만. 스마트스토어 추가상품이 실제로 어떻게 동작하는지(본 상품 없이 추가상품만 살 수 있는지, 본 상품 취소 때 추가상품도 자동 취소되는지, 추가상품만 취소·반품되는지, 배송비 묶음) 확인하고, 쿠팡·인쇄 쇼핑몰의 비슷한 기능(후가공·부자재 추가)도 짧게.
- 맞춤 제작 항목에 붙는 구성품(예: 박스에 붙는 스티커)이 독립 항목이 되면 고객이 손해를 보는 경우(본 상품만 취소됐는데 구성품이 출고됨 등)가 있는지, 그걸 표준(고객이 직접 취소) + 관리자 처리로 덮을 수 있는지.

## 6. 사업자·파트너 상태 자동 처리 (아직 안 보냄)

- 대상: U-MEM-05(회원 사업자 인증·상태), A-MEM-02(관리자 회원 사업자 관리), A-PTN-02(파트너 정지·해제), P-ONB-04(입점 서류·사업자 상태), C-STATE-*(회원·파트너 상태 전이), C-NOTI-01 관련 코드(사업자 상태·정지·해제), A-SYS-03 상수(국세청 재조회 주기 `batch.biz_recheck_schedule`·유예 30일 등). 관련 결정 D48·D68·D69 + decisions.md에서 '휴업'·'폐업'·'국세청'·'사업자 상태'·'정지 사유'로 grep.
- 지금: 매월 국세청 재조회, 휴업·폐업 30일 유예, 정지 사유 여러 개 쌓기(D68), 회원 휴업도 30일 유예(D69), 휴·폐업 정지 파트너가 다시 정상 → MD 확인 뒤 해제·회원 ‘확인 필요’는 자동(D48), 상태 바뀔 때 다시 알림.
- 표준안 후보(simplify-plan): 가입·입점 때 국세청 진위 확인 + 정기 조회 결과는 관리자 알림만, 정지·해제는 관리자가 결정. 없어지는 것: 자동 전이·유예 계산·사유 쌓기·재알림.
- **S13 남은 결정 거리를 이 영역에서 함께 답할 수 있게**: 3번(유예 중 회원 사업자 상태가 휴업↔폐업으로 바뀔 때 해제 예정일·세금계산서·다시 알림 / 정지 중 파트너의 재조회 결과가 휴업↔폐업으로 바뀔 때 다시 알릴지) · 4번(폐업 ‘확인 필요’ 중 새 사업자등록번호로 바꾸는 경로가 없음 — 같은 번호 재조회만) · 10번(정지 사유 일부만 풀릴 때 파트너 알림 — D74로 개발 때 기본값). `docs/revision-work/prototype-impact.md` ‘S13 입력’ 표(515줄 근처)와 ‘정리 1단계 입력’ 맨 끝을 볼 것. 표준안에서 각 질문이 없어지는지/어떻게 답해지는지.
- 돈·법 확인: 휴·폐업 사업자에게 세금계산서 발행(부가가치세법), 회원 사업자 혜택(사업자가) 유지 여부, 폐업·휴업 파트너의 정산 지급 보류·진행 중 주문 처리(4번 제작 파트너 변경과 얽힘) — 표준안에서도 남겨야 할 자동 처리(돈이 걸린 것)가 있는지. 오픈마켓(스마트스토어·쿠팡)이 판매자 휴·폐업을 어떻게 처리하는지(자동 판매 중지인지, 관리자 검토인지) 짧게 확인.
