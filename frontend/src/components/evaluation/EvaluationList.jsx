import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { avatarImages } from '../../data/imageAssets';
import { evaluationApi, orderApi } from '../../services/api';
import { getStoredUser, getUserKey, isLoggedIn } from '../../utils/accountStorage';

const isCompletedOrder = (status) => status === 4 || status === '已完成';

const isSameId = (left, right) => String(left) === String(right);

const formatReplyTime = (value) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
};

const normalizeReply = (reply, index) => ({
  ...reply,
  id: reply.id || `${reply.role || 'reply'}-${index}`,
  role: reply.role === 'seller' ? 'seller' : 'buyer',
  username: reply.username || (reply.role === 'seller' ? '卖家' : '买家'),
  content: reply.content || '',
  createTime: reply.createTime || formatReplyTime(reply.createdAt)
});

const normalizeEvaluation = (evaluation) => ({
  ...evaluation,
  userId: evaluation.userId || evaluation.user?.id,
  username: evaluation.username || evaluation.user?.nickname || evaluation.user?.username || '匿名用户',
  avatar: evaluation.avatar || evaluation.user?.avatar || avatarImages.userOne,
  rating: Number(evaluation.rating || 0),
  createTime: evaluation.createTime || new Date(evaluation.createdAt).toLocaleString(),
  replies: Array.isArray(evaluation.replies)
    ? evaluation.replies.map(normalizeReply)
    : (evaluation.reply ? [normalizeReply({ role: 'seller', username: '卖家', content: evaluation.reply, createdAt: evaluation.updatedAt }, 0)] : [])
});

