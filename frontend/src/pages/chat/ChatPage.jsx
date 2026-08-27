import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { chatApi, orderApi } from '../../services/api';
import { fallbackImages } from '../../data/imageAssets';
import { getStoredUser, getUserKey, isLoggedIn } from '../../utils/accountStorage';

const requestStatusText = {
  pending: '待商家处理',
  accepted: '已同意',
  rejected: '已拒绝'
};

const requestTypeText = {
  bargain: '议价申请',
  refund: '退款申请'
};

const formatTime = (value) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
};

const isPurchasedOrder = (order, productId) => {
  const paidStatuses = ['待发货', '待收货', '已完成'];
  const isPaid = order.paymentStatus === '已支付' || paidStatuses.includes(order.status);
  const containsProduct = (order.items || []).some(item => (
    String(item.productId || item.id) === String(productId)
  ));

  return isPaid && order.status !== '已取消' && containsProduct;
};

const ChatPage = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const listRef = useRef(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [quickMode, setQuickMode] = useState('bargain');
  const [requestAmount, setRequestAmount] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [decidingMessageId, setDecidingMessageId] = useState(null);
  const [checkingRefundEligibility, setCheckingRefundEligibility] = useState(false);
  const [refundEligible, setRefundEligible] = useState(null);
  const [error, setError] = useState('');

  const currentUserId = getUserKey(getStoredUser());
  const isBuyer = String(conversation?.buyerId) === String(currentUserId);
  const isSeller = String(conversation?.sellerId) === String(currentUserId);
  const product = conversation?.product;
  const bargainEnabled = product?.bargainEnabled !== false;

  const chatTitle = useMemo(() => {
    if (!conversation) {
      return '私聊商家';
    }
    const other = isSeller ? conversation.buyer : conversation.seller;
    return other?.nickname || other?.username || '私聊对象';
  }, [conversation, isSeller]);

  const loadMessages = useCallback(async () => {
    if (!isLoggedIn()) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const response = await chatApi.getMessages(conversationId);
      setConversation(response.data.conversation);
      setMessages(response.data.messages || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || '聊天加载失败');
    } finally {
      setLoading(false);
    }
  }, [conversationId, navigate]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const node = listRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages.length]);

  useEffect(() => {
    const checkRefundEligibility = async () => {
      if (!isBuyer || !product?.id) {
        setRefundEligible(null);
        return;
      }

      setCheckingRefundEligibility(true);
      try {
        const response = await orderApi.getList({ limit: 100 });
        const orders = response.data.orders || [];
        setRefundEligible(orders.some(order => isPurchasedOrder(order, product.id)));
      } catch {
        setRefundEligible(false);
      } finally {
        setCheckingRefundEligibility(false);
      }
    };

    checkRefundEligibility();
  }, [isBuyer, product?.id]);

  const appendMessage = (message) => {
    setMessages(prev => [...prev, message]);
  };

  const handleQuickModeChange = (mode) => {
    setQuickMode(mode);

    if (mode === 'refund') {
      if (checkingRefundEligibility) {
        setError('正在检查购买记录，请稍后再试');
      } else if (refundEligible === false) {
        setError('商品未购买，暂不能申请退款');
      } else {
        setError('');
      }
      return;
    }

    setError('');
  };

  const handleSendText = async (event) => {
    event.preventDefault();
    const content = text.trim();
    if (!content) {
      return;
    }

    setSending(true);
    setError('');
    try {
      const response = await chatApi.sendMessage(conversationId, {
        type: 'text',
        content
      });
      appendMessage(response.data);
      setText('');
    } catch (err) {
      setError(err.response?.data?.message || '消息发送失败');
    } finally {
      setSending(false);
    }
  };

  const handleSendRequest = async (type) => {
    if (type === 'refund') {
      if (checkingRefundEligibility) {
        setError('正在检查购买记录，请稍后再试');
        return;
      }

      if (refundEligible === false) {
        setError('商品未购买，暂不能申请退款');
        return;
      }
    }

    const amount = Number(requestAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('请输入有效金额');
      return;
    }

    const trimmedNote = requestNote.trim();
    const content = type === 'bargain'
      ? `我想以 ¥${amount.toFixed(2)} 购买${trimmedNote ? `，说明：${trimmedNote}` : ''}`
      : `我想申请退款 ¥${amount.toFixed(2)}${trimmedNote ? `，原因：${trimmedNote}` : ''}`;

    setSending(true);
    setError('');
    try {
      const response = await chatApi.sendMessage(conversationId, {
        type,
        amount,
        content
      });
      appendMessage(response.data);
      setRequestAmount('');
      setRequestNote('');
    } catch (err) {
      setError(err.response?.data?.message || '申请发送失败');
    } finally {
      setSending(false);
    }
  };

  const handleDecision = async (messageId, status) => {
    setDecidingMessageId(messageId);
    setError('');
    try {
      const response = await chatApi.decideRequest(messageId, { status });
      setMessages(prev => [
        ...prev.map(message => (
          Number(message.id) === Number(messageId) ? response.data.request : message
        )),
        response.data.systemMessage
      ]);
      window.dispatchEvent(new Event('seller-alerts-refresh'));
    } catch (err) {
      setError(err.response?.data?.message || '处理申请失败');
    } finally {
      setDecidingMessageId(null);
    }
  };

  const handleBargainPurchase = (message) => {
    navigate('/checkout', {
      state: {
        bargainPurchase: {
          ...product,
          id: product.id,
          price: Number(message.amount),
          originalPrice: Number(product.price),
          quantity: 1,
          bargainMessageId: message.id
        }
      }
    });
  };

  const renderMessage = (message) => {
    const isMine = String(message.senderId) === String(currentUserId);
    const isRequest = message.type === 'bargain' || message.type === 'refund';
    const isPendingRequest = isRequest && message.requestStatus === 'pending';
    const canDecide = isSeller && isPendingRequest;
    const canBuyAtBargainPrice = isBuyer && message.type === 'bargain' &&
      message.requestStatus === 'accepted' && !message.redeemedAt;

    if (message.type === 'system') {
      return (
        <div key={message.id} className="chat-system-message">
          {message.content}
        </div>
      );
    }

    return (
      <div key={message.id} className={`chat-message-row${isMine ? ' is-mine' : ''}`}>
        <div className={`chat-message-bubble${isRequest ? ' is-request' : ''}`}>
          <div className="chat-message-meta">
            <span>{message.sender?.nickname || message.sender?.username || (isMine ? '我' : '对方')}</span>
            <span>{formatTime(message.createdAt)}</span>
          </div>
          {isRequest && (
            <div className="chat-request-head">
              <strong>{requestTypeText[message.type]}</strong>
              <span className={`chat-request-status status-${message.requestStatus || 'pending'}`}>
                {requestStatusText[message.requestStatus] || '待商家处理'}
              </span>
            </div>
          )}
          {isRequest && (
            <div className="chat-request-amount">¥{Number(message.amount || 0).toFixed(2)}</div>
          )}
          <div className="chat-message-content">{message.content}</div>
          {canDecide && (
            <div className="chat-request-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={() => handleDecision(message.id, 'accepted')}
                disabled={decidingMessageId === message.id}
              >
                同意
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => handleDecision(message.id, 'rejected')}
                disabled={decidingMessageId === message.id}
              >
                拒绝
              </button>
            </div>
          )}
          {canBuyAtBargainPrice && (
            <div className="chat-request-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={() => handleBargainPurchase(message)}
              >
                以议价 ¥{Number(message.amount).toFixed(2)} 购买
              </button>
            </div>
          )}
          {isBuyer && message.type === 'bargain' && message.redeemedAt && (
            <div className="chat-quick-hint">该议价已用于下单</div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="chat-page">
      <div className="container">
        <div className="chat-shell">
          <div className="chat-header">
            <button type="button" className="chat-back-button" onClick={() => navigate(-1)}>
              返回
            </button>
            <div className="chat-title-block">
              <h2>{chatTitle}</h2>
              <span>{product?.name || '商品私聊'}</span>
            </div>
            {product && (
              <button
                type="button"
                className="chat-product-card"
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <img
                  src={product.images?.[0] || fallbackImages.product}
                  alt={product.name}
                  onError={(event) => {
                    event.currentTarget.src = fallbackImages.product;
                  }}
                />
                <span>¥{Number(product.price || 0).toFixed(2)}</span>
              </button>
            )}
          </div>

          {error && <div className="chat-error">{error}</div>}

          <div className="chat-message-list" ref={listRef}>
            {messages.length === 0 ? (
              <div className="chat-empty">还没有消息，可以先向商家打个招呼。</div>
            ) : (
              messages.map(renderMessage)
            )}
          </div>

          {isBuyer && (
            <div className="chat-quick-panel">
              <div className="chat-quick-tabs">
                <button
                  type="button"
                  className={quickMode === 'bargain' ? 'active' : ''}
                  onClick={() => handleQuickModeChange('bargain')}
                  disabled={!bargainEnabled}
                >
                  议价
                </button>
                <button
                  type="button"
                  className={quickMode === 'refund' ? 'active' : ''}
                  onClick={() => handleQuickModeChange('refund')}
                >
                  退款
                </button>
              </div>
              {!bargainEnabled && quickMode === 'bargain' && (
                <div className="chat-quick-hint">该商品未开启议价功能。</div>
              )}
              {quickMode === 'refund' && checkingRefundEligibility && (
                <div className="chat-quick-hint">正在检查购买记录...</div>
              )}
              {quickMode === 'refund' && refundEligible === false && !checkingRefundEligibility && (
                <div className="chat-quick-hint">商品未购买，暂不能申请退款。</div>
              )}
              {((quickMode === 'refund' && refundEligible !== false) || (quickMode === 'bargain' && bargainEnabled)) && (
                <div className="chat-request-form">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={requestAmount}
                    onChange={(event) => setRequestAmount(event.target.value)}
                    placeholder={quickMode === 'bargain' ? '输入想要的金额' : '输入退款金额'}
                  />
                  <input
                    value={requestNote}
                    onChange={(event) => setRequestNote(event.target.value)}
                    placeholder={quickMode === 'bargain' ? '补充说明（可选）' : '退款原因（可选）'}
                  />
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => handleSendRequest(quickMode)}
                    disabled={sending || (quickMode === 'refund' && checkingRefundEligibility)}
                  >
                    发送{quickMode === 'bargain' ? '议价' : '退款'}申请
                  </button>
                </div>
              )}
            </div>
          )}

          <form className="chat-input-row" onSubmit={handleSendText}>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows="2"
              placeholder="输入聊天内容"
            />
            <button type="submit" className="button button-primary" disabled={sending}>
              发送
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
