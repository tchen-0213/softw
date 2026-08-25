import { describe, expect, test } from 'vitest';

import reducer, {
  addToCart,
  clearCart,
  removeFromCart,
  updateQuantity
} from '../src/store/cartSlice.js';

const product = { id: 101, name: '测试商品', price: 20, stock: 3 };

describe('UC03 购物车业务规则', () => {
  test('UNIT-TC03: 加购会合并数量且不超过库存', () => {
    let state = reducer(undefined, clearCart());
    state = reducer(state, addToCart({ ...product, quantity: 2 }));
    state = reducer(state, addToCart({ ...product, quantity: 5 }));
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(3);
    expect(state.items[0].price * state.items[0].quantity).toBe(60);
  });

  test('UNIT-TC03-ERR: 数量为零时移除，零库存商品不能加入', () => {
    let state = reducer(undefined, addToCart({ ...product, quantity: 1 }));
    state = reducer(state, updateQuantity({ id: product.id, quantity: 0 }));
    expect(state.items).toEqual([]);
    state = reducer(state, addToCart({ ...product, id: 102, stock: 0, quantity: 1 }));
    expect(state.items).toHaveLength(0);
    state = reducer(state, removeFromCart(999));
    expect(state.items).toHaveLength(0);
  });
});
