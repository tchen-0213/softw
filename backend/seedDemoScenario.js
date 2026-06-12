const dotenv = require('dotenv');
const sequelize = require('./config/database');
const User = require('./models/User');
const Product = require('./models/Product');
const Shop = require('./models/Shop');
const Order = require('./models/Order');
const Evaluation = require('./models/Evaluation');

dotenv.config();

const DEMO_PASSWORD = 'Demo@123456';

const realProductImages = {
  matebook: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80',
  headphones: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
  ipad: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=900&q=80',
  keyboard: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=80',
  lamp: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80',
  book: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=900&q=80',
  runBag: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80',
  hoodie: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80'
};

const createAvatar = () => '/images/moyu-logo.png';

const userSeeds = [
  {
    username: 'demo_seller',
    email: 'demo-seller@example.com',
    phone: '13800000000',
    nickname: '演示店主',
    role: 'seller',
    creditScore: 168,
    creditLevel: '金牌',
    avatar: createAvatar('Seller', '#0f766e')
  },
  {
    username: 'demo_buyer_reviewed',
    email: 'demo-reviewed@example.com',
    phone: '13800000001',
    nickname: '演示买家-已评价',
    role: 'user',
    creditScore: 118,
    creditLevel: '普通',
    avatar: createAvatar('Review', '#2563eb')
  },
  {
    username: 'demo_buyer_todo',
    email: 'demo-todo@example.com',
    phone: '13800000002',
    nickname: '演示买家-待评价',
    role: 'user',
    creditScore: 108,
    creditLevel: '普通',
    avatar: createAvatar('Todo', '#7c3aed')
  },
  {
    username: 'demo_buyer_receive',
    email: 'demo-receive@example.com',
    phone: '13800000003',
    nickname: '演示买家-待收货',
    role: 'user',
    creditScore: 112,
    creditLevel: '普通',
    avatar: createAvatar('Receive', '#d97706')
  },
  {
    username: 'demo_buyer_ship',
    email: 'demo-ship@example.com',
    phone: '13800000004',
    nickname: '演示买家-待发货',
    role: 'user',
    creditScore: 105,
    creditLevel: '普通',
    avatar: createAvatar('Ship', '#be123c')
  },
  {
    username: 'demo_buyer_pay',
    email: 'demo-pay@example.com',
    phone: '13800000005',
    nickname: '演示买家-待付款',
    role: 'user',
    creditScore: 100,
    creditLevel: '普通',
    avatar: createAvatar('Pay', '#334155')
  }
];

const productSeeds = [
  {
    name: '演示新品 MateBook Air 14',
    description: '轻薄办公本，适合课堂展示新品下单、购物车库存限制和订单支付流程。',
    price: 4899,
    stock: 12,
    category: 'electronics',
    subCategory: '电脑',
    brand: 'DemoTech',
    sales: 36,
    isSecondhand: false,
    image: realProductImages.matebook
  },
  {
    name: '演示新品 降噪蓝牙耳机',
    description: '全新未拆封，支持主动降噪和长续航，适合展示待收货与确认收货流程。',
    price: 399,
    stock: 28,
    category: 'electronics',
    subCategory: '耳机',
    brand: 'SoundLab',
    sales: 82,
    isSecondhand: false,
    image: realProductImages.headphones
  },
  {
    name: '演示二手 iPad Pro 11',
    description: '个人自用平板，外观轻微使用痕迹，屏幕显示正常，适合展示卖家发货流程。',
    price: 2699,
    stock: 1,
    category: 'electronics',
    subCategory: '平板',
    brand: 'Apple',
    sales: 5,
    isSecondhand: true,
    condition: '9成新',
    usageTime: '约 10 个月',
    hasDefect: false,
    defectDescription: '',
    location: '上海市浦东新区',
    image: realProductImages.ipad
  },
  {
    name: '演示二手机械键盘',
    description: '青轴机械键盘，部分键帽有轻微打油，不影响使用，用于展示二手瑕疵说明。',
    price: 129,
    stock: 2,
    category: 'electronics',
    subCategory: '外设',
    brand: 'KeyDemo',
    sales: 14,
    isSecondhand: true,
    condition: '8成新',
    usageTime: '约 1 年',
    hasDefect: true,
    defectDescription: 'A、S 键帽有轻微磨损。',
    location: '杭州市西湖区',
    image: realProductImages.keyboard
  },
  {
    name: '演示家居 护眼台灯',
    description: '三档色温，适合宿舍和书桌，展示已完成订单与真实评价。',
    price: 89,
    stock: 16,
    category: 'home',
    subCategory: '照明',
    brand: 'LightHome',
    sales: 61,
    isSecondhand: false,
    image: realProductImages.lamp
  },
  {
    name: '演示运动 跑步腰包',
    description: '防泼水材质，可放手机钥匙，适合展示评价列表和店铺跳转。',
    price: 49,
    stock: 24,
    category: 'sports',
    subCategory: '运动配件',
    brand: 'RunGo',
    sales: 44,
    isSecondhand: false,
    image: realProductImages.runBag
  },
  {
    name: '演示图书 软件工程导论',
    description: '课程参考书，适合展示待付款、支付和取消订单流程。',
    price: 35,
    stock: 9,
    category: 'books',
    subCategory: '教材',
    brand: 'CoursePress',
    sales: 22,
    isSecondhand: true,
    condition: '7成新',
    usageTime: '约 2 年',
    hasDefect: true,
    defectDescription: '封面有折痕，内页有少量标注。',
    location: '校园二手区',
    image: realProductImages.book
  },
  {
    name: '演示限量 卫衣样衣',
    description: '展示售罄状态的商品，不可加入购物车，适合演示库存拦截。',
    price: 159,
    stock: 0,
    category: 'clothing',
    subCategory: '服装',
    brand: 'CampusWear',
    sales: 30,
    isSecondhand: false,
    image: realProductImages.hoodie
  }
];

