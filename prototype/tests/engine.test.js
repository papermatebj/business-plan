// 공통 규칙 엔진 검증 — 기능 명세서 05장 예시 숫자를 그대로 씁니다.
// 실행: node --test prototype/tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const GC = require('../assets/engine.js');

GC.Policy.useDefaults();

// C-PRICE-01 예시 주문: 수저집 10박스(즉시 할인 10%) + 냅킨 2박스(파트너 쿠폰 5,000원)
const SPOON_TIERS = [{ min: 1, price: 12000 }, { min: 5, price: 12000 }, { min: 10, price: 10000 }];
function exampleInput({ withPhase2 = true } = {}) {
  return {
    items: [
      { id: 'spoon', name: '수저집 크라프트', partnerId: 'A', shipKey: 'A-일반', qty: 10, tiers: SPOON_TIERS, instant: { type: 'rate', value: 10 } },
      { id: 'napkin', name: '무형광 냅킨', partnerId: 'A', shipKey: 'A-일반', qty: 2, tiers: [{ min: 1, price: 30000 }, { min: 5, price: 28000 }] },
    ],
    partnerCoupons: withPhase2 ? { A: { name: '냅킨 5,000원', type: 'amount', value: 5000, minOrder: 50000, itemIds: ['napkin'] } } : {},
    hqCoupon: { name: '장바구니 10%', type: 'rate', value: 10, max: 10000, minOrder: 100000 },
    shipping: { 'A-일반': { name: '파트너 A', type: 'conditional', base: 4000, freeOver: 200000 } },
    shipCoupons: withPhase2 ? { 'A-일반': { name: '멤버십 무료배송', max: 3000, minOrder: 30000 } } : {},
    points: withPhase2 ? 2000 : 0,
  };
}

test('TC-01 가격 계산 6단계 — 2차 기능 포함 예시는 PG 134,000원', () => {
  const r = GC.price.calcOrder(exampleInput());
  assert.equal(r.totals.gross, 160000);
  assert.equal(r.totals.instantDisc + r.totals.partnerCouponDisc, 15000);
  assert.equal(r.totals.hqDisc, 10000);
  assert.deepEqual(r.lines.map((l) => l.hqAlloc), [6207, 3793]);
  assert.equal(r.totals.shipping, 4000);
  assert.equal(r.totals.shipCoupon, 3000);
  assert.equal(r.totals.customerTotal, 136000);
  assert.equal(r.totals.pay, 134000);
  assert.equal(r.totals.supply, 123636);
  assert.equal(r.totals.vat, 12364);
});

test('TC-02 가격 계산 — MVP 기능만 쓰면 PG 144,000원, 안분 6,000/4,000', () => {
  const r = GC.price.calcOrder(exampleInput({ withPhase2: false }));
  assert.deepEqual(r.lines.map((l) => l.hqAlloc), [6000, 4000]);
  assert.equal(r.totals.pay, 144000);
});

test('TC-03 디자인비 판정 — 할인 후 495,000원이면 39,000원, 할인 없으면 무료', () => {
  const mk = (instant) => ({
    items: [{ id: 'c', name: '인쇄 수저집', partnerId: 'B', shipKey: 'B-맞춤', qty: 1, tiers: [{ min: 1, price: 550000 }], instant, designGroup: 'D1' }],
    designGroups: [{ id: 'D1', type: 'CUSTOM' }],
    shipping: { 'B-맞춤': { name: '파트너 B 맞춤', type: 'free', base: 0 } },
  });
  const withDisc = GC.price.calcOrder(mk({ type: 'rate', value: 10 }));
  assert.equal(withDisc.designFees[0].basis, 495000);
  assert.equal(withDisc.designFees[0].fee, 39000);
  assert.equal(withDisc.designFees[0].shortfall, 5000);
  const noDisc = GC.price.calcOrder(mk(null));
  assert.equal(noDisc.designFees[0].fee, 0);
  assert.equal(noDisc.designFees[0].reason, 'threshold');
});

test('TC-04 주문서 예시(디자인 요청서 07장) — 374,000원, 21만원 더 담으면 무료', () => {
  const r = GC.price.calcOrder({
    items: [{ id: 'c', name: '인쇄 수저집', partnerId: 'B', shipKey: 'B-맞춤', qty: 1, tiers: [{ min: 1, price: 300000 }], instant: { type: 'amount', value: 10000 }, plateFee: 50000, designGroup: 'D1' }],
    designGroups: [{ id: 'D1', type: 'CUSTOM' }],
    hqCoupon: { name: '5,000원', type: 'amount', value: 5000 },
    shipping: { 'B-맞춤': { name: '파트너 B 맞춤', type: 'free', base: 0 } },
  });
  assert.equal(r.designFees[0].fee, 39000);
  assert.equal(r.designFees[0].shortfall, 210000);
  assert.equal(r.totals.customerTotal, 374000);
  assert.equal(r.totals.supply, 340000);
});

test('TC-05 배송비 — 수량별 반복 부과 3,000 × ⌈25÷10⌉ = 9,000', () => {
  const r = GC.price.calcOrder({
    items: [{ id: 'cup', name: '종이컵', partnerId: 'C', shipKey: 'C', qty: 25, tiers: [{ min: 1, price: 20000 }] }],
    shipping: { C: { name: '파트너 B', type: 'perQty', base: 3000, per: 10 } },
  });
  assert.equal(r.totals.shipping, 9000);
});

test('TC-06 구간 단가 안내 — 3박스면 2박스 더 담을 때 박스당 2,000원 싸짐', () => {
  const tiers = [{ min: 1, price: 32000 }, { min: 5, price: 30000 }, { min: 10, price: 28000 }];
  assert.deepEqual(GC.price.nextTier(tiers, 3), { need: 2, price: 30000, saving: 2000 });
  assert.equal(GC.price.nextTier(tiers, 12), null);
});

test('TC-07 부분 취소 두 번(냅킨 → 수저집, D53) — 냅킨에 낸 51,207원(750P + 50,457원) 뒤 잔액 전부, 쿠폰은 걸린 항목이 모두 취소될 때', () => {
  const input = exampleInput();
  const first = GC.refund.partialCancel({ input, paid: { pg: 134000, points: 2000 }, cancelIds: ['napkin'] });
  assert.equal(first.blocked, false);
  assert.equal(first.itemsRefund, 51207); // 60,000 − 냅킨 쿠폰 5,000 − 본사 쿠폰 안분 3,793 · 남은 수저집은 다시 계산하지 않음
  assert.equal(first.shipRefund, 0); // 배송 묶음에 수저집이 남음
  assert.equal(first.refund, 51207);
  assert.equal(first.pointRefund, 750);
  assert.equal(first.pgRefund, 50457);
  assert.deepEqual(first.couponsRestored.map((c) => c.kind), ['partner']); // 냅킨에만 걸린 쿠폰
  const second = GC.refund.partialCancel({ input, paid: { pg: 134000, points: 2000 }, refunded: { pg: 50457, points: 750 }, cancelIds: ['spoon'], alreadyCanceled: { napkin: 2 } });
  assert.equal(second.last, true);
  assert.equal(second.refund, 84793);
  assert.equal(second.pointRefund, 1250);
  assert.equal(second.pgRefund, 83543);
  assert.deepEqual(second.couponsRestored.map((c) => c.kind).sort(), ['hq', 'ship']); // 본사 쿠폰(걸린 두 항목 모두 취소) · 멤버십 배송비 쿠폰(묶음 전부)
});

test('TC-08 수량 구간이 바뀌는 부분 취소(C-PAY-02 예시 3, D53) — 출고 전은 막고, 같은 구간은 낸 금액, 반품은 막지 않고 낸 금액', () => {
  const item = (qty) => ({ id: 'sp', name: '수저집', partnerId: 'A', shipKey: 'A', qty, tiers: SPOON_TIERS, instant: { type: 'rate', value: 10 } });
  const ship = { A: { name: 'A', type: 'free', base: 0 } };
  const ten = { items: [item(10)], shipping: ship }; // 10박스 이상 10,000 − 10% → 9,000 × 10 = 90,000
  assert.equal(GC.price.calcOrder(ten).totals.customerTotal, 90000);
  const before = GC.refund.partialCancel({ input: ten, paid: { pg: 90000, points: 0 }, cancel: [{ id: 'sp', qty: 1 }] });
  assert.equal(before.blocked, true); // 남는 9박스가 5~9박스 구간 → 전체 취소 후 재주문 안내
  assert.equal(before.reason, 'TIER_CHANGE');
  const twenty = { items: [item(20)], shipping: ship };
  const same = GC.refund.partialCancel({ input: twenty, paid: { pg: 180000, points: 0 }, cancel: [{ id: 'sp', qty: 5 }] });
  assert.deepEqual([same.blocked, same.refund], [false, 45000]); // 15박스도 같은 구간 → 5박스 몫
  const ret = GC.refund.partialCancel({ input: ten, paid: { pg: 90000, points: 0 }, cancel: [{ id: 'sp', qty: 1 }], mode: 'return', deduction: 3000 });
  assert.deepEqual([ret.blocked, ret.refund, ret.shortfall], [false, 6000, undefined]); // 1박스 9,000 − 고객 부담 반품 배송비 3,000, 남은 9박스 단가 그대로
  const ret2 = GC.refund.partialCancel({ input: ten, paid: { pg: 90000, points: 0 }, cancel: [{ id: 'sp', qty: 9 }], alreadyCanceled: { sp: 1 }, mode: 'return' });
  assert.equal(ret2.last, true); // 남은 수량 전부 → 잔액 전부(끝전 포함)
  // 반품 배송비가 환불액보다 크면 모자란 만큼 추가 결제
  const cheap = { items: [{ id: 'w', name: '물티슈', partnerId: 'A', shipKey: 'A', qty: 10, tiers: [{ min: 1, price: 500 }] }, item(10)], shipping: ship };
  const sh = GC.refund.partialCancel({ input: cheap, paid: { pg: 95000, points: 0 }, cancel: [{ id: 'w', qty: 2 }], mode: 'return', deduction: 3000 });
  assert.deepEqual([sh.refund, sh.shortfall], [0, 2000]);
});

