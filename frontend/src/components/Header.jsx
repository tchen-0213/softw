import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SearchBar from './product/SearchBar';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState(localStorage.getItem('token'));
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  useEffect(() => {
    setToken(localStorage.getItem('token'));
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    navigate('/');
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo">
            购物与二手交易平台
          </Link>
          <SearchBar />
          <nav className="nav">
            <Link to="/" style={{ textDecoration: 'none', color: '#333' }}>首页</Link>
            <Link to="/search?productType=2" style={{ textDecoration: 'none', color: '#333' }}>二手市场</Link>
            <Link to="/shop" style={{ textDecoration: 'none', color: '#333' }}>店铺</Link>
            <Link to="/sell" style={{ textDecoration: 'none', color: '#333' }}>发布商品</Link>
            <Link to="/cart" style={{ textDecoration: 'none', color: '#333' }}>购物车</Link>
            {token ? (
              <>
                <Link to="/user" style={{ textDecoration: 'none', color: '#333' }}>
                  {user?.username || '个人中心'}
                </Link>
                <button
                  onClick={handleLogout}
                  style={{ border: 'none', background: 'transparent', color: '#666', cursor: 'pointer' }}
                >
                  退出
                </button>
              </>
            ) : (
              <>
                <Link to="/login" style={{ textDecoration: 'none', color: '#333' }}>登录</Link>
                <Link to="/register" style={{ textDecoration: 'none', color: '#333' }}>注册</Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
