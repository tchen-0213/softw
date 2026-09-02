const express = require('express');
const path = require('path');
const multer = require('multer');
const { DataTypes, Op, Transaction } = require('sequelize');
const { createService } = require('../common/createService');
const { createDatabase, initializeDatabase } = require('../common/database');
const { decodeToken, requireInternalToken } = require('../common/auth');
const { requestJson } = require('../common/httpClient');
const { createImageUpload, validateUploadedImages } = require('../common/uploadSecurity');
const { validateProductionSecrets } = require('../common/security');
const { validateEvaluationPayload, validateOrderItems, validateProductPayload } = require('../common/validation');

validateProductionSecrets();

const serviceName = process.env.SERVICE_NAME || 'product-service';
const version = process.env.SERVICE_VERSION || '2.0.0';
const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3101';
const orderServiceUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:3103';
const sequelize = createDatabase('softw_catalog');
let databaseReady = false;

const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false }, description: { type: DataTypes.TEXT, allowNull: false },
  images: { type: DataTypes.JSON, defaultValue: [] }, videos: { type: DataTypes.JSON, defaultValue: [] },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false }, stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  category: { type: DataTypes.STRING, allowNull: false }, subCategory: DataTypes.STRING, brand: DataTypes.STRING,
  sellerId: { type: DataTypes.INTEGER, allowNull: false }, sellerName: { type: DataTypes.STRING, allowNull: false },
  sellerAvatar: { type: DataTypes.STRING, defaultValue: '' }, sellerCreditLevel: { type: DataTypes.STRING, defaultValue: '普通' },
  sellerCreditScore: { type: DataTypes.INTEGER, defaultValue: 100 }, status: { type: DataTypes.STRING, defaultValue: '在售' },
  sales: { type: DataTypes.INTEGER, defaultValue: 0 }, views: { type: DataTypes.INTEGER, defaultValue: 0 },
  rating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0 }, reviewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  isSecondhand: { type: DataTypes.BOOLEAN, defaultValue: false }, condition: DataTypes.STRING, usageTime: DataTypes.STRING,
  hasDefect: { type: DataTypes.BOOLEAN, defaultValue: false }, defectDescription: DataTypes.TEXT, location: DataTypes.STRING,
  bargainEnabled: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  indexes: [
    { name: 'idx_products_catalog_filter', fields: ['status', 'category', 'isSecondhand', 'price'] },
    { name: 'idx_products_recommended', fields: ['status', 'sales', 'rating'] },
    { name: 'idx_products_seller_updated', fields: ['sellerId', 'status', 'updatedAt'] }
  ]
});
const Shop = sequelize.define('Shop', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, userId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  name: { type: DataTypes.STRING, allowNull: false }, avatar: { type: DataTypes.STRING, defaultValue: '' }, banner: { type: DataTypes.STRING, defaultValue: '' },
  description: { type: DataTypes.TEXT, defaultValue: '' }, status: { type: DataTypes.STRING, defaultValue: '待认证' },
  verificationStatus: { type: DataTypes.STRING, defaultValue: '未认证' }, legalName: { type: DataTypes.STRING, defaultValue: '' },
  idNumber: { type: DataTypes.STRING, defaultValue: '' }, verificationAddress: { type: DataTypes.STRING, defaultValue: '' },
  businessLicenseImage: { type: DataTypes.STRING, defaultValue: '' }, idCardImage: { type: DataTypes.STRING, defaultValue: '' },
  verificationSubmittedAt: DataTypes.DATE, ownerSnapshot: { type: DataTypes.JSON }
}, {
  indexes: [{ name: 'idx_shops_verification_status', fields: ['verificationStatus', 'updatedAt'] }]
});
const Evaluation = sequelize.define('Evaluation', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, orderId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false }, productId: { type: DataTypes.INTEGER, allowNull: false }, sellerId: { type: DataTypes.INTEGER, allowNull: false },
  rating: { type: DataTypes.INTEGER, allowNull: false }, content: { type: DataTypes.TEXT, allowNull: false }, images: { type: DataTypes.JSON, defaultValue: [] },
  status: { type: DataTypes.STRING, defaultValue: '已发布' }, reply: DataTypes.TEXT, userSnapshot: DataTypes.JSON, productSnapshot: DataTypes.JSON
}, { indexes: [
  { unique: true, fields: ['orderId', 'userId', 'productId'] },
  { name: 'idx_evaluations_seller_status', fields: ['sellerId', 'status', 'createdAt'] },
  { name: 'idx_evaluations_product_status', fields: ['productId', 'status', 'createdAt'] }
] });
const ChatConversation = sequelize.define('ChatConversation', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, buyerId: { type: DataTypes.INTEGER, allowNull: false },
  sellerId: { type: DataTypes.INTEGER, allowNull: false }, productId: { type: DataTypes.INTEGER, allowNull: false }, status: { type: DataTypes.STRING, defaultValue: 'active' },
  lastMessageAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }, buyerSnapshot: DataTypes.JSON, sellerSnapshot: DataTypes.JSON, productSnapshot: DataTypes.JSON
}, { indexes: [{ unique: true, fields: ['buyerId', 'sellerId', 'productId'] }] });
const ChatMessage = sequelize.define('ChatMessage', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, conversationId: { type: DataTypes.INTEGER, allowNull: false },
  senderId: { type: DataTypes.INTEGER, allowNull: false }, type: { type: DataTypes.STRING, defaultValue: 'text' }, content: { type: DataTypes.TEXT, defaultValue: '' },
  amount: DataTypes.DECIMAL(10, 2), requestStatus: DataTypes.STRING, decidedAt: DataTypes.DATE,
  redeemedAt: DataTypes.DATE, redeemedByReservationId: DataTypes.STRING, senderSnapshot: DataTypes.JSON
}, {
  indexes: [{ name: 'idx_chat_messages_conversation_created', fields: ['conversationId', 'createdAt'] }]
});
const InventoryReservation = sequelize.define('InventoryReservation', {
  id: { type: DataTypes.STRING, primaryKey: true }, items: { type: DataTypes.JSON, allowNull: false },
  status: { type: DataTypes.ENUM('reserved', 'released', 'completed'), defaultValue: 'reserved' }
});
Product.hasMany(Evaluation, { foreignKey: 'productId' });
Evaluation.belongsTo(Product, { foreignKey: 'productId' });
ChatConversation.hasMany(ChatMessage, { foreignKey: 'conversationId', onDelete: 'CASCADE' });
ChatMessage.belongsTo(ChatConversation, { foreignKey: 'conversationId' });

