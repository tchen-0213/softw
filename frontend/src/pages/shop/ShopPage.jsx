import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productImages, shopImages } from '../../data/imageAssets';
import { orderApi, productApi, shopApi, uploadApi } from '../../services/api';
import { isLoggedIn } from '../../utils/accountStorage';

const defaultProducts = [
  {
    id: '1',
    name: '全新 iPhone 15 Pro',
    price: 199.99,
    stock: 10,
    sales: 5,
    image: productImages.iphone
  },
  {
    id: '2',
    name: 'MacBook Pro 2026',
    price: 599.99,
    stock: 5,
    sales: 2,
    image: productImages.macbook
  },
  {
    id: '3',
    name: 'AirPods Pro 2',
    price: 99.99,
    stock: 20,
    sales: 10,
    image: productImages.airpods
  }
];

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

const getUserKey = (user) => user?.id || user?._id || user?.email || user?.username;

const getShopStorageKey = (user) => `shopData:${getUserKey(user)}`;

const createDefaultShop = (user) => ({
  id: `shop-${getUserKey(user)}`,
  ownerId: getUserKey(user),
  name: `${user?.username || '我的'}的店铺`,
  description: '这是一家经营各类商品的店铺，欢迎光临！',
  logo: shopImages.logo,
  banner: shopImages.banner,
  products: defaultProducts
});

const normalizeShop = (shop, user) => {
  const fallback = createDefaultShop(user);
  return {
    ...fallback,
    ...shop,
    ownerId: getUserKey(user),
    logo: shop?.logo || shop?.avatar || shopImages.logo,
    banner: shop?.banner || shopImages.banner,
    products: Array.isArray(shop?.products)
      ? shop.products.map(product => ({
          ...product,
          image: product.image || product.images?.[0] || productImages.iphone
        }))
      : fallback.products
  };
};

const loadShop = (user) => {
  if (!user) {
    return null;
  }

  try {
    const saved = JSON.parse(localStorage.getItem(getShopStorageKey(user)) || 'null');
    return normalizeShop(saved, user);
  } catch {
    return createDefaultShop(user);
  }
};

const toEditableImageValue = (value, fallback) => (value && value !== fallback ? value : '');

const resolveImageValue = (value, fallback) => {
  const nextValue = String(value || '').trim();
  return nextValue || fallback;
};

const getStoredImageValue = (value) => String(value || '').trim();

