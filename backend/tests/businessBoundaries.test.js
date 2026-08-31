const test = require('node:test');
const assert = require('node:assert/strict');
const { Op } = require('sequelize');

const product = require('../controllers/productController')._internal;
const order = require('../controllers/orderController')._internal;
const evaluation = require('../controllers/evaluationController')._internal;
const address = require('../controllers/addressController')._internal;
const user = require('../controllers/userController')._internal;
const shop = require('../controllers/shopController')._internal;

test('BOUNDARY-PRODUCT-01: 布尔查询参数兼容真假值与空值', () => {
  assert.equal(product.parseBoolean(undefined), undefined);
  assert.equal(product.parseBoolean(''), undefined);
  assert.equal(product.parseBoolean(true), true);
  assert.equal(product.parseBoolean('true'), true);
  assert.equal(product.parseBoolean('1'), true);
  assert.equal(product.parseBoolean('false'), false);
  assert.equal(product.parseBoolean(0), false);
});

test('BOUNDARY-PRODUCT-02: 分页处理默认值、size 别名、上限和偏移', () => {
  assert.deepEqual(product.parsePaging({}), { page: 1, limit: 20, offset: 0 });
  assert.deepEqual(product.parsePaging({ page: '3', size: '15' }), { page: 3, limit: 15, offset: 30 });
  assert.deepEqual(product.parsePaging({ page: '0', limit: '0' }), { page: 1, limit: 1, offset: 0 });
  assert.deepEqual(product.parsePaging({ page: '2', limit: '500' }), { page: 2, limit: 100, offset: 100 });
});

test('BOUNDARY-PRODUCT-03: 商品筛选支持别名、全部分类和不可售商品开关', () => {
  const where = product.buildWhere({
    category: 'all', priceMin: '0.01', priceMax: '99.5', isSecondhand: 'false',
    includeUnavailable: 'true'
  });
  assert.equal(where.category, undefined);
  assert.equal(where.status, undefined);
  assert.equal(where.isSecondhand, false);
  assert.equal(where.price[Op.gte], 0.01);
  assert.equal(where.price[Op.lte], 99.5);

  assert.equal(product.buildWhere({ status: '下架' }).status, '下架');
});

test('BOUNDARY-PRODUCT-04: 未知排序安全回退且 DTO 不修改原对象', () => {
  assert.deepEqual(product.getOrder({ sortBy: 'DROP TABLE' }), [['createdAt', 'DESC']]);
  const raw = {
    id: 1, sellerId: 9, sellerName: '商家', isSecondhand: false,
    images: ['a.png'], videos: null, reviewCount: 0,
    User: { id: 9, username: 'seller', nickname: '', creditScore: 88 }
  };
  const dto = product.toProductDto({ toJSON: () => ({ ...raw, User: { ...raw.User } }) });
  assert.equal(dto.productType, 1);
  assert.equal(dto.seller.nickname, 'seller');
  assert.deepEqual(dto.videos, []);
  assert.ok(raw.User);
});

test('BOUNDARY-ORDER-01: 订单分页限制和 DTO 物流兼容字段', () => {
  assert.deepEqual(order.parsePaging({ page: '4', limit: '25' }), { page: 4, limit: 25, offset: 75 });
  assert.deepEqual(order.parsePaging({ page: '-1', limit: '999' }), { page: 1, limit: 100, offset: 0 });
  const dto = order.toOrderDto({ toJSON: () => ({ id: 1, logisticsInfo: { company: '顺丰' } }) });
  assert.deepEqual(dto.logistics, { company: '顺丰' });
});

test('BOUNDARY-ORDER-02: 卖家商品识别、去重与管理员权限', () => {
  const source = { items: [{ sellerId: '2' }, { sellerId: 2 }, { sellerId: 3 }, { sellerId: 'bad' }] };
  assert.equal(order.hasSellerItem(source, 2), true);
  assert.equal(order.hasSellerItem(source, 8), false);
  assert.deepEqual(order.getOrderSellerIds(source), [2, 3]);
  assert.deepEqual(order.getWritableSellerIds(source, { id: 2, role: 'seller' }), [2]);
  assert.deepEqual(order.getWritableSellerIds(source, { id: 99, role: 'admin' }), [2, 3]);
});

test('BOUNDARY-ORDER-03: 物流信息清洗、合并和完整性判断', () => {
  const current = { company: '旧物流', trackingNumber: 'OLD', steps: [{ description: '已下单' }] };
  const merged = order.mergeLogisticsInfo(current, { company: ' 顺丰 ', trackingNumber: ' SF001 ', remark: '易碎' });
  assert.equal(merged.company, '顺丰');
  assert.equal(merged.trackingNumber, 'SF001');
  assert.equal(merged.remark, '易碎');
  assert.equal(order.hasCompleteLogisticsInfo(merged), true);
  assert.equal(order.hasCompleteLogisticsInfo({ company: '顺丰', trackingNumber: '  ' }), false);
  assert.equal(order.mergeLogisticsInfo(current, null), current);
});

