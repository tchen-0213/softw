import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  state: { product: { currentProduct: null, loading: false, error: null }, cart: { items: [] } },
  dispatch: vi.fn(), navigate: vi.fn(), loggedIn: true, storedUser: { id: 1 },
  chatApi: { createConversation: vi.fn() },
  getProductDetail: vi.fn(id => ({ type: 'product/detail', payload: id })),
  addToCart: vi.fn(item => ({ type: 'cart/add', payload: item }))
}));
vi.mock('react-redux', () => ({ useSelector: selector => selector(mocks.state), useDispatch: () => mocks.dispatch }));
vi.mock('react-router-dom', () => ({ useParams: () => ({ id: '5' }), useNavigate: () => mocks.navigate }));
vi.mock('../src/store/productSlice.js', () => ({ getProductDetail: mocks.getProductDetail }));
vi.mock('../src/store/cartSlice.js', () => ({ addToCart: mocks.addToCart }));
vi.mock('../src/services/api.js', () => ({ chatApi: mocks.chatApi }));
vi.mock('../src/utils/accountStorage.js', () => ({
  getStoredUser: () => mocks.storedUser, getUserKey: user => user?.id, isLoggedIn: () => mocks.loggedIn
}));
vi.mock('../src/components/credit/CreditBadge.jsx', () => ({ default: ({ score }) => <span>信用:{score}</span> }));
vi.mock('../src/components/evaluation/EvaluationList.jsx', () => ({ default: ({ productId, onCountChange }) => <button onClick={() => onCountChange(7)}>评价列表:{productId}</button> }));

import ProductDetailPage from '../src/pages/product/ProductDetailPage.jsx';

const product = (overrides = {}) => ({
  id: 5, name: '测试商品', price: 99, stock: 3, status: '在售', evaluationCount: 2,
  images: [], seller: { id: 2, nickname: '卖家', creditScore: 120 }, ...overrides
});

describe('商品详情页面', () => {
  beforeEach(() => {
    mocks.state = { product: { currentProduct: product(), loading: false, error: null }, cart: { items: [] } };
    mocks.loggedIn = true; mocks.storedUser = { id: 1 };
    mocks.chatApi.createConversation.mockResolvedValue({ data: { id: 66 } });
    vi.clearAllMocks();
  });

  test('覆盖加载、错误和不存在三种状态', () => {
    mocks.state.product = { currentProduct: null, loading: true, error: null };
    const view = render(<ProductDetailPage />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
    mocks.state.product = { currentProduct: null, loading: false, error: 'bad' };
    view.rerender(<ProductDetailPage />);
    expect(screen.getByText('加载失败，请重试')).toBeInTheDocument();
    mocks.state.product = { currentProduct: null, loading: false, error: null };
    view.rerender(<ProductDetailPage />);
    expect(screen.getByText('商品不存在')).toBeInTheDocument();
  });

  test('首次加载详情并同步评价计数', async () => {
    render(<ProductDetailPage />);
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'product/detail', payload: '5' });
    expect(screen.getByText('评价: 2')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '评价列表:5' }));
    expect(screen.getByText('评价: 7')).toBeInTheDocument();
  });

  test('未登录时阻止加购并提供登录入口', async () => {
    mocks.loggedIn = false;
    render(<ProductDetailPage />);
    await userEvent.click(screen.getByRole('button', { name: '加入购物车' }));
    expect(screen.getByText('请先登录后再加入购物车')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '去登录' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/login');
  });

  test('登录用户可加购、立即购买和进入卖家店铺', async () => {
    render(<ProductDetailPage />);
    await userEvent.click(screen.getByRole('button', { name: '加入购物车' }));
    expect(mocks.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'cart/add' }));
    await userEvent.click(screen.getByRole('button', { name: '立即购买' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/checkout');
    await userEvent.click(screen.getAllByRole('button', { name: '卖家' })[1]);
    expect(mocks.navigate).toHaveBeenCalledWith('/shop/user/2');
  });

  test('购物车达到库存上限时不再加购', async () => {
    mocks.state.cart.items = [{ id: 5, quantity: 3 }];
    render(<ProductDetailPage />);
    await userEvent.click(screen.getByRole('button', { name: '加入购物车' }));
    expect(screen.getByText('库存仅剩 3 件，购物车中已达到库存上限')).toBeInTheDocument();
    expect(mocks.addToCart).not.toHaveBeenCalled();
  });

  test('私聊覆盖未登录、本人商品、成功和服务端失败', async () => {
    const view = render(<ProductDetailPage />);
    await userEvent.click(screen.getByRole('button', { name: '私聊商家' }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/chat/66'));

    mocks.storedUser = { id: 2 };
    view.rerender(<ProductDetailPage />);
    await userEvent.click(screen.getByRole('button', { name: '私聊商家' }));
    expect(screen.getByText('这是你自己的商品，无需私聊自己')).toBeInTheDocument();

    mocks.storedUser = { id: 1 };
    mocks.chatApi.createConversation.mockRejectedValue({ response: { data: { message: '禁止私聊' } } });
    view.rerender(<ProductDetailPage />);
    await userEvent.click(screen.getByRole('button', { name: '私聊商家' }));
    expect(await screen.findByText('禁止私聊')).toBeInTheDocument();
  });

  test('二手商品展示成色、瑕疵和议价状态', () => {
    mocks.state.product.currentProduct = product({ productType: 2, condition: 3, usageTime: '半年', location: '校内', hasDefect: true, defectDescription: '轻微划痕', bargainEnabled: false });
    render(<ProductDetailPage />);
    expect(screen.getByText('二手商品信息')).toBeInTheDocument();
    expect(screen.getByText('成色: 八成新')).toBeInTheDocument();
    expect(screen.getByText('瑕疵描述: 轻微划痕')).toBeInTheDocument();
    expect(screen.getByText('不支持议价')).toBeInTheDocument();
  });
});
