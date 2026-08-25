const Product = require('../models/Product');
const Shop = require('../models/Shop');
const User = require('../models/User');

const toProductDto = (product) => {
  const data = product.toJSON ? product.toJSON() : product;
  return {
    ...data,
    images: data.images || [],
    videos: data.videos || [],
    productType: data.isSecondhand ? 2 : 1,
    bargainEnabled: data.bargainEnabled !== false,
    evaluationCount: data.reviewCount || 0
  };
};

const buildDefaultShop = (user) => ({
  userId: user.id,
  name: `${user.nickname || user.username}的店铺`,
  avatar: user.avatar || '',
  description: '欢迎来到我的店铺。',
  status: '待认证',
  verificationStatus: '未认证'
});

const getOrCreateShop = async (user) => {
  const [shop] = await Shop.findOrCreate({
    where: { userId: user.id },
    defaults: buildDefaultShop(user)
  });

  return shop;
};

const toOwnerCreditDto = (user) => ({
  id: user?.id,
  username: user?.username,
  nickname: user?.nickname || user?.username,
  avatar: user?.avatar || '',
  creditLevel: user?.creditLevel || '普通',
  creditScore: user?.creditScore ?? 100
});

const toShopDto = async (shop, owner) => {
  const data = shop.toJSON ? shop.toJSON() : shop;
  const shopOwner = owner || await User.findByPk(data.userId, {
    attributes: ['id', 'username', 'nickname', 'avatar', 'creditLevel', 'creditScore']
  });
  const products = await Product.findAll({
    where: { sellerId: data.userId },
    order: [['updatedAt', 'DESC']]
  });
  const ownerCredit = toOwnerCreditDto(shopOwner);

  return {
    ...data,
    status: data.status || '待认证',
    verificationStatus: data.verificationStatus || (data.status === '营业中' ? '已认证' : '未认证'),
    legalName: data.legalName || '',
    idNumber: data.idNumber || '',
    verificationAddress: data.verificationAddress || '',
    businessLicenseImage: data.businessLicenseImage || '',
    idCardImage: data.idCardImage || '',
    logo: data.avatar,
    owner: ownerCredit,
    creditLevel: ownerCredit.creditLevel,
    creditScore: ownerCredit.creditScore,
    products: products.map(toProductDto)
  };
};

exports.getMyShop = async (req, res) => {
  try {
    const shop = await getOrCreateShop(req.user);
    res.json(await toShopDto(shop, req.user));
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

    res.json(await toShopDto(shop, req.user));
  } catch (error) {
    res.status(500).json({ message: '更新店铺失败', error: error.message });
  }
};

exports.submitShopVerification = async (req, res) => {
  const {
    legalName,
    idNumber,
    verificationAddress,
    businessLicenseImage,
    idCardImage
  } = req.body;

  const requiredFields = [
    { value: legalName, label: '经营者姓名' },
    { value: idNumber, label: '身份证号' },
    { value: verificationAddress, label: '经营地址' },
    { value: businessLicenseImage, label: '营业执照' },
    { value: idCardImage, label: '身份证照片' }
  ];
  const missingField = requiredFields.find(field => !String(field.value || '').trim());

  if (missingField) {
    return res.status(400).json({ message: `${missingField.label}不能为空` });
  }

  try {
    const shop = await getOrCreateShop(req.user);
    await shop.update({
      legalName: String(legalName).trim(),
      idNumber: String(idNumber).trim(),
      verificationAddress: String(verificationAddress).trim(),
      businessLicenseImage,
      idCardImage,
      verificationStatus: '已认证',
      status: '营业中',
      verificationSubmittedAt: new Date()
    });

    res.json(await toShopDto(shop, req.user));
  } catch (error) {
    res.status(500).json({ message: '提交店铺验证失败', error: error.message });
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

exports.getShopByUserId = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const shop = await getOrCreateShop(user);
    res.json(await toShopDto(shop, user));
  } catch (error) {
    res.status(500).json({ message: '获取用户店铺失败', error: error.message });
  }
};

exports._internal = { buildDefaultShop, toOwnerCreditDto };
