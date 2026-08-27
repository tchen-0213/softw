const test = require('node:test');
const assert = require('node:assert/strict');

const { _internal } = require('../controllers/orderController');

test('UNIT-TC04: seller order dto keeps only current seller items', () => {
  const order = {
    toJSON: () => ({
      id: 1,
      logisticsInfo: { company: 'test' },
      items: [
        { productId: 1, sellerId: 10, name: 'A' },
        { productId: 2, sellerId: 20, name: 'B' }
      ]
    })
  };

  const dto = _internal.toSellerOrderDto(order, 10);

  assert.equal(dto.items.length, 1);
  assert.equal(dto.items[0].name, 'A');
  assert.deepEqual(dto.logistics, { company: 'test' });
});
