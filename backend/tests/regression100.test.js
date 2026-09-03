const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isNonEmptyText,
  isPositiveInteger,
  validateEvaluationPayload,
  validateNewPassword,
  validateOrderItems,
  validateProductPayload,
  validateProfilePayload,
  validateShippingAddress
} = require('../utils/inputValidation');
const {
  getCreditDeltaByRating,
  getCreditLevel,
  getLowRatingPenalty,
  getShippingCreditDelta,
  isOverdueShipmentCancellation
} = require('../utils/creditRules');

const NOT_NULL = Symbol('not-null');
const cases = [];

const add = (name, run, expected) => cases.push({ name, run, expected });

[
  [1, true], [2, true], [3, true], [10, true], [999, true], ['1', true], ['02', true], [1.0, true],
  [0, false], [-1, false], ['-1', false], [1.5, false], ['1.5', false], ['', false], [null, false],
  [undefined, false], [NaN, false], [Infinity, false], [false, false], [{}, false]
].forEach(([value, expected], index) => add(`positive integer ${index + 1}`, () => isPositiveInteger(value), expected));

[
  ['plain text', () => validateProductPayload({ name: 'n', description: 'd', category: 'c', price: 1 }), null],
  ['string price', () => validateProductPayload({ name: 'n', description: 'd', category: 'c', price: '1.50' }), null],
  ['zero stock', () => validateProductPayload({ name: 'n', description: 'd', category: 'c', price: 1, stock: 0 }), null],
  ['media arrays', () => validateProductPayload({ name: 'n', description: 'd', category: 'c', price: 1, images: [], videos: [] }), null],
  ['partial update', () => validateProductPayload({ price: 2 }, { partial: true }), null],
  ['missing name', () => validateProductPayload({ description: 'd', category: 'c', price: 1 }), NOT_NULL],
  ['blank name', () => validateProductPayload({ name: ' ', description: 'd', category: 'c', price: 1 }), NOT_NULL],
  ['missing description', () => validateProductPayload({ name: 'n', category: 'c', price: 1 }), NOT_NULL],
  ['blank description', () => validateProductPayload({ name: 'n', description: '\t', category: 'c', price: 1 }), NOT_NULL],
  ['missing category', () => validateProductPayload({ name: 'n', description: 'd', price: 1 }), NOT_NULL],
  ['zero price', () => validateProductPayload({ name: 'n', description: 'd', category: 'c', price: 0 }), NOT_NULL],
  ['negative price', () => validateProductPayload({ name: 'n', description: 'd', category: 'c', price: -1 }), NOT_NULL],
  ['invalid price', () => validateProductPayload({ name: 'n', description: 'd', category: 'c', price: 'x' }), NOT_NULL],
  ['fractional stock', () => validateProductPayload({ name: 'n', description: 'd', category: 'c', price: 1, stock: 1.2 }), NOT_NULL],
  ['negative stock', () => validateProductPayload({ name: 'n', description: 'd', category: 'c', price: 1, stock: -1 }), NOT_NULL],
  ['invalid images', () => validateProductPayload({ name: 'n', description: 'd', category: 'c', price: 1, images: 'x' }), NOT_NULL],
  ['invalid videos', () => validateProductPayload({ name: 'n', description: 'd', category: 'c', price: 1, videos: 'x' }), NOT_NULL],
  ['defect without explanation', () => validateProductPayload({ name: 'n', description: 'd', category: 'c', price: 1, hasDefect: true }), NOT_NULL],
  ['partial blank category', () => validateProductPayload({ category: '' }, { partial: true }), NOT_NULL],
  ['partial valid defect', () => validateProductPayload({ hasDefect: true, defectDescription: 'small mark' }, { partial: true }), null]
].forEach(([name, run, expected]) => add(`product payload ${name}`, run, expected));

[
  ['one item', () => validateOrderItems([{ productId: 1, quantity: 1 }]), null],
  ['id alias', () => validateOrderItems([{ id: '2' }]), null],
  ['string values', () => validateOrderItems([{ productId: '3', quantity: '4' }]), null],
  ['multiple items', () => validateOrderItems([{ productId: 1 }, { productId: 2, quantity: 2 }]), null],
  ['empty list', () => validateOrderItems([]), NOT_NULL],
  ['missing list', () => validateOrderItems(), NOT_NULL],
  ['null list', () => validateOrderItems(null), NOT_NULL],
  ['missing id', () => validateOrderItems([{ quantity: 1 }]), NOT_NULL],
  ['zero id', () => validateOrderItems([{ productId: 0 }]), NOT_NULL],
  ['negative id', () => validateOrderItems([{ productId: -1 }]), NOT_NULL],
  ['fractional id', () => validateOrderItems([{ productId: 1.5 }]), NOT_NULL],
  ['zero quantity', () => validateOrderItems([{ productId: 1, quantity: 0 }]), NOT_NULL],
  ['negative quantity', () => validateOrderItems([{ productId: 1, quantity: -1 }]), NOT_NULL],
  ['fractional quantity', () => validateOrderItems([{ productId: 1, quantity: 1.5 }]), NOT_NULL],
  ['invalid item', () => validateOrderItems([null]), NOT_NULL]
].forEach(([name, run, expected]) => add(`order items ${name}`, run, expected));

