const test = require('node:test');
const assert = require('node:assert/strict');
const { Op } = require('sequelize');

const product = require('../controllers/productController')._internal;
const order = require('../controllers/orderController')._internal;
const evaluation = require('../controllers/evaluationController')._internal;
const address = require('../controllers/addressController')._internal;
const { authorizeRoles, protect } = require('../middleware/auth');
const {
  validateEvaluationPayload,
  validateOrderItems,
  validateProductPayload,
  validateProfilePayload,
  validateShippingAddress
} = require('../utils/inputValidation');

const response = () => ({
  statusCode: 200,
  body: null,
  headers: {},
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  setHeader(name, value) { this.headers[name] = value; }
});

test('BACKEND-ADD-01: 商品布尔参数明确识别 false 别名', () => {
  assert.equal(product.parseBoolean(false), false);
  assert.equal(product.parseBoolean('false'), false);
  assert.equal(product.parseBoolean('0'), false);
  assert.equal(product.parseBoolean(null), undefined);
});

test('BACKEND-ADD-02: 商品分页兼容 size 并限制最小页容量', () => {
  assert.deepEqual(product.parsePaging({ page: '2', size: '0' }), {
    page: 2,
    limit: 1,
    offset: 1
  });
});

test('BACKEND-ADD-03: 商品列表默认只查询在售商品', () => {
  const where = product.buildWhere({ keyword: '  耳机  ' });
  assert.equal(where.status, '在售');
  assert.equal(where[Op.or][0].name[Op.like], '%耳机%');
});

test('BACKEND-ADD-04: 商品列表显式状态覆盖默认在售过滤', () => {
  const where = product.buildWhere({ status: '下架', includeUnavailable: 'false' });
  assert.equal(where.status, '下架');
});

test('BACKEND-ADD-05: 商品价格筛选支持只有最高价的场景', () => {
  const where = product.buildWhere({ maxPrice: '50' });
  assert.equal(where.price[Op.lte], 50);
  assert.equal(where.price[Op.gte], undefined);
});

test('BACKEND-ADD-06: 商品排序白名单覆盖销量、评分和降价', () => {
  assert.deepEqual(product.getOrder({ sort: 'sales' }), [['sales', 'DESC']]);
  assert.deepEqual(product.getOrder({ sort: 'rating' }), [['rating', 'DESC']]);
  assert.deepEqual(product.getOrder({ sort: 'price_desc' }), [['price', 'DESC']]);
});

test('BACKEND-ADD-07: 商品 DTO 在缺少关联卖家时使用卖家字段兜底', () => {
  const dto = product.toProductDto({
    id: 3,
    sellerId: 9,
    sellerName: '个人卖家',
    isSecondhand: false,
    images: null,
    videos: null
  });
  assert.deepEqual(dto.images, []);
  assert.deepEqual(dto.videos, []);
  assert.equal(dto.seller.id, 9);
  assert.equal(dto.seller.nickname, '个人卖家');
  assert.equal(dto.productType, 1);
});

test('BACKEND-ADD-08: 商品 DTO 默认允许议价并映射评价数量', () => {
  const dto = product.toProductDto({
    id: 4,
    sellerId: 1,
    sellerName: 'seller',
    isSecondhand: true,
    images: ['a.png'],
    videos: ['v.mp4'],
    reviewCount: 6
  });
  assert.equal(dto.bargainEnabled, true);
  assert.equal(dto.evaluationCount, 6);
  assert.equal(dto.productType, 2);
});

test('BACKEND-ADD-09: 订单 DTO 暴露 logistics 兼容字段', () => {
  const dto = order.toOrderDto({ id: 1, logisticsInfo: { status: '运输中' } });
  assert.deepEqual(dto.logistics, { status: '运输中' });
});

test('BACKEND-ADD-10: 卖家订单 DTO 过滤非当前卖家的明细', () => {
  const dto = order.toSellerOrderDto({
    id: 2,
    items: [
      { sellerId: 1, name: 'A' },
      { sellerId: 2, name: 'B' }
    ]
  }, 3);
  assert.deepEqual(dto.items, []);
});