test('TC-09 디자인 단계별 취소(C-PAY-02 예시 2) — 판비 공제 = min(증빙 실비, 낸 판비)', () => {
  // 인쇄 250,000 + 판비 50,000 (+ 디자인비 39,000)
  const paid = { type: 'CUSTOM', itemsAmount: 300000, paidDesignFee: 39000, plateFee: 50000 };
  assert.equal(GC.refund.designCancel({ ...paid, stage: 'BEFORE_PROPOSAL' }).refund, 339000);
  assert.equal(GC.refund.designCancel({ ...paid, stage: 'AFTER_PROPOSAL' }).refund, 300000);
  assert.equal(GC.refund.designCancel({ ...paid, stage: 'APPROVED', plateCost: 70000 }).refund, 250000); // 실비가 커도 낸 판비까지만
  const c30 = GC.refund.designCancel({ ...paid, stage: 'APPROVED', plateCost: 30000 });
  assert.equal(c30.refund, 270000);
  assert.equal(c30.plateToPartner, 30000); // 파트너 '취소 보상'도 같은 금액
  assert.equal(GC.refund.designCancel({ ...paid, stage: 'APPROVED', plateCost: 0 }).refund, 300000); // 증빙 없음
  const ap = GC.refund.designCancel({ ...paid, stage: 'APPROVED' });
  assert.equal(ap.mediation, true);
  assert.equal(ap.claimType, 'CUSTOM_CANCEL');
  assert.equal(GC.refund.designCancel({ ...paid, stage: 'PRODUCTION' }).allowed, false);
  // 무료 디자인(50만원 이상): 낸 디자인비가 0원이라 공제 0원(2026-10-16 D54 — 39,000원 공제 없앰, freeCustom은 무시)
  const free = { type: 'CUSTOM', itemsAmount: 600000, paidDesignFee: 0, freeCustom: true, plateFee: 50000 };
  assert.equal(GC.refund.designCancel({ ...free, stage: 'AFTER_PROPOSAL' }).refund, 600000);
  assert.equal(GC.refund.designCancel({ ...free, stage: 'APPROVED', plateCost: 50000 }).refund, 550000);
  assert.equal(GC.refund.designCancel({ ...free, stage: 'APPROVED', plateCost: 30000 }).refund, 570000);
  assert.equal(GC.refund.designCancel({ type: 'TEMPLATE', itemsAmount: 300000, stage: 'AFTER_PROPOSAL' }).refund, 300000);
  // 템플릿형 확정 뒤: 디자인비 공제 0원, 판비 공제만(확정 후 취소)
  const tpl = GC.refund.designCancel({ type: 'TEMPLATE', itemsAmount: 300000, plateFee: 50000, stage: 'APPROVED', plateCost: 50000 });
  assert.equal(tpl.refund, 250000);
  assert.equal(tpl.claimType, 'CUSTOM_CANCEL');
});

test('TC-10 수수료 — 프로 9% → 13,050원(공급가 11,864), 맞춤 12% → 36,000원, 재주문 9% → 27,000원', () => {
  const normal = GC.settle.finalRate({ base: 10, plan: 'PRO' });
  assert.equal(normal.rate, 9);
  const e1 = GC.settle.confirmEvent({ sale: 160000, partnerDisc: 15000, rate: normal.rate, shipping: 4000 });
  assert.equal(e1.fee, 13050);
  assert.equal(e1.feeSupply, 11864);
  assert.equal(e1.feeVat, 1186);
  assert.equal(e1.amount, 135950);
  const custom = GC.settle.finalRate({ base: 13, plan: 'PRO' });
  const e2 = GC.settle.confirmEvent({ sale: 300000, rate: custom.rate });
  assert.equal(e2.fee, 36000);
  assert.equal(e2.feeSupply, 32727);
  assert.equal(e2.amount, 264000);
  const re = GC.settle.finalRate({ base: 13, plan: 'PRO', reorder: true });
  assert.equal(re.rate, 9);
  assert.equal(GC.settle.commission(300000, re.rate), 27000);
});

test('TC-11 수수료 하한 5% — 인하를 다 더해도 5% 아래로 안 내려감', () => {
  const r = GC.settle.finalRate({ base: 10, plan: 'PREMIUM', newPartner: true, reorder: true });
  assert.equal(r.raw, 3);
  assert.equal(r.rate, 5);
  assert.equal(r.floored, true);
});

test('TC-12 주간 지급액 — 399,950 − 플랜료 108,900 − 광고비 16,500 = 274,550원', () => {
  const r = GC.settle.payout({ events: [135950, 264000], charges: [{ type: 'AD', amount: 16500 }, { type: 'PLAN', amount: 108900 }] });
  assert.deepEqual(r.deductions.map((d) => d.type), ['PLAN', 'AD']);
  assert.equal(r.payout, 274550);
});

test('TC-13 이월·미수금 3주 — 0원(미수 15,000) → 0원(이월 −12,000) → 42,000원', () => {
  const w2 = GC.settle.payout({ events: [60000, -20000], charges: [{ type: 'AD', amount: 55000 }] });
  assert.equal(w2.payout, 0);
  assert.deepEqual(w2.receivables, [{ type: 'AD', amount: 15000 }]);
  const w3 = GC.settle.payout({ events: [15000, -27000], carryIn: w2.carryOut, receivables: w2.receivables });
  assert.equal(w3.payout, 0);
  assert.equal(w3.carryOut, -12000);
  assert.deepEqual(w3.receivables, [{ type: 'AD', amount: 15000 }]);
  const w4 = GC.settle.payout({ events: [80000], carryIn: w3.carryOut, receivables: w3.receivables, charges: [{ type: 'AD', amount: 11000 }] });
  assert.equal(w4.payout, 42000);
  assert.deepEqual(w4.receivables, []);
});

test('TC-14 연간 멤버십 중도 해지 환불표', () => {
  assert.equal(GC.membership.annualRefund({ daysSincePay: 5, months: 0 }).refund, 99000);
  assert.equal(GC.membership.annualRefund({ daysSincePay: 70, months: 2, extraDays: 10 }).refund, 69300);
  assert.equal(GC.membership.annualRefund({ daysSincePay: 70, months: 2, extraDays: 10, benefitUsed: true }).refund, 69300);
  assert.equal(GC.membership.annualRefund({ daysSincePay: 250, months: 8, extraDays: 5 }).refund, 9900);
  assert.equal(GC.membership.annualRefund({ daysSincePay: 320, months: 10, extraDays: 15 }).refund, 0);
});

test('TC-15 연락처 가림 — 대화는 가리고, 인쇄 문구 칸은 그대로', () => {
  const chat = GC.mask('전화 010-1234-5678 로 주세요, 메일 boss@shop.co.kr');
  assert.match(chat.text, /010-\*\*\*\*-\*\*\*\*/);
  assert.match(chat.text, /\*\*\*\*@\*\*\*\*/);
  assert.equal(chat.hits.length, 2);
  assert.equal(GC.mask('사이즈는 40-240mm 로 해 주세요').hits.length, 0);
  assert.equal(GC.mask('instagram.com/todaybapsang 참고해 주세요').hits.length, 0);
  assert.equal(GC.mask('https://open.kakao.com/o/abc123 여기로').hits[0].kind, 'messenger');
  assert.equal(GC.mask('카톡 아이디: bapsang99').hits[0].kind, 'messenger');
  assert.equal(GC.mask('www.mybapsang.com 보세요').hits[0].kind, 'link');
  assert.equal(GC.mask('국민 123456-78-901234 로 입금').hits[0].kind, 'account');
  assert.equal(GC.mask('로고 파일 logo.png 확인 부탁해요').hits.length, 0);
  const print = GC.mask('오늘밥상 02-000-0000 @todaybapsang', 'print_text');
  assert.equal(print.hits.length, 0);
  assert.equal(GC.mask('open.kakao.com/o/zz', 'print_text').hits.length, 1);
});

test('TC-16 상태 머신 — 정의된 이벤트로만 이동', () => {
  assert.equal(GC.sm.next('DESIGN', 'REQUESTED', 'assign'), 'ASSIGNED');
  assert.equal(GC.sm.next('DESIGN', 'HANDED_OFF', 'printable'), 'IN_PRODUCTION');
  assert.throws(() => GC.sm.next('DESIGN', 'IN_PRODUCTION', 'cancel'), /INVALID_TRANSITION/);
  assert.equal(GC.sm.next('ORDER', 'PAID', 'cancel'), 'CANCELED');
  assert.throws(() => GC.sm.next('ORDER', 'SHIPPED', 'cancel'), /INVALID_TRANSITION/);
  assert.equal(GC.sm.next('ORDER_CUSTOM', 'PAID', 'reorder'), 'DESIGN_CONFIRMED');
  assert.equal(GC.sm.next('PARTNER_APP', 'SUPPLEMENT', 'resubmit'), 'REVIEWING');
  assert.equal(GC.sm.next('SETTLEMENT', 'CONFIRMED', 'payout_fail'), 'ON_HOLD');
  assert.equal(GC.sm.stateName('SETTLEMENT', 'ON_HOLD'), '정산 보류'); // B16 정산 쪽 라벨
  assert.equal(GC.sm.stateName('SETTLEMENT', 'CONFIRMED'), '정산 확정');
  assert.equal(GC.sm.next('PRODUCT_REVISION', 'IN_REVIEW', 'decline'), 'DECLINED'); // B15 수정본 상태
});

