const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getCreditDeltaByRating,
  getCreditLevel,
  getLowRatingPenalty,
  getShippingCreditDelta,
  isOverdueShipmentCancellation
} = require('../utils/creditRules');

test('credit level is derived from normalized score thresholds', () => {
  assert.equal(getCreditLevel(-10), '风险');
  assert.equal(getCreditLevel(90), '普通');
  assert.equal(getCreditLevel(120), '银牌');
  assert.equal(getCreditLevel(150), '金牌');
  assert.equal(getCreditLevel(180), '钻石');
});

test('rating maps to seller credit delta', () => {
  assert.equal(getCreditDeltaByRating(5), 5);
  assert.equal(getCreditDeltaByRating(4), 3);
  assert.equal(getCreditDeltaByRating(3), 0);
  assert.equal(getCreditDeltaByRating(2), -3);
  assert.equal(getCreditDeltaByRating(1), -5);
});

test('low rating penalty requires enough samples and ratio threshold', () => {
  assert.equal(getLowRatingPenalty([1, 2, 5, 5]), 0);
  assert.equal(getLowRatingPenalty([1, 2, 5, 5, 5, 5]), -6);
  assert.equal(getLowRatingPenalty([1, 2, 2, 5, 5]), -12);
});

test('UNIT-TC04-ALT: shipping credit delta rewards timely shipping and penalizes overdue shipping', () => {
  const paidAt = new Date('2026-08-25T08:00:00Z');

  assert.equal(getShippingCreditDelta(paidAt, new Date('2026-08-26T08:00:00Z')), 2);
  assert.equal(getShippingCreditDelta(paidAt, new Date('2026-08-28T07:00:00Z')), -3);
  assert.equal(getShippingCreditDelta(paidAt, new Date('2026-08-29T08:00:00Z')), -5);
  assert.equal(isOverdueShipmentCancellation(paidAt, new Date('2026-08-28T09:00:00Z')), true);
});
