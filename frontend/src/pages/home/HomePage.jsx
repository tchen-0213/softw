import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getRecommendedProducts, getProducts } from '../../store/productSlice';
import { addToCart } from '../../store/cartSlice';
import { useNavigate } from 'react-router-dom';
import { fallbackImages } from '../../data/imageAssets';
import { isLoggedIn } from '../../utils/accountStorage';

const HomePage = () => {
  const dispatch = useDispatch();
  const { recommendedProducts, products, loading, error } = useSelector((state) => state.product);
  const { items: cartItems } = useSelector((state) => state.cart);
  const [notice, setNotice] = useState('');
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
    const stock = Number(product.stock);
    const hasStockLimit = Number.isFinite(stock);
    const currentQuantity = cartItems.find(item => item.id === product.id)?.quantity || 0;

    if (hasStockLimit && stock <= 0) {
      setNotice('该商品暂无库存，无法加入购物车');
      return;
    }

    if (hasStockLimit && currentQuantity >= stock) {
      setNotice(`库存仅剩 ${stock} 件，购物车中已达到库存上限`);
      return;
    }

    if (!isLoggedIn()) {
      setNotice('请先登录后再加入购物车');
      return;
    }

    setNotice('');
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
          <span>库存: {Number.isFinite(Number(product.stock)) ? product.stock : '充足'}</span>
        </div>
        <button
          type="button"
          className="product-add-button"
          onClick={(event) => handleAddToCart(event, product)}
          disabled={Number.isFinite(Number(product.stock)) && Number(product.stock) <= 0}
        >
          {Number.isFinite(Number(product.stock)) && Number(product.stock) <= 0 ? '暂无库存' : '加入购物车'}
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
        {notice && (
          <div className="inline-notice">
            {notice}
            {notice.includes('登录') && (
              <button type="button" onClick={() => navigate('/login')}>去登录</button>
            )}
          </div>
        )}
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