test('TC-17 영업시간 계산 — 금 17시 + 4영업시간 = 월 12시', () => {
  const fri = new Date(2026, 9, 16, 17, 0); // 2026-10-16(금)
  const due = GC.addBusinessHours(fri, 4);
  assert.equal(due.getDay(), 1);
  assert.equal(due.getHours(), 12);
  const due2 = GC.addBusinessDays(new Date(2026, 9, 15, 10, 0), 2); // 목 → 다음 주 월
  assert.equal(due2.getDay(), 1);
});

test('TC-18 정책값 — 바꾼 값이 계산에 바로 반영되고 되돌릴 수 있음', () => {
  GC.Policy.set('design.free_threshold', 300000);
  const r = GC.price.calcOrder({
    items: [{ id: 'c', name: '인쇄', partnerId: 'B', shipKey: 'B', qty: 1, tiers: [{ min: 1, price: 350000 }], designGroup: 'D1' }],
    designGroups: [{ id: 'D1', type: 'CUSTOM' }],
  });
  assert.equal(r.designFees[0].fee, 0);
  GC.Policy.reset();
  assert.equal(GC.Policy.get('design.free_threshold'), 500000);
});

// ── 사업자 전용가 (2026-10-13 확정: 41-A · 42-C · 43-B) ──
const NORMAL_TIERS = [{ min: 1, price: 32000 }, { min: 5, price: 30000 }, { min: 10, price: 28000 }];

test('TC-19 사업자가 할인율 방식 — 모든 구간에 같은 비율, 원 단위 내림, 옵션 추가 금액에도 적용', () => {
  const biz = { mode: 'rate', rate: 3 };
  assert.deepEqual(GC.price.bizTiers(NORMAL_TIERS, biz).map((t) => t.price), [31040, 29100, 27160]);
  assert.deepEqual(GC.price.bizTiers([{ min: 1, price: 999 }], biz).map((t) => t.price), [970]); // 29.97 → 29 내림
  assert.equal(GC.price.bizOptionExtra(1000, biz), 970);
  assert.equal(GC.price.bizOptionExtra(-1000, biz), -970);
  assert.equal(GC.price.bizOptionExtra(1000, { mode: 'amount', amounts: [1, 1, 1] }), 1000); // 숫자 방식은 그대로
  assert.deepEqual(GC.price.bizErrors(NORMAL_TIERS, { mode: 'rate', rate: 51 }).map((e) => e.i), [-1]); // 상한 50%(관리자 설정값)
  assert.deepEqual(GC.price.bizErrors(NORMAL_TIERS, { mode: 'rate', rate: 0 }).map((e) => e.i), [-1]);
});

test('TC-20 사업자가 숫자 방식 — 모든 구간 필수, 일반가보다 낮게, 사업자 단가끼리 역전 불가', () => {
  assert.deepEqual(GC.price.bizErrors(NORMAL_TIERS, { mode: 'amount', amounts: [31000, 29000, 27000] }), []);
  assert.deepEqual(GC.price.bizErrors(NORMAL_TIERS, { mode: 'amount', amounts: [31000, 29000] }).map((e) => e.i), [2]); // 빈 구간
  assert.deepEqual(GC.price.bizErrors(NORMAL_TIERS, { mode: 'amount', amounts: [32000, 29000, 27000] }).map((e) => e.i), [0]); // 일반가와 같음
  assert.deepEqual(GC.price.bizErrors(NORMAL_TIERS, { mode: 'amount', amounts: [29000, 29500, 27000] }).map((e) => e.i), [1]); // 역전
  assert.equal(GC.price.bizTiers(NORMAL_TIERS, { mode: 'amount', amounts: [31000, 29000] }), null);
});

test('TC-21 단가표 선택 — 사업자 회원이고 사업자가가 있을 때만 BIZ, 가격 종류는 계산 결과에 남음', () => {
  const biz = { mode: 'amount', amounts: [31000, 29000, 27000] };
  assert.equal(GC.price.pickTiers(NORMAL_TIERS, biz, 'biz').priceType, 'BIZ');
  assert.equal(GC.price.pickTiers(NORMAL_TIERS, biz, 'member').priceType, 'NORMAL');
  assert.equal(GC.price.pickTiers(NORMAL_TIERS, { mode: 'none' }, 'biz').priceType, 'NORMAL');
  const pk = GC.price.pickTiers(NORMAL_TIERS, biz, 'biz');
  const r = GC.price.calcOrder({ items: [{ id: 'a', partnerId: 'A', shipKey: 'A', qty: 5, tiers: pk.tiers, priceType: pk.priceType }] });
  assert.equal(r.lines[0].priceType, 'BIZ');
  assert.equal(r.totals.gross, 145000);
});

test('TC-22 할인 전 가격 — 일반가·사업자가 결제 기록을 따로 계산(사업자가가 일반 화면에 드러나지 않음)', () => {
  const start = new Date('2026-10-13T00:00:00+09:00');
  const ago = (d) => new Date(start.getTime() - d * GC.DAY);
  const hist = [
    { at: ago(3), unit: 27000, priceType: 'NORMAL' },
    { at: ago(5), unit: 26000, priceType: 'BIZ' },
    { at: ago(25), unit: 25000, priceType: 'NORMAL' }, // 20일 밖
  ];
  assert.equal(GC.price.listPrice(hist, 'NORMAL', start), 27000); // 섞었다면 26,000(사업자가)이 보였을 것
  assert.equal(GC.price.listPrice(hist, 'BIZ', start), 26000);
  assert.equal(GC.price.listPrice(hist.filter((h) => h.priceType === 'NORMAL'), 'BIZ', start), null); // 사업자가 기록 없음 → 할인가만
});

test('TC-23 디자인비 판정은 적용된 가격 기준 — 같은 수량이라도 사업자가면 기준 미달 가능(43-B)', () => {
  const cTiers = [{ min: 10, price: 51000 }];
  const groups = [{ id: 'g', type: 'CUSTOM' }];
  const item = (tiers, priceType) => ({ id: 'c', partnerId: 'A', shipKey: 'A-맞춤', qty: 10, tiers, priceType, designGroup: 'g' });
  const normal = GC.price.calcOrder({ items: [item(cTiers, 'NORMAL')], designGroups: groups });
  const bt = GC.price.bizTiers(cTiers, { mode: 'amount', amounts: [49000] });
  const biz = GC.price.calcOrder({ items: [item(bt, 'BIZ')], designGroups: groups });
  assert.equal(normal.designFees[0].fee, 0); // 510,000원 ≥ 50만원
  assert.equal(biz.designFees[0].fee, 39000); // 490,000원 < 50만원
  assert.equal(biz.designFees[0].shortfall, 10000); // "맞춤 품목 1만원 더 담으면 디자인비 무료"
  assert.equal(normal.totals.customerTotal, 510000);
  assert.equal(biz.totals.customerTotal, 529000);
});

// ── 2026-10-14 부록 B 반영(S7): 판비 공제 min · D17~D19 · MVP 정산 · C-STATE-03 · 이의 제기 · 역전 경고 · 예고 24시간 ──
test('TC-24 첫 시안 판정은 상태가 아니라 기록 — 맞춤형 전환으로 REQUESTED에 돌아가도 공제', () => {
  const paid = { type: 'CUSTOM', itemsAmount: 300000, paidDesignFee: 39000, plateFee: 50000 };
  assert.equal(GC.refund.designStage({ state: 'REQUESTED', firstProposed: true }), 'AFTER_PROPOSAL');
  assert.equal(GC.refund.designCancel({ ...paid, state: 'REQUESTED', firstProposed: true }).refund, 300000);
  assert.equal(GC.refund.designCancel({ ...paid, state: 'ON_HOLD', firstProposed: false }).refund, 339000); // 첫 시안 기록 없는 보류
  assert.equal(GC.refund.designCancel({ ...paid, state: 'ON_HOLD', firstProposed: true }).refund, 300000);
  assert.equal(GC.refund.designStage({ state: 'HANDED_OFF' }), 'APPROVED');
  assert.equal(GC.refund.designStage({ state: 'IN_PRODUCTION' }), 'PRODUCTION');
});

test('TC-25 재주문 취소(D19) — 판비 0원은 바로 0원 공제(PREFLIGHT_REJECTED 포함), 판비 낸 재주문은 확정 후 취소', () => {
  for (const state of ['APPROVED', 'HANDED_OFF', 'PREFLIGHT_REJECTED']) {
    const r = GC.refund.designCancel({ type: 'REORDER', state, itemsAmount: 250000, plateFee: 0, plateCost: 50000 });
    assert.equal(r.claimType, 'CANCEL');
    assert.equal(r.mediation, false);
    assert.equal(r.refund, 250000); // 인쇄 250,000, 같은 판이라 판비 면제
  }
  const paidPlate = GC.refund.designCancel({ type: 'REORDER', state: 'HANDED_OFF', itemsAmount: 300000, plateFee: 50000, plateCost: 30000 });
  assert.equal(paidPlate.claimType, 'CUSTOM_CANCEL');
  assert.equal(paidPlate.refund, 270000); // 디자인비 0원 + 판비 min(30,000, 50,000)
  assert.equal(paidPlate.plateToPartner, 30000);
  assert.equal(GC.sm.next('ORDER_CUSTOM', 'DESIGN_CONFIRMED', 'reorder_cancel'), 'CANCELED');
});