const EvaluationList = ({ productId, initialCount = 0, onCountChange }) => {
  const navigate = useNavigate();
  const [evaluations, setEvaluations] = useState([]);
  const [total, setTotal] = useState(initialCount);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eligibleOrder, setEligibleOrder] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyingEvaluationId, setReplyingEvaluationId] = useState(null);
  const [form, setForm] = useState({
    rating: 5,
    content: ''
  });

  const currentUserId = getUserKey(getStoredUser());
  const hasReviewed = useMemo(() => (
    Boolean(currentUserId) && evaluations.some(evaluation => isSameId(evaluation.userId, currentUserId))
  ), [currentUserId, evaluations]);

  const loadEvaluations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await evaluationApi.getProductEvaluations({ productId, limit: 100 });
      const result = response.data.evaluations || [];
      const normalized = result.map(normalizeEvaluation);
      const nextTotal = response.data.pagination?.total ?? normalized.length;
      setEvaluations(normalized);
      setTotal(nextTotal);
      onCountChange?.(nextTotal);
      setError('');
    } catch (err) {
      setEvaluations([]);
      setError(err.response?.data?.message || '评价加载失败');
    } finally {
      setLoading(false);
    }
  }, [onCountChange, productId]);

  useEffect(() => {
    loadEvaluations();
  }, [loadEvaluations]);

  useEffect(() => {
    setTotal(initialCount);
  }, [initialCount, productId]);

  useEffect(() => {
    const loadEligibleOrder = async () => {
      if (!isLoggedIn()) {
        setEligibleOrder(null);
        return;
      }

      setCheckingEligibility(true);
      try {
        const response = await orderApi.getList({ limit: 100 });
        const orders = response.data.orders || [];
        const matchedOrder = orders.find(order => (
          isCompletedOrder(order.status) &&
          (order.items || []).some(item => isSameId(item.productId || item.id, productId))
        ));
        setEligibleOrder(matchedOrder || null);
      } catch {
        setEligibleOrder(null);
      } finally {
        setCheckingEligibility(false);
      }
    };

    loadEligibleOrder();
  }, [productId]);

  const renderStars = (rating, onChange) => (
    Array(5).fill(0).map((_, index) => {
      const value = index + 1;
      return (
        <span
          key={value}
          style={{
            color: value <= rating ? '#ffd700' : '#ddd',
            fontSize: onChange ? '20px' : '16px',
            cursor: onChange ? 'pointer' : 'default'
          }}
          onClick={() => onChange?.(value)}
        >
          ★
        </span>
      );
    })
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isLoggedIn()) {
      navigate('/login');
      return;
    }

    if (!eligibleOrder) {
      setError('只有已完成订单中的商品可以评价');
      return;
    }

    const content = form.content.trim();
    if (!content) {
      setError('请填写评价内容');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await evaluationApi.create({
        orderId: eligibleOrder.id,
        productId,
        rating: form.rating,
        content,
        images: []
      });
      setForm({ rating: 5, content: '' });
      await loadEvaluations();
    } catch (err) {
      setError(err.response?.data?.message || '评价提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToUserShop = (userId) => {
    if (userId) {
      navigate(`/shop/user/${userId}`);
    }
  };

  const canReplyToEvaluation = (evaluation) => (
    isLoggedIn() && (
      isSameId(evaluation.userId, currentUserId) ||
      isSameId(evaluation.sellerId, currentUserId)
    )
  );

  const handleReplyDraftChange = (evaluationId, value) => {
    setReplyDrafts(prev => ({
      ...prev,
      [evaluationId]: value
    }));
    setError('');
  };

  const handleReplySubmit = async (evaluation) => {
    if (!isLoggedIn()) {
      navigate('/login');
      return;
    }

    if (!canReplyToEvaluation(evaluation)) {
      setError('只有卖家或原评价买家可以继续回复');
      return;
    }

    const reply = String(replyDrafts[evaluation.id] || '').trim();
    if (!reply) {
      setError('回复内容不能为空');
      return;
    }

    setReplyingEvaluationId(evaluation.id);
    try {
      const response = await evaluationApi.reply(evaluation.id, { reply });
      const updatedEvaluation = normalizeEvaluation(response.data);
      setEvaluations(prev => prev.map(item => (
        isSameId(item.id, evaluation.id) ? updatedEvaluation : item
      )));
      setReplyDrafts(prev => ({
        ...prev,
        [evaluation.id]: ''
      }));
      window.dispatchEvent(new Event('seller-alerts-refresh'));
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || '回复失败，请稍后重试');
    } finally {
      setReplyingEvaluationId(null);
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div style={{ marginTop: '40px' }}>
      <h2>商品评价（{total}）</h2>
      {error && <div style={{ color: '#ff4d4f', marginTop: '12px' }}>{error}</div>}

      {isLoggedIn() && eligibleOrder && !hasReviewed && (
        <form
          onSubmit={handleSubmit}
          style={{ marginTop: '20px', border: '1px solid #e8e8e8', borderRadius: '4px', padding: '16px', background: '#fafafa' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontWeight: 'bold' }}>添加评价</span>
            <span>{renderStars(form.rating, rating => setForm(prev => ({ ...prev, rating })))}</span>
          </div>
          <textarea
            value={form.content}
            onChange={(event) => setForm(prev => ({ ...prev, content: event.target.value }))}
            rows="3"
            placeholder="写下你的真实使用感受"
            style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px', resize: 'vertical', marginBottom: '12px' }}
          />
          <button type="submit" className="button button-primary" disabled={submitting}>
            {submitting ? '提交中...' : '提交评价'}
          </button>
        </form>
      )}

      {isLoggedIn() && !eligibleOrder && !checkingEligibility && !hasReviewed && (
        <div style={{ marginTop: '16px', color: '#666' }}>购买并确认收货后可评价该商品</div>
      )}

      {evaluations.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>暂无评价</div>
      ) : (
        <div style={{ marginTop: '20px' }}>
          {evaluations.map((evaluation) => (
            <div key={evaluation.id} style={{ borderBottom: '1px solid #e8e8e8', padding: '20px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <button
                  type="button"
                  onClick={() => handleGoToUserShop(evaluation.userId)}
                  disabled={!evaluation.userId}
                  title="进入店铺"
                  style={{ border: 'none', background: 'transparent', padding: 0, marginRight: '12px', cursor: evaluation.userId ? 'pointer' : 'default' }}
                >
                  <img
                    src={evaluation.avatar}
                    alt={evaluation.username}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                </button>
                <div>
                  <button
                    type="button"
                    onClick={() => handleGoToUserShop(evaluation.userId)}
                    disabled={!evaluation.userId}
                    style={{ display: 'block', border: 'none', background: 'transparent', padding: 0, fontWeight: 'bold', marginBottom: '4px', cursor: evaluation.userId ? 'pointer' : 'default' }}
                  >
                    {evaluation.username}
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {renderStars(evaluation.rating)}
                    <span style={{ marginLeft: '10px', fontSize: '14px', color: '#666' }}>
                      {evaluation.createTime}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>{evaluation.content}</div>
              {evaluation.images && evaluation.images.length > 0 && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  {evaluation.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`评价图片 ${index + 1}`}
                      style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                    />
                  ))}
                </div>
              )}
              {evaluation.replies.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  {evaluation.replies.map((reply, index) => (
                    <div
                      key={reply.id}
                      style={{
                        marginLeft: `${Math.min(index, 5) * 16}px`,
                        marginTop: '8px',
                        borderLeft: `3px solid ${reply.role === 'seller' ? '#1890ff' : '#52c41a'}`,
                        padding: '8px 12px',
                        background: reply.role === 'seller' ? '#f5faff' : '#f6ffed',
                        color: '#333'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <strong style={{ color: reply.role === 'seller' ? '#1890ff' : '#52c41a' }}>
                          {reply.role === 'seller' ? '卖家' : reply.username}：
                        </strong>
                        <span style={{ color: '#8c8c8c', fontSize: '13px' }}>{reply.createTime}</span>
                      </div>
                      <div>{reply.content}</div>
                    </div>
                  ))}
                </div>
              )}
              {canReplyToEvaluation(evaluation) && (
                <div style={{ marginTop: '12px' }}>
                  <textarea
                    value={replyDrafts[evaluation.id] || ''}
                    onChange={(event) => handleReplyDraftChange(evaluation.id, event.target.value)}
                    rows="2"
                    placeholder="继续回复这条评价"
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px', resize: 'vertical', marginBottom: '8px' }}
                  />
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => handleReplySubmit(evaluation)}
                    disabled={replyingEvaluationId === evaluation.id}
                    style={{ padding: '7px 14px', fontSize: '14px' }}
                  >
                    {replyingEvaluationId === evaluation.id ? '回复中...' : '回复'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EvaluationList;
