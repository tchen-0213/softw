import React from 'react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div>
            <p>© 2026 购物与二手交易平台. 保留所有权利.</p>
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <a href="#" style={{ textDecoration: 'none', color: '#666' }}>关于我们</a>
            <a href="#" style={{ textDecoration: 'none', color: '#666' }}>隐私政策</a>
            <a href="#" style={{ textDecoration: 'none', color: '#666' }}>用户协议</a>
            <a href="#" style={{ textDecoration: 'none', color: '#666' }}>联系我们</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;