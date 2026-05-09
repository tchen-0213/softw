const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Product = require('./Product');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  items: {
    type: DataTypes.JSON,
    allowNull: false
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('待付款', '待发货', '待收货', '已完成', '已取消', '退款中', '已退款'),
    defaultValue: '待付款'
  },
  paymentMethod: {
    type: DataTypes.ENUM('支付宝', '微信支付', '银行卡')
  },
  paymentStatus: {
    type: DataTypes.ENUM('未支付', '已支付', '支付失败'),
    defaultValue: '未支付'
  },
  shippingAddress: {
    type: DataTypes.JSON
  },
  logisticsInfo: {
    type: DataTypes.JSON
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// 关联关系
Order.belongsTo(User, { foreignKey: 'userId' });

module.exports = Order;