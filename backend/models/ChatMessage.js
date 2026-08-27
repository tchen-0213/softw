const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const ChatConversation = require('./ChatConversation');

const ChatMessage = sequelize.define('ChatMessage', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  conversationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: ChatConversation,
      key: 'id'
    }
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  type: {
    type: DataTypes.STRING,
    defaultValue: 'text'
  },
  content: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2)
  },
  requestStatus: {
    type: DataTypes.STRING
  },
  decidedAt: {
    type: DataTypes.DATE
  },
  redeemedAt: {
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

ChatMessage.belongsTo(ChatConversation, { foreignKey: 'conversationId', as: 'conversation' });
ChatMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

module.exports = ChatMessage;
