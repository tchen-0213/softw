import React from 'react';
import { Link } from 'react-router-dom';
import SearchBar from './product/SearchBar';

const Header = () => {
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
            <Link to="/search?keyword=二手" style={{ textDecoration: 'none', color: '#333' }}>二手市场</Link>
            <Link to="/shop" style={{ textDecoration: 'none', color: '#333' }}>店铺</Link>
            <Link to="/sell" style={{ textDecoration: 'none', color: '#333' }}>发布商品</Link>
            <Link to="/cart" style={{ textDecoration: 'none', color: '#333' }}>购物车</Link>
            <Link to="/user" style={{ textDecoration: 'none', color: '#333' }}>个人中心</Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;