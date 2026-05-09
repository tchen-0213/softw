const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 导入数据库配置
const sequelize = require('./config/database');

// 导入模型
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Evaluation = require('./models/Evaluation');
const Shop = require('./models/Shop');

// 导入路由
const userRoutes = require('./routes/user');
const productRoutes = require('./routes/product');
const orderRoutes = require('./routes/order');
const secondhandRoutes = require('./routes/secondhand');
const evaluationRoutes = require('./routes/evaluation');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 数据库同步
sequelize.sync({ alter: true })
  .then(() => console.log('Database synchronized'))
  .catch(err => console.error('Database sync error:', err));

// 路由
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/secondhand', secondhandRoutes);
app.use('/api/evaluations', evaluationRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});