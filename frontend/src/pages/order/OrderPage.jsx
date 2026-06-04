import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fallbackImages, productImages } from '../../data/imageAssets';
import { orderApi } from '../../services/api';
import { isLoggedIn } from '../../utils/accountStorage';

const mockOrders = [
  {
    id: '1',
    createTime: '2026-04-01 12:00:00',
    status: '待付款',
    totalPrice: 199.99,
    items: [
      {
        id: '1',
        name: '全新 iPhone 15 Pro',
        price: 199.99,
        quantity: 1,
        image: productImages.iphone
      }
    ]
  },
  {
    id: '2',
    createTime: '2026-03-28 15:30:00',
    status: '待发货',
    totalPrice: 599.99,
    items: [
      {
        id: '2',
        name: 'MacBook Pro 2026',
        price: 599.99,
        quantity: 1,
        image: productImages.macbook
      }
    ]
  }
];

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

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (!isLoggedIn()) {
    return (
      <div style={{ padding: '20px 0' }}>
        <div className="container">
          <h2 style={{ marginBottom: '20px' }}>我的订单</h2>
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
    <div style={{ padding: '20px 0' }}>
      <div className="container">
        <h2 style={{ marginBottom: '20px' }}>我的订单</h2>
        {error && <div style={{ color: '#ff4d4f', marginBottom: '16px' }}>{error}</div>}
        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <p>暂无订单</p>
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
            {orders.map((order) => (
              <div key={order.id} style={{ border: '1px solid #e8e8e8', borderRadius: '4px', marginBottom: '20px' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #e8e8e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>订单号: {order.id}</div>
                  <div style={{ color: '#ff4d4f' }}>{getStatusText(order.status)}</div>
                </div>
                <div style={{ padding: '16px' }}>
                  {order.items.map((item) => (
                    <div key={item.id} style={{ display: 'flex', marginBottom: '16px', alignItems: 'center' }}>
                      <img
                        src={item.image || fallbackImages.product}
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
                <div style={{ padding: '16px', borderTop: '1px solid #e8e8e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>下单时间: {order.createTime}</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>总计: ¥{order.totalPrice.toFixed(2)}</div>
                </div>
                {order.logistics && (
                  <div style={{ padding: '16px', borderTop: '1px solid #e8e8e8', color: '#666' }}>
                    <div style={{ marginBottom: '8px' }}>
                      物流：{order.logistics.company || '商家配送'} {order.logistics.trackingNumber || ''}
                      <span style={{ marginLeft: '12px', color: '#1890ff' }}>{order.logistics.status || '运输中'}</span>
                    </div>
                    {(order.logistics.steps || []).slice(0, 3).map((step, index) => (
                      <div key={index} style={{ fontSize: '14px', marginTop: '4px' }}>
                        {step.time} - {step.description}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ padding: '16px', borderTop: '1px solid #e8e8e8', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  {(order.status === 1 || order.status === '待付款') && (
                    <>
                      <button
                        onClick={() => handleCancel(order.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#fff',
                          color: '#666',
                          border: '1px solid #d9d9d9',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        取消订单
                      </button>
                      <button
                        onClick={() => handlePay(order.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#ff4d4f',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        立即支付
                      </button>
                    </>
                  )}
                  {order.status === 3 || order.status === '待收货' ? (
                    <button
                      onClick={() => handleConfirm(order.id)}
                      style={{
                        padding: '6px 12px',
                        background: '#1890ff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      确认收货
                    </button>
                  ) : null}
                  {order.status === 4 || order.status === '已完成' ? (
                    <button
                      onClick={() => navigate(`/evaluation/${order.id}`)}
                      style={{
                        padding: '6px 12px',
                        background: '#1890ff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      评价
                    </button>
                  ) : null}
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
