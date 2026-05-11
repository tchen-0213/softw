import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getRecommendedProducts, getProducts } from '../../store/productSlice';
import { addToCart } from '../../store/cartSlice';
import { useNavigate } from 'react-router-dom';
import { fallbackImages } from '../../data/imageAssets';

const HomePage = () => {
  const dispatch = useDispatch();
  const { recommendedProducts, products, loading, error } = useSelector((state) => state.product);
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(getRecommendedProducts());
    dispatch(getProducts({ page: 1, size: 10 }));
  }, [dispatch]);

  const handleProductClick = (id) => {
    navigate(`/product/${id}`);
  };

  const handleAddToCart = (event, product) => {
    event.stopPropagation();
    dispatch(addToCart({ ...product, quantity: 1 }));
  };

  const renderProductCard = (product) => (
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
        </div>
        <button
          type="button"
          className="product-add-button"
          onClick={(event) => handleAddToCart(event, product)}
        >
          加入购物车
        </button>
      </div>
    </div>
  );

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error) {
    return <div className="error">加载失败，请重试</div>;
  }

  return (
    <div style={{ padding: '20px 0' }}>
      <div className="container">
        <h2 style={{ marginBottom: '20px' }}>推荐商品</h2>
        <div className="product-list">
          {recommendedProducts.map(renderProductCard)}
        </div>

        <h2 style={{ margin: '40px 0 20px' }}>热门商品</h2>
        <div className="product-list">
          {products.map(renderProductCard)}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
