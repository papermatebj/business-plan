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
    // 공통 · 보안 (2026-10-15 S8 추가 — 관리자·파트너 같은 규칙, C-SEC-01)
    { key: 'security.password_min_length', def: 10, unit: '자', group: '공통 · 보안', label: '관리자·파트너 비밀번호 최소 길이(영문·숫자·특수문자 3종)' },
    { key: 'security.login_fail_lock', def: 5, unit: '회', group: '공통 · 보안', label: '비밀번호 연속 실패 시 계정 잠금(잠기면 대표자에게 알림)' },
    { key: 'security.idle_logout_minutes', def: 30, unit: '분', group: '공통 · 보안', label: '쓰지 않으면 자동 로그아웃(관리자 화면·파트너 센터)' },
    // 수수료·파트너
    { key: 'commission.default_rate', def: 10, unit: '%', group: '수수료·파트너', label: '카테고리 요율(일반) 기본값' },
    { key: 'commission.custom_rate', def: 13, unit: '%', group: '수수료·파트너', label: '카테고리 요율(맞춤) 기본값' },
    { key: 'commission.plan_discount_pro', def: 1, unit: '%p', group: '수수료·파트너', label: '프로 플랜 수수료 인하', phase: '2차' },
    { key: 'commission.plan_discount_premium', def: 2, unit: '%p', group: '수수료·파트너', label: '프리미엄 플랜 수수료 인하', phase: '2차' },
    { key: 'commission.new_partner_discount', def: 2, unit: '%p', group: '수수료·파트너', label: '신규 입점 인하(3개월)' },
    { key: 'commission.reorder_discount', def: 3, unit: '%p', group: '수수료·파트너', label: '같은 판 재주문 인하' },
    { key: 'commission.floor', def: 5, unit: '%', group: '수수료·파트너', label: '최종 요율 하한' },
    { key: 'partner.reapply_days', def: 30, unit: '일', group: '수수료·파트너', label: '입점 반려 후 재신청 제한' },
    { key: 'partner.supplement_days', def: 14, unit: '일', group: '수수료·파트너', label: '보완 요청 응답 기한' },
    { key: 'partner.non_circumvent_months', def: 12, unit: '개월', group: '수수료·파트너', label: '계약 종료 후 직거래 금지 기간', draft: true },
    { key: 'partner.circumvent_penalty_min', def: 500000, unit: '원', group: '수수료·파트너', label: '직거래 위약금 최소액(수수료율×3배)', draft: true },
    { key: 'product.detail_image_max', def: 60, unit: '장', group: '수수료·파트너', label: '상품 상세 설명 이미지 최대 장수' },
    { key: 'product.addon_max', def: 20, unit: '개', group: '수수료·파트너', label: '상품 하나의 추가 구성품 최대 개수' },
    // 할인·쿠폰
    { key: 'promo.instant_discount_max', def: 70, unit: '%', group: '할인·쿠폰', label: '파트너 즉시 할인율 상한' },
    { key: 'promo.instant_discount_max_days', def: 90, unit: '일', group: '할인·쿠폰', label: '즉시 할인 한 건의 기간 최대' },
    { key: 'promo.instant_discount_max_targets', def: 500, unit: '개', group: '할인·쿠폰', label: '즉시 할인 한 건의 대상 상품 최대' },
    { key: 'promo.list_price_lookback_days', def: 20, unit: '일', group: '할인·쿠폰', label: '할인 전 가격 기준 기간' },
    { key: 'product.biz_price_rate_max', def: 50, unit: '%', group: '할인·쿠폰', label: '사업자 전용가 할인율 상한' },
    // 주문·클레임
    { key: 'order.auto_confirm_days', def: 7, unit: '일', group: '주문·클레임', label: '배송 완료 후 자동 구매 확정' },
    { key: 'payment.vbank_due_days', def: 3, unit: '일', group: '주문·클레임', label: '가상계좌 입금 기한' },
    { key: 'claim.cancel_auto_approve_bd', def: 1, unit: '영업일', group: '주문·클레임', label: '취소 요청 미처리 시 자동 승인' },
    { key: 'claim.return_ship_days', def: 7, unit: '일', group: '주문·클레임', label: '반품 발송 안 하면 자동 철회' },
    { key: 'claim.inspect_bd', def: 2, unit: '영업일', group: '주문·클레임', label: '회수 후 검수 기한(넘기면 자동 승인)' },
    { key: 'claim.objection_days', def: 3, unit: '일', group: '주문·클레임', label: '파트너 거부 후 이의 제기 기한' },
    { key: 'claim.tolerance', def: '수량 ±3% / 위치 ±2mm', unit: '', text: true, group: '주문·클레임', label: '불량 판정 허용 오차(상품마다 더 엄격하게만, 확정 때 동의)' },
    { key: 'order.partner_change_reply_days', def: 7, unit: '일', group: '주문·클레임', label: '제작 파트너 변경 제안에 답할 기한(무응답이면 전액 환불)' },
    // 정산
    { key: 'settlement.payout_min', def: 1000, unit: '원', group: '정산', label: '이 금액 미만이면 다음 주기로 이월' },
    { key: 'settlement.account_change_hold_hours', def: 24, unit: '시간', group: '정산', label: '정산 계좌 변경 후 첫 지급 보류' },
    { key: 'settlement.receivable_limit', def: 300000, unit: '원', group: '정산', label: '미수금 청구서 발행 기준' },
    { key: 'settlement.final_holdback', def: 30, unit: '%', group: '정산', label: '계약 종료 파트너 최종 정산 유보(90일)' },
    // 디자인·파일
    { key: 'design.fee', def: 39000, unit: '원', group: '디자인', label: '맞춤 디자인비(VAT 포함)' },
    { key: 'design.multi_item_fee', def: 19000, unit: '원', group: '디자인', label: '같은 콘셉트 추가 품목 디자인비' },
    { key: 'design.free_threshold', def: 500000, unit: '원', group: '디자인', label: '맞춤 디자인비 무료 기준 금액' },
    { key: 'design.extra_revision_fee', def: 10000, unit: '원', group: '디자인', label: '추가 수정(회당)' },
    { key: 'design.source_file_fee', def: 30000, unit: '원', group: '디자인', label: '원본 AI 파일' },
    { key: 'design.own_file_fix_fee', def: 10000, unit: '원', group: '디자인', label: '자체 파일 보정 작업' },
    { key: 'design.free_revisions_custom', def: 3, unit: '회', group: '디자인', label: '무료 수정(맞춤형)' },
    { key: 'design.free_revisions_template', def: 2, unit: '회', group: '디자인', label: '무료 수정(템플릿형)' },
    { key: 'design.sla.assign_hours', def: 4, unit: '영업시간', group: '디자인', label: '디자이너 배정 기한' },
    { key: 'design.sla.first_draft_days', def: 2, unit: '영업일', group: '디자인', label: '첫 시안 기한(멤버십 1일)' },
    { key: 'design.sla.revision_days', def: 1, unit: '영업일', group: '디자인', label: '수정본 기한' },
    { key: 'design.no_response_remind_days', def: 3, unit: '일', group: '디자인', label: '고객 무응답 리마인드' },
    { key: 'design.no_response_hold_days', def: 14, unit: '일', group: '디자인', label: '고객 무응답 보류' },
    { key: 'design.no_response_cancel_days', def: 30, unit: '일', group: '디자인', label: '고객 무응답 자동 취소' },
    { key: 'production.plate_keep_months', def: 24, unit: '개월', group: '디자인', label: '판 보관 최소 기간(파트너는 늘리기만)', draft: true },
    { key: 'production.print_check_bd', def: 1, unit: '영업일', group: '디자인', label: '파트너 [인쇄 가능]·[반려] 기한(패키지 받은 뒤)' },
    { key: 'file.scan_timeout_minutes', def: 10, unit: '분', group: '디자인', label: '악성코드 검사 시간 초과(1회 재검사 뒤 격리)' },
    { key: 'file.max_size_chat', def: 100, unit: 'MB', group: '디자인', label: '협의 룸·생산 협의 채널 첨부 한도' },
    { key: 'file.max_size_original', def: 500, unit: 'MB', group: '디자인', label: '인쇄 원본·고객 자체 인쇄 파일·칼선 파일 한도' },
    { key: 'file.max_size_logo', def: 100, unit: 'MB', group: '디자인', label: '고객 로고 파일 한도(1개)' },
    { key: 'file.max_size_image', def: 20, unit: 'MB', group: '디자인', label: '참고 이미지·간판 사진·상품·클레임 사진 장당 한도' },
    // 회원·혜택·알림
    { key: 'member.min_age', def: 19, unit: '세', group: '회원·혜택', label: '가입 가능 나이(만)' },
    { key: 'member.rejoin_block_days', def: 30, unit: '일', group: '회원·혜택', label: '탈퇴 후 재가입 제한' },
    { key: 'member.biz_accounts_max', def: 3, unit: '개', group: '회원·혜택', label: '사업자번호당 인증 가능 계정' },
    { key: 'member.web_keep_login_days', def: 30, unit: '일', group: '회원·혜택', label: '웹 "로그인 유지" 기간' },
    { key: 'member.app_keep_login_days', def: 90, unit: '일', group: '회원·혜택', label: '앱 자동 로그인 최대(마지막 사용부터)' },
    { key: 'membership.price_monthly', def: 9900, unit: '원', group: '회원·혜택', label: '멤버십 월간 요금', phase: '2차' },
    { key: 'membership.price_yearly', def: 99000, unit: '원', group: '회원·혜택', label: '멤버십 연간 요금', phase: '2차' },
    { key: 'membership.free_ship_coupons', def: 4, unit: '장/월', group: '회원·혜택', label: '멤버십 무료배송 쿠폰', phase: '2차' },
    { key: 'membership.free_ship_max', def: 3000, unit: '원', group: '회원·혜택', label: '무료배송 쿠폰 장당 최대', phase: '2차' },
    { key: 'membership.free_ship_min_order', def: 30000, unit: '원', group: '회원·혜택', label: '무료배송 쿠폰 최소 주문', phase: '2차' },
    { key: 'membership.extra_point_rate', def: 2, unit: '%', group: '회원·혜택', label: '멤버십 추가 적립', phase: '2차' },
    { key: 'membership.extra_point_cap', def: 5000, unit: '원/월', group: '회원·혜택', label: '추가 적립 월 한도', phase: '2차' },
    { key: 'notify.ad_daily_max', def: 1, unit: '회', group: '회원·혜택', label: '광고성 메시지 하루 최대' },
    { key: 'notify.ad_weekly_max', def: 3, unit: '회', group: '회원·혜택', label: '광고성 메시지 주 최대' },
    { key: 'notify.ad_send_hours', def: '카카오가 정한 시간(확인 필요)', unit: '', text: true, group: '회원·혜택', label: '카카오 브랜드 메시지 발송 가능 시간' },
    { key: 'notify.room_digest_minutes', def: 10, unit: '분', group: '회원·혜택', label: '협의 룸 알림톡 묶음 단위' },
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
    /* 테스트·예시 계산용: 기본값으로만 계산 */
    useDefaults() { memOverrides = {}; },
  };

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
  /** 디자인비 쿠폰(2026-10-15 D21): 그 디자인 요청의 디자인비에만 바로(안분 없음). type 'free'(전액) | 'amount' | 'rate' */
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
   *   designCoupon?: { name, type:'free'|'amount'|'rate', value?, max?, minOrder?, groupId? },  // 본사 디자인비 쿠폰(1장): 그 디자인 요청 디자인비에만
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
      return { groupId: g.id, type: g.type, basis, listFee, fee, reason, shortfall, itemCount: count, couponDisc: 0 };
    });
    const designFeeTotal = designFees.reduce((a, d) => a + d.fee, 0);

    // ④ 본사 쿠폰(자리마다 1장, D21). 최소 주문 기준 = 파트너 할인 후 상품 금액 합계(판비·추가 구성품 포함, 디자인비 제외)
    const productBases = [...lines.map((l) => l.afterPartner), ...lines.map((l) => l.plateAfterPartner)];
    const productBasis = productBases.reduce((a, b) => a + b, 0);
    // ④-1 상품 할인 쿠폰(장바구니·상품 중 1장): 항목별 금액 비율로 안분(판비 줄도 따로 받음)
    const hq = input.hqCoupon || null;
    const hqDisc = couponDiscount(hq, productBasis);
    if (hqDisc > 0) {
      const alloc = allocate(hqDisc, productBases);
      lines.forEach((l, i) => { l.plateHqAlloc = alloc[lines.length + i]; l.hqAlloc = alloc[i] + l.plateHqAlloc; });
    }
    // ④-2 디자인비 쿠폰(1장): 50만원 무료·멤버십 이용권으로 이미 0원이면 쓰지 않음(쿠폰함에 남김)
    const dc = input.designCoupon || null;
    let designCouponDisc = 0; let designCouponGroup = null;
    if (dc && (!dc.minOrder || productBasis >= dc.minOrder)) {
      const target = designFees.find((d) => (dc.groupId ? d.groupId === dc.groupId : true) && d.fee > 0);
      if (target) { target.couponDisc = designCouponDiscount(dc, target.fee); designCouponDisc = target.couponDisc; designCouponGroup = target.groupId; }
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
  /** 추가 구성품 함께 취소(C-STATE-01, 2026-10-15 D24②): 본 상품이 취소되면 아직 출고 전인 붙은 추가 구성품도 같이 취소. 출고된 것은 반품으로
   * items = [{ id, addonOf? }], cancelIds = 취소할 본 상품 id, shippedIds = 이미 출고된 항목 id → { cascade:[id], toReturn:[id] } */
  function addonCascade(items, cancelIds, shippedIds = []) {
    const kids = (items || []).filter((it) => it.addonOf && cancelIds.includes(it.addonOf) && !cancelIds.includes(it.id));
    return { cascade: kids.filter((k) => !shippedIds.includes(k.id)).map((k) => k.id), toReturn: kids.filter((k) => shippedIds.includes(k.id)).map((k) => k.id) };
  }
  function designFeeText(d) {
    if (d.type !== 'CUSTOM') return '템플릿·자체 파일·재주문은 디자인비 없음';
    if (d.reason === 'threshold') return `맞춤 품목 ${won(d.basis)} → 무료(기준 ${won(Policy.get('design.free_threshold'))})`;
    if (d.reason === 'voucher') return '멤버십 무료 이용권 사용';
    if (d.reason === 'locked') return '결제 때 정한 디자인비 유지';
    return `맞춤 품목 ${won(d.shortfall)} 더 담으면 디자인비 무료`;
  }

  /* ───────────── 취소·부분 취소 환불 (C-PAY-02) ───────────── */
  /**
   * 결제 시점 스냅샷(input)으로 남은 항목을 다시 계산하고, 결제 잔액과의 차이를 환불합니다.
   * paid = { pg, points }, refunded = { pg, points }, cancelIds = [itemId], deduction = 공제액
   * mode = 'before_ship'(출고 전 취소: 0원 이하면 막음) | 'return'(반품: 0원 환불 + 차액 동의)
   */
  function partialCancel({ input, paid, refunded = { pg: 0, points: 0 }, cancelIds, deduction = 0, mode = 'before_ship' }) {
    const original = calcOrder(input);
    const remainingItems = input.items.filter((it) => !cancelIds.includes(it.id));
    const balPoints = paid.points - refunded.points;
    const balPg = paid.pg - refunded.pg;
    const balance = balPoints + balPg;
    if (remainingItems.length === 0) {
      const refund = Math.max(0, balance - deduction);
      const pgRefund = Math.max(0, balPg - deduction);
      return { last: true, remainingTotal: 0, balance, refund, pointRefund: refund - pgRefund, pgRefund, blocked: false, recalc: null };
    }
    // 디자인비는 부분 취소로 기준 아래가 돼도 다시 받지 않음 → 결제 때 정한 금액을 고정
    const lockedGroups = (input.designGroups || [])
      .filter((g) => remainingItems.some((it) => it.designGroup === g.id))
      .map((g) => ({ ...g, lockedFee: original.designFees.find((d) => d.groupId === g.id).fee }));
    const rest = { ...input, items: remainingItems, designGroups: lockedGroups, points: 0 };
    const recalc = calcOrder(rest);
    const remainingTotal = recalc.totals.customerTotal;
    const refund = balance - remainingTotal - deduction;
    if (refund <= 0) {
      if (mode === 'before_ship') return { blocked: true, reason: 'PARTIAL_CANCEL_BLOCKED', remainingTotal, balance, refund, recalc };
      return { blocked: false, zeroRefund: true, shortfall: -refund, refund: 0, pointRefund: 0, pgRefund: 0, remainingTotal, balance, recalc };
    }
    const pointRefund = balance > 0 ? floor10((refund * balPoints) / balance) : 0;
    return { blocked: false, remainingTotal, balance, refund, pointRefund, pgRefund: refund - pointRefund, recalc };
  }

  /**
   * 취소 단계는 상태가 아니라 기록으로 정함 (C-STATE-03 규칙 · C-PAY-02 예시 2)
   *   BEFORE_PROPOSAL '첫 시안 전달 시각' 기록 없음 → 전액 환불
   *   AFTER_PROPOSAL  기록 있음, 확정 전 → 디자인비 공제 (맞춤형 전환으로 REQUESTED에 돌아가도 기록이 있으면 여기)
   *   APPROVED        확정 뒤 ~ [인쇄 가능] 전, 그리고 확정 후 변경으로 다시 시안 단계가 된 건(afterChange, D18)
   *   PRODUCTION      [인쇄 가능] 뒤 → 취소 불가(불량만 재제작)
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
   * claimType: 'CANCEL'(바로 처리) | 'CUSTOM_CANCEL'(확정 후 취소 · 본사 중재 · 자동 승인 없음) | null(취소 불가)
   */
  function designCancel({ type, stage, state, firstProposed = false, afterChange = false, itemsAmount, paidDesignFee = 0, freeCustom = false, plateFee = 0, plateCost = 0, fixFee = 0, fixStarted = false }) {
    const st = stage || designStage({ state, firstProposed, afterChange });
    const total = itemsAmount + paidDesignFee + fixFee;
    if (st === 'PRODUCTION') return { stage: st, allowed: false, claimType: null, mediation: false, deduction: 0, refund: 0, total, lines: [], plateToPartner: 0, note: '생산이 시작돼 취소할 수 없어요. 불량이면 재제작을 요청할 수 있어요.' };
    const lines = [];
    let designDeduct = 0;
    if (st !== 'BEFORE_PROPOSAL') {
      if (type === 'CUSTOM') designDeduct = paidDesignFee > 0 ? paidDesignFee : (freeCustom ? Policy.get('design.fee') : 0);
      if (type === 'OWN_FILE' && fixStarted) designDeduct = fixFee;
    }
    if (designDeduct) lines.push({ label: type === 'OWN_FILE' ? '이미 시작한 보정 작업비' : (paidDesignFee > 0 ? '낸 디자인비' : '무료로 받은 맞춤 디자인비'), amount: designDeduct });
    // 확정 뒤: 판비 0원 재주문만 바로 취소(공제 0원). 판비를 낸 재주문·확정 후 변경 건을 포함한 나머지는 확정 후 취소(본사 중재)
    const reorderFree = type === 'REORDER' && plateFee === 0;
    const custom = st === 'APPROVED' && !reorderFree;
    let plateDeduct = 0;
    if (custom && plateFee > 0 && plateCost > 0) {
      plateDeduct = Math.min(plateCost, plateFee);
      lines.push({ label: `판비 공제 = min(증빙한 판 제작 실비 ${won(plateCost)}, 고객이 낸 판비 ${won(plateFee)})`, amount: plateDeduct });
    }
    const deduction = Math.min(total, designDeduct + plateDeduct); // 공제액은 환불 대상 금액을 넘지 않음
    return { stage: st, allowed: true, claimType: custom ? 'CUSTOM_CANCEL' : 'CANCEL', mediation: custom, reorderFree, deduction, refund: total - deduction, total, lines,
      plateToPartner: Math.max(0, deduction - designDeduct) }; // '취소 보상' 정산 이벤트(수수료 0%)
  }
  /**
   * 제작 파트너 변경(C-PAY-02 예외 · A-ORD-01, 2026-10-15 D33). 판매 중지·정지·계약 종료로 [인쇄 가능] 전 맞춤 항목을 옮길 때.
   *   choice 'refund'(고객 [전액 환불] 또는 기한 무응답): 파트너 귀책 → 공제 없이 그 항목에 낸 금액 전부(디자인비·판비 포함), 이용권·쿠폰 복원
   *   choice 'agree'(고객 [변경 동의]): 새 상품(같은 수량·같은 가격 종류)의 할인 전 금액이 더 낮으면
   *     차액 = (원래 할인 전 금액 − 새 할인 전 금액) × 원래 결제 비율(결제 금액 ÷ 할인 전 금액), 원 단위 내림을 부분 환불.
   *     더 높으면 고객에게 더 받지 않고, 차액은 본사가 '조정' 정산 이벤트로 새 파트너에게 보전(hqAdjust)
   * oldList·newList = 할인 전 상품 금액, oldPaid = 원래 항목 결제 금액, paidTotal = 그 항목에 낸 금액 전부(디자인비·판비 포함)
   */
  function partnerChange({ choice, oldList, newList = oldList, oldPaid = oldList, paidTotal = oldPaid }) {
    if (choice === 'refund') return { choice, refund: paidTotal, deduction: 0, hqAdjust: 0, restoreBenefits: true };
    if (newList < oldList) return { choice, refund: Math.floor(((oldList - newList) * oldPaid) / oldList), deduction: 0, hqAdjust: 0, restoreBenefits: false };
    return { choice, refund: 0, deduction: 0, hqAdjust: newList - oldList, restoreBenefits: false };
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
  /** 이의 제기 가능: 파트너 거부(취소 거부·반품/재제작 거부)만, 거부 통지 후 claim.objection_days 안. 확정 후 취소 기각은 본사 중재 결과라 없음 */
  function canObject({ claimType, state, rejectedAt = null, now = null }) {
    if (!['CANCEL_REJECTED', 'RETURN_REJECTED'].includes(state)) return false;
    if (claimType === 'CUSTOM_CANCEL') return false;
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
  /** 고객 라벨: 끝났으면 완료 결과 라벨, 아니면 상태의 customer 라벨 */
  function claimLabel(machineId, state, result = null) {
    if (state === 'CLAIM_COMPLETED' && result) return CLAIM_RESULT_LABEL[result] || result;
    const s = machine(machineId).states[state];
    return s ? s.customer || s.name : state;
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
      { from: 'PAID', event: 'cancel', to: 'CANCELED', actor: 'customer', label: '고객 취소(발주 확인 전, 즉시)' },
      { from: ['PAID', 'ACCEPTED'], event: 'stockout_cancel', to: 'CANCELED', actor: 'partner', label: '품절 취소(전액 환불)' },
      { from: 'ACCEPTED', event: 'ship', to: 'SHIPPED', actor: 'partner', label: '송장 등록' },
      { from: 'ACCEPTED', event: 'cancel_approved', to: 'CANCELED', actor: 'partner', label: '취소 요청 승인(1영업일 넘기면 자동)' },
      { from: ['PAID', 'ACCEPTED'], event: 'parent_canceled', to: 'CANCELED', actor: 'system', label: '추가 구성품: 본 상품이 취소돼 출고 전이라 함께 취소(같은 사유)' },
      { from: 'SHIPPED', event: 'deliver', to: 'DELIVERED', actor: 'system', label: '배송 완료(택배 조회)' },
      { from: 'DELIVERED', event: 'confirm', to: 'CONFIRMED', actor: 'customer', label: '구매 확정(7일 뒤 자동)' },
      { from: 'DELIVERED', event: 'return_done', to: 'RETURNED', actor: 'system', label: '반품 완료' },
      { from: 'DELIVERED', event: 'cancel_objection_return', to: 'RETURNED', actor: 'hq', label: '출고 뒤 취소 이의 인정 → 플랫폼 회수 완료 뒤 파트너 검수 없이 환불(배송 중이었으면 배송 완료 뒤 회수)' },
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
      { from: 'SHIPPED', event: 'deliver', to: 'DELIVERED', actor: 'system', label: '배송 완료' },
      { from: 'DELIVERED', event: 'confirm', to: 'CONFIRMED', actor: 'customer', label: '구매 확정(7일 뒤 자동)' },
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
      { from: 'SHIPPED', event: 'complete', to: 'COMPLETED', actor: 'system', label: '연결 항목이 모두 구매 확정(반품·분할 취소는 빼고, 재제작 EXCHANGED는 7일 뒤 확정으로 봄)' },
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
    name: '반품·재제작 클레임',
    states: {
      RETURN_REQUESTED: { name: '반품 신청', customer: '반품 진행 중' },
      RETURN_COLLECTING: { name: '회수 중', customer: '반품 진행 중' },
      RETURN_INSPECTING: { name: '검수 중', customer: '반품 진행 중' },
      RETURN_APPROVED: { name: '반품 승인', customer: '반품 승인' },
      CLAIM_COMPLETED: { name: '클레임 완료', customer: '완료' }, // 고객 라벨은 완료 결과로(GC.claim.label, D30)
      RETURN_REJECTED: { name: '반품 거부', customer: '판매자 거부' },
      EXCHANGE_SHIPPED: { name: '교환·재제작품 출고', customer: '다시 보내는 중' },
    },
    main: ['RETURN_REQUESTED', 'RETURN_COLLECTING', 'RETURN_INSPECTING', 'RETURN_APPROVED', 'CLAIM_COMPLETED'],
    branch: ['RETURN_REJECTED', 'EXCHANGE_SHIPPED'],
    stop: ['RETURN_REJECTED'],
    transitions: [
      { from: 'RETURN_REQUESTED', event: 'pickup', to: 'RETURN_COLLECTING', actor: 'partner', label: '회수 접수(2영업일 넘기면 플랫폼이 자동 접수)' },
      { from: 'RETURN_REQUESTED', event: 'photo_inspect', to: 'RETURN_INSPECTING', actor: 'partner', label: '재제작: 사진 증빙으로 회수 생략 → 확정본 대조 검수' },
      { from: 'RETURN_REQUESTED', event: 'withdraw', to: 'CLAIM_COMPLETED', actor: 'system', label: '7일 안 미발송 → 자동 철회(고객 철회도 같음)', result: 'WITHDRAWN' },
      { from: 'RETURN_COLLECTING', event: 'collected', to: 'RETURN_INSPECTING', actor: 'system', label: '회수 완료' },
      { from: 'RETURN_INSPECTING', event: 'approve', to: 'RETURN_APPROVED', actor: 'partner', label: '검수 통과(2영업일 넘기면 자동 승인 — 재제작은 환불이 아니라 재제작 승인)' },
      { from: 'RETURN_INSPECTING', event: 'reject', to: 'RETURN_REJECTED', actor: 'partner', label: '검수 불가 · 거부(사유·사진 필수)' },
      { from: 'RETURN_APPROVED', event: 'refund', to: 'CLAIM_COMPLETED', actor: 'system', label: '환불 완료(재제작은 고객이 환불을 고른 경우, 교환품 품절로 반품 전환 포함)', result: 'REFUNDED' },
      { from: 'RETURN_APPROVED', event: 'reship', to: 'EXCHANGE_SHIPPED', actor: 'partner', label: '교환품·재제작품 송장 등록' },
      { from: 'EXCHANGE_SHIPPED', event: 'delivered', to: 'CLAIM_COMPLETED', actor: 'system', label: '배송 완료(주문 항목 EXCHANGED)', result: 'EXCHANGED', resultByType: { REMAKE: 'REMADE' } },
      { from: 'RETURN_REJECTED', event: 'mediation_customer', to: 'RETURN_APPROVED', actor: 'hq', label: '이의 제기 → 본사 중재: 고객 주장 인정(최종)' },
      { from: 'RETURN_REJECTED', event: 'mediation_partner', to: 'CLAIM_COMPLETED', actor: 'hq', label: '이의 제기 → 본사 중재: 파트너 거부 유지(최종)', result: 'REJECTED' },
      { from: 'RETURN_REJECTED', event: 'no_objection', to: 'CLAIM_COMPLETED', actor: 'system', label: '3일 동안 이의 없음 → 거부 확정', result: 'REJECTED' },
    ],
  });
  /* 취소 클레임 (C-STATE-02). claim_type CANCEL(일반) · CUSTOM_CANCEL(확정 후 취소: 자동 승인 없음·본사 중재·이의 제기 없음).
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
      { from: 'CANCEL_REQUESTED', event: 'mediation_approve', to: 'CANCEL_APPROVED', actor: 'hq', label: '확정 후 취소 중재 승인(CUSTOM_CANCEL · 디자인비 + 판 증빙 시 판비 공제)' },
      { from: 'CANCEL_REQUESTED', event: 'mediation_dismiss', to: 'CLAIM_COMPLETED', actor: 'hq', label: '확정 후 취소 기각 → 바로 완료(CUSTOM_CANCEL · 본사 중재 결과라 이의 제기 없음)', result: 'DISMISSED' },
      { from: 'CANCEL_REQUESTED', event: 'withdraw', to: 'CLAIM_COMPLETED', actor: 'customer', label: '고객이 요청 철회(중재 결과 전)', result: 'WITHDRAWN' },
      { from: 'CANCEL_APPROVED', event: 'refund', to: 'CLAIM_COMPLETED', actor: 'system', label: '환불 완료', result: 'REFUNDED' },
      { from: 'CANCEL_APPROVED', event: 'collected_refund', to: 'CLAIM_COMPLETED', actor: 'system', label: '출고 뒤 취소 이의 인정 건: 플랫폼 회수 완료 뒤 파트너 검수 없이 환불(주문 항목 RETURNED, 2026-10-15 D23)', result: 'REFUNDED' },
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
    price: { tierPrice, nextTier, applyInstantUnit, allocate, couponDiscount, calcOrder, bizTiers, pickTiers, bizOptionExtra, bizErrors, bizInversion, BIZ_INVERSION_MSG, listPrice, plateInstantDisc, designCouponDiscount },
    refund: { partialCancel, designCancel, designStage, partnerChange },
    order: { addonCascade },
    settle: { finalRate, commission, confirmEvent, payout, CHARGE_NAME },
    claim: { canObject, defectDeadline, remakeSettlement, RESULT_LABEL: CLAIM_RESULT_LABEL, result: claimResult, label: claimLabel },
    notice: { elapsed: noticeElapsed },
    membership: { annualRefund },
    mask,
    sm: { define, machine, eventsFrom, next, can, stateName, MACHINES },
  };
});
