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
        image: product.images?.[0] || ''
      });

      await product.update({
        stock: product.stock - quantity,
        sales: product.sales + quantity
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

    if (Number(order.userId) !== Number(req.user.id)) {
      return res.status(403).json({ message: '无权修改此订单' });
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

    if (!['待付款', '待发货'].includes(order.status)) {
      await transaction.rollback();
      return res.status(400).json({ message: '此订单状态无法取消' });
    }

    for (const item of order.items || []) {
      const product = await Product.findByPk(item.productId, { transaction });
      if (product) {
        await product.update({
          stock: product.stock + item.quantity,
          sales: Math.max(product.sales - item.quantity, 0)
        }, { transaction });
      }
    }

    await order.update({ status: '已取消' }, { transaction });
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

    if (order.status !== '待付款') {
      return res.status(400).json({ message: '此订单状态无法支付' });
    }

    await order.update({
      status: '待发货',
      paymentStatus: '已支付'
    });

    res.json(toOrderDto(order));
  } catch (error) {
    res.status(500).json({ message: '支付失败', error: error.message });
  }
};