const createOrResetUser = async (seed) => {
  const [user, created] = await User.findOrCreate({
    where: { email: seed.email },
    defaults: {
      ...seed,
      password: DEMO_PASSWORD
    }
  });

  await user.update({
    username: seed.username,
    password: DEMO_PASSWORD,
    phone: seed.phone,
    nickname: seed.nickname,
    avatar: seed.avatar,
    role: seed.role,
    creditScore: seed.creditScore,
    creditLevel: seed.creditLevel
  });

  return { user, created };
};

const createOrUpdateShop = async (user) => {
  const [shop] = await Shop.findOrCreate({
    where: { userId: user.id },
    defaults: {
      name: `${user.nickname || user.username}的店铺`,
      avatar: user.avatar,
      banner: '',
      description: '用于课堂演示的真实账号、商品、订单、物流与评价数据。',
      status: '已通过'
    }
  });

  await shop.update({
    name: '演示精选店',
    avatar: user.avatar,
    banner: '',
    description: '用于课堂演示的真实账号、商品、订单、物流与评价数据。',
    status: '已通过'
  });
};

const createOrUpdateProduct = async (seed, seller) => {
  const data = {
    name: seed.name,
    description: seed.description,
    images: [seed.image],
    videos: [],
    price: seed.price,
    stock: seed.stock,
    category: seed.category,
    subCategory: seed.subCategory,
    brand: seed.brand,
    sellerId: seller.id,
    sellerName: seller.nickname || seller.username,
    status: '在售',
    sales: seed.sales,
    views: 0,
    isSecondhand: seed.isSecondhand,
    condition: seed.condition || null,
    usageTime: seed.usageTime || null,
    hasDefect: Boolean(seed.hasDefect),
    defectDescription: seed.defectDescription || '',
    location: seed.location || '上海市'
  };

  const [product] = await Product.findOrCreate({
    where: { name: seed.name, sellerId: seller.id },
    defaults: data
  });

  await product.update(data);
  return product;
};

const buildOrderItem = (product, quantity = 1) => ({
  productId: product.id,
  name: product.name,
  price: Number(product.price),
  quantity,
  image: product.images?.[0] || '',
  sellerId: product.sellerId,
  sellerName: product.sellerName,
  isSecondhand: product.isSecondhand
});

const createOrder = async ({ buyer, products, status, paymentStatus, paymentMethod, addressLabel, logisticsInfo }) => {
  const items = products.map(product => buildOrderItem(product));
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return Order.create({
    userId: buyer.id,
    items,
    totalAmount,
    status,
    paymentStatus,
    paymentMethod,
    shippingAddress: {
      name: addressLabel,
      phone: buyer.phone,
      address: `演示校区 ${addressLabel} 收货点`
    },
    logisticsInfo
  });
};

const createEvaluation = async ({ order, buyer, product, rating, content }) => (
  Evaluation.create({
    orderId: order.id,
    userId: buyer.id,
    productId: product.id,
    sellerId: product.sellerId,
    rating,
    content,
    images: [],
    status: '已发布'
  })
);

const recalculateProductRating = async (product) => {
  const evaluations = await Evaluation.findAll({
    where: { productId: product.id, status: '已发布' },
    attributes: ['rating']
  });
  const reviewCount = evaluations.length;
  const rating = reviewCount
    ? evaluations.reduce((sum, item) => sum + Number(item.rating), 0) / reviewCount
    : 0;

  await product.update({ rating, reviewCount });
};

