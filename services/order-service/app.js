const express = require('express');
const { randomUUID } = require('crypto');
const { DataTypes, Op } = require('sequelize');
const { createService } = require('../common/createService');
const { createDatabase, initializeDatabase } = require('../common/database');
const { decodeToken, requireInternalToken } = require('../common/auth');
const { requestJson } = require('../common/httpClient');
const { validateProductionSecrets } = require('../common/security');
const { validateOrderItems, validateShippingAddress } = require('../common/validation');

validateProductionSecrets();

const serviceName = process.env.SERVICE_NAME || 'order-service';
const version = process.env.SERVICE_VERSION || '2.0.0';
const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3101';
const productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3102';
const sequelize = createDatabase('softw_orders');
let databaseReady = false;

const Order = sequelize.define('Order', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  reservationId: { type: DataTypes.STRING, allowNull: false, unique: true },
  items: { type: DataTypes.JSON, allowNull: false },
  totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: '待付款' },
  paymentMethod: DataTypes.STRING,
  paymentStatus: { type: DataTypes.STRING, defaultValue: '未支付' },
  shippingAddress: DataTypes.JSON,
  logisticsInfo: DataTypes.JSON
}, {
  indexes: [
    { name: 'idx_orders_buyer_status_created', fields: ['userId', 'status', 'createdAt'] },
    { name: 'idx_orders_status_created', fields: ['status', 'createdAt'] }
  ]
});

const OrderSeller = sequelize.define('OrderSeller', {
  orderId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
  sellerId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true }
}, {
  timestamps: false,
  indexes: [
    { name: 'idx_order_seller_lookup', fields: ['sellerId', 'orderId'] }
  ]
});

Order.hasMany(OrderSeller, { as: 'sellerLinks', foreignKey: 'orderId', onDelete: 'CASCADE' });
OrderSeller.belongsTo(Order, { foreignKey: 'orderId' });

const paymentMethodMap = { alipay: '支付宝', wechat: '微信支付', wechatpay: '微信支付', bankcard: '银行卡', creditcard: '银行卡' };
const parsePaging = query => { const page = Math.max(parseInt(query.page || '1',10),1); const limit = Math.min(Math.max(parseInt(query.limit || '10',10),1),100); return { page, limit, offset: (page-1)*limit }; };
const orderDto = row => { const data = row.toJSON ? row.toJSON() : row; return { ...data, logistics: data.logisticsInfo }; };
const hasSellerItem = (row,userId) => (row.items || []).some(item => Number(item.sellerId) === Number(userId));
const getSellerIds = items => [...new Set((items || []).map(item => Number(item.sellerId)).filter(Number.isFinite))];
const syncOrderSellerLinks = async (order, options = {}) => {
  const rows = getSellerIds(order.items).map(sellerId => ({ orderId: order.id, sellerId }));
  if (rows.length) await OrderSeller.bulkCreate(rows, { transaction: options.transaction, ignoreDuplicates: true });
};
const fetchSellerOrders = async ({ sellerId, status, page, limit }) => {
  const where = status ? { status } : {};
  const include = [{ model: OrderSeller, as: 'sellerLinks', where: { sellerId }, attributes: [], required: true }];
  const offset = (page - 1) * limit;
  const [count, rows] = await Promise.all([
    Order.count({ where, include, distinct: true, col: 'id' }),
    Order.findAll({ where, include, order: [['createdAt', 'DESC']], offset, limit, subQuery: false })
  ]);
  return { count, rows };
};
const requireUser = async (req,res,next) => { try { const decoded = decodeToken(req); req.user = await requestJson(userServiceUrl, `/internal/users/${decoded.id}`); return next(); } catch (error) { return res.status(error.status || 503).json({ message: error.message }); } };
const appendLogistics = (current, description) => ({ ...(current || {}), steps: [{ time: new Date().toLocaleString('zh-CN',{hour12:false}), description }, ...((current || {}).steps || [])] });
const router = express.Router();