const ShopPage = () => {
  const [user] = useState(getCurrentUser);
  const [shop, setShop] = useState(() => loadShop(getCurrentUser()));
  const [editingShop, setEditingShop] = useState(false);
  const [shopForm, setShopForm] = useState({
    name: '',
    description: '',
    logo: '',
    banner: ''
  });
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    stock: '',
    sales: '',
    image: '',
    status: '在售'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [shippingOrderId, setShippingOrderId] = useState(null);
  const [shippingForm, setShippingForm] = useState({
    company: '',
    trackingNumber: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !isLoggedIn()) {
      return;
    }

    setLoading(true);
    shopApi.getMine()
      .then((response) => {
        setShop(normalizeShop(response.data, user));
        setError('');
      })
      .catch((err) => {
        setError(err.response?.data?.message || '店铺加载失败，已显示本地演示数据');
        setShop(loadShop(user) || createDefaultShop(user));
      })
      .finally(() => setLoading(false));

    orderApi.getSellerList()
      .then((response) => {
        setSellerOrders(response.data.orders || []);
      })
      .catch(() => {});
  }, [user]);

  const handleEditShop = () => {
    setShopForm({
      name: shop.name,
      description: shop.description,
      logo: toEditableImageValue(shop.logo, shopImages.logo),
      banner: toEditableImageValue(shop.banner, shopImages.banner)
    });
    setEditingShop(true);
  };

  const handleShopFormChange = (event) => {
    const { name, value } = event.target;
    setShopForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadingLogo(true);
    setError('');
    try {
      const response = await uploadApi.uploadImages([file]);
      const logoUrl = response.data.urls?.[0];
      if (logoUrl) {
        setShopForm(prev => ({
          ...prev,
          logo: logoUrl
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Logo 上传失败，请稍后重试');
    } finally {
      setUploadingLogo(false);
      event.target.value = '';
    }
  };

  const handleBannerUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadingBanner(true);
    setError('');
    try {
      const response = await uploadApi.uploadImages([file]);
      const bannerUrl = response.data.urls?.[0];
      if (bannerUrl) {
        setShopForm(prev => ({
          ...prev,
          banner: bannerUrl
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || '横幅上传失败，请稍后重试');
    } finally {
      setUploadingBanner(false);
      event.target.value = '';
    }
  };

  const handleRestoreDefaultImage = (field) => {
    setShopForm(prev => ({
      ...prev,
      [field]: ''
    }));
    setError('');
  };

  const handleSaveShop = async (event) => {
    event.preventDefault();
    const nextLogo = getStoredImageValue(shopForm.logo);
    const nextBanner = getStoredImageValue(shopForm.banner);

    try {
      const response = await shopApi.updateMine({
        name: shopForm.name,
        description: shopForm.description,
        avatar: nextLogo,
        logo: nextLogo,
        banner: nextBanner
      });
      const savedShop = normalizeShop({
        ...(response.data || {}),
        name: shopForm.name,
        description: shopForm.description,
        logo: nextLogo,
        avatar: nextLogo,
        banner: nextBanner
      }, user);
      setShop(savedShop);
      localStorage.setItem(getShopStorageKey(user), JSON.stringify(savedShop));
      setEditingShop(false);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || '店铺保存失败');
    }
  };

  const handleAddProduct = () => {
    navigate('/sell');
  };

  const handleEditProduct = (product) => {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      price: product.price,
      stock: product.stock,
      sales: product.sales,
      image: product.image || product.images?.[0] || '',
      status: product.status || '在售'
    });
  };

  const handleProductFormChange = (event) => {
    const { name, value } = event.target;
    setProductForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProduct = async (event) => {
    event.preventDefault();
    const currentProduct = shop.products.find(product => product.id === editingProductId);
    try {
      const response = await productApi.update(editingProductId, {
        name: productForm.name,
        price: Number(productForm.price),
        stock: Number(productForm.stock),
        status: productForm.status,
        images: productForm.image ? [productForm.image] : currentProduct?.images || []
      });
      const updatedProduct = {
        ...response.data,
        image: response.data.images?.[0] || productForm.image || productImages.iphone
      };
      setShop(prev => ({
        ...prev,
        products: prev.products.map(product => (
          product.id === editingProductId ? updatedProduct : product
        ))
      }));
      setEditingProductId(null);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || '商品保存失败');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('确定要删除该商品吗？')) {
      try {
        await productApi.delete(id);
        setShop(prev => ({
          ...prev,
          products: prev.products.filter(product => product.id !== id)
        }));
        if (editingProductId === id) {
          setEditingProductId(null);
        }
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || '商品删除失败');
      }
    }
  };

  const handleShippingChange = (event) => {
    const { name, value } = event.target;
    setShippingForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleShipOrder = async (orderId) => {
    try {
      const response = await orderApi.ship(orderId, shippingForm);
      setSellerOrders(prev => prev.map(order => (
        Number(order.id) === Number(orderId) ? response.data : order
      )));
      setShippingOrderId(null);
      setShippingForm({ company: '', trackingNumber: '' });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || '发货失败');
    }
  };

  if (!user || !isLoggedIn()) {
    return (
      <div style={{ padding: '20px 0' }}>
        <div className="container">
          <h2 style={{ marginBottom: '20px' }}>店铺管理</h2>
          <div className="shop-empty-panel">
            <h3>请先登录后管理店铺</h3>
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
        <h2 style={{ marginBottom: '20px' }}>店铺管理</h2>
        {loading && <div className="loading">加载中...</div>}
        {error && <div style={{ color: '#ff4d4f', marginBottom: '16px' }}>{error}</div>}

        <div className="shop-owner-note">
          当前店铺归属：<strong>{user.username || user.email}</strong>
        </div>

        <div style={{ marginBottom: '30px', border: '1px solid #e8e8e8', borderRadius: '4px', padding: '20px' }}>
          <h3 style={{ marginBottom: '16px' }}>店铺信息</h3>

          {editingShop ? (
            <form onSubmit={handleSaveShop} style={{ marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>店铺名称</label>
                  <input
                    name="name"
                    value={shopForm.name}
                    onChange={handleShopFormChange}
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    店铺 Logo 图片（可选）
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  />
                  <div className="shop-field-hint">
                    {uploadingLogo ? 'Logo 上传中...' : '选择图片后会自动上传，Logo 会显示在店铺信息左侧。'}
                  </div>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => handleRestoreDefaultImage('logo')}
                    disabled={uploadingLogo}
                    style={{ marginTop: '10px', padding: '8px 14px', fontSize: '14px' }}
                  >
                    恢复默认 Logo
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>店铺简介</label>
                <textarea
                  name="description"
                  value={shopForm.description}
                  onChange={handleShopFormChange}
                  rows="3"
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px', resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  店铺横幅图片（可选）
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  disabled={uploadingBanner}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                />
                <div className="shop-field-hint">
                  {uploadingBanner ? '横幅上传中...' : '选择图片后会自动上传，横幅会显示在店铺顶部。'}
                </div>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => handleRestoreDefaultImage('banner')}
                  disabled={uploadingBanner}
                  style={{ marginTop: '10px', padding: '8px 14px', fontSize: '14px' }}
                >
                  恢复默认横幅
                </button>
              </div>

              <div className="shop-image-preview">
                <div>
                  <span>Logo 预览</span>
                  <img
                    src={resolveImageValue(shopForm.logo, shopImages.logo)}
                    alt="店铺 Logo 预览"
                    onError={(event) => {
                      event.currentTarget.src = shopImages.logo;
                    }}
                  />
                </div>
                <div>
                  <span>横幅预览</span>
                  <img
                    src={resolveImageValue(shopForm.banner, shopImages.banner)}
                    alt="店铺横幅预览"
                    onError={(event) => {
                      event.currentTarget.src = shopImages.banner;
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="button button-primary" disabled={uploadingLogo || uploadingBanner}>
                  保存
                </button>
                <button type="button" className="button button-secondary" onClick={() => setEditingShop(false)}>取消</button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', marginBottom: '20px' }}>
              <img
                src={shop.logo || shopImages.logo}
                alt={shop.name}
                onError={(event) => {
                  event.currentTarget.src = shopImages.logo;
                }}
                style={{ width: '100px', height: '100px', objectFit: 'cover', marginRight: '20px', borderRadius: '8px' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: '8px', fontSize: '18px', fontWeight: 'bold' }}>{shop.name}</div>
                <div style={{ marginBottom: '16px' }}>{shop.description}</div>
                <button onClick={handleEditShop} className="button button-primary" style={{ padding: '8px 16px' }}>
                  编辑店铺信息
                </button>
              </div>
            </div>
          )}

          <img
            src={shop.banner || shopImages.banner}
            alt="店铺横幅"
            onError={(event) => {
              event.currentTarget.src = shopImages.banner;
            }}
            style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>商品管理</h3>
            <button onClick={handleAddProduct} className="button button-primary" style={{ padding: '8px 16px' }}>
              添加商品
            </button>
          </div>

          {editingProductId && (
            <form onSubmit={handleSaveProduct} style={{ border: '1px solid #e8e8e8', borderRadius: '4px', padding: '16px', marginBottom: '16px', background: '#fafafa' }}>
              <h4 style={{ marginBottom: '16px' }}>编辑商品</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <label>
                  <div style={{ marginBottom: '8px', color: '#666' }}>商品名称</div>
                  <input
                    name="name"
                    value={productForm.name}
                    onChange={handleProductFormChange}
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  />
                </label>
                <label>
                  <div style={{ marginBottom: '8px', color: '#666' }}>价格</div>
                  <input
                    type="number"
                    name="price"
                    value={productForm.price}
                    onChange={handleProductFormChange}
                    min="0"
                    step="0.01"
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  />
                </label>
                <label>
                  <div style={{ marginBottom: '8px', color: '#666' }}>库存</div>
                  <input
                    type="number"
                    name="stock"
                    value={productForm.stock}
                    onChange={handleProductFormChange}
                    min="0"
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  />
                </label>
                <label>
                  <div style={{ marginBottom: '8px', color: '#666' }}>销量</div>
                  <input
                    type="number"
                    name="sales"
                    value={productForm.sales}
                    onChange={handleProductFormChange}
                    min="0"
                    disabled
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  />
                </label>
                <label>
                  <div style={{ marginBottom: '8px', color: '#666' }}>状态</div>
                  <select
                    name="status"
                    value={productForm.status}
                    onChange={handleProductFormChange}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  >
                    <option value="在售">在售</option>
                    <option value="下架">下架</option>
                    <option value="已预订">已预订</option>
                    <option value="已售出">已售出</option>
                  </select>
                </label>
              </div>
              <label>
                <div style={{ marginBottom: '8px', color: '#666' }}>商品图片链接（可选）</div>
                <input
                  name="image"
                  value={productForm.image}
                  onChange={handleProductFormChange}
                  placeholder="留空保留当前图片，也可以粘贴图片 URL"
                  style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px', marginBottom: '12px' }}
                />
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="button button-primary">保存商品</button>
                <button type="button" className="button button-secondary" onClick={() => setEditingProductId(null)}>取消</button>
              </div>
            </form>
          )}

          <div style={{ border: '1px solid #e8e8e8', borderRadius: '4px', overflowX: 'auto' }}>
            <table className="shop-product-table">
              <colgroup>
                <col style={{ width: '120px' }} />
                <col />
                <col style={{ width: '120px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '170px' }} />
              </colgroup>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th>商品图片</th>
                  <th>商品名称</th>
                  <th>价格</th>
                  <th>库存</th>
                  <th>销量</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {shop.products.map(product => (
                  <tr key={product.id}>
                    <td>
                      <img
                        src={product.image || productImages.iphone}
                        alt={product.name}
                        onError={(event) => {
                          event.currentTarget.src = productImages.iphone;
                        }}
                        className="shop-product-image"
                      />
                    </td>
                    <td className="shop-product-name">{product.name}</td>
                    <td>¥{Number(product.price).toFixed(2)}</td>
                    <td>{product.stock}</td>
                    <td>{product.sales}</td>
                    <td>{product.status || '在售'}</td>
                    <td>
                      <div className="shop-product-actions">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="button button-primary"
                        style={{ marginRight: '8px', padding: '6px 12px', fontSize: '14px' }}
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#ff4d4f',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        删除
                      </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '16px' }}>卖家订单与物流</h3>
          {sellerOrders.length === 0 ? (
            <div style={{ border: '1px solid #e8e8e8', borderRadius: '4px', padding: '20px', color: '#666' }}>
              暂无卖家订单
            </div>
          ) : (
            sellerOrders.map(order => (
              <div key={order.id} style={{ border: '1px solid #e8e8e8', borderRadius: '4px', padding: '16px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <strong>订单号：{order.id}</strong>
                  <span style={{ color: '#ff4d4f' }}>{order.status}</span>
                </div>
                {(order.items || []).map(item => (
                  <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', color: '#666', marginBottom: '8px' }}>
                    <span>{item.name} x {item.quantity}</span>
                    <span>¥{Number(item.price).toFixed(2)}</span>
                  </div>
                ))}
                {order.shippingAddress && (
                  <div style={{ color: '#666', marginBottom: '12px' }}>
                    收货信息：{order.shippingAddress.name}，{order.shippingAddress.phone}，{order.shippingAddress.address}
                  </div>
                )}
                {order.status === '待发货' && (
                  shippingOrderId === order.id ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '10px', alignItems: 'center' }}>
                      <input
                        name="company"
                        value={shippingForm.company}
                        onChange={handleShippingChange}
                        placeholder="物流公司"
                        style={{ padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                      />
                      <input
                        name="trackingNumber"
                        value={shippingForm.trackingNumber}
                        onChange={handleShippingChange}
                        placeholder="物流单号"
                        style={{ padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                      />
                      <button className="button button-primary" type="button" onClick={() => handleShipOrder(order.id)}>确认发货</button>
                      <button className="button button-secondary" type="button" onClick={() => setShippingOrderId(null)}>取消</button>
                    </div>
                  ) : (
                    <button className="button button-primary" type="button" onClick={() => setShippingOrderId(order.id)}>
                      填写物流并发货
                    </button>
                  )
                )}
                {order.logistics && (
                  <div style={{ color: '#666', marginTop: '10px' }}>
                    物流：{order.logistics.company || '商家配送'} {order.logistics.trackingNumber || ''}，
                    {order.logistics.status || '运输中'}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopPage;
