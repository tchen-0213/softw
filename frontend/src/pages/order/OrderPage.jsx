import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fallbackImages } from '../../data/imageAssets';
import { orderApi } from '../../services/api';
import { isLoggedIn } from '../../utils/accountStorage';

const normalizeOrder = (order) => ({
  ...order,
  createTime: order.createTime || new Date(order.createdAt).toLocaleString(),
  totalPrice: Number(order.totalPrice ?? order.totalAmount ?? 0),
  items: (order.items || []).map(item => ({
    ...item,
    id: item.id || item.productId
  }))
});

const OrderPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadOrders = async () => {
      if (!isLoggedIn()) {
        setOrders([]);
        setLoading(false);
        return;
      }

      try {
        const response = await orderApi.getList();
        const result = response.data.orders || [];
        setOrders(result.map(normalizeOrder));
      } catch (err) {
        setError(err.response?.data?.message || '订单加载失败，请稍后重试');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  const refreshOrder = (updatedOrder) => {
    setOrders(prev => prev.map(order => (
      Number(order.id) === Number(updatedOrder.id) ? normalizeOrder(updatedOrder) : order
    )));
  };

  const handleCancel = async (id) => {
    try {
      const response = await orderApi.cancel(id);
      refreshOrder(response.data);
    } catch (err) {
      alert(err.response?.data?.message || '取消订单失败');
    }
  };

  const handlePay = async (id) => {
    try {
      const response = await orderApi.pay(id);
      refreshOrder(response.data);
    } catch (err) {
      alert(err.response?.data?.message || '支付失败');
    }
  };

  const handleConfirm = async (id) => {
    try {
      const response = await orderApi.confirm(id);
      refreshOrder(response.data);
    } catch (err) {
      alert(err.response?.data?.message || '确认收货失败');
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      1: '待付款',
      2: '待发货',
      3: '待收货',
      4: '已完成',
      5: '已取消'
    };
    return statusMap[status] || status || '未知状态';
  };

  const isCompletedOrder = (status) => status === 4 || status === '已完成';

  const handleEvaluateOrder = (order, productId) => {
    if (!isCompletedOrder(order.status)) {
      alert('订单完成后才能评价，请先确认收货。');
      return;
    }

    const search = productId ? `?productId=${productId}` : '';
    navigate(`/evaluation/${order.id}${search}`);
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (!isLoggedIn()) {
    return (
      <div className="biz-page">
        <div className="container">
          <h2 className="page-title">我的订单</h2>
          <div className="shop-empty-panel">
            <h3>请先登录后查看订单</h3>
            <button className="button button-primary" onClick={() => navigate('/login')}>
              去登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="biz-page">
      <div className="container">
        <h2 className="page-title">我的订单</h2>
        {error && <div className="biz-error">{error}</div>}
        {orders.length === 0 ? (
          <div className="biz-empty">
            <p>暂无订单</p>
            <button className="button button-primary" onClick={() => navigate('/')}>
              去购物
            </button>
          </div>
        ) : (
          <div>
            {orders.map((order) => (
              <div key={order.id} className="biz-card order-card">
                <div className="order-card-head">
                  <div>订单号: {order.id}</div>
                  <div className="order-status">{getStatusText(order.status)}</div>
                </div>
                <div>
                  {order.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="biz-line-item biz-line-item-btn"
                      onClick={() => handleEvaluateOrder(order, item.productId)}
                      title={isCompletedOrder(order.status) ? '评价该商品' : '确认收货后可评价'}
                    >
                      <img
                        src={item.image || fallbackImages.product}
                        alt={item.name}
                        className="biz-thumb"
                      />
                      <div className="biz-line-body">
                        <div className="biz-line-name">{item.name}</div>
                        <div className="biz-line-meta">
                          <div>¥{item.price}</div>
                          <div>x{item.quantity}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="order-card-foot">
                  <div>下单时间: {order.createTime}</div>
                  <div className="order-total">总计: ¥{order.totalPrice.toFixed(2)}</div>
                </div>
                {order.logistics && (
                  <div className="order-card-logistics order-logistics">
                    <div>
                      物流：{order.logistics.company || '商家配送'} {order.logistics.trackingNumber || ''}
                      <span className="order-logistics-status">{order.logistics.status || '运输中'}</span>
                    </div>
                    {(order.logistics.steps || []).slice(0, 3).map((step, index) => (
                      <div key={index} className="order-logistics-step">
                        {step.time} - {step.description}
                      </div>
                    ))}
                  </div>
                )}
                <div className="order-card-actions">
                  {(order.status === 1 || order.status === '待付款') && (
                    <>
                      <button
                        className="button button-secondary button-sm"
                        onClick={() => handleCancel(order.id)}
                      >
                        取消订单
                      </button>
                      <button
                        className="button button-danger button-sm"
                        onClick={() => handlePay(order.id)}
                      >
                        立即支付
                      </button>
                    </>
                  )}
                  {(order.status === 3 || order.status === '待收货') && (
                    <button
                      className="button button-primary button-sm"
                      onClick={() => handleConfirm(order.id)}
                    >
                      确认收货
                    </button>
                  )}
                  {(order.status === 4 || order.status === '已完成') && (
                    <button
                      className="button button-primary button-sm"
                      onClick={() => navigate(`/evaluation/${order.id}`)}
                    >
                      评价
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderPage;
