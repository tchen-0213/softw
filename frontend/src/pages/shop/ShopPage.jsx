import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ShopPage = () => {
  const [shop, setShop] = useState({
    id: '1',
    name: '我的店铺',
    description: '这是一家经营各类商品的店铺，欢迎光临！',
    logo: 'https://via.placeholder.com/100x100?text=Shop+Logo',
    banner: 'https://via.placeholder.com/800x200?text=Shop+Banner',
    products: [
      {
        id: '1',
        name: '全新 iPhone 15 Pro',
        price: 199.99,
        stock: 10,
        sales: 5,
        image: 'https://via.placeholder.com/100x100?text=iPhone'
      },
      {
        id: '2',
        name: 'MacBook Pro 2026',
        price: 599.99,
        stock: 5,
        sales: 2,
        image: 'https://via.placeholder.com/100x100?text=MacBook'
      },
      {
        id: '3',
        name: 'AirPods Pro 2',
        price: 99.99,
        stock: 20,
        sales: 10,
        image: 'https://via.placeholder.com/100x100?text=AirPods'
      }
    ]
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleEditShop = () => {
    // 编辑店铺信息
    alert('编辑店铺信息功能待实现');
  };

  const handleAddProduct = () => {
    // 添加商品
    navigate('/sell');
  };

  const handleEditProduct = (id) => {
    // 编辑商品
    alert(`编辑商品 ${id} 功能待实现`);
  };

  const handleDeleteProduct = (id) => {
    // 删除商品
    if (window.confirm('确定要删除该商品吗？')) {
      setShop(prev => ({
        ...prev,
        products: prev.products.filter(product => product.id !== id)
      }));
    }
  };

  return (
    <div style={{ padding: '20px 0' }}>
      <div className="container">
        <h2 style={{ marginBottom: '20px' }}>店铺管理</h2>
        
        <div style={{ marginBottom: '30px', border: '1px solid #e8e8e8', borderRadius: '4px', padding: '20px' }}>
          <h3 style={{ marginBottom: '16px' }}>店铺信息</h3>
          <div style={{ display: 'flex', marginBottom: '20px' }}>
            <img
              src={shop.logo}
              alt={shop.name}
              style={{ width: '100px', height: '100px', objectFit: 'cover', marginRight: '20px' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: '8px', fontSize: '18px', fontWeight: 'bold' }}>{shop.name}</div>
              <div style={{ marginBottom: '16px' }}>{shop.description}</div>
              <button
                onClick={handleEditShop}
                style={{
                  padding: '6px 12px',
                  background: '#1890ff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                编辑店铺信息
              </button>
            </div>
          </div>
          <img
            src={shop.banner}
            alt="店铺横幅"
            style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>商品管理</h3>
            <button
              onClick={handleAddProduct}
              style={{
                padding: '6px 12px',
                background: '#52c41a',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              添加商品
            </button>
          </div>
          <div style={{ border: '1px solid #e8e8e8', borderRadius: '4px' }}>
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
                {shop.products.map((product) => (
                  <tr key={product.id}>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e8e8e8' }}>
                      <img
                        src={product.image}
                        alt={product.name}
                        style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                      />
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e8e8e8' }}>{product.name}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e8e8e8' }}>¥{product.price}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e8e8e8' }}>{product.stock}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e8e8e8' }}>{product.sales}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e8e8e8' }}>
                      <button
                        onClick={() => handleEditProduct(product.id)}
                        style={{
                          marginRight: '8px',
                          padding: '4px 8px',
                          background: '#1890ff',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        style={{
                          padding: '4px 8px',
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