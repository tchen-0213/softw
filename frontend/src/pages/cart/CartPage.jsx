import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import CartItem from '../../components/cart/CartItem';
import { clearCart } from '../../store/cartSlice';
import { useNavigate } from 'react-router-dom';
import { isLoggedIn } from '../../utils/accountStorage';

const CartPage = () => {
  const { items } = useSelector((state) => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleClearCart = () => {
    dispatch(clearCart());
  };

  const handleCheckout = () => {
    if (items.length === 0) return;
    navigate('/checkout');
  };

  if (!isLoggedIn()) {
    return (
      <div style={{ padding: '20px 0' }}>
        <div className="container">
          <h2 style={{ marginBottom: '20px' }}>购物车</h2>
          <div className="shop-empty-panel">
            <h3>请先登录后查看购物车</h3>
            <button className="button button-primary" onClick={() => navigate('/login')}>
              去登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0' }}>
      <div className="container">
        <h2 style={{ marginBottom: '20px' }}>购物车</h2>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <p>购物车为空</p>
            <button
              onClick={() => navigate('/')}
              style={{
                marginTop: '20px',
                padding: '8px 16px',
                background: '#1890ff',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              去购物
            </button>
          </div>
        ) : (
          <div>
            <div style={{ border: '1px solid #e8e8e8', borderRadius: '4px' }}>
              {items.map((item) => (
                <CartItem key={item.id} item={item} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
              <button
                onClick={handleClearCart}
                style={{
                  padding: '8px 16px',
                  background: '#fff',
                  color: '#666',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                清空购物车
              </button>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ marginRight: '20px' }}>
                  <span>共 {totalQuantity} 件商品</span>
                  <span style={{ marginLeft: '20px', fontSize: '18px', fontWeight: 'bold', color: '#ff4d4f' }}>
                    合计: ¥{totalPrice.toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={handleCheckout}
                  style={{
                    padding: '10px 20px',
                    background: '#ff4d4f',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  去结算
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
