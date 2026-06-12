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
  banner: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: '待认证'
  },
  verificationStatus: {
    type: DataTypes.STRING,
    defaultValue: '未认证'
  },
  legalName: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  idNumber: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  verificationAddress: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  businessLicenseImage: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  idCardImage: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  verificationSubmittedAt: {
    type: DataTypes.DATE
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
