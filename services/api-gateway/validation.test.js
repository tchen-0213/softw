const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateEvaluationPayload,
  validateNewPassword,
  validateOrderItems,
  validateProductPayload,
  validateProfilePayload,
  validateShippingAddress
} = require('../common/validation');

test('MS-VALIDATION-01: 商品创建和部分更新校验业务边界', () => {
  const valid = { name: '微服务商品', description: '完整描述', category: 'books', price: 8.8, stock: 0, images: [] };
  assert.equal(validateProductPayload(valid), null);
  assert.match(validateProductPayload({ ...valid, price: -1 }), /价格/);
  assert.match(validateProductPayload({ ...valid, stock: 0.5 }), /库存/);
  assert.equal(validateProductPayload({ status: '下架' }, { partial: true }), null);
  assert.match(validateProductPayload({ name: '' }, { partial: true }), /名称/);
});

test('MS-VALIDATION-02: 订单项拒绝空列表、非法标识和非正整数数量', () => {
  assert.equal(validateOrderItems([{ productId: 1, quantity: 2 }]), null);
  assert.match(validateOrderItems([]), /不能为空/);
  assert.match(validateOrderItems([{ productId: 0, quantity: 1 }]), /标识/);
  assert.match(validateOrderItems([{ productId: 1, quantity: 'NaN' }]), /数量/);
  assert.equal(validateShippingAddress({ name: '买家', phone: '13800138000', address: '测试路' }), null);
  assert.match(validateShippingAddress({ name: '买家', phone: '', address: '测试路' }), /手机号/);
});

test('MS-VALIDATION-03: 评价约束订单商品、星级、正文和图片', () => {
  const valid = { orderId: 1, productId: 2, rating: 5, content: '很好', images: [] };
  assert.equal(validateEvaluationPayload(valid), null);
  assert.match(validateEvaluationPayload({ ...valid, rating: 0 }), /评分/);
  assert.match(validateEvaluationPayload({ ...valid, content: ' ' }), /内容/);
  assert.match(validateEvaluationPayload({ ...valid, images: 'bad' }), /图片/);
});

test('MS-VALIDATION-04: 资料与密码校验覆盖格式和枚举边界', () => {
  assert.equal(validateProfilePayload({ email: 'x@example.com', gender: 'female', birthday: '2026-09-01' }), null);
  assert.match(validateProfilePayload({ email: '@bad' }), /邮箱/);
  assert.match(validateProfilePayload({ gender: 'invalid' }), /性别/);
  assert.match(validateProfilePayload({ birthday: 'invalid' }), /生日/);
  assert.equal(validateNewPassword('Secret1'), null);
  assert.match(validateNewPassword('123'), /6位/);
});
