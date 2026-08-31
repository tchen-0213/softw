import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

const page = vi.hoisted(() => name => ({ default: () => name }));
vi.mock('../src/pages/home/HomePage.jsx', () => page('首页页面'));
vi.mock('../src/pages/search/SearchPage.jsx', () => page('搜索页面'));
vi.mock('../src/pages/product/ProductDetailPage.jsx', () => page('商品详情页面'));
vi.mock('../src/pages/cart/CartPage.jsx', () => page('购物车页面'));
vi.mock('../src/pages/checkout/CheckoutPage.jsx', () => page('结算页面'));
vi.mock('../src/pages/order/OrderPage.jsx', () => page('订单页面'));
vi.mock('../src/pages/sell/SellPage.jsx', () => page('发布页面'));
vi.mock('../src/pages/evaluation/EvaluationPage.jsx', () => page('评价页面'));
vi.mock('../src/pages/chat/ChatPage.jsx', () => page('聊天页面'));
vi.mock('../src/pages/shop/ShopPage.jsx', () => page('店铺管理页面'));
vi.mock('../src/pages/shop/PublicShopPage.jsx', () => page('公开店铺页面'));
vi.mock('../src/pages/user/UserPage.jsx', () => page('用户中心页面'));
vi.mock('../src/pages/auth/AuthPage.jsx', () => ({ default: ({ mode }) => (mode === 'login' ? '登录页面' : '注册页面') }));
vi.mock('../src/pages/legal/AboutPage.jsx', () => page('关于页面'));
vi.mock('../src/pages/legal/PrivacyPolicyPage.jsx', () => page('隐私页面'));
vi.mock('../src/pages/legal/UserAgreementPage.jsx', () => page('协议页面'));
vi.mock('../src/components/Header.jsx', () => ({ default: () => <header>公共头部</header> }));
vi.mock('../src/components/Footer.jsx', () => ({ default: () => <footer>公共底部</footer> }));
vi.mock('../src/components/cart/FloatingCart.jsx', () => ({ default: () => <aside>浮动购物车</aside> }));

import App from '../src/App.jsx';

describe('应用路由注册', () => {
  test.each([
    ['/', '首页页面'], ['/search?keyword=x', '搜索页面'], ['/product/1', '商品详情页面'],
    ['/cart', '购物车页面'], ['/checkout', '结算页面'], ['/order', '订单页面'],
    ['/sell', '发布页面'], ['/evaluation/1', '评价页面'], ['/chat/2', '聊天页面'],
    ['/shop/user/3', '公开店铺页面'], ['/shop', '店铺管理页面'], ['/user', '用户中心页面'],
    ['/login', '登录页面'], ['/register', '注册页面'], ['/about', '关于页面'],
    ['/privacy', '隐私页面'], ['/terms', '协议页面']
  ])('%s 渲染 %s', (path, heading) => {
    window.history.pushState({}, '', path);
    render(<App />);
    expect(screen.getByText(heading)).toBeInTheDocument();
    expect(screen.getByText('公共头部')).toBeInTheDocument();
    expect(screen.getByText('公共底部')).toBeInTheDocument();
  });

  test('旧联系地址重定向到关于页面', async () => {
    window.history.pushState({}, '', '/contact');
    render(<App />);
    await waitFor(() => expect(screen.getByText('关于页面')).toBeInTheDocument());
    expect(window.location.pathname).toBe('/about');
  });
});
