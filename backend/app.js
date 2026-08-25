const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { runMigrations } = require('./database/migrate');
const {
  createRateLimiter,
  requestId,
  requireProductionSecrets,
  securityHeaders
} = require('./middleware/security');

// 加载环境变量
dotenv.config();
requireProductionSecrets();

// 导入数据库配置
const sequelize = require('./config/database');

// 导入模型
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Evaluation = require('./models/Evaluation');
const Shop = require('./models/Shop');
const Address = require('./models/Address');
const ChatConversation = require('./models/ChatConversation');
const ChatMessage = require('./models/ChatMessage');

// 导入路由
const userRoutes = require('./routes/user');
const productRoutes = require('./routes/product');
const orderRoutes = require('./routes/order');
const secondhandRoutes = require('./routes/secondhand');
const evaluationRoutes = require('./routes/evaluation');
const shopRoutes = require('./routes/shop');
const addressRoutes = require('./routes/address');
const uploadRoutes = require('./routes/upload');
const chatRoutes = require('./routes/chat');

const app = express();

// 中间件
app.use(requestId);
app.use(securityHeaders);
app.use(createRateLimiter({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000),
  max: Number(process.env.RATE_LIMIT_MAX || 120)
}));

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

function matchesAllowedOrigin(origin, allowedOrigin) {
  if (origin === allowedOrigin) {
    return true;
  }

  const wildcardMarker = '://*.';
  const markerIndex = allowedOrigin.indexOf(wildcardMarker);
  if (markerIndex === -1) {
    return false;
  }

  try {
    const parsedOrigin = new URL(origin);
    const protocol = `${allowedOrigin.slice(0, markerIndex)}:`;
    const hostnameSuffix = allowedOrigin.slice(markerIndex + wildcardMarker.length);

    return parsedOrigin.protocol === protocol
      && parsedOrigin.port === ''
      && parsedOrigin.hostname.endsWith(`.${hostnameSuffix}`);
  } catch (error) {
    return false;
  }
}

app.use(cors({
  origin: (origin, callback) => {
    const originAllowed = allowedOrigins.some(allowedOrigin => (
      matchesAllowedOrigin(origin, allowedOrigin)
    ));

    if (!origin || allowedOrigins.length === 0 || originAllowed) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

let databaseReady = false;

// 版本化迁移完成后才允许健康检查通过，避免部署流量过早进入应用。
runMigrations(sequelize)
  .then(() => {
    databaseReady = true;
    console.log('Database migrations completed');
  })
  .catch(err => {
    databaseReady = false;
    console.error('Database migration error:', err);
  });

// 路由
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/secondhand', secondhandRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/chats', chatRoutes);

// 健康检查
app.get('/api/health', async (req, res) => {
  const startedAt = Date.now();

  try {
    if (!databaseReady) {
      return res.status(503).json({
        status: 'starting',
        database: 'synchronizing',
        responseTimeMs: Date.now() - startedAt,
        requestId: req.requestId
      });
    }

    await sequelize.authenticate();
    res.json({
      status: 'ok',
      database: 'ok',
      uptime: process.uptime(),
      responseTimeMs: Date.now() - startedAt,
      requestId: req.requestId
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      database: 'error',
      responseTimeMs: Date.now() - startedAt,
      requestId: req.requestId
    });
  }
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  return res.status(status).json({
    message: status >= 500 && isProduction ? '服务器内部错误' : err.message,
    requestId: req.requestId
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
