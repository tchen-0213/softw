const { Op } = require('sequelize');
const ChatConversation = require('../models/ChatConversation');
const ChatMessage = require('../models/ChatMessage');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

const participantAttributes = ['id', 'username', 'nickname', 'avatar', 'creditLevel', 'creditScore'];
const productAttributes = ['id', 'name', 'price', 'images', 'bargainEnabled', 'sellerId'];
const requestTypes = ['bargain', 'refund'];

const conversationIncludes = [
  { model: User, as: 'buyer', attributes: participantAttributes },
  { model: User, as: 'seller', attributes: participantAttributes },
  { model: Product, as: 'product', attributes: productAttributes }
];

const messageIncludes = [
  { model: User, as: 'sender', attributes: participantAttributes }
];

const normalizeUser = (user) => {
  const data = user?.toJSON ? user.toJSON() : user;
  if (!data) {
    return null;
  }

  return {
    id: data.id,
    username: data.username,
    nickname: data.nickname || data.username,
    avatar: data.avatar || '',
    creditLevel: data.creditLevel,
    creditScore: data.creditScore
  };
};

const normalizeProduct = (product) => {
  const data = product?.toJSON ? product.toJSON() : product;
  if (!data) {
    return null;
  }

  return {
    ...data,
    images: data.images || [],
    bargainEnabled: data.bargainEnabled !== false
  };
};

const toMessageDto = (message) => {
  const data = message.toJSON ? message.toJSON() : message;
  return {
    ...data,
    amount: data.amount === null || data.amount === undefined ? null : Number(data.amount),
    sender: normalizeUser(data.sender)
  };
};

const toConversationDto = (conversation, extras = {}) => {
  const data = conversation.toJSON ? conversation.toJSON() : conversation;
  return {
    ...data,
    buyer: normalizeUser(data.buyer),
    seller: normalizeUser(data.seller),
    product: normalizeProduct(data.product),
    ...extras
  };
};

const isParticipant = (conversation, userId) => (
  Number(conversation.buyerId) === Number(userId) ||
  Number(conversation.sellerId) === Number(userId)
);

const isSeller = (conversation, userId) => (
  Number(conversation.sellerId) === Number(userId)
);

const isPurchasedOrder = (order, productId) => {
  const status = order.status;
  const paidStatuses = ['待发货', '待收货', '已完成'];
  const isPaid = order.paymentStatus === '已支付' || paidStatuses.includes(status);
  const containsProduct = (order.items || []).some(item => (
    Number(item.productId || item.id) === Number(productId)
  ));

  return isPaid && status !== '已取消' && containsProduct;
};

const hasPurchasedProduct = async (buyerId, productId) => {
  const orders = await Order.findAll({
    where: { userId: buyerId },
    order: [['createdAt', 'DESC']]
  });

  return orders.some(order => isPurchasedOrder(order, productId));
};

const getConversation = async (id) => (
  ChatConversation.findByPk(id, {
    include: conversationIncludes
  })
);

const getConversationExtras = async (conversationId) => {
  const [latestMessage, pendingRequestCount] = await Promise.all([
    ChatMessage.findOne({
      where: { conversationId },
      include: messageIncludes,
      order: [['createdAt', 'DESC']]
    }),
    ChatMessage.count({
      where: {
        conversationId,
        type: { [Op.in]: requestTypes },
        requestStatus: 'pending'
      }
    })
  ]);

  return {
    latestMessage: latestMessage ? toMessageDto(latestMessage) : null,
    pendingRequestCount
  };
};

exports.createOrGetConversation = async (req, res) => {
  const productId = Number(req.body.productId);

  if (!Number.isFinite(productId)) {
    return res.status(400).json({ message: '商品信息不正确' });
  }

  try {
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: '商品不存在' });
    }

    if (Number(product.sellerId) === Number(req.user.id)) {
      return res.status(400).json({ message: '不能与自己的商品发起私聊' });
    }

    let conversation = await ChatConversation.findOne({
      where: {
        buyerId: req.user.id,
        sellerId: product.sellerId,
        productId: product.id
      },
      include: conversationIncludes
    });

    if (!conversation) {
      conversation = await ChatConversation.create({
        buyerId: req.user.id,
        sellerId: product.sellerId,
        productId: product.id,
        lastMessageAt: new Date()
      });
      conversation = await getConversation(conversation.id);
    }

    res.status(201).json(toConversationDto(conversation));
  } catch (error) {
    res.status(500).json({ message: '创建私聊失败', error: error.message });
  }
};

