const sequelize = require('../config/database');
const Order = require('../models/Order');
const Product = require('../models/Product');

const paymentMethodMap = {
  alipay: '支付宝',
  wechat: '微信支付',
  wechatpay: '微信支付',
  bankcard: '银行卡',
  creditcard: '银行卡'
};

const orderFlow = {
  WAITING_PAY: '待付款',
  WAITING_SHIP: '待发货',
  WAITING_RECEIVE: '待收货',
  FINISHED: '已完成',
  CANCELLED: '已取消'
};

const parsePaging = (query) => {
  const page = Math.max(parseInt(query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || '10', 10), 1), 100);
  return { page, limit, offset: (page - 1) * limit };
};

const toOrderDto = (order) => {
  const data = order.toJSON ? order.toJSON() : order;
  return {
    ...data,
    logistics: data.logisticsInfo
  };
};

const hasSellerItem = (order, userId) => (
  (order.items || []).some(item => Number(item.sellerId) === Number(userId))
);

const appendLogisticsStep = (logisticsInfo, description) => {
  const now = new Date().toLocaleString('zh-CN', { hour12: false });
  const current = logisticsInfo || {};
  return {
    ...current,
    steps: [
      {
        time: now,
        description
      },
      ...(current.steps || [])
    ]
  };
};

// 创建订单
exports.createOrder = async (req, res) => {
  const { items = [], shippingAddress, paymentMethod } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: '订单商品不能为空' });
  }

  const transaction = await sequelize.transaction();

  try {
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const productId = item.productId || item.id;
      const quantity = Math.max(parseInt(item.quantity || '1', 10), 1);
      const product = await Product.findByPk(productId, { transaction });

      if (!product) {
        await transaction.rollback();
        return res.status(404).json({ message: `商品 ${productId} 不存在` });
      }

      if (product.status !== '在售') {
        await transaction.rollback();
        return res.status(400).json({ message: `商品 ${product.name} 当前不可购买` });
      }

      if (product.stock < quantity) {
        await transaction.rollback();
        return res.status(400).json({ message: `商品 ${product.name} 库存不足` });
      }

      const price = Number(product.price);
      totalAmount += price * quantity;
      orderItems.push({
        productId: product.id,
        name: product.name,
        price,
        quantity,
        image: product.images?.[0] || '',
        sellerId: product.sellerId,
        sellerName: product.sellerName,
        isSecondhand: product.isSecondhand
      });

      const nextStock = product.stock - quantity;
      await product.update({
        stock: nextStock,
        sales: product.sales + quantity,
        status: product.isSecondhand && nextStock <= 0 ? '已预订' : product.status
      }, { transaction });
    }

    const order = await Order.create({
      userId: req.user.id,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod: paymentMethodMap[paymentMethod] || paymentMethod || '微信支付'
    }, { transaction });

    await transaction.commit();
    res.status(201).json(toOrderDto(order));
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: '创建订单失败', error: error.message });
  }
};

// 获取用户订单列表
exports.getUserOrders = async (req, res) => {
  const { page, limit, offset } = parsePaging(req.query);

  try {
    const where = { userId: req.user.id };
    if (req.query.status) {
      where.status = req.query.status;
    }

    const { rows, count } = await Order.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      offset,
      limit
    });

    res.json({
      orders: rows.map(toOrderDto),
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: '获取订单列表失败', error: error.message });
  }
};

// 获取卖家相关订单
exports.getSellerOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      order: [['createdAt', 'DESC']]
    });

    const sellerOrders = orders
      .filter(order => hasSellerItem(order, req.user.id))
      .map(order => {
        const data = toOrderDto(order);
        return {
          ...data,
          items: (data.items || []).filter(item => Number(item.sellerId) === Number(req.user.id))
        };
      });

    res.json({ orders: sellerOrders });
  } catch (error) {
    res.status(500).json({ message: '获取卖家订单失败', error: error.message });
  }
};

// 获取订单详情
exports.getOrderDetail = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    if (Number(order.userId) !== Number(req.user.id)) {
      return res.status(403).json({ message: '无权查看此订单' });
    }

    res.json(toOrderDto(order));
  } catch (error) {
    res.status(500).json({ message: '获取订单详情失败', error: error.message });
  }
};

