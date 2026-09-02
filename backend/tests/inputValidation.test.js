const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isPositiveInteger,
  validateEvaluationPayload,
  validateNewPassword,
  validateOrderItems,
  validateProductPayload,
  validateProfilePayload,
  validateShippingAddress
} = require('../utils/inputValidation');

test('VALIDATION-PRODUCT-01: 完整商品输入接受数值字符串和零库存', () => {
  assert.equal(validateProductPayload({ name: '书', description: '九成新', category: 'books', price: '9.90', stock: 0, images: [] }), null);
});

test('VALIDATION-PRODUCT-02: 商品必填文本逐项拒绝空白', () => {
  assert.equal(validateProductPayload({ description: 'd', category: 'c', price: 1 }), '商品名称不能为空');
  assert.equal(validateProductPayload({ name: 'n', description: ' ', category: 'c', price: 1 }), '商品描述不能为空');
  assert.equal(validateProductPayload({ name: 'n', description: 'd', category: '', price: 1 }), '商品分类不能为空');
});

test('VALIDATION-PRODUCT-03: 商品价格、库存和媒体类型边界有明确错误', () => {
  const base = { name: 'n', description: 'd', category: 'c' };
  assert.match(validateProductPayload({ ...base, price: 0 }), /价格/);
  assert.match(validateProductPayload({ ...base, price: 1, stock: 1.5 }), /库存/);
  assert.match(validateProductPayload({ ...base, price: 1, images: 'x' }), /图片/);
});

test('VALIDATION-PRODUCT-04: 部分更新只校验提交字段且瑕疵需要说明', () => {
  assert.equal(validateProductPayload({ price: 2 }, { partial: true }), null);
  assert.match(validateProductPayload({ name: ' ' }, { partial: true }), /名称/);
  assert.match(validateProductPayload({ hasDefect: true }, { partial: true }), /瑕疵说明/);
});

test('VALIDATION-ORDER-01: 订单接受正整数和可转换数值', () => {
  assert.equal(validateOrderItems([{ productId: '7', quantity: '2' }, { id: 8 }]), null);
  assert.equal(isPositiveInteger('3'), true);
});

test('VALIDATION-ORDER-02: 空订单、非法商品和非法数量全部拒绝', () => {
  assert.equal(validateOrderItems([]), '订单商品不能为空');
  assert.match(validateOrderItems([{ productId: 'x', quantity: 1 }]), /商品标识/);
  for (const quantity of [0, -1, 1.5, 'abc']) assert.match(validateOrderItems([{ productId: 1, quantity }]), /数量/);
});

test('VALIDATION-ORDER-03: 收货地址逐项校验联系人、电话和详细地址', () => {
  const valid = { name: '买家', phone: '13800138000', address: '测试路 1 号' };
  assert.equal(validateShippingAddress(valid), null);
  assert.match(validateShippingAddress(null), /收货地址/);
  for (const field of ['name', 'phone', 'address']) {
    assert.match(validateShippingAddress({ ...valid, [field]: ' ' }), /不能为空/);
  }
});

test('VALIDATION-EVALUATION-01: 完整评价接受1到5星边界', () => {
  assert.equal(validateEvaluationPayload({ orderId: 1, productId: 2, rating: 1, content: '一般', images: [] }), null);
  assert.equal(validateEvaluationPayload({ orderId: 1, productId: 2, rating: '5', content: '很好' }), null);
});

test('VALIDATION-EVALUATION-02: 评价标识、星级、内容和图片类型逐项拒绝', () => {
  assert.match(validateEvaluationPayload({}), /订单标识/);
  assert.match(validateEvaluationPayload({ orderId: 1 }), /商品标识/);
  assert.match(validateEvaluationPayload({ orderId: 1, productId: 2, rating: 6, content: 'x' }), /评分/);
  assert.match(validateEvaluationPayload({ orderId: 1, productId: 2, rating: 5, content: ' ' }), /内容/);
  assert.match(validateEvaluationPayload({ orderId: 1, productId: 2, rating: 5, content: 'x', images: {} }), /图片/);
});

test('VALIDATION-PROFILE-01: 合法资料与空生日可通过', () => {
  assert.equal(validateProfilePayload({ email: 'buyer@example.com', phone: '13800138000', gender: 'other', birthday: '' }), null);
});

test('VALIDATION-PROFILE-02: 邮箱、手机号、性别和生日逐项拒绝非法值', () => {
  assert.match(validateProfilePayload({ email: 'bad' }), /邮箱/);
  assert.match(validateProfilePayload({ phone: '' }), /手机号/);
  assert.match(validateProfilePayload({ gender: 'unknown' }), /性别/);
  assert.match(validateProfilePayload({ birthday: 'not-a-date' }), /生日/);
});

test('VALIDATION-PASSWORD-01: 新密码最少6位', () => {
  assert.equal(validateNewPassword('123456'), null);
  assert.match(validateNewPassword('12345'), /6位/);
  assert.match(validateNewPassword(null), /6位/);
});
