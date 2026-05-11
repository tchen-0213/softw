import { createSlice } from '@reduxjs/toolkit';

const CART_STORAGE_KEY = 'shopping-cart';

const loadCartItems = () => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const savedItems = window.localStorage.getItem(CART_STORAGE_KEY);
    const parsedItems = savedItems ? JSON.parse(savedItems) : [];

    return Array.isArray(parsedItems)
      ? parsedItems
          .filter(item => item && item.id !== undefined)
          .map(item => ({
            ...item,
            quantity: Math.max(1, Number(item.quantity) || 1)
          }))
      : [];
  } catch {
    return [];
  }
};

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: loadCartItems(),
    loading: false,
    error: null
  },
  reducers: {
    addToCart: (state, action) => {
      const quantity = Math.max(1, Number(action.payload.quantity) || 1);
      const existingItem = state.items.find(item => item.id === action.payload.id);
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push({
          ...action.payload,
          quantity
        });
      }
    },
    removeFromCart: (state, action) => {
      state.items = state.items.filter(item => item.id !== action.payload);
    },
    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      const nextQuantity = Number(quantity);
      if (!Number.isFinite(nextQuantity)) {
        return;
      }

      if (nextQuantity <= 0) {
        state.items = state.items.filter(item => item.id !== id);
        return;
      }

      const item = state.items.find(item => item.id === id);
      if (item) {
        item.quantity = Math.max(1, Math.floor(nextQuantity));
      }
    },
    clearCart: (state) => {
      state.items = [];
    }
  }
});

export const { addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