const parsePaging = query => {
  const page = Math.max(parseInt(query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || query.size || '20', 10), 1), 100);
  return { page, limit, offset: (page - 1) * limit };
};
const parseBoolean = value => value === undefined ? undefined : value === true || value === 'true' || value === '1' || value === 1;
const parseExperimentBurnMs = value => {
  if (process.env.EXPERIMENT_CPU_BURN_ENABLED !== 'true') return 0;
  const milliseconds = Number(value);
  return Number.isFinite(milliseconds) ? Math.min(Math.max(Math.trunc(milliseconds), 0), 250) : 0;
};
const burnCpu = milliseconds => {
  const deadline = process.hrtime.bigint() + BigInt(milliseconds) * 1000000n;
  let accumulator = 1;
  while (process.hrtime.bigint() < deadline) accumulator = (accumulator + Math.sqrt(accumulator + 1)) % 1000003;
  return accumulator;
};
const conditionLabels = { 1: '全新', 2: '9成新', 3: '8成新', 4: '7成新及以下' };
const normalizeCondition = value => conditionLabels[value] || value;
const userDto = user => ({ id: user.id, username: user.username, nickname: user.nickname || user.username, avatar: user.avatar || '', creditLevel: user.creditLevel, creditScore: user.creditScore, role: user.role });
const productDto = row => {
  const data = row.toJSON ? row.toJSON() : row;
  return { ...data, images: data.images || [], videos: data.videos || [], productType: data.isSecondhand ? 2 : 1, bargainEnabled: data.bargainEnabled !== false,
    evaluationCount: data.reviewCount || 0, seller: { id: data.sellerId, username: data.sellerName, nickname: data.sellerName, avatar: data.sellerAvatar, creditLevel: data.sellerCreditLevel, creditScore: data.sellerCreditScore } };
};
const requireUser = async (req, res, next) => {
  try {
    const decoded = decodeToken(req);
    req.user = await requestJson(userServiceUrl, `/internal/users/${decoded.id}`);
    return next();
  } catch (error) { return res.status(error.status || 503).json({ message: error.message }); }
};
const buildProductWhere = query => {
  const where = {};
  const keyword = String(query.keyword || '').trim();
  if (keyword) where[Op.or] = [{ name: { [Op.like]: `%${keyword}%` } }, { description: { [Op.like]: `%${keyword}%` } }];
  if (query.category && query.category !== 'all') where.category = query.category;
  const secondhand = parseBoolean(query.isSecondhand); if (secondhand !== undefined) where.isSecondhand = secondhand;
  if (query.minPrice || query.priceMin || query.maxPrice || query.priceMax) {
    where.price = {};
    if (query.minPrice || query.priceMin) where.price[Op.gte] = Number(query.minPrice || query.priceMin);
    if (query.maxPrice || query.priceMax) where.price[Op.lte] = Number(query.maxPrice || query.priceMax);
  }
  if (query.status) where.status = query.status; else if (query.includeUnavailable !== 'true') where.status = '在售';
  return where;
};
const router = express.Router();

