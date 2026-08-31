import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  loggedIn: true,
  userId: '9',
  orderApi: {
    getList: vi.fn(),
    cancel: vi.fn(),
    pay: vi.fn(),
    confirm: vi.fn()
  },
  shopApi: { getByUser: vi.fn() }
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => ({ userId: mocks.userId })
}));
vi.mock('../src/services/api.js', () => ({ orderApi: mocks.orderApi, shopApi: mocks.shopApi }));
vi.mock('../src/utils/accountStorage.js', () => ({ isLoggedIn: () => mocks.loggedIn }));
vi.mock('../src/components/credit/CreditBadge.jsx', () => ({
  default: ({ level, score }) => <span>信用：{level}/{score}</span>
}));

import OrderPage from '../src/pages/order/OrderPage.jsx';
import PublicShopPage from '../src/pages/shop/PublicShopPage.jsx';

const pendingOrder = {
  id: 21,
  status: '待付款',
  totalAmount: 88,
  createdAt: '2026-08-31T00:00:00.000Z',
  items: [{ productId: 7, name: '可取消商品', price: 88, quantity: 1 }]
};

describe('订单查询、取消与公开店铺页面', () => {
  beforeEach(() => {
    mocks.loggedIn = true;
    mocks.userId = '9';
    mocks.orderApi.getList.mockResolvedValue({ data: { orders: [pendingOrder] } });
    mocks.orderApi.cancel.mockResolvedValue({ data: { ...pendingOrder, status: '已取消' } });
    mocks.shopApi.getByUser.mockResolvedValue({
      data: {
        id: 3,
        name: '公开测试店铺',
        description: '公开资料可查询',
        creditLevel: '优秀',
        creditScore: 128,
        products: [{ id: 7, name: '公开商品', price: 66, stock: 2, status: '在售', images: [] }]
      }
    });
    vi.clearAllMocks();
  });

  test('UNIT-TC10/11: 展示订单和物流并将待付款订单更新为已取消', async () => {
    mocks.orderApi.getList.mockResolvedValue({
      data: {
        orders: [
          pendingOrder,
          {
            id: 22,
            status: '待收货',
            totalAmount: 66,
            createdAt: '2026-08-31T01:00:00.000Z',
            items: [{ productId: 8, name: '运输中商品', price: 66, quantity: 1 }],
            logistics: {
              company: '顺丰速运',
              trackingNumber: 'SF20260831',
              status: '运输中',
              steps: [{ time: '10:00', description: '卖家已发货' }]
            }
          }
        ]
      }
    });

    render(<OrderPage />);
    expect(await screen.findByText('可取消商品')).toBeInTheDocument();
    expect(screen.getByText(/顺丰速运 SF20260831/)).toBeInTheDocument();
    expect(screen.getByText('10:00 - 卖家已发货')).toBeInTheDocument();

    const pendingCard = screen.getByText('可取消商品').closest('.order-card');
    await userEvent.click(within(pendingCard).getByRole('button', { name: '取消订单' }));

    await waitFor(() => expect(mocks.orderApi.cancel).toHaveBeenCalledWith(21));
    expect(within(pendingCard).getByText('已取消')).toBeInTheDocument();
  });

  test('UNIT-TC12: 公开店铺展示资料、信用和本人在售商品', async () => {
    render(<PublicShopPage />);

    expect(await screen.findByRole('heading', { name: '公开测试店铺' })).toBeInTheDocument();
    expect(mocks.shopApi.getByUser).toHaveBeenCalledWith('9');
    expect(screen.getByText('信用：优秀/128')).toBeInTheDocument();
    expect(screen.getByText('公开商品')).toBeInTheDocument();
    expect(screen.getByText('在售商品 1 件')).toBeInTheDocument();

    await userEvent.click(screen.getByText('公开商品'));
    expect(mocks.navigate).toHaveBeenCalledWith('/product/7');
  });

  test('UNIT-TC12-ERR: 公开店铺不存在时显示服务端错误', async () => {
    mocks.shopApi.getByUser.mockRejectedValue({ response: { data: { message: '店铺不存在' } } });
    render(<PublicShopPage />);
    expect(await screen.findByText('店铺不存在')).toBeInTheDocument();
  });
});