test('TC-26 확정 후 변경 건의 취소(D18) — 시안 단계여도 확정 후 취소: 본사 중재, 디자인비 + 판비 공제', () => {
  const paid = { type: 'CUSTOM', itemsAmount: 300000, paidDesignFee: 39000, plateFee: 50000 };
  const r = GC.refund.designCancel({ ...paid, state: 'PROPOSED', firstProposed: true, afterChange: true, plateCost: 50000 });
  assert.equal(r.stage, 'APPROVED');
  assert.equal(r.claimType, 'CUSTOM_CANCEL');
  assert.equal(r.refund, 250000);
  const plain = GC.refund.designCancel({ ...paid, state: 'PROPOSED', firstProposed: true, plateCost: 50000 });
  assert.equal(plain.claimType, 'CANCEL'); // 변경 건이 아니면 일반 취소(디자인비만)
  assert.equal(plain.refund, 300000);
  assert.equal(GC.sm.next('DESIGN', 'REVISION', 'custom_cancel_approved'), 'CANCELED');
  assert.equal(GC.sm.next('ORDER_CUSTOM', 'DESIGNING', 'custom_cancel_approved'), 'CANCELED');
});

test('TC-27 MVP 주간 정산(C-STL-01 예시 1) — 139,000 + 261,000 + 225,000 + 취소 보상 30,000 = 655,000원', () => {
  // 일반 주문은 주문 항목(정산 이벤트)마다 수수료·공급가·VAT를 나눔(2026-10-15 D22): 수저집 9,000 = 8,182 + 818, 냅킨 6,000 = 5,455 + 545
  const rate10 = GC.settle.finalRate({ base: 10 }).rate;
  const spoon = GC.settle.confirmEvent({ sale: 100000, partnerDisc: 10000, rate: rate10 });
  const napkin = GC.settle.confirmEvent({ sale: 60000, rate: rate10, shipping: 4000 }); // 배송비는 냅킨 행
  assert.deepEqual([spoon.fee, spoon.feeSupply, spoon.feeVat, spoon.amount], [9000, 8182, 818, 81000]);
  assert.deepEqual([napkin.fee, napkin.feeSupply, napkin.feeVat, napkin.amount], [6000, 5455, 545, 58000]);
  const normal = { fee: spoon.fee + napkin.fee, feeSupply: spoon.feeSupply + napkin.feeSupply, feeVat: spoon.feeVat + napkin.feeVat, amount: spoon.amount + napkin.amount };
  assert.equal(normal.fee, 15000);
  assert.equal(normal.feeSupply, 13637); // 한 줄로 나누면 13,636 — 월 합계로 다시 나누지 않음
  assert.equal(normal.feeVat, 1363);
  assert.equal(normal.amount, 139000);
  const custom = GC.settle.confirmEvent({ sale: 300000, rate: GC.settle.finalRate({ base: 13 }).rate });
  assert.equal(custom.fee, 39000);
  assert.equal(custom.feeSupply, 35455);
  assert.equal(custom.amount, 261000);
  const reRate = GC.settle.finalRate({ base: 13, reorder: true });
  assert.equal(reRate.rate, 10);
  const reorder = GC.settle.confirmEvent({ sale: 250000, rate: reRate.rate });
  assert.equal(reorder.fee, 25000);
  assert.equal(reorder.feeSupply, 22727);
  assert.equal(reorder.amount, 225000);
  const comp = GC.refund.designCancel({ type: 'CUSTOM', stage: 'APPROVED', itemsAmount: 300000, paidDesignFee: 39000, plateFee: 50000, plateCost: 30000 }).plateToPartner;
  const r = GC.settle.payout({ events: [normal.amount, custom.amount, reorder.amount, comp] });
  assert.deepEqual(r.deductions, []); // MVP의 본사 청구는 위약금·분쟁 조정뿐
  assert.equal(r.payout, 655000);
});

test('TC-28 디자인 요청 전이(C-STATE-03) — 수정본 등록·재업로드·정리본 재확정·전환 결제·변경 건 복원', () => {
  const n = (from, ev) => GC.sm.next('DESIGN', from, ev);
  assert.equal(n('REVISION', 'propose'), 'PROPOSED'); // REVISION → IN_PROGRESS를 거치지 않음
  assert.equal(GC.sm.can('DESIGN', 'REVISION', 'start_revision'), false);
  assert.equal(n('REVISION', 'revision_withdraw'), 'PROPOSED');
  assert.equal(n('FILE_REJECTED', 'reupload'), 'FILE_REVIEW');
  assert.equal(n('FILE_REJECTED', 'fix'), 'FILE_REVIEW');
  assert.equal(n('APPROVED', 'reconfirm'), 'PROPOSED');
  assert.equal(n('PROPOSED', 'convert_custom'), 'REQUESTED');
  assert.equal(n('PREFLIGHT_REJECTED', 'change_approved'), 'REVISION');
  assert.equal(n('PREFLIGHT_REJECTED', 'back_to_file'), 'FILE_REJECTED');
  assert.equal(n('ON_HOLD', 'restore'), 'HANDED_OFF');
  assert.equal(GC.sm.next('ORDER_CUSTOM', 'DESIGNING', 'restore'), 'DESIGN_CONFIRMED');
  assert.throws(() => n('IN_PRODUCTION', 'custom_cancel_approved'), /INVALID_TRANSITION/);
  // 16개 상태가 모두 전이표에 나옴
  const m = GC.sm.machine('DESIGN'); const seen = new Set();
  m.transitions.forEach((t) => { [].concat(t.from).forEach((x) => seen.add(x)); seen.add(t.to); });
  assert.deepEqual(Object.keys(m.states).filter((k) => !seen.has(k)), []);
  assert.equal(Object.keys(m.states).length, 16);
});

test('TC-29 재제작·EXCHANGED(D4·D17) — 재제작품 배송 완료는 끝 상태, 이미 정산된 항목은 새 정산 없음, 재클레임 기한은 그 물건부터', () => {
  const o = (from, ev) => GC.sm.next('ORDER_CUSTOM', from, ev);
  assert.equal(o('DELIVERED', 'remake_delivered'), 'EXCHANGED');
  assert.equal(o('CONFIRMED', 'remake_delivered'), 'EXCHANGED');
  assert.equal(o('EXCHANGED', 'remake_delivered'), 'EXCHANGED'); // 재제작품이 다시 불량 → 다시 재제작
  assert.equal(o('CONFIRMED', 'remake_refund'), 'RETURNED');
  assert.equal(GC.sm.can('ORDER_CUSTOM', 'EXCHANGED', 'confirm'), false); // CONFIRMED로 바꾸지 않음
  assert.equal(GC.sm.next('ORDER', 'EXCHANGED', 'defect_return_done'), 'RETURNED');
  // REMAKE 클레임: 사진 증빙으로 회수 생략 → 검수 → 승인 → 재제작품 출고 → 배송 완료
  let c = 'RETURN_REQUESTED';
  for (const ev of ['photo_inspect', 'approve', 'reship', 'delivered']) c = GC.sm.next('CLAIM_RETURN', c, ev);
  assert.equal(c, 'CLAIM_COMPLETED');
  const at = new Date(2026, 10, 20, 15, 0);
  assert.equal(GC.claim.remakeSettlement({ settledBefore: true, deliveredAt: at }).newEvent, false);
  const fresh = GC.claim.remakeSettlement({ settledBefore: false, deliveredAt: at });
  assert.equal(fresh.newEvent, true);
  assert.equal(fresh.settleAt.getDate(), 27);
  const due = GC.claim.defectDeadline(at);
  assert.deepEqual([due.getFullYear(), due.getMonth() + 1, due.getDate()], [2027, 2, 20]);
});

test('TC-30 이의 제기(D8) — 파트너 거부만 3일 안, 확정 후 취소 기각은 없음, 중재 결과 두 갈래', () => {
  const t = new Date(2026, 9, 20, 10, 0);
  assert.equal(GC.claim.canObject({ claimType: 'CANCEL', state: 'CANCEL_REJECTED' }), true);
  assert.equal(GC.claim.canObject({ claimType: 'CUSTOM_CANCEL', state: 'CANCEL_REJECTED' }), false);
  assert.equal(GC.claim.canObject({ claimType: 'REMAKE', state: 'RETURN_REJECTED', rejectedAt: t, now: new Date(+t + 2 * GC.DAY) }), true);
  assert.equal(GC.claim.canObject({ claimType: 'REMAKE', state: 'RETURN_REJECTED', rejectedAt: t, now: new Date(+t + 3 * GC.DAY) }), false);
  assert.equal(GC.claim.canObject({ claimType: 'RETURN', state: 'RETURN_INSPECTING' }), false);
  assert.equal(GC.sm.next('CLAIM_CANCEL', 'CANCEL_REJECTED', 'mediation_customer'), 'CANCEL_APPROVED');
  assert.equal(GC.sm.next('CLAIM_CANCEL', 'CANCEL_REJECTED', 'mediation_partner'), 'CLAIM_COMPLETED');
  assert.equal(GC.sm.next('CLAIM_RETURN', 'RETURN_REJECTED', 'mediation_partner'), 'CLAIM_COMPLETED');
  assert.equal(GC.sm.next('CLAIM_CANCEL', 'CANCEL_REQUESTED', 'mediation_dismiss'), 'CLAIM_COMPLETED');
  assert.equal(GC.sm.next('CLAIM_CANCEL', 'CANCEL_REQUESTED', 'withdraw'), 'CLAIM_COMPLETED');
  assert.equal(GC.sm.machine('CLAIM_RETURN').states.RETURN_REJECTED.customer, '판매자 거부');
  assert.equal(GC.sm.machine('CLAIM_CANCEL').states.CANCEL_REJECTED.customer, '판매자 거부');
});

