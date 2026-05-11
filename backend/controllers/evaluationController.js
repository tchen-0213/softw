const Evaluation = require('../models/Evaluation');
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');

const parsePaging = (query) => {
  const page = Math.max(parseInt(query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || '10', 10), 1), 100);
  return { page, limit, offset: (page - 1) * limit };
};

const toEvaluationDto = (evaluation) => {
  const data = evaluation.toJSON ? evaluation.toJSON() : evaluation;
  if (data.user) {
    data.user = {
      id: data.user.id,
      username: data.user.username,
      nickname: data.user.nickname || data.user.username,
      avatar: data.user.avatar
    };
  }
  return data;
};

const updateProductRating = async (productId) => {
  const evaluations = await Evaluation.findAll({
    where: { productId, status: '已发布' },
    attributes: ['rating']
  });

  const reviewCount = evaluations.length;
  const rating = reviewCount
    ? evaluations.reduce((sum, item) => sum + Number(item.rating), 0) / reviewCount
    : 0;

  await Product.update(
    { rating, reviewCount },
    { where: { id: productId } }
  );
};

// 创建评价
exports.createEvaluation = async (req, res) => {
  const { orderId, productId, rating, content, images = [] } = req.body;

  try {
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: '商品不存在' });
    }

    const order = await Order.findByPk(orderId);
    if (!order || Number(order.userId) !== Number(req.user.id)) {
      return res.status(400).json({ message: '订单不存在或无权评价' });
    }

    const purchased = (order.items || []).some((item) => Number(item.productId) === Number(productId));
    if (!purchased) {
      return res.status(400).json({ message: '只能评价已购买商品' });
    }

    const existingEvaluation = await Evaluation.findOne({
      where: {
        userId: req.user.id,
        productId,
        orderId
      }
    });
    if (existingEvaluation) {
      return res.status(400).json({ message: '已经评价过此商品' });
    }

    const evaluation = await Evaluation.create({
      orderId,
      userId: req.user.id,
      productId,
      sellerId: product.sellerId,
      rating,
      content,
      images,
      status: '已发布'
    });

    await updateProductRating(productId);
    res.status(201).json(toEvaluationDto(evaluation));
  } catch (error) {
    res.status(500).json({ message: '创建评价失败', error: error.message });
  }
};

// 获取商品的评价列表
exports.getProductEvaluations = async (req, res) => {
  const { productId } = req.query;
  const { page, limit, offset } = parsePaging(req.query);

  try {
    const { rows, count } = await Evaluation.findAndCountAll({
      where: {
        productId,
        status: '已发布'
      },
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'nickname', 'avatar'] }],
      order: [['createdAt', 'DESC']],
      offset,
      limit
    });

    res.json({
      evaluations: rows.map(toEvaluationDto),
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: '获取评价列表失败', error: error.message });
  }
};

// 获取用户的评价历史
exports.getUserEvaluations = async (req, res) => {
  const { page, limit, offset } = parsePaging(req.query);

  try {
    const { rows, count } = await Evaluation.findAndCountAll({
      where: {
        userId: req.user.id,
        status: '已发布'
      },
      include: [{ model: Product, attributes: ['id', 'name', 'images'] }],
      order: [['createdAt', 'DESC']],
      offset,
      limit
    });

    res.json({
      evaluations: rows.map(toEvaluationDto),
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: '获取评价历史失败', error: error.message });
  }
};

// 回复评价（卖家功能）
exports.replyEvaluation = async (req, res) => {
  const { reply } = req.body;

  try {
    const evaluation = await Evaluation.findByPk(req.params.id);
    if (!evaluation) {
      return res.status(404).json({ message: '评价不存在' });
    }

    if (Number(evaluation.sellerId) !== Number(req.user.id)) {
      return res.status(403).json({ message: '无权回复此评价' });
    }

    await evaluation.update({ reply });
    res.json(toEvaluationDto(evaluation));
  } catch (error) {
    res.status(500).json({ message: '回复评价失败', error: error.message });
  }
};

// 审核评价（管理员功能，这里简化处理）
exports.approveEvaluation = async (req, res) => {
  try {
    const evaluation = await Evaluation.findByPk(req.params.id);
    if (!evaluation) {
      return res.status(404).json({ message: '评价不存在' });
    }

    await evaluation.update({ status: '已发布' });
    await updateProductRating(evaluation.productId);

    res.json(toEvaluationDto(evaluation));
  } catch (error) {
    res.status(500).json({ message: '审核评价失败', error: error.message });
  }
};
