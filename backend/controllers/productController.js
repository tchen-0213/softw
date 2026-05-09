const Product = require('../models/Product');

// 获取商品列表
exports.getProducts = async (req, res) => {
  const { category, page = 1, limit = 20, sort = 'createdAt' } = req.query;

  try {
    const query = {};
    if (category) {
      query.category = category;
    }

    const skip = (page - 1) * limit;
    const products = await Product.find(query)
      .sort({ [sort]: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    res.json({
      products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: '获取商品列表失败', error: error.message });
  }
};

// 获取商品详情
exports.getProductDetail = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: '商品不存在' });
    }

    // 增加浏览量
    product.views += 1;
    await product.save();

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: '获取商品详情失败', error: error.message });
  }
};

// 搜索商品
exports.searchProducts = async (req, res) => {
  const { keyword, category, minPrice, maxPrice, page = 1, limit = 20 } = req.query;

  try {
    const query = {};
    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }
    if (category) {
      query.category = category;
    }
    if (minPrice) {
      query.price = { ...query.price, $gte: parseFloat(minPrice) };
    }
    if (maxPrice) {
      query.price = { ...query.price, $lte: parseFloat(maxPrice) };
    }

    const skip = (page - 1) * limit;
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    res.json({
      products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: '搜索商品失败', error: error.message });
  }
};

// 获取推荐商品
exports.getRecommendedProducts = async (req, res) => {
  try {
    // 简单的推荐逻辑：按销量和评分排序
    const products = await Product.find({ status: '在售' })
      .sort({ sales: -1, rating: -1 })
      .limit(10);

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: '获取推荐商品失败', error: error.message });
  }
};

// 创建商品（需要登录）
exports.createProduct = async (req, res) => {
  const { name, description, images, price, stock, category, isSecondhand, condition, location } = req.body;

  try {
    const product = await Product.create({
      name,
      description,
      images,
      price,
      stock,
      category,
      sellerId: req.user._id,
      sellerName: req.user.username,
      isSecondhand: isSecondhand || false,
      condition,
      location
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: '创建商品失败', error: error.message });
  }
};

// 更新商品（需要登录，只能更新自己的商品）
exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, description, images, price, stock, status, category, condition, location } = req.body;

  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: '商品不存在' });
    }

    // 检查是否是商品的卖家
    if (product.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '无权修改此商品' });
    }

    // 更新商品信息
    product.name = name || product.name;
    product.description = description || product.description;
    product.images = images || product.images;
    product.price = price || product.price;
    product.stock = stock || product.stock;
    product.status = status || product.status;
    product.category = category || product.category;
    product.condition = condition || product.condition;
    product.location = location || product.location;
    product.updatedAt = Date.now();

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: '更新商品失败', error: error.message });
  }
};

// 删除商品（需要登录，只能删除自己的商品）
exports.deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: '商品不存在' });
    }

    // 检查是否是商品的卖家
    if (product.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '无权删除此商品' });
    }

    await product.remove();
    res.json({ message: '商品删除成功' });
  } catch (error) {
    res.status(500).json({ message: '删除商品失败', error: error.message });
  }
};