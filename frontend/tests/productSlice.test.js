import { describe, expect, test } from 'vitest';

import reducer, {
  clearSearchResults,
  getProductDetail,
  getProducts,
  searchProducts
} from '../src/store/productSlice.js';

const baseState = reducer(undefined, { type: '@@test/init' });

describe('product state management', () => {
  test('fulfilled product list replaces the current list', () => {
    const state = reducer(
      { ...baseState, loading: true },
      getProducts.fulfilled([{ id: 1, name: 'Product A', price: 10, evaluationCount: 0, productType: 1 }])
    );
    expect(state.loading).toBe(false);
    expect(state.products[0]).toMatchObject({ id: 1, evaluationCount: 0, productType: 1 });
  });

  test('pending product list marks loading only when list is empty', () => {
    const state = reducer({ ...baseState, products: [], loading: false }, getProducts.pending('request-1'));
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  test('fulfilled search replaces results', () => {
    const state = reducer(
      { ...baseState, searchLoading: true },
      searchProducts.fulfilled([{ id: 2, name: 'Search result', price: 20, evaluationCount: 0, productType: 1 }])
    );
    expect(state.searchLoading).toBe(false);
    expect(state.searchResults[0]).toMatchObject({ id: 2, evaluationCount: 0, productType: 1 });
  });

  test('clearSearchResults keeps the main product list', () => {
    const state = reducer({ ...baseState, searchResults: [{ id: 2 }] }, clearSearchResults());
    expect(state.searchResults).toEqual([]);
    expect(state.products).toEqual(baseState.products);
  });

  test('fulfilled product detail sets current product', () => {
    const state = reducer(
      { ...baseState, loading: true },
      getProductDetail.fulfilled({ id: 3, name: 'Detail product', price: 30, evaluationCount: 0, productType: 1 })
    );
    expect(state.loading).toBe(false);
    expect(state.currentProduct).toMatchObject({ id: 3, evaluationCount: 0, productType: 1 });
  });

  test('rejected product detail stores supplied error', () => {
    const state = reducer(
      { ...baseState, loading: true },
      getProductDetail.rejected(new Error('not found'), 'request-1', 999, { message: 'not found' })
    );
    expect(state.loading).toBe(false);
    expect(state.error).toEqual({ message: 'not found' });
  });
});
