import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div>
            <p>© 2026 摸鱼. 保留所有权利.</p>
          </div>
          <div className="footer-links">
            <Link to="/about" className="footer-link">关于我们</Link>
            <Link to="/privacy" className="footer-link">隐私政策</Link>
            <Link to="/terms" className="footer-link">用户协议</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
