import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const UserPage = () => {
  const [user, setUser] = useState({
    id: '1',
    nickname: '张三',
    avatar: 'https://via.placeholder.com/100x100?text=Avatar',
    email: 'zhangsan@example.com',
    phone: '13800138000',
    creditLevel: '钻石会员',
    creditScore: 95
  });

  const [orders, setOrders] = useState([
    {
      id: '1',
      createTime: '2026-04-01 12:00:00',
      status: 3, // 待收货
      totalPrice: 199.99,
      logistics: {
        company: '顺丰速运',
        trackingNumber: 'SF1234567890',
        status: '运输中',
        steps: [
          {
            time: '2026-04-02 10:00:00',
            description: '快件已从北京发货'
          },
          {
            time: '2026-04-02 14:00:00',
            description: '快件已到达上海中转站'
          },
          {
            time: '2026-04-03 08:00:00',
            description: '快件已到达杭州中转站'
          }
        ]
      }
    },
    {
      id: '2',
      createTime: '2026-03-28 15:30:00',
      status: 2, // 待发货
      totalPrice: 599.99,
      logistics: null
    }
  ]);

  const [activeTab, setActiveTab] = useState('profile');
  const navigate = useNavigate();

  const handleEditProfile = () => {
    // 编辑个人信息
    alert('编辑个人信息功能待实现');
  };

  const handleViewOrder = (id) => {
    // 查看订单详情
    alert(`查看订单 ${id} 详情功能待实现`);
  };

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

  return (
    <div style={{ padding: '20px 0' }}>
      <div className="container">
        <h2 style={{ marginBottom: '20px' }}>个人中心</h2>
        
        <div style={{ display: 'flex', marginBottom: '30px' }}>
          <div style={{ width: '200px', marginRight: '30px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <img
                src={user.avatar}
                alt={user.nickname}
                style={{ width: '100px', height: '100px', borderRadius: '50%', marginBottom: '12px' }}
              />
              <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>{user.nickname}</div>
              <div style={{ color: '#ffd700', marginBottom: '8px' }}>{user.creditLevel}</div>
              <div style={{ fontSize: '14px', color: '#666' }}>信用分: {user.creditScore}</div>
            </div>
            <div style={{ border: '1px solid #e8e8e8', borderRadius: '4px' }}>
              <div
                className={activeTab === 'profile' ? 'active' : ''}
                onClick={() => setActiveTab('profile')}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #e8e8e8',
                  cursor: 'pointer',
                  background: activeTab === 'profile' ? '#f5f5f5' : '#fff'
                }}
              >
                个人信息
              </div>
              <div
                className={activeTab === 'orders' ? 'active' : ''}
                onClick={() => setActiveTab('orders')}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #e8e8e8',
                  cursor: 'pointer',
                  background: activeTab === 'orders' ? '#f5f5f5' : '#fff'
                }}
              >
                我的订单
              </div>
              <div
                className={activeTab === 'logistics' ? 'active' : ''}
                onClick={() => setActiveTab('logistics')}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #e8e8e8',
                  cursor: 'pointer',
                  background: activeTab === 'logistics' ? '#f5f5f5' : '#fff'
                }}
              >
                物流跟踪
              </div>
              <div
                className={activeTab === 'shop' ? 'active' : ''}
                onClick={() => setActiveTab('shop')}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  background: activeTab === 'shop' ? '#f5f5f5' : '#fff'
                }}
              >
                店铺管理
              </div>
            </div>
          </div>
          <div style={{ flex: 1, border: '1px solid #e8e8e8', borderRadius: '4px', padding: '20px' }}>
            {activeTab === 'profile' && (
              <div>
                <h3 style={{ marginBottom: '20px' }}>个人信息</h3>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>昵称</div>
                  <div style={{ padding: '8px', border: '1px solid #e8e8e8', borderRadius: '4px' }}>{user.nickname}</div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>邮箱</div>
                  <div style={{ padding: '8px', border: '1px solid #e8e8e8', borderRadius: '4px' }}>{user.email}</div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>手机号</div>
                  <div style={{ padding: '8px', border: '1px solid #e8e8e8', borderRadius: '4px' }}>{user.phone}</div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>信用等级</div>
                  <div style={{ padding: '8px', border: '1px solid #e8e8e8', borderRadius: '4px', color: '#ffd700' }}>{user.creditLevel}</div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>信用分</div>
                  <div style={{ padding: '8px', border: '1px solid #e8e8e8', borderRadius: '4px' }}>{user.creditScore}</div>
                </div>
                <button
                  onClick={handleEditProfile}
                  style={{
                    padding: '8px 16px',
                    background: '#1890ff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  编辑个人信息
                </button>
              </div>
            )}
            {activeTab === 'orders' && (
              <div>
                <h3 style={{ marginBottom: '20px' }}>我的订单</h3>
                {orders.map((order) => (
                  <div key={order.id} style={{ borderBottom: '1px solid #e8e8e8', padding: '16px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div>订单号: {order.id}</div>
                      <div style={{ color: '#ff4d4f' }}>{getStatusText(order.status)}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div>下单时间: {order.createTime}</div>
                      <div style={{ fontWeight: 'bold' }}>总计: ¥{order.totalPrice.toFixed(2)}</div>
                    </div>
                    <button
                      onClick={() => handleViewOrder(order.id)}
                      style={{
                        padding: '4px 8px',
                        background: '#1890ff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      查看详情
                    </button>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'logistics' && (
              <div>
                <h3 style={{ marginBottom: '20px' }}>物流跟踪</h3>
                {orders.filter(order => order.logistics).map((order) => (
                  <div key={order.id} style={{ borderBottom: '1px solid #e8e8e8', padding: '16px 0' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>订单号: {order.id}</div>
                      <div>物流公司: {order.logistics.company}</div>
                      <div>物流单号: {order.logistics.trackingNumber}</div>
                      <div style={{ color: '#1890ff', marginBottom: '12px' }}>物流状态: {order.logistics.status}</div>
                    </div>
                    <div style={{ position: 'relative', paddingLeft: '20px' }}>
                      {order.logistics.steps.map((step, index) => (
                        <div key={index} style={{ marginBottom: '16px', position: 'relative' }}>
                          <div style={{
                            position: 'absolute',
                            left: '-20px',
                            top: '0',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: index === 0 ? '#1890ff' : '#ddd'
                          }}></div>
                          {index < order.logistics.steps.length - 1 && (
                            <div style={{
                              position: 'absolute',
                              left: '-15px',
                              top: '10px',
                              width: '1px',
                              height: '32px',
                              background: '#ddd'
                            }}></div>
                          )}
                          <div style={{ fontWeight: index === 0 ? 'bold' : 'normal' }}>{step.description}</div>
                          <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>{step.time}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'shop' && (
              <div>
                <h3 style={{ marginBottom: '20px' }}>店铺管理</h3>
                <button
                  onClick={() => navigate('/shop')}
                  style={{
                    padding: '10px 20px',
                    background: '#1890ff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  进入店铺管理
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPage;