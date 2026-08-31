import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  selectorState: { cart: { items: [] } }, dispatch: vi.fn(), navigate: vi.fn(),
  location: { state: null }, loggedIn: true, user: { id: 1 }, addresses: [],
  addressApi: { getList: vi.fn(), replaceAll: vi.fn() },
  orderApi: { create: vi.fn() }, saveAddresses: vi.fn(), clearCart: vi.fn(() => ({ type: 'cart/clear' }))
}));

vi.mock('react-redux', () => ({
  useSelector: selector => selector(mocks.selectorState), useDispatch: () => mocks.dispatch
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate, useLocation: () => mocks.location
}));
vi.mock('../src/store/cartSlice.js', () => ({ clearCart: mocks.clearCart }));
vi.mock('../src/utils/accountStorage.js', () => ({
  getStoredUser: () => mocks.user,
  isLoggedIn: () => mocks.loggedIn,
  loadUserAddresses: () => mocks.addresses,
  saveUserAddresses: mocks.saveAddresses
}));
vi.mock('../src/services/api.js', () => ({ addressApi: mocks.addressApi, orderApi: mocks.orderApi }));
vi.mock('../src/components/user/AddressManager.jsx', () => ({
  default: ({ addresses, onChange, onSelect }) => <div>
    <span>地址数:{addresses.length}</span>
    <button onClick={() => onChange([{ id: 'new', name: '李四', phone: '2', address: 'B', isDefault: true }])}>模拟新增地址</button>
    <button onClick={() => onSelect('new')}>选择新地址</button>
  </div>
}));

import CheckoutPage from '../src/pages/checkout/CheckoutPage.jsx';

describe('结算页面', () => {
  beforeEach(() => {
    mocks.selectorState = { cart: { items: [] } };
    mocks.location = { state: null };
    mocks.loggedIn = true;
    mocks.user = { id: 1 };
    mocks.addresses = [];
    mocks.addressApi.getList.mockResolvedValue({ data: [] });
    mocks.addressApi.replaceAll.mockImplementation(async rows => ({ data: rows }));
    mocks.orderApi.create.mockResolvedValue({ data: { id: 1 } });
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  test('未登录时引导登录且不读取服务端地址', async () => {
    mocks.loggedIn = false;
    render(<CheckoutPage />);
    await userEvent.click(screen.getByRole('button', { name: '去登录' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/login');
    expect(mocks.addressApi.getList).not.toHaveBeenCalled();
  });

  test('购物车为空时阻止结算并返回购物页', async () => {
    render(<CheckoutPage />);
    expect(screen.getByText('购物车为空，无法结算')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '去购物' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/');
  });

  test('没有地址时拒绝提交订单', async () => {
    mocks.selectorState = { cart: { items: [{ id: 3, name: '键盘', price: 10, quantity: 2 }] } };
    render(<CheckoutPage />);
    await userEvent.click(screen.getByRole('button', { name: '提交订单' }));
    expect(await screen.findByText('请先新增并选择收货地址')).toBeInTheDocument();
    expect(mocks.orderApi.create).not.toHaveBeenCalled();
  });

  test('普通订单提交商品、地址和支付方式并清空购物车', async () => {
    mocks.selectorState = { cart: { items: [{ id: 3, name: '键盘', price: 12.5, quantity: 2 }] } };
    mocks.addresses = [{ id: 'a1', name: '张三', phone: '1', address: 'A', isDefault: true }];
    mocks.addressApi.getList.mockResolvedValue({ data: mocks.addresses });
    render(<CheckoutPage />);
    expect(screen.getAllByText('¥25.00')).toHaveLength(2);
    fireEvent.click(screen.getByDisplayValue('alipay'));
    await userEvent.click(screen.getByRole('button', { name: '提交订单' }));
    await waitFor(() => expect(mocks.orderApi.create).toHaveBeenCalledWith({
      items: [{ productId: 3, quantity: 2 }], shippingAddress: mocks.addresses[0], paymentMethod: 'alipay'
    }));
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'cart/clear' });
    expect(mocks.navigate).toHaveBeenCalledWith('/order');
  });

  test('议价订单携带凭证且不清空原购物车', async () => {
    const address = { id: 'a1', name: '张三', phone: '1', address: 'A', isDefault: true };
    mocks.addresses = [address];
    mocks.addressApi.getList.mockResolvedValue({ data: [address] });
    mocks.location = { state: { bargainPurchase: { id: 9, name: '二手书', price: 20, quantity: 1, bargainMessageId: 88 } } };
    render(<CheckoutPage />);
    expect(screen.getByText('议价成交价')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '提交订单' }));
    await waitFor(() => expect(mocks.orderApi.create).toHaveBeenCalledWith(expect.objectContaining({
      items: [{ productId: 9, quantity: 1, bargainMessageId: 88 }]
    })));
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  test('地址同步和订单提交失败时展示可操作错误', async () => {
    mocks.selectorState = { cart: { items: [{ id: 3, name: '键盘', price: 10, quantity: 1 }] } };
    mocks.addressApi.replaceAll.mockRejectedValue(new Error('offline'));
    mocks.orderApi.create.mockRejectedValue({ response: { data: { message: '库存不足' } } });
    render(<CheckoutPage />);
    await userEvent.click(screen.getByRole('button', { name: '模拟新增地址' }));
    expect(await screen.findByText('地址已临时保存到本地，连接后端后会再次同步')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '选择新地址' }));
    await userEvent.click(screen.getByRole('button', { name: '提交订单' }));
    expect(await screen.findByText('库存不足')).toBeInTheDocument();
  });
});
