const dotenv = require('dotenv');
const sequelize = require('./config/database');
const User = require('./models/User');
const Product = require('./models/Product');
const Shop = require('./models/Shop');

dotenv.config();

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

const demoProducts = [
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
    description: '全新未拆封，支持主动降噪和长续航，适合展示搜索、推荐和库存显示。',
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
    description: '个人自用平板，外观轻微使用痕迹，屏幕显示正常，适合展示二手商品详情。',
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
    description: '青轴机械键盘，部分键帽有轻微打油，不影响使用。',
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
    description: '三档色温，适合宿舍和书桌，展示家居分类与新品购买。',
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
    name: '演示图书 软件工程导论',
    description: '课程参考书，适合展示图书分类和低价商品。',
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
    name: '演示运动 跑步腰包',
    description: '防泼水材质，可放手机钥匙，适合展示运动户外分类。',
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
    name: '演示限量 卫衣样衣',
    description: '展示售罄状态的商品，不可加入购物车，适合演示库存拦截。',
    price: 159,
    stock: 0,
    category: 'clothing',
    subCategory: '服装',
    brand: 'CampusWear',
    sales: 30,
    isSecondhand: false,
    status: '在售',
    image: realProductImages.hoodie
  }
];

const seed = async () => {
  await sequelize.sync();

  const [seller] = await User.findOrCreate({
    where: { email: 'demo-seller@example.com' },
    defaults: {
      username: 'demo_seller',
      password: 'Demo@123456',
      phone: '13800000000',
      email: 'demo-seller@example.com',
      nickname: '演示店主',
      creditScore: 168,
      creditLevel: '金牌',
      role: 'seller'
    }
  });

  await seller.update({
    nickname: '演示店主',
    creditScore: 168,
    creditLevel: '金牌',
    role: 'seller'
  });

  await Shop.findOrCreate({
    where: { userId: seller.id },
    defaults: {
      name: '演示精选店',
      avatar: '',
      banner: '',
      description: '用于课堂演示的新品与二手商品店铺。',
      status: '已通过'
    }
  });

  let created = 0;
  let updated = 0;

  for (const item of demoProducts) {
    const productData = {
      name: item.name,
      description: item.description,
      images: [item.image],
      videos: [],
      price: item.price,
      stock: item.stock,
      category: item.category,
      subCategory: item.subCategory,
      brand: item.brand,
      sellerId: seller.id,
      sellerName: seller.nickname || seller.username,
      status: item.status || '在售',
      sales: item.sales,
      views: 0,
      isSecondhand: item.isSecondhand,
      condition: item.condition || null,
      usageTime: item.usageTime || null,
      hasDefect: Boolean(item.hasDefect),
      defectDescription: item.defectDescription || '',
      location: item.location || '上海市'
    };

    const existing = await Product.findOne({
      where: {
        name: item.name,
        sellerId: seller.id
      }
    });

    if (existing) {
      await existing.update(productData);
      updated += 1;
    } else {
      await Product.create(productData);
      created += 1;
    }
  }

  console.log(`演示商品已准备完成：新增 ${created} 个，更新 ${updated} 个。`);
  console.log('演示卖家账号：demo-seller@example.com / Demo@123456');
};

seed()
  .then(async () => {
    await sequelize.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('演示商品写入失败：', error);
    await sequelize.close();
    process.exit(1);
  });