const seed = async () => {
  await sequelize.sync();

  const usersByEmail = {};
  let createdUsers = 0;
  for (const userSeed of userSeeds) {
    const { user, created } = await createOrResetUser(userSeed);
    usersByEmail[userSeed.email] = user;
    createdUsers += created ? 1 : 0;
  }

  const seller = usersByEmail['demo-seller@example.com'];
  await createOrUpdateShop(seller);

  for (const user of Object.values(usersByEmail)) {
    await Shop.findOrCreate({
      where: { userId: user.id },
      defaults: {
        name: `${user.nickname || user.username}的店铺`,
        avatar: user.avatar,
        description: '演示用户的公开店铺页。',
        status: '已通过'
      }
    });
  }

  const productsByName = {};
  for (const productSeed of productSeeds) {
    productsByName[productSeed.name] = await createOrUpdateProduct(productSeed, seller);
  }

  const scenarioBuyerIds = Object.entries(usersByEmail)
    .filter(([email]) => email !== 'demo-seller@example.com')
    .map(([, user]) => user.id);

  await Evaluation.destroy({ where: { userId: scenarioBuyerIds } });
  await Order.destroy({ where: { userId: scenarioBuyerIds } });

  const reviewedBuyer = usersByEmail['demo-reviewed@example.com'];
  const todoBuyer = usersByEmail['demo-todo@example.com'];
  const receiveBuyer = usersByEmail['demo-receive@example.com'];
  const shipBuyer = usersByEmail['demo-ship@example.com'];
  const payBuyer = usersByEmail['demo-pay@example.com'];

  const reviewedOrder = await createOrder({
    buyer: reviewedBuyer,
    products: [
      productsByName['演示家居 护眼台灯'],
      productsByName['演示运动 跑步腰包']
    ],
    status: '已完成',
    paymentStatus: '已支付',
    paymentMethod: '微信支付',
    addressLabel: '演示买家A',
    logisticsInfo: {
      company: '顺丰速运',
      trackingNumber: 'SFDEMO0001',
      status: '已签收',
      steps: [
        { time: '2026-06-10 16:30:00', description: '买家已确认收货，交易完成' },
        { time: '2026-06-10 10:20:00', description: '包裹已到达演示校区驿站' },
        { time: '2026-06-09 18:00:00', description: '卖家已发货，包裹开始运输' }
      ]
    }
  });

  await createEvaluation({
    order: reviewedOrder,
    buyer: reviewedBuyer,
    product: productsByName['演示家居 护眼台灯'],
    rating: 5,
    content: '台灯亮度稳定，商品和描述一致，适合演示评价列表。'
  });
  await createEvaluation({
    order: reviewedOrder,
    buyer: reviewedBuyer,
    product: productsByName['演示运动 跑步腰包'],
    rating: 4,
    content: '腰包容量够用，物流也正常，适合运动场景。'
  });

  await createOrder({
    buyer: todoBuyer,
    products: [productsByName['演示新品 MateBook Air 14']],
    status: '已完成',
    paymentStatus: '已支付',
    paymentMethod: '支付宝',
    addressLabel: '演示买家B',
    logisticsInfo: {
      company: '京东物流',
      trackingNumber: 'JDDEMO0002',
      status: '已签收',
      steps: [
        { time: '2026-06-11 09:30:00', description: '买家已确认收货，等待评价' },
        { time: '2026-06-10 15:00:00', description: '包裹已送达演示校区' }
      ]
    }
  });

  await createOrder({
    buyer: receiveBuyer,
    products: [productsByName['演示新品 降噪蓝牙耳机']],
    status: '待收货',
    paymentStatus: '已支付',
    paymentMethod: '微信支付',
    addressLabel: '演示买家C',
    logisticsInfo: {
      company: '中通快递',
      trackingNumber: 'ZTDEMO0003',
      status: '运输中',
      steps: [
        { time: '2026-06-12 09:00:00', description: '包裹正在派送途中' },
        { time: '2026-06-11 18:40:00', description: '包裹已到达城市转运中心' },
        { time: '2026-06-10 14:00:00', description: '卖家已发货，包裹开始运输' }
      ]
    }
  });

  await createOrder({
    buyer: shipBuyer,
    products: [productsByName['演示二手 iPad Pro 11']],
    status: '待发货',
    paymentStatus: '已支付',
    paymentMethod: '银行卡',
    addressLabel: '演示买家D',
    logisticsInfo: null
  });

  await createOrder({
    buyer: payBuyer,
    products: [productsByName['演示图书 软件工程导论']],
    status: '待付款',
    paymentStatus: '未支付',
    paymentMethod: '微信支付',
    addressLabel: '演示买家E',
    logisticsInfo: null
  });

  for (const product of Object.values(productsByName)) {
    await recalculateProductRating(product);
  }

  console.log(`演示账号准备完成：新增 ${createdUsers} 个，更新 ${userSeeds.length - createdUsers} 个。`);
  console.log('统一密码：Demo@123456');
  console.log('卖家账号：demo-seller@example.com');
  console.log('已评价买家：demo-reviewed@example.com');
  console.log('待评价买家：demo-todo@example.com');
  console.log('待收货买家：demo-receive@example.com');
  console.log('待发货买家：demo-ship@example.com');
  console.log('待付款买家：demo-pay@example.com');
};

seed()
  .then(async () => {
    await sequelize.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('演示场景写入失败：', error);
    await sequelize.close();
    process.exit(1);
  });
