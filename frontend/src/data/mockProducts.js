// 模拟商品数据
export const mockProducts = [
  // 电子产品
  {
    id: 1,
    name: "智能手机 Pro Max",
    description: "最新款智能手机，搭载强大处理器，高清摄像头，长续航电池",
    images: [
      "https://via.placeholder.com/400x300?text=Smartphone+Pro+Max",
      "https://via.placeholder.com/400x300?text=Smartphone+Back",
      "https://via.placeholder.com/400x300?text=Smartphone+Side"
    ],
    price: 5999,
    stock: 50,
    category: "electronics",
    subCategory: "手机",
    brand: "TechBrand",
    sellerId: 1,
    seller: {
      nickname: "科技数码店",
      avatar: "https://via.placeholder.com/50x50?text=Seller1",
      creditLevel: "钻石会员"
    },
    status: "在售",
    sales: 256,
    evaluationCount: 128,
    favoriteCount: 89,
    productType: 1
  },
  {
    id: 2,
    name: "无线蓝牙耳机",
    description: "高品质无线蓝牙耳机，主动降噪，持久续航",
    images: [
      "https://via.placeholder.com/400x300?text=Wireless+Headphones",
      "https://via.placeholder.com/400x300?text=Headphones+Case"
    ],
    price: 1299,
    stock: 100,
    category: "electronics",
    subCategory: "耳机",
    brand: "AudioTech",
    sellerId: 1,
    seller: {
      nickname: "科技数码店",
      avatar: "https://via.placeholder.com/50x50?text=Seller1",
      creditLevel: "钻石会员"
    },
    status: "在售",
    sales: 432,
    evaluationCount: 215,
    favoriteCount: 156,
    productType: 1
  },
  
  // 服装
  {
    id: 3,
    name: "纯棉休闲T恤",
    description: "100%纯棉材质，舒适透气，多种颜色可选",
    images: [
      "https://via.placeholder.com/400x300?text=Cotton+T-Shirt",
      "https://via.placeholder.com/400x300?text=T-Shirt+Detail"
    ],
    price: 99,
    stock: 200,
    category: "clothing",
    subCategory: "上装",
    brand: "FashionBrand",
    sellerId: 2,
    seller: {
      nickname: "潮流服饰店",
      avatar: "https://via.placeholder.com/50x50?text=Seller2",
      creditLevel: "金牌会员"
    },
    status: "在售",
    sales: 1250,
    evaluationCount: 680,
    favoriteCount: 340,
    productType: 1
  },
  {
    id: 4,
    name: "运动休闲鞋",
    description: "轻便透气，适合日常运动和休闲穿着",
    images: [
      "https://via.placeholder.com/400x300?text=Sports+Shoes",
      "https://via.placeholder.com/400x300?text=Shoes+Side"
    ],
    price: 399,
    stock: 150,
    category: "clothing",
    subCategory: "鞋履",
    brand: "Sporty",
    sellerId: 2,
    seller: {
      nickname: "潮流服饰店",
      avatar: "https://via.placeholder.com/50x50?text=Seller2",
      creditLevel: "金牌会员"
    },
    status: "在售",
    sales: 890,
    evaluationCount: 450,
    favoriteCount: 230,
    productType: 1
  },
  
  // 家居用品
  {
    id: 5,
    name: "现代简约沙发",
    description: "舒适透气，现代简约设计，适合各种家居风格",
    images: [
      "https://via.placeholder.com/400x300?text=Modern+Sofa",
      "https://via.placeholder.com/400x300?text=Sofa+Detail"
    ],
    price: 2999,
    stock: 20,
    category: "home",
    subCategory: "家具",
    brand: "HomeStyle",
    sellerId: 3,
    seller: {
      nickname: "家居生活馆",
      avatar: "https://via.placeholder.com/50x50?text=Seller3",
      creditLevel: "银牌会员"
    },
    status: "在售",
    sales: 89,
    evaluationCount: 45,
    favoriteCount: 67,
    productType: 1
  },
  
  // 书籍
  {
    id: 6,
    name: "编程入门指南",
    description: "适合初学者的编程入门书籍，包含实战项目",
    images: [
      "https://via.placeholder.com/400x300?text=Programming+Book",
      "https://via.placeholder.com/400x300?text=Book+Cover"
    ],
    price: 59,
    stock: 100,
    category: "books",
    subCategory: "技术",
    brand: "TechPub",
    sellerId: 4,
    seller: {
      nickname: "知识书屋",
      avatar: "https://via.placeholder.com/50x50?text=Seller4",
      creditLevel: "铜牌会员"
    },
    status: "在售",
    sales: 345,
    evaluationCount: 123,
    favoriteCount: 89,
    productType: 1
  },
  
  // 二手商品
  {
    id: 7,
    name: "二手笔记本电脑",
    description: "9成新，性能良好，适合办公和学习",
    images: [
      "https://via.placeholder.com/400x300?text=Used+Laptop",
      "https://via.placeholder.com/400x300?text=Laptop+Open"
    ],
    price: 1999,
    stock: 1,
    category: "electronics",
    subCategory: "电脑",
    brand: "TechBrand",
    sellerId: 5,
    seller: {
      nickname: "个人卖家",
      avatar: "https://via.placeholder.com/50x50?text=Seller5",
      creditLevel: "普通会员"
    },
    status: "在售",
    sales: 0,
    evaluationCount: 0,
    favoriteCount: 12,
    productType: 2,
    condition: 2,
    usageTime: "6个月",
    hasDefect: false
  },
  {
    id: 8,
    name: "二手吉他",
    description: "8成新，音色良好，适合初学者",
    images: [
      "https://via.placeholder.com/400x300?text=Used+Guitar",
      "https://via.placeholder.com/400x300?text=Guitar+Detail"
    ],
    price: 499,
    stock: 1,
    category: "home",
    subCategory: "乐器",
    brand: "MusicBrand",
    sellerId: 5,
    seller: {
      nickname: "个人卖家",
      avatar: "https://via.placeholder.com/50x50?text=Seller5",
      creditLevel: "普通会员"
    },
    status: "在售",
    sales: 0,
    evaluationCount: 0,
    favoriteCount: 8,
    productType: 2,
    condition: 3,
    usageTime: "1年",
    hasDefect: false
  }
];

// 推荐商品
export const recommendedProducts = mockProducts.slice(0, 4);

// 热门商品
export const hotProducts = mockProducts;