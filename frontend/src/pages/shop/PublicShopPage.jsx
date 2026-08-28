import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CreditBadge from '../../components/credit/CreditBadge';
import { fallbackImages, shopImages } from '../../data/imageAssets';
import { shopApi } from '../../services/api';

const normalizeShop = (shop) => ({
  ...shop,
  logo: shop?.logo || shop?.avatar || shopImages.logo,
  banner: shop?.banner || shopImages.banner,
  creditLevel: shop?.creditLevel || shop?.owner?.creditLevel || '普通',
  creditScore: shop?.creditScore ?? shop?.owner?.creditScore ?? 100,
  products: Array.isArray(shop?.products)
    ? shop.products.map(product => ({
        ...product,
        image: product.image || product.images?.[0] || fallbackImages.product
      }))
    : []
});

const PublicShopPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadShop = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await shopApi.getByUser(userId);
        setShop(normalizeShop(response.data || {}));
      } catch (err) {
        setError(err.response?.data?.message || '店铺加载失败');
        setShop(null);
      } finally {
        setLoading(false);
      }
    };

    loadShop();
  }, [userId]);

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error || !shop) {
    return (
      <div className="biz-page">
        <div className="container">
          <div className="error">{error || '店铺不存在'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="biz-page">
      <div className="container">
        <div className="biz-card" style={{ marginBottom: 24 }}>
          <img
            src={shop.banner}
            alt={shop.name}
            className="public-shop-banner"
            onError={(event) => {
              event.currentTarget.src = shopImages.banner;
            }}
          />
          <div className="public-shop-head">
            <img
              src={shop.logo}
              alt={shop.name}
              className="public-shop-logo"
              onError={(event) => {
                event.currentTarget.src = shopImages.logo;
              }}
            />
            <div>
              <h1>{shop.name}</h1>
              <p>{shop.description || '店主暂未填写简介'}</p>
              <div className="detail-seller-row">
                <span style={{ color: 'var(--primary-color)', fontWeight: 650 }}>
                  在售商品 {shop.products.length} 件
                </span>
                <CreditBadge compact level={shop.creditLevel} score={shop.creditScore} />
              </div>
            </div>
          </div>
        </div>

        <h3 className="biz-section-title">店铺商品</h3>
        {shop.products.length === 0 ? (
          <div className="biz-empty">
            <p>暂无商品</p>
          </div>
        ) : (
          <div className="product-list">
            {shop.products.map(product => (
              <div
                key={product.id}
                className="product-card"
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="product-image"
                  onError={(event) => {
                    event.currentTarget.src = fallbackImages.product;
                  }}
                />
                <div className="product-info">
                  <div className="product-title">{product.name}</div>
                  <div className="product-price">¥{Number(product.price || 0).toFixed(2)}</div>
                  <div className="product-stats">
                    <span>销量 {product.sales || 0}</span>
                    <span>评价 {product.evaluationCount || 0}</span>
                    <span>{product.status || '在售'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicShopPage;
