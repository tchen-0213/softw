import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { clearCart } from '../../store/cartSlice';
import { useNavigate } from 'react-router-dom';

const CheckoutPage = () => {
  const { items } = useSelector((state) => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [selectedAddress, setSelectedAddress] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState('wechat');

  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const addresses = [
    {
      id: '1',
      name: '张三',
      phone: '13800138000',
      address: '北京市朝阳区某某街道某某小区1号楼1单元101室'
    },
    {
      id: '2',
      name: '李四',
      phone: '13900139000',
      address: '上海市浦东新区某某街道某某小区2号楼2单元202室'
    }
  ];

  const handleSubmit = () => {
    // 模拟提交订单
    alert('订单提交成功！');
    dispatch(clearCart());
    navigate('/order');
  };

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <p>购物车为空，无法结算</p>
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
    );
  }

  return (
    <div style={{ padding: '20px 0' }}>
      <div className="container">
        <h2 style={{ marginBottom: '20px' }}>结算</h2>
        
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '15px' }}>收货地址</h3>
          <div style={{ border: '1px solid #e8e8e8', borderRadius: '4px' }}>
            {addresses.map((address) => (
              <div
                key={address.id}
                style={{
                  padding: '16px',
                  borderBottom: '1px solid #e8e8e8',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <input
                  type="radio"
                  name="address"
                  value={address.id}
                  checked={selectedAddress === address.id}
                  onChange={() => setSelectedAddress(address.id)}
                  style={{ marginRight: '16px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    {address.name} {address.phone}
                  </div>
                  <div>{address.address}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '15px' }}>订单商品</h3>
          <div style={{ border: '1px solid #e8e8e8', borderRadius: '4px' }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{ display: 'flex', padding: '16px', borderBottom: '1px solid #e8e8e8' }}
              >
                <img
                  src={item.images?.[0] || 'https://via.placeholder.com/80x80?text=No+Image'}
                  alt={item.name}
                  style={{ width: '80px', height: '80px', objectFit: 'cover', marginRight: '16px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: '8px' }}>{item.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>¥{item.price}</div>
                    <div>x{item.quantity}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '15px' }}>支付方式</h3>
          <div style={{ border: '1px solid #e8e8e8', borderRadius: '4px', padding: '16px' }}>
            <div style={{ marginBottom: '12px' }}>
              <input
                type="radio"
                name="payment"
                value="wechat"
                checked={paymentMethod === 'wechat'}
                onChange={() => setPaymentMethod('wechat')}
                style={{ marginRight: '8px' }}
              />
              <span>微信支付</span>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <input
                type="radio"
                name="payment"
                value="alipay"
                checked={paymentMethod === 'alipay'}
                onChange={() => setPaymentMethod('alipay')}
                style={{ marginRight: '8px' }}
              />
              <span>支付宝</span>
            </div>
            <div>
              <input
                type="radio"
                name="payment"
                value="creditcard"
                checked={paymentMethod === 'creditcard'}
                onChange={() => setPaymentMethod('creditcard')}
                style={{ marginRight: '8px' }}
              />
              <span>信用卡</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <div style={{ marginRight: '30px' }}>
            <div style={{ marginBottom: '8px' }}>
              <span>商品总价: </span>
              <span>¥{totalPrice.toFixed(2)}</span>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <span>运费: </span>
              <span>¥0.00</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff4d4f' }}>
              <span>实付金额: </span>
              <span>¥{totalPrice.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            style={{
              padding: '12px 30px',
              background: '#ff4d4f',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            提交订单
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;