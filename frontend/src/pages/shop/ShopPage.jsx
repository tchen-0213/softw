import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productImages, shopImages } from '../../data/imageAssets';

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
    logo: shop?.logo || shopImages.logo,
    banner: shop?.banner || shopImages.banner,
    products: Array.isArray(shop?.products) ? shop.products : fallback.products
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
  const nextValue = value.trim();
  return nextValue || fallback;
};

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
    image: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (user && shop) {
      localStorage.setItem(getShopStorageKey(user), JSON.stringify(shop));
    }
  }, [shop, user]);

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

  const handleSaveShop = (event) => {
    event.preventDefault();
    setShop(prev => ({
      ...prev,
      name: shopForm.name,
      description: shopForm.description,
      logo: resolveImageValue(shopForm.logo, shopImages.logo),
      banner: resolveImageValue(shopForm.banner, shopImages.banner)
    }));
    setEditingShop(false);
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
      image: product.image
    });
  };

  const handleProductFormChange = (event) => {
    const { name, value } = event.target;
    setProductForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProduct = (event) => {
    event.preventDefault();
    setShop(prev => ({
      ...prev,
      products: prev.products.map(product => (
        product.id === editingProductId
          ? {
              ...product,
              name: productForm.name,
              price: Number(productForm.price),
              stock: Number(productForm.stock),
              sales: Number(productForm.sales),
              image: productForm.image || product.image
            }
          : product
      ))
    }));
    setEditingProductId(null);
  };

  const handleDeleteProduct = (id) => {
    if (window.confirm('确定要删除该商品吗？')) {
      setShop(prev => ({
        ...prev,
        products: prev.products.filter(product => product.id !== id)
      }));
      if (editingProductId === id) {
        setEditingProductId(null);
      }
    }
  };

  if (!user || !localStorage.getItem('token')) {
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
                    店铺 Logo 图片链接（可选）
                  </label>
                  <input
                    name="logo"
                    value={shopForm.logo}
                    onChange={handleShopFormChange}
                    placeholder="留空使用默认 Logo，也可以粘贴图片 URL"
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  />
                  <div className="shop-field-hint">Logo 会显示在店铺信息左侧，类似店铺头像。</div>
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
                  店铺横幅图片链接（可选）
                </label>
                <input
                  name="banner"
                  value={shopForm.banner}
                  onChange={handleShopFormChange}
                  placeholder="留空使用默认横幅，也可以粘贴图片 URL"
                  style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                />
                <div className="shop-field-hint">横幅是店铺顶部的大图，用来展示店铺风格或活动。</div>
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
                <button type="submit" className="button button-primary">保存</button>
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
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
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
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  />
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
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e8e8e8' }}>商品图片</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e8e8e8' }}>商品名称</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e8e8e8' }}>价格</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e8e8e8' }}>库存</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e8e8e8' }}>销量</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #e8e8e8' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {shop.products.map(product => (
                  <tr key={product.id}>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e8e8e8' }}>
                      <img
                        src={product.image || productImages.iphone}
                        alt={product.name}
                        onError={(event) => {
                          event.currentTarget.src = productImages.iphone;
                        }}
                        style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                      />
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e8e8e8' }}>{product.name}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e8e8e8' }}>¥{Number(product.price).toFixed(2)}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e8e8e8' }}>{product.stock}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e8e8e8' }}>{product.sales}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e8e8e8' }}>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopPage;