test('TC-31 사업자가 역전 경고(B51 · D12=C) — 즉시 할인을 사업자가에 안 걸 때만, 계산은 그대로', () => {
  const biz = { mode: 'amount', amounts: [31000, 29000, 27000] };
  const off10 = { type: 'rate', value: 10, applyBiz: false };
  assert.deepEqual(GC.price.bizInversion(NORMAL_TIERS, biz, off10).map((x) => x.i), [0, 1, 2]); // 28,800 < 31,000 …
  assert.deepEqual(GC.price.bizInversion(NORMAL_TIERS, biz, { type: 'rate', value: 3, applyBiz: false }), []); // 31,040 > 31,000
  assert.deepEqual(GC.price.bizInversion(NORMAL_TIERS, biz, { type: 'amount', value: 1000, applyBiz: false }), []); // 같으면 역전 아님
  assert.deepEqual(GC.price.bizInversion(NORMAL_TIERS, biz, { type: 'rate', value: 10 }), []); // 사업자가에도 적용하면 경고 없음
  assert.deepEqual(GC.price.bizInversion(NORMAL_TIERS, { mode: 'none' }, off10), []);
  assert.equal(GC.price.pickTiers(NORMAL_TIERS, biz, 'biz').priceType, 'BIZ'); // 역전돼도 사업자 회원은 사업자가 표
});

test('TC-32 예고 먼저(B36) — 예고 뒤 24시간이 지나야 보류·자동 취소', () => {
  const t = new Date(2026, 9, 20, 9, 0);
  assert.equal(GC.notice.elapsed(null, t), false); // 예고 기록 없으면 예고부터
  assert.equal(GC.notice.elapsed(t, new Date(+t + 23 * GC.HOUR)), false);
  assert.equal(GC.notice.elapsed(t, new Date(+t + 24 * GC.HOUR)), true);
});

test('TC-33 새 정책값 키(2026-10-14) — 기본값과 공휴일 생략 결정(주말만 계산)', () => {
  assert.equal(GC.Policy.get('notify.notice_min_hours'), 24);
  assert.equal(GC.Policy.get('file.scan_timeout_minutes'), 10);
  assert.equal(GC.Policy.get('member.web_keep_login_days'), 30);
  assert.equal(GC.Policy.get('member.app_keep_login_days'), 90);
  assert.equal(GC.Policy.get('product.detail_image_max'), 60);
  assert.equal(typeof GC.Policy.get('calendar.holidays'), 'string');
  const next = GC.addBusinessDays(new Date(2026, 9, 8, 10, 0), 1); // 목 → 10/9(금, 한글날)도 영업일로 셈
  assert.equal(next.getDate(), 9);
});

// ───────────── 2026-10-16 S9: S8 결정(D20~D33) ─────────────
const CUSTOM_ITEM = (extra = {}) => ({ id: 'c', name: '인쇄 수저집', partnerId: 'B', shipKey: 'B-맞춤', qty: 1, tiers: [{ min: 1, price: 300000 }], plateFee: 50000, designGroup: 'D1', ...extra });
const FREE_SHIP = { 'B-맞춤': { name: '파트너 B 맞춤', type: 'free', base: 0 } };

test('TC-34 판비는 상품 금액(D20) — 판비 범위 즉시 할인·본사 쿠폰 안분, 고객이 낸 판비 = 판비 줄 결제 금액 = 공제 상한', () => {
  const r = GC.price.calcOrder({
    items: [CUSTOM_ITEM({ instant: { type: 'rate', value: 10, plate: true } })],
    designGroups: [{ id: 'D1', type: 'CUSTOM' }], hqCoupon: { name: '장바구니 5,000원', type: 'amount', value: 5000 }, shipping: FREE_SHIP,
  });
  const l = r.lines[0];
  assert.equal(l.instantDisc, 30000);
  assert.equal(l.plateInstantDisc, 5000); // 판비 50,000 × 10%
  assert.equal(r.designFees[0].basis, 270000); // 판비는 50만원 판정에서 뺌
  assert.equal(l.plateHqAlloc, 714); // 5,000 × 45,000 ÷ 315,000 내림, 끝전은 큰 항목(상품)
  assert.equal(l.hqAlloc, 5000);
  assert.equal(l.platePaid, 44286);
  assert.equal(r.totals.customerTotal, 349000); // 300,000 + 50,000 − 35,000 + 39,000 − 5,000
  assert.deepEqual(r.steps.slice(0, 2).map((s) => s.key), ['tier', 'plate']); // 주문서: 상품 금액 바로 아래 판비
  // 판비 범위를 고르지 않으면 판비에는 즉시 할인이 안 걸림
  const noPlate = GC.price.calcOrder({ items: [CUSTOM_ITEM({ instant: { type: 'rate', value: 10 } })], designGroups: [{ id: 'D1', type: 'CUSTOM' }], shipping: FREE_SHIP });
  assert.equal(noPlate.lines[0].plateInstantDisc, 0);
  assert.equal(noPlate.lines[0].platePaid, 50000);
  // 정액 즉시 할인은 판비에서 한 번만 뺌(수량과 무관)
  const amt = GC.price.calcOrder({ items: [CUSTOM_ITEM({ qty: 2, tiers: [{ min: 1, price: 150000 }], instant: { type: 'amount', value: 10000, plate: true } })], shipping: FREE_SHIP });
  assert.equal(amt.lines[0].instantDisc, 20000);
  assert.equal(amt.lines[0].plateInstantDisc, 10000);
  // 확정 후 취소 판비 공제 상한 = 고객이 낸 판비(44,286) — 실비 50,000을 증빙해도
  const c = GC.refund.designCancel({ type: 'CUSTOM', stage: 'APPROVED', itemsAmount: 270000 - 4286 + l.platePaid, paidDesignFee: 39000, plateFee: l.platePaid, plateCost: 50000 });
  assert.equal(c.plateToPartner, 44286);
});

test('TC-35 본사 쿠폰은 자리마다 1장(D21) — 상품 할인 쿠폰 + 디자인비 쿠폰 함께, 디자인비 쿠폰은 안분 없이 디자인비에만', () => {
  const base = { items: [CUSTOM_ITEM()], designGroups: [{ id: 'D1', type: 'CUSTOM' }], shipping: FREE_SHIP };
  const both = GC.price.calcOrder({ ...base, hqCoupon: { name: '신규 가입 10%', type: 'rate', value: 10, max: 10000 }, designCoupon: { name: '첫 디자인 무료', type: 'free' } });
  assert.equal(both.totals.hqDisc, 10000);
  assert.equal(both.totals.designCoupon, 39000);
  assert.equal(both.designFees[0].couponDisc, 39000);
  assert.equal(both.lines[0].hqAlloc, 10000); // 상품 할인 쿠폰은 디자인비에 안분하지 않음
  assert.equal(both.totals.customerTotal, 340000); // 300,000 + 50,000 + 39,000 − 10,000 − 39,000
  // 예전 '디자인비 포함' 설정은 무시
  const legacy = GC.price.calcOrder({ ...base, hqCoupon: { name: '10%', type: 'rate', value: 10, max: 10000, includeDesignFee: true } });
  assert.equal(legacy.totals.customerTotal, 379000);
  assert.equal(legacy.designFees[0].couponDisc, 0);
  // 50만원 이상이라 디자인비가 이미 무료면 디자인비 쿠폰은 쓰지 않음(쿠폰함에 남김)
  const free = GC.price.calcOrder({ ...base, items: [CUSTOM_ITEM({ tiers: [{ min: 1, price: 550000 }] })], designCoupon: { name: '첫 디자인 무료', type: 'free' } });
  assert.equal(free.designFees[0].reason, 'threshold');
  assert.equal(free.totals.designCoupon, 0);
  assert.equal(free.totals.designCouponGroup, null);
});

