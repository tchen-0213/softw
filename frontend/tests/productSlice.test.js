import { configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const productApi = vi.hoisted(() => ({
  getList: vi.fn(),
  search: vi.fn(),
  getDetail: vi.fn(),
  getRecommended: vi.fn()
}));

vi.mock('../src/services/api.js', () => ({ productApi }));

import reducer, {
  clearSearchResults,
  getProductDetail,
  getProducts,
  getRecommendedProducts,
  searchProducts
} from '../src/store/productSlice.js';

const createStore = () => configureStore({ reducer: { product: reducer } });

describe('商品 Redux 状态', () => {
  beforeEach(() => vi.clearAllMocks());

  test('列表请求映射筛选参数、规范字段并过滤乱码商品', async () => {
    productApi.getList.mockResolvedValue({ data: { products: [
      { id: 1, name: '正常商品', reviewCount: 3, isSecondhand: true },
      { id: 2, name: '??' },
      { id: 3, name: '   ' }
    ] } });
    const store = createStore();
    await store.dispatch(getProducts({ size: 8, priceMin: 10, priceMax: 99, productType: '2' }));
    expect(productApi.getList).toHaveBeenCalledWith({ limit: 8, minPrice: 10, maxPrice: 99, isSecondhand: true });
    expect(store.getState().product.products).toEqual([
      expect.objectContaining({ id: 1, evaluationCount: 3, productType: 2 })
    ]);
  });

  test('列表和推荐接口断网时使用演示数据', async () => {
    productApi.getList.mockRejectedValue(new Error('offline'));
    productApi.getRecommended.mockRejectedValue(new Error('offline'));
    const store = createStore();
    await store.dispatch(getProducts({}));
    await store.dispatch(getRecommendedProducts());
    expect(store.getState().product.products.length).toBeGreaterThan(0);
    expect(store.getState().product.recommendedProducts.length).toBeGreaterThan(0);
  });

  test('搜索成功更新结果，清除动作会重置结果', async () => {
    productApi.search.mockResolvedValue({ data: [{ id: 5, name: '键盘', evaluationCount: 1 }] });
    const store = createStore();
    await store.dispatch(searchProducts({ keyword: '键盘', productType: 1 }));
    expect(productApi.search).toHaveBeenCalledWith({ keyword: '键盘', limit: undefined, isSecondhand: false });
    expect(store.getState().product.searchResults[0].name).toBe('键盘');
    store.dispatch(clearSearchResults());
    expect(store.getState().product.searchResults).toEqual([]);
  });

  test('搜索断网时按关键词、分类、价格和类型筛选演示数据', async () => {
    productApi.search.mockRejectedValue(new Error('offline'));
    const store = createStore();
    const action = await store.dispatch(searchProducts({ keyword: '手机', minPrice: 0, maxPrice: 99999, category: 'electronics', productType: '1' }));
    expect(action.type).toContain('/fulfilled');
    expect(store.getState().product.searchResults.every(item => item.name.includes('手机'))).toBe(true);
  });

  test('服务端搜索错误进入 rejected 状态并保留错误信息', async () => {
    productApi.search.mockRejectedValue({ response: { data: { message: '参数错误' } } });
    const store = createStore();
    await store.dispatch(searchProducts({ keyword: 'x' }));
    expect(store.getState().product.searchError).toEqual({ message: '参数错误' });
    expect(store.getState().product.searchLoading).toBe(false);
  });

  test('详情成功规范字段，断网时可回退到演示商品', async () => {
    productApi.getDetail.mockResolvedValueOnce({ data: { id: 77, name: '详情', reviewCount: 4 } });
    const store = createStore();
    await store.dispatch(getProductDetail(77));
    expect(store.getState().product.currentProduct).toEqual(expect.objectContaining({ evaluationCount: 4, productType: 1 }));

    productApi.getDetail.mockRejectedValueOnce(new Error('offline'));
    await store.dispatch(getProductDetail(1));
    expect(store.getState().product.currentProduct.id).toBe(1);
  });

  test('不存在的详情会暴露服务端错误', async () => {
    productApi.getDetail.mockRejectedValueOnce({ response: { data: { message: '不存在' } } });
    const store = createStore();
    await store.dispatch(getProductDetail(999999));
    expect(store.getState().product.error).toEqual({ message: '不存在' });
  });
});
