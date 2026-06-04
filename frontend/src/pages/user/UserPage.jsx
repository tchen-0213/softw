import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddressManager from '../../components/user/AddressManager';
import { avatarImages, productImages } from '../../data/imageAssets';
import { addressApi, orderApi, userApi } from '../../services/api';
import {
  getStoredUser,
  getUserKey,
  getUserStorageKey,
  isLoggedIn,
  loadUserAddresses,
  saveUserAddresses
} from '../../utils/accountStorage';

const createDefaultUser = (authUser) => ({
  id: getUserKey(authUser) || '',
  nickname: authUser?.nickname || authUser?.username || '',
  avatar: authUser?.avatar || avatarImages.userDefault,
  email: authUser?.email || '',
  phone: authUser?.phone || '',
  creditLevel: authUser?.creditLevel || '普通',
  creditScore: authUser?.creditScore ?? 100
});

const defaultOrders = [
  {
    id: '1',
    createTime: '2026-04-01 12:00:00',
    status: 3,
    totalPrice: 199.99,
    address: '北京市朝阳区某某街道某某小区1号楼1单元101室',
    paymentMethod: '微信支付',
    items: [
      {
        id: 'p1',
        name: '全新 iPhone 15 Pro',
        price: 199.99,
        quantity: 1,
        image: productImages.iphone
      }
    ],
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
    status: 2,
    totalPrice: 599.99,
    address: '上海市浦东新区某某街道某某小区2号楼2单元202室',
    paymentMethod: '支付宝',
    items: [
      {
        id: 'p2',
        name: 'MacBook Pro 2026',
        price: 599.99,
        quantity: 1,
        image: productImages.macbook
      }
    ],
    logistics: null
  }
];

const normalizeOrder = (order) => ({
  ...order,
  createTime: order.createTime || new Date(order.createdAt).toLocaleString(),
  totalPrice: Number(order.totalPrice ?? order.totalAmount ?? 0),
  address: order.address || order.shippingAddress?.address || '',
  paymentMethod: order.paymentMethod || '未选择',
  logistics: order.logistics || order.logisticsInfo,
  items: (order.items || []).map(item => ({
    ...item,
    id: item.id || item.productId,
    image: item.image || productImages.iphone
  }))
});

const loadUser = (authUser) => {
  if (!authUser) {
    return null;
  }

  try {
    const storageKey = getUserStorageKey('profile', authUser);
    const savedProfile = storageKey ? JSON.parse(localStorage.getItem(storageKey) || 'null') : null;
    return {
      ...createDefaultUser(authUser),
      ...(savedProfile || {}),
      id: getUserKey(authUser) || savedProfile?.id || '',
      nickname: savedProfile?.nickname || authUser.nickname || authUser.username || '',
      email: savedProfile?.email || authUser.email || '',
      phone: savedProfile?.phone || authUser.phone || ''
    };
  } catch {
    return createDefaultUser(authUser);
  }
};