router.post('/api/orders', requireUser, async (req,res,next) => {
  const validationError = validateOrderItems(req.body.items);
  if (validationError) return res.status(400).json({ message: validationError });
  const addressValidationError = validateShippingAddress(req.body.shippingAddress);
  if (addressValidationError) return res.status(400).json({ message: addressValidationError });
  const reservationId = String(req.get('idempotency-key') || randomUUID());
  let reservation;
  try {
    reservation = await requestJson(productServiceUrl, '/internal/products/reservations', { method: 'POST', body: { reservationId, buyerId: req.user.id, items: req.body.items } });
    const totalAmount = reservation.items.reduce((sum,item) => sum + Number(item.price) * Number(item.quantity), 0);
    const transaction = await sequelize.transaction();
    let order, created;
    try {
      [order, created] = await Order.findOrCreate({ where: { reservationId }, defaults: { userId: req.user.id, reservationId, items: reservation.items, totalAmount, shippingAddress: req.body.shippingAddress, paymentMethod: paymentMethodMap[req.body.paymentMethod] || req.body.paymentMethod || '微信支付' }, transaction });
      if (!created && Number(order.userId) !== Number(req.user.id)) {
        await transaction.rollback();
        return res.status(409).json({ message: '幂等键已被其他订单使用' });
      }
      await syncOrderSellerLinks(order, { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    return res.status(created ? 201 : 200).json(orderDto(order));
  } catch (error) {
    if (reservation?.status === 'reserved') await requestJson(productServiceUrl, `/internal/products/reservations/${reservationId}/release`, { method: 'POST', body: { restoreBargains: true } }).catch(() => {});
    return next(error);
  }
});
router.get('/api/orders', requireUser, async (req,res,next) => { try { const {page,limit,offset}=parsePaging(req.query); const where={userId:req.user.id}; if(req.query.status)where.status=req.query.status; const {rows,count}=await Order.findAndCountAll({where,order:[['createdAt','DESC']],offset,limit}); return res.json({orders:rows.map(orderDto),pagination:{total:count,page,limit,pages:Math.ceil(count/limit)}}); } catch(error){return next(error);} });
router.get('/api/orders/seller', requireUser, async (req,res,next) => { try { const {page,limit}=parsePaging(req.query); const { rows, count }=await fetchSellerOrders({sellerId:Number(req.user.id),status:req.query.status,page,limit}); const orders=rows.map(row=>{const data=orderDto(row);return{...data,items:data.items.filter(item=>Number(item.sellerId)===Number(req.user.id))};}); return res.json({orders,pagination:{total:count,page,limit,pages:Math.ceil(count/limit)}}); } catch(error){return next(error);} });
router.get('/api/orders/:id', requireUser, async (req,res,next) => { try { const row=await Order.findByPk(req.params.id); if(!row)return res.status(404).json({message:'订单不存在'}); if(Number(row.userId)!==Number(req.user.id)&&!hasSellerItem(row,req.user.id)&&req.user.role!=='admin')return res.status(403).json({message:'无权查看此订单'}); return res.json(orderDto(row)); } catch(error){return next(error);} });
router.post('/api/orders/:id/pay', requireUser, async (req,res,next) => { try { const row=await Order.findByPk(req.params.id); if(!row)return res.status(404).json({message:'订单不存在'}); if(Number(row.userId)!==Number(req.user.id))return res.status(403).json({message:'无权支付此订单'}); if(row.status!=='待付款')return res.status(400).json({message:'此订单状态无法支付'}); await row.update({status:'待发货',paymentStatus:'已支付'}); return res.json(orderDto(row)); } catch(error){return next(error);} });
router.post('/api/orders/:id/cancel', requireUser, async (req,res,next) => { try { const row=await Order.findByPk(req.params.id); if(!row)return res.status(404).json({message:'订单不存在'}); if(Number(row.userId)!==Number(req.user.id))return res.status(403).json({message:'无权取消此订单'}); if(!['待付款','待发货'].includes(row.status))return res.status(400).json({message:'此订单状态无法取消'}); await requestJson(productServiceUrl, `/internal/products/reservations/${row.reservationId}/release`, {method:'POST'}); await row.update({status:'已取消'}); return res.json(orderDto(row)); } catch(error){return next(error);} });
router.post('/api/orders/:id/ship', requireUser, async (req,res,next) => { try { const row=await Order.findByPk(req.params.id); if(!row)return res.status(404).json({message:'订单不存在'}); if(!hasSellerItem(row,req.user.id)&&req.user.role!=='admin')return res.status(403).json({message:'无权发货此订单'}); if(row.status!=='待发货')return res.status(400).json({message:'此订单状态无法发货'}); const company=String(req.body.company||'').trim(),trackingNumber=String(req.body.trackingNumber||'').trim(); if(!company||!trackingNumber)return res.status(400).json({message:'物流公司和物流单号不能为空，请填写完整后再发货'}); const logisticsInfo=appendLogistics({company,trackingNumber,status:req.body.status||'运输中'},'卖家已发货，包裹开始运输'); await row.update({status:'待收货',logisticsInfo}); await requestJson(userServiceUrl, `/internal/users/${req.user.id}/credit`, {method:'POST',body:{delta:2,reason:'timely-shipping'}}).catch(()=>{}); return res.json(orderDto(row)); } catch(error){return next(error);} });
router.post('/api/orders/:id/confirm', requireUser, async (req,res,next) => { try { const row=await Order.findByPk(req.params.id); if(!row)return res.status(404).json({message:'订单不存在'}); if(Number(row.userId)!==Number(req.user.id))return res.status(403).json({message:'无权确认此订单'}); if(row.status!=='待收货')return res.status(400).json({message:'此订单状态无法确认收货'}); await requestJson(productServiceUrl, `/internal/products/reservations/${row.reservationId}/complete`, {method:'POST'}); await row.update({status:'已完成',logisticsInfo:appendLogistics({...row.logisticsInfo,status:'已签收'},'买家已确认收货，交易完成')}); return res.json(orderDto(row)); } catch(error){return next(error);} });
router.put('/api/orders/:id', requireUser, async (req,res,next) => {
  try {
    const row=await Order.findByPk(req.params.id);
    if(!row)return res.status(404).json({message:'订单不存在'});
    const isBuyer=Number(row.userId)===Number(req.user.id),isSeller=hasSellerItem(row,req.user.id);
    if(!isBuyer&&!isSeller&&req.user.role!=='admin')return res.status(403).json({message:'无权修改此订单'});
    if(req.body.status==='已完成'&&isBuyer){
      if(row.status!=='待收货')return res.status(400).json({message:'此订单状态无法确认收货'});
      await requestJson(productServiceUrl, `/internal/products/reservations/${row.reservationId}/complete`, {method:'POST'});
      await row.update({status:'已完成',logisticsInfo:appendLogistics({...row.logisticsInfo,status:'已签收'},'买家已确认收货，交易完成')});
      return res.json(orderDto(row));
    }
    if(req.body.status==='待收货'&&isSeller){
      if(row.status!=='待发货')return res.status(400).json({message:'此订单状态无法发货'});
      const info=req.body.logisticsInfo||{},company=String(info.company||'').trim(),trackingNumber=String(info.trackingNumber||'').trim();
      if(!company||!trackingNumber)return res.status(400).json({message:'物流公司和物流单号不能为空，请填写完整后再发货'});
      await row.update({status:'待收货',logisticsInfo:appendLogistics({company,trackingNumber,status:info.status||'运输中'},'卖家已发货，包裹开始运输')});
      await requestJson(userServiceUrl, `/internal/users/${req.user.id}/credit`, {method:'POST',body:{delta:2,reason:'timely-shipping'}}).catch(()=>{});
      return res.json(orderDto(row));
    }
    return res.status(400).json({message:'请使用明确的订单状态操作接口'});
  } catch(error){return next(error);}
});

const verifyPurchase = async (req,res) => { const where={userId:Number(req.query.userId)}; if(req.params.orderId)where.id=req.params.orderId; const rows=await Order.findAll({where}); const row=rows.find(order=>(order.items||[]).some(item=>Number(item.productId)===Number(req.params.productId))&&(!req.query.paid||['待发货','待收货','已完成'].includes(order.status))); if(!row)return res.status(404).json({message:'未找到符合条件的订单'}); if(req.params.orderId&&row.status!=='已完成')return res.status(409).json({message:'订单完成后才能评价'}); return res.json({orderId:row.id,userId:row.userId,status:row.status,purchased:true}); };
router.get('/internal/orders/:orderId/purchases/:productId', requireInternalToken, verifyPurchase);
router.get('/internal/orders/purchases/:productId', requireInternalToken, verifyPurchase);
router.get('/api/orders/health/dependencies', async (req,res) => { try { await requestJson(productServiceUrl,'/health'); return res.json({service:serviceName,status:'ok',dependencies:{productService:'ok'}}); } catch(error){return res.status(206).json({service:serviceName,status:'degraded',dependencies:{productService:'degraded'},fallback:'商品信息暂不可用，订单查询保持可用'});} });

const checkDatabaseReady=async()=>{if(!databaseReady)return false;await sequelize.authenticate();return true;};
const app=createService({express,name:serviceName,version,isReady:checkDatabaseReady,routes:instance=>instance.use(router)});
async function backfillOrderSellerLinks(){
  let lastId=0;
  while(true){
    const orders=await Order.findAll({where:{id:{[Op.gt]:lastId}},attributes:['id','items'],order:[['id','ASC']],limit:500});
    if(!orders.length)break;
    const links=orders.flatMap(order=>getSellerIds(order.items).map(sellerId=>({orderId:order.id,sellerId})));
    if(links.length)await OrderSeller.bulkCreate(links,{ignoreDuplicates:true});
    lastId=orders[orders.length-1].id;
  }
}
async function initialize(){await initializeDatabase(sequelize);await backfillOrderSellerLinks();databaseReady=true;}
if(require.main===module)initialize().then(()=>app.listen(Number(process.env.PORT||3103),()=>console.log(`${serviceName} listening`))).catch(error=>{console.error(error);process.exit(1);});
module.exports={app,initialize,sequelize,models:{Order,OrderSeller},queries:{fetchSellerOrders,syncOrderSellerLinks,backfillOrderSellerLinks}};
