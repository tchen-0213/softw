import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { clearCart } from '../../store/cartSlice';
import { useNavigate } from 'react-router-dom';
import { fallbackImages } from '../../data/imageAssets';
import { orderApi } from '../../services/api';
import AddressManager from '../../components/user/AddressManager';
import { getStoredUser, isLoggedIn, loadUserAddresses, saveUserAddresses } from '../../utils/accountStorage';

const CheckoutPage = () => {
  const { items } = useSelector((state) => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useMemo(() => getStoredUser(), []);

  const [addresses, setAddresses] = useState(() => loadUserAddresses(user));
  const [selectedAddressId, setSelectedAddressId] = useState(() => {
    const savedAddresses = loadUserAddresses(user);
    return savedAddresses.find(address => address.isDefault)?.id || savedAddresses[0]?.id || '';
  });
  const [paymentMethod, setPaymentMethod] = useState('wechat');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  useEffect(() => {
    saveUserAddresses(addresses, user);
    if (!selectedAddressId && addresses.length > 0) {
      setSelectedAddressId(addresses.find(address => address.isDefault)?.id || addresses[0].id);
    }
    if (selectedAddressId && !addresses.some(address => address.id === selectedAddressId)) {
      setSelectedAddressId(addresses[0]?.id || '');
    }
  }, [addresses, selectedAddressId, user]);

  const handleSubmit = async () => {
    if (!isLoggedIn()) {
      setError('请先登录后再提交订单');
      return;
    }

    if (!selectedAddressId) {
      setError('请先新增并选择收货地址');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const address = addresses.find(item => item.id === selectedAddressId);
      const response = await orderApi.create({
        items: items.map(item => ({
          productId: item.id,
          quantity: item.quantity
        })),
        shippingAddress: address,
        paymentMethod
      });

      await orderApi.pay(response.data.id);
      alert('订单提交并支付成功！');
      dispatch(clearCart());
      navigate('/order');
    } catch (err) {
      setError(err.response?.data?.message || '订单提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoggedIn()) {
    return (
      <div style={{ padding: '20px 0' }}>
        <div className="container">
          <h2 style={{ marginBottom: '20px' }}>结算</h2>
          <div className="shop-empty-panel">
            <h3>请先登录后再结算</h3>
            <button className="button button-primary" onClick={() => navigate('/login')}>
              去登录
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        {error && <div style={{ color: '#ff4d4f', marginBottom: '16px' }}>{error}</div>}
        
        <div style={{ marginBottom: '30px' }}>
          <AddressManager
            addresses={addresses}
            onChange={setAddresses}
            selectedAddressId={selectedAddressId}
            onSelect={setSelectedAddressId}
            selectable
          />
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
                  src={item.images?.[0] || fallbackImages.product}
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
            disabled={submitting}
            style={{
              padding: '12px 30px',
              background: '#ff4d4f',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
          >
            {submitting ? '提交中...' : '提交订单'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