const listProducts = async (req, res, next) => {
  try {
    const burnMs = parseExperimentBurnMs(req.query.burnMs);
    if (burnMs > 0) {
      burnCpu(burnMs);
      res.set('X-Experiment-Cpu-Burn-Ms', String(burnMs));
    }
    const { page, limit, offset } = parsePaging(req.query);
    const sortable = { price_asc: ['price', 'ASC'], price_desc: ['price', 'DESC'], sales: ['sales', 'DESC'], rating: ['rating', 'DESC'] };
    const { rows, count } = await Product.findAndCountAll({ where: buildProductWhere(req.query), order: [sortable[req.query.sortBy || req.query.sort] || ['createdAt', 'DESC']], offset, limit });
    return res.json({ products: rows.map(productDto), pagination: { total: count, page, limit, pages: Math.ceil(count / limit) } });
  } catch (error) { return next(error); }
};
router.get('/api/products', listProducts);
router.get('/api/products/search', listProducts);
router.get('/api/products/recommended', async (req, res, next) => {
  try { return res.json((await Product.findAll({ where: { status: '在售' }, order: [['sales', 'DESC'], ['rating', 'DESC']], limit: 10 })).map(productDto)); } catch (error) { return next(error); }
});
router.get('/api/products/mine', requireUser, async (req, res, next) => { req.query.includeUnavailable = 'true'; req.query.status = undefined; try {
  const { page, limit, offset } = parsePaging(req.query); const { rows, count } = await Product.findAndCountAll({ where: { ...buildProductWhere(req.query), sellerId: req.user.id }, order: [['updatedAt', 'DESC']], offset, limit });
  return res.json({ products: rows.map(productDto), pagination: { total: count, page, limit, pages: Math.ceil(count / limit) } });
} catch (error) { return next(error); } });
router.get('/api/products/:id', async (req, res, next) => { try { const row = await Product.findByPk(req.params.id); if (!row) return res.status(404).json({ message: '商品不存在' }); await row.increment('views'); await row.reload(); return res.json(productDto(row)); } catch (error) { return next(error); } });

