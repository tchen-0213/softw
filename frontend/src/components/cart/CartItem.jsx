import React from 'react';
import { useDispatch } from 'react-redux';
import { removeFromCart, updateQuantity } from '../../store/cartSlice';
import { fallbackImages } from '../../data/imageAssets';

const CartItem = ({ item }) => {
  const dispatch = useDispatch();
  const stock = Number(item.stock);
  const hasStockLimit = Number.isFinite(stock);
  const isAtStockLimit = hasStockLimit && item.quantity >= stock;

  const handleRemove = () => {
    dispatch(removeFromCart(item.id));
  };

  const handleQuantityChange = (e) => {
    const newQuantity = parseInt(e.target.value);
    dispatch(updateQuantity({ id: item.id, quantity: newQuantity }));
  };

  return (
    <div className="cart-item">
      <img
        src={item.images?.[0] || fallbackImages.product}
        alt={item.name}
        className="cart-item-thumb"
      />
      <div className="cart-item-body">
        <div className="cart-item-name">{item.name}</div>
        <div className="cart-item-sub">卖家: {item.seller?.nickname || '未知卖家'}</div>
        <div className="cart-item-sub">库存: {hasStockLimit ? item.stock : '充足'}</div>
        <div className="cart-item-row">
          <div className="cart-item-price">¥{item.price}</div>
          <div className="qty-control">
            <button
              type="button"
              onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity - 1 }))}
            >
              -
            </button>
            <input
              type="number"
              value={item.quantity}
              onChange={handleQuantityChange}
              min="1"
              max={hasStockLimit ? item.stock : undefined}
            />
            <button
              type="button"
              onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity + 1 }))}
              disabled={isAtStockLimit}
            >
              +
            </button>
            <button type="button" className="cart-item-remove" onClick={handleRemove}>
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
