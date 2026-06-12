import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getRecommendedProducts, getProducts } from '../../store/productSlice';
import { addToCart } from '../../store/cartSlice';
import { useNavigate } from 'react-router-dom';
import { fallbackImages } from '../../data/imageAssets';
import { chatApi } from '../../services/api';
import { getStoredUser, getUserKey, isLoggedIn } from '../../utils/accountStorage';

const HomePage = () => {
  const dispatch = useDispatch();
  const { recommendedProducts, products, loading, error } = useSelector((state) => state.product);
  const { items: cartItems } = useSelector((state) => state.cart);
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(getRecommendedProducts());
    dispatch(getProducts({ page: 1, size: 12 }));
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

  const handleBargain = async (event, product) => {
    event.stopPropagation();

    if (!isLoggedIn()) {
      setNotice('请先登录后再议价');
      return;
    }

    if (product.bargainEnabled === false) {
      setNotice('该商品暂未开启议价功能');
      return;
    }

    const sellerId = product.seller?.id || product.sellerId;
    const currentUserId = getUserKey(getStoredUser());

    if (!sellerId) {
      setNotice('暂时无法获取商家信息');
      return;
    }

    if (String(sellerId) === String(currentUserId)) {
      setNotice('这是你自己的商品，无需向自己议价');
      return;
    }

    setNotice('');
    try {
      const response = await chatApi.createConversation({ productId: product.id });
      navigate(`/chat/${response.data.id}`);
    } catch (err) {
      setNotice(err.response?.data?.message || '议价入口打开失败，请稍后重试');
    }
  };

  const formatPrice = (price) => Number(price || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

  const categories = [
    { label: '数码家电', query: 'electronics' },
    { label: '二手好物', path: '/search?productType=2' },
    { label: '居家生活', query: 'home' },
    { label: '图书教材', query: 'books' }
  ];

  const renderProductCard = (product) => {
    const stock = Number(product.stock);
    const isSoldOut = Number.isFinite(stock) && stock <= 0;
    const isSecondhand = Number(product.productType) === 2 || product.isSecondhand;

    return (
    <div
      key={product.id}
      className="product-card"
      onClick={() => handleProductClick(product.id)}
    >
      <div className="product-media">
        <img
          src={product.images?.[0] || fallbackImages.product}
          alt={product.name}
          className="product-image"
          loading="lazy"
        />
        <span className={`product-badge ${isSecondhand ? 'secondhand' : ''}`}>
          {isSecondhand ? '二手' : '新品'}
        </span>
      </div>
      <div className="product-info">
        <div className="product-title">{product.name}</div>
        <div className="product-meta-row">
          <span className="product-seller">{product.seller?.nickname || '未知卖家'}</span>
          <span>{product.location || product.subCategory || '平台优选'}</span>
        </div>
        <div className="product-price">¥{formatPrice(product.price)}</div>
        <div className="product-stats">
          <span>销量 {product.sales || 0}</span>
          <span>评价 {product.evaluationCount || 0}</span>
          <span>{Number.isFinite(stock) ? `库存 ${stock}` : '库存充足'}</span>
        </div>
        <div className="product-card-actions">
          <button
            type="button"
            className="product-add-button"
            onClick={(event) => handleAddToCart(event, product)}
            disabled={isSoldOut}
          >
            {isSoldOut ? '暂无库存' : '加入购物车'}
          </button>
          <button
            type="button"
            className="product-bargain-button"
            onClick={(event) => handleBargain(event, product)}
            disabled={product.bargainEnabled === false}
          >
            {product.bargainEnabled === false ? '不可议价' : '议价'}
          </button>
        </div>
      </div>
    </div>
    );
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error) {
    return <div className="error">加载失败，请重试</div>;
  }

  return (
    <main className="home-page">
      <div className="container">
        <section className="home-hero">
          <div className="home-hero-copy">
            <span className="home-kicker">校园新品与二手交易</span>
            <h1>把常用好物放到眼前</h1>
            <p>精选数码、教材、居家和二手闲置，浏览、下单、发布和管理都在一个页面节奏里完成。</p>
          </div>
          <div className="home-hero-panel">
            <div>
              <strong>{recommendedProducts.length || products.length}</strong>
              <span>正在推荐</span>
            </div>
            <div>
              <strong>{products.filter(item => item.isSecondhand || Number(item.productType) === 2).length}</strong>
              <span>二手商品</span>
            </div>
            <button type="button" onClick={() => navigate('/sell')}>发布商品</button>
          </div>
        </section>

        <div className="home-categories">
          {categories.map(category => (
            <button
              type="button"
              key={category.label}
              onClick={() => navigate(category.path || `/search?category=${category.query}`)}
            >
              {category.label}
            </button>
          ))}
        </div>

        {notice && (
          <div className="inline-notice">
            {notice}
            {notice.includes('登录') && (
              <button type="button" onClick={() => navigate('/login')}>去登录</button>
            )}
          </div>
        )}

        <div className="section-heading">
          <div>
            <span>Recommended</span>
            <h2>推荐商品</h2>
          </div>
          <button type="button" onClick={() => navigate('/search')}>查看全部</button>
        </div>
        <div className="product-list">
          {recommendedProducts.map(renderProductCard)}
        </div>

        <div className="section-heading section-heading-spaced">
          <div>
            <span>Popular</span>
            <h2>热门商品</h2>
          </div>
        </div>
        <div className="product-list">
          {products.map(renderProductCard)}
        </div>
      </div>
    </main>
  );
};

export default HomePage;