test('TC-36 추가 구성품(D24) — 판매가 × 수량, 파트너 할인 없음, 본사 쿠폰 안분 대상, 50만원 판정 제외, 본 상품 취소 시 출고 전 것만 함께 취소', () => {
  const r = GC.price.calcOrder({
    items: [
      { id: 'napkin', name: '무형광 냅킨', partnerId: 'A', shipKey: 'A', qty: 2, tiers: [{ min: 1, price: 30000 }], instant: { type: 'rate', value: 10 } },
      { id: 'wipe', name: '물티슈(추가 구성품)', partnerId: 'A', shipKey: 'A', qty: 3, tiers: [{ min: 1, price: 5000 }], instant: { type: 'rate', value: 10 }, addonOf: 'napkin' },
    ],
    partnerCoupons: { A: { name: '파트너 5,000원', type: 'amount', value: 5000, minOrder: 50000 } },
    hqCoupon: { name: '장바구니 10%', type: 'rate', value: 10, max: 10000 },
    shipping: { A: { name: '파트너 A', type: 'fixed', base: 3000 } },
  });
  const [n, w] = r.lines;
  assert.equal(w.instantDisc, 0);
  assert.equal(w.partnerCouponDisc, 0);
  assert.equal(n.partnerCouponDisc, 5000);
  assert.deepEqual([n.hqAlloc, w.hqAlloc], [4900, 1500]); // 6,400 = 64,000 × 10%를 49,000 : 15,000으로
  assert.equal(r.shippingLines.length, 1); // 본 상품과 같은 배송 묶음
  assert.equal(r.totals.addons, 15000);
  assert.equal(r.totals.customerTotal, 60600);
  // 맞춤 항목에 붙어도 디자인비 판정에서 뺌
  const d = GC.price.calcOrder({ items: [CUSTOM_ITEM({ tiers: [{ min: 1, price: 480000 }] }), { id: 'cup', name: '컵 뚜껑', partnerId: 'B', shipKey: 'B-맞춤', qty: 1, tiers: [{ min: 1, price: 30000 }], addonOf: 'c', designGroup: 'D1' }], designGroups: [{ id: 'D1', type: 'CUSTOM' }], shipping: FREE_SHIP });
  assert.equal(d.designFees[0].basis, 480000);
  assert.equal(d.designFees[0].fee, 39000);
  const items = [{ id: 'napkin' }, { id: 'wipe', addonOf: 'napkin' }];
  assert.deepEqual(GC.order.addonCascade(items, ['napkin']), { cascade: ['wipe'], toReturn: [], partialParents: [] });
  assert.deepEqual(GC.order.addonCascade(items, ['napkin'], ['wipe']), { cascade: [], toReturn: ['wipe'], partialParents: [] }); // 출고됐으면 같은 회수로 함께 환불(D39)
  assert.deepEqual(GC.order.addonCascade(items, ['wipe']), { cascade: [], toReturn: [], partialParents: [] }); // 추가 구성품만 혼자 취소
  assert.equal(GC.sm.next('ORDER', 'ACCEPTED', 'parent_canceled'), 'CANCELED');
  assert.equal(GC.sm.can('ORDER', 'SHIPPED', 'parent_canceled'), false);
});

test('TC-37 수정본·정산 보류·출고 뒤 취소 이의(D27 · A-STL-02 · D23) — 새 전이', () => {
  const R = (from, ev) => GC.sm.next('PRODUCT_REVISION', from, ev);
  assert.equal(R('IN_REVIEW', 'cancel_review'), 'EDITING');
  assert.equal(R('EDITING', 'discard'), 'DISCARDED');
  assert.equal(R('NEEDS_FIX', 'discard'), 'DISCARDED');
  assert.equal(GC.sm.can('PRODUCT_REVISION', 'IN_REVIEW', 'discard'), false); // 검수 중이면 먼저 검수 요청 취소
  assert.equal(R('IN_REVIEW', 'product_ended'), 'DISCARDED');
  assert.equal(GC.sm.next('PRODUCT', 'IN_REVIEW', 'cancel_review'), 'DRAFT');
  assert.equal(GC.sm.next('SETTLEMENT', 'ON_HOLD', 'release_confirmed'), 'CONFIRMED');
  assert.equal(GC.sm.next('SETTLEMENT', 'ON_HOLD', 'release'), 'SCHEDULED');
  assert.equal(GC.sm.next('ORDER', 'DELIVERED', 'cancel_objection_return'), 'RETURNED');
  assert.equal(GC.sm.can('ORDER', 'SHIPPED', 'cancel_objection_return'), false); // 배송 중이면 배송 완료 뒤 회수
  assert.equal(GC.sm.next('CLAIM_CANCEL', 'CANCEL_APPROVED', 'collected_refund'), 'CLAIM_COMPLETED');
});

test('TC-38 끝난 클레임 라벨(D30) — 상태는 하나, 완료 결과로 라벨', () => {
  const r = GC.claim.result;
  assert.equal(r('CLAIM_RETURN', 'EXCHANGE_SHIPPED', 'delivered', 'REMAKE'), 'REMADE');
  assert.equal(r('CLAIM_RETURN', 'EXCHANGE_SHIPPED', 'delivered', 'EXCHANGE'), 'EXCHANGED');
  assert.equal(r('CLAIM_RETURN', 'RETURN_REQUESTED', 'withdraw'), 'WITHDRAWN');
  assert.equal(r('CLAIM_CANCEL', 'CANCEL_REQUESTED', 'mediation_dismiss'), 'DISMISSED');
  assert.equal(r('CLAIM_CANCEL', 'CANCEL_REJECTED', 'no_objection'), 'REJECTED');
  assert.equal(r('CLAIM_CANCEL', 'CANCEL_APPROVED', 'collected_refund'), 'REFUNDED');
  assert.equal(GC.claim.label('CLAIM_CANCEL', 'CLAIM_COMPLETED', 'DISMISSED'), '취소 기각');
  assert.equal(GC.claim.label('CLAIM_RETURN', 'CLAIM_COMPLETED', 'REMADE'), '재제작 완료');
  assert.equal(GC.claim.label('CLAIM_CANCEL', 'CANCEL_REJECTED'), '판매자 거부');
  for (const id of ['CLAIM_RETURN', 'CLAIM_CANCEL']) { // CLAIM_COMPLETED로 가는 줄은 모두 결과가 있음
    GC.sm.machine(id).transitions.filter((t) => t.to === 'CLAIM_COMPLETED').forEach((t) => assert.ok(t.result, id + ' ' + t.event));
  }
});

test('TC-39 제작 파트너 변경(D33 · D36~D38) — 거절·무응답은 공제 없이 전액, 상품 + 판비 합계로 비교, 새 상품 금액 기준 정산, 붙은 구성품 환불', () => {
  const p = GC.refund.partnerChange;
  const r = p({ choice: 'refund', oldList: 300000, oldPlate: 50000, paidTotal: 389000, addonsPaid: 15000 });
  assert.deepEqual([r.refund, r.addonRefund, r.totalRefund, r.restoreBenefits, r.settle], [389000, 15000, 404000, true, null]);
  // 합계 비교 D36: (350,000 − 310,000) × 325,500 ÷ 350,000 = 37,200 / 판비 같으면 20,000 × 0.93 = 18,600
  const down = p({ choice: 'agree', oldList: 300000, oldPlate: 50000, newList: 280000, newPlate: 30000, oldPaid: 325500, addonsPaid: 15000 });
  assert.deepEqual([down.refund, down.addonRefund, down.totalRefund], [37200, 15000, 52200]);
  assert.deepEqual(down.settle, { sale: 310000, partnerDisc: 0, platformDisc: 21700 }); // 310,000 − (325,500 − 37,200)
  assert.equal(p({ choice: 'agree', oldList: 300000, oldPlate: 50000, newList: 280000, newPlate: 50000, oldPaid: 325500 }).refund, 18600);
  // 비싸면 0원, 차이는 플랫폼 부담 할인(D37 — '조정' 이벤트 없음)
  const up = p({ choice: 'agree', oldList: 300000, oldPlate: 50000, newList: 320000, newPlate: 50000, oldPaid: 325500 });
  assert.deepEqual([up.refund, up.settle.sale, up.settle.platformDisc], [0, 370000, 44500]);
  assert.equal(GC.settle.confirmEvent({ sale: up.settle.sale, partnerDisc: up.settle.partnerDisc, rate: 13 }).amount, 321900); // 370,000 − 48,100
  // 판비 면제 재주문이 판비 있는 파트너로 가면 판비가 새로 생겨도 더 받지 않음
  const plateNew = p({ choice: 'agree', oldList: 300000, oldPlate: 0, newList: 280000, newPlate: 50000, oldPaid: 270000 });
  assert.deepEqual([plateNew.refund, plateNew.settle.platformDisc], [0, 60000]);
  assert.equal(GC.sm.next('ORDER', 'PAID', 'partner_change_cancel'), 'CANCELED'); // 붙은 구성품(D38)
  assert.equal(GC.sm.can('ORDER', 'SHIPPED', 'partner_change_cancel'), false);
  assert.equal(GC.sm.next('ORDER_CUSTOM', 'DESIGN_CONFIRMED', 'partner_change_refund'), 'CANCELED');
  assert.equal(GC.sm.next('DESIGN', 'HANDED_OFF', 'partner_changed'), 'HANDED_OFF');
  assert.equal(GC.sm.next('DESIGN', 'PROPOSED', 'partner_change_refund'), 'CANCELED');
  assert.equal(GC.sm.can('DESIGN', 'IN_PRODUCTION', 'partner_change_refund'), false); // [인쇄 가능] 뒤는 대상 아님
  assert.equal(GC.Policy.get('order.partner_change_reply_days'), 7);
});

test('TC-40 새 정책값 키(2026-10-15) — 보안·인쇄 확인·즉시 할인 기간·추가 구성품·파일 크기 종류별', () => {
  const g = (k) => GC.Policy.get(k);
  assert.deepEqual([g('security.password_min_length'), g('security.login_fail_lock'), g('security.idle_logout_minutes')], [10, 5, 30]);
  assert.deepEqual([g('production.print_check_bd'), g('promo.instant_discount_max_days'), g('promo.instant_discount_max_targets'), g('product.addon_max')], [1, 90, 500, 20]);
  assert.deepEqual([g('file.max_size_chat'), g('file.max_size_original'), g('file.max_size_logo'), g('file.max_size_image')], [100, 500, 100, 20]);
  assert.equal(typeof g('claim.tolerance'), 'string');
  assert.throws(() => g('file.max_size'), /UNKNOWN_POLICY/); // 값 셋을 담던 예전 키는 없음
});

