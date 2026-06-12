import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fallbackImages, shopImages } from '../../data/imageAssets';
import { shopApi } from '../../services/api';

const normalizeShop = (shop) => ({
  ...shop,
  logo: shop?.logo || shop?.avatar || shopImages.logo,
  banner: shop?.banner || shopImages.banner,
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
      <div style={{ padding: '20px 0' }}>
        <div className="container">
          <div className="error">{error || '店铺不存在'}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0' }}>
      <div className="container">
        <div style={{ border: '1px solid #e8e8e8', borderRadius: '4px', overflow: 'hidden', marginBottom: '30px' }}>
          <img
            src={shop.banner}
            alt={shop.name}
            onError={(event) => {
              event.currentTarget.src = shopImages.banner;
            }}
            style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block' }}
          />
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', padding: '20px' }}>
            <img
              src={shop.logo}
              alt={shop.name}
              onError={(event) => {
                event.currentTarget.src = shopImages.logo;
              }}
              style={{ width: '96px', height: '96px', objectFit: 'cover', borderRadius: '8px' }}
            />
            <div style={{ flex: 1 }}>
              <h2 style={{ marginBottom: '8px' }}>{shop.name}</h2>
              <div style={{ color: '#666', lineHeight: 1.6 }}>{shop.description || '店主暂未填写简介'}</div>
              <div style={{ marginTop: '12px', color: '#1890ff' }}>在售商品 {shop.products.length} 件</div>
            </div>
          </div>
        </div>

        <h3 style={{ marginBottom: '16px' }}>店铺商品</h3>
        {shop.products.length === 0 ? (
          <div style={{ border: '1px solid #e8e8e8', borderRadius: '4px', padding: '40px', textAlign: 'center', color: '#666' }}>
            暂无商品
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
