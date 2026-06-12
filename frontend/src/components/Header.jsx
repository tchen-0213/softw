import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { switchCartOwner } from '../store/cartSlice';
import { chatApi, evaluationApi, orderApi } from '../services/api';
import SearchBar from './product/SearchBar';

const pendingSellerOrderStatuses = ['待付款', '待发货'];

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [isDiscoMode, setIsDiscoMode] = useState(false);
  const [sellerPendingOrderCount, setSellerPendingOrderCount] = useState(0);
  const [sellerPendingReplyCount, setSellerPendingReplyCount] = useState(0);
  const [sellerPendingChatCount, setSellerPendingChatCount] = useState(0);
  const longPressTimerRef = useRef(null);
  const discoTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);
  const ignoreNextClickRef = useRef(false);
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  useEffect(() => {
    setToken(localStorage.getItem('token'));
  }, [location.pathname]);

  useEffect(() => {
    let ignore = false;
    let refreshTimer = null;

    if (!token) {
      setSellerPendingOrderCount(0);
      setSellerPendingReplyCount(0);
      setSellerPendingChatCount(0);
      return undefined;
    }

    const loadSellerAlerts = () => {
      Promise.allSettled([
        orderApi.getSellerList(),
        evaluationApi.getSellerEvaluations({ limit: 100 }),
        chatApi.getConversations({ role: 'seller' })
      ])
        .then(([orderResult, evaluationResult, chatResult]) => {
          if (ignore) {
            return;
          }

          const orders = orderResult.status === 'fulfilled'
            ? orderResult.value.data.orders || []
            : [];
          const pendingCount = orders.filter(order => (
            pendingSellerOrderStatuses.includes(order.status)
          )).length;
          const pendingReplyCount = evaluationResult.status === 'fulfilled'
            ? Number(evaluationResult.value.data.pendingReplyCount || 0)
            : 0;
          const pendingChatCount = chatResult.status === 'fulfilled'
            ? (chatResult.value.data.conversations || []).reduce((sum, conversation) => (
                sum + Number(conversation.pendingRequestCount || 0)
              ), 0)
            : 0;

          setSellerPendingOrderCount(pendingCount);
          setSellerPendingReplyCount(pendingReplyCount);
          setSellerPendingChatCount(pendingChatCount);
        })
        .catch(() => {
          if (!ignore) {
            setSellerPendingOrderCount(0);
            setSellerPendingReplyCount(0);
            setSellerPendingChatCount(0);
          }
        });
    };

    loadSellerAlerts();
    refreshTimer = window.setInterval(loadSellerAlerts, 30000);
    window.addEventListener('seller-alerts-refresh', loadSellerAlerts);

    return () => {
      ignore = true;
      window.clearInterval(refreshTimer);
      window.removeEventListener('seller-alerts-refresh', loadSellerAlerts);
    };
  }, [token, location.pathname]);

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
    dispatch(switchCartOwner(null));
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

  const getNavLinkClass = (path) => {
    const isActive = path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(path);

    return `nav-link${isActive ? ' active' : ''}`;
  };

  const sellerAlertCount = sellerPendingOrderCount + sellerPendingReplyCount + sellerPendingChatCount;
  const sellerAlertTitle = [
    sellerPendingOrderCount > 0 ? `${sellerPendingOrderCount} 笔卖家订单需要关注` : '',
    sellerPendingReplyCount > 0 ? `${sellerPendingReplyCount} 条评价待回复` : '',
    sellerPendingChatCount > 0 ? `${sellerPendingChatCount} 个私聊申请待处理` : ''
  ].filter(Boolean).join('，');

  const shopNavLinkClass = `${getNavLinkClass('/shop')} shop-nav-link${
    sellerAlertCount > 0 ? ' has-order-alert' : ''
  }`;

  return (
    <header className="header">
      <div className="container header-container">
        <div className="header-content">
          <Link to="/" className="logo">
            <img src="/images/moyu-logo.png" alt="摸鱼" className="logo-image" />
            <span className="logo-text">摸鱼</span>
          </Link>
          <SearchBar />
          <nav className="nav">
            <Link to="/" className={getNavLinkClass('/')}>首页</Link>
            <Link to="/search?productType=2" className={getNavLinkClass('/search')}>二手市场</Link>
            <Link to="/shop" className={shopNavLinkClass}>
              <span>店铺</span>
              {sellerAlertCount > 0 && (
                <span
                  className="nav-order-badge"
                  title={sellerAlertTitle}
                >
                  {sellerAlertCount > 99 ? '99+' : sellerAlertCount}
                </span>
              )}
            </Link>
            <Link to="/sell" className={getNavLinkClass('/sell')}>发布商品</Link>
            <Link to="/cart" className={getNavLinkClass('/cart')}>购物车</Link>
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
                {theme === 'dark' ? <SunOutlined /> : <MoonOutlined />}
              </span>
            </button>
            {token ? (
              <>
                <Link to="/user" className="user-link">
                  {user?.nickname || user?.username || '个人中心'}
                </Link>
                <button
                  onClick={handleLogout}
                  className="logout-button"
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
