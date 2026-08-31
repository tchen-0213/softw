import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(), navigate: vi.fn(),
  orderApi: { getSellerList: vi.fn() },
  evaluationApi: { getSellerEvaluations: vi.fn() },
  chatApi: { getConversations: vi.fn() },
  switchCartOwner: vi.fn(user => ({ type: 'cart/switch', payload: user }))
}));
vi.mock('react-redux', () => ({ useDispatch: () => mocks.dispatch }));
vi.mock('react-router-dom', async original => {
  const actual = await original();
  return { ...actual, useNavigate: () => mocks.navigate };
});
vi.mock('../src/services/api.js', () => ({ orderApi: mocks.orderApi, evaluationApi: mocks.evaluationApi, chatApi: mocks.chatApi }));
vi.mock('../src/store/cartSlice.js', () => ({ switchCartOwner: mocks.switchCartOwner }));
vi.mock('../src/components/product/SearchBar.jsx', () => ({ default: () => <div>搜索框</div> }));

import Header from '../src/components/Header.jsx';

describe('公共头部', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.orderApi.getSellerList.mockResolvedValue({ data: { orders: [] } });
    mocks.evaluationApi.getSellerEvaluations.mockResolvedValue({ data: { pendingReplyCount: 0 } });
    mocks.chatApi.getConversations.mockResolvedValue({ data: { conversations: [] } });
    vi.clearAllMocks();
  });

  test('访客显示登录入口并标记当前导航', () => {
    render(<MemoryRouter initialEntries={['/cart']}><Header /></MemoryRouter>);
    expect(screen.getByRole('link', { name: '登录' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: '购物车' })).toHaveClass('active');
    expect(screen.getByLabelText('切换到暗色模式')).toBeInTheDocument();
  });

  test('主题按钮在明暗模式间切换并持久化', async () => {
    render(<MemoryRouter><Header /></MemoryRouter>);
    await userEvent.click(screen.getByLabelText('切换到暗色模式'));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    await userEvent.click(screen.getByLabelText('切换到浅色模式'));
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  test('登录卖家聚合待处理订单、评价和议价提醒', async () => {
    localStorage.setItem('token', 'token');
    localStorage.setItem('user', JSON.stringify({ nickname: '卖家甲' }));
    mocks.orderApi.getSellerList.mockResolvedValue({ data: { orders: [{ status: '待付款' }, { status: '待发货' }, { status: '已完成' }] } });
    mocks.evaluationApi.getSellerEvaluations.mockResolvedValue({ data: { pendingReplyCount: 3 } });
    mocks.chatApi.getConversations.mockResolvedValue({ data: { conversations: [{ pendingRequestCount: 4 }, { pendingRequestCount: 1 }] } });
    render(<MemoryRouter><Header /></MemoryRouter>);
    expect(screen.getByRole('link', { name: '卖家甲' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('10')).toBeInTheDocument());
    expect(screen.getByText('10')).toHaveAttribute('title', expect.stringContaining('2 笔卖家订单'));
    expect(screen.getByText('10')).toHaveAttribute('title', expect.stringContaining('3 条评价待回复'));
  });

  test('退出登录清理会话、切换购物车归属并返回首页', async () => {
    localStorage.setItem('token', 'token');
    localStorage.setItem('user', JSON.stringify({ username: 'seller' }));
    render(<MemoryRouter><Header /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: '退出' }));
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'cart/switch', payload: null });
    expect(mocks.navigate).toHaveBeenCalledWith('/');
  });
});
