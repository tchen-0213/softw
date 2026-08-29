import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), dispatch: vi.fn(), register: vi.fn(), login: vi.fn() }));
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mocks.navigate
}));
vi.mock('react-redux', () => ({ useDispatch: () => mocks.dispatch }));
vi.mock('../src/services/api.js', () => ({ userApi: { register: mocks.register, login: mocks.login } }));

import AuthPage from '../src/pages/auth/AuthPage.jsx';
import { switchCartOwner } from '../src/store/cartSlice.js';

const response = { data: { _id: 9, username: 'moyu', email: 'moyu@example.com', phone: '13800138000', token: 'token', creditScore: 100 } };

describe('认证页面', () => {
  beforeEach(() => vi.clearAllMocks());

  test('注册成功保存会话、切换购物车并返回首页', async () => {
    mocks.register.mockResolvedValue(response);
    const user = userEvent.setup();
    render(<MemoryRouter><AuthPage mode="register" /></MemoryRouter>);
    await user.type(screen.getByLabelText('用户名'), 'moyu');
    await user.type(screen.getByLabelText('手机号'), '13800138000');
    await user.type(screen.getByLabelText('邮箱'), 'moyu@example.com');
    await user.type(screen.getByLabelText('密码'), '123456');
    await user.click(screen.getByRole('button', { name: '注册并登录' }));
    await waitFor(() => expect(mocks.register).toHaveBeenCalledWith({ username: 'moyu', phone: '13800138000', email: 'moyu@example.com', password: '123456' }));
    expect(localStorage.getItem('token')).toBe('token');
    const storedUser = JSON.parse(localStorage.getItem('user'));
    expect(storedUser).toEqual(expect.objectContaining({ id: 9, username: 'moyu' }));
    expect(mocks.dispatch).toHaveBeenCalledWith(switchCartOwner(storedUser));
    expect(mocks.navigate).toHaveBeenCalledWith('/');
  });

  test('登录只提交邮箱密码并展示服务端错误', async () => {
    mocks.login.mockRejectedValue({ response: { data: { message: '账号或密码错误' } } });
    const user = userEvent.setup();
    render(<MemoryRouter><AuthPage mode="login" /></MemoryRouter>);
    await user.type(screen.getByLabelText('邮箱'), 'bad@example.com');
    await user.type(screen.getByLabelText('密码'), '123456');
    await user.click(screen.getByRole('button', { name: '登录' }));
    expect(await screen.findByText('账号或密码错误')).toBeInTheDocument();
    expect(mocks.login).toHaveBeenCalledWith({ email: 'bad@example.com', password: '123456' });
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  test('无服务端错误消息时展示通用提示', async () => {
    mocks.login.mockRejectedValue(new Error('network'));
    const user = userEvent.setup();
    render(<MemoryRouter><AuthPage mode="login" /></MemoryRouter>);
    await user.type(screen.getByLabelText('邮箱'), 'bad@example.com');
    await user.type(screen.getByLabelText('密码'), '123456');
    await user.click(screen.getByRole('button', { name: '登录' }));
    expect(await screen.findByText('操作失败，请检查输入后重试')).toBeInTheDocument();
  });
});