test('BOUNDARY-ORDER-04: 物流轨迹新增在首位且保留既有内容', () => {
  const next = order.appendLogisticsStep({ company: '圆通', steps: [{ description: '已揽收' }] }, '运输中');
  assert.equal(next.company, '圆通');
  assert.equal(next.steps[0].description, '运输中');
  assert.equal(next.steps[1].description, '已揽收');
  assert.ok(next.steps[0].time);
});

test('BOUNDARY-ORDER-05: 议价校验覆盖状态、商品匹配和金额边界', () => {
  const base = {
    message: { type: 'bargain', requestStatus: 'accepted', amount: 80 },
    conversation: { buyerId: 1, sellerId: 2, productId: 3 },
    buyerId: 1, product: { id: 3, sellerId: 2 }, quantity: 1
  };
  assert.equal(order.getBargainValidationError({ ...base, message: null }), '议价申请不存在或尚未成功');
  assert.equal(order.getBargainValidationError({ ...base, message: { ...base.message, requestStatus: 'pending' } }), '议价申请不存在或尚未成功');
  assert.equal(order.getBargainValidationError({ ...base, conversation: { ...base.conversation, productId: 4 } }), '议价申请与商品不匹配');
  assert.equal(order.getBargainValidationError({ ...base, message: { ...base.message, amount: 0 } }), '议价金额无效');
  assert.equal(order.getBargainValidationError({ ...base, message: { ...base.message, amount: 'bad' } }), '议价金额无效');
});

test('BOUNDARY-EVALUATION-01: 回复线程过滤空内容并规范买卖家身份', () => {
  const reply = JSON.stringify([
    { role: 'buyer', content: '  追问  ' },
    { role: 'unexpected', content: '答复' },
    { role: 'seller', content: '   ' }
  ]);
  const replies = evaluation.parseReplyThread(reply, { id: 7, userId: 1, sellerId: 2, createdAt: '2026-01-01' });
  assert.equal(replies.length, 2);
  assert.deepEqual(replies.map(item => item.role), ['buyer', 'seller']);
  assert.deepEqual(replies.map(item => item.userId), [1, 2]);
  assert.equal(replies[0].content, '追问');
});

test('BOUNDARY-EVALUATION-02: 空回复和评价 DTO 兼容关联对象', () => {
  assert.deepEqual(evaluation.parseReplyThread(null), []);
  assert.equal(evaluation.getLatestSellerReply([]), '');
  assert.equal(evaluation.isPendingSellerReply([]), true);
  const dto = evaluation.toEvaluationDto({
    toJSON: () => ({
      id: 4, sellerId: 2, userId: 1, reply: '',
      user: { id: 1, username: 'buyer', nickname: '', avatar: null },
      Product: { id: 9, name: '键盘', images: null }
    })
  });
  assert.equal(dto.user.nickname, 'buyer');
  assert.deepEqual(dto.product.images, []);
  assert.equal(dto.Product, undefined);
  assert.equal(dto.pendingSellerReply, true);
});

test('BOUNDARY-ADDRESS-01: 空地址输入生成标识并转换默认值', () => {
  const normalized = address.normalizeInput({}, 3, 8);
  assert.match(normalized.id, /^8-\d+-3$/);
  assert.equal(normalized.userId, 8);
  assert.equal(normalized.name, '');
  assert.equal(normalized.isDefault, false);
});

test('BOUNDARY-USER-01: 注册输入逐项验证且邮箱规则拒绝空白', () => {
  assert.equal(user.isValidEmail('a@b.com'), true);
  assert.equal(user.isValidEmail(' a@b.com '), false);
  assert.equal(user.validateRegisterPayload({ email: 'a@b.com', phone: '1', password: '123456' }), '用户名不能为空');
  assert.equal(user.validateRegisterPayload({ username: 'u', email: 'a@b.com', password: '123456' }), '手机号不能为空');
});

test('BOUNDARY-SHOP-01: 默认店铺优先昵称且信用分零值不被覆盖', () => {
  assert.equal(shop.buildDefaultShop({ id: 1, username: 'u', nickname: '昵称' }).name, '昵称的店铺');
  assert.equal(shop.toOwnerCreditDto({ id: 1, username: 'u', creditScore: 0 }).creditScore, 0);
});