// 更新订单状态
exports.updateOrderStatus = async (req, res) => {
  const { status, logisticsInfo } = req.body;

  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    const isBuyer = Number(order.userId) === Number(req.user.id);
    const isSeller = hasSellerItem(order, req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({ message: '无权修改此订单' });
    }

    if (!isAdmin) {
      if (isBuyer && status && status !== orderFlow.FINISHED) {
        return res.status(403).json({ message: '买家只能确认收货' });
      }
      if (isSeller && status && status !== orderFlow.WAITING_RECEIVE) {
        return res.status(403).json({ message: '卖家只能执行发货操作' });
      }
    }

    await order.update({
      status: status || order.status,
      logisticsInfo: logisticsInfo ? { ...(order.logisticsInfo || {}), ...logisticsInfo } : order.logisticsInfo
    });

    res.json(toOrderDto(order));
  } catch (error) {
    res.status(500).json({ message: '更新订单状态失败', error: error.message });
  }
};

// 取消订单
exports.cancelOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const order = await Order.findByPk(req.params.id, { transaction });
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ message: '订单不存在' });
    }

    if (Number(order.userId) !== Number(req.user.id)) {
      await transaction.rollback();
      return res.status(403).json({ message: '无权取消此订单' });
    }

    if (![orderFlow.WAITING_PAY, orderFlow.WAITING_SHIP].includes(order.status)) {
      await transaction.rollback();
      return res.status(400).json({ message: '此订单状态无法取消' });
    }

    for (const item of order.items || []) {
      const product = await Product.findByPk(item.productId, { transaction });
      if (product) {
        const nextStatus = product.isSecondhand && product.status === '已预订'
          ? '在售'
          : product.status;
        await product.update({
          stock: product.stock + item.quantity,
          sales: Math.max(product.sales - item.quantity, 0),
          status: nextStatus
        }, { transaction });
      }
    }

    await order.update({ status: orderFlow.CANCELLED }, { transaction });
    await transaction.commit();

    res.json(toOrderDto(order));
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: '取消订单失败', error: error.message });
  }
};

// 模拟支付
exports.payOrder = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    if (Number(order.userId) !== Number(req.user.id)) {
      return res.status(403).json({ message: '无权支付此订单' });
    }

    if (order.status !== orderFlow.WAITING_PAY) {
      return res.status(400).json({ message: '此订单状态无法支付' });
    }

    await order.update({
      status: orderFlow.WAITING_SHIP,
      paymentStatus: '已支付'
    });

    res.json(toOrderDto(order));
  } catch (error) {
    res.status(500).json({ message: '支付失败', error: error.message });
  }
};

// 卖家发货
exports.shipOrder = async (req, res) => {
  const { company, trackingNumber, status = '运输中' } = req.body;

  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    if (!hasSellerItem(order, req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权发货此订单' });
    }

    if (order.status !== orderFlow.WAITING_SHIP) {
      return res.status(400).json({ message: '此订单状态无法发货' });
    }

    const baseLogistics = {
      ...(order.logisticsInfo || {}),
      company: company || order.logisticsInfo?.company || '商家配送',
      trackingNumber: trackingNumber || order.logisticsInfo?.trackingNumber || `NO${Date.now()}`,
      status
    };

    await order.update({
      status: orderFlow.WAITING_RECEIVE,
      logisticsInfo: appendLogisticsStep(baseLogistics, '卖家已发货，包裹开始运输')
    });

    res.json(toOrderDto(order));
  } catch (error) {
    res.status(500).json({ message: '发货失败', error: error.message });
  }
};

// 买家确认收货
exports.confirmOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const order = await Order.findByPk(req.params.id, { transaction });
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ message: '订单不存在' });
    }

    if (Number(order.userId) !== Number(req.user.id)) {
      await transaction.rollback();
      return res.status(403).json({ message: '无权确认此订单' });
    }

    if (order.status !== orderFlow.WAITING_RECEIVE) {
      await transaction.rollback();
      return res.status(400).json({ message: '此订单状态无法确认收货' });
    }

    for (const item of order.items || []) {
      const product = await Product.findByPk(item.productId, { transaction });
      if (product && product.isSecondhand && product.stock <= 0) {
        await product.update({ status: '已售出' }, { transaction });
      }
    }

    const logisticsInfo = appendLogisticsStep(
      { ...(order.logisticsInfo || {}), status: '已签收' },
      '买家已确认收货，交易完成'
    );

    await order.update({
      status: orderFlow.FINISHED,
      logisticsInfo
    }, { transaction });
    await transaction.commit();

    res.json(toOrderDto(order));
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: '确认收货失败', error: error.message });
  }
};
