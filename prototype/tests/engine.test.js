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

test('TC-07 부분 취소 두 번(냅킨 → 수저집) — 45,000원(660P + 44,340원) 뒤 잔액 전부', () => {
  const input = exampleInput();
  const first = GC.refund.partialCancel({ input, paid: { pg: 134000, points: 2000 }, cancelIds: ['napkin'] });
  assert.equal(first.blocked, false);
  assert.equal(first.remainingTotal, 91000);
  assert.equal(first.refund, 45000);
  assert.equal(first.pointRefund, 660);
  assert.equal(first.pgRefund, 44340);
  const second = GC.refund.partialCancel({ input, paid: { pg: 134000, points: 2000 }, refunded: { pg: 44340, points: 660 }, cancelIds: ['napkin', 'spoon'] });
  assert.equal(second.refund, 91000);
  assert.equal(second.pointRefund, 1340);
  assert.equal(second.pgRefund, 89660);
});

test('TC-08 환불액이 0원 이하 — 출고 전 부분 취소는 막고, 반품은 0원 환불 + 차액 7,200원', () => {
  const input = {
    items: [
      { id: 'a', name: '수저집 9박스', partnerId: 'A', shipKey: 'A', qty: 9, tiers: SPOON_TIERS, instant: { type: 'rate', value: 10 } },
      { id: 'b', name: '수저집 1박스(분할)', partnerId: 'A', shipKey: 'A', qty: 1, tiers: SPOON_TIERS, instant: { type: 'rate', value: 10 } },
    ],
    shipping: { A: { name: 'A', type: 'free', base: 0 } },
  };
  // 결제 시점: 10박스 구간 단가 → 9,000 × 10 = 90,000 (분할 항목은 같은 단가로 결제된 상태를 재현)
  const paid = { pg: 90000, points: 0 };
  const tierInput = { ...input, items: input.items.map((it) => ({ ...it, tiers: [{ min: 1, price: 12000 }, { min: 9, price: 12000 }] })) };
  const before = GC.refund.partialCancel({ input: tierInput, paid, cancelIds: ['b'] });
  assert.equal(before.remainingTotal, 97200);
  assert.equal(before.blocked, true);
  const ret = GC.refund.partialCancel({ input: tierInput, paid, cancelIds: ['b'], mode: 'return' });
  assert.equal(ret.zeroRefund, true);
  assert.equal(ret.shortfall, 7200);
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
  const free = { type: 'CUSTOM', itemsAmount: 600000, paidDesignFee: 0, freeCustom: true, plateFee: 50000 };
  assert.equal(GC.refund.designCancel({ ...free, stage: 'AFTER_PROPOSAL' }).refund, 561000);
  assert.equal(GC.refund.designCancel({ ...free, stage: 'APPROVED', plateCost: 50000 }).refund, 511000);
  assert.equal(GC.refund.designCancel({ ...free, stage: 'APPROVED', plateCost: 30000 }).refund, 531000);
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
  const normal = GC.settle.confirmEvent({ sale: 160000, partnerDisc: 10000, rate: GC.settle.finalRate({ base: 10 }).rate, shipping: 4000 });
  assert.equal(normal.fee, 15000);
  assert.equal(normal.feeSupply, 13636);
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
