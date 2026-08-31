import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(), state: { product: { searchResults: [], searchLoading: false, searchError: null } },
  searchProducts: vi.fn(payload => ({ type: 'product/search', payload }))
}));
vi.mock('react-redux', () => ({ useDispatch: () => mocks.dispatch, useSelector: selector => selector(mocks.state) }));
vi.mock('../src/store/productSlice.js', () => ({ searchProducts: mocks.searchProducts }));
vi.mock('../src/components/product/SearchResults.jsx', () => ({ default: ({ results, loading, error }) => <div>结果:{results.length}/{String(loading)}/{String(error)}</div> }));
vi.mock('../src/components/product/FilterPanel.jsx', () => ({ default: ({ filters, onFilterChange }) => <button onClick={() => onFilterChange({ category: 'books', productType: '2', minPrice: '10', maxPrice: '50' })}>筛选:{filters.category || 'all'}</button> }));
vi.mock('../src/components/product/SortBar.jsx', () => ({ default: ({ sortBy, onSortChange }) => <button onClick={() => onSortChange('sales')}>排序:{sortBy}</button> }));

import SearchPage from '../src/pages/search/SearchPage.jsx';
const Probe = () => { const location = useLocation(); return <output>{location.search}</output>; };

describe('搜索结果页面', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.state.product = { searchResults: [], searchLoading: false, searchError: null }; });

  test('从 URL 恢复条件、显示分类标题并发起搜索', async () => {
    render(<MemoryRouter initialEntries={['/search?keyword=教材&category=books&minPrice=5']}><SearchPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: '图书教材' })).toBeInTheDocument();
    await waitFor(() => expect(mocks.dispatch).toHaveBeenCalledWith({
      type: 'product/search', payload: { keyword: '教材', sortBy: 'default', category: 'books', productType: '', minPrice: '5', maxPrice: '' }
    }));
  });

  test('排序变化会按新排序重新搜索', async () => {
    render(<MemoryRouter initialEntries={['/search?keyword=手机']}><SearchPage /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: '排序:default' }));
    await waitFor(() => expect(mocks.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ keyword: '手机', sortBy: 'sales' })));
  });

  test('筛选变化同步到 URL 并显示二手市场标题', async () => {
    render(<MemoryRouter initialEntries={['/search?keyword=书']}><SearchPage /><Probe /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: '筛选:all' }));
    await waitFor(() => expect(screen.getByText(/category=books/)).toBeInTheDocument());
    expect(screen.getByText(/productType=2/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '二手市场' })).toBeInTheDocument();
  });
});
