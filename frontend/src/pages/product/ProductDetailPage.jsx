import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getProductDetail } from '../../store/productSlice';
import { addToCart } from '../../store/cartSlice';
import EvaluationList from '../../components/evaluation/EvaluationList';
import { fallbackImages } from '../../data/imageAssets';
import { isLoggedIn } from '../../utils/accountStorage';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentProduct, loading, error } = useSelector((state) => state.product);
  const { items: cartItems } = useSelector((state) => state.cart);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    dispatch(getProductDetail(id));
  }, [dispatch, id]);

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error) {
    return <div className="error">加载失败，请重试</div>;
  }

  if (!currentProduct) {
    return <div className="empty">商品不存在</div>;
  }

  const isAvailable = !currentProduct.status || currentProduct.status === '在售';
  const stock = Number(currentProduct.stock);
  const hasStockLimit = Number.isFinite(stock);
  const currentCartQuantity = cartItems.find(item => item.id === currentProduct.id)?.quantity || 0;

  const canAddOneMore = () => {
    if (hasStockLimit && stock <= 0) {
      setNotice('该商品暂无库存，无法加入购物车');
      return false;
    }

    if (hasStockLimit && currentCartQuantity >= stock) {
      setNotice(`库存仅剩 ${stock} 件，购物车中已达到库存上限`);
      return false;
    }

    return true;
  };

  const handleAddToCart = () => {
    if (!isAvailable) {
      setNotice('该商品当前不可购买');
      return;
    }

    if (!isLoggedIn()) {
      setNotice('请先登录后再加入购物车');
      return;
    }

    if (!canAddOneMore()) {
      return;
    }

    setNotice('');
    dispatch(addToCart({ ...currentProduct, quantity: 1 }));
  };

  const handleBuyNow = () => {
    if (!isAvailable) {
      setNotice('该商品当前不可购买');
      return;
    }

    if (!isLoggedIn()) {
      setNotice('请先登录后再购买商品');
      return;
    }

    if (!canAddOneMore()) {
      return;
    }

    setNotice('');
    dispatch(addToCart({ ...currentProduct, quantity: 1 }));
    navigate('/checkout');
  };

  return (
    <div className="product-detail">
      <div className="container">
        <div className="product-detail-content">
          <div className="product-detail-header">
            <div className="product-detail-images">
              <img
                src={currentProduct.images?.[0] || fallbackImages.product}
                alt={currentProduct.name}
                style={{ width: '100%', height: '500px', objectFit: 'contain' }}
              />
              {currentProduct.images && currentProduct.images.length > 1 && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  {currentProduct.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`${currentProduct.name} ${index + 1}`}
                      style={{ width: '80px', height: '80px', objectFit: 'cover', cursor: 'pointer' }}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="product-detail-info">
              <h1 className="product-detail-title">{currentProduct.name}</h1>
              <div className="product-detail-price">¥{currentProduct.price}</div>
              <div className="product-detail-stats">
                <span>销量: {currentProduct.sales || 0}</span>
                <span>评价: {currentProduct.evaluationCount || 0}</span>
                <span>库存: {hasStockLimit ? currentProduct.stock : '充足'}</span>
                <span>收藏: {currentProduct.favoriteCount || 0}</span>
                <span>状态: {currentProduct.status || '在售'}</span>
              </div>
              <div className="product-detail-seller">
                <h3>卖家信息</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                  <img
                    src={currentProduct.seller?.avatar || fallbackImages.avatar}
                    alt={currentProduct.seller?.nickname}
                    style={{ width: '50px', height: '50px', borderRadius: '50%' }}
                  />
                  <div>
                    <div>{currentProduct.seller?.nickname || '未知卖家'}</div>
                    <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                      信用等级: {currentProduct.seller?.creditLevel || '普通会员'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="product-detail-actions">
                <button className="button button-secondary" onClick={handleAddToCart} disabled={!isAvailable || (hasStockLimit && stock <= 0)}>加入购物车</button>
                <button className="button button-primary" onClick={handleBuyNow} disabled={!isAvailable || (hasStockLimit && stock <= 0)}>立即购买</button>
              </div>
              {notice && (
                <div className="inline-notice product-detail-notice">
                  {notice}
                  {notice.includes('登录') && (
                    <button type="button" onClick={() => navigate('/login')}>去登录</button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div style={{ marginTop: '40px' }}>
            <h2>商品描述</h2>
            <div style={{ marginTop: '20px', lineHeight: '1.6' }}>
              {currentProduct.description || '暂无描述'}
            </div>
          </div>
          {(Number(currentProduct.productType) === 2 || currentProduct.isSecondhand) && (
            <div style={{ marginTop: '40px' }}>
              <h2>二手商品信息</h2>
              <div style={{ marginTop: '20px' }}>
                <p>成色: {getConditionText(currentProduct.condition)}</p>
                <p>使用时间: {currentProduct.usageTime || '未知'}</p>
                <p>交易地点: {currentProduct.location || '未填写'}</p>
                <p>是否有瑕疵: {currentProduct.hasDefect ? '是' : '否'}</p>
                {currentProduct.defectDescription && (
                  <p>瑕疵描述: {currentProduct.defectDescription}</p>
                )}
              </div>
            </div>
          )}
          <EvaluationList productId={id} />
        </div>
      </div>
    </div>
  );
};

const getConditionText = (condition) => {
  if (typeof condition === 'string') {
    return condition;
  }
  const conditionMap = {
    1: '全新',
    2: '九成新',
    3: '八成新',
    4: '七成新',
    5: '六成新及以下'
  };
  return conditionMap[condition] || '未知';
};

export default ProductDetailPage;
