import { createSlice } from '@reduxjs/toolkit';

const LEGACY_CART_STORAGE_KEY = 'shopping-cart';
const GUEST_CART_STORAGE_KEY = 'shopping-cart:guest';
const USER_CART_STORAGE_PREFIX = 'shopping-cart:user:';

const getStoredUser = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return JSON.parse(window.localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

const getUserKey = (user) => user?.id || user?._id || user?.email || user?.username;

export const getCartStorageKey = (user = getStoredUser()) => {
  const userKey = getUserKey(user);
  return userKey ? `${USER_CART_STORAGE_PREFIX}${userKey}` : GUEST_CART_STORAGE_KEY;
};

const normalizeCartItems = (items) => (
  Array.isArray(items)
    ? items
        .filter(item => item && item.id !== undefined)
        .map(item => ({
          ...item,
          quantity: Math.max(1, Number(item.quantity) || 1)
        }))
    : []
);

export const loadCartItems = (storageKey = getCartStorageKey()) => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const savedItems = window.localStorage.getItem(storageKey);
    const legacyItems = storageKey !== GUEST_CART_STORAGE_KEY
      ? window.localStorage.getItem(LEGACY_CART_STORAGE_KEY)
      : null;
    const sourceItems = savedItems ?? legacyItems;
    if (!sourceItems) {
      return [];
    }

    return normalizeCartItems(JSON.parse(sourceItems));
  } catch {
    return [];
  }
};

const initialStorageKey = getCartStorageKey();

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: loadCartItems(initialStorageKey),
    storageKey: initialStorageKey,
    loading: false,
    error: null
  },
  reducers: {
    switchCartOwner: (state, action) => {
      const storageKey = getCartStorageKey(action.payload);
      state.storageKey = storageKey;
      state.items = loadCartItems(storageKey);
    },
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

export const { switchCartOwner, addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
