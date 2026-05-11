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
    type: DataTypes.STRING,
    defaultValue: '待付款'
  },
  paymentMethod: {
    type: DataTypes.STRING
  },
  paymentStatus: {
    type: DataTypes.STRING,
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
