const Product = require('../models/Product');
const Shop = require('../models/Shop');

const toProductDto = (product) => {
  const data = product.toJSON ? product.toJSON() : product;
  return {
    ...data,
    images: data.images || [],
    videos: data.videos || [],
    productType: data.isSecondhand ? 2 : 1,
    evaluationCount: data.reviewCount || 0
  };
};

const buildDefaultShop = (user) => ({
  userId: user.id,
  name: `${user.nickname || user.username}的店铺`,
  avatar: user.avatar || '',
  description: '欢迎来到我的店铺。'
});

const getOrCreateShop = async (user) => {
  const [shop] = await Shop.findOrCreate({
    where: { userId: user.id },
    defaults: buildDefaultShop(user)
  });

  return shop;
};

const toShopDto = async (shop) => {
  const data = shop.toJSON ? shop.toJSON() : shop;
  const products = await Product.findAll({
    where: { sellerId: data.userId },
    order: [['updatedAt', 'DESC']]
  });

  return {
    ...data,
    logo: data.avatar,
    products: products.map(toProductDto)
  };
};

exports.getMyShop = async (req, res) => {
  try {
    const shop = await getOrCreateShop(req.user);
    res.json(await toShopDto(shop));
  } catch (error) {
    res.status(500).json({ message: '获取店铺失败', error: error.message });
  }
};

exports.updateMyShop = async (req, res) => {
  const { name, description, avatar, logo, banner } = req.body;
  const hasField = (field) => Object.prototype.hasOwnProperty.call(req.body, field);

  try {
    const shop = await getOrCreateShop(req.user);
    const nextAvatar = hasField('avatar')
      ? avatar
      : (hasField('logo') ? logo : shop.avatar);

    await shop.update({
      name: name || shop.name,
      description: description ?? shop.description,
      avatar: nextAvatar,
      banner: hasField('banner') ? banner : shop.banner
    });

    res.json(await toShopDto(shop));
  } catch (error) {
    res.status(500).json({ message: '更新店铺失败', error: error.message });
  }
};

exports.getShopDetail = async (req, res) => {
  try {
    const shop = await Shop.findByPk(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    res.json(await toShopDto(shop));
  } catch (error) {
    res.status(500).json({ message: '获取店铺详情失败', error: error.message });
  }
};
