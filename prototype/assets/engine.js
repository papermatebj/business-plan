/* 식업 프로토타입 — 공통 규칙 엔진 (기능 명세서 05장 공통 엔진·규칙)
   화면 없이 동작하는 순수 계산만 둡니다. 브라우저에서는 window.GC, node에서는 module.exports.
   금액·요율은 모두 관리자 설정값(정책값)이고, 여기 숫자는 명세서의 임시 기본값입니다. */
(function (root, factory) {
  const GC = factory();
  if (typeof module === 'object' && module.exports) module.exports = GC;
  else root.GC = GC;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ───────────── 정책값 (A-SYS-03) ───────────── */
  const POLICY = [
    // 공통 · 영업일·배치 (2026-10-14 부록 B 추가). text: 숫자가 아닌 값 — 프로토타입에서는 보기만
    { key: 'calendar.holidays', def: '법정·대체·임시 공휴일 + 본사 휴무일', unit: '', text: true, group: '공통 · 영업일·배치', label: '본사 공휴일 달력(영업일 계산의 유일한 기준)', note: '프로토타입은 주말만 빼고 계산해요(공휴일 생략)' },
    { key: 'calendar.business_hours', def: '평일 09~18시', unit: '', text: true, group: '공통 · 영업일·배치', label: '영업시간(디자인 SLA·CS 첫 응답)' },
    { key: 'notify.notice_min_hours', def: 24, unit: '시간', group: '공통 · 영업일·배치', label: '예고 뒤 본 처리까지 최소 간격(디자인 보류·자동 취소)' },
    { key: 'batch.stale_grace', def: 1, unit: '시간', group: '공통 · 영업일·배치', label: '배치 감시 여유(주기 + 이 시간 동안 성공 없으면 알림)' },
    // 2026-10-17 S12 ⑫ 키 없는 정책값 정리(MVP 키 + 페이지 상수를 엔진으로)
    { key: 'batch.biz_recheck_schedule', def: '매월 1일 03:00', unit: '', text: true, group: '공통 · 영업일·배치', label: '사업자 상태 정기 재조회 시각(회원·파트너 공통)' },
    // 공통 · 보안 (2026-10-15 S8 추가 — 관리자·파트너 같은 규칙, C-SEC-01)
    { key: 'security.password_min_length', def: 10, unit: '자', group: '공통 · 보안', label: '관리자·파트너 비밀번호 최소 길이(영문·숫자·특수문자 3종)' },
    { key: 'security.login_fail_lock', def: 5, unit: '회', group: '공통 · 보안', label: '비밀번호 연속 실패 시 계정 잠금(파트너는 대표자에게 알림 · 관리자는 본인·최고관리자에게 알리고 최고관리자가 풂)' },
    { key: 'security.idle_logout_minutes', def: 30, unit: '분', group: '공통 · 보안', label: '쓰지 않으면 자동 로그아웃(관리자 화면·파트너 센터)' },
    // 2026-10-17 S12 ⑫ 키 없는 정책값 정리(MVP 키 + 페이지 상수를 엔진으로)
    { key: 'security.member_password_rule', def: '8~20자, 영문·숫자·특수문자 중 2종 이상', unit: '', text: true, group: '공통 · 보안', label: '고객 이메일 회원 비밀번호 규칙' },
    { key: 'security.member_login_fail_lock', def: 5, unit: '회', group: '공통 · 보안', label: '고객 로그인 연속 실패 시 잠금' },
    { key: 'security.member_login_lock_minutes', def: 10, unit: '분', group: '공통 · 보안', label: '고객 로그인 잠금 시간' },
    { key: 'security.member_email_code_minutes', def: 5, unit: '분', group: '공통 · 보안', label: '이메일 인증번호 유효 시간' },
    { key: 'security.member_email_code_fail_max', def: 5, unit: '회', group: '공통 · 보안', label: '이메일 인증번호 오입력 허용' },
    { key: 'security.pii_view_lock_per_hour', def: 100, unit: '건/시간', group: '공통 · 보안', label: '개인정보 조회 몰림 잠금 기준(1시간)' },
    // 수수료·파트너
    { key: 'commission.default_rate', def: 10, unit: '%', group: '수수료·파트너', label: '카테고리 요율(일반) 기본값' },
    { key: 'commission.custom_rate', def: 13, unit: '%', group: '수수료·파트너', label: '카테고리 요율(맞춤) 기본값' },
    { key: 'commission.plan_discount_pro', def: 1, unit: '%p', group: '수수료·파트너', label: '프로 플랜 수수료 인하', phase: '2차' },
    { key: 'commission.plan_discount_premium', def: 2, unit: '%p', group: '수수료·파트너', label: '프리미엄 플랜 수수료 인하', phase: '2차' },
    { key: 'commission.new_partner_discount', def: 2, unit: '%p', group: '수수료·파트너', label: '신규 입점 인하(3개월)' },
    { key: 'commission.reorder_discount', def: 3, unit: '%p', group: '수수료·파트너', label: '같은 판 재주문 인하' },
    { key: 'commission.floor', def: 5, unit: '%', group: '수수료·파트너', label: '최종 요율 하한' },
    { key: 'commission.override_max', def: 30, unit: '%', group: '수수료·파트너', label: '파트너 예외 요율(대체형) 상한' },
    { key: 'partner.reapply_days', def: 30, unit: '일', group: '수수료·파트너', label: '입점 반려 후 재신청 제한' },
    { key: 'partner.supplement_days', def: 14, unit: '일', group: '수수료·파트너', label: '보완 요청 응답 기한' },
    // 2026-10-16 S11 맞춤(A-PTN-01 · P-ONB-02 처리 목표)
    { key: 'partner.onboard_review_bd', def: 3, unit: '영업일', group: '수수료·파트너', label: '입점 서류·MD 심사(REVIEWING) 처리 목표' },
    { key: 'partner.onboard_sample_bd', def: 5, unit: '영업일', group: '수수료·파트너', label: '입점 샘플 확인 처리 목표(맞춤 인쇄 파트너만)' },
    { key: 'partner.onboard_total_bd', def: 10, unit: '영업일', group: '수수료·파트너', label: '입점 접수부터 심사 결과(승인·반려)까지 전체 처리 목표' },
    { key: 'partner.non_circumvent_months', def: 12, unit: '개월', group: '수수료·파트너', label: '계약 종료 후 직거래 금지 기간', draft: true },
    { key: 'partner.circumvent_penalty_min', def: 500000, unit: '원', group: '수수료·파트너', label: '직거래 위약금 최소액(수수료율×3배)', draft: true },
    { key: 'partner.circumvent_penalty_multiple', def: 3, unit: '배', group: '수수료·파트너', label: '직거래 위약금 배수(확인된 직거래 금액 × 수수료율 × 이 값)', draft: true },
    { key: 'partner.circumvent_reply_days', def: 7, unit: '일', group: '수수료·파트너', label: '직거래 조사 소명 기한' },
    { key: 'partner.apply_draft_keep_days', def: 30, unit: '일', group: '수수료·파트너', label: '임시 저장 입점 신청서 보관' },
    { key: 'partner.confirm_request_days', def: 1, unit: '영업일', group: '수수료·파트너', label: '파트너 확인 요청 응답 기한' },
    { key: 'partner.shipping_info_days', def: 90, unit: '일', group: '수수료·파트너', label: '배송 완료 뒤 파트너가 배송 정보를 보는 기간' },
    { key: 'product.detail_image_max', def: 60, unit: '장', group: '수수료·파트너', label: '상품 상세 설명 이미지 최대 장수' },
    { key: 'product.addon_max', def: 20, unit: '개', group: '수수료·파트너', label: '상품 하나의 추가 구성품 최대 개수' },
    // 2026-10-16 S10 맞춤(P-PRD-02 · A-PRD-01)
    { key: 'product.option_combo_max', def: 100, unit: '개', group: '수수료·파트너', label: '조합형 옵션(옵션명 최대 3개)의 조합 최대 개수' },
    { key: 'product.option_extra_range', def: '−50% / +200%', unit: '', text: true, group: '수수료·파트너', label: '옵션 조합 추가 금액 허용 범위(기본가 대비, 미끼 가격 방지)', note: '숫자는 GC.price.optionExtraRange()로 읽어요' },
    { key: 'product.price_change_alert', def: '−50% / +200%', unit: '', text: true, group: '수수료·파트너', label: '가격 오입력 경고 기준(직전 가격 대비 — 절반 이하·3배 이상, 사업자가 변경 포함)', note: '숫자는 GC.price.priceChangeAlert()로 읽어요' },
    { key: 'product.review_bd', def: 1, unit: '영업일', group: '수수료·파트너', label: '본사 상품 검수 처리 목표(넘기면 검수 담당·팀장에게 알림)' },
    { key: 'product.review_priority_hours', def: 4, unit: '영업시간', group: '수수료·파트너', label: '프로·프리미엄 플랜 우선 검수 처리 목표', phase: '2차' },
    // 2026-10-17 S12 ⑫ 키 없는 정책값 정리(MVP 키 + 페이지 상수를 엔진으로)
    { key: 'product.ship_lead_max_bd', def: 2, unit: '영업일', group: '수수료·파트너', label: '일반 상품 출고 소요일 최대' },
    { key: 'product.doc_valid_months', def: 12, unit: '개월', group: '수수료·파트너', label: '인증 서류 유효기간(발급일부터)' },
    { key: 'product.detail_slice_px', def: 3000, unit: 'px', group: '수수료·파트너', label: '상세 이미지 자르는 높이' },
    { key: 'product.detail_html_max_kb', def: 200, unit: 'KB', group: '수수료·파트너', label: '상세 설명 HTML 최대 크기' },
    { key: 'product.revision_keep_months', def: 6, unit: '개월', group: '수수료·파트너', label: '주문에 연결되지 않은 상세 설명 이전 버전 보관' },
    // 할인·쿠폰
    { key: 'promo.instant_discount_max', def: 70, unit: '%', group: '할인·쿠폰', label: '파트너 즉시 할인율 상한' },
    { key: 'promo.instant_discount_max_days', def: 90, unit: '일', group: '할인·쿠폰', label: '즉시 할인 한 건의 기간 최대' },
    { key: 'promo.instant_discount_max_targets', def: 500, unit: '개', group: '할인·쿠폰', label: '즉시 할인 한 건의 대상 상품 최대' },
    { key: 'promo.list_price_lookback_days', def: 20, unit: '일', group: '할인·쿠폰', label: '할인 전 가격 기준 기간' },
    { key: 'product.biz_price_rate_max', def: 50, unit: '%', group: '할인·쿠폰', label: '사업자 전용가 할인율 상한' },
    // 주문·클레임·CS (묶음 이름은 명세 A-SYS-03 영역 이름과 같게, 2026-10-16)
    { key: 'order.auto_confirm_days', def: 7, unit: '일', group: '주문·클레임·CS', label: '배송 완료 후 자동 구매 확정' },
    { key: 'payment.vbank_due_days', def: 3, unit: '일', group: '주문·클레임·CS', label: '가상계좌 입금 기한' },
    { key: 'claim.cancel_auto_approve_bd', def: 1, unit: '영업일', group: '주문·클레임·CS', label: '취소 요청 미처리 시 자동 승인' },
    { key: 'claim.return_ship_days', def: 7, unit: '일', group: '주문·클레임·CS', label: '반품 발송 안 하면 자동 철회' },
    { key: 'claim.inspect_bd', def: 2, unit: '영업일', group: '주문·클레임·CS', label: '회수 후 검수 기한(넘기면 자동 승인)' },
    { key: 'claim.objection_days', def: 3, unit: '일', group: '주문·클레임·CS', label: '파트너 거부 후 이의 제기 기한' },
    { key: 'claim.tolerance', def: '수량 ±3% / 위치 ±2mm', unit: '', text: true, group: '주문·클레임·CS', label: '불량 판정 허용 오차(상품마다 더 엄격하게만, 확정 때 동의)' },
    { key: 'order.partner_change_reply_days', def: 7, unit: '일', group: '주문·클레임·CS', label: '제작 파트너 변경 제안에 답할 기한(무응답이면 전액 환불)' },
    // 2026-10-16 취소·환불(D57·D58·D59)
    { key: 'order.overdue_grace_bd', def: 1, unit: '영업일', group: '주문·클레임·CS', label: '출고 지연 판정 유예(약속 출고일·출고 예정일 뒤 이 기간까지 송장이 없으면 일반은 [바로 취소], 맞춤은 [취소 요청])' },
    { key: 'claim.refund_due_bd', def: 3, unit: '영업일', group: '주문·클레임·CS', label: '환불 기한(법정 — 반품은 회수 완료 뒤, 취소는 승인·확정 뒤부터)', draft: true, legal: 'max' },
    { key: 'claim.refund_delay_rate', def: 15, unit: '%', group: '주문·클레임·CS', label: '환불 지연배상금 연 이율(법정 값이라 낮추지 않음)', draft: true, legal: 'min' },
    // 2026-10-17 S12(D71·㉑·㉒)
    { key: 'claim.late_return_days', def: 7, unit: '일', group: '주문·클레임·CS', label: "반품 사유 '늦게 받음(출고 지연)' 신청 기한(받은 날부터, 파트너 귀책)", draft: true },
    { key: 'claim.return_back_pay_days', def: 14, unit: '일', group: '주문·클레임·CS', label: '검수 거부 수량 [되돌려 받기]·[폐기] 고르는 기한(지나면 폐기, 3일 전 다시 알림)', draft: true },
    { key: 'claim.return_back_ship_bd', def: 2, unit: '영업일', group: '주문·클레임·CS', label: '되돌림 배송비 결제 뒤 파트너 송장 등록 기한' },
    { key: 'order.accept_remind_bd', def: 1, unit: '영업일', group: '주문·클레임·CS', label: '결제 뒤 발주 확인이 없으면 파트너에게 리마인드' },
    { key: 'order.accept_alert_bd', def: 2, unit: '영업일', group: '주문·클레임·CS', label: '결제 뒤 발주 확인이 없으면 운영팀 알림(자동 취소 없음)' },
    // 2026-10-17 S12 ⑫ 키 없는 정책값 정리(MVP 키 + 페이지 상수를 엔진으로)
    { key: 'order.cart_keep_days', def: 90, unit: '일', group: '주문·클레임·CS', label: '회원 장바구니 보관' },
    { key: 'order.checkout_hold_minutes', def: 30, unit: '분', group: '주문·클레임·CS', label: '주문서 유지 시간(지나면 다시 계산)' },
    { key: 'order.delay_cancel_days', def: 10, unit: '영업일', group: '주문·클레임·CS', label: '출고 지연 안내로 늦출 수 있는 최대(주문당 1번)' },
    { key: 'claim.pickup_register_bd', def: 2, unit: '영업일', group: '주문·클레임·CS', label: '반품 신청 뒤 회수 접수 기한' },
    { key: 'claim.exchange_ship_bd', def: 2, unit: '영업일', group: '주문·클레임·CS', label: '교환 승인 뒤 교환품 출고 기한' },
    { key: 'claim.mediation_bd', def: 5, unit: '영업일', group: '주문·클레임·CS', label: '본사 중재 판정 목표(넘기면 알림만)' },
    { key: 'cs.first_response_hours', def: 4, unit: '영업시간', group: '주문·클레임·CS', label: '문의 첫 응답 목표' },
    { key: 'cs.answer_bd', def: 1, unit: '영업일', group: '주문·클레임·CS', label: '1:1 문의 답변 목표' },
    { key: 'cs.auto_close_days', def: 7, unit: '일', group: '주문·클레임·CS', label: '답변 뒤 고객 응답이 없으면 자동 종료' },
    // 정산
    { key: 'settlement.payout_min', def: 1000, unit: '원', group: '정산', label: '이 금액 미만이면 다음 주기로 이월' },
    { key: 'settlement.account_change_hold_hours', def: 24, unit: '시간', group: '정산', label: '정산 계좌 변경 후 첫 지급 보류' },
    { key: 'settlement.receivable_limit', def: 300000, unit: '원', group: '정산', label: '미수금 청구서 발행 기준' },
    { key: 'settlement.receivable_weeks', def: 4, unit: '주', group: '정산', label: '미수가 이 주기 연속이면 청구서 발행' },
    { key: 'settlement.receivable_pay_days', def: 14, unit: '일', group: '정산', label: '미수금 청구서 납부 기한(넘기면 판매 중지)' },
    { key: 'settlement.cycle', def: '주 1회: 화 마감 → 수~목 확정 → 금 지급', unit: '', text: true, group: '정산', label: '정산 주기' },
    { key: 'settlement.period', def: '화 00시 ~ 다음 주 월 24시', unit: '', text: true, group: '정산', label: '정산 집계 기간' },
    { key: 'settlement.final_holdback', def: 30, unit: '%', group: '정산', label: '계약 종료 파트너 최종 정산 유보(90일)' },
    // 디자인·파일
    { key: 'design.fee', def: 39000, unit: '원', group: '디자인·파일', label: '맞춤 디자인비(VAT 포함)' },
    { key: 'design.multi_item_fee', def: 19000, unit: '원', group: '디자인·파일', label: '같은 콘셉트 추가 품목 디자인비' },
    { key: 'design.free_threshold', def: 500000, unit: '원', group: '디자인·파일', label: '맞춤 디자인비 무료 기준 금액' },
    { key: 'design.extra_revision_fee', def: 10000, unit: '원', group: '디자인·파일', label: '추가 수정(회당)' },
    { key: 'design.source_file_fee', def: 30000, unit: '원', group: '디자인·파일', label: '원본 AI 파일' },
    { key: 'design.own_file_fix_fee', def: 10000, unit: '원', group: '디자인·파일', label: '자체 파일 보정 작업' },
    { key: 'design.free_revisions_custom', def: 3, unit: '회', group: '디자인·파일', label: '무료 수정(맞춤형)' },
    { key: 'design.free_revisions_template', def: 2, unit: '회', group: '디자인·파일', label: '무료 수정(템플릿형)' },
    { key: 'design.sla.assign_hours', def: 4, unit: '영업시간', group: '디자인·파일', label: '디자이너 배정 기한' },
    { key: 'design.sla.first_draft_days', def: 2, unit: '영업일', group: '디자인·파일', label: '첫 시안 기한(멤버십 1일)' },
    { key: 'design.sla.revision_days', def: 1, unit: '영업일', group: '디자인·파일', label: '수정본 기한' },
    { key: 'design.sla.template_first_draft_days', def: 1, unit: '영업일', group: '디자인·파일', label: '템플릿형 첫 시안 목표' },
    { key: 'design.sla.senior_review_hours', def: 2, unit: '영업시간', group: '디자인·파일', label: '선임 검수 목표' },
    { key: 'design.no_response_remind_days', def: 3, unit: '일', group: '디자인·파일', label: '고객 무응답 리마인드' },
    { key: 'design.no_response_hold_days', def: 14, unit: '일', group: '디자인·파일', label: '고객 무응답 보류' },
    { key: 'design.no_response_cancel_days', def: 30, unit: '일', group: '디자인·파일', label: '고객 무응답 자동 취소' },
    { key: 'production.plate_keep_months', def: 24, unit: '개월', group: '디자인·파일', label: '판 보관 최소 기간(파트너는 늘리기만)', draft: true },
    { key: 'production.print_check_bd', def: 1, unit: '영업일', group: '디자인·파일', label: '파트너 [인쇄 가능]·[반려] 기한(패키지가 전달된 때부터 — 내려받은 때가 아님, 다시 전달하거나 변경 제안을 거두거나 생산 보류·정지·판매 중지가 풀리면 새로 셈)' },
    // 2026-10-17 S12 ⑫ 키 없는 정책값 정리(MVP 키 + 페이지 상수를 엔진으로)
    { key: 'production.hold_reply_hours', def: 4, unit: '영업시간', group: '디자인·파일', label: '생산 보류 요청에 파트너가 답할 기한(판 제작 증빙)' },
    { key: 'design.max_first_drafts', def: 2, unit: '안', group: '디자인·파일', label: '첫 시안 최대 개수' },
    { key: 'design.own_file_review_days', def: 1, unit: '영업일', group: '디자인·파일', label: '자체 파일 검수 기한' },
    { key: 'design.own_file_free_rechecks', def: 3, unit: '회', group: '디자인·파일', label: '자체 파일 무료 재검수' },
    { key: 'design.no_response_extend_days', def: 30, unit: '일', group: '디자인·파일', label: '무응답 기한 1회 연장' },
    { key: 'design.pins_per_version_max', def: 30, unit: '개', group: '디자인·파일', label: '시안 버전당 핀 최대' },
    { key: 'design.room_violation_alert_designer', def: 3, unit: '회', group: '디자인·파일', label: '협의 룸 연락처·링크 위반 반복 알림(디자이너)' },
    { key: 'design.room_violation_alert_customer', def: 5, unit: '회', group: '디자인·파일', label: '협의 룸 연락처·링크 위반 반복 알림(고객)' },
    { key: 'design.room_link_allowlist', def: 'instagram.com · naver.me · map.naver.com · place.map.kakao.com', unit: '', text: true, group: '디자인·파일', label: '협의 룸에서 가리지 않는 링크 도메인' },
    { key: 'design.reorder_free_fixes', def: 1, unit: '회', group: '디자인·파일', label: '[인쇄 가능] 뒤 수정 재주문의 무료 문구 수정' },
    { key: 'design.designer_active_max', def: 15, unit: '건', group: '디자인·파일', label: '디자이너 한 사람의 동시 진행 상한' },
    { key: 'design.file_retention', def: '마지막 주문 후 3년', unit: '', text: true, group: '디자인·파일', label: '확정 디자인 파일 보관 기간' },
    { key: 'file.scan_timeout_minutes', def: 10, unit: '분', group: '디자인·파일', label: '악성코드 검사 시간 초과(1회 재검사 뒤 격리)' },
    { key: 'file.max_size_chat', def: 100, unit: 'MB', group: '디자인·파일', label: '협의 룸·생산 협의 채널 첨부 한도' },
    { key: 'file.max_size_original', def: 500, unit: 'MB', group: '디자인·파일', label: '인쇄 원본·고객 자체 인쇄 파일·칼선 파일 한도' },
    { key: 'file.max_size_logo', def: 100, unit: 'MB', group: '디자인·파일', label: '고객 로고 파일 한도(1개)' },
    { key: 'file.max_size_image', def: 20, unit: 'MB', group: '디자인·파일', label: '참고 파일(참고 이미지 — AI·PDF·SVG 포함)·간판 사진·상품·클레임 사진 장당 한도' },
    // 회원·혜택·알림
    { key: 'member.min_age', def: 19, unit: '세', group: '회원·혜택·알림', label: '가입 가능 나이(만)' },
    { key: 'member.rejoin_block_days', def: 30, unit: '일', group: '회원·혜택·알림', label: '탈퇴 후 재가입 제한' },
    { key: 'member.biz_accounts_max', def: 3, unit: '개', group: '회원·혜택·알림', label: '사업자번호당 인증 가능 계정' },
    { key: 'member.biz_manual_bd', def: 1, unit: '영업일', group: '회원·혜택·알림', label: '사업자 인증 수동 검토 처리 목표(넘기면 운영팀 알림)' },
    // 2026-10-17 S12 ⑫ 키 없는 정책값 정리(MVP 키 + 페이지 상수를 엔진으로)
    { key: 'member.biz_verify_fail_max', def: 3, unit: '회', group: '회원·혜택·알림', label: '사업자 진위 확인 실패 → 서류 수동 심사 안내' },
    { key: 'member.identity_daily_max', def: 5, unit: '회', group: '회원·혜택·알림', label: '본인인증 하루 최대(비용 한도)' },
    { key: 'member.address_max', def: 20, unit: '개', group: '회원·혜택·알림', label: '배송지 저장 최대' },
    { key: 'member.biz_closed_grace_days', def: 30, unit: '일', group: '회원·혜택·알림', label: '휴업·폐업 확인 뒤 사업자 혜택 해제까지 유예(휴업도 같음, 2026-10-17 D69)' },
    { key: 'member.web_keep_login_days', def: 30, unit: '일', group: '회원·혜택·알림', label: '웹 "로그인 유지" 기간' },
    { key: 'member.app_keep_login_days', def: 90, unit: '일', group: '회원·혜택·알림', label: '앱 자동 로그인 최대(마지막 사용부터)' },
    { key: 'membership.price_monthly', def: 9900, unit: '원', group: '회원·혜택·알림', label: '멤버십 월간 요금', phase: '2차' },
    { key: 'membership.price_yearly', def: 99000, unit: '원', group: '회원·혜택·알림', label: '멤버십 연간 요금', phase: '2차' },
    { key: 'membership.free_ship_coupons', def: 4, unit: '장/월', group: '회원·혜택·알림', label: '멤버십 무료배송 쿠폰', phase: '2차' },
    { key: 'membership.free_ship_max', def: 3000, unit: '원', group: '회원·혜택·알림', label: '무료배송 쿠폰 장당 최대', phase: '2차' },
    { key: 'membership.free_ship_min_order', def: 30000, unit: '원', group: '회원·혜택·알림', label: '무료배송 쿠폰 최소 주문', phase: '2차' },
    { key: 'membership.extra_point_rate', def: 2, unit: '%', group: '회원·혜택·알림', label: '멤버십 추가 적립', phase: '2차' },
    { key: 'membership.extra_point_cap', def: 5000, unit: '원/월', group: '회원·혜택·알림', label: '추가 적립 월 한도', phase: '2차' },
    { key: 'notify.ad_daily_max', def: 1, unit: '회', group: '회원·혜택·알림', label: '광고성 메시지 하루 최대' },
    { key: 'notify.ad_weekly_max', def: 3, unit: '회', group: '회원·혜택·알림', label: '광고성 메시지 주 최대' },
    { key: 'notify.ad_send_hours', def: '카카오가 정한 시간(확인 필요)', unit: '', text: true, group: '회원·혜택·알림', label: '카카오 브랜드 메시지 발송 가능 시간' },
    { key: 'notify.room_digest_minutes', def: 10, unit: '분', group: '회원·혜택·알림', label: '협의 룸·생산 협의 채널 알림 묶음 단위(두 채널은 따로 셈)' },
    // 광고·검색·앱 (2026-10-17 S12 ⑫)
    { key: 'search.rank_weights', def: '관련도 · 최근 30일 판매량 · 전환율 · 신상품 가산 · 품절 감점(리뷰·출고 준수율은 MVP 0)', unit: '', text: true, group: '광고·검색·앱', label: '기본 정렬 가중치' },
    { key: 'app.min_os', def: 'Android 8 / iOS 15', unit: '', text: true, group: '광고·검색·앱', label: '앱 지원 최저 OS' },
  ];
  const POLICY_BY_KEY = Object.fromEntries(POLICY.map((p) => [p.key, p]));
  const POLICY_STORE = 'gc.policy.v1';

  function readOverrides() {
    try {
      if (typeof localStorage === 'undefined') return {};
      const raw = localStorage.getItem(POLICY_STORE);
      return raw ? JSON.parse(raw) || {} : {};
    } catch (e) { return {}; }
  }
  function writeOverrides(obj) {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(POLICY_STORE, JSON.stringify(obj)); } catch (e) { /* 저장 불가 환경: 이 페이지에서만 유지 */ }
  }
  let memOverrides = null;
  const Policy = {
    list() {
      const o = this.overrides();
      return POLICY.map((p) => ({ ...p, value: Object.prototype.hasOwnProperty.call(o, p.key) ? o[p.key] : p.def, changed: Object.prototype.hasOwnProperty.call(o, p.key) }));
    },
    meta(key) { return POLICY_BY_KEY[key]; },
    overrides() { if (memOverrides) return memOverrides; memOverrides = readOverrides(); return memOverrides; },
    get(key) {
      const o = this.overrides();
      if (Object.prototype.hasOwnProperty.call(o, key)) return o[key];
      if (!POLICY_BY_KEY[key]) throw new Error('UNKNOWN_POLICY:' + key);
      return POLICY_BY_KEY[key].def;
    },
    set(key, value) {
      if (!POLICY_BY_KEY[key]) throw new Error('UNKNOWN_POLICY:' + key);
      const o = { ...this.overrides() };
      if (value === POLICY_BY_KEY[key].def) delete o[key]; else o[key] = value;
      memOverrides = o; writeOverrides(o);
    },
    reset() { memOverrides = {}; writeOverrides({}); },
    /** 법정 값(메타 legal: 'min' = 기본값보다 낮추면 고객에게 불리, 'max' = 늘리면 불리)을 불리한 쪽으로 바꾸려 하면 ok:false (A-SYS-03, 2026-10-17 S12) */
    legalOk(key, value) {
      const m = POLICY_BY_KEY[key];
      if (!m || !m.legal || value == null || Number.isNaN(+value)) return { ok: true };
      const bad = m.legal === 'min' ? +value < m.def : +value > m.def;
      return { ok: !bad, dir: m.legal, bound: m.def };
    },
    /* 테스트·예시 계산용: 기본값으로만 계산 */
    useDefaults() { memOverrides = {}; },
    /** 이 키를 바꿀 수 있는 권한 = A-SYS-01 권한 표의 어느 행을 따르나(A-SYS-03 '누가 바꾸나', 2026-10-16 D42) */
    permRow(key) {
      if (/^commission\./.test(key)) return '수수료율 변경';
      if (DESIGN_PRICE_KEYS.includes(key)) return '디자인 옵션 가격';
      if (/^(coupon|promo|membership|ads)\./.test(key)) return '쿠폰 · 캠페인 · 멤버십 · 광고 운영'; // 요금처럼 영향 큰 값은 최고관리자 승인
      return '관리자 계정 · 권한 · 정책값'; // 보안·파일 한도·생산·배치 등 그 밖은 최고관리자만
    },
  };
  // 디자인비·옵션 가격과 무료 기준 키(명세 A-SYS-03 '누가 바꾸나' — A-REV-04 화면 값)
  const DESIGN_PRICE_KEYS = ['design.fee', 'design.multi_item_fee', 'design.free_threshold', 'design.extra_revision_fee', 'design.source_file_fee', 'design.own_file_fix_fee', 'design.vector_redo_fee', 'design.rush_fee', 'design.brand_package_fee', 'design.logo_fee'];

  /* ───────────── 숫자·날짜 ───────────── */
  const won = (n) => (n < 0 ? '−' : '') + Math.abs(Math.round(n)).toLocaleString('ko-KR') + '원';
  const signedWon = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(Math.round(n)).toLocaleString('ko-KR') + '원';
  const num = (n) => Math.round(n).toLocaleString('ko-KR');
  const floor10 = (n) => Math.floor(n / 10) * 10;
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  const pad = (n) => String(n).padStart(2, '0');
  function fmtDate(d, withTime = true) {
    const x = new Date(d);
    const s = `${x.getMonth() + 1}/${x.getDate()}(${DOW[x.getDay()]})`;
    return withTime ? `${s} ${pad(x.getHours())}:${pad(x.getMinutes())}` : s;
  }
  function fmtTime(d) { const x = new Date(d); return `${pad(x.getHours())}:${pad(x.getMinutes())}`; }
  const DAY = 86400000, HOUR = 3600000;
  /* 영업시간: 평일 09~18시. 공휴일 달력(calendar.holidays)은 정책값 키만 두고 계산에서는 생략(2026-10-14 S7 결정) */
  const isBizDay = (d) => { const w = new Date(d).getDay(); return w !== 0 && w !== 6; };
  function addBusinessDays(d, days) {
    let x = new Date(d); let left = days;
    while (left > 0) { x = new Date(x.getTime() + DAY); if (isBizDay(x)) left -= 1; }
    return x;
  }
  function addBusinessHours(d, hours) {
    let x = new Date(d); let left = hours * 60;
    while (left > 0) {
      const h = x.getHours();
      if (!isBizDay(x) || h >= 18) { x = new Date(x.getFullYear(), x.getMonth(), x.getDate() + 1, 9, 0); continue; }
      if (h < 9) { x = new Date(x.getFullYear(), x.getMonth(), x.getDate(), 9, 0); continue; }
      const endOfDay = new Date(x.getFullYear(), x.getMonth(), x.getDate(), 18, 0);
      const avail = (endOfDay - x) / 60000;
      if (avail >= left) { x = new Date(x.getTime() + left * 60000); left = 0; } else { left -= avail; x = endOfDay; }
    }
    return x;
  }
  function vatSplit(totalVatIncl) {
    const vat = totalVatIncl - Math.round(totalVatIncl / 1.1);
    return { supply: totalVatIncl - vat, vat };
  }

  /* ───────────── 가격 계산 (C-PRICE-01 · C-PRICE-03) ───────────── */
  function tierPrice(tiers, qty) {
    const sorted = [...tiers].sort((a, b) => a.min - b.min);
    let p = sorted[0].price;
    for (const t of sorted) if (qty >= t.min) p = t.price;
    return p;
  }
  /* 다음 구간까지: "2박스 더 담으면 박스당 2,000원 할인" */
  function nextTier(tiers, qty) {
    const sorted = [...tiers].sort((a, b) => a.min - b.min);
    const cur = tierPrice(sorted, qty);
    const nx = sorted.find((t) => t.min > qty && t.price < cur);
    return nx ? { need: nx.min - qty, price: nx.price, saving: cur - nx.price } : null;
  }
  function applyInstantUnit(unit, disc) {
    if (!disc) return unit;
    if (disc.type === 'rate') return unit - Math.floor((unit * disc.value) / 100);
    return Math.max(0, unit - disc.value);
  }

  /* ───────────── 사업자 전용가 (P-PRD-03 · P-PRD-05 · 2026-10-13 확정) ─────────────
   * biz = { mode: 'none' | 'rate' | 'amount', rate?: %, amounts?: [구간별 사업자 단가] }
   * 할인율: 모든 구간 단가에 같은 비율(원 단위 내림) · 숫자: 구간마다 직접 입력(모든 구간 필수) */
  const rateCut = (v, rate) => v - Math.floor((v * rate) / 100);
  function bizTiers(tiers, biz) {
    if (!biz || biz.mode === 'none' || !tiers || !tiers.length) return null;
    if (biz.mode === 'rate') return biz.rate > 0 ? tiers.map((t) => ({ min: t.min, price: rateCut(t.price, biz.rate) })) : null;
    const a = biz.amounts || [];
    return tiers.every((t, i) => a[i] > 0) ? tiers.map((t, i) => ({ min: t.min, price: a[i] })) : null;
  }
  /* 가격 계산 ①: 결제 요청 시점 회원 유형으로 단가표를 고르고 가격 종류를 남김 */
  function pickTiers(tiers, biz, member) {
    const bt = member === 'biz' ? bizTiers(tiers, biz) : null;
    return bt ? { tiers: bt, priceType: 'BIZ' } : { tiers, priceType: 'NORMAL' };
  }
  /* 옵션 추가 금액(P-PRD-02): 할인율 방식이면 같은 비율, 숫자 방식이면 그대로 */
  function bizOptionExtra(extra, biz) {
    if (!biz || biz.mode !== 'rate' || !extra) return extra;
    return extra > 0 ? rateCut(extra, biz.rate) : -rateCut(-extra, biz.rate);
  }
  function bizErrors(tiers, biz, { instant = null } = {}) {
    const e = [];
    if (!biz || biz.mode === 'none') return e;
    if (biz.mode === 'rate') {
      const max = Policy.get('product.biz_price_rate_max');
      if (!(biz.rate >= 1 && biz.rate <= max)) e.push({ i: -1, m: `사업자 할인율은 1%에서 ${max}%(관리자 설정값) 사이로 넣어 주세요` });
    } else {
      const a = biz.amounts || [];
      tiers.forEach((t, i) => {
        if (!(a[i] > 0)) e.push({ i, m: `${i + 1}구간 사업자 단가를 넣어 주세요. 숫자 방식은 모든 구간에 넣어야 저장돼요` });
        else {
          if (a[i] >= t.price) e.push({ i, m: `${i + 1}구간 사업자 단가는 일반가(${won(t.price)})보다 낮아야 해요` });
          if (i > 0 && a[i - 1] > 0 && a[i] > a[i - 1]) e.push({ i, m: `${i + 1}구간 사업자 단가가 ${i}구간보다 비싸요. 수량이 늘수록 같거나 낮아야 해요` });
        }
      });
    }
    const bt = bizTiers(tiers, biz);
    if (bt && !e.length) bt.forEach((t, i) => { if (applyInstantUnit(t.price, instant) < 100) e.push({ i, m: `${i + 1}구간 사업자가가 할인 후 100원 미만이 돼요` }); });
    return e;
  }
  /* 사업자가 역전 경고(P-PRM-01, 2026-10-14 확정 D12=C): 즉시 할인을 '사업자가 적용 안 함'으로 걸었을 때
   * 어느 구간이든 일반가 할인 후 단가 < 사업자가면 경고만. 계산(사업자 회원은 사업자가 표)은 바꾸지 않음.
   * instant = { type, value, applyBiz?: boolean(기본 true) } · 반환: 역전된 구간 목록(없으면 []) */
  function bizInversion(tiers, biz, instant) {
    if (!instant || instant.applyBiz !== false) return [];
    const bt = bizTiers(tiers, biz);
    if (!bt) return [];
    return tiers.map((t, i) => ({ i, min: t.min, normalAfter: applyInstantUnit(t.price, instant), biz: bt[i].price }))
      .filter((x) => x.normalAfter < x.biz);
  }
  const BIZ_INVERSION_MSG = '이 할인 동안 사업자 회원이 일반 회원보다 비싸게 삽니다. 사업자 회원에게는 사업자가가 적용됩니다.';
  /* 할인 전 가격(P-PRM-01): 최근 N일 실제 결제 최저 단가. 결제 때 적용된 가격 종류(NORMAL/BIZ)별로 따로 계산.
   * history = [{ at: Date|ms, unit, priceType }], start = 할인 시작 시각 */
  function listPrice(history, priceType, start, days = Policy.get('promo.list_price_lookback_days')) {
    const t0 = new Date(start).getTime(); const from = t0 - days * DAY;
    const u = (history || []).filter((h) => h.priceType === priceType && +new Date(h.at) >= from && +new Date(h.at) < t0).map((h) => h.unit);
    return u.length ? Math.min(...u) : null;
  }
  /* 안분: 항목마다 원 단위 내림, 끝전은 금액이 가장 큰 항목(같으면 앞 항목)에 */
  function allocate(total, bases) {
    const sum = bases.reduce((a, b) => a + b, 0);
    if (sum <= 0 || total <= 0) return bases.map(() => 0);
    const parts = bases.map((b) => Math.floor((total * b) / sum));
    let rest = total - parts.reduce((a, b) => a + b, 0);
    if (rest > 0) {
      let idx = 0;
      bases.forEach((b, i) => { if (b > bases[idx]) idx = i; });
      parts[idx] += rest;
    }
    return parts;
  }
  function couponDiscount(c, basis) {
    if (!c || basis <= 0) return 0;
    if (c.minOrder && basis < c.minOrder) return 0;
    let d = c.type === 'rate' ? Math.floor((basis * c.value) / 100) : c.value;
    if (c.max) d = Math.min(d, c.max);
    return Math.min(d, basis);
  }
  function shippingBase(tpl, qty, basis) {
    if (!tpl) return 0;
    switch (tpl.type) {
      case 'free': return 0;
      case 'fixed': return tpl.base;
      case 'conditional': return basis >= tpl.freeOver ? 0 : tpl.base;
      case 'perQty': return tpl.base * Math.ceil(qty / tpl.per);
      default: return tpl.base || 0;
    }
  }

  /** 판비에 거는 즉시 할인(2026-10-15 D20): '맞춤 상품 적용 범위'에 판비를 고른 경우만(instant.plate). 정률은 판비 × 율 원 단위 내림, 정액은 판비에서 한 번 뺌 */
  function plateInstantDisc(plateFee, disc) {
    if (!plateFee || !disc || !disc.plate) return 0;
    if (disc.type === 'rate') return Math.floor((plateFee * disc.value) / 100);
    return Math.min(plateFee, disc.value);
  }
  /** '−50% / +200%' 같은 변화율 정책값 → { down: -50, up: 200 }(부호 붙은 값 = 기준 대비 변화율, +200% = 3배) */
  function pctRange(key) {
    const m = String(Policy.get(key)).replace(/−/g, '-').match(/(-?\d+(?:\.\d+)?)\s*%\s*\/\s*\+?(-?\d+(?:\.\d+)?)\s*%/);
    return m ? { down: Number(m[1]), up: Number(m[2]) } : { down: -50, up: 200 };
  }
  /** 옵션 조합 추가 금액 허용 범위(P-PRD-02, 정책값 product.option_extra_range '−50% / +200%', 2026-10-16) → { down: -50, up: 200 } */
  function optionExtraRange() { return pctRange('product.option_extra_range'); }
  /** 가격 오입력 경고 기준(P-PRD-03, 정책값 product.price_change_alert, 2026-10-16 S11) → { down: -50, up: 200 } = 직전 가격의 절반 이하·3배 이상 */
  function priceChangeAlert() { return pctRange('product.price_change_alert'); }
  /** 가격을 바꿀 때 경고할지: 'down'(절반 이하) | 'up'(3배 이상) | null. 사업자가 할인율 방식은 바뀐 결과 단가로 넣음 */
  function priceChangeCheck(prev, next) {
    if (!(prev > 0) || !(next >= 0)) return null;
    const r = priceChangeAlert();
    if (next <= prev * (1 + r.down / 100)) return 'down';
    if (next >= prev * (1 + r.up / 100)) return 'up';
    return null;
  }
  /** 디자인비 쿠폰(2026-10-15 D21 · 2026-10-16 D41): 그 디자인 요청(묶음)의 디자인비에만. type 'free'(전액 = 정률 100%) | 'amount'(정액) | 'rate'(정률, 100%까지).
   *  max(최대 할인액)는 선택 — 없으면 디자인비까지. 묶음이면 calcOrder가 품목별 디자인비 비율로 나눠 designFees[].couponAlloc에 남김 */
  function designCouponDiscount(c, fee) {
    if (!c || fee <= 0) return 0;
    let d = c.type === 'free' ? fee : c.type === 'rate' ? Math.floor((fee * c.value) / 100) : c.value;
    if (c.max) d = Math.min(d, c.max);
    return Math.min(d, fee);
  }

  /**
   * 주문 금액 계산. 단계: ① 상품 금액(구간 단가 · 판비 · 추가 구성품) → ② 파트너 할인(즉시 할인 → 파트너 쿠폰) → ③ 디자인비 판정
   *   → ④ 본사 쿠폰(상품 할인 쿠폰 → 디자인비 쿠폰) → ⑤ 배송비·배송비 쿠폰 → ⑥ 포인트
   * input = {
   *   items: [{ id, name, partnerId, shipKey, qty, unit, tiers:[{min, price}], priceType?:'NORMAL'|'BIZ'(pickTiers 결과, 스냅샷에 남김),
   *             instant?:{type:'rate'|'amount', value, plate?: boolean(판비에도 — '맞춤 상품 적용 범위'에 판비를 고른 경우)},
   *             plateFee?: number, designGroup?: string,
   *             addonOf?: itemId(추가 구성품 — 판매가 × 수량, 파트너 할인 없음, 디자인비 판정 제외, 본 상품과 같은 배송 묶음) }],
   *   partnerCoupons?: { [partnerId]: { name, type, value, max?, minOrder?, itemIds?: [itemId] } },   // 2차. 대상 맞춤 상품의 판비에도 걸림
   *   designGroups?: [{ id, type:'CUSTOM'|'TEMPLATE'|'OWN_FILE'|'REORDER', voucher?: boolean, lockedFee?: number }],
   *   hqCoupon?: { name, type, value, max?, minOrder? },            // 본사 상품 할인 쿠폰(장바구니·상품 중 1장): 판비·추가 구성품 포함, 디자인비 제외, 안분
   *   designCoupon?: { name, type:'free'|'amount'|'rate', value?, max?, minOrder?, groupId? },  // 본사 디자인비 쿠폰(1장): 디자인 요청(묶음) 하나의 디자인비에만.
   *                                                       //   minOrder는 그 묶음의 맞춤 품목 금액(③ basis)과 비교, 묶음이 여럿이면 할인이 가장 큰 곳(D51)
   *   shipping?: { [shipKey]: { name, type:'free'|'fixed'|'conditional'|'perQty', base, freeOver?, per?, regionExtra? } },
   *   shipCoupons?: { [shipKey]: { name, max, minOrder } },
   *   points?: number
   * }
   * 예전의 hqCoupon.includeDesignFee('디자인비 포함')는 2026-10-15 D21로 없앴습니다(넘겨도 무시).
   */
  function calcOrder(input) {
    const items = input.items || [];
    const fee1 = Policy.get('design.fee');
    const feeN = Policy.get('design.multi_item_fee');
    const threshold = Policy.get('design.free_threshold');

    // ① 상품 금액: 구간 단가(추가 구성품은 판매가 × 수량) · 판비(1회 금액)
    const lines = items.map((it) => {
      const addon = !!it.addonOf;
      const unitPrice = tierPrice(it.tiers, it.qty);
      const gross = unitPrice * it.qty;
      // ② 즉시 할인 (단가 기준 원 단위 내림 후 수량 곱). 추가 구성품에는 파트너 할인이 걸리지 않음
      const disc = addon ? null : it.instant;
      const discUnit = applyInstantUnit(unitPrice, disc);
      const instantDisc = (unitPrice - discUnit) * it.qty;
      const plateFee = addon ? 0 : it.plateFee || 0;
      const plateInstant = plateInstantDisc(plateFee, disc);
      return { id: it.id, name: it.name, partnerId: it.partnerId, shipKey: it.shipKey, qty: it.qty, unit: it.unit,
        priceType: it.priceType || 'NORMAL', addonOf: it.addonOf || null, unitPrice, discUnit, gross, instantDisc, partnerCouponDisc: 0, afterInstant: gross - instantDisc,
        plateFee, plateInstantDisc: plateInstant, platePartnerCouponDisc: 0, plateAfterInstant: plateFee - plateInstant,
        designGroup: addon ? null : it.designGroup || null, hqAlloc: 0, plateHqAlloc: 0 };
    });

    // ② 파트너 쿠폰: 파트너별 1장, 그 파트너 대상 상품 합계(즉시 할인 후, 맞춤 상품은 판비 포함)에 적용 후 안분. 추가 구성품 제외
    const partnerCouponLines = [];
    const pcs = input.partnerCoupons || {};
    for (const pid of Object.keys(pcs)) {
      const ids = pcs[pid].itemIds; // 대상 상품을 정하지 않으면 그 파트너 상품 전체
      const target = lines.filter((l) => l.partnerId === pid && !l.addonOf && (!ids || ids.includes(l.id)));
      const bases = [...target.map((l) => l.afterInstant), ...target.map((l) => l.plateAfterInstant)];
      const basis = bases.reduce((a, b) => a + b, 0);
      const d = couponDiscount(pcs[pid], basis);
      if (d > 0) {
        const alloc = allocate(d, bases);
        target.forEach((l, i) => { l.partnerCouponDisc += alloc[i]; l.platePartnerCouponDisc += alloc[target.length + i]; });
        partnerCouponLines.push({ partnerId: pid, name: pcs[pid].name, amount: d });
      }
    }
    lines.forEach((l) => {
      l.afterPartner = l.afterInstant - l.partnerCouponDisc;
      l.plateAfterPartner = l.plateAfterInstant - l.platePartnerCouponDisc;
    });

    // ③ 디자인비 판정: 같은 디자인 요청(묶음)의 맞춤 품목 금액(적용된 일반가·사업자가 기준, 파트너 할인 후·본사 쿠폰 전, 판비·추가 구성품·배송비 제외)
    const designFees = (input.designGroups || []).map((g) => {
      const gl = lines.filter((l) => l.designGroup === g.id);
      const basis = gl.reduce((a, l) => a + l.afterPartner, 0);
      const count = gl.length;
      const listFee = g.type === 'CUSTOM' && count > 0 ? fee1 + feeN * (count - 1) : 0;
      let fee = listFee; let reason = g.type === 'CUSTOM' ? 'paid' : 'not_custom';
      let shortfall = 0;
      if (typeof g.lockedFee === 'number') { fee = g.lockedFee; reason = 'locked'; }
      else if (g.type === 'CUSTOM' && count > 0) {
        if (basis >= threshold) { fee = 0; reason = 'threshold'; }
        else {
          shortfall = threshold - basis;
          if (g.voucher) { fee = listFee - fee1; reason = 'voucher'; }
        }
      }
      return { groupId: g.id, type: g.type, basis, listFee, fee, reason, shortfall, itemCount: count, itemIds: gl.map((l) => l.id), couponDisc: 0, couponAlloc: gl.map(() => 0), couponShort: 0 };
    });
    const designFeeTotal = designFees.reduce((a, d) => a + d.fee, 0);

    // ④ 본사 쿠폰(자리마다 1장, D21). 상품 할인 쿠폰 최소 주문 = 파트너 할인 후 상품 금액 합계(판비·추가 구성품 포함, 디자인비 제외)
    const productBases = [...lines.map((l) => l.afterPartner), ...lines.map((l) => l.plateAfterPartner)];
    const productBasis = productBases.reduce((a, b) => a + b, 0);
    // ④-1 상품 할인 쿠폰(장바구니·상품 중 1장): 항목별 금액 비율로 안분(판비 줄도 따로 받음)
    const hq = input.hqCoupon || null;
    const hqDisc = couponDiscount(hq, productBasis);
    if (hqDisc > 0) {
      const alloc = allocate(hqDisc, productBases);
      lines.forEach((l, i) => { l.plateHqAlloc = alloc[lines.length + i]; l.hqAlloc = alloc[i] + l.plateHqAlloc; });
    }
    // ④-2 디자인비 쿠폰(1장): 50만원 무료·멤버십 이용권이 먼저이고 그때는 쓰지 않음(쿠폰함에 남김 — 이용권과 동시 사용 불가, D-REQ-04·U-BEN-01)
    //   최소 주문 = 그 묶음의 맞춤 품목 금액(③ basis, 50만원 판정과 같은 금액 — 일반 상품으로 못 채움), 조건을 채운 묶음 가운데 할인이 가장 큰 곳(같으면 앞 묶음, 2026-10-16 D51)
    const dc = input.designCoupon || null;
    let designCouponDisc = 0; let designCouponGroup = null;
    if (dc) {
      let target = null; let best = 0;
      designFees.forEach((d) => {
        if ((dc.groupId && d.groupId !== dc.groupId) || d.fee <= 0 || d.reason === 'voucher') return;
        if (dc.minOrder && d.basis < dc.minOrder) { d.couponShort = dc.minOrder - d.basis; return; }
        const amt = designCouponDiscount(dc, d.fee);
        if (!target || amt > best) { target = d; best = amt; }
      });
      if (target) {
        target.couponDisc = designCouponDiscount(dc, target.fee); designCouponDisc = target.couponDisc; designCouponGroup = target.groupId;
        // 묶음이면 품목별 디자인비(첫 품목 design.fee, 나머지 design.multi_item_fee) 비율로 안분 — 남는 원은 첫 품목(D41)
        if (target.reason === 'paid') target.couponAlloc = allocate(target.couponDisc, target.itemIds.map((_, i) => (i === 0 ? fee1 : feeN)));
        else target.couponAlloc = target.itemIds.map((_, i) => (i === 0 ? target.couponDisc : 0));
      }
    }
    // 고객이 낸 판비 = 판비 줄의 결제 금액(파트너 할인·본사 쿠폰 안분 뒤, 결제 스냅샷) — 확정 후 취소의 판비 공제 상한(C-PAY-02)
    lines.forEach((l) => { l.platePaid = l.plateAfterPartner - l.plateHqAlloc; });

    // ⑤ 배송비: 묶음(파트너+출고지+출고 유형)별. 추가 구성품은 본 상품의 shipKey를 그대로 씀
    const shipping = input.shipping || {};
    const shipCoupons = input.shipCoupons || {};
    const shipKeys = [...new Set(lines.map((l) => l.shipKey))];
    const shippingLines = shipKeys.map((k) => {
      const gl = lines.filter((l) => l.shipKey === k);
      const tpl = shipping[k];
      const basisPartner = gl.reduce((a, l) => a + l.afterPartner + l.plateAfterPartner, 0); // 본사 쿠폰 전
      const basisAfterHq = basisPartner - gl.reduce((a, l) => a + l.hqAlloc, 0); // 본사 쿠폰 후
      const qty = gl.reduce((a, l) => a + l.qty, 0);
      const base = shippingBase(tpl, qty, basisPartner);
      const region = tpl && tpl.regionExtra ? tpl.regionExtra : 0;
      const sc = shipCoupons[k];
      const coupon = sc && basisAfterHq >= (sc.minOrder || 0) ? Math.min(base, sc.max) : 0;
      const freeShort = tpl && tpl.type === 'conditional' && base > 0 ? tpl.freeOver - basisPartner : 0;
      return { shipKey: k, name: tpl ? tpl.name : k, base, region, coupon, fee: base + region - coupon, freeShort, basisPartner };
    });

    const gross = lines.reduce((a, l) => a + l.gross, 0);
    const addons = lines.filter((l) => l.addonOf).reduce((a, l) => a + l.gross, 0);
    const instantDisc = lines.reduce((a, l) => a + l.instantDisc + l.plateInstantDisc, 0);
    const partnerCouponDisc = lines.reduce((a, l) => a + l.partnerCouponDisc + l.platePartnerCouponDisc, 0);
    const plates = lines.reduce((a, l) => a + l.plateFee, 0);
    const platesPaid = lines.reduce((a, l) => a + l.platePaid, 0);
    const shipBase = shippingLines.reduce((a, s) => a + s.base + s.region, 0);
    const shipCouponDisc = shippingLines.reduce((a, s) => a + s.coupon, 0);
    const customerTotal = gross - instantDisc - partnerCouponDisc + designFeeTotal + plates - hqDisc - designCouponDisc + shipBase - shipCouponDisc;
    // ⑥ 포인트: 결제 수단처럼 마지막에
    const points = Math.min(input.points || 0, customerTotal);
    const pay = customerTotal - points;
    const vs = vatSplit(customerTotal);

    const steps = [
      { no: 1, key: 'tier', label: '상품 금액', detail: addons ? `수량 구간 단가 적용 · 추가 구성품 ${won(addons)} 포함` : '수량 구간 단가 적용', amount: gross },
      { no: 1, key: 'plate', label: '판비', detail: '인쇄판 제작비(1회) · 상품 금액 · 재주문 때 면제', amount: plates, hidden: plates === 0 },
      { no: 2, key: 'partner', label: '파트너 할인', detail: '즉시 할인 → 파트너 쿠폰(추가 구성품 제외)', amount: -(instantDisc + partnerCouponDisc), payer: 'partner' },
      { no: 3, key: 'design', label: '디자인비', detail: designFees.length ? designFees.map(designFeeText).join(' · ') : '디자인 요청 없음', amount: designFeeTotal, payer: designFeeTotal ? 'customer' : null },
      { no: 4, key: 'hq', label: '본사 상품 할인 쿠폰', detail: hq ? hq.name : '쓴 쿠폰 없음', amount: -hqDisc, payer: hqDisc ? 'hq' : null },
      { no: 4, key: 'designcoupon', label: '디자인비 쿠폰', detail: dc ? dc.name : '쓴 쿠폰 없음', amount: -designCouponDisc, payer: designCouponDisc ? 'hq' : null, hidden: designCouponDisc === 0 },
      { no: 5, key: 'ship', label: '배송비', detail: shippingLines.map((s) => `${s.name} ${won(s.base + s.region)}`).join(' · '), amount: shipBase },
      { no: 5, key: 'shipcoupon', label: '배송비 쿠폰', detail: '묶음당 1장', amount: -shipCouponDisc, payer: shipCouponDisc ? 'hq' : null, hidden: shipCouponDisc === 0 },
      { no: 6, key: 'points', label: '포인트', detail: '결제 수단처럼 마지막에 차감', amount: -points, payer: points ? 'hq' : null, hidden: points === 0 },
    ];
    return {
      lines, partnerCouponLines, designFees, shippingLines, steps,
      totals: { gross, addons, instantDisc, partnerCouponDisc, designFee: designFeeTotal, plates, platesPaid, hqDisc, designCoupon: designCouponDisc, designCouponGroup, shipping: shipBase, shipCoupon: shipCouponDisc, points, customerTotal, pay, supply: vs.supply, vat: vs.vat },
    };
  }
  /** 추가 구성품 함께 처리(C-STATE-01, 2026-10-15 D24② · 2026-10-16 D39): 본 상품 항목의 남은 수량이 모두 취소되면 붙은 추가 구성품도 같은 사유로 —
   *   출고 전이면 함께 취소(cascade, ORDER parent_canceled), 이미 출고됐으면(출고 뒤 취소 이의 인정·분할 출고) 같은 취소 클레임으로
   *   한 번에 회수해 검수 없이 함께 환불(toReturn, ORDER parent_collected). 본 상품 일부만 취소되면 구성품은 그대로(partialParents).
   * items = [{ id, addonOf?, qty?, canceledQty? }]
   * cancel = [id] (남은 수량 전부) 또는 [{ id, qty }] (그 수량만), shippedIds = 이미 출고된 항목 id
   * → { cascade:[id], toReturn:[id], partialParents:[id] } */
  function addonCascade(items, cancel, shippedIds = []) {
    const list = items || [];
    const byId = Object.fromEntries(list.map((it) => [it.id, it]));
    const req = (cancel || []).map((c) => (typeof c === 'string' ? { id: c, qty: null } : c));
    const full = []; const partialParents = [];
    req.forEach(({ id, qty }) => {
      const it = byId[id];
      const left = it && typeof it.qty === 'number' ? it.qty - (it.canceledQty || 0) : null;
      if (qty == null || left == null || qty >= left) full.push(id); else partialParents.push(id);
    });
    const kids = list.filter((it) => it.addonOf && full.includes(it.addonOf) && !req.some((r) => r.id === it.id));
    return { cascade: kids.filter((k) => !shippedIds.includes(k.id)).map((k) => k.id), toReturn: kids.filter((k) => shippedIds.includes(k.id)).map((k) => k.id), partialParents };
  }
  const endOfDay = (d) => { const x = new Date(d); return new Date(x.getFullYear(), x.getMonth(), x.getDate(), 23, 59, 59); };
  /** 출고 지연 판정 시각(P-ORD-03 · 2026-10-16 D58·D59): 약속 출고일(맞춤은 출고 예정일, 지연 안내·기각 때 받은 새 예정일이 있으면 그 날)
   *  + order.overdue_grace_bd 영업일, 그날 끝. 출고일이 정해질 때 계산해 저장. bd를 주면 그 값으로(운영 설정 미리보기) */
  function overdueAt(promisedAt, bd = Policy.get('order.overdue_grace_bd')) {
    return endOfDay(addBusinessDays(promisedAt, bd));
  }
  /** 본사 일괄 공지 지연(지연 예외 기간 — A-ORD-01 · P-ORD-03, 2026-10-17 D72) 안이면 판정하지 않음 */
  function inNotice(now, notice) { return !!notice && +new Date(now) >= +new Date(notice.start) && (!notice.end || +new Date(now) <= +new Date(notice.end)); }
  /** 일괄 공지가 끝난 뒤 판정 시각: 판정 시각이 기간 안에 들었거나 끝나기 전에 이미 지났으면 끝난 날 + order.overdue_grace_bd 영업일의 끝(원래와 견줘 늦은 쪽).
   *  공지 전에 이미 판정된 건(판정 시각 < 시작 — [바로 취소]·[취소 요청]이 열림)과 공지 뒤에 판정할 건은 그대로 */
  function afterNotice({ judgeAt, notice, bd = Policy.get('order.overdue_grace_bd') }) {
    if (!notice || !notice.end) return new Date(judgeAt);
    const j = +new Date(judgeAt);
    if (j < +new Date(notice.start) || j > +new Date(notice.end)) return new Date(judgeAt);
    return new Date(Math.max(j, +endOfDay(addBusinessDays(notice.end, bd))));
  }
  /** 송장이 없고 판정 시각을 넘겼으면 출고 지연 — 일반 상품·추가 구성품은 [바로 취소](무단 지연 기록), 맞춤 제작은 [취소 요청](DELAY_CANCEL).
   *  notice = { start, end }(본사 일괄 공지)를 주면 기간 안에는 판정하지 않고, 끝난 뒤는 afterNotice 시각으로. 발주 확인 전(PAID)도 같음(2026-10-17 ㉑) */
  function isOverdue({ promisedAt, now, shipped = false, notice = null }) {
    if (shipped || inNotice(now, notice)) return false;
    return +new Date(now) > +afterNotice({ judgeAt: overdueAt(promisedAt), notice });
  }
  /** [인쇄 가능] 확인 기한(D-PRD-02 · 2026-10-16 D47 · 2026-10-17 D66·D67): 인쇄 패키지를 전달한 때(HANDED_OFF) + production.print_check_bd 영업일.
   *  다시 전달한 것으로 보는 때(반려 수정·이전 확정본 복원 · 제작 파트너 변경 제안을 거둠 · 생산 보류가 철회·기각으로 풀림 · 정지·판매 중지가 풀림)에는
   *  그 시각을 handedAt으로 넘겨 새로 셈. 생산 보류·정지 중에는 리마인드·지연 알림을 보내지 않음(호출하는 쪽) */
  function printDue(handedAt, bd = Policy.get('production.print_check_bd')) { return addBusinessDays(handedAt, bd); }
  function designFeeText(d) {
    if (d.type !== 'CUSTOM') return '템플릿·자체 파일·재주문은 디자인비 없음';
    if (d.reason === 'threshold') return `맞춤 품목 ${won(d.basis)} → 무료(기준 ${won(Policy.get('design.free_threshold'))})`;
    if (d.reason === 'voucher') return '멤버십 무료 이용권 사용';
    if (d.reason === 'locked') return '결제 때 정한 디자인비 유지';
    return `맞춤 품목 ${won(d.shortfall)} 더 담으면 디자인비 무료`;
  }

  /* ───────────── 취소·부분 취소 환불 (C-PAY-02, 2026-10-16 D53) ───────────── */
  /** 항목의 결제 금액(결제 스냅샷의 줄 결제 금액) = 파트너 할인·본사 상품 할인 쿠폰 안분 뒤 상품 대금 + 판비 */
  const linePaid = (l) => l.afterPartner + l.plateAfterPartner - l.hqAlloc;
  /** 맞춤 항목의 디자인비 몫(품목별 — 첫 품목 design.fee, 추가 품목 design.multi_item_fee, 디자인비 쿠폰 안분을 뺀 낸 금액).
   *  50만원 무료는 0원, 멤버십 이용권은 첫 품목만 0원(추가 품목은 그대로 냄, D60) */
  function designShare(designFees, id) {
    const d = designFees.find((x) => x.itemIds.includes(id));
    if (!d || d.type !== 'CUSTOM') return 0;
    const i = d.itemIds.indexOf(id);
    const list = i === 0 ? Policy.get('design.fee') : Policy.get('design.multi_item_fee');
    if (d.reason === 'paid') return list - (d.couponAlloc[i] || 0);
    if (d.reason === 'voucher') return i === 0 ? 0 : list;
    if (d.reason === 'locked') return d.itemCount ? Math.floor(d.fee / d.itemCount) : 0;
    return 0;
  }
  /**
   * 취소·반품하는 항목에 낸 금액을 그대로 돌려줍니다. 남은 항목은 다시 계산하지 않습니다(구간 단가·쿠폰 최소 주문·조건부 무료배송·50만원 무료를 다시 보지 않고 할인을 회수하지 않음).
   * input = 결제 시점 스냅샷(결제 때 수량 그대로), paid = { pg, points }, refunded = { pg, points }
   * cancel = [{ id, qty? }] (qty 없으면 남은 수량 전부) — 예전처럼 cancelIds = [id]도 받음
   * alreadyCanceled = { [id]: 이미 취소·반품한 수량 }, deduction = 공제액(디자인 단계 공제·판비 공제·고객 부담 반품 배송비)
   * mode = 'before_ship'(출고 전 취소: 남은 수량의 구간 단가가 바뀌면 막음 — 전체 취소 후 재주문 안내) | 'return'(반품: 막지 않음)
   * restoreDesignCoupon = 디자인비 쿠폰을 쓴 묶음이 모두 취소될 때 첫 시안 전이라 쿠폰을 돌려줄지(디자인 단계 규칙은 호출하는 쪽이 정함)
   * fault = 반품이 파트너 귀책인지(불량·오배송·표시와 다름·늦게 받음, 중재에서 파트너 귀책으로 뒤집힌 것 포함, 2026-10-17 D70)
   * keptBefore = 앞선 취소·반품에서 돌려주지 않고 남긴 금액 합(앞선 결과의 kept를 더해 넘김) — 마지막 건의 잔액 정리에서 다시 돌려주지 않게
   * 처음 낸 배송비(D70): 출고 전에 묶음을 모두 취소했을 때, 또는 묶음에 남는 항목이 없게 되는 반품이 파트너 귀책일 때만 돌려줌(앞선 반품 사유와 상관없이).
   *   고객 사정 반품이면 돌려주지 않고 shipKept에 담음(파트너 몫 — 마지막 '클레임 완료' 정산 이벤트 +). 반품 순서와 상관없이 같은 금액
   * → { blocked, reason?, last, refund, pointRefund, pgRefund, itemsRefund, designRefund, shipRefund, shipKept, shipKeptLines, kept, deduction, lines, couponsRestored, shortfall?, balance, remainingTotal }
   */
  function partialCancel({ input, paid, refunded = { pg: 0, points: 0 }, cancel, cancelIds, alreadyCanceled = {}, deduction = 0, mode = 'before_ship', restoreDesignCoupon = false, fault = false, keptBefore = 0 }) {
    const original = calcOrder(input);
    const req = (cancel || (cancelIds || []).map((id) => ({ id }))).map((c) => (typeof c === 'string' ? { id: c } : c));
    const balPoints = paid.points - refunded.points;
    const balPg = paid.pg - refunded.pg;
    const balance = balPoints + balPg;
    const before = (id) => alreadyCanceled[id] || 0;
    const lines = []; const blockedBy = [];
    req.forEach(({ id, qty }) => {
      const l = original.lines.find((x) => x.id === id);
      if (!l) return;
      const left = l.qty - before(id);
      const q = qty == null ? left : Math.min(qty, left);
      if (q <= 0) return;
      const all = q >= left;
      const it = (input.items || []).find((x) => x.id === id);
      // 출고 전 부분 취소로 남은 수량의 구간 단가가 바뀌면 막음(같은 구간이면 그대로) — 반품은 막지 않음
      if (!all && mode === 'before_ship' && it && it.tiers && !l.addonOf && tierPrice(it.tiers, left) !== tierPrice(it.tiers, left - q)) blockedBy.push({ id, left, after: left - q });
      const paidAll = linePaid(l);
      const gone = Math.floor((paidAll * before(id)) / l.qty);
      const amount = all ? paidAll - gone : Math.floor((paidAll * q) / l.qty); // 끝전은 남는 항목에 — 마지막 수량 때 함께
      lines.push({ id, qty: q, all, amount, designShare: all ? designShare(original.designFees, id) : 0 }); // 품목 디자인비 몫은 그 품목의 마지막 수량이 빠질 때
    });
    if (blockedBy.length) return { blocked: true, reason: 'TIER_CHANGE', blockedBy, balance, refund: 0, pointRefund: 0, pgRefund: 0, lines };
    const goneAfter = (id) => before(id) + (lines.find((x) => x.id === id && x.all) ? original.lines.find((x) => x.id === id).qty : 0);
    const fullyGone = (l) => goneAfter(l.id) >= l.qty;
    const fullyGoneBefore = (l) => before(l.id) >= l.qty;
    const remaining = original.lines.filter((l) => !fullyGone(l));
    // 배송비: 다시 계산하지 않음. 묶음에 남는 항목이 없게 되면 — 출고 전 취소·파트너 귀책 반품은 낸 배송비를 돌려주고, 고객 사정 반품은 남김(D70. 반품 배송비는 C-PRICE-03)
    let shipRefund = 0; const couponsRestored = []; const shipKeptLines = [];
    original.shippingLines.forEach((s) => {
      const gl = original.lines.filter((l) => l.shipKey === s.shipKey);
      if (gl.every(fullyGone) && !gl.every(fullyGoneBefore)) {
        if (mode === 'before_ship' || fault) shipRefund += s.fee;
        else if (s.fee > 0) shipKeptLines.push({ shipKey: s.shipKey, fee: s.fee });
        if (s.coupon > 0) couponsRestored.push({ kind: 'ship', shipKey: s.shipKey, name: (input.shipCoupons || {})[s.shipKey] ? input.shipCoupons[s.shipKey].name : '배송비 쿠폰' });
      }
    });
    const shipKept = shipKeptLines.reduce((a, x) => a + x.fee, 0);
    // 쿠폰: 그 항목에만 걸린 쿠폰은 돌려주고, 여러 항목에 나눠 걸린 쿠폰은 걸린 항목이 모두 취소·반품될 때 돌려줌(최소 주문이 깨져도 회수 안 함)
    const covered = (pred) => original.lines.filter(pred);
    const hqCov = covered((l) => l.hqAlloc > 0);
    if (hqCov.length && hqCov.every(fullyGone) && !hqCov.every(fullyGoneBefore)) couponsRestored.push({ kind: 'hq', name: input.hqCoupon.name });
    original.partnerCouponLines.forEach((pc) => {
      const cov = covered((l) => l.partnerId === pc.partnerId && (l.partnerCouponDisc + l.platePartnerCouponDisc) > 0);
      if (cov.length && cov.every(fullyGone) && !cov.every(fullyGoneBefore)) couponsRestored.push({ kind: 'partner', partnerId: pc.partnerId, name: pc.name });
    });
    const dcg = original.totals.designCouponGroup;
    if (dcg && restoreDesignCoupon) {
      const cov = covered((l) => l.designGroup === dcg);
      if (cov.every(fullyGone) && !cov.every(fullyGoneBefore)) couponsRestored.push({ kind: 'design', name: input.designCoupon.name });
    }
    const itemsRefund = lines.reduce((a, x) => a + x.amount, 0);
    const designRefund = lines.reduce((a, x) => a + x.designShare, 0);
    const base = { blocked: false, balance, itemsRefund, designRefund, shipRefund, shipKept, shipKeptLines, kept: deduction + shipKept, deduction, lines, couponsRestored };
    if (remaining.length === 0) { // 남은 항목이 없는 마지막 취소·반품: 끝전이 남지 않게 잔액으로 정리하되, 이번 공제·돌려주지 않는 처음 배송비·앞서 남긴 금액은 빼고(D70)
      const withheld = deduction + shipKept + keptBefore;
      const net = balance - withheld;
      if (net < 0) return { ...base, last: true, refund: 0, pointRefund: 0, pgRefund: 0, shortfall: -net, remainingTotal: balance };
      const pgRefund = Math.max(0, balPg - withheld);
      return { ...base, last: true, remainingTotal: balance - net, refund: net, pointRefund: net - pgRefund, pgRefund };
    }
    const net = itemsRefund + designRefund + shipRefund - deduction;
    if (net < 0) return { ...base, last: false, refund: 0, pointRefund: 0, pgRefund: 0, shortfall: -net, remainingTotal: balance }; // 고객 부담 반품 배송비가 더 크면 모자란 만큼 추가 결제
    const refund = Math.min(net, balance);
    const pointRefund = balance > 0 ? floor10((refund * balPoints) / balance) : 0;
    return { ...base, last: false, refund, pointRefund, pgRefund: refund - pointRefund, remainingTotal: balance - refund };
  }
  /** 환불 기한(C-PAY-02 · 2026-10-16 D57, 법률 자문 전 초안): 시작(반품은 회수 완료, 취소는 승인·확정) + claim.refund_due_bd 영업일, 그날 끝까지. 시작 때 계산해 저장 */
  function refundDueAt(startAt, bd = Policy.get('claim.refund_due_bd')) {
    return endOfDay(addBusinessDays(startAt, bd));
  }
  /** 지연배상금 = 환불액 × 연 이율 × 지연 일수 ÷ 365, 원 단위 내림. 지연 일수 = 기한 다음 날 ~ 환불을 마친 날(달력일) − 고객 사정으로 늦은 일수 */
  function refundDelayComp({ amount, dueAt, doneAt, excludeDays = 0, rate = Policy.get('claim.refund_delay_rate') }) {
    const day0 = (d) => { const x = new Date(d); return Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()); };
    const days = Math.max(0, Math.round((day0(doneAt) - day0(dueAt)) / DAY) - excludeDays);
    return { days, rate, comp: Math.floor((amount * rate * days) / 36500) };
  }

  /**
   * 취소 단계는 상태가 아니라 기록으로 정함 (C-STATE-03 규칙 · C-PAY-02 예시 2)
   *   BEFORE_PROPOSAL '첫 시안 전달 시각' 기록 없음 → 전액 환불
   *   AFTER_PROPOSAL  기록 있음, 확정 전 → 디자인비 공제 (맞춤형 전환으로 REQUESTED에 돌아가도 기록이 있으면 여기)
   *   APPROVED        확정 뒤 ~ [인쇄 가능] 전, 그리고 확정 후 변경으로 다시 시안 단계가 된 건(afterChange, D18)
   *   PRODUCTION      [인쇄 가능] 뒤 → 고객 사정 취소 불가(불량만 재제작). 생산 지연이면 productionDelay로 DELAY_CANCEL(2026-10-16 D59)
   */
  const DESIGN_CONFIRMED_STATES = ['APPROVED', 'HANDED_OFF', 'PREFLIGHT_REJECTED'];
  const DESIGN_PRODUCTION_STATES = ['IN_PRODUCTION', 'SHIPPED', 'COMPLETED'];
  function designStage({ state, firstProposed = false, afterChange = false }) {
    if (DESIGN_PRODUCTION_STATES.includes(state)) return 'PRODUCTION';
    if (DESIGN_CONFIRMED_STATES.includes(state) || afterChange) return 'APPROVED';
    return firstProposed ? 'AFTER_PROPOSAL' : 'BEFORE_PROPOSAL';
  }
  /**
   * 맞춤 주문 디자인 단계별 취소 (C-PAY-02 예시 2, D-APV-02, 2026-10-14 D1·D18·D19)
   * stage를 직접 주거나, state + firstProposed(첫 시안 기록 유무) + afterChange(확정 후 변경 건)로 정함
   * type: 'CUSTOM' | 'TEMPLATE' | 'OWN_FILE' | 'REORDER'
   * itemsAmount = 상품 대금 + 낸 판비, plateFee = 고객이 낸 판비(판비 줄의 결제 금액 = calcOrder lines[].platePaid, 2026-10-15 D20 · 판비 면제 재주문은 0),
   * plateCost = 파트너가 증빙한 판 제작 실비(증빙 없으면 0) → 판비 공제 = 취소 보상 = min(plateCost, plateFee)
   * claimType: 'CANCEL'(바로 처리) | 'CUSTOM_CANCEL'(확정 후 취소 · 본사 중재 · 기본 승인 · 자동 승인 없음) | 'DELAY_CANCEL'(생산 지연 취소 · 본사 중재 · 공제 없음) | null(취소 불가)
   * productionDelay = [인쇄 가능] 뒤 출고 예정일 다음 영업일까지 송장이 없음(P-ORD-03) → 승인하면 파트너 귀책 전액 환불,
   *   돌려준 디자인비는 파트너 부담(designFeeToPartner — '중재 판정' 정산 이벤트 −, 2026-10-16 D59)
   * freeCustom은 2026-10-16 D54로 쓰지 않음(무료 디자인 39,000원 공제를 없앰 — 넘겨도 무시)
   */
  function designCancel({ type, stage, state, firstProposed = false, afterChange = false, itemsAmount, paidDesignFee = 0, plateFee = 0, plateCost = 0, fixFee = 0, fixStarted = false, productionDelay = false }) {
    const st = stage || designStage({ state, firstProposed, afterChange });
    const total = itemsAmount + paidDesignFee + fixFee;
    if (st === 'PRODUCTION' && productionDelay) return { stage: st, allowed: true, claimType: 'DELAY_CANCEL', mediation: true, deduction: 0, refund: total, total, lines: [], plateToPartner: 0, restoreBenefits: true, designFeeToPartner: paidDesignFee, note: '생산 지연 — 본사가 확인해 승인하면 낸 금액 전부를 돌려드려요.' };
    if (st === 'PRODUCTION') return { stage: st, allowed: false, claimType: null, mediation: false, deduction: 0, refund: 0, total, lines: [], plateToPartner: 0, note: '생산이 시작돼 취소할 수 없어요. 불량이면 재제작을 요청할 수 있어요.' };
    const lines = [];
    let designDeduct = 0;
    if (st !== 'BEFORE_PROPOSAL') {
      // 실제로 낸 디자인비만 공제(디자인비 쿠폰 할인 뒤 금액 — 50만원 무료·멤버십 이용권·디자인비 쿠폰으로 무료였으면 0원, 2026-10-16 D54)
      if (type === 'CUSTOM') designDeduct = paidDesignFee;
      if (type === 'OWN_FILE' && fixStarted) designDeduct = fixFee;
    }
    if (designDeduct) lines.push({ label: type === 'OWN_FILE' ? '이미 시작한 보정 작업비' : '낸 디자인비(쿠폰으로 깎인 몫은 공제 안 함)', amount: designDeduct });
    // 확정 뒤: 판비 0원 재주문만 바로 취소(공제 0원). 판비를 낸 재주문·확정 후 변경 건을 포함한 나머지는 확정 후 취소(본사 중재)
    const reorderFree = type === 'REORDER' && plateFee === 0;
    const custom = st === 'APPROVED' && !reorderFree;
    let plateDeduct = 0;
    if (custom && plateFee > 0 && plateCost > 0) {
      plateDeduct = Math.min(plateCost, plateFee);
      lines.push({ label: `판비 공제 = min(증빙한 판 제작 실비 ${won(plateCost)}, 고객이 낸 판비 ${won(plateFee)})`, amount: plateDeduct });
    }
    const deduction = Math.min(total, designDeduct + plateDeduct); // 공제액은 환불 대상 금액을 넘지 않음
    return { stage: st, allowed: true, claimType: custom ? 'CUSTOM_CANCEL' : 'CANCEL', mediation: custom, defaultApprove: custom, reorderFree, deduction, refund: total - deduction, total, lines,
      plateToPartner: Math.max(0, deduction - designDeduct) }; // '취소 보상' 정산 이벤트(수수료 0%)
  }
  /**
   * 제작 파트너 변경(C-PAY-02 예외 · A-ORD-01, 2026-10-15 D33 · 2026-10-16 D36~D38). 판매 중지·정지·계약 종료로 [인쇄 가능] 전 맞춤 항목을 옮길 때.
   *   choice 'refund'(고객 [전액 환불] 또는 기한 무응답): 파트너 귀책 → 공제 없이 그 항목에 낸 금액 전부(디자인비·판비 포함), 이용권·쿠폰 복원
   *   choice 'agree'(고객 [변경 동의]): 상품 대금 + 판비 합계(할인 전)로 비교(D36). 새 쪽이 더 낮으면
   *     차액 = (원래 합계 − 새 합계) × 원래 결제 비율(상품 대금·판비 줄 결제 금액 ÷ 원래 합계), 원 단위 내림을 부분 환불. 같거나 높으면 0원(더 받지 않음).
   *     정산 기준은 다시 저장(D37): 판매가 = 새 합계, 파트너 부담 할인 0, 요율 = 새 파트너 것. 고객이 낸 금액과의 차이는
   *     플랫폼 부담 할인(settle.platformDisc)으로 구매 확정 때 보전 — 따로 '조정' 이벤트는 없음
   *   붙은 추가 구성품(addonsPaid)은 어느 쪽이든 공제 없이 결제 금액 그대로 환불(D38)
   * oldList = 원래 상품 대금(할인 전), oldPlate = 원래 판비(판비 면제 재주문은 0), newList·newPlate = 새 파트너 상품의 같은 수량·같은 가격 종류 값,
   * oldPaid = 원래 상품 대금·판비 줄 결제 금액, paidTotal = 그 항목에 낸 금액 전부(디자인비·판비 포함), addonsPaid = 붙은 추가 구성품 결제 금액
   * → { refund(그 항목), addonRefund, totalRefund, oldBase, newBase, settle? }
   */
  function partnerChange({ choice, oldList, oldPlate = 0, newList = oldList, newPlate = oldPlate, oldPaid = oldList + oldPlate, paidTotal = oldPaid, addonsPaid = 0 }) {
    const oldBase = oldList + oldPlate; const newBase = newList + newPlate;
    if (choice === 'refund') return { choice, refund: paidTotal, addonRefund: addonsPaid, totalRefund: paidTotal + addonsPaid, deduction: 0, restoreBenefits: true, oldBase, newBase, settle: null };
    const refund = newBase < oldBase && oldBase > 0 ? Math.floor(((oldBase - newBase) * oldPaid) / oldBase) : 0;
    const settle = { sale: newBase, partnerDisc: 0, platformDisc: newBase - (oldPaid - refund) };
    return { choice, refund, addonRefund: addonsPaid, totalRefund: refund + addonsPaid, deduction: 0, restoreBenefits: false, oldBase, newBase, settle };
  }

  /* ───────────── 수수료·정산 (C-STL-01 · C-STL-02) ───────────── */
  /** 최종율 = max(하한, 기준율 − 플랜 인하 − 신규 입점 인하 − 재주문 인하 + 기획전 가산) */
  function finalRate({ base, plan = 'BASIC', newPartner = false, reorder = false, promoAdd = 0 }) {
    const planDisc = plan === 'PRO' ? Policy.get('commission.plan_discount_pro') : plan === 'PREMIUM' ? Policy.get('commission.plan_discount_premium') : 0;
    const newDisc = newPartner ? Policy.get('commission.new_partner_discount') : 0;
    const reDisc = reorder ? Policy.get('commission.reorder_discount') : 0;
    const floor = Policy.get('commission.floor');
    const raw = Math.round((base - planDisc - newDisc - reDisc + promoAdd) * 10) / 10;
    const rate = Math.max(floor, raw);
    return { rate, floored: raw < floor, raw, parts: { base, planDisc, newDisc, reDisc, promoAdd, floor } };
  }
  /** 판매 수수료 = (VAT 포함 판매가 − 파트너 부담 할인) × 최종율, 원 단위 내림. VAT 포함 금액 */
  function commission(amountVatIncl, ratePct) {
    return Math.floor((amountVatIncl * Math.round(ratePct * 10)) / 1000);
  }
  /** 구매 확정 정산 이벤트 = 판매가 − 파트너 부담 할인 − 판매 수수료 + 배송비 정산액 */
  function confirmEvent({ sale, partnerDisc = 0, rate, shipping = 0 }) {
    const base = sale - partnerDisc;
    const fee = commission(base, rate);
    const split = vatSplit(fee);
    return { base, fee, feeSupply: split.supply, feeVat: split.vat, shipping, amount: base - fee + shipping };
  }
  const CHARGE_ORDER = ['DISPUTE', 'PENALTY', 'PLAN', 'AD'];
  const CHARGE_NAME = { DISPUTE: '분쟁 조정', PENALTY: '위약금', PLAN: '플랜료', AD: '광고비' };
  /**
   * 지급액 = Σ 정산 이벤트 + 이월 − 본사 청구(차감 순서: 분쟁 조정 → 위약금 → 플랜료 → 광고비, 같은 종류는 미수금부터)
   * 차감 한도 = 그 주 정산액. 못 뺀 청구는 미수금. 정산액이 0 이하면 지급 0원, 그 값을 이월.
   */
  function payout({ events, carryIn = 0, receivables = [], charges = [] }) {
    const minPayout = Policy.get('settlement.payout_min');
    const eventSum = events.reduce((a, b) => a + b, 0);
    const base = eventSum + carryIn;
    const queue = [];
    for (const t of CHARGE_ORDER) {
      receivables.filter((r) => r.type === t).forEach((r) => queue.push({ ...r, fromReceivable: true }));
      charges.filter((c) => c.type === t).forEach((c) => queue.push({ ...c, fromReceivable: false }));
    }
    if (base <= 0) {
      return { eventSum, carryIn, base, deductions: [], payout: 0, carryOut: base, receivables: queue.map(({ type, amount }) => ({ type, amount })) };
    }
    let remain = base;
    const deductions = []; const nextRecv = [];
    for (const q of queue) {
      const take = Math.min(q.amount, remain);
      remain -= take;
      if (take > 0) deductions.push({ type: q.type, name: CHARGE_NAME[q.type], amount: take, fromReceivable: q.fromReceivable });
      if (take < q.amount) nextRecv.push({ type: q.type, amount: q.amount - take });
    }
    let pay = remain; let carryOut = 0;
    if (pay > 0 && pay < minPayout) { carryOut = pay; pay = 0; }
    return { eventSum, carryIn, base, deductions, payout: pay, carryOut, receivables: nextRecv };
  }

  /* ───────────── 클레임 기한·이의 제기·재제작 정산 (C-STATE-01·02, 2026-10-14 D4·D8·D17) ───────────── */
  /** 이의 제기 가능: 파트너 거부(취소 거부·반품/재제작 거부 — 반품 검수에서 거부된 수량 포함)만, 거부 통지 후 claim.objection_days 안.
   *  확정 후 취소·생산 지연 취소 기각은 본사 중재 결과라 없음 */
  function canObject({ claimType, state, rejectedAt = null, now = null }) {
    if (!['CANCEL_REJECTED', 'RETURN_REJECTED'].includes(state)) return false;
    if (claimType === 'CUSTOM_CANCEL' || claimType === 'DELAY_CANCEL') return false;
    if (rejectedAt && now) return +new Date(now) < +new Date(rejectedAt) + Policy.get('claim.objection_days') * DAY;
    return true;
  }
  /** 불량 반품·재제작 기한: 그 물건을 받은 날부터 3개월(안 날부터 30일은 따로). 교환품·재제작품은 그 물건을 받은 날부터 다시 셈(D17) */
  function defectDeadline(receivedAt) {
    const d = new Date(receivedAt);
    return new Date(d.getFullYear(), d.getMonth() + 3, d.getDate(), d.getHours(), d.getMinutes());
  }
  /** 재제작품 배송 완료 → EXCHANGED(끝 상태). 7일 뒤 구매 확정과 같이 정산하되, 이미 구매 확정·정산된 항목이면 새 정산 이벤트 없음(D4) */
  function remakeSettlement({ settledBefore, deliveredAt }) {
    return { newEvent: !settledBefore, settleAt: new Date(+new Date(deliveredAt) + Policy.get('order.auto_confirm_days') * DAY) };
  }
  /** 끝난 클레임 완료 결과(C-STATE-02, 2026-10-15 D30). 상태는 CLAIM_COMPLETED 하나로 두고 result를 함께 저장해 라벨을 정함.
   *  전이표의 CLAIM_COMPLETED로 가는 줄에 result가 적혀 있음(교환·재제작은 claim_type으로 나눔) */
  const CLAIM_RESULT_LABEL = { REFUNDED: '환불 완료', EXCHANGED: '교환 완료', REMADE: '재제작 완료', REJECTED: '거부 확정', WITHDRAWN: '신청 철회', DISMISSED: '취소 기각' };
  function claimResult(machineId, from, event, claimType = null) {
    const t = eventsFrom(machineId, from).find((x) => x.event === event);
    if (!t || !t.result) return null;
    return (t.resultByType && claimType && t.resultByType[claimType]) || t.result;
  }
  /** 진행 중 고객 라벨은 클레임 유형으로(C-STATE-02, 2026-10-16 맞춤). 반품·교환·재제작은 같은 회수·검수 상태를 쓰므로 */
  const CLAIM_OPEN_LABEL = { CANCEL: '취소 요청 중', CUSTOM_CANCEL: '취소 중재 중', DELAY_CANCEL: '취소 중재 중', RETURN: '반품 진행 중', EXCHANGE: '교환 진행 중', REMAKE: '재제작 진행 중' };
  /** 반품 사유와 귀책(C-STATE-02 · C-PRICE-03). '늦게 받음(출고 지연)'은 약속 출고일(지연 안내 때는 새 예정일)을 넘겨 출고된 일반 상품·추가 구성품만(2026-10-16 D58 ①, 법률 L-61 전 초안) */
  const RETURN_REASONS = [
    { code: 'CHANGE_MIND', label: '단순 변심', fault: 'customer', days: 7, legal: true }, // 받은 날부터 7일은 법정 값이라 키로 두지 않음
    { code: 'DEFECT', label: '불량·오배송·표시와 다름', fault: 'partner', photo: true },
    { code: 'LATE', label: '늦게 받음(출고 지연)', fault: 'partner', get days() { return Policy.get('claim.late_return_days'); }, lateOnly: true }, // 2026-10-17 ㉒ 키
  ];
  /** 늦게 출고됐나: 송장 등록일이 약속 출고일(새 예정일)보다 뒤인 날 */
  function shippedLate({ promisedAt, shippedAt }) {
    const p = new Date(promisedAt); const s = new Date(shippedAt);
    return Date.UTC(s.getFullYear(), s.getMonth(), s.getDate()) > Date.UTC(p.getFullYear(), p.getMonth(), p.getDate());
  }
  const CLAIM_REJECTED_STATES = ['CANCEL_REJECTED', 'RETURN_REJECTED'];
  /** 고객 라벨: 끝났으면 완료 결과 라벨, 거부면 '판매자 거부', 승인 뒤 환불을 기다리는 동안은 '취소 승인'·'반품 승인'(반품 유형만),
   *  그 밖의 진행 중이면 claimType이 있을 때 유형별 라벨(없으면 상태의 customer 라벨) */
  function claimLabel(machineId, state, result = null, claimType = null) {
    if (state === 'CLAIM_COMPLETED' && result) return CLAIM_RESULT_LABEL[result] || result;
    const s = machine(machineId).states[state];
    const approvedWait = state === 'CANCEL_APPROVED' || (state === 'RETURN_APPROVED' && claimType === 'RETURN');
    if (claimType && CLAIM_OPEN_LABEL[claimType] && state !== 'CLAIM_COMPLETED' && !CLAIM_REJECTED_STATES.includes(state) && !approvedWait) return CLAIM_OPEN_LABEL[claimType];
    return s ? s.customer || s.name : state;
  }
  /** 진행 단계 안내(라벨 옆에 붙이는 말): 상태 이름(회수 중·검수 중·교환·재제작품 출고 등). claimType을 주면 승인·출고를 유형 이름으로(교환 승인·재제작품 출고) */
  const CLAIM_STEP_BY_TYPE = {
    EXCHANGE: { RETURN_APPROVED: '교환 승인', EXCHANGE_SHIPPED: '교환품 출고' },
    REMAKE: { RETURN_REQUESTED: '재제작 요청됨', RETURN_INSPECTING: '확정본 대조 검수 중', RETURN_APPROVED: '재제작 승인', RETURN_REJECTED: '판매자 거부', EXCHANGE_SHIPPED: '재제작품 출고' }, // design 페이지 상수를 옮김(2026-10-17)
  };
  function claimStep(machineId, state, claimType = null) {
    const byType = machineId === 'CLAIM_RETURN' && claimType && CLAIM_STEP_BY_TYPE[claimType];
    if (byType && byType[state]) return byType[state];
    const s = machine(machineId).states[state];
    return s ? s.name : state;
  }
  /** 예고 먼저(D-ROOM-07 · C-NOTI-01, B36): 예고를 보낸 지 notify.notice_min_hours가 지난 건만 본 처리 */
  function noticeElapsed(noticedAt, now) {
    return !!noticedAt && +new Date(now) - +new Date(noticedAt) >= Policy.get('notify.notice_min_hours') * HOUR;
  }

  /* ───────────── 멤버십 연간 중도 해지 (C-PAY-03) ───────────── */
  function annualRefund({ daysSincePay, months, extraDays = 0, benefitUsed = false }) {
    const price = Policy.get('membership.price_yearly');
    const monthly = Policy.get('membership.price_monthly');
    if (daysSincePay <= 7 && !benefitUsed) return { refund: price, rule: 'withdraw', usedMonths: 0 };
    const used = months + (extraDays > 0 ? 1 : 0);
    return { refund: Math.max(0, price - monthly * used), rule: 'prorate', usedMonths: used };
  }

  /* ───────────── 연락처·외부 링크 가림 (D-ROOM-06) ───────────── */
  const ALLOW_HOSTS = ['instagram.com', 'naver.me', 'map.naver.com', 'place.map.kakao.com'];
  const MESSENGER_HOSTS = ['open.kakao.com', 'pf.kakao.com', 'qr.kakao.com', 'line.me', 't.me', 'telegram.me', 'wa.me'];
  const TLD = '(?:com|net|org|kr|co|me|io|ly|gl|link|site|shop|app|biz|info|xyz)';
  const RX = {
    messengerId: /(?:카톡|카카오톡|라인|텔레그램|텔레)\s*(?:아이디|ID|id)?\s*[:：]?\s*[A-Za-z0-9._-]{3,}/g,
    email: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    url: new RegExp('(?:https?:\\/\\/)?(?:[a-z0-9-]+\\.)+' + TLD + '(?![a-z0-9-])(?:\\/[^\\s]*)?', 'gi'),
    phone: /(?:\+?82[-\s.]?)?0\d{1,2}[-\s.]?\d{3,4}[-\s.]?\d{4}(?!\d)/g,
    account: /(?<!\d)\d{2,6}-\d{2,6}-\d{2,8}(?:-\d{1,6})?(?!\d)/g,
  };
  function hostOf(u) { return u.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase(); }
  const hostIn = (h, list) => list.some((d) => h === d || h.endsWith('.' + d));
  /**
   * field: 'chat'(대화·핀·추가 설명) | 'print_text'(인쇄 문구·문구 변경 칸) | 'ref_link'(참고 링크 칸)
   * 반환: { text, parts:[{t:'text'|'mask', v, kind?, original?}], hits:[{kind, original}] }
   */
  function mask(text, field = 'chat') {
    const found = [];
    const take = (kind, re, test) => {
      re.lastIndex = 0; let m;
      while ((m = re.exec(text))) {
        const s = m.index, e = s + m[0].length;
        if (found.some((f) => s < f.e && e > f.s)) continue;
        if (test && !test(m[0])) continue;
        found.push({ s, e, kind, original: m[0] });
      }
    };
    take('messenger', RX.messengerId);
    take('messenger', RX.url, (u) => hostIn(hostOf(u), MESSENGER_HOSTS));
    if (field === 'chat') {
      take('email', RX.email);
      take('link', RX.url, (u) => !hostIn(hostOf(u), ALLOW_HOSTS));
      take('phone', RX.phone);
      take('account', RX.account, (a) => { const d = a.replace(/\D/g, '').length; return d >= 10 && d <= 14; });
    }
    found.sort((a, b) => a.s - b.s);
    const parts = []; let at = 0;
    for (const f of found) {
      if (f.s > at) parts.push({ t: 'text', v: text.slice(at, f.s) });
      parts.push({ t: 'mask', v: maskLabel(f), kind: f.kind, original: f.original });
      at = f.e;
    }
    if (at < text.length) parts.push({ t: 'text', v: text.slice(at) });
    return { text: parts.map((p) => p.v).join(''), parts, hits: found.map((f) => ({ kind: f.kind, original: f.original })) };
  }
  function maskLabel(f) {
    if (f.kind === 'phone') { const d = f.original.replace(/\D/g, '').replace(/^82/, '0'); const head = d.startsWith('02') ? '02' : d.slice(0, 3); return `${head}-****-****`; }
    if (f.kind === 'email') return '****@****';
    if (f.kind === 'messenger') return '[메신저 연락처 가림]';
    if (f.kind === 'link') return '[외부 링크 가림]';
    if (f.kind === 'account') return '[계좌번호 가림]';
    return '****';
  }

  /* ───────────── 상태 머신 (C-STATE-01 · C-STATE-02 외) ───────────── */
  const MACHINES = {};
  /**
   * def = { name, states: { CODE: { name, customer?: 고객용 라벨 } }, main: [CODE...], branch: [CODE...], stop?: [CODE...],
   *         transitions: [{ from: CODE|CODE[]|'*', event, to, actor, label }] }
   */
  function define(id, def) { MACHINES[id] = def; return def; }
  function machine(id) { const m = MACHINES[id]; if (!m) throw new Error('UNKNOWN_MACHINE:' + id); return m; }
  function eventsFrom(id, from) {
    return machine(id).transitions.filter((t) => t.from === '*' || t.from === from || (Array.isArray(t.from) && t.from.includes(from)));
  }
  function next(id, from, event) {
    const t = eventsFrom(id, from).find((x) => x.event === event);
    if (!t) { const err = new Error(`INVALID_TRANSITION: ${id} ${from} --${event}-->`); err.code = 'INVALID_TRANSITION'; throw err; }
    return t.to;
  }
  function can(id, from, event) { return eventsFrom(id, from).some((x) => x.event === event); }
  function stateName(id, code) { const s = machine(id).states[code]; return s ? s.name : code; }

  define('ORDER', {
    name: '주문 항목(일반 상품)',
    states: {
      PAYMENT_PENDING: { name: '입금 대기', customer: '입금 대기' },
      PAID: { name: '결제 완료', customer: '결제 완료' },
      ACCEPTED: { name: '발주 확인', customer: '상품 준비 중' },
      SHIPPED: { name: '배송 중', customer: '배송 중' },
      DELIVERED: { name: '배송 완료', customer: '배송 완료' },
      CONFIRMED: { name: '구매 확정', customer: '구매 확정' },
      CANCELED: { name: '취소', customer: '취소 완료' },
      RETURNED: { name: '반품 완료', customer: '반품 완료' },
      EXCHANGED: { name: '교환 완료', customer: '교환 완료' },
    },
    main: ['PAYMENT_PENDING', 'PAID', 'ACCEPTED', 'SHIPPED', 'DELIVERED', 'CONFIRMED'],
    branch: ['CANCELED', 'RETURNED', 'EXCHANGED'],
    stop: ['CANCELED'],
    transitions: [
      { from: 'PAYMENT_PENDING', event: 'deposit', to: 'PAID', actor: 'system', label: '입금 확인(PG 웹훅)' },
      { from: 'PAYMENT_PENDING', event: 'vbank_expire', to: 'CANCELED', actor: 'system', label: '입금 기한 3일 경과' },
      { from: 'PAYMENT_PENDING', event: 'cancel', to: 'CANCELED', actor: 'customer', label: '고객 취소' },
      { from: 'PAID', event: 'accept', to: 'ACCEPTED', actor: 'partner', label: '발주 확인' },
      { from: 'PAID', event: 'parent_printable', to: 'ACCEPTED', actor: 'system', label: '추가 구성품(맞춤 항목에 붙은 것): 본 항목 [인쇄 가능] 때 함께 발주 확인 — 따로 [발주 확인] 없음(2026-10-16 D49)' },
      { from: 'PAID', event: 'cancel', to: 'CANCELED', actor: 'customer', label: '고객 취소(발주 확인 전, 즉시)' },
      { from: ['PAID', 'ACCEPTED'], event: 'stockout_cancel', to: 'CANCELED', actor: 'partner', label: '품절 취소(전액 환불)' },
      { from: 'ACCEPTED', event: 'ship', to: 'SHIPPED', actor: 'partner', label: '송장 등록' },
      { from: 'ACCEPTED', event: 'cancel_approved', to: 'CANCELED', actor: 'partner', label: '취소 요청 승인(1영업일 넘기면 자동)' },
      { from: 'ACCEPTED', event: 'delay_cancel', to: 'CANCELED', actor: 'customer', label: '출고 지연 뒤 고객 [바로 취소] — 지연 안내 뒤, 또는 안내 없이 약속 출고일 다음 영업일까지 송장 없음(무단 지연 기록) · 파트너 승인 없이 즉시, 송장 등록 전까지(2026-10-16 D58)' },
      { from: ['PAID', 'ACCEPTED'], event: 'parent_canceled', to: 'CANCELED', actor: 'system', label: '추가 구성품: 본 상품의 남은 수량이 모두 취소돼 출고 전이라 함께 취소(같은 사유)' },
      { from: ['PAID', 'ACCEPTED'], event: 'partner_change_cancel', to: 'CANCELED', actor: 'system', label: '추가 구성품: 붙은 맞춤 항목의 제작 파트너가 바뀌거나 환불돼 함께 취소 — 공제 없이 결제 금액 그대로 환불(2026-10-16 D38)' },
      { from: 'SHIPPED', event: 'deliver', to: 'DELIVERED', actor: 'system', label: '배송 완료(택배 조회)' },
      { from: 'DELIVERED', event: 'confirm', to: 'CONFIRMED', actor: 'customer', label: '구매 확정(7일 뒤 자동)' },
      { from: 'DELIVERED', event: 'return_done', to: 'RETURNED', actor: 'system', label: '반품 완료' },
      { from: 'DELIVERED', event: 'cancel_objection_return', to: 'RETURNED', actor: 'hq', label: '출고 뒤 취소 이의 인정 → 플랫폼 회수 완료 뒤 파트너 검수 없이 환불(배송 중이었으면 배송 완료 뒤 회수)' },
      { from: 'DELIVERED', event: 'parent_collected', to: 'RETURNED', actor: 'hq', label: '추가 구성품: 본 상품의 출고 뒤 취소 이의 인정 → 같은 취소 클레임으로 함께 회수해 검수 없이 환불(2026-10-16 D39)' },
      { from: 'DELIVERED', event: 'exchange_done', to: 'EXCHANGED', actor: 'system', label: '교환 완료' },
      { from: 'CONFIRMED', event: 'defect_return_done', to: 'RETURNED', actor: 'system', label: '확정 후 불량 반품(다음 정산에서 역분개)' },
      { from: 'EXCHANGED', event: 'defect_return_done', to: 'RETURNED', actor: 'system', label: '교환품 불량 반품(교환품 받은 날부터 3개월·안 날부터 30일)' },
    ],
  });
  /* 맞춤 제작 주문 항목 (C-STATE-01, 2026-10-14 D3·D4·D17·D18·D19 반영) */
  define('ORDER_CUSTOM', {
    name: '주문 항목(맞춤 제작)',
    states: {
      PAID: { name: '결제 완료', customer: '결제 완료' },
      DESIGNING: { name: '디자인 중', customer: '디자인 진행 중' },
      DESIGN_CONFIRMED: { name: '디자인 확정', customer: '디자인 확정' },
      IN_PRODUCTION: { name: '생산 중', customer: '제작 중' },
      SHIPPED: { name: '배송 중', customer: '배송 중' },
      DELIVERED: { name: '배송 완료', customer: '배송 완료' },
      CONFIRMED: { name: '구매 확정', customer: '구매 확정' },
      CANCELED: { name: '취소', customer: '취소 완료' },
      EXCHANGED: { name: '교환·재제작 완료', customer: '교환·재제작 완료' },
      RETURNED: { name: '반품 완료', customer: '반품 완료' },
    },
    main: ['PAID', 'DESIGNING', 'DESIGN_CONFIRMED', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED', 'CONFIRMED'],
    branch: ['CANCELED', 'EXCHANGED', 'RETURNED'],
    stop: ['CANCELED'],
    transitions: [
      { from: 'PAID', event: 'design_created', to: 'DESIGNING', actor: 'system', label: '디자인 요청 자동 생성' },
      { from: 'PAID', event: 'revise_reorder', to: 'DESIGNING', actor: 'system', label: '수정 재주문(이전 확정본 복사 → REVISION)' },
      { from: 'PAID', event: 'reorder', to: 'DESIGN_CONFIRMED', actor: 'system', label: '같은 디자인 재주문(디자인 단계 생략)' },
      { from: 'DESIGNING', event: 'design_approved', to: 'DESIGN_CONFIRMED', actor: 'customer', label: '고객 최종 확정' },
      { from: 'DESIGNING', event: 'cancel', to: 'CANCELED', actor: 'customer', label: '고객 취소(단계별 공제) 또는 30일 무응답(확정 후 변경 건 제외)' },
      { from: 'DESIGNING', event: 'custom_cancel_approved', to: 'CANCELED', actor: 'hq', label: '확정 후 변경 건의 취소 = 확정 후 취소(본사 중재 승인)' },
      { from: 'DESIGNING', event: 'restore', to: 'DESIGN_CONFIRMED', actor: 'hq', label: '확정 후 변경 건 30일 무응답 → 이전 확정본 복원(본사 중재)' },
      { from: 'DESIGN_CONFIRMED', event: 'printable', to: 'IN_PRODUCTION', actor: 'partner', label: '파트너 [인쇄 가능] = 생산 시작(생산 보류 중이면 서버가 막음)' },
      { from: 'DESIGN_CONFIRMED', event: 'change_approved', to: 'DESIGNING', actor: 'hq', label: '확정 후 변경 승인' },
      { from: 'DESIGN_CONFIRMED', event: 'need_reconfirm', to: 'DESIGNING', actor: 'design', label: '인쇄 반려·인쇄용 정리로 고객 재확정 필요' },
      { from: 'DESIGN_CONFIRMED', event: 'reorder_cancel', to: 'CANCELED', actor: 'customer', label: '판비 0원 재주문 고객 취소(생산 전, 공제 0원)' },
      { from: 'DESIGN_CONFIRMED', event: 'custom_cancel_approved', to: 'CANCELED', actor: 'hq', label: '확정 후 취소(본사 중재, 판비를 낸 재주문 포함)' },
      { from: ['DESIGNING', 'DESIGN_CONFIRMED'], event: 'partner_change_refund', to: 'CANCELED', actor: 'customer', label: '제작 파트너 변경 제안에 [전액 환불] 또는 기한 무응답(예고 뒤 24시간) → 디자인비까지 전액 환불' },
      { from: 'IN_PRODUCTION', event: 'ship', to: 'SHIPPED', actor: 'partner', label: '송장 등록' },
      { from: 'IN_PRODUCTION', event: 'delay_cancel_approved', to: 'CANCELED', actor: 'hq', label: '생산 지연 취소(DELAY_CANCEL) 본사 중재 승인 — 출고 예정일 다음 영업일까지 송장 없음 · 파트너 귀책 전액 환불, 인쇄물·판 폐기, 연결 보장 자동 해제(2026-10-16 D59)' },
      { from: 'SHIPPED', event: 'deliver', to: 'DELIVERED', actor: 'system', label: '배송 완료' },
      { from: 'DELIVERED', event: 'confirm', to: 'CONFIRMED', actor: 'customer', label: '구매 확정(7일 뒤 자동)' },
      { from: 'DELIVERED', event: 'delay_cancel_collected', to: 'RETURNED', actor: 'hq', label: '생산 지연 취소 요청 중 출고된 건을 본사가 승인 → 플랫폼 회수 뒤 검수 없이 환불(회수 배송비 파트너, 2026-10-16)' },
      { from: ['DELIVERED', 'CONFIRMED', 'EXCHANGED'], event: 'remake_delivered', to: 'EXCHANGED', actor: 'system', label: '재제작품 배송 완료(7일 뒤 정산, 이미 정산된 항목은 새 정산 없음)' },
      { from: ['DELIVERED', 'CONFIRMED', 'EXCHANGED'], event: 'remake_refund', to: 'RETURNED', actor: 'system', label: '재제작 대신 환불 완료(정산됐으면 다음 주기 역분개)' },
    ],
  });
  define('DESIGN', {
    name: '디자인 요청',
    states: {
      REQUESTED: { name: '요청 접수', customer: '디자이너 배정 대기' },
      ASSIGNED: { name: '배정 완료', customer: '시안 만드는 중' },
      IN_PROGRESS: { name: '시안 작업 중', customer: '시안 만드는 중' },
      PROPOSED: { name: '고객 확인 대기', customer: '시안 확인 필요' },
      REVISION: { name: '수정 요청', customer: '수정 중' },
      ON_HOLD: { name: '보류', customer: '보류 중' },
      APPROVED: { name: '최종 확정', customer: '디자인 확정' },
      HANDED_OFF: { name: '파트너 전달', customer: '제작 준비 중' },
      PREFLIGHT_REJECTED: { name: '인쇄 반려', customer: '제작 준비 중' },
      IN_PRODUCTION: { name: '생산 중', customer: '제작 중' },
      SHIPPED: { name: '출고', customer: '배송 중' },
      COMPLETED: { name: '완료', customer: '완료' },
      CANCELED: { name: '취소', customer: '취소됨' },
      FILE_SUBMITTED: { name: '자체 파일 접수', customer: '파일 검수 중' },
      FILE_REVIEW: { name: '파일 검수', customer: '파일 검수 중' },
      FILE_REJECTED: { name: '파일 반려', customer: '파일 수정 필요' },
    },
    main: ['REQUESTED', 'ASSIGNED', 'IN_PROGRESS', 'PROPOSED', 'APPROVED', 'HANDED_OFF', 'IN_PRODUCTION', 'SHIPPED', 'COMPLETED'],
    branch: ['REVISION', 'ON_HOLD', 'PREFLIGHT_REJECTED', 'CANCELED'],
    stop: ['CANCELED', 'PREFLIGHT_REJECTED'],
    /* C-STATE-03 디자인 요청 상태 전이표(2026-10-14). '고객 답변 대기'·생산 보류·'취소 중재 중'은 상태가 아니라 표시.
       '확정 후 변경 건'(afterChange)도 표시라서 같은 상태에서 갈래가 나뉘는 줄은 label에 적음. 교정쇄 변경(2차)은 프로토타입에서 생략 */
    transitions: [
      // 디자인 작업(템플릿형·맞춤형)
      { from: 'REQUESTED', event: 'assign', to: 'ASSIGNED', actor: 'design', label: '팀장 배정 · 첫 시안 SLA 시작' },
      { from: 'ASSIGNED', event: 'start', to: 'IN_PROGRESS', actor: 'design', label: '담당 디자이너 [작업 시작]' },
      { from: ['IN_PROGRESS', 'REVISION'], event: 'propose', to: 'PROPOSED', actor: 'design', label: '시안·새 버전 등록(처음이면 첫 시안 전달 시각 기록)' },
      { from: 'PROPOSED', event: 'withdraw', to: '(등록 전 상태)', actor: 'design', label: '고객이 보기 전·등록 10분 안 회수(IN_PROGRESS · REVISION으로)' },
      { from: 'PROPOSED', event: 'request_revision', to: 'REVISION', actor: 'customer', label: '고객 [수정 요청] · 수정 횟수 +1' },
      { from: 'REVISION', event: 'revision_withdraw', to: 'PROPOSED', actor: 'customer', label: '접수 10분 안·작업 시작 전 요청 취소(횟수 돌려줌)' },
      { from: 'PROPOSED', event: 'approve', to: 'APPROVED', actor: 'customer', label: '고객 최종 확정(전자 동의)' },
      { from: ['IN_PROGRESS', 'PROPOSED', 'REVISION', 'FILE_REJECTED'], event: 'convert_custom', to: 'REQUESTED', actor: 'customer', label: '맞춤형 전환 결제(템플릿형·자체 파일) · 배정·첫 시안 SLA 다시' },
      // 자체 파일
      { from: 'FILE_SUBMITTED', event: 'assign', to: 'FILE_REVIEW', actor: 'design', label: '검수 담당 배정 · 검수 SLA 영업일 1일' },
      { from: 'FILE_REVIEW', event: 'file_pass', to: 'PROPOSED', actor: 'design', label: '검수 통과(인쇄 미리보기 등록)' },
      { from: 'FILE_REVIEW', event: 'file_reject', to: 'FILE_REJECTED', actor: 'design', label: '검수 반려(사유 + 선택지)' },
      { from: 'FILE_REJECTED', event: 'reupload', to: 'FILE_REVIEW', actor: 'customer', label: '수정 파일 재업로드(무료 재검수 3회)' },
      { from: 'FILE_REJECTED', event: 'fix', to: 'FILE_REVIEW', actor: 'customer', label: '디자인팀 보정 작업 결제(10,000원) · 보정본은 고객이 다시 확정' },
      // 전달·생산·완료
      { from: 'APPROVED', event: 'hand_off', to: 'HANDED_OFF', actor: 'design', label: '인쇄 패키지 [파트너에 전달]' },
      { from: 'APPROVED', event: 'reconfirm', to: 'PROPOSED', actor: 'design', label: '인쇄용 정리본이 눈에 보이게 달라 고객 재확정' },
      { from: 'HANDED_OFF', event: 'printable', to: 'IN_PRODUCTION', actor: 'partner', label: '[인쇄 가능] = 생산 시작(생산 보류 중이면 서버가 거부)' },
      { from: 'HANDED_OFF', event: 'preflight_reject', to: 'PREFLIGHT_REJECTED', actor: 'partner', label: '파트너 [반려]' },
      { from: 'PREFLIGHT_REJECTED', event: 're_hand_off', to: 'HANDED_OFF', actor: 'design', label: '고쳐서 다시 전달(보이는 내용 같음)' },
      { from: 'PREFLIGHT_REJECTED', event: 'need_reconfirm', to: 'PROPOSED', actor: 'design', label: '보이는 내용이 바뀌어 새 버전·고객 재확정' },
      { from: 'PREFLIGHT_REJECTED', event: 'back_to_file', to: 'FILE_REJECTED', actor: 'design', label: '자체 파일은 고객 선택지 흐름으로' },
      { from: 'IN_PRODUCTION', event: 'ship', to: 'SHIPPED', actor: 'partner', label: '송장 등록' },
      { from: 'IN_PRODUCTION', event: 'delay_cancel_approved', to: 'CANCELED', actor: 'hq', label: '생산 지연 취소 중재 승인(공제 없이 전액 환불 · 인쇄물·판 폐기 · 연결 보장 자동 해제, 2026-10-16 D59). 요청 중에는 생산 보류 없이 ‘취소 중재 중’ 표시만' },
      { from: 'SHIPPED', event: 'complete', to: 'COMPLETED', actor: 'system', label: '연결 항목이 모두 구매 확정(반품·분할 취소는 빼고, 재제작 EXCHANGED는 7일 뒤 확정으로 봄). 모두 반품·회수 환불로 빠지면(생산 지연 취소 요청 중 출고된 건의 승인 포함) 마지막 클레임이 끝날 때(2026-10-17)' },
      // 보류(고객 무응답, 예고 뒤 24시간 지나야 본 처리)
      { from: ['PROPOSED', 'FILE_REJECTED', 'IN_PROGRESS', 'REVISION'], event: 'hold', to: 'ON_HOLD', actor: 'system', label: '14일 무응답 보류(보류 전 상태 저장 · SLA 멈춤)' },
      { from: 'ON_HOLD', event: 'resume', to: '(보류 전 상태)', actor: 'customer', label: '고객 응답 또는 [진행 재개]' },
      { from: 'ON_HOLD', event: 'restore', to: 'HANDED_OFF', actor: 'hq', label: '확정 후 변경 건 30일 무응답 → 본사 중재로 이전 확정본 복원' },
      // 확정 후 변경·취소([인쇄 가능] 전)
      { from: ['APPROVED', 'HANDED_OFF', 'PREFLIGHT_REJECTED'], event: 'change_approved', to: 'REVISION', actor: 'hq', label: '확정 후 변경 승인 · 기존 패키지 무효, 수정 1회 차감' },
      { from: ['APPROVED', 'HANDED_OFF', 'PREFLIGHT_REJECTED', 'REVISION', 'PROPOSED', 'ON_HOLD'], event: 'custom_cancel_approved', to: 'CANCELED', actor: 'hq', label: '확정 후 취소 중재 승인(확정 뒤, 또는 확정 후 변경 건)' },
      { from: ['APPROVED', 'HANDED_OFF', 'PREFLIGHT_REJECTED'], event: 'reorder_cancel', to: 'CANCELED', actor: 'customer', label: '판비 0원 재주문 고객 취소(중재 없음, 공제 0원)' },
      // 제작 파트너 변경(2026-10-15 D33). 동의하면 주문 항목은 상태 그대로 파트너·상품만 바뀜
      { from: ['APPROVED', 'HANDED_OFF', 'PREFLIGHT_REJECTED'], event: 'partner_changed', to: 'HANDED_OFF', actor: 'design', label: '제작 파트너 변경 동의 → 확정 디자인 그대로 새 파트너에게 패키지 다시 전달(이전 파트너는 더 못 받음)' },
      { from: ['REQUESTED', 'ASSIGNED', 'IN_PROGRESS', 'PROPOSED', 'REVISION', 'ON_HOLD', 'FILE_SUBMITTED', 'FILE_REVIEW', 'FILE_REJECTED', 'APPROVED', 'HANDED_OFF', 'PREFLIGHT_REJECTED'], event: 'partner_change_refund', to: 'CANCELED', actor: 'customer', label: '제작 파트너 변경 제안에 [전액 환불] 또는 기한 무응답 → 공제 없이 전액 환불' },
      // 확정 전 취소
      { from: ['REQUESTED', 'ASSIGNED', 'IN_PROGRESS', 'PROPOSED', 'REVISION', 'ON_HOLD', 'FILE_SUBMITTED', 'FILE_REVIEW', 'FILE_REJECTED'], event: 'cancel', to: 'CANCELED', actor: 'customer', label: '확정 전 취소(단계별 공제) 또는 30일 무응답(확정 후 변경 건 제외)' },
    ],
  });
  /* 반품·교환·재제작 클레임 (C-STATE-02). claim_type RETURN·EXCHANGE·REMAKE가 같은 상태를 씀.
     이의 제기는 상태가 아니라 '이의 제기됨' 표시(상태 유지 → 본사 중재). 고객 라벨은 '판매자 거부'(2026-10-14) */
  define('CLAIM_RETURN', {
    name: '반품·교환·재제작 클레임',
    states: {
      RETURN_REQUESTED: { name: '반품 신청', customer: '반품 진행 중' },
      EXCHANGE_REQUESTED: { name: '교환 신청', customer: '교환 진행 중' }, // 교환은 여기서 시작해 회수·검수(RETURN_*)를 같이 씀(2026-10-16 S11)
      RETURN_COLLECTING: { name: '회수 중', customer: '반품 진행 중' },
      RETURN_INSPECTING: { name: '검수 중', customer: '반품 진행 중' },
      RETURN_APPROVED: { name: '반품 승인', customer: '반품 승인' },
      CLAIM_COMPLETED: { name: '클레임 완료', customer: '완료' }, // 고객 라벨은 완료 결과로(GC.claim.label, D30)
      RETURN_REJECTED: { name: '반품 거부', customer: '판매자 거부' },
      EXCHANGE_SHIPPED: { name: '교환·재제작품 출고', customer: '다시 보내는 중' },
    },
    main: ['RETURN_REQUESTED', 'RETURN_COLLECTING', 'RETURN_INSPECTING', 'RETURN_APPROVED', 'CLAIM_COMPLETED'],
    branch: ['EXCHANGE_REQUESTED', 'RETURN_REJECTED', 'EXCHANGE_SHIPPED'],
    stop: ['RETURN_REJECTED'],
    transitions: [
      { from: ['RETURN_REQUESTED', 'EXCHANGE_REQUESTED'], event: 'pickup', to: 'RETURN_COLLECTING', actor: 'partner', label: '회수 접수(2영업일 넘기면 플랫폼이 자동 접수 · 교환도 같은 기한)' },
      { from: 'RETURN_REQUESTED', event: 'photo_inspect', to: 'RETURN_INSPECTING', actor: 'partner', label: '재제작: 사진 증빙으로 회수 생략 → 확정본 대조 검수' },
      { from: ['RETURN_REQUESTED', 'EXCHANGE_REQUESTED'], event: 'withdraw', to: 'CLAIM_COMPLETED', actor: 'system', label: '7일 안 미발송 → 자동 철회(고객 철회도 같음)', result: 'WITHDRAWN' },
      { from: 'RETURN_COLLECTING', event: 'collected', to: 'RETURN_INSPECTING', actor: 'system', label: '회수 완료' },
      { from: 'RETURN_INSPECTING', event: 'approve', to: 'RETURN_APPROVED', actor: 'partner', label: '검수 통과(2영업일 넘기면 자동 승인 — 교환은 교환 승인·출고 독촉, 재제작은 환불이 아니라 재제작 승인)' },
      { from: 'RETURN_INSPECTING', event: 'reject', to: 'RETURN_REJECTED', actor: 'partner', label: '검수 불가 · 거부(사유·사진 필수)' },
      { from: 'RETURN_INSPECTING', event: 'partial_approve', to: 'RETURN_APPROVED', actor: 'partner', label: '일부 수량만 통과 — 항목 분할: 멀쩡한 수량 승인(그 수량에 낸 금액 환불), 사용·훼손된 수량은 나뉜 항목으로 RETURN_REJECTED(사유·사진). 금액을 깎는 부분 환불 없음(2026-10-16 D56)' },
      { from: 'RETURN_APPROVED', event: 'refund', to: 'CLAIM_COMPLETED', actor: 'system', label: '환불 완료(재제작은 고객이 환불을 고른 경우, 교환품 출고 2영업일 초과·품절이면 고객 동의 뒤 반품 전환 — claim_type RETURN)', result: 'REFUNDED' },
      { from: 'RETURN_APPROVED', event: 'reship', to: 'EXCHANGE_SHIPPED', actor: 'partner', label: '교환품·재제작품 송장 등록' },
      { from: 'EXCHANGE_SHIPPED', event: 'delivered', to: 'CLAIM_COMPLETED', actor: 'system', label: '배송 완료(주문 항목 EXCHANGED)', result: 'EXCHANGED', resultByType: { REMAKE: 'REMADE' } },
      { from: 'RETURN_REJECTED', event: 'mediation_customer', to: 'RETURN_APPROVED', actor: 'hq', label: '이의 제기 → 본사 중재: 고객 주장 인정(최종)' },
      { from: 'RETURN_REJECTED', event: 'mediation_partner', to: 'CLAIM_COMPLETED', actor: 'hq', label: '이의 제기 → 본사 중재: 파트너 거부 유지(최종)', result: 'REJECTED' },
      { from: 'RETURN_REJECTED', event: 'no_objection', to: 'CLAIM_COMPLETED', actor: 'system', label: '3일 동안 이의 없음 → 거부 확정', result: 'REJECTED' },
    ],
  });
  /* 취소 클레임 (C-STATE-02). claim_type CANCEL(일반) · CUSTOM_CANCEL(확정 후 취소: 자동 승인 없음·본사 중재·기본 승인·이의 제기 없음)
     · DELAY_CANCEL(생산 지연 취소: 자동 승인 없음·본사 중재·공제 없음·생산 계속·이의 제기 없음, 2026-10-16 D59).
     같은 상태 이름을 쓰고 유형에 따라 쓸 수 있는 이벤트가 다름(label에 표시) */
  define('CLAIM_CANCEL', {
    name: '취소 클레임',
    states: {
      CANCEL_REQUESTED: { name: '취소 요청', customer: '취소 요청 중' },
      CANCEL_APPROVED: { name: '취소 승인', customer: '취소 승인' },
      CANCEL_REJECTED: { name: '취소 거부', customer: '판매자 거부' },
      CLAIM_COMPLETED: { name: '클레임 완료', customer: '완료' }, // 고객 라벨은 완료 결과로(GC.claim.label, D30)
    },
    main: ['CANCEL_REQUESTED', 'CANCEL_APPROVED', 'CLAIM_COMPLETED'],
    branch: ['CANCEL_REJECTED'],
    stop: ['CANCEL_REJECTED'],
    transitions: [
      { from: 'CANCEL_REQUESTED', event: 'approve', to: 'CANCEL_APPROVED', actor: 'partner', label: '파트너 취소 승인(CANCEL)' },
      { from: 'CANCEL_REQUESTED', event: 'auto_approve', to: 'CANCEL_APPROVED', actor: 'system', label: '1영업일 미처리 자동 승인(CANCEL · 송장 없는 건만)' },
      { from: 'CANCEL_REQUESTED', event: 'reject', to: 'CANCEL_REJECTED', actor: 'partner', label: '파트너 거부 · 이미 출고(송장 필수) → 반품 안내(CANCEL)' },
      { from: 'CANCEL_REQUESTED', event: 'mediation_approve', to: 'CANCEL_APPROVED', actor: 'hq', label: '중재 승인 — CUSTOM_CANCEL: 기본 승인, 낸 디자인비 + 판 증빙 시 판비 공제 · DELAY_CANCEL: 파트너 귀책, 공제 없이 전액(돌려준 디자인비는 파트너 정산 차감)' },
      { from: 'CANCEL_REQUESTED', event: 'mediation_dismiss', to: 'CLAIM_COMPLETED', actor: 'hq', label: '기각 → 바로 완료(CUSTOM_CANCEL·DELAY_CANCEL · 본사 중재 결과라 이의 제기 없음. DELAY_CANCEL은 출고 독촉·새 예정일 — 그 날도 넘기면 다시 요청 가능)', result: 'DISMISSED' },
      { from: 'CANCEL_REQUESTED', event: 'withdraw', to: 'CLAIM_COMPLETED', actor: 'customer', label: '고객이 요청 철회(중재 결과 전)', result: 'WITHDRAWN' },
      { from: 'CANCEL_APPROVED', event: 'refund', to: 'CLAIM_COMPLETED', actor: 'system', label: '환불 완료', result: 'REFUNDED' },
      { from: 'CANCEL_APPROVED', event: 'collected_refund', to: 'CLAIM_COMPLETED', actor: 'system', label: '출고 뒤 취소 이의 인정 건 · 생산 지연 취소 요청 중 출고된 건의 승인: 플랫폼 회수 완료 뒤 파트너 검수 없이 환불(주문 항목 RETURNED, 회수 배송비 파트너, 2026-10-15 D23 · 2026-10-17)', result: 'REFUNDED' },
      { from: 'CANCEL_REJECTED', event: 'mediation_customer', to: 'CANCEL_APPROVED', actor: 'hq', label: '이의 제기 → 본사 중재: 고객 주장 인정(최종)' },
      { from: 'CANCEL_REJECTED', event: 'mediation_partner', to: 'CLAIM_COMPLETED', actor: 'hq', label: '이의 제기 → 본사 중재: 파트너 거부 유지(최종)', result: 'REJECTED' },
      { from: 'CANCEL_REJECTED', event: 'no_objection', to: 'CLAIM_COMPLETED', actor: 'system', label: '3일 동안 이의 없음 → 거부 확정', result: 'REJECTED' },
    ],
  });
  define('PARTNER_APP', {
    name: '입점 심사',
    states: {
      DRAFT: { name: '작성 중' },
      SUBMITTED: { name: '접수' },
      REVIEWING: { name: 'MD 심사' },
      SAMPLE_CHECK: { name: '샘플 확인' },
      APPROVED: { name: '심사 승인' },
      CONTRACT: { name: '계약 진행' },
      ACTIVE: { name: '판매 가능' },
      SUPPLEMENT: { name: '보완 요청' },
      REJECTED: { name: '반려' },
    },
    main: ['DRAFT', 'SUBMITTED', 'REVIEWING', 'SAMPLE_CHECK', 'APPROVED', 'CONTRACT', 'ACTIVE'],
    branch: ['SUPPLEMENT', 'REJECTED'],
    stop: ['REJECTED'],
    transitions: [
      { from: 'DRAFT', event: 'submit', to: 'SUBMITTED', actor: 'partner', label: '입점 신청 제출' },
      { from: 'SUBMITTED', event: 'start_review', to: 'REVIEWING', actor: 'hq', label: '담당 MD 심사 시작' },
      { from: 'REVIEWING', event: 'request_supplement', to: 'SUPPLEMENT', actor: 'hq', label: '보완 요청(14일 안 응답)' },
      { from: 'SUPPLEMENT', event: 'resubmit', to: 'REVIEWING', actor: 'partner', label: '보완 자료 제출' },
      { from: 'REVIEWING', event: 'to_sample', to: 'SAMPLE_CHECK', actor: 'hq', label: '인쇄 샘플 확인(맞춤 파트너만)' },
      { from: ['REVIEWING', 'SAMPLE_CHECK'], event: 'approve', to: 'APPROVED', actor: 'hq', label: '심사 승인' },
      { from: ['REVIEWING', 'SAMPLE_CHECK', 'SUPPLEMENT'], event: 'reject', to: 'REJECTED', actor: 'hq', label: '반려(30일 뒤 재신청)' },
      { from: 'APPROVED', event: 'send_contract', to: 'CONTRACT', actor: 'hq', label: '전자 계약 발송' },
      { from: 'CONTRACT', event: 'sign', to: 'ACTIVE', actor: 'partner', label: '전자 서명 → 계정 생성' },
    ],
  });
  define('PRODUCT', {
    name: '상품 판매 상태',
    states: {
      DRAFT: { name: '임시 저장' }, IN_REVIEW: { name: '검수 중' }, APPROVED: { name: '판매 중' },
      NEEDS_FIX: { name: '보완 요청' }, REJECTED: { name: '판매 불가' }, PAUSED: { name: '판매 중지' },
      SUSPENDED: { name: '본사 중지' }, ENDED: { name: '판매 종료' },
    },
    main: ['DRAFT', 'IN_REVIEW', 'APPROVED'],
    branch: ['NEEDS_FIX', 'REJECTED', 'PAUSED', 'SUSPENDED', 'ENDED'],
    stop: ['REJECTED', 'SUSPENDED'],
    transitions: [
      { from: 'DRAFT', event: 'request_review', to: 'IN_REVIEW', actor: 'partner', label: '검수 요청' },
      { from: 'IN_REVIEW', event: 'cancel_review', to: 'DRAFT', actor: 'partner', label: '[검수 요청 취소] → 임시 저장' },
      { from: 'IN_REVIEW', event: 'approve', to: 'APPROVED', actor: 'hq', label: '검수 승인' },
      { from: 'IN_REVIEW', event: 'needs_fix', to: 'NEEDS_FIX', actor: 'hq', label: '보완 요청' },
      { from: 'IN_REVIEW', event: 'reject', to: 'REJECTED', actor: 'hq', label: '판매 불가(최종)' },
      { from: 'NEEDS_FIX', event: 'request_review', to: 'IN_REVIEW', actor: 'partner', label: '고쳐서 다시 요청' },
      { from: 'APPROVED', event: 'pause', to: 'PAUSED', actor: 'partner', label: '파트너 판매 중지' },
      { from: 'PAUSED', event: 'resume', to: 'APPROVED', actor: 'partner', label: '판매 재개' },
      { from: ['APPROVED', 'PAUSED'], event: 'suspend', to: 'SUSPENDED', actor: 'hq', label: '본사 직권 중지' },
      { from: 'SUSPENDED', event: 'unsuspend', to: 'APPROVED', actor: 'hq', label: '본사가 중지 해제' },
      { from: ['APPROVED', 'PAUSED'], event: 'end', to: 'ENDED', actor: 'partner', label: '판매 종료' },
    ],
  });
  /* 판매 중 상품 수정본 (P-PRD-07 revision_status, 2026-10-14 B15). 판매 중 상품은 수정본이 승인될 때까지 이전 내용으로 계속 판매 */
  define('PRODUCT_REVISION', {
    name: '판매 중 상품 수정본',
    states: {
      EDITING: { name: '수정 작성 중' }, IN_REVIEW: { name: '재검수 중' }, APPLIED: { name: '반영됨' },
      NEEDS_FIX: { name: '보완 요청' }, DECLINED: { name: '수정 반려' }, DISCARDED: { name: '수정 취소' },
    },
    main: ['EDITING', 'IN_REVIEW', 'APPLIED'],
    branch: ['NEEDS_FIX', 'DECLINED', 'DISCARDED'],
    stop: ['DECLINED'],
    transitions: [
      { from: 'EDITING', event: 'request_review', to: 'IN_REVIEW', actor: 'partner', label: '재검수 요청(상품당 열린 수정본 하나)' },
      { from: 'IN_REVIEW', event: 'apply', to: 'APPLIED', actor: 'hq', label: '본사 승인 → 판매 화면에 반영' },
      { from: 'IN_REVIEW', event: 'needs_fix', to: 'NEEDS_FIX', actor: 'hq', label: '보완 요청' },
      { from: 'IN_REVIEW', event: 'decline', to: 'DECLINED', actor: 'hq', label: '[수정 반려] · 이전 내용으로 계속 판매' },
      { from: 'NEEDS_FIX', event: 'request_review', to: 'IN_REVIEW', actor: 'partner', label: '고쳐서 다시 요청' },
      // 2026-10-15 D27: 수정본 버리기·판매 종료
      { from: 'IN_REVIEW', event: 'cancel_review', to: 'EDITING', actor: 'partner', label: '[검수 요청 취소] → 수정 중으로' },
      { from: ['EDITING', 'NEEDS_FIX'], event: 'discard', to: 'DISCARDED', actor: 'partner', label: '[수정본 버리기] · 판매 중 상품은 이전 승인 내용 그대로, 기록은 남음' },
      { from: ['EDITING', 'IN_REVIEW', 'NEEDS_FIX'], event: 'product_ended', to: 'DISCARDED', actor: 'system', label: '상품 판매 종료로 함께 닫음(사유 ‘판매 종료’ · 본사 직권 중지 중에는 그대로)' },
    ],
  });
  /* 정산서 상태(C-STL-02). 정산 쪽은 늘 '정산 보류·정산 확정'으로 적음(2026-10-14 B16).
     지급 결과를 모르는 '확인 중'은 정산 상태가 아니라 지급 요청 표시(B33) */
  define('SETTLEMENT', {
    name: '주간 정산',
    states: {
      SCHEDULED: { name: '정산 예정' }, ON_HOLD: { name: '정산 보류' }, CONFIRMED: { name: '정산 확정' }, PAID_OUT: { name: '지급 완료' },
    },
    main: ['SCHEDULED', 'CONFIRMED', 'PAID_OUT'],
    branch: ['ON_HOLD'],
    stop: [],
    transitions: [
      { from: 'SCHEDULED', event: 'hold', to: 'ON_HOLD', actor: 'hq', label: '정산 보류(사유 코드)' },
      { from: 'ON_HOLD', event: 'release', to: 'SCHEDULED', actor: 'hq', label: '정산 보류 해제(확정 전 보류 — 다시 검증·확정)' },
      { from: 'ON_HOLD', event: 'release_confirmed', to: 'CONFIRMED', actor: 'hq', label: '지급 실패·장애 보류 해제 → 확정 금액 그대로 다음 지급 목록(A-STL-02)' },
      { from: 'SCHEDULED', event: 'confirm', to: 'CONFIRMED', actor: 'hq', label: '정산 확정(수~목)' },
      { from: 'CONFIRMED', event: 'payout', to: 'PAID_OUT', actor: 'system', label: '지급대행 실행(금요일)' },
      { from: 'CONFIRMED', event: 'payout_fail', to: 'ON_HOLD', actor: 'system', label: '지급 실패(계좌 오류 등) → 정산 보류' },
    ],
  });

  return {
    Policy, won, signedWon, num, floor10, fmtDate, fmtTime, DAY, HOUR, addBusinessDays, addBusinessHours, isBizDay, vatSplit,
    price: { tierPrice, nextTier, applyInstantUnit, allocate, couponDiscount, calcOrder, bizTiers, pickTiers, bizOptionExtra, bizErrors, bizInversion, BIZ_INVERSION_MSG, listPrice, plateInstantDisc, designCouponDiscount, optionExtraRange, priceChangeAlert, priceChangeCheck },
    refund: { partialCancel, designCancel, designStage, partnerChange, linePaid, designShare, dueAt: refundDueAt, delayComp: refundDelayComp },
    order: { addonCascade, overdueAt, isOverdue, inNotice, afterNotice },
    production: { printDue },
    settle: { finalRate, commission, confirmEvent, payout, CHARGE_NAME },
    claim: { canObject, defectDeadline, remakeSettlement, RESULT_LABEL: CLAIM_RESULT_LABEL, OPEN_LABEL: CLAIM_OPEN_LABEL, RETURN_REASONS, shippedLate, result: claimResult, label: claimLabel, step: claimStep },
    notice: { elapsed: noticeElapsed },
    membership: { annualRefund },
    mask,
    sm: { define, machine, eventsFrom, next, can, stateName, MACHINES },
  };
});
