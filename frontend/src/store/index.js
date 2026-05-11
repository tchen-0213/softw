import { configureStore } from '@reduxjs/toolkit';
import productReducer from './productSlice';
import cartReducer from './cartSlice';

const store = configureStore({
  reducer: {
    product: productReducer,
    cart: cartReducer
  }
});

const LEGACY_CART_STORAGE_KEY = 'shopping-cart';
let previousCart = store.getState().cart;

store.subscribe(() => {
  if (typeof window === 'undefined') {
    return;
  }

  const cart = store.getState().cart;
  if (cart.items === previousCart.items && cart.storageKey === previousCart.storageKey) {
    return;
  }

  previousCart = cart;
  window.localStorage.setItem(cart.storageKey, JSON.stringify(cart.items));
  window.localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
});

export default store;
