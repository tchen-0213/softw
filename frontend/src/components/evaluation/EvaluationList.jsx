import React, { useEffect, useState } from 'react';

const EvaluationList = ({ productId }) => {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟获取评价数据
    setTimeout(() => {
      setEvaluations([
        {
          id: '1',
          userId: '1',
          username: '张三',
          avatar: 'https://via.placeholder.com/40x40?text=User1',
          rating: 5,
          content: '商品质量很好，与描述一致，非常满意！',
          images: [],
          createTime: '2026-03-30 10:00:00'
        },
        {
          id: '2',
          userId: '2',
          username: '李四',
          avatar: 'https://via.placeholder.com/40x40?text=User2',
          rating: 4,
          content: '商品还可以，就是物流有点慢。',
          images: [],
          createTime: '2026-03-28 15:30:00'
        },
        {
          id: '3',
          userId: '3',
          username: '王五',
          avatar: 'https://via.placeholder.com/40x40?text=User3',
          rating: 5,
          content: '二手商品，但成色很好，几乎全新，非常值得购买！',
          images: [
            'https://via.placeholder.com/100x100?text=Image1',
            'https://via.placeholder.com/100x100?text=Image2'
          ],
          createTime: '2026-03-25 09:00:00'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, [productId]);

  const renderStars = (rating) => {
    return Array(5).fill(0).map((_, index) => (
      <span key={index} style={{ color: index < rating ? '#ffd700' : '#ddd', fontSize: '16px' }}>
        ★
      </span>
    ));
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div style={{ marginTop: '40px' }}>
      <h2>商品评价</h2>
      {evaluations.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>暂无评价</div>
      ) : (
        <div style={{ marginTop: '20px' }}>
          {evaluations.map((evaluation) => (
            <div key={evaluation.id} style={{ borderBottom: '1px solid #e8e8e8', padding: '20px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <img
                  src={evaluation.avatar}
                  alt={evaluation.username}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '12px' }}
                />
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{evaluation.username}</div>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EvaluationList;