import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productImages } from '../../data/imageAssets';
import { evaluationApi, orderApi, uploadApi } from '../../services/api';

const EvaluationPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [evaluations, setEvaluations] = useState([
    {
      id: '1',
      productId: '1',
      productName: '全新 iPhone 15 Pro',
      productImage: productImages.iphone,
      rating: 5,
      content: '',
      images: []
    },
    {
      id: '2',
      productId: '2',
      productName: 'AirPods Pro 2',
      productImage: productImages.airpods,
      rating: 5,
      content: '',
      images: []
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [uploadingProductId, setUploadingProductId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadOrder = async () => {
      if (!localStorage.getItem('token')) {
        return;
      }

      try {
        const response = await orderApi.getDetail(orderId);
        if (response.data.status !== '已完成') {
          setError('订单完成后才能评价，请先确认收货。');
        }
        const items = response.data.items || [];
        if (items.length) {
          setEvaluations(items.map(item => ({
            id: item.productId,
            productId: item.productId,
            productName: item.name,
            productImage: item.image || productImages.iphone,
            rating: 5,
            content: '',
            images: []
          })));
        }
      } catch (err) {
        setError(err.response?.data?.message || '订单信息加载失败，已显示演示数据');
      }
    };

    loadOrder();
  }, [orderId]);

  const handleRatingChange = (productId, rating) => {
    setEvaluations(prev => prev.map(item =>
      item.productId === productId ? { ...item, rating } : item
    ));
  };

  const handleContentChange = (productId, content) => {
    setEvaluations(prev => prev.map(item =>
      item.productId === productId ? { ...item, content } : item
    ));
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
      setEvaluations(prev => prev.map(item =>
        item.productId === productId ? { ...item, images: [...item.images, ...imageUrls] } : item
      ));
    } catch (err) {
      setError(err.response?.data?.message || '图片上传失败，请稍后重试');
    } finally {
      setUploadingProductId(null);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (productId, index) => {
    setEvaluations(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, images: item.images.filter((_, i) => i !== index) }
        : item
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!localStorage.getItem('token')) {
      alert('请先登录后再评价');
      navigate('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await Promise.all(evaluations.map(item => evaluationApi.create({
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
      setLoading(false);
    }
  };

  const renderStars = (productId, currentRating) => (
    <div className="eval-stars">
      {Array(5).fill(0).map((_, index) => (
        <span
          key={index}
          className={`eval-star${index < currentRating ? ' active' : ''}`}
          onClick={() => handleRatingChange(productId, index + 1)}
        >
          ★
        </span>
      ))}
    </div>
  );

  return (
    <div className="biz-page">
      <div className="container">
        <h2 className="page-title">评价订单</h2>
        {error && <div className="biz-error">{error}</div>}
        <form className="biz-card eval-form" onSubmit={handleSubmit}>
          {evaluations.map((item) => (
            <div key={item.id} className="eval-block">
              <div className="eval-product">
                <img
                  src={item.productImage}
                  alt={item.productName}
                  className="biz-thumb biz-thumb-lg"
                />
                <div className="biz-line-body">
                  <div className="biz-line-name">{item.productName}</div>
                  {renderStars(item.productId, item.rating)}
                </div>
              </div>
              <div className="eval-field">
                <label>评价内容</label>
                <textarea
                  value={item.content}
                  onChange={(e) => handleContentChange(item.productId, e.target.value)}
                  rows="4"
                />
              </div>
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
            </div>
          ))}
          <div className="eval-actions">
            <button
              type="submit"
              className="button button-primary"
              disabled={loading}
            >
              {loading ? '提交中...' : '提交评价'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EvaluationPage;
