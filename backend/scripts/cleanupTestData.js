const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Address = require('../models/Address');
const ChatConversation = require('../models/ChatConversation');
const ChatMessage = require('../models/ChatMessage');
const Evaluation = require('../models/Evaluation');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const User = require('../models/User');

const execute = process.argv.includes('--execute');
const testUserWhere = {
  [Op.or]: [
    { username: { [Op.like]: 'e2e\\_%' } },
    { username: { [Op.like]: 'api\\_%' } },
    { email: { [Op.like]: 'e2e\\_%@example.com' } },
    { email: { [Op.like]: 'api\\_%@example.com' } }
  ]
};
const testProductWhere = {
  [Op.or]: [
    { name: { [Op.like]: 'E2E %' } },
    { name: { [Op.like]: 'API 测试商品 %' } },
    { name: { [Op.like]: '检索教材 %' } },
    { name: { [Op.like]: '二手教材 %' } },
    { name: { [Op.like]: '取消订单商品 %' } },
    { name: { [Op.like]: '评价商品 %' } }
  ]
};
const ids = rows => rows.map(row => row.id);

async function loadTargets(transaction) {
  const users = await User.findAll({ where: testUserWhere, attributes: ['id'], transaction });
  const userIds = ids(users);
  const products = await Product.findAll({
    where: {
      [Op.or]: [
        testProductWhere,
        ...(userIds.length ? [{ sellerId: { [Op.in]: userIds } }] : [])
      ]
    },
    attributes: ['id'],
    transaction
  });
  const productIds = ids(products);
  const orders = userIds.length
    ? await Order.findAll({ where: { userId: { [Op.in]: userIds } }, attributes: ['id'], transaction })
    : [];
  const orderIds = ids(orders);
  const conversations = (userIds.length || productIds.length)
    ? await ChatConversation.findAll({
        where: {
          [Op.or]: [
            ...(userIds.length ? [
              { buyerId: { [Op.in]: userIds } },
              { sellerId: { [Op.in]: userIds } }
            ] : []),
            ...(productIds.length ? [{ productId: { [Op.in]: productIds } }] : [])
          ]
        },
        attributes: ['id'],
        transaction
      })
    : [];

  return { userIds, productIds, orderIds, conversationIds: ids(conversations) };
}

function messageWhere({ conversationIds, userIds }) {
  return {
    [Op.or]: [
      ...(conversationIds.length ? [{ conversationId: { [Op.in]: conversationIds } }] : []),
      ...(userIds.length ? [{ senderId: { [Op.in]: userIds } }] : [])
    ]
  };
}

function evaluationWhere({ orderIds, productIds, userIds }) {
  return {
    [Op.or]: [
      ...(orderIds.length ? [{ orderId: { [Op.in]: orderIds } }] : []),
      ...(productIds.length ? [{ productId: { [Op.in]: productIds } }] : []),
      ...(userIds.length ? [
        { userId: { [Op.in]: userIds } },
        { sellerId: { [Op.in]: userIds } }
      ] : [])
    ]
  };
}

async function countTargets(targets, transaction) {
  const { userIds, productIds, orderIds, conversationIds } = targets;
  const messages = messageWhere(targets);
  const evaluations = evaluationWhere(targets);

  return {
    messages: messages[Op.or].length ? await ChatMessage.count({ where: messages, transaction }) : 0,
    conversations: conversationIds.length,
    evaluations: evaluations[Op.or].length ? await Evaluation.count({ where: evaluations, transaction }) : 0,
    orders: orderIds.length,
    addresses: userIds.length ? await Address.count({ where: { userId: { [Op.in]: userIds } }, transaction }) : 0,
    shops: userIds.length ? await Shop.count({ where: { userId: { [Op.in]: userIds } }, transaction }) : 0,
    products: productIds.length,
    users: userIds.length
  };
}

async function removeTargets(targets, transaction) {
  const { userIds, productIds, orderIds, conversationIds } = targets;
  const messages = messageWhere(targets);
  const evaluations = evaluationWhere(targets);

  if (messages[Op.or].length) await ChatMessage.destroy({ where: messages, transaction });
  if (conversationIds.length) {
    await ChatConversation.destroy({ where: { id: { [Op.in]: conversationIds } }, transaction });
  }
  if (evaluations[Op.or].length) await Evaluation.destroy({ where: evaluations, transaction });
  if (orderIds.length) await Order.destroy({ where: { id: { [Op.in]: orderIds } }, transaction });
  if (userIds.length) {
    await Address.destroy({ where: { userId: { [Op.in]: userIds } }, transaction });
    await Shop.destroy({ where: { userId: { [Op.in]: userIds } }, transaction });
  }
  if (productIds.length) await Product.destroy({ where: { id: { [Op.in]: productIds } }, transaction });
  if (userIds.length) await User.destroy({ where: { id: { [Op.in]: userIds } }, transaction });
}

async function main() {
  const transaction = await sequelize.transaction();
  try {
    const targets = await loadTargets(transaction);
    const summary = await countTargets(targets, transaction);
    console.table(summary);

    if (!execute) {
      await transaction.rollback();
      console.log('预览完成，未修改数据库。确认后运行 npm run cleanup:test-data -- --execute');
      return;
    }

    await removeTargets(targets, transaction);
    await transaction.commit();
    console.log('自动化测试数据已清除。演示账号和演示商品未受影响。');
  } catch (error) {
    await transaction.rollback();
    throw error;
  } finally {
    await sequelize.close();
  }
}

main().catch(error => {
  console.error('清理失败：', error.message);
  process.exitCode = 1;
});