exports.getConversations = async (req, res) => {
  const role = req.query.role;
  const where = role === 'seller'
    ? { sellerId: req.user.id }
    : (role === 'buyer'
      ? { buyerId: req.user.id }
      : {
          [Op.or]: [
            { buyerId: req.user.id },
            { sellerId: req.user.id }
          ]
        });

  try {
    const conversations = await ChatConversation.findAll({
      where,
      include: conversationIncludes,
      order: [['lastMessageAt', 'DESC'], ['updatedAt', 'DESC']]
    });

    const result = await Promise.all(conversations.map(async (conversation) => (
      toConversationDto(conversation, await getConversationExtras(conversation.id))
    )));

    res.json({ conversations: result });
  } catch (error) {
    res.status(500).json({ message: '获取私聊列表失败', error: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const conversation = await getConversation(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: '私聊不存在' });
    }

    if (!isParticipant(conversation, req.user.id)) {
      return res.status(403).json({ message: '无权查看该私聊' });
    }

    const messages = await ChatMessage.findAll({
      where: { conversationId: conversation.id },
      include: messageIncludes,
      order: [['createdAt', 'ASC']]
    });

    res.json({
      conversation: toConversationDto(conversation),
      messages: messages.map(toMessageDto)
    });
  } catch (error) {
    res.status(500).json({ message: '获取私聊消息失败', error: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  const rawType = String(req.body.type || 'text');
  const type = ['text', ...requestTypes].includes(rawType) ? rawType : 'text';
  const content = String(req.body.content || '').trim();
  const amount = Number(req.body.amount);

  try {
    const conversation = await getConversation(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: '私聊不存在' });
    }

    if (!isParticipant(conversation, req.user.id)) {
      return res.status(403).json({ message: '无权在该私聊中发言' });
    }

    if (type === 'text' && !content) {
      return res.status(400).json({ message: '消息内容不能为空' });
    }

    if (requestTypes.includes(type)) {
      if (Number(conversation.buyerId) !== Number(req.user.id)) {
        return res.status(403).json({ message: '只有买家可以发起该申请' });
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ message: '请输入有效金额' });
      }

      if (type === 'bargain' && conversation.product?.bargainEnabled === false) {
        return res.status(400).json({ message: '该商品未开启议价功能' });
      }

      if (type === 'refund') {
        const purchased = await hasPurchasedProduct(req.user.id, conversation.productId);
        if (!purchased) {
          return res.status(400).json({ message: '商品未购买，暂不能申请退款' });
        }
      }
    }

    const fallbackContent = type === 'bargain'
      ? `买家希望以 ¥${amount.toFixed(2)} 成交`
      : (type === 'refund'
        ? `买家申请退款 ¥${amount.toFixed(2)}`
        : content);

    const message = await ChatMessage.create({
      conversationId: conversation.id,
      senderId: req.user.id,
      type,
      content: content || fallbackContent,
      amount: requestTypes.includes(type) ? amount : null,
      requestStatus: requestTypes.includes(type) ? 'pending' : null
    });

    await conversation.update({ lastMessageAt: new Date() });

    const createdMessage = await ChatMessage.findByPk(message.id, { include: messageIncludes });
    res.status(201).json(toMessageDto(createdMessage));
  } catch (error) {
    res.status(500).json({ message: '发送消息失败', error: error.message });
  }
};

exports.decideRequest = async (req, res) => {
  const nextStatus = req.body.status === 'accepted' ? 'accepted' : (
    req.body.status === 'rejected' ? 'rejected' : ''
  );

  if (!nextStatus) {
    return res.status(400).json({ message: '处理结果不合法' });
  }

  try {
    const message = await ChatMessage.findByPk(req.params.id, {
      include: [
        ...messageIncludes,
        {
          model: ChatConversation,
          as: 'conversation',
          include: conversationIncludes
        }
      ]
    });

    if (!message) {
      return res.status(404).json({ message: '申请消息不存在' });
    }

    const conversation = message.conversation;
    if (!isSeller(conversation, req.user.id)) {
      return res.status(403).json({ message: '只有商家可以处理申请' });
    }

    if (!requestTypes.includes(message.type) || message.requestStatus !== 'pending') {
      return res.status(400).json({ message: '该申请已处理或不可处理' });
    }

    await message.update({
      requestStatus: nextStatus,
      decidedAt: new Date()
    });

    const actionText = nextStatus === 'accepted' ? '同意' : '拒绝';
    const requestText = message.type === 'bargain' ? '议价' : '退款';
    const systemMessage = await ChatMessage.create({
      conversationId: conversation.id,
      senderId: req.user.id,
      type: 'system',
      content: `商家已${actionText}${requestText}申请：¥${Number(message.amount).toFixed(2)}`
    });

    await conversation.update({ lastMessageAt: new Date() });

    const [updatedMessage, createdSystemMessage] = await Promise.all([
      ChatMessage.findByPk(message.id, { include: messageIncludes }),
      ChatMessage.findByPk(systemMessage.id, { include: messageIncludes })
    ]);

    res.json({
      request: toMessageDto(updatedMessage),
      systemMessage: toMessageDto(createdSystemMessage)
    });
  } catch (error) {
    res.status(500).json({ message: '处理申请失败', error: error.message });
  }
};
