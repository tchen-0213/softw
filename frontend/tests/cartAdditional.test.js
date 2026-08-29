import { describe, expect, test } from 'vitest';

import reducer, {
  addToCart,
  clearCart,
  removeFromCart,
  switchCartOwner,
  updateQuantity
} from '../src/store/cartSlice.js';

const product = { id: 201, name: 'Test product', price: 20, stock: 3 };

describe('cart edge cases', () => {
  test('invalid add quantity defaults to one', () => {
    const state = reducer(undefined, addToCart({ ...product, quantity: 'invalid' }));
    expect(state.items[0].quantity).toBe(1);
  });

  test('update quantity is clamped to stock', () => {
    const state = reducer(
      reducer(undefined, addToCart({ ...product, quantity: 1 })),
      updateQuantity({ id: product.id, quantity: 99 })
    );
    expect(state.items[0].quantity).toBe(product.stock);
  });

  test('non-finite update leaves quantity unchanged', () => {
    const state = reducer(
      reducer(undefined, addToCart({ ...product, quantity: 2 })),
      updateQuantity({ id: product.id, quantity: Number.NaN })
    );
    expect(state.items[0].quantity).toBe(2);
  });

  test('removing one item preserves other items', () => {
    let state = reducer(undefined, addToCart({ ...product, quantity: 1 }));
    state = reducer(state, addToCart({ ...product, id: 202, quantity: 1 }));
    state = reducer(state, removeFromCart(product.id));
    expect(state.items.map(item => item.id)).toEqual([202]);
  });

  test('clearCart removes every item', () => {
    let state = reducer(undefined, addToCart({ ...product, quantity: 1 }));
    state = reducer(state, addToCart({ ...product, id: 202, quantity: 1 }));
    expect(reducer(state, clearCart()).items).toEqual([]);
  });

  test('switchCartOwner selects a user-specific storage key', () => {
    const state = reducer(undefined, switchCartOwner({ id: 'user-42' }));
    expect(state.storageKey).toBe('shopping-cart:user:user-42');
    expect(state.items).toEqual([]);
  });
});
