import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  search: '',
  orderApi: { getDetail: vi.fn() },
  evaluationApi: { getUserEvaluations: vi.fn(), create: vi.fn() },
  uploadApi: { uploadImages: vi.fn() }
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ orderId: '10' }),
  useNavigate: () => mocks.navigate,
  useSearchParams: () => [new URLSearchParams(mocks.search), vi.fn()]
}));

vi.mock('../src/services/api.js', () => ({
  orderApi: mocks.orderApi,
  evaluationApi: mocks.evaluationApi,
  uploadApi: mocks.uploadApi
}));

import EvaluationPage from '../src/pages/evaluation/EvaluationPage.jsx';

describe('评价订单页面', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.search = 'productId=5';
    localStorage.setItem('token', 'test-token');
    mocks.orderApi.getDetail.mockResolvedValue({
      data: {
        status: '已完成',
        items: [
          { productId: 5, name: '演示家居 护眼台灯', image: '/lamp.png' },
          { productId: 8, name: '演示运动 跑步腰包', image: '/bag.png' }
        ]
      }
    });
    mocks.evaluationApi.getUserEvaluations.mockResolvedValue({
      data: { evaluations: [] }
    });
  });

  test('加载完成前不展示占位商品', async () => {
    let resolveOrder;
    mocks.orderApi.getDetail.mockReturnValue(new Promise(resolve => {
      resolveOrder = resolve;
    }));

    render(<EvaluationPage />);

    expect(screen.getByText('正在加载订单评价...')).toBeInTheDocument();
    expect(screen.queryByText('全新 iPhone 15 Pro')).not.toBeInTheDocument();
    expect(screen.queryByText('AirPods Pro 2')).not.toBeInTheDocument();

    resolveOrder({
      data: {
        status: '已完成',
        items: [{ productId: 5, name: '演示家居 护眼台灯', image: '/lamp.png' }]
      }
    });

    expect(await screen.findByText('演示家居 护眼台灯')).toBeInTheDocument();
  });

  test('已评价商品展示原评论而不是空白输入框', async () => {
    mocks.evaluationApi.getUserEvaluations.mockResolvedValue({
      data: {
        evaluations: [{
          id: 99,
          orderId: 10,
          productId: 5,
          rating: 5,
          content: '好用爱用',
          images: [],
          replies: [{ id: 'r1', role: 'buyer', content: '大家来买～' }]
        }]
      }
    });

    render(<EvaluationPage />);

    expect(await screen.findByText('好用爱用')).toBeInTheDocument();
    expect(screen.getByText('已评价')).toBeInTheDocument();
    expect(screen.getByText('大家来买～')).toBeInTheDocument();
    expect(screen.getByText('演示运动 跑步腰包')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '提交评价' })).toBeInTheDocument();
  });

  test('订单内商品都已评价时只展示历史评价', async () => {
    mocks.evaluationApi.getUserEvaluations.mockResolvedValue({
      data: {
        evaluations: [
          { id: 99, orderId: 10, productId: 5, rating: 5, content: '好用爱用', images: [], replies: [] },
          { id: 100, orderId: 10, productId: 8, rating: 4, content: '腰包不错', images: [], replies: [] }
        ]
      }
    });

    render(<EvaluationPage />);

    expect(await screen.findByText('好用爱用')).toBeInTheDocument();
    expect(screen.getByText('腰包不错')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '返回我的订单' })).toBeInTheDocument();
  });
});
