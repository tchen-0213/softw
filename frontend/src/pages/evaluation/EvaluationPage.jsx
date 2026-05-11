import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productImages } from '../../data/imageAssets';
import { evaluationApi, orderApi } from '../../services/api';

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
  const [error, setError] = useState('');

  useEffect(() => {
    const loadOrder = async () => {
      if (!localStorage.getItem('token')) {
        return;
      }

      try {
        const response = await orderApi.getDetail(orderId);
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

  const handleImageUpload = (productId, e) => {
    const files = Array.from(e.target.files);
    const imageUrls = files.map(file => URL.createObjectURL(file));
    setEvaluations(prev => prev.map(item => 
      item.productId === productId ? { ...item, images: [...item.images, ...imageUrls] } : item
    ));
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

  const renderStars = (productId, currentRating) => {
    return Array(5).fill(0).map((_, index) => (
      <span
        key={index}
        style={{
          color: index < currentRating ? '#ffd700' : '#ddd',
          fontSize: '20px',
          cursor: 'pointer'
        }}
        onClick={() => handleRatingChange(productId, index + 1)}
      >
        ★
      </span>
    ));
  };

  return (
    <div style={{ padding: '20px 0' }}>
      <div className="container">
        <h2 style={{ marginBottom: '20px' }}>评价订单</h2>
        {error && <div style={{ color: '#ff4d4f', marginBottom: '16px' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ border: '1px solid #e8e8e8', borderRadius: '4px', padding: '20px' }}>
          {evaluations.map((item) => (
            <div key={item.id} style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #e8e8e8' }}>
              <div style={{ display: 'flex', marginBottom: '16px' }}>
                <img
                  src={item.productImage}
                  alt={item.productName}
                  style={{ width: '100px', height: '100px', objectFit: 'cover', marginRight: '16px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: '8px' }}>{item.productName}</div>
                  <div style={{ marginBottom: '8px' }}>
                    {renderStars(item.productId, item.rating)}
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px' }}>评价内容</label>
                <textarea
                  value={item.content}
                  onChange={(e) => handleContentChange(item.productId, e.target.value)}
                  rows="4"
                  style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px', resize: 'vertical' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px' }}>上传图片</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleImageUpload(item.productId, e)}
                  style={{ marginBottom: '12px' }}
                />
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {item.images.map((image, index) => (
                    <div key={index} style={{ position: 'relative' }}>
                      <img
                        src={image}
                        alt={`预览 ${index + 1}`}
                        style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(item.productId, index)}
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          background: '#ff4d4f',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 30px',
                background: '#1890ff',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px'
              }}
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
