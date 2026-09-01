import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { productImages } from '../../data/imageAssets';
import { evaluationApi, orderApi, uploadApi } from '../../services/api';

const sameId = (left, right) => Number(left) === Number(right) && Number.isFinite(Number(left));

const EvaluationPage = () => {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const focusProductId = searchParams.get('productId');

  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingProductId, setUploadingProductId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadOrder = async () => {
      if (!localStorage.getItem('token')) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const [orderResponse, historyResponse] = await Promise.all([
          orderApi.getDetail(orderId),
          evaluationApi.getUserEvaluations({ limit: 100 })
        ]);

        if (orderResponse.data.status !== '已完成') {
          setError('订单完成后才能评价，请先确认收货。');
        }

        const existingByProduct = new Map(
          (historyResponse.data.evaluations || [])
            .filter(evaluation => sameId(evaluation.orderId, orderId))
            .map(evaluation => [Number(evaluation.productId), evaluation])
        );

        const items = orderResponse.data.items || [];
        const nextEvaluations = items.map(item => {
          const existing = existingByProduct.get(Number(item.productId));
          return {
            id: item.productId,
            productId: item.productId,
            productName: item.name,
            productImage: item.image || productImages.iphone,
            rating: existing ? Number(existing.rating || 5) : 5,
            content: existing?.content || '',
            images: existing?.images || [],
            replies: existing?.replies || [],
            submitted: Boolean(existing),
            evaluationId: existing?.id || null
          };
        });

        if (focusProductId) {
          nextEvaluations.sort((left, right) => {
            if (sameId(left.productId, focusProductId)) {
              return -1;
            }
            if (sameId(right.productId, focusProductId)) {
              return 1;
            }
            return 0;
          });
        }

        setEvaluations(nextEvaluations);
        if (!items.length) {
          setError('订单中没有可评价的商品');
        }
      } catch (err) {
        setEvaluations([]);
        setError(err.response?.data?.message || '订单信息加载失败');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId, focusProductId]);

  useEffect(() => {
    if (loading || !focusProductId) {
      return;
    }

    const target = document.getElementById(`eval-product-${focusProductId}`);
    target?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [loading, focusProductId, evaluations]);

  const pendingEvaluations = evaluations.filter(item => !item.submitted);

  const handleRatingChange = (productId, rating) => {
    setEvaluations(prev => prev.map(item => (
      item.productId === productId && !item.submitted ? { ...item, rating } : item
    )));
  };

  const handleContentChange = (productId, content) => {
    setEvaluations(prev => prev.map(item => (
      item.productId === productId && !item.submitted ? { ...item, content } : item
    )));
  };

  const handleImageUpload = async (productId, e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) {
      return;
    }

    setUploadingProductId(productId);
    try {
      const response = await uploadApi.uploadImages(files);
      const imageUrls = response.data.urls || [];
      setEvaluations(prev => prev.map(item => (
        item.productId === productId && !item.submitted
          ? { ...item, images: [...item.images, ...imageUrls] }
          : item
      )));
    } catch (err) {
      setError(err.response?.data?.message || '图片上传失败，请稍后重试');
    } finally {
      setUploadingProductId(null);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (productId, index) => {
    setEvaluations(prev => prev.map(item => (
      item.productId === productId && !item.submitted
        ? { ...item, images: item.images.filter((_, i) => i !== index) }
        : item
    )));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!localStorage.getItem('token')) {
      alert('请先登录后再评价');
      navigate('/login');
      return;
    }

    if (!pendingEvaluations.length) {
      navigate('/user');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await Promise.all(pendingEvaluations.map(item => evaluationApi.create({
        orderId,
        productId: item.productId,
        rating: item.rating,
        content: item.content || '默认好评',
        images: item.images
      })));
      alert('评价提交成功！');
      navigate('/order');
    } catch (err) {
      setError(err.response?.data?.message || '评价提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (productId, currentRating, readOnly) => (
    <div className="eval-stars">
      {Array(5).fill(0).map((_, index) => (
        <span
          key={index}
          className={`eval-star${index < currentRating ? ' active' : ''}${readOnly ? ' is-readonly' : ''}`}
          onClick={readOnly ? undefined : () => handleRatingChange(productId, index + 1)}
        >
          ★
        </span>
      ))}
    </div>
  );

  if (!localStorage.getItem('token')) {
    return (
      <div className="biz-page">
        <div className="container">
          <h2 className="page-title">评价订单</h2>
          <div className="shop-empty-panel">
            <h3>请先登录后再评价</h3>
            <button className="button button-primary" onClick={() => navigate('/login')}>
              去登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="biz-page">
      <div className="container">
        <h2 className="page-title">评价订单</h2>
        {error && <div className="biz-error">{error}</div>}
        {loading ? (
          <div className="loading">正在加载订单评价...</div>
        ) : (
          <form className="biz-card eval-form" onSubmit={handleSubmit}>
            {evaluations.length === 0 ? (
              <div className="biz-empty">
                <p>没有可评价的商品</p>
                <button type="button" className="button button-secondary" onClick={() => navigate('/user')}>
                  返回我的订单
                </button>
              </div>
            ) : evaluations.map((item) => (
              <div
                key={item.id}
                id={`eval-product-${item.productId}`}
                className={`eval-block${sameId(item.productId, focusProductId) ? ' is-focus' : ''}${item.submitted ? ' is-submitted' : ''}`}
              >
                <div className="eval-product">
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="biz-thumb biz-thumb-lg"
                  />
                  <div className="biz-line-body">
                    <div className="biz-line-name">{item.productName}</div>
                    {item.submitted && <div className="eval-badge">已评价</div>}
                    {renderStars(item.productId, item.rating, item.submitted)}
                  </div>
                </div>
                <div className="eval-field">
                  <label>评价内容</label>
                  {item.submitted ? (
                    <div className="eval-content-readonly">{item.content || '（无文字评价）'}</div>
                  ) : (
                    <textarea
                      value={item.content}
                      onChange={(e) => handleContentChange(item.productId, e.target.value)}
                      rows="4"
                    />
                  )}
                </div>
                {item.submitted ? (
                  <>
                    {item.images.length > 0 && (
                      <div className="eval-field">
                        <label>评价图片</label>
                        <div className="eval-images">
                          {item.images.map((image, index) => (
                            <div key={index} className="eval-image">
                              <img src={image} alt={`评价图片 ${index + 1}`} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {item.replies.length > 0 && (
                      <div className="eval-field">
                        <label>回复</label>
                        <div className="evaluation-reply-list">
                          {item.replies.map((reply) => (
                            <div key={reply.id} className={`evaluation-reply evaluation-reply-${reply.role}`}>
                              <div className="evaluation-reply-meta">
                                {reply.role === 'seller' ? '卖家' : '买家'}
                              </div>
                              <div className="evaluation-reply-content">{reply.content}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="eval-field">
                    <label>上传图片</label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleImageUpload(item.productId, e)}
                      disabled={uploadingProductId === item.productId}
                    />
                    {uploadingProductId === item.productId && (
                      <div className="eval-hint">图片上传中...</div>
                    )}
                    <div className="eval-images">
                      {item.images.map((image, index) => (
                        <div key={index} className="eval-image">
                          <img src={image} alt={`预览 ${index + 1}`} />
                          <button
                            type="button"
                            className="eval-image-remove"
                            onClick={() => handleRemoveImage(item.productId, index)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div className="eval-actions">
              {pendingEvaluations.length > 0 ? (
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={submitting}
                >
                  {submitting ? '提交中...' : '提交评价'}
                </button>
              ) : (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => navigate('/user')}
                >
                  返回我的订单
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EvaluationPage;
