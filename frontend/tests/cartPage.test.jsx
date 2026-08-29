import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), dispatch: vi.fn(), selectorState: { cart: { items: [] } }, loggedIn: true }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('react-redux', () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: selector => selector(mocks.selectorState)
}));
vi.mock('../src/utils/accountStorage.js', () => ({ isLoggedIn: () => mocks.loggedIn }));
vi.mock('../src/components/cart/CartItem.jsx', () => ({ default: ({ item }) => <div>购物车项:{item.name}</div> }));

import CartPage from '../src/pages/cart/CartPage.jsx';
import { clearCart } from '../src/store/cartSlice.js';

describe('购物车页面', () => {
  beforeEach(() => {
    mocks.loggedIn = true;
    mocks.selectorState = { cart: { items: [] } };
    vi.clearAllMocks();
  });

  test('未登录时引导登录', async () => {
    mocks.loggedIn = false;
    render(<CartPage />);
    await userEvent.click(screen.getByRole('button', { name: '去登录' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/login');
  });

  test('空购物车引导继续购物', async () => {
    render(<CartPage />);
    expect(screen.getByText('购物车为空')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '去购物' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/');
  });

  test('汇总数量金额并支持清空与结算', async () => {
    mocks.selectorState = { cart: { items: [
      { id: 1, name: 'A', price: 10, quantity: 2 },
      { id: 2, name: 'B', price: 5.5, quantity: 1 }
    ] } };
    render(<CartPage />);
    expect(screen.getByText('共 3 件商品')).toBeInTheDocument();
    expect(screen.getByText('合计: ¥25.50')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '清空购物车' }));
    expect(mocks.dispatch).toHaveBeenCalledWith(clearCart());
    await userEvent.click(screen.getByRole('button', { name: '去结算' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/checkout');
  });
});