test('TC-41 S10 결정(2026-10-16) — 디자인비 쿠폰 정액·정률·안분, 공제는 낸 디자인비만(D41), 구성품 남은 수량(D39), 진행 중 라벨·새 키·권한 행(D42)', () => {
  const bundle = (designCoupon, voucher = false) => GC.price.calcOrder({
    items: [CUSTOM_ITEM({ tiers: [{ min: 1, price: 200000 }] }), CUSTOM_ITEM({ id: 'c2', name: '인쇄 컵홀더', tiers: [{ min: 1, price: 150000 }], plateFee: 0 })],
    designGroups: [{ id: 'D1', type: 'CUSTOM', voucher }], shipping: FREE_SHIP, designCoupon,
  });
  const rate = bundle({ name: '디자인비 50%', type: 'rate', value: 50 });
  assert.deepEqual([rate.designFees[0].fee, rate.totals.designCoupon, rate.designFees[0].couponAlloc], [58000, 29000, [19500, 9500]]);
  const amt = bundle({ name: '디자인비 1만원', type: 'amount', value: 10000 });
  assert.deepEqual(amt.designFees[0].couponAlloc, [6725, 3275]); // 품목별 디자인비 39,000 : 19,000, 남는 원은 첫 품목
  assert.equal(bundle({ name: '첫 디자인 무료', type: 'rate', value: 100 }).totals.designCoupon, 58000); // 전액 무료 = 정률 100%
  const v = bundle({ name: '첫 디자인 무료', type: 'free' }, true); // 멤버십 이용권과 동시에 못 씀
  assert.deepEqual([v.designFees[0].reason, v.designFees[0].fee, v.totals.designCoupon], ['voucher', 19000, 0]);
  const dc = (o) => GC.refund.designCancel({ type: 'CUSTOM', stage: 'AFTER_PROPOSAL', itemsAmount: 350000, ...o });
  assert.equal(dc({ paidDesignFee: 0, freeCustom: false }).deduction, 0); // 쿠폰으로 전액 무료 → 공제 0원
  assert.deepEqual([dc({ paidDesignFee: 29000 }).deduction, dc({ paidDesignFee: 29000 }).refund], [29000, 350000]); // 일부 할인 → 낸 디자인비만
  assert.equal(dc({ paidDesignFee: 0, freeCustom: true }).deduction, 0); // 50만원·멤버십 무료도 낸 디자인비가 없어 0원(2026-10-16 D54)
  // 본 상품 일부만 취소하면 구성품은 그대로, 남은 수량을 다 취소하면 함께
  const items = [{ id: 'napkin', qty: 4 }, { id: 'wipe', addonOf: 'napkin', qty: 2 }];
  assert.deepEqual(GC.order.addonCascade(items, [{ id: 'napkin', qty: 2 }]), { cascade: [], toReturn: [], partialParents: ['napkin'] });
  assert.deepEqual(GC.order.addonCascade([{ id: 'napkin', qty: 4, canceledQty: 2 }, items[1]], [{ id: 'napkin', qty: 2 }]).cascade, ['wipe']);
  assert.equal(GC.sm.next('ORDER', 'DELIVERED', 'parent_collected'), 'RETURNED');
  // 진행 중 라벨은 클레임 유형으로, 거부는 '판매자 거부', 단계는 따로
  const L = GC.claim.label;
  assert.equal(L('CLAIM_RETURN', 'RETURN_COLLECTING', null, 'REMAKE'), '재제작 진행 중');
  assert.equal(L('CLAIM_RETURN', 'EXCHANGE_SHIPPED', null, 'EXCHANGE'), '교환 진행 중');
  assert.equal(L('CLAIM_RETURN', 'RETURN_REJECTED', null, 'REMAKE'), '판매자 거부');
  assert.equal(L('CLAIM_CANCEL', 'CANCEL_REQUESTED', null, 'CUSTOM_CANCEL'), '취소 중재 중');
  assert.equal(L('CLAIM_RETURN', 'RETURN_COLLECTING'), '반품 진행 중');
  assert.deepEqual([L('CLAIM_CANCEL', 'CANCEL_APPROVED', null, 'CANCEL'), L('CLAIM_RETURN', 'RETURN_APPROVED', null, 'RETURN'), L('CLAIM_RETURN', 'RETURN_APPROVED', null, 'REMAKE')], ['취소 승인', '반품 승인', '재제작 진행 중']); // 승인 뒤 환불 대기는 승인 라벨
  assert.equal(GC.claim.step('CLAIM_RETURN', 'RETURN_COLLECTING'), '회수 중');
  // 새 정책값 키·옵션 추가 금액 범위
  const g = (k) => GC.Policy.get(k);
  assert.deepEqual([g('product.option_combo_max'), g('product.review_bd'), g('product.review_priority_hours')], [100, 1, 4]);
  assert.deepEqual(GC.price.optionExtraRange(), { down: -50, up: 200 });
  // 키별 권한 행(D42): 보안·파일 한도는 최고관리자만
  const R = (k) => GC.Policy.permRow(k);
  assert.deepEqual([R('security.login_fail_lock'), R('file.max_size_image'), R('commission.custom_rate'), R('design.fee'), R('promo.instant_discount_max')],
    ['관리자 계정 · 권한 · 정책값', '관리자 계정 · 권한 · 정책값', '수수료율 변경', '디자인 옵션 가격', '쿠폰 · 캠페인 · 멤버십 · 광고 운영']);
  assert.deepEqual([R('design.free_threshold'), R('membership.price_monthly')], ['디자인 옵션 가격', '쿠폰 · 캠페인 · 멤버십 · 광고 운영']); // A-REV-04 화면 값 · 권한 표 행 이름대로
});

test('TC-42 S11 결정(2026-10-16) — 디자인비 쿠폰 최소 주문은 묶음의 맞춤 품목 금액·할인 큰 묶음(D51), 구성품 [인쇄 가능] 때 발주 확인(D49), 교환 신청(C-STATE-02), 가격 경고·새 키', () => {
  const NORMAL = { id: 'n', name: '업소용 물티슈', partnerId: 'B', shipKey: 'B-맞춤', qty: 1, tiers: [{ min: 1, price: 300000 }] };
  const order = (items, designGroups, designCoupon) => GC.price.calcOrder({ items, designGroups, shipping: FREE_SHIP, designCoupon });
  const coupon = { name: '맞춤 품목 20만원 이상 디자인비 1만원', type: 'amount', value: 10000, minOrder: 200000 };
  // 일반 상품을 함께 담아도 맞춤 품목 금액(150,000)이 기준 아래면 못 씀 — 부족 금액을 남김
  const short = order([CUSTOM_ITEM({ tiers: [{ min: 1, price: 150000 }] }), NORMAL], [{ id: 'D1', type: 'CUSTOM' }], coupon);
  assert.deepEqual([short.totals.designCoupon, short.designFees[0].couponShort], [0, 50000]);
  // 묶음 둘: 조건을 채운 묶음 가운데 할인이 가장 큰 곳(정률이면 디자인비가 큰 묶음)
  const two = order([
    CUSTOM_ITEM({ tiers: [{ min: 1, price: 250000 }] }),
    CUSTOM_ITEM({ id: 'c2', name: '인쇄 컵홀더', designGroup: 'D2', tiers: [{ min: 1, price: 220000 }], plateFee: 0 }),
    CUSTOM_ITEM({ id: 'c3', name: '인쇄 냅킨', designGroup: 'D2', tiers: [{ min: 1, price: 100000 }], plateFee: 0 }),
  ], [{ id: 'D1', type: 'CUSTOM' }, { id: 'D2', type: 'CUSTOM' }], { ...coupon, type: 'rate', value: 50 });
  assert.deepEqual([two.totals.designCouponGroup, two.totals.designCoupon], ['D2', 29000]); // D1 39,000의 50% < D2 58,000의 50%
  // 같은 할인이면 앞 묶음
  const tie = order([CUSTOM_ITEM({ tiers: [{ min: 1, price: 250000 }] }), CUSTOM_ITEM({ id: 'c2', designGroup: 'D2', tiers: [{ min: 1, price: 220000 }], plateFee: 0 })],
    [{ id: 'D1', type: 'CUSTOM' }, { id: 'D2', type: 'CUSTOM' }], coupon);
  assert.equal(tie.totals.designCouponGroup, 'D1');
  // 맞춤 항목에 붙은 구성품: 본 항목 [인쇄 가능] 때 시스템이 함께 발주 확인
  assert.equal(GC.sm.next('ORDER', 'PAID', 'parent_printable'), 'ACCEPTED');
  // 교환 신청 → 회수·검수 → 교환 승인 → 교환품 출고 → 완료, 7일 미발송은 자동 철회
  const step = (s, e) => GC.sm.next('CLAIM_RETURN', s, e);
  let s = 'EXCHANGE_REQUESTED';
  for (const e of ['pickup', 'collected', 'approve', 'reship', 'delivered']) s = step(s, e);
  assert.equal(s, 'CLAIM_COMPLETED');
  assert.equal(step('EXCHANGE_REQUESTED', 'withdraw'), 'CLAIM_COMPLETED');
  assert.equal(GC.sm.can('CLAIM_RETURN', 'EXCHANGE_REQUESTED', 'photo_inspect'), false); // 사진 증빙 회수 생략은 재제작만
  assert.equal(GC.claim.label('CLAIM_RETURN', 'EXCHANGE_REQUESTED', null, 'EXCHANGE'), '교환 진행 중');
  assert.deepEqual([GC.claim.step('CLAIM_RETURN', 'RETURN_APPROVED', 'EXCHANGE'), GC.claim.step('CLAIM_RETURN', 'EXCHANGE_SHIPPED', 'REMAKE'), GC.claim.step('CLAIM_RETURN', 'RETURN_APPROVED')],
    ['교환 승인', '재제작품 출고', '반품 승인']);
  // 가격 오입력 경고: 절반 이하·3배 이상(+200%)
  assert.deepEqual(GC.price.priceChangeAlert(), { down: -50, up: 200 });
  assert.deepEqual([GC.price.priceChangeCheck(10000, 5000), GC.price.priceChangeCheck(10000, 5100), GC.price.priceChangeCheck(10000, 29900), GC.price.priceChangeCheck(10000, 30000)], ['down', null, null, 'up']);
  // 새 정책값 키
  const g = (k) => GC.Policy.get(k);
  assert.deepEqual([g('partner.onboard_review_bd'), g('partner.onboard_sample_bd'), g('partner.onboard_total_bd'), g('member.biz_manual_bd'), g('member.biz_closed_grace_days')], [3, 5, 10, 1, 30]);
});