test('BACKEND-ADD-11: 订单卖家识别兼容字符串 ID 并处理空明细', () => {
  assert.equal(order.hasSellerItem({ items: [{ sellerId: '8' }] }, 8), true);
  assert.equal(order.hasSellerItem({ items: [] }, 8), false);
  assert.equal(order.hasSellerItem({}, 8), false);
});

test('BACKEND-ADD-12: 订单卖家集合会去重并过滤非法值', () => {
  assert.deepEqual(order.getOrderSellerIds({
    items: [{ sellerId: '2' }, { sellerId: 2 }, { sellerId: null }, { sellerId: 'bad' }]
  }), [2]);
});

test('BACKEND-ADD-13: 普通卖家只能写自己的订单分片', () => {
  assert.deepEqual(order.getWritableSellerIds({
    items: [{ sellerId: 1 }, { sellerId: 2 }]
  }, { id: 3, role: 'seller' }), []);
});

test('BACKEND-ADD-14: 物流合并会修剪新单号并保留原轨迹', () => {
  const merged = order.mergeLogisticsInfo(
    { status: '运输中', steps: [{ description: '已揽收' }] },
    { trackingNumber: '  YT001  ' }
  );
  assert.equal(merged.status, '运输中');
  assert.equal(merged.trackingNumber, 'YT001');
  assert.equal(merged.steps.length, 1);
});

test('BACKEND-ADD-15: 发货完整性同时要求物流公司和单号', () => {
  assert.equal(order.hasCompleteLogisticsInfo(null), false);
  assert.equal(order.hasCompleteLogisticsInfo({ company: '顺丰' }), false);
  assert.equal(order.hasCompleteLogisticsInfo({ company: '顺丰', trackingNumber: 'SF001' }), true);
});

test('BACKEND-ADD-16: 新增物流轨迹可从空历史开始', () => {
  const next = order.appendLogisticsStep(null, '卖家已发货');
  assert.equal(next.steps.length, 1);
  assert.equal(next.steps[0].description, '卖家已发货');
});

test('BACKEND-ADD-17: 议价校验拒绝卖家与商品不匹配', () => {
  const message = { type: 'bargain', requestStatus: 'accepted', amount: 20 };
  const conversation = { buyerId: 1, sellerId: 2, productId: 3 };
  const productItem = { id: 3, sellerId: 9 };
  assert.equal(order.getBargainValidationError({
    message,
    conversation,
    buyerId: 1,
    product: productItem,
    quantity: 1
  }), '议价申请与商品不匹配');
});

test('BACKEND-ADD-18: 议价校验兼容可转换的字符串 ID 和金额', () => {
  assert.equal(order.getBargainValidationError({
    message: { type: 'bargain', requestStatus: 'accepted', amount: '19.9' },
    conversation: { buyerId: '1', sellerId: '2', productId: '3' },
    buyerId: 1,
    product: { id: 3, sellerId: 2 },
    quantity: 1
  }), '');
});

test('BACKEND-ADD-19: 评价分页限制页码、页容量和偏移量', () => {
  assert.deepEqual(evaluation.parsePaging({ page: '3', limit: '2' }), {
    page: 3,
    limit: 2,
    offset: 4
  });
});

test('BACKEND-ADD-20: 评价回复项会清洗内容并补齐买家身份', () => {
  const item = evaluation.normalizeReplyItem({ role: 'buyer', content: '  继续追问  ' }, 0, {
    id: 5,
    userId: 7,
    sellerId: 8,
    createdAt: '2026-09-02'
  });
  assert.equal(item.id, '5-0');
  assert.equal(item.role, 'buyer');
  assert.equal(item.userId, 7);
  assert.equal(item.content, '继续追问');
});

test('BACKEND-ADD-21: 评价回复线程会过滤空回复并规范角色', () => {
  const replies = evaluation.parseReplyThread(JSON.stringify([
    { role: 'buyer', content: '追问' },
    { role: 'seller', content: ' ' },
    { role: 'other', content: '答复' }
  ]), { id: 6, userId: 1, sellerId: 2 });
  assert.equal(replies.length, 2);
  assert.deepEqual(replies.map(item => item.role), ['buyer', 'seller']);
});

test('BACKEND-ADD-22: 非 JSON 的旧评价回复按卖家回复兼容', () => {
  const replies = evaluation.parseReplyThread('  旧回复  ', { id: 6, sellerId: 2 });
  assert.equal(replies.length, 1);
  assert.equal(replies[0].role, 'seller');
  assert.equal(replies[0].content, '旧回复');
});

