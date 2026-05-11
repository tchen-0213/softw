import { configureStore } from '@reduxjs/toolkit';
import productReducer from './productSlice';
import cartReducer from './cartSlice';

const store = configureStore({
  reducer: {
    product: productReducer,
    cart: cartReducer
  }
});

const CART_STORAGE_KEY = 'shopping-cart';
let previousCartItems = store.getState().cart.items;

store.subscribe(() => {
  if (typeof window === 'undefined') {
    return;
  }

  const cartItems = store.getState().cart.items;
  if (cartItems === previousCartItems) {
    return;
  }

  previousCartItems = cartItems;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
});

export default store;
