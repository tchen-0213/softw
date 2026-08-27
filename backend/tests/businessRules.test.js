const test = require('node:test');
const assert = require('node:assert/strict');
const { Op } = require('sequelize');

const productRules = require('../controllers/productController')._internal;
const addressRules = require('../controllers/addressController')._internal;
const chatRules = require('../controllers/chatController')._internal;
const orderRules = require('../controllers/orderController')._internal;
const evaluationRules = require('../controllers/evaluationController')._internal;
const shopRules = require('../controllers/shopController')._internal;

test('UNIT-TC02: 商品筛选、排序和分页规则', () => {
  assert.deepEqual(productRules.parsePaging({ page: '-2', limit: '999' }), {
    page: 1,
    limit: 100,
    offset: 0
  });
  const where = productRules.buildWhere({
    keyword: '手机',
    category: '数码',
    minPrice: '100',
    maxPrice: '500',
    isSecondhand: 'true'
  });
  assert.equal(where.category, '数码');
  assert.equal(where.status, '在售');
  assert.equal(where.isSecondhand, true);
  assert.equal(where.price[Op.gte], 100);
  assert.equal(where.price[Op.lte], 500);
  assert.equal(where[Op.or][0].name[Op.like], '%手机%');
  assert.deepEqual(productRules.getOrder({ sort: 'price_asc' }), [['price', 'ASC']]);
});

test('UNIT-TC05: 二手商品 DTO 和议价开关规则', () => {
  const dto = productRules.toProductDto({
    id: 5,
    sellerId: 2,
    sellerName: 'seller',
    isSecondhand: true,
    images: null,
    reviewCount: 3,
    bargainEnabled: false
  });
  assert.equal(dto.productType, 2);
  assert.equal(dto.bargainEnabled, false);
  assert.equal(dto.evaluationCount, 3);
  assert.deepEqual(dto.images, []);
});

test('UNIT-TC06: 店铺默认状态和信用信息兜底规则', () => {
  assert.deepEqual(shopRules.buildDefaultShop({ id: 7, username: 'owner', avatar: null }), {
    userId: 7,
    name: 'owner的店铺',
    avatar: '',
    description: '欢迎来到我的店铺。',
    status: '待认证',
    verificationStatus: '未认证'
  });
  assert.deepEqual(shopRules.toOwnerCreditDto({ id: 7, username: 'owner' }), {
    id: 7,
    username: 'owner',
    nickname: 'owner',
    avatar: '',
    creditLevel: '普通',
    creditScore: 100
  });
});

test('UNIT-TC07: 评价回复兼容、待回复状态和分页规则', () => {
  const legacy = evaluationRules.parseReplyThread('旧版卖家回复', {
    id: 3,
    sellerId: 9,
    createdAt: '2026-08-25T00:00:00.000Z'
  });
  assert.equal(legacy.length, 1);
  assert.equal(legacy[0].role, 'seller');
  assert.equal(evaluationRules.getLatestSellerReply(legacy), '旧版卖家回复');
  assert.equal(evaluationRules.isPendingSellerReply(legacy), false);
  assert.equal(evaluationRules.isPendingSellerReply([...legacy, { role: 'buyer' }]), true);
  assert.deepEqual(evaluationRules.parsePaging({ page: '0', limit: '200' }), {
    page: 1,
    limit: 100,
    offset: 0
  });
});

test('UNIT-TC08: 聊天参与者、商家权限和已购判定规则', () => {
  const conversation = { buyerId: 10, sellerId: 20 };
  assert.equal(chatRules.isParticipant(conversation, '10'), true);
  assert.equal(chatRules.isParticipant(conversation, 30), false);
  assert.equal(chatRules.isSeller(conversation, '20'), true);
  assert.equal(chatRules.isPurchasedOrder({
    status: '待发货',
    paymentStatus: '已支付',
    items: [{ productId: 8 }]
  }, '8'), true);
  assert.equal(chatRules.isPurchasedOrder({
    status: '已取消',
    paymentStatus: '已支付',
    items: [{ productId: 8 }]
  }, 8), false);
});

test('UNIT-TC08-BARGAIN: 议价订单仅允许成功议价买家按约定价格购买一次', () => {
  const base = {
    message: { type: 'bargain', requestStatus: 'accepted', amount: 80, redeemedAt: null },
    conversation: { buyerId: 10, sellerId: 20, productId: 30 },
    buyerId: 10,
    product: { id: 30, sellerId: 20 },
    quantity: 1
  };

  assert.equal(orderRules.getBargainValidationError(base), '');
  assert.equal(orderRules.getBargainValidationError({ ...base, buyerId: 11 }), '该议价不属于当前买家');
  assert.equal(orderRules.getBargainValidationError({
    ...base,
    message: { ...base.message, redeemedAt: new Date() }
  }), '该议价已经用于下单');
  assert.equal(orderRules.getBargainValidationError({ ...base, quantity: 2 }), '议价商品每次只能购买一件');
});

test('UNIT-TC09: 地址输入清理和输出类型规则', () => {
  const input = addressRules.normalizeInput({
    id: 4,
    name: ' 张三 ',
    phone: ' 13800000000 ',
    address: ' 教学楼 101 ',
    isDefault: 1
  }, 0, 6);
  assert.equal(input.id, '4');
  assert.equal(input.userId, 6);
  assert.equal(input.name, '张三');
  assert.equal(input.phone, '13800000000');
  assert.equal(input.address, '教学楼 101');
  assert.equal(input.isDefault, true);
  assert.deepEqual(addressRules.normalizeAddress(input), {
    id: '4',
    name: '张三',
    phone: '13800000000',
    address: '教学楼 101',
    isDefault: true
  });
});
