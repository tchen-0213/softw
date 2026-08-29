import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import FilterPanel from '../src/components/product/FilterPanel.jsx';
import SearchBar from '../src/components/product/SearchBar.jsx';
import SearchResults from '../src/components/product/SearchResults.jsx';
import SortBar from '../src/components/product/SortBar.jsx';

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
};

describe('商品检索组件', () => {
  test('搜索框忽略空白并对关键词编码导航', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><SearchBar /><LocationProbe /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: '搜索' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/');
    await user.type(screen.getByLabelText('搜索商品'), '二手 手机');
    await user.click(screen.getByRole('button', { name: '搜索' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/search?keyword=%E4%BA%8C%E6%89%8B%20%E6%89%8B%E6%9C%BA');
  });

  test('排序项显示选中态并回传选择', async () => {
    const onSortChange = vi.fn();
    const user = userEvent.setup();
    render(<SortBar sortBy="price_asc" onSortChange={onSortChange} />);
    expect(screen.getByText('价格从低到高')).toHaveClass('active');
    await user.click(screen.getByText('销量优先'));
    expect(onSortChange).toHaveBeenCalledWith('sales');
  });

  test('筛选面板同步外部值并提交完整条件', () => {
    const onFilterChange = vi.fn();
    const { rerender } = render(<FilterPanel filters={{ minPrice: '10', category: 'books' }} onFilterChange={onFilterChange} />);
    fireEvent.change(screen.getByPlaceholderText('最高'), { target: { value: '88' } });
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: '应用筛选' }));
    expect(onFilterChange).toHaveBeenCalledWith({ minPrice: '10', maxPrice: '88', category: 'books', productType: '2' });

    rerender(<FilterPanel filters={{ minPrice: '', maxPrice: '', category: 'sports', productType: '1' }} onFilterChange={onFilterChange} />);
    expect(screen.getAllByRole('combobox')[0]).toHaveValue('sports');
  });

  test('结果组件覆盖加载、错误、空态与商品导航', async () => {
    const { rerender } = render(<MemoryRouter><SearchResults results={[]} loading error={null} /><LocationProbe /></MemoryRouter>);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
    rerender(<MemoryRouter><SearchResults results={[]} loading={false} error="bad" /><LocationProbe /></MemoryRouter>);
    expect(screen.getByText('搜索失败，请重试')).toBeInTheDocument();
    rerender(<MemoryRouter><SearchResults results={[]} loading={false} error={null} /><LocationProbe /></MemoryRouter>);
    expect(screen.getByText('没有找到相关商品')).toBeInTheDocument();
    rerender(<MemoryRouter><SearchResults results={[{ id: 5, name: '测试商品', price: 9, stock: 2 }]} loading={false} error={null} /><LocationProbe /></MemoryRouter>);
    expect(screen.getByText('未知卖家')).toBeInTheDocument();
    await userEvent.click(screen.getByText('测试商品'));
    expect(screen.getByTestId('location')).toHaveTextContent('/product/5');
  });
});