const createProduct = async (req, res, next) => { try {
  const shop = await Shop.findOne({ where: { userId: req.user.id } });
  if (!shop || shop.verificationStatus !== '已认证') return res.status(403).json({ message: '请先完成店铺验证后再发布商品' });
  const validationError = validateProductPayload(req.body);
  if (validationError) return res.status(400).json({ message: validationError });
  const secondhand = req.body.isSecondhand === undefined ? Number(req.body.productType) === 2 : parseBoolean(req.body.isSecondhand);
  const row = await Product.create({ ...req.body, condition: normalizeCondition(req.body.condition), sellerId: req.user.id, sellerName: req.user.nickname || req.user.username, sellerAvatar: req.user.avatar || '', sellerCreditLevel: req.user.creditLevel, sellerCreditScore: req.user.creditScore, isSecondhand: secondhand, stock: Number(req.body.stock || 1), bargainEnabled: parseBoolean(req.body.bargainEnabled) !== false });
  if (req.user.role === 'user') await requestJson(userServiceUrl, `/internal/users/${req.user.id}/role`, { method: 'POST', body: { role: 'seller' } });
  return res.status(201).json(productDto(row));
} catch (error) { return next(error); } };
router.post('/api/products', requireUser, createProduct);
router.put('/api/products/:id', requireUser, async (req, res, next) => { try { const row = await Product.findByPk(req.params.id); if (!row) return res.status(404).json({ message: '商品不存在' }); if (Number(row.sellerId) !== Number(req.user.id)) return res.status(403).json({ message: '无权修改此商品' }); const allowed = ['name','description','images','videos','price','stock','category','subCategory','brand','status','isSecondhand','condition','usageTime','hasDefect','defectDescription','location','bargainEnabled']; const updates = {}; for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key]; if (updates.status && !['在售','下架','已预订','已售出'].includes(updates.status)) return res.status(400).json({ message: '商品状态不合法' }); const validationError = validateProductPayload(updates, { partial: true }); if (validationError) return res.status(400).json({ message: validationError }); await row.update(updates); return res.json(productDto(row)); } catch (error) { return next(error); } });
router.delete('/api/products/:id', requireUser, async (req, res, next) => { try { const row = await Product.findByPk(req.params.id); if (!row) return res.status(404).json({ message: '商品不存在' }); if (Number(row.sellerId) !== Number(req.user.id)) return res.status(403).json({ message: '无权删除此商品' }); await row.destroy(); return res.json({ message: '商品删除成功' }); } catch (error) { return next(error); } });
router.use('/api/secondhand', (req, res, next) => { req.query.isSecondhand = 'true'; next(); });
router.get('/api/secondhand', listProducts); router.get('/api/secondhand/search', listProducts);
router.get('/api/secondhand/:id', async (req, res, next) => { try { const row = await Product.findOne({ where: { id: req.params.id, isSecondhand: true } }); return row ? res.json(productDto(row)) : res.status(404).json({ message: '商品不存在' }); } catch (error) { return next(error); } });
router.post('/api/secondhand', requireUser, (req, res, next) => { req.body.isSecondhand = true; return createProduct(req, res, next); });
router.put('/api/secondhand/:id', requireUser, async (req, res, next) => { try { const row = await Product.findOne({ where: { id: req.params.id, isSecondhand: true } }); if (!row) return res.status(404).json({ message: '商品不存在' }); if (Number(row.sellerId) !== Number(req.user.id)) return res.status(403).json({ message: '无权修改此商品' }); const allowed = ['name','description','images','videos','price','stock','category','subCategory','brand','status','condition','usageTime','hasDefect','defectDescription','location','bargainEnabled']; const updates = {}; for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key]; if (updates.status && !['在售','下架','已预订','已售出'].includes(updates.status)) return res.status(400).json({ message: '商品状态不合法' }); const validationError = validateProductPayload(updates, { partial: true }); if (validationError) return res.status(400).json({ message: validationError }); await row.update(updates); return res.json(productDto(row)); } catch (error) { return next(error); } });
router.delete('/api/secondhand/:id', requireUser, async (req, res, next) => { try { const row = await Product.findOne({ where: { id: req.params.id, isSecondhand: true } }); if (!row) return res.status(404).json({ message: '商品不存在' }); if (Number(row.sellerId) !== Number(req.user.id)) return res.status(403).json({ message: '无权删除此商品' }); await row.destroy(); return res.json({ message: '商品删除成功' }); } catch (error) { return next(error); } });

