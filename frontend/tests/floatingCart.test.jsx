import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ state: { cart: { items: [] } }, dispatch: vi.fn(), navigate: vi.fn(), pathname: '/' }));
vi.mock('react-redux', () => ({ useSelector: selector => selector(mocks.state), useDispatch: () => mocks.dispatch }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate, useLocation: () => ({ pathname: mocks.pathname }) }));
import FloatingCart from '../src/components/cart/FloatingCart.jsx';
import { removeFromCart, updateQuantity } from '../src/store/cartSlice.js';

describe('浮动购物车', () => {
  beforeEach(() => {
    mocks.pathname = '/'; mocks.state = { cart: { items: [] } }; vi.clearAllMocks();
  });

  test('空购物车以及购物车、结算页不重复展示', () => {
    const view = render(<FloatingCart />);
    expect(view.container).toBeEmptyDOMElement();
    mocks.state.cart.items = [{ id: 1, name: 'A', price: 2, quantity: 1 }];
    mocks.pathname = '/cart'; view.rerender(<FloatingCart />);
    expect(view.container).toBeEmptyDOMElement();
    mocks.pathname = '/checkout'; view.rerender(<FloatingCart />);
    expect(view.container).toBeEmptyDOMElement();
  });

  test('汇总数量金额、收起展开并进入结算', async () => {
    mocks.state.cart.items = [{ id: 1, name: 'A', price: 2.5, quantity: 2 }, { id: 2, name: 'B', price: 3, quantity: 1 }];
    render(<FloatingCart />);
    expect(screen.getByText('共 3 件')).toBeInTheDocument();
    expect(screen.getByText('¥8.00')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '收起购物车' }));
    expect(screen.queryByText('已选商品')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /购物车 3/ }));
    await userEvent.click(screen.getByRole('button', { name: '去结算' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/checkout');
  });

  test('增减和删除操作派发对应 Redux 动作', async () => {
    mocks.state.cart.items = [{ id: 1, name: 'A', price: 2, quantity: 2, stock: 5 }];
    render(<FloatingCart />);
    await userEvent.click(screen.getByRole('button', { name: '-' }));
    expect(mocks.dispatch).toHaveBeenCalledWith(updateQuantity({ id: 1, quantity: 1 }));
    await userEvent.click(screen.getByRole('button', { name: '+' }));
    expect(mocks.dispatch).toHaveBeenCalledWith(updateQuantity({ id: 1, quantity: 3 }));
    await userEvent.click(screen.getByRole('button', { name: '删除' }));
    expect(mocks.dispatch).toHaveBeenCalledWith(removeFromCart(1));
  });

  test('达到库存上限时禁用增加按钮，无库存字段显示充足', () => {
    mocks.state.cart.items = [
      { id: 1, name: '限量', price: 2, quantity: 2, stock: 2 },
      { id: 2, name: '不限量', price: 1, quantity: 1 }
    ];
    render(<FloatingCart />);
    expect(screen.getAllByRole('button', { name: '+' })[0]).toBeDisabled();
    expect(screen.getByText('库存: 充足')).toBeInTheDocument();
  });
});
