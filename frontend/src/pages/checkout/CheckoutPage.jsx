import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { clearCart } from '../../store/cartSlice';
import { useLocation, useNavigate } from 'react-router-dom';
import { fallbackImages } from '../../data/imageAssets';
import { addressApi, orderApi } from '../../services/api';
import AddressManager from '../../components/user/AddressManager';
import { getStoredUser, isLoggedIn, loadUserAddresses, saveUserAddresses } from '../../utils/accountStorage';

const CheckoutPage = () => {
  const { items } = useSelector((state) => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useMemo(() => getStoredUser(), []);
  const bargainPurchase = location.state?.bargainPurchase;
  const checkoutItems = bargainPurchase ? [bargainPurchase] : items;

  const [addresses, setAddresses] = useState(() => loadUserAddresses(user));
  const [selectedAddressId, setSelectedAddressId] = useState(() => {
    const savedAddresses = loadUserAddresses(user);
    return savedAddresses.find(address => address.isDefault)?.id || savedAddresses[0]?.id || '';
  });
  const [paymentMethod, setPaymentMethod] = useState('wechat');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const totalPrice = checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  useEffect(() => {
    saveUserAddresses(addresses, user);
    if (!selectedAddressId && addresses.length > 0) {
      setSelectedAddressId(addresses.find(address => address.isDefault)?.id || addresses[0].id);
    }
    if (selectedAddressId && !addresses.some(address => address.id === selectedAddressId)) {
      setSelectedAddressId(addresses[0]?.id || '');
    }
  }, [addresses, selectedAddressId, user]);

  useEffect(() => {
    if (!isLoggedIn()) {
      return;
    }

    addressApi.getList()
      .then((response) => {
        const nextAddresses = response.data || [];
        setAddresses(nextAddresses);
        setSelectedAddressId(nextAddresses.find(address => address.isDefault)?.id || nextAddresses[0]?.id || '');
      })
      .catch(() => {});
  }, []);

  const handleAddressesChange = async (nextAddresses) => {
    setAddresses(nextAddresses);
    saveUserAddresses(nextAddresses, user);

    try {
      const response = await addressApi.replaceAll(nextAddresses);
      const savedAddresses = response.data || nextAddresses;
      setAddresses(savedAddresses);
      setError('');
      if (selectedAddressId && !savedAddresses.some(address => address.id === selectedAddressId)) {
        setSelectedAddressId(savedAddresses[0]?.id || '');
      }
    } catch {
      setError('地址已临时保存到本地，连接后端后会再次同步');
    }
  };

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
      await orderApi.create({
        items: checkoutItems.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          ...(item.bargainMessageId ? { bargainMessageId: item.bargainMessageId } : {})
        })),
        shippingAddress: address,
        paymentMethod
      });

      alert('订单提交成功，请在订单页完成支付。');
      if (!bargainPurchase) {
        dispatch(clearCart());
      }
      navigate('/order');
    } catch (err) {
      setError(err.response?.data?.message || '订单提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoggedIn()) {
    return (
      <div className="biz-page">
        <div className="container">
          <h2 className="page-title">结算</h2>
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

  if (checkoutItems.length === 0) {
    return (
      <div className="biz-page">
        <div className="container">
          <div className="biz-empty">
            <p>购物车为空，无法结算</p>
            <button className="button button-primary" onClick={() => navigate('/')}>
              去购物
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="biz-page">
      <div className="container">
        <h2 className="page-title">结算</h2>
        {error && <div className="biz-error">{error}</div>}

        <div className="biz-section">
          <AddressManager
            addresses={addresses}
            onChange={handleAddressesChange}
            selectedAddressId={selectedAddressId}
            onSelect={setSelectedAddressId}
            selectable
          />
        </div>

        <div className="biz-section">
          <h3 className="biz-section-title">订单商品</h3>
          <div className="biz-card">
            {checkoutItems.map((item) => (
              <div
                key={item.bargainMessageId ? `bargain-${item.bargainMessageId}` : item.id}
                className="biz-line-item"
              >
                <img
                  src={item.images?.[0] || fallbackImages.product}
                  alt={item.name}
                  className="biz-thumb"
                />
                <div className="biz-line-body">
                  <div className="biz-line-name">{item.name}</div>
                  <div className="biz-line-meta">
                    <div>
                      ¥{Number(item.price).toFixed(2)}
                      {item.bargainMessageId && (
                        <span className="biz-tag-ok">议价成交价</span>
                      )}
                    </div>
                    <div>x{item.quantity}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="biz-section">
          <h3 className="biz-section-title">支付方式</h3>
          <div className="biz-card biz-card-pad">
            <div className="biz-radio-list">
              <label className="biz-radio">
                <input
                  type="radio"
                  name="payment"
                  value="wechat"
                  checked={paymentMethod === 'wechat'}
                  onChange={() => setPaymentMethod('wechat')}
                />
                <span>微信支付</span>
              </label>
              <label className="biz-radio">
                <input
                  type="radio"
                  name="payment"
                  value="alipay"
                  checked={paymentMethod === 'alipay'}
                  onChange={() => setPaymentMethod('alipay')}
                />
                <span>支付宝</span>
              </label>
              <label className="biz-radio">
                <input
                  type="radio"
                  name="payment"
                  value="creditcard"
                  checked={paymentMethod === 'creditcard'}
                  onChange={() => setPaymentMethod('creditcard')}
                />
                <span>信用卡</span>
              </label>
            </div>
          </div>
        </div>

        <div className="biz-checkout-footer">
          <div className="biz-checkout-totals">
            <div>
              <span>商品总价: </span>
              <span>¥{totalPrice.toFixed(2)}</span>
            </div>
            <div>
              <span>运费: </span>
              <span>¥0.00</span>
            </div>
            <div className="biz-checkout-pay">
              <span>实付金额: </span>
              <span>¥{totalPrice.toFixed(2)}</span>
            </div>
          </div>
          <button
            className="button button-danger"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? '提交中...' : '提交订单'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