const shopDto = async row => ({ ...row.toJSON(), logo: row.avatar, owner: row.ownerSnapshot, creditLevel: row.ownerSnapshot?.creditLevel, creditScore: row.ownerSnapshot?.creditScore, products: (await Product.findAll({ where: { sellerId: row.userId }, order: [['updatedAt','DESC']] })).map(productDto) });
const getOrCreateShop = async user => (await Shop.findOrCreate({ where: { userId: user.id }, defaults: { userId: user.id, name: `${user.nickname || user.username}的店铺`, description: '欢迎来到我的店铺。', ownerSnapshot: userDto(user) } }))[0];
router.get('/api/shops/mine', requireUser, async (req, res, next) => { try { return res.json(await shopDto(await getOrCreateShop(req.user))); } catch (error) { return next(error); } });
router.put('/api/shops/mine', requireUser, async (req, res, next) => { try { const row = await getOrCreateShop(req.user); await row.update({ name: req.body.name || row.name, description: req.body.description ?? row.description, avatar: req.body.avatar ?? req.body.logo ?? row.avatar, banner: req.body.banner ?? row.banner, ownerSnapshot: userDto(req.user) }); return res.json(await shopDto(row)); } catch (error) { return next(error); } });
router.post('/api/shops/mine/verification', requireUser, async (req, res, next) => { const fields = ['legalName','idNumber','verificationAddress','businessLicenseImage','idCardImage']; const missing = fields.find(key => !String(req.body[key] || '').trim()); if (missing) return res.status(400).json({ message: `${missing}不能为空` }); try { const row = await getOrCreateShop(req.user); await row.update({ ...Object.fromEntries(fields.map(key => [key, req.body[key]])), verificationStatus: '已认证', status: '营业中', verificationSubmittedAt: new Date(), ownerSnapshot: userDto(req.user) }); return res.json(await shopDto(row)); } catch (error) { return next(error); } });
router.get('/api/shops/user/:userId', async (req, res, next) => { try { const user = await requestJson(userServiceUrl, `/internal/users/${req.params.userId}`); return res.json(await shopDto(await getOrCreateShop(user))); } catch (error) { return next(error); } });
router.get('/api/shops/:id', async (req, res, next) => { try { const row = await Shop.findByPk(req.params.id); return row ? res.json(await shopDto(row)) : res.status(404).json({ message: '店铺不存在' }); } catch (error) { return next(error); } });

router.post('/internal/products/reservations', requireInternalToken, async (req, res, next) => { const validationError = validateOrderItems(req.body.items); if (validationError) return res.status(400).json({ message: validationError }); if (!String(req.body.reservationId || '').trim()) return res.status(400).json({ message: '库存预留标识不能为空' }); const transaction = await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED }); try {
  const existing = await InventoryReservation.findByPk(req.body.reservationId, { transaction }); if (existing) { await transaction.commit(); return res.json({ reservationId: existing.id, items: existing.items, status: existing.status }); }
  const snapshots = [];
  for (const input of req.body.items || []) {
    const quantity = Number(input.quantity ?? 1);
    const row = await Product.findByPk(input.productId || input.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!snapshots.length) {
      const concurrentExisting = await InventoryReservation.findByPk(req.body.reservationId, { transaction });
      if (concurrentExisting) {
        await transaction.commit();
        return res.json({ reservationId: concurrentExisting.id, items: concurrentExisting.items, status: concurrentExisting.status });
      }
    }
    if (!row) { const error = new Error(`商品 ${input.productId || input.id} 不存在`); error.status = 404; throw error; }
    if (row.status !== '在售' || row.stock < quantity) { const error = new Error(`商品 ${row.name} 不可购买或库存不足`); error.status = 400; throw error; }
    let price = Number(row.price), priceSource = 'product', bargainMessageId = null;
    if (input.bargainMessageId) {
      if (quantity !== 1) { const error = new Error('议价订单每次只能购买 1 件商品'); error.status = 400; throw error; }
      const message = await ChatMessage.findByPk(input.bargainMessageId, { transaction, lock: transaction.LOCK.UPDATE });
      const conversation = message && await ChatConversation.findByPk(message.conversationId, { transaction });
      const valid = message && conversation && message.type === 'bargain' && message.requestStatus === 'accepted'
        && Number(conversation.productId) === Number(row.id) && Number(conversation.buyerId) === Number(req.body.buyerId);
      if (!valid) { const error = new Error('议价记录无效、未接受或不属于当前买家'); error.status = 403; throw error; }
      if (message.redeemedAt) { const error = new Error('该议价已经兑换，不能重复下单'); error.status = 400; throw error; }
      price = Number(message.amount); priceSource = 'accepted_bargain'; bargainMessageId = message.id;
      await message.update({ redeemedAt: new Date(), redeemedByReservationId: req.body.reservationId }, { transaction });
    }
    const nextStock = row.stock - quantity;
    await row.update({ stock: nextStock, sales: row.sales + quantity, status: row.isSecondhand && nextStock <= 0 ? '已预订' : row.status }, { transaction });
    snapshots.push({ productId: row.id, name: row.name, price, priceSource, bargainMessageId, quantity, image: row.images?.[0] || '', sellerId: row.sellerId, sellerName: row.sellerName, isSecondhand: row.isSecondhand });
  }
  await InventoryReservation.create({ id: req.body.reservationId, items: snapshots }, { transaction }); await transaction.commit(); return res.status(201).json({ reservationId: req.body.reservationId, items: snapshots, status: 'reserved' });
} catch (error) { await transaction.rollback(); return next(error); } });
router.post('/internal/products/reservations/:id/release', requireInternalToken, async (req, res, next) => { const transaction = await sequelize.transaction(); try { const reservation = await InventoryReservation.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE }); if (!reservation) { await transaction.commit(); return res.status(404).json({ message: '库存预留不存在' }); } if (reservation.status === 'reserved') { for (const item of reservation.items) { const row = await Product.findByPk(item.productId, { transaction, lock: transaction.LOCK.UPDATE }); if (row) await row.update({ stock: row.stock + item.quantity, sales: Math.max(row.sales - item.quantity, 0), status: row.isSecondhand && row.status === '已预订' ? '在售' : row.status }, { transaction }); if (req.body.restoreBargains && item.bargainMessageId) { const message = await ChatMessage.findByPk(item.bargainMessageId, { transaction, lock: transaction.LOCK.UPDATE }); if (message?.redeemedByReservationId === reservation.id) await message.update({ redeemedAt: null, redeemedByReservationId: null }, { transaction }); } } await reservation.update({ status: 'released' }, { transaction }); } await transaction.commit(); return res.json({ reservationId: reservation.id, status: reservation.status }); } catch (error) { await transaction.rollback(); return next(error); } });
router.post('/internal/products/reservations/:id/complete', requireInternalToken, async (req, res, next) => { const transaction = await sequelize.transaction(); try { const reservation = await InventoryReservation.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE }); if (!reservation) { await transaction.commit(); return res.status(404).json({ message: '库存预留不存在' }); } if (reservation.status === 'reserved') { for (const item of reservation.items) { const row = await Product.findByPk(item.productId, { transaction }); if (row?.isSecondhand && row.stock <= 0) await row.update({ status: '已售出' }, { transaction }); } await reservation.update({ status: 'completed' }, { transaction }); } await transaction.commit(); return res.json({ reservationId: reservation.id, status: reservation.status }); } catch (error) { await transaction.rollback(); return next(error); } });