[
  ['complete address', () => validateShippingAddress({ name: 'buyer', phone: '13800000000', address: 'street 1' }), null],
  ['long address', () => validateShippingAddress({ name: 'buyer', phone: '13800000000', address: 'a'.repeat(120) }), null],
  ['null address', () => validateShippingAddress(null), NOT_NULL],
  ['array address', () => validateShippingAddress([]), NOT_NULL],
  ['missing name', () => validateShippingAddress({ phone: '13800000000', address: 'street' }), NOT_NULL],
  ['blank name', () => validateShippingAddress({ name: ' ', phone: '13800000000', address: 'street' }), NOT_NULL],
  ['missing phone', () => validateShippingAddress({ name: 'buyer', address: 'street' }), NOT_NULL],
  ['blank phone', () => validateShippingAddress({ name: 'buyer', phone: '', address: 'street' }), NOT_NULL],
  ['missing detail', () => validateShippingAddress({ name: 'buyer', phone: '13800000000' }), NOT_NULL],
  ['blank detail', () => validateShippingAddress({ name: 'buyer', phone: '13800000000', address: '\t' }), NOT_NULL]
].forEach(([name, run, expected]) => add(`shipping address ${name}`, run, expected));

[
  ['complete rating 1', () => validateEvaluationPayload({ orderId: 1, productId: 2, rating: 1, content: 'ok' }), null],
  ['complete rating 5', () => validateEvaluationPayload({ orderId: '1', productId: '2', rating: '5', content: 'great', images: [] }), null],
  ['rating 3', () => validateEvaluationPayload({ orderId: 1, productId: 2, rating: 3, content: 'average' }), null],
  ['missing order', () => validateEvaluationPayload({ productId: 2, rating: 3, content: 'ok' }), NOT_NULL],
  ['zero order', () => validateEvaluationPayload({ orderId: 0, productId: 2, rating: 3, content: 'ok' }), NOT_NULL],
  ['missing product', () => validateEvaluationPayload({ orderId: 1, rating: 3, content: 'ok' }), NOT_NULL],
  ['negative product', () => validateEvaluationPayload({ orderId: 1, productId: -1, rating: 3, content: 'ok' }), NOT_NULL],
  ['fractional order', () => validateEvaluationPayload({ orderId: 1.2, productId: 2, rating: 3, content: 'ok' }), NOT_NULL],
  ['rating zero', () => validateEvaluationPayload({ orderId: 1, productId: 2, rating: 0, content: 'ok' }), NOT_NULL],
  ['rating six', () => validateEvaluationPayload({ orderId: 1, productId: 2, rating: 6, content: 'ok' }), NOT_NULL],
  ['fractional rating', () => validateEvaluationPayload({ orderId: 1, productId: 2, rating: 2.5, content: 'ok' }), NOT_NULL],
  ['missing content', () => validateEvaluationPayload({ orderId: 1, productId: 2, rating: 3 }), NOT_NULL],
  ['blank content', () => validateEvaluationPayload({ orderId: 1, productId: 2, rating: 3, content: ' ' }), NOT_NULL],
  ['invalid images', () => validateEvaluationPayload({ orderId: 1, productId: 2, rating: 3, content: 'ok', images: {} }), NOT_NULL],
  ['empty images', () => validateEvaluationPayload({ orderId: 1, productId: 2, rating: 3, content: 'ok', images: [] }), null]
].forEach(([name, run, expected]) => add(`evaluation payload ${name}`, run, expected));

[
  ['text present', () => isNonEmptyText('hello'), true],
  ['text whitespace', () => isNonEmptyText('  '), false],
  ['non string', () => isNonEmptyText(1), false],
  ['valid email', () => validateProfilePayload({ email: 'buyer@example.com' }), null],
  ['invalid email', () => validateProfilePayload({ email: 'buyer' }), NOT_NULL],
  ['valid gender', () => validateProfilePayload({ gender: 'other' }), null],
  ['invalid gender', () => validateProfilePayload({ gender: 'unknown' }), NOT_NULL],
  ['valid birthday', () => validateProfilePayload({ birthday: '2026-01-01' }), null],
  ['invalid birthday', () => validateProfilePayload({ birthday: 'not-a-date' }), NOT_NULL],
  ['short password', () => validateNewPassword('12345') === null, false]
].forEach(([name, run, expected]) => add(`profile and password ${name}`, run, expected));

[
  ['rating five delta', () => getCreditDeltaByRating(5), 5],
  ['rating four delta', () => getCreditDeltaByRating(4), 3],
  ['rating three delta', () => getCreditDeltaByRating(3), 0],
  ['rating two delta', () => getCreditDeltaByRating(2), -3],
  ['rating one delta', () => getCreditDeltaByRating(1), -5],
  ['level threshold', () => getCreditLevel(89) !== getCreditLevel(90), true],
  ['level ordering', () => getCreditLevel(120) !== getCreditLevel(150), true],
  ['small sample penalty', () => getLowRatingPenalty([1, 2, 5, 5]), 0],
  ['shipping within two days', () => getShippingCreditDelta('2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z'), 2],
  ['overdue after three days', () => isOverdueShipmentCancellation('2026-01-01T00:00:00Z', '2026-01-04T00:00:01Z'), true]
].forEach(([name, run, expected]) => add(`credit rules ${name}`, run, expected));

assert.equal(cases.length, 100, 'the backend regression suite must contain exactly 100 cases');

for (const [index, scenario] of cases.entries()) {
  test(`REG-BE-${String(index + 1).padStart(3, '0')}: ${scenario.name}`, () => {
    const actual = scenario.run();
    if (scenario.expected === NOT_NULL) {
      assert.notEqual(actual, null);
    } else {
      assert.deepEqual(actual, scenario.expected);
    }
  });
}
