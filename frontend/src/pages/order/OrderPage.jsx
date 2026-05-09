import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const OrderPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // 模拟获取订单数据
    setTimeout(() => {
      setOrders([
        {
          id: '1',
          createTime: '2026-04-01 12:00:00',
          status: 1, // 待付款
          totalPrice: 199.99,
          items: [
            {
              id: '1',
              name: '全新 iPhone 15 Pro',
              price: 199.99,
              quantity: 1,
              image: 'https://via.placeholder.com/80x80?text=iPhone'
            }
          ]
        },
        {
          id: '2',
          createTime: '2026-03-28 15:30:00',
          status: 2, // 待发货
          totalPrice: 599.99,
          items: [
            {
              id: '2',
              name: 'MacBook Pro 2026',
              price: 599.99,
              quantity: 1,
              image: 'https://via.placeholder.com/80x80?text=MacBook'
            }
          ]
        },
        {
          id: '3',
          createTime: '2026-03-20 10:00:00',
          status: 3, // 待收货
          totalPrice: 99.99,
          items: [
            {
              id: '3',
              name: 'AirPods Pro 2',
              price: 99.99,
              quantity: 1,
              image: 'https://via.placeholder.com/80x80?text=AirPods'
            }
          ]
        },
        {
          id: '4',
          createTime: '2026-03-15 09:00:00',
          status: 4, // 已完成
          totalPrice: 149.99,
          items: [
            {
              id: '4',
              name: '二手 iPad Pro',
              price: 149.99,
              quantity: 1,
              image: 'https://via.placeholder.com/80x80?text=iPad'
            }
          ]
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusText = (status) => {
    const statusMap = {
      1: '待付款',
      2: '待发货',
      3: '待收货',
      4: '已完成',
      5: '已取消'
    };
    return statusMap[status] || '未知状态';
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div style={{ padding: '20px 0' }}>
      <div className="container">
        <h2 style={{ marginBottom: '20px' }}>我的订单</h2>
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
                        src={item.image}
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
                <div style={{ padding: '16px', borderTop: '1px solid #e8e8e8', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  {order.status === 1 && (
                    <>
                      <button
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
                  {order.status === 3 && (
                    <button
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
                  )}
                  {order.status === 4 && (
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