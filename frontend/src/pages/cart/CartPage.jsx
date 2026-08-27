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
      <div className="page-shell page-shell-empty">
        <div className="container">
          <h2 className="page-title">购物车</h2>
          <div className="shop-empty-panel page-empty-state">
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
    <div className={`page-shell${items.length === 0 ? ' page-shell-empty' : ''}`}>
      <div className="container">
        <h2 className="page-title">购物车</h2>
        {items.length === 0 ? (
          <div className="shop-empty-panel page-empty-state">
            <h3>购物车为空</h3>
            <p>先去挑几件喜欢的商品，再回来一起结算。</p>
            <button
              className="button button-primary"
              onClick={() => navigate('/')}
            >
              去购物
            </button>
          </div>
        ) : (
          <div className="cart-content">
            <div className="cart-list">
              {items.map((item) => (
                <CartItem key={item.id} item={item} />
              ))}
            </div>
            <div className="cart-summary">
              <button
                onClick={handleClearCart}
                className="button button-secondary"
              >
                清空购物车
              </button>
              <div className="cart-summary-main">
                <div className="cart-total">
                  <span>共 {totalQuantity} 件商品</span>
                  <strong>
                    合计: ¥{totalPrice.toFixed(2)}
                  </strong>
                </div>
                <button
                  onClick={handleCheckout}
                  className="button button-primary"
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
