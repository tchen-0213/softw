import { describe, expect, test } from 'vitest';

import reducer, {
  addToCart,
  clearCart,
  getCartStorageKey,
  loadCartItems,
  removeFromCart,
  switchCartOwner,
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

  test('按用户隔离购物车并兼容旧存储键', () => {
    localStorage.setItem('shopping-cart', JSON.stringify([{ ...product, quantity: 2 }]));
    expect(getCartStorageKey({ id: 7 })).toBe('shopping-cart:user:7');
    expect(getCartStorageKey()).toBe('shopping-cart:guest');
    expect(loadCartItems('shopping-cart:user:7')).toEqual([{ ...product, quantity: 2 }]);

    localStorage.setItem('shopping-cart:user:7', JSON.stringify([{ ...product, quantity: 0 }]));
    expect(loadCartItems('shopping-cart:user:7')[0].quantity).toBe(1);
  });

  test('损坏存储、无效条目和非数组输入会安全降级', () => {
    localStorage.setItem('bad-cart', '{bad json');
    expect(loadCartItems('bad-cart')).toEqual([]);
    localStorage.setItem('bad-cart', JSON.stringify([null, { name: '缺少 id' }, { id: 1 }]));
    expect(loadCartItems('bad-cart')).toEqual([{ id: 1, quantity: 1 }]);
    localStorage.setItem('bad-cart', JSON.stringify({ id: 1 }));
    expect(loadCartItems('bad-cart')).toEqual([]);
  });

  test('切换登录用户会加载对应购物车', () => {
    localStorage.setItem('shopping-cart:user:a@example.com', JSON.stringify([{ ...product, id: 9 }]));
    const state = reducer(undefined, switchCartOwner({ email: 'a@example.com' }));
    expect(state.storageKey).toBe('shopping-cart:user:a@example.com');
    expect(state.items[0].id).toBe(9);
  });

  test('数量输入取整、忽略非法值，并在库存归零时移除', () => {
    let state = reducer(undefined, addToCart({ ...product, quantity: 1 }));
    state = reducer(state, updateQuantity({ id: product.id, quantity: 2.9 }));
    expect(state.items[0].quantity).toBe(2);
    state = reducer(state, updateQuantity({ id: product.id, quantity: 'not-a-number' }));
    expect(state.items[0].quantity).toBe(2);
    state = {
      ...state,
      items: [{ ...state.items[0], stock: 0 }]
    };
    state = reducer(state, updateQuantity({ id: product.id, quantity: 1 }));
    expect(state.items).toEqual([]);
  });
});
