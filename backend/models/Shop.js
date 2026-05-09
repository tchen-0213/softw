const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Shop = sequelize.define('Shop', {
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
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  avatar: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  status: {
    type: DataTypes.ENUM('营业中', '已关闭', '审核中'),
    defaultValue: '审核中'
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
Shop.belongsTo(User, { foreignKey: 'userId' });

module.exports = Shop;