test('BACKEND-ADD-23: 最新卖家回复忽略后续买家追问', () => {
  assert.equal(evaluation.getLatestSellerReply([
    { role: 'seller', content: '第一次回复' },
    { role: 'buyer', content: '继续追问' }
  ]), '第一次回复');
});

test('BACKEND-ADD-24: 最近一条为卖家回复时不再标记待回复', () => {
  assert.equal(evaluation.isPendingSellerReply([
    { role: 'buyer', content: '问题' },
    { role: 'seller', content: '答复' }
  ]), false);
});

test('BACKEND-ADD-25: 评价 DTO 支持已回复线程并保留买家展示名', () => {
  const dto = evaluation.toEvaluationDto({
    toJSON: () => ({
      id: 8,
      userId: 1,
      sellerId: 2,
      reply: JSON.stringify([{ role: 'seller', content: '谢谢支持' }]),
      user: { id: 1, username: 'buyer', nickname: '买家昵称', avatar: 'a.png' }
    })
  });
  assert.equal(dto.user.nickname, '买家昵称');
  assert.equal(dto.reply, '谢谢支持');
  assert.equal(dto.pendingSellerReply, false);
});

test('BACKEND-ADD-26: 地址输入归一化会修剪文本并保留用户归属', () => {
  const normalized = address.normalizeInput({
    name: ' 李四 ',
    phone: ' 13800138000 ',
    address: ' 图书馆 2 楼 '
  }, 2, 10);
  assert.equal(normalized.userId, 10);
  assert.equal(normalized.name, '李四');
  assert.equal(normalized.phone, '13800138000');
  assert.equal(normalized.address, '图书馆 2 楼');
});

test('BACKEND-ADD-27: 地址输出会统一字符串 ID 和布尔默认值', () => {
  assert.deepEqual(address.normalizeAddress({
    id: 12,
    name: '王五',
    phone: '13900139000',
    address: '宿舍楼',
    isDefault: 1
  }), {
    id: '12',
    name: '王五',
    phone: '13900139000',
    address: '宿舍楼',
    isDefault: true
  });
});

test('BACKEND-ADD-28: 商品输入校验接受带瑕疵说明的二手商品媒体数组', () => {
  assert.equal(validateProductPayload({
    name: '相机',
    description: '有轻微使用痕迹',
    category: '数码',
    price: '500',
    stock: '1',
    images: ['a.png'],
    videos: ['v.mp4'],
    hasDefect: true,
    defectDescription: '外壳轻微划痕'
  }), null);
});

test('BACKEND-ADD-29: 商品部分更新拒绝非法视频字段', () => {
  assert.equal(validateProductPayload({ videos: 'bad' }, { partial: true }), '商品视频必须是数组');
});

test('BACKEND-ADD-30: 订单商品校验允许省略数量但拒绝空商品标识', () => {
  assert.equal(validateOrderItems([{ productId: 3 }]), null);
  assert.equal(validateOrderItems([{ productId: null, quantity: 1 }]), '订单商品标识必须是正整数');
});

test('BACKEND-ADD-31: 收货地址校验拒绝数组类型', () => {
  assert.equal(validateShippingAddress([]), '收货地址不能为空');
});

test('BACKEND-ADD-32: 评价校验拒绝小数星级', () => {
  assert.equal(validateEvaluationPayload({
    orderId: 1,
    productId: 2,
    rating: '4.5',
    content: '不错'
  }), '评分必须是1到5之间的整数');
});

test('BACKEND-ADD-33: 资料校验接受空更新和合法生日', () => {
  assert.equal(validateProfilePayload({}), null);
  assert.equal(validateProfilePayload({ birthday: '2026-09-02' }), null);
});

test('BACKEND-ADD-34: 角色授权拒绝未登录请求', () => {
  const res = response();
  authorizeRoles('admin')({}, res, () => assert.fail('不应放行'));
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, '无权执行此操作');
});

test('BACKEND-ADD-35: 非 Bearer Authorization 按未提供令牌处理', async () => {
  const res = response();
  await protect({ headers: { authorization: 'Basic abc' } }, res, () => assert.fail('不应放行'));
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, '未提供认证令牌');
});
