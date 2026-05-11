import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { removeFromCart, updateQuantity } from '../../store/cartSlice';
import { fallbackImages } from '../../data/imageAssets';

const FloatingCart = () => {
  const { items } = useSelector((state) => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState(null);
  const cartRef = useRef(null);
  const dragStateRef = useRef(null);
  const suppressClickRef = useRef(false);

  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );
  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [items]
  );

  useEffect(() => {
    if (items.length > 0) {
      setCollapsed(false);
    }
  }, [totalQuantity, items.length]);

  useEffect(() => {
    if (!dragging) {
      return undefined;
    }

    const handlePointerMove = (event) => {
      const cart = cartRef.current;
      const dragState = dragStateRef.current;
      if (!cart || !dragState) {
        return;
      }

      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        dragState.moved = true;
      }

      const rect = cart.getBoundingClientRect();
      const maxX = Math.max(8, window.innerWidth - rect.width - 8);
      const maxY = Math.max(8, window.innerHeight - rect.height - 8);

      setPosition({
        x: Math.min(Math.max(8, event.clientX - dragState.offsetX), maxX),
        y: Math.min(Math.max(8, event.clientY - dragState.offsetY), maxY)
      });
    };

    const stopDragging = () => {
      if (dragStateRef.current?.moved) {
        suppressClickRef.current = true;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      }

      dragStateRef.current = null;
      setDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
    };
  }, [dragging]);

  if (
    items.length === 0 ||
    location.pathname.startsWith('/cart') ||
    location.pathname.startsWith('/checkout')
  ) {
    return null;
  }

  const handleCheckout = () => {
    navigate('/checkout');
  };

  const startDragging = (event) => {
    if (event.button !== 0) {
      return;
    }

    if (
      event.currentTarget.className !== 'floating-cart-tab' &&
      event.target.closest('button, a, input, textarea, select')
    ) {
      return;
    }

    const cart = cartRef.current;
    if (!cart) {
      return;
    }

    const rect = cart.getBoundingClientRect();
    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moved: false
    };

    setPosition({ x: rect.left, y: rect.top });
    setDragging(true);
  };

  const handleTabClick = () => {
    if (suppressClickRef.current) {
      return;
    }

    setCollapsed((current) => !current);
  };

  const floatingCartStyle = position
    ? {
        left: `${position.x}px`,
        top: `${position.y}px`,
        right: 'auto',
        bottom: 'auto'
      }
    : undefined;

  return (
    <aside
      ref={cartRef}
      className={`floating-cart${collapsed ? ' collapsed' : ''}${dragging ? ' dragging' : ''}`}
      style={floatingCartStyle}
    >
      <button
        type="button"
        className="floating-cart-tab"
        onPointerDown={startDragging}
        onClick={handleTabClick}
      >
        <span>购物车</span>
        <strong>{totalQuantity}</strong>
      </button>

      {!collapsed && (
        <div className="floating-cart-panel" onPointerDown={startDragging}>
          <div className="floating-cart-header">
            <div>
              <h3>已选商品</h3>
              <p>共 {totalQuantity} 件</p>
            </div>
            <button
              type="button"
              className="floating-cart-close"
              onClick={() => setCollapsed(true)}
              aria-label="收起购物车"
            >
              ×
            </button>
          </div>

          <div className="floating-cart-list">
            {items.map((item) => (
              <div key={item.id} className="floating-cart-item">
                <img
                  src={item.images?.[0] || fallbackImages.product}
                  alt={item.name}
                  className="floating-cart-image"
                />
                <div className="floating-cart-info">
                  <div className="floating-cart-name">{item.name}</div>
                  <div className="floating-cart-price">¥{Number(item.price).toFixed(2)}</div>
                  <div className="floating-cart-controls">
                    <button
                      type="button"
                      onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity - 1 }))}
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity + 1 }))}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="floating-cart-remove"
                      onClick={() => dispatch(removeFromCart(item.id))}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="floating-cart-footer">
            <div>
              <span>合计</span>
              <strong>¥{totalPrice.toFixed(2)}</strong>
            </div>
            <button type="button" onClick={handleCheckout}>
              去结算
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

export default FloatingCart;
