const Evaluation = require('../models/Evaluation');
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const { validateEvaluationPayload } = require('../utils/inputValidation');
const {
  applyCreditDelta,
  getCreditDeltaByRating,
  getLowRatingPenalty
} = require('../utils/creditRules');

const parsePaging = (query) => {
  const page = Math.max(parseInt(query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || '10', 10), 1), 100);
  return { page, limit, offset: (page - 1) * limit };
};

const normalizeReplyItem = (item, index, data) => {
  const role = item.role === 'buyer' ? 'buyer' : 'seller';
  return {
    id: item.id || `${data.id || 'reply'}-${index}`,
    role,
    userId: item.userId || (role === 'seller' ? data.sellerId : data.userId),
    username: item.username || (role === 'seller' ? '卖家' : '买家'),
    avatar: item.avatar || '',
    content: String(item.content || '').trim(),
    createdAt: item.createdAt || data.updatedAt || data.createdAt
  };
};

const parseReplyThread = (reply, data = {}) => {
  const rawReply = String(reply || '').trim();
  if (!rawReply) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawReply);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item, index) => normalizeReplyItem(item || {}, index, data))
        .filter(item => item.content);
    }
  } catch {
    // 兼容旧数据：原 reply 字段里如果是普通文本，就视为一条卖家回复。
  }

  return [normalizeReplyItem({
    role: 'seller',
    userId: data.sellerId,
    username: '卖家',
    content: rawReply
  }, 0, data)];
};

const getLatestSellerReply = (replies) => {
  const latest = [...replies].reverse().find(item => item.role === 'seller');
  return latest?.content || '';
};

const isPendingSellerReply = (replies) => (
  replies.length === 0 || replies[replies.length - 1].role !== 'seller'
);

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
  if (data.Product) {
    data.product = {
      id: data.Product.id,
      name: data.Product.name,
      images: data.Product.images || []
    };
    delete data.Product;
  }
  const replies = parseReplyThread(data.reply, data);
  data.replies = replies;
  data.reply = getLatestSellerReply(replies);
  data.pendingSellerReply = isPendingSellerReply(replies);
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

const getSellerLowRatingPenalty = async (sellerId) => {
  const evaluations = await Evaluation.findAll({
    where: { sellerId, status: '已发布' },
    attributes: ['rating']
  });

  return getLowRatingPenalty(evaluations.map(item => item.rating));
};

const updateSellerCredit = async (sellerId, rating, previousLowRatingPenalty = 0) => {
  const seller = await User.findByPk(sellerId);
  if (!seller) {
    return;
  }

  const currentLowRatingPenalty = await getSellerLowRatingPenalty(sellerId);
  const lowRatingPenaltyDelta = currentLowRatingPenalty - previousLowRatingPenalty;
  const creditDelta = getCreditDeltaByRating(rating) + lowRatingPenaltyDelta;

  await applyCreditDelta(seller, creditDelta);
};

// 创建评价
exports.createEvaluation = async (req, res) => {
  const { orderId, productId, rating, content, images = [] } = req.body;

  const validationError = validateEvaluationPayload(req.body);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: '商品不存在' });
    }

    const order = await Order.findByPk(orderId);
    if (!order || Number(order.userId) !== Number(req.user.id)) {
      return res.status(400).json({ message: '订单不存在或无权评价' });
    }

    if (order.status !== '已完成') {
      return res.status(400).json({ message: '订单完成后才能评价' });
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

    const previousLowRatingPenalty = await getSellerLowRatingPenalty(product.sellerId);
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
    await updateSellerCredit(product.sellerId, rating, previousLowRatingPenalty);
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

// 获取卖家收到的评价
exports.getSellerEvaluations = async (req, res) => {
  const { page, limit, offset } = parsePaging(req.query);

  try {
    const { rows, count } = await Evaluation.findAndCountAll({
      where: {
        sellerId: req.user.id,
        status: '已发布'
      },
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'nickname', 'avatar'] },
        { model: Product, attributes: ['id', 'name', 'images'] }
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit
    });

    const evaluations = rows.map(toEvaluationDto);
    const pendingReplyCount = evaluations.filter(item => item.pendingSellerReply).length;

    res.json({
      evaluations,
      pendingReplyCount,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: '获取卖家评价失败', error: error.message });
  }
};

// 回复评价（卖家或原买家都可继续跟帖）
exports.replyEvaluation = async (req, res) => {
  const { reply } = req.body;

  if (!String(reply || '').trim()) {
    return res.status(400).json({ message: '回复内容不能为空' });
  }

  try {
    const evaluation = await Evaluation.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'nickname', 'avatar'] },
        { model: Product, attributes: ['id', 'name', 'images'] }
      ]
    });
    if (!evaluation) {
      return res.status(404).json({ message: '评价不存在' });
    }

    const isSeller = Number(evaluation.sellerId) === Number(req.user.id);
    const isBuyer = Number(evaluation.userId) === Number(req.user.id);

    if (!isSeller && !isBuyer) {
      return res.status(403).json({ message: '无权回复此评价' });
    }

    const currentData = evaluation.toJSON ? evaluation.toJSON() : evaluation;
    const replies = parseReplyThread(evaluation.reply, currentData);
    replies.push({
      id: `${evaluation.id}-${Date.now()}`,
      role: isSeller ? 'seller' : 'buyer',
      userId: req.user.id,
      username: req.user.nickname || req.user.username,
      avatar: req.user.avatar || '',
      content: String(reply).trim(),
      createdAt: new Date().toISOString()
    });

    await evaluation.update({ reply: JSON.stringify(replies) });
    await evaluation.reload({
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'nickname', 'avatar'] },
        { model: Product, attributes: ['id', 'name', 'images'] }
      ]
    });
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

exports._internal = {
  parsePaging,
  normalizeReplyItem,
  parseReplyThread,
  getLatestSellerReply,
  isPendingSellerReply,
  toEvaluationDto
};
