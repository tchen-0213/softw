import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SearchBar from './product/SearchBar';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [isDiscoMode, setIsDiscoMode] = useState(false);
  const longPressTimerRef = useRef(null);
  const discoTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);
  const ignoreNextClickRef = useRef(false);
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  useEffect(() => {
    setToken(localStorage.getItem('token'));
  }, [location.pathname]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.body.classList.toggle('disco-mode', isDiscoMode);

    if (!isDiscoMode) {
      return undefined;
    }

    const stopDiscoMode = () => {
      if (ignoreNextClickRef.current) {
        ignoreNextClickRef.current = false;
        return;
      }

      setIsDiscoMode(false);
    };

    document.addEventListener('click', stopDiscoMode);
    discoTimerRef.current = window.setTimeout(() => {
      setIsDiscoMode(false);
    }, 7000);

    return () => {
      document.body.classList.remove('disco-mode');
      document.removeEventListener('click', stopDiscoMode);
      window.clearTimeout(discoTimerRef.current);
    };
  }, [isDiscoMode]);

  useEffect(() => {
    return () => {
      window.clearTimeout(longPressTimerRef.current);
      window.clearTimeout(discoTimerRef.current);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    navigate('/');
  };

  const startLongPress = () => {
    longPressTriggeredRef.current = false;
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      ignoreNextClickRef.current = true;
      setIsDiscoMode(true);
    }, 650);
  };

  const cancelLongPress = () => {
    window.clearTimeout(longPressTimerRef.current);
  };

  const handleThemeButtonClick = () => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
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
            <Link to="/" className="nav-link">首页</Link>
            <Link to="/search?productType=2" className="nav-link">二手市场</Link>
            <Link to="/shop" className="nav-link">店铺</Link>
            <Link to="/sell" className="nav-link">发布商品</Link>
            <Link to="/cart" className="nav-link">购物车</Link>
          </nav>
          <div className="header-actions">
            <button
              type="button"
              className="theme-toggle"
              aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到暗色模式'}
              title="短按切换主题，长按进入 disco mode"
              onPointerDown={startLongPress}
              onPointerUp={cancelLongPress}
              onPointerLeave={cancelLongPress}
              onPointerCancel={cancelLongPress}
              onClick={handleThemeButtonClick}
            >
              <span className="theme-toggle-icon" aria-hidden="true">
                {theme === 'dark' ? '☀' : '☾'}
              </span>
            </button>
            {token ? (
              <>
                <Link to="/user" className="nav-link">
                  {user?.username || '个人中心'}
                </Link>
                <button
                  onClick={handleLogout}
                  className="nav-button"
                >
                  退出
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="login-link">登录</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