const UserPage = () => {
  const [authUser] = useState(getStoredUser);
  const [user, setUser] = useState(() => loadUser(getStoredUser()));
  const [addresses, setAddresses] = useState(() => loadUserAddresses(getStoredUser()));
  const [orders, setOrders] = useState(defaultOrders.map(normalizeOrder));
  const [activeTab, setActiveTab] = useState('profile');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState(() => loadUser(getStoredUser()) || createDefaultUser(getStoredUser()));
  const [selectedOrder, setSelectedOrder] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (authUser && user) {
      const storageKey = getUserStorageKey('profile', authUser);
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(user));
      }
    }
  }, [authUser, user]);

  useEffect(() => {
    saveUserAddresses(addresses, authUser);
  }, [addresses, authUser]);

  useEffect(() => {
    if (!isLoggedIn()) {
      return;
    }

    userApi.getProfile()
      .then((response) => {
        const profile = response.data || {};
        setUser(prev => ({
          ...(prev || createDefaultUser(authUser)),
          nickname: prev?.nickname || profile.nickname || profile.username || '',
          avatar: prev?.avatar || profile.avatar || avatarImages.userDefault,
          email: prev?.email || profile.email || '',
          phone: prev?.phone || profile.phone || '',
          creditLevel: profile.creditLevel || prev?.creditLevel || '普通',
          creditScore: profile.creditScore ?? prev?.creditScore ?? 100
        }));
      })
      .catch(() => {});

    addressApi.getList()
      .then((response) => {
        setAddresses(response.data || []);
      })
      .catch(() => {});

    orderApi.getList()
      .then((response) => {
        const result = response.data.orders || [];
        setOrders(result.map(normalizeOrder));
      })
      .catch(() => {});
  }, [authUser]);

  const handleEditProfile = () => {
    setProfileForm(user);
    setEditingProfile(true);
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const response = await userApi.updateProfile({
        nickname: profileForm.nickname,
        avatar: profileForm.avatar || avatarImages.userDefault,
        email: profileForm.email,
        phone: profileForm.phone
      });
      const nextUser = {
        ...user,
        ...(response.data || {}),
        avatar: response.data?.avatar || avatarImages.userDefault
      };
      setUser(prev => ({
        ...prev,
        ...nextUser
      }));
      localStorage.setItem('user', JSON.stringify({
        ...(authUser || {}),
        username: authUser?.username,
        nickname: nextUser.nickname,
        email: nextUser.email,
        phone: nextUser.phone,
        avatar: nextUser.avatar,
        creditLevel: nextUser.creditLevel,
        creditScore: nextUser.creditScore,
        role: nextUser.role
      }));
      setEditingProfile(false);
    } catch (err) {
      alert(err.response?.data?.message || '个人信息保存失败');
    }
  };

  const handleAddressesChange = async (nextAddresses) => {
    setAddresses(nextAddresses);
    saveUserAddresses(nextAddresses, authUser);

    try {
      const response = await addressApi.replaceAll(nextAddresses);
      setAddresses(response.data || nextAddresses);
    } catch {
      // 后端不可用时仍保留本地地址，方便课堂演示不中断。
    }
  };

  const handleViewOrder = (id) => {
    setSelectedOrder(orders.find(order => order.id === id));
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

  const renderOrderDetail = () => {
    if (!selectedOrder) {
      return null;
    }

    return (
      <div style={{ marginTop: '20px', border: '1px solid #e8e8e8', borderRadius: '4px', padding: '16px', background: '#fafafa' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4>订单详情 #{selectedOrder.id}</h4>
          <button
            onClick={() => setSelectedOrder(null)}
            style={{ border: 'none', background: 'transparent', color: '#666', cursor: 'pointer' }}
          >
            关闭
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div>状态：{getStatusText(selectedOrder.status)}</div>
          <div>支付方式：{selectedOrder.paymentMethod}</div>
          <div>下单时间：{selectedOrder.createTime}</div>
          <div>收货地址：{selectedOrder.address}</div>
        </div>
        <div>
          {selectedOrder.items.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <img
                src={item.image}
                alt={item.name}
                style={{ width: '64px', height: '64px', objectFit: 'cover', marginRight: '12px' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>{item.name}</div>
                <div style={{ color: '#666' }}>¥{Number(item.price).toFixed(2)} x {item.quantity}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'right', fontWeight: 'bold', color: '#ff4d4f' }}>
          合计：¥{selectedOrder.totalPrice.toFixed(2)}
        </div>
      </div>
    );
  };

  if (!isLoggedIn() || !user) {
    return (
      <div style={{ padding: '20px 0' }}>
        <div className="container">
          <h2 style={{ marginBottom: '20px' }}>个人中心</h2>
          <div className="shop-empty-panel">
            <h3>请先登录后查看个人中心</h3>
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
              {[
                ['profile', '个人信息'],
                ['addresses', '收货地址'],
                ['orders', '我的订单'],
                ['logistics', '物流跟踪'],
                ['shop', '店铺管理']
              ].map(([key, label], index) => (
                <div
                  key={key}
                  onClick={() => setActiveTab(key)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: index < 4 ? '1px solid #e8e8e8' : 'none',
                    cursor: 'pointer',
                    background: activeTab === key ? '#f5f5f5' : '#fff'
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, border: '1px solid #e8e8e8', borderRadius: '4px', padding: '20px' }}>
            {activeTab === 'profile' && (
              <div>
                <h3 style={{ marginBottom: '20px' }}>个人信息</h3>
                {editingProfile ? (
                  <form onSubmit={handleSaveProfile}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <label>
                        <div style={{ marginBottom: '8px', color: '#666' }}>昵称</div>
                        <input
                          name="nickname"
                          value={profileForm.nickname}
                          onChange={handleProfileChange}
                          required
                          style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                        />
                      </label>
                      <label>
                        <div style={{ marginBottom: '8px', color: '#666' }}>手机号</div>
                        <input
                          name="phone"
                          value={profileForm.phone}
                          onChange={handleProfileChange}
                          required
                          style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                        />
                      </label>
                      <label>
                        <div style={{ marginBottom: '8px', color: '#666' }}>邮箱</div>
                        <input
                          type="email"
                          name="email"
                          value={profileForm.email}
                          onChange={handleProfileChange}
                          required
                          style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                        />
                      </label>
                      <label>
                        <div style={{ marginBottom: '8px', color: '#666' }}>头像地址</div>
                        <input
                          name="avatar"
                          value={profileForm.avatar}
                          onChange={handleProfileChange}
                          style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                        />
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button type="submit" className="button button-primary">保存</button>
                      <button type="button" className="button button-secondary" onClick={() => setEditingProfile(false)}>取消</button>
                    </div>
                  </form>
                ) : (
                  <>
                    {[
                      ['昵称', user.nickname],
                      ['邮箱', user.email],
                      ['手机号', user.phone],
                      ['信用等级', user.creditLevel],
                      ['信用分', user.creditScore]
                    ].map(([label, value]) => (
                      <div key={label} style={{ marginBottom: '16px' }}>
                        <div style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>{label}</div>
                        <div style={{ padding: '8px', border: '1px solid #e8e8e8', borderRadius: '4px' }}>{value}</div>
                      </div>
                    ))}
                    <button onClick={handleEditProfile} className="button button-primary">
                      编辑个人信息
                    </button>
                  </>
                )}
              </div>
            )}

            {activeTab === 'addresses' && (
              <div>
                <AddressManager
                  addresses={addresses}
                  onChange={handleAddressesChange}
                />
              </div>
            )}

            {activeTab === 'orders' && (
              <div>
                <h3 style={{ marginBottom: '20px' }}>我的订单</h3>
                {orders.map(order => (
                  <div key={order.id} style={{ borderBottom: '1px solid #e8e8e8', padding: '16px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div>订单号: {order.id}</div>
                      <div style={{ color: '#ff4d4f' }}>{getStatusText(order.status)}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div>下单时间: {order.createTime}</div>
                      <div style={{ fontWeight: 'bold' }}>总计: ¥{order.totalPrice.toFixed(2)}</div>
                    </div>
                    <button onClick={() => handleViewOrder(order.id)} className="button button-primary" style={{ padding: '6px 12px', fontSize: '14px' }}>
                      查看详情
                    </button>
                  </div>
                ))}
                {renderOrderDetail()}
              </div>
            )}

            {activeTab === 'logistics' && (
              <div>
                <h3 style={{ marginBottom: '20px' }}>物流跟踪</h3>
                {orders.filter(order => order.logistics).map(order => (
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
                <button onClick={() => navigate('/shop')} className="button button-primary">
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
