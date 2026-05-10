import React from 'react';
import { useDispatch } from 'react-redux';
import { removeFromCart, updateQuantity } from '../../store/cartSlice';
import { fallbackImages } from '../../data/imageAssets';

const CartItem = ({ item }) => {
  const dispatch = useDispatch();

  const handleRemove = () => {
    dispatch(removeFromCart(item.id));
  };

  const handleQuantityChange = (e) => {
    const newQuantity = parseInt(e.target.value);
    dispatch(updateQuantity({ id: item.id, quantity: newQuantity }));
  };

  return (
    <div style={{ display: 'flex', padding: '16px', borderBottom: '1px solid #e8e8e8', alignItems: 'center' }}>
      <img
        src={item.images?.[0] || fallbackImages.product}
        alt={item.name}
        style={{ width: '100px', height: '100px', objectFit: 'cover', marginRight: '16px' }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '16px', marginBottom: '8px' }}>{item.name}</div>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
          卖家: {item.seller?.nickname || '未知卖家'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff4d4f' }}>
            ¥{item.price}
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity - 1 }))}
              style={{
                width: '32px',
                height: '32px',
                border: '1px solid #d9d9d9',
                background: '#fff',
                cursor: 'pointer'
              }}
            >
              -
            </button>
            <input
              type="number"
              value={item.quantity}
              onChange={handleQuantityChange}
              style={{
                width: '60px',
                height: '32px',
                border: '1px solid #d9d9d9',
                textAlign: 'center',
                outline: 'none'
              }}
              min="1"
            />
            <button
              onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity + 1 }))}
              style={{
                width: '32px',
                height: '32px',
                border: '1px solid #d9d9d9',
                background: '#fff',
                cursor: 'pointer'
              }}
            >
              +
            </button>
            <button
              onClick={handleRemove}
              style={{
                marginLeft: '16px',
                color: '#666',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
