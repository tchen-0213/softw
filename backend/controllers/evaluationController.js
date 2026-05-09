const Evaluation = require('../models/Evaluation');
const Product = require('../models/Product');

// 创建评价
exports.createEvaluation = async (req, res) => {
  const { orderId, productId, rating, content, images } = req.body;

  try {
    // 检查商品是否存在
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: '商品不存在' });
    }

    // 检查是否已经评价过
    const existingEvaluation = await Evaluation.findOne({
      userId: req.user._id,
      productId,
      orderId
    });
    if (existingEvaluation) {
      return res.status(400).json({ message: '已经评价过此商品' });
    }

    // 创建评价
    const evaluation = await Evaluation.create({
      orderId,
      userId: req.user._id,
      productId,
      sellerId: product.sellerId,
      rating,
      content,
      images
    });

    // 更新商品的评分和评价数
    const evaluations = await Evaluation.find({ productId, status: '已发布' });
    const totalRating = evaluations.reduce((sum, evalItem) => sum + evalItem.rating, 0);
    product.rating = totalRating / evaluations.length;
    product.reviewCount = evaluations.length;
    await product.save();

    res.status(201).json(evaluation);
  } catch (error) {
    res.status(500).json({ message: '创建评价失败', error: error.message });
  }
};

// 获取商品的评价列表
exports.getProductEvaluations = async (req, res) => {
  const { productId, page = 1, limit = 10 } = req.query;

  try {
    const skip = (page - 1) * limit;
    const evaluations = await Evaluation.find({
      productId,
      status: '已发布'
    })
      .populate('userId', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Evaluation.countDocuments({
      productId,
      status: '已发布'
    });

    res.json({
      evaluations,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: '获取评价列表失败', error: error.message });
  }
};

// 获取用户的评价历史
exports.getUserEvaluations = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  try {
    const skip = (page - 1) * limit;
    const evaluations = await Evaluation.find({
      userId: req.user._id,
      status: '已发布'
    })
      .populate('productId', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Evaluation.countDocuments({
      userId: req.user._id,
      status: '已发布'
    });

    res.json({
      evaluations,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: '获取评价历史失败', error: error.message });
  }
};

// 回复评价（卖家功能）
exports.replyEvaluation = async (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;

  try {
    const evaluation = await Evaluation.findById(id);
    if (!evaluation) {
      return res.status(404).json({ message: '评价不存在' });
    }

    // 检查是否是商品的卖家
    if (evaluation.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '无权回复此评价' });
    }

    // 更新回复
    evaluation.reply = reply;
    evaluation.updatedAt = Date.now();
    const updatedEvaluation = await evaluation.save();

    res.json(updatedEvaluation);
  } catch (error) {
    res.status(500).json({ message: '回复评价失败', error: error.message });
  }
};

// 审核评价（管理员功能，这里简化处理）
exports.approveEvaluation = async (req, res) => {
  const { id } = req.params;

  try {
    const evaluation = await Evaluation.findById(id);
    if (!evaluation) {
      return res.status(404).json({ message: '评价不存在' });
    }

    // 更新评价状态为已发布
    evaluation.status = '已发布';
    evaluation.updatedAt = Date.now();
    const updatedEvaluation = await evaluation.save();

    // 更新商品的评分和评价数
    const product = await Product.findById(evaluation.productId);
    if (product) {
      const evaluations = await Evaluation.find({ productId: evaluation.productId, status: '已发布' });
      const totalRating = evaluations.reduce((sum, evalItem) => sum + evalItem.rating, 0);
      product.rating = totalRating / evaluations.length;
      product.reviewCount = evaluations.length;
      await product.save();
    }

    res.json(updatedEvaluation);
  } catch (error) {
    res.status(500).json({ message: '审核评价失败', error: error.message });
  }
};