const evaluationDto = row => { const data = row.toJSON(); const replies = data.reply ? JSON.parse(data.reply) : []; return { ...data, user: data.userSnapshot, product: data.productSnapshot, replies, reply: [...replies].reverse().find(item => item.role === 'seller')?.content || '', pendingSellerReply: !replies.length || replies.at(-1).role !== 'seller' }; };
router.post('/api/evaluations', requireUser, async (req, res, next) => { const validationError = validateEvaluationPayload(req.body); if (validationError) return res.status(400).json({ message: validationError }); try { const product = await Product.findByPk(req.body.productId); if (!product) return res.status(404).json({ message: '商品不存在' }); await requestJson(orderServiceUrl, `/internal/orders/${req.body.orderId}/purchases/${product.id}?userId=${req.user.id}`); const row = await Evaluation.create({ orderId: req.body.orderId, userId: req.user.id, productId: product.id, sellerId: product.sellerId, rating: req.body.rating, content: req.body.content, images: req.body.images || [], userSnapshot: userDto(req.user), productSnapshot: { id: product.id, name: product.name, images: product.images || [] } }); const ratings = await Evaluation.findAll({ where: { productId: product.id, status: '已发布' } }); await product.update({ reviewCount: ratings.length, rating: ratings.reduce((sum, item) => sum + Number(item.rating), 0) / ratings.length }); const delta = Number(req.body.rating) >= 4 ? 2 : Number(req.body.rating) <= 2 ? -3 : 0; if (delta) await requestJson(userServiceUrl, `/internal/users/${product.sellerId}/credit`, { method: 'POST', body: { delta, reason: 'evaluation' } }); return res.status(201).json(evaluationDto(row)); } catch (error) { if (error.name === 'SequelizeUniqueConstraintError') return res.status(400).json({ message: '已经评价过此商品' }); return next(error); } });
const listEvaluations = async (req, res, next, where) => { try { const { page, limit, offset } = parsePaging(req.query); const { rows, count } = await Evaluation.findAndCountAll({ where: { ...where, status: '已发布' }, order: [['createdAt','DESC']], offset, limit }); const evaluations = rows.map(evaluationDto); return res.json({ evaluations, pendingReplyCount: evaluations.filter(x => x.pendingSellerReply).length, pagination: { total: count, page, limit, pages: Math.ceil(count / limit) } }); } catch (error) { return next(error); } };
router.get('/api/evaluations/product', (req,res,next) => listEvaluations(req,res,next,{ productId: req.query.productId }));
router.get('/api/evaluations/user', requireUser, (req,res,next) => listEvaluations(req,res,next,{ userId: req.user.id }));
router.get('/api/evaluations/seller', requireUser, (req,res,next) => listEvaluations(req,res,next,{ sellerId: req.user.id }));
router.put('/api/evaluations/:id/approve', requireUser, async (req,res,next) => { try { if (req.user.role !== 'admin') return res.status(403).json({ message: '仅管理员可审核评价' }); const row = await Evaluation.findByPk(req.params.id); if (!row) return res.status(404).json({ message: '评价不存在' }); await row.update({ status: '已发布' }); return res.json(evaluationDto(row)); } catch (error) { return next(error); } });
router.put('/api/evaluations/:id/reply', requireUser, async (req,res,next) => { try { const row = await Evaluation.findByPk(req.params.id); if (!row) return res.status(404).json({ message: '评价不存在' }); const role = Number(row.sellerId) === Number(req.user.id) ? 'seller' : Number(row.userId) === Number(req.user.id) ? 'buyer' : null; if (!role) return res.status(403).json({ message: '无权回复此评价' }); if (!String(req.body.reply || '').trim()) return res.status(400).json({ message: '回复内容不能为空' }); const replies = row.reply ? JSON.parse(row.reply) : []; replies.push({ id: `${row.id}-${Date.now()}`, role, userId: req.user.id, username: req.user.nickname || req.user.username, avatar: req.user.avatar || '', content: String(req.body.reply).trim(), createdAt: new Date().toISOString() }); await row.update({ reply: JSON.stringify(replies) }); return res.json(evaluationDto(row)); } catch (error) { return next(error); } });