test('TC-43 부분 취소 때 디자인비 쿠폰은 다시 보지 않음(D51 · U-MY-02) — 남은 맞춤 품목이 최소 주문 아래여도 할인 유지', () => {
  const input = {
    items: [CUSTOM_ITEM({ tiers: [{ min: 1, price: 200000 }], plateFee: 0 }), CUSTOM_ITEM({ id: 'c2', name: '인쇄 컵홀더', tiers: [{ min: 1, price: 150000 }], plateFee: 0 })],
    designGroups: [{ id: 'D1', type: 'CUSTOM' }], shipping: FREE_SHIP,
    designCoupon: { name: '맞춤 품목 30만원 이상 디자인비 1만원', type: 'amount', value: 10000, minOrder: 300000 },
  };
  const o = GC.price.calcOrder(input);
  assert.deepEqual([o.totals.designFee, o.totals.designCoupon, o.totals.customerTotal], [58000, 10000, 398000]);
  const r = GC.refund.partialCancel({ input, paid: { pg: o.totals.pay, points: 0 }, cancelIds: ['c2'] });
  // 컵홀더에 낸 금액 150,000 + 그 품목의 디자인비 몫(19,000 − 쿠폰 안분 3,275 = 15,725) — 쿠폰 할인 10,000원을 거둬 가지 않고 남은 수저집 디자인비도 다시 보지 않음(D53)
  assert.deepEqual([r.itemsRefund, r.designRefund, r.refund], [150000, 15725, 165725]);
  assert.equal(r.couponsRestored.length, 0); // 쿠폰을 쓴 묶음에 수저집이 남음
});

test('TC-44 취소·환불 D53~D60(2026-10-16) — 첫 시안 뒤 공제는 낸 디자인비만, 생산 지연 취소, 환불 기한·지연배상금, 출고 지연, 반품 사유, 새 전이·키', () => {
  // D54·D60: 멤버십 이용권 묶음(품목 2개)은 추가 품목 디자인비 19,000원만 내고, 디자인비 쿠폰은 쓰지 않음, 첫 시안 뒤 공제는 낸 19,000원
  const vin = { items: [CUSTOM_ITEM({ tiers: [{ min: 1, price: 200000 }], plateFee: 0 }), CUSTOM_ITEM({ id: 'c2', name: '인쇄 컵홀더', tiers: [{ min: 1, price: 100000 }], plateFee: 0 })],
    designGroups: [{ id: 'D1', type: 'CUSTOM', voucher: true }], shipping: FREE_SHIP, designCoupon: { name: '첫 디자인 무료', type: 'free' } };
  const vo = GC.price.calcOrder(vin);
  assert.deepEqual([vo.designFees[0].fee, vo.totals.designCoupon], [19000, 0]);
  assert.deepEqual([GC.refund.designShare(vo.designFees, 'c'), GC.refund.designShare(vo.designFees, 'c2')], [0, 19000]);
  assert.equal(GC.refund.designCancel({ type: 'CUSTOM', stage: 'AFTER_PROPOSAL', itemsAmount: 300000, paidDesignFee: 19000 }).deduction, 19000);
  // D55: 확정 후 취소는 본사 중재·기본 승인
  const ap = GC.refund.designCancel({ type: 'CUSTOM', stage: 'APPROVED', itemsAmount: 300000, paidDesignFee: 39000, plateFee: 50000, plateCost: 30000 });
  assert.deepEqual([ap.claimType, ap.mediation, ap.defaultApprove, ap.refund], ['CUSTOM_CANCEL', true, true, 270000]);
  // D59: 생산 지연이면 [인쇄 가능] 뒤에도 DELAY_CANCEL — 공제 없이 전액, 돌려준 디자인비는 파트너 부담
  const dl = GC.refund.designCancel({ type: 'CUSTOM', stage: 'PRODUCTION', itemsAmount: 300000, paidDesignFee: 39000, productionDelay: true });
  assert.deepEqual([dl.allowed, dl.claimType, dl.deduction, dl.refund, dl.designFeeToPartner, dl.restoreBenefits], [true, 'DELAY_CANCEL', 0, 339000, 39000, true]);
  assert.equal(GC.refund.designCancel({ type: 'CUSTOM', stage: 'PRODUCTION', itemsAmount: 300000 }).allowed, false);
  assert.equal(GC.claim.label('CLAIM_CANCEL', 'CANCEL_REQUESTED', null, 'DELAY_CANCEL'), '취소 중재 중');
  assert.equal(GC.claim.canObject({ claimType: 'DELAY_CANCEL', state: 'CANCEL_REJECTED' }), false);
  assert.equal(GC.sm.next('ORDER_CUSTOM', 'IN_PRODUCTION', 'delay_cancel_approved'), 'CANCELED');
  assert.equal(GC.sm.next('DESIGN', 'IN_PRODUCTION', 'delay_cancel_approved'), 'CANCELED');
  assert.equal(GC.sm.next('ORDER_CUSTOM', 'DELIVERED', 'delay_cancel_collected'), 'RETURNED');
  assert.equal(GC.claim.result('CLAIM_CANCEL', 'CANCEL_REQUESTED', 'mediation_dismiss', 'DELAY_CANCEL'), 'DISMISSED');
  // D58: 출고 지연 뒤 고객 바로 취소, 판정 = 약속 출고일 + 1영업일 끝
  assert.equal(GC.sm.next('ORDER', 'ACCEPTED', 'delay_cancel'), 'CANCELED');
  const promised = new Date(2026, 9, 16, 18, 0); // 금요일
  assert.equal(GC.fmtDate(GC.order.overdueAt(promised), false).slice(0, 10), GC.fmtDate(new Date(2026, 9, 19), false).slice(0, 10)); // 다음 영업일 = 월요일
  assert.equal(GC.order.isOverdue({ promisedAt: promised, now: new Date(2026, 9, 19, 23, 0) }), false);
  assert.equal(GC.order.isOverdue({ promisedAt: promised, now: new Date(2026, 9, 20, 0, 1) }), true);
  assert.equal(GC.order.isOverdue({ promisedAt: promised, now: new Date(2026, 9, 20, 0, 1), shipped: true }), false);
  assert.deepEqual(GC.claim.RETURN_REASONS.map((r) => [r.code, r.fault]), [['CHANGE_MIND', 'customer'], ['DEFECT', 'partner'], ['LATE', 'partner']]);
  assert.equal(GC.claim.shippedLate({ promisedAt: promised, shippedAt: new Date(2026, 9, 19, 10) }), true);
  assert.equal(GC.claim.shippedLate({ promisedAt: promised, shippedAt: new Date(2026, 9, 16, 20) }), false);
  // D56: 검수 일부 승인 전이
  assert.equal(GC.sm.next('CLAIM_RETURN', 'RETURN_INSPECTING', 'partial_approve'), 'RETURN_APPROVED');
  // D57: 환불 기한(회수 완료 + 3영업일 끝)과 지연배상금 = 환불액 × 15% × 지연 일수 ÷ 365
  const due = GC.refund.dueAt(new Date(2026, 9, 16, 15, 0)); // 금 → 수요일 끝
  assert.equal(due.getDate(), 21);
  assert.deepEqual(GC.refund.delayComp({ amount: 300000, dueAt: due, doneAt: new Date(2026, 9, 26, 11, 0) }), { days: 5, rate: 15, comp: 616 }); // 300,000 × 15 × 5 ÷ 36,500 = 616.4
  assert.equal(GC.refund.delayComp({ amount: 300000, dueAt: due, doneAt: new Date(2026, 9, 26), excludeDays: 2 }).days, 3); // 고객 사정(계좌 입력 대기) 제외
  assert.equal(GC.refund.delayComp({ amount: 300000, dueAt: due, doneAt: new Date(2026, 9, 21, 20) }).comp, 0); // 기한 안
  const g = (k) => GC.Policy.get(k);
  assert.deepEqual([g('order.overdue_grace_bd'), g('claim.refund_due_bd'), g('claim.refund_delay_rate')], [1, 3, 15]);
});
