const Order = require('../models/Order');
const Product = require('../models/Product');

// 创建订单
exports.createOrder = async (req, res) => {
  const { items, shippingAddress, paymentMethod } = req.body;

  try {
    let totalAmount = 0;
    const orderItems = [];

    // 验证商品库存并计算总金额
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `商品 ${item.productId} 不存在` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `商品 ${product.name} 库存不足` });
      }

      totalAmount += product.price * item.quantity;
      orderItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.images[0]
      });

      // 扣减库存
      product.stock -= item.quantity;
      product.sales += item.quantity;
      await product.save();
    }

    // 创建订单
    const order = await Order.create({
      userId: req.user._id,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: '创建订单失败', error: error.message });
  }
};

// 获取用户订单列表
exports.getUserOrders = async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  try {
    const query = { userId: req.user._id };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: '获取订单列表失败', error: error.message });
  }
};

// 获取订单详情
exports.getOrderDetail = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    // 检查是否是订单的所有者
    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '无权查看此订单' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: '获取订单详情失败', error: error.message });
  }
};

// 更新订单状态
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status, logisticsInfo } = req.body;

  try {
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    // 检查是否是订单的所有者
    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '无权修改此订单' });
    }

    // 更新订单状态
    if (status) {
      order.status = status;
    }

    // 更新物流信息
    if (logisticsInfo) {
      order.logisticsInfo = { ...order.logisticsInfo, ...logisticsInfo };
    }

    order.updatedAt = Date.now();
    const updatedOrder = await order.save();

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: '更新订单状态失败', error: error.message });
  }
};

// 取消订单
exports.cancelOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    // 检查是否是订单的所有者
    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '无权取消此订单' });
    }

    // 检查订单状态是否可以取消
    if (!['待付款', '待发货'].includes(order.status)) {
      return res.status(400).json({ message: '此订单状态无法取消' });
    }

    // 恢复商品库存
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.stock += item.quantity;
        product.sales -= item.quantity;
        await product.save();
      }
    }

    // 更新订单状态
    order.status = '已取消';
    order.updatedAt = Date.now();
    const updatedOrder = await order.save();

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: '取消订单失败', error: error.message });
  }
};

// 模拟支付
exports.payOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    // 检查是否是订单的所有者
    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '无权支付此订单' });
    }

    // 检查订单状态
    if (order.status !== '待付款') {
      return res.status(400).json({ message: '此订单状态无法支付' });
    }

    // 模拟支付成功
    order.status = '待发货';
    order.paymentStatus = '已支付';
    order.updatedAt = Date.now();
    const updatedOrder = await order.save();

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: '支付失败', error: error.message });
  }
};