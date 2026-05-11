const { Op } = require('sequelize');
const Product = require('../models/Product');
const User = require('../models/User');

const conditionMap = {
  1: '全新',
  2: '9成新',
  3: '8成新',
  4: '7成新',
  5: '6成新及以下'
};

const sortableFields = {
  default: ['createdAt', 'DESC'],
  newest: ['createdAt', 'DESC'],
  createdAt: ['createdAt', 'DESC'],
  sales: ['sales', 'DESC'],
  rating: ['rating', 'DESC'],
  price_asc: ['price', 'ASC'],
  price_desc: ['price', 'DESC']
};

const parseBoolean = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return value === true || value === 'true' || value === '1' || value === 1;
};

const parsePaging = (query) => {
  const page = Math.max(parseInt(query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || query.size || '20', 10), 1), 100);
  return { page, limit, offset: (page - 1) * limit };
};

const buildWhere = (query) => {
  const where = {};
  const keyword = (query.keyword || '').trim();
  const minPrice = query.minPrice || query.priceMin;
  const maxPrice = query.maxPrice || query.priceMax;
  const isSecondhand = parseBoolean(query.isSecondhand);

  if (keyword) {
    where[Op.or] = [
      { name: { [Op.like]: `%${keyword}%` } },
      { description: { [Op.like]: `%${keyword}%` } }
    ];
  }

  if (query.category && query.category !== 'all') {
    where.category = query.category;
  }

  if (isSecondhand !== undefined) {
    where.isSecondhand = isSecondhand;
  }

  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) {
      where.price[Op.gte] = Number(minPrice);
    }
    if (maxPrice) {
      where.price[Op.lte] = Number(maxPrice);
    }
  }

  if (query.status) {
    where.status = query.status;
  }

  return where;
};

const getOrder = (query) => {
  const sortKey = query.sortBy || query.sort || 'default';
  return [sortableFields[sortKey] || sortableFields.default];
};

const toProductDto = (product) => {
  const data = product.toJSON ? product.toJSON() : product;
  const seller = data.User
    ? {
        id: data.User.id,
        username: data.User.username,
        nickname: data.User.nickname || data.User.username,
        avatar: data.User.avatar,
        creditLevel: data.User.creditLevel,
        creditScore: data.User.creditScore
      }
    : {
        id: data.sellerId,
        nickname: data.sellerName,
        username: data.sellerName
      };

  delete data.User;

  return {
    ...data,
    images: data.images || [],
    videos: data.videos || [],
    seller,
    productType: data.isSecondhand ? 2 : 1,
    evaluationCount: data.reviewCount || 0
  };
};

// 获取商品列表
exports.getProducts = async (req, res) => {
  const { page, limit, offset } = parsePaging(req.query);

  try {
    const { rows, count } = await Product.findAndCountAll({
      where: buildWhere(req.query),
      include: [{ model: User, attributes: ['id', 'username', 'nickname', 'avatar', 'creditLevel', 'creditScore'] }],
      order: getOrder(req.query),
      offset,
      limit
    });

    res.json({
      products: rows.map(toProductDto),
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: '获取商品列表失败', error: error.message });
  }
};

// 获取商品详情
exports.getProductDetail = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: User, attributes: ['id', 'username', 'nickname', 'avatar', 'creditLevel', 'creditScore'] }]
    });

    if (!product) {
      return res.status(404).json({ message: '商品不存在' });
    }

    await product.increment('views');
    await product.reload();

    res.json(toProductDto(product));
  } catch (error) {
    res.status(500).json({ message: '获取商品详情失败', error: error.message });
  }
};

// 搜索商品
exports.searchProducts = async (req, res) => {
  return exports.getProducts(req, res);
};

// 获取推荐商品
exports.getRecommendedProducts = async (req, res) => {
  try {
    const isSecondhand = parseBoolean(req.query.isSecondhand);
    const where = { status: '在售' };
    if (isSecondhand !== undefined) {
      where.isSecondhand = isSecondhand;
    }

    const products = await Product.findAll({
      where,
      include: [{ model: User, attributes: ['id', 'username', 'nickname', 'avatar', 'creditLevel', 'creditScore'] }],
      order: [
        ['sales', 'DESC'],
        ['rating', 'DESC'],
        ['createdAt', 'DESC']
      ],
      limit: 10
    });

    res.json(products.map(toProductDto));
  } catch (error) {
    res.status(500).json({ message: '获取推荐商品失败', error: error.message });
  }
};

// 创建商品（需要登录）
exports.createProduct = async (req, res) => {
  const {
    name,
    description,
    images = [],
    videos = [],
    price,
    stock = 1,
    category,
    subCategory,
    brand,
    productType,
    isSecondhand,
    condition,
    location
  } = req.body;

  try {
    const secondhand = isSecondhand === undefined ? Number(productType) === 2 : parseBoolean(isSecondhand);
    const product = await Product.create({
      name,
      description,
      images,
      videos,
      price,
      stock,
      category,
      subCategory,
      brand,
      sellerId: req.user.id,
      sellerName: req.user.nickname || req.user.username,
      isSecondhand: secondhand,
      condition: conditionMap[condition] || condition || null,
      location
    });

    const createdProduct = await Product.findByPk(product.id, {
      include: [{ model: User, attributes: ['id', 'username', 'nickname', 'avatar', 'creditLevel', 'creditScore'] }]
    });

    res.status(201).json(toProductDto(createdProduct));
  } catch (error) {
    res.status(500).json({ message: '创建商品失败', error: error.message });
  }
};

// 更新商品（需要登录，只能更新自己的商品）
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: '商品不存在' });
    }

    if (Number(product.sellerId) !== Number(req.user.id)) {
      return res.status(403).json({ message: '无权修改此商品' });
    }

    const updates = { ...req.body };
    if (updates.condition) {
      updates.condition = conditionMap[updates.condition] || updates.condition;
    }
    if (updates.productType !== undefined && updates.isSecondhand === undefined) {
      updates.isSecondhand = Number(updates.productType) === 2;
    }
    delete updates.productType;
    delete updates.sellerId;
    delete updates.sellerName;

    await product.update(updates);
    const updatedProduct = await Product.findByPk(product.id, {
      include: [{ model: User, attributes: ['id', 'username', 'nickname', 'avatar', 'creditLevel', 'creditScore'] }]
    });

    res.json(toProductDto(updatedProduct));
  } catch (error) {
    res.status(500).json({ message: '更新商品失败', error: error.message });
  }
};

// 删除商品（需要登录，只能删除自己的商品）
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: '商品不存在' });
    }

    if (Number(product.sellerId) !== Number(req.user.id)) {
      return res.status(403).json({ message: '无权删除此商品' });
    }

    await product.destroy();
    res.json({ message: '商品删除成功' });
  } catch (error) {
    res.status(500).json({ message: '删除商品失败', error: error.message });
  }
};
