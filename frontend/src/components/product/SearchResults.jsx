import React from 'react';
import { useNavigate } from 'react-router-dom';
import { fallbackImages } from '../../data/imageAssets';

const SearchResults = ({ results, loading, error }) => {
  const navigate = useNavigate();

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error) {
    return <div className="error">搜索失败，请重试</div>;
  }

  if (results.length === 0) {
    return <div className="empty">没有找到相关商品</div>;
  }

  const handleProductClick = (id) => {
    navigate(`/product/${id}`);
  };

  return (
    <div className="product-list">
      {results.map((product) => (
        <div
          key={product.id}
          className="product-card"
          onClick={() => handleProductClick(product.id)}
        >
          <img
            src={product.images?.[0] || fallbackImages.product}
            alt={product.name}
            className="product-image"
          />
          <div className="product-info">
            <div className="product-title">{product.name}</div>
            <div className="product-price">¥{product.price}</div>
            <div className="product-seller">{product.seller?.nickname || '未知卖家'}</div>
            <div className="product-stats">
              <span>销量: {product.sales || 0}</span>
              <span>评价: {product.evaluationCount || 0}</span>
              <span>库存: {Number.isFinite(Number(product.stock)) ? product.stock : '充足'}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SearchResults;