const conversationDto = row => ({ ...row.toJSON(), buyer: row.buyerSnapshot, seller: row.sellerSnapshot, product: row.productSnapshot });
router.post('/api/chats/conversations', requireUser, async (req,res,next) => { try { const product = await Product.findByPk(req.body.productId); if (!product) return res.status(404).json({ message: '商品不存在' }); if (Number(product.sellerId) === Number(req.user.id)) return res.status(400).json({ message: '不能与自己的商品发起私聊' }); const seller = await requestJson(userServiceUrl, `/internal/users/${product.sellerId}`); const [row] = await ChatConversation.findOrCreate({ where: { buyerId: req.user.id, sellerId: product.sellerId, productId: product.id }, defaults: { buyerSnapshot: userDto(req.user), sellerSnapshot: userDto(seller), productSnapshot: productDto(product) } }); return res.status(201).json(conversationDto(row)); } catch (error) { return next(error); } });
router.get('/api/chats/conversations', requireUser, async (req,res,next) => { try { const where = req.query.role === 'seller' ? { sellerId: req.user.id } : req.query.role === 'buyer' ? { buyerId: req.user.id } : { [Op.or]: [{ buyerId: req.user.id }, { sellerId: req.user.id }] }; const rows = await ChatConversation.findAll({ where, order: [['lastMessageAt','DESC']] }); return res.json({ conversations: rows.map(conversationDto) }); } catch (error) { return next(error); } });
router.get('/api/chats/conversations/:id', requireUser, async (req,res,next) => { try { const row = await ChatConversation.findByPk(req.params.id); if (!row) return res.status(404).json({ message: '私聊不存在' }); if (![row.buyerId,row.sellerId].map(Number).includes(Number(req.user.id))) return res.status(403).json({ message: '无权查看该私聊' }); const messages = await ChatMessage.findAll({ where: { conversationId: row.id }, order: [['createdAt','ASC']] }); return res.json({ conversation: conversationDto(row), messages: messages.map(x => ({ ...x.toJSON(), sender: x.senderSnapshot, amount: x.amount == null ? null : Number(x.amount) })) }); } catch (error) { return next(error); } });
router.post('/api/chats/conversations/:id/messages', requireUser, async (req,res,next) => { try { const row = await ChatConversation.findByPk(req.params.id); if (!row) return res.status(404).json({ message: '私聊不存在' }); if (![row.buyerId,row.sellerId].map(Number).includes(Number(req.user.id))) return res.status(403).json({ message: '无权在该私聊中发言' }); const type = ['bargain','refund'].includes(req.body.type) ? req.body.type : 'text'; if (type !== 'text' && Number(row.buyerId) !== Number(req.user.id)) return res.status(403).json({ message: '只有买家可以发起该申请' }); if (type === 'refund') await requestJson(orderServiceUrl, `/internal/orders/purchases/${row.productId}?userId=${req.user.id}&paid=true`); const amount = type === 'text' ? null : Number(req.body.amount); if (type !== 'text' && (!Number.isFinite(amount) || amount <= 0)) return res.status(400).json({ message: '请输入有效金额' }); const message = await ChatMessage.create({ conversationId: row.id, senderId: req.user.id, type, content: String(req.body.content || (type === 'bargain' ? `买家希望以 ¥${amount.toFixed(2)} 成交` : `买家申请退款 ¥${amount.toFixed(2)}`)).trim(), amount, requestStatus: type === 'text' ? null : 'pending', senderSnapshot: userDto(req.user) }); await row.update({ lastMessageAt: new Date() }); return res.status(201).json({ ...message.toJSON(), sender: message.senderSnapshot, amount }); } catch (error) { return next(error); } });
router.put('/api/chats/messages/:id/decision', requireUser, async (req,res,next) => { try { const message = await ChatMessage.findByPk(req.params.id); if (!message) return res.status(404).json({ message: '申请消息不存在' }); const row = await ChatConversation.findByPk(message.conversationId); if (Number(row.sellerId) !== Number(req.user.id)) return res.status(403).json({ message: '只有商家可以处理申请' }); if (message.requestStatus !== 'pending') return res.status(400).json({ message: '该申请已处理或不可处理' }); const status = ['accepted','rejected'].includes(req.body.status) ? req.body.status : null; if (!status) return res.status(400).json({ message: '处理结果不合法' }); await message.update({ requestStatus: status, decidedAt: new Date() }); const systemMessage = await ChatMessage.create({ conversationId: row.id, senderId: req.user.id, type: 'system', content: `商家已${status === 'accepted' ? '同意' : '拒绝'}申请：¥${Number(message.amount).toFixed(2)}`, senderSnapshot: userDto(req.user) }); return res.json({ request: { ...message.toJSON(), sender: message.senderSnapshot }, systemMessage: { ...systemMessage.toJSON(), sender: systemMessage.senderSnapshot } }); } catch (error) { return next(error); } });

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
const upload = createImageUpload({ multer, uploadDir, maxFileSize: 5 * 1024 * 1024, maxFiles: 10 });
const handleImageUpload = (req, res, next) => upload.array('images', 10)(req, res, error => {
  if (error) error.status = 400;
  return error ? next(error) : next();
});
router.post('/api/uploads/images', requireUser, handleImageUpload, validateUploadedImages, (req,res) => {
  if (!req.files?.length) return res.status(400).json({ message: '至少上传一张图片', requestId: req.requestId });
  return res.status(201).json({ urls: req.files.map(file => `/uploads/${file.filename}`) });
});

const checkDatabaseReady = async () => {
  if (!databaseReady) return false;
  await sequelize.authenticate();
  return true;
};
const app = createService({ express, name: serviceName, version, isReady: checkDatabaseReady, routes: instance => { instance.use('/uploads', express.static(uploadDir)); instance.use(router); } });
async function initialize() { await initializeDatabase(sequelize); databaseReady = true; }
if (require.main === module) initialize().then(() => app.listen(Number(process.env.PORT || 3102), () => console.log(`${serviceName} listening`))).catch(error => { console.error(error); process.exit(1); });
module.exports = { app, initialize, sequelize, models: { Product, Shop, Evaluation, ChatConversation, ChatMessage, InventoryReservation }, experiment: { parseExperimentBurnMs } };
