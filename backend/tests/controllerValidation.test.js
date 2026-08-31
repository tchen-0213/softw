const test = require('node:test');
const assert = require('node:assert/strict');

const Address = require('../models/Address');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const User = require('../models/User');
const Order = require('../models/Order');
const addressController = require('../controllers/addressController');
const productController = require('../controllers/productController');
const shopController = require('../controllers/shopController');
const userController = require('../controllers/userController');
const orderController = require('../controllers/orderController');
const evaluationController = require('../controllers/evaluationController');

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }
});

test('CONTROLLER-ADDRESS-01: 地址请求格式错误时返回 400', async () => {
  const res = response();
  await addressController.replaceAddresses({ body: { bad: true }, user: { id: 1 } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, '地址数据格式错误');
});

test('CONTROLLER-ADDRESS-02: 地址保存过滤空项、自动选择唯一默认地址', async (t) => {
  const originals = { destroy: Address.destroy, bulkCreate: Address.bulkCreate, findAll: Address.findAll };
  t.after(() => Object.assign(Address, originals));
  let created;
  Address.destroy = async () => {};
  Address.bulkCreate = async (rows) => { created = rows; };
  Address.findAll = async () => created;
  const req = { user: { id: 7 }, body: { addresses: [
    { id: 1, name: '甲', phone: '1', address: 'A' },
    { id: 2, name: '', phone: '2', address: 'B' },
    { id: 3, name: '丙', phone: '3', address: 'C', isDefault: true },
    { id: 4, name: '丁', phone: '4', address: 'D', isDefault: true }
  ] } };
  const res = response();
  await addressController.replaceAddresses(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(created.length, 3);
  assert.deepEqual(created.map(item => item.isDefault), [false, true, false]);
});

test('CONTROLLER-PRODUCT-01: 未认证店铺禁止发布商品', async (t) => {
  const original = Shop.findOne;
  Shop.findOne = async () => ({ verificationStatus: '未认证' });
  t.after(() => { Shop.findOne = original; });
  const res = response();
  await productController.createProduct({ body: {}, user: { id: 1 } }, res);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /店铺验证/);
});

test('CONTROLLER-PRODUCT-02: 修改不存在商品返回 404', async (t) => {
  const original = Product.findByPk;
  Product.findByPk = async () => null;
  t.after(() => { Product.findByPk = original; });
  const res = response();
  await productController.updateProduct({ params: { id: 404 }, body: {}, user: { id: 1 } }, res);
  assert.equal(res.statusCode, 404);
});

test('CONTROLLER-PRODUCT-03: 非商品所有者禁止修改', async (t) => {
  const original = Product.findByPk;
  Product.findByPk = async () => ({ sellerId: 2 });
  t.after(() => { Product.findByPk = original; });
  const res = response();
  await productController.updateProduct({ params: { id: 1 }, body: {}, user: { id: 1 } }, res);
  assert.equal(res.statusCode, 403);
});

test('CONTROLLER-PRODUCT-04: 非法商品状态被拒绝且不写数据库', async (t) => {
  const original = Product.findByPk;
  let updated = false;
  Product.findByPk = async () => ({ sellerId: 1, update: async () => { updated = true; } });
  t.after(() => { Product.findByPk = original; });
  const res = response();
  await productController.updateProduct({ params: { id: 1 }, body: { status: '已删除' }, user: { id: 1 } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(updated, false);
});

test('CONTROLLER-ORDER-01: 空订单拒绝创建且不启动事务', async () => {
  const res = response();
  await orderController.createOrder({ body: { items: [] }, user: { id: 1 } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, '订单商品不能为空');
});

test('CONTROLLER-ORDER-02: 非数字卖家身份返回 401', async () => {
  const res = response();
  await orderController.getSellerOrders({ query: {}, user: { id: 'invalid' } }, res);
  assert.equal(res.statusCode, 401);
});

test('CONTROLLER-ORDER-03: 买家不能查看他人订单', async (t) => {
  const original = Order.findByPk;
  Order.findByPk = async () => ({ id: 1, userId: 2 });
  t.after(() => { Order.findByPk = original; });
  const res = response();
  await orderController.getOrderDetail({ params: { id: 1 }, user: { id: 1 } }, res);
  assert.equal(res.statusCode, 403);
});

test('CONTROLLER-EVALUATION-01: 空白回复返回 400', async () => {
  const res = response();
  await evaluationController.replyEvaluation({ body: { reply: '  ' } }, res);
  assert.equal(res.statusCode, 400);
});

test('CONTROLLER-SHOP-01: 店铺认证逐项校验五个必填字段', async (t) => {
  const valid = {
    legalName: '张三', idNumber: '123', verificationAddress: '地址',
    businessLicenseImage: 'license.png', idCardImage: 'id.png'
  };
  const cases = [
    ['legalName', '经营者姓名不能为空'],
    ['idNumber', '身份证号不能为空'],
    ['verificationAddress', '经营地址不能为空'],
    ['businessLicenseImage', '营业执照不能为空'],
    ['idCardImage', '身份证照片不能为空']
  ];
  for (const [field, message] of cases) {
    await t.test(field, async () => {
      const res = response();
      await shopController.submitShopVerification({ body: { ...valid, [field]: ' ' }, user: { id: 1 } }, res);
      assert.equal(res.statusCode, 400);
      assert.equal(res.body.message, message);
    });
  }
});

test('CONTROLLER-USER-01: 登录请求先校验邮箱和密码格式', async () => {
  const res = response();
  await userController.login({ body: { email: 'bad', password: '' } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, '邮箱或密码格式不正确');
});

test('CONTROLLER-USER-02: 不存在用户登录返回 401', async (t) => {
  const original = User.findOne;
  User.findOne = async () => null;
  t.after(() => { User.findOne = original; });
  const res = response();
  await userController.login({ body: { email: 'a@b.com', password: '123456' } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, '用户不存在');
});

test('CONTROLLER-USER-03: 错误旧密码不能修改密码', async (t) => {
  const original = User.findByPk;
  let updated = false;
  User.findByPk = async () => ({ matchPassword: async () => false, update: async () => { updated = true; } });
  t.after(() => { User.findByPk = original; });
  const res = response();
  await userController.updatePassword({ body: { oldPassword: 'bad', newPassword: 'new-pass' }, user: { id: 1 } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(updated, false);
});
