import { beforeEach, describe, expect, test } from 'vitest';
import cartReducer, {
  addToCart,
  clearCart,
  getCartStorageKey,
  loadCartItems,
  removeFromCart,
  switchCartOwner,
  updateQuantity
} from '../src/store/cartSlice';
import productReducer, {
  clearSearchResults,
  getProductDetail,
  getProducts,
  getRecommendedProducts,
  searchProducts
} from '../src/store/productSlice';

const cases = [];
const add = (name, run, expected) => cases.push({ name, run, expected });
const cartState = items => ({ items, storageKey: 'shopping-cart:guest', loading: false, error: null });
const productState = () => productReducer(undefined, { type: '@@regression/init' });

describe('REG-FE-100 frontend regression cases', () => {
  beforeEach(() => window.localStorage.clear());

  [
    ['guest default', () => getCartStorageKey(), 'shopping-cart:guest'],
    ['null user', () => getCartStorageKey(null), 'shopping-cart:guest'],
    ['id user', () => getCartStorageKey({ id: 7 }), 'shopping-cart:user:7'],
    ['string id', () => getCartStorageKey({ id: 'buyer-7' }), 'shopping-cart:user:buyer-7'],
    ['id wins', () => getCartStorageKey({ id: 7, email: 'buyer@example.com' }), 'shopping-cart:user:7'],
    ['underscore id', () => getCartStorageKey({ _id: 'mongo-7' }), 'shopping-cart:user:mongo-7'],
    ['email fallback', () => getCartStorageKey({ email: 'buyer@example.com' }), 'shopping-cart:user:buyer@example.com'],
    ['username fallback', () => getCartStorageKey({ username: 'buyer' }), 'shopping-cart:user:buyer'],
    ['missing storage', () => loadCartItems(), []],
    ['malformed storage', () => { localStorage.setItem('shopping-cart:guest', '{'); return loadCartItems(); }, []],
    ['non array storage', () => { localStorage.setItem('shopping-cart:guest', '{}'); return loadCartItems(); }, []],
    ['valid item storage', () => { localStorage.setItem('shopping-cart:guest', JSON.stringify([{ id: 1, quantity: 2 }])); return loadCartItems(); }, [{ id: 1, quantity: 2 }]],
    ['missing id filtered', () => { localStorage.setItem('shopping-cart:guest', JSON.stringify([{ name: 'missing' }])); return loadCartItems(); }, []],
    ['null item filtered', () => { localStorage.setItem('shopping-cart:guest', JSON.stringify([null, { id: 1 }])); return loadCartItems(); }, [{ id: 1, quantity: 1 }]],
    ['zero quantity normalized', () => { localStorage.setItem('shopping-cart:guest', JSON.stringify([{ id: 1, quantity: 0 }])); return loadCartItems(); }, [{ id: 1, quantity: 1 }]],
    ['negative quantity normalized', () => { localStorage.setItem('shopping-cart:guest', JSON.stringify([{ id: 1, quantity: -2 }])); return loadCartItems(); }, [{ id: 1, quantity: 1 }]],
    ['string quantity normalized', () => { localStorage.setItem('shopping-cart:guest', JSON.stringify([{ id: 1, quantity: '3' }])); return loadCartItems(); }, [{ id: 1, quantity: 3 }]],
    ['legacy fallback', () => { localStorage.setItem('shopping-cart', JSON.stringify([{ id: 9, quantity: 2 }])); return loadCartItems('shopping-cart:user:9'); }, [{ id: 9, quantity: 2 }]],
    ['saved beats legacy', () => { localStorage.setItem('shopping-cart', JSON.stringify([{ id: 9 }])); localStorage.setItem('shopping-cart:user:9', JSON.stringify([{ id: 10, quantity: 2 }])); return loadCartItems('shopping-cart:user:9'); }, [{ id: 10, quantity: 2 }]],
    ['guest ignores legacy', () => { localStorage.setItem('shopping-cart', JSON.stringify([{ id: 9 }])); return loadCartItems('shopping-cart:guest'); }, []]
  ].forEach(([name, run, expected]) => add(`storage ${name}`, run, expected));

  [
    ['add item', () => cartReducer(cartState([]), addToCart({ id: 1, name: 'a', quantity: 1 })), cartState([{ id: 1, name: 'a', quantity: 1 }])],
    ['add default quantity', () => cartReducer(cartState([]), addToCart({ id: 1 })), cartState([{ id: 1, quantity: 1 }])],
    ['add requested quantity', () => cartReducer(cartState([]), addToCart({ id: 1, quantity: 3 })), cartState([{ id: 1, quantity: 3 }])],
    ['add invalid quantity', () => cartReducer(cartState([]), addToCart({ id: 1, quantity: 'bad' })).items[0].quantity, 1],
    ['add stock clamp', () => cartReducer(cartState([]), addToCart({ id: 1, quantity: 5, stock: 2 })).items[0].quantity, 2],
    ['add zero stock', () => cartReducer(cartState([]), addToCart({ id: 1, quantity: 1, stock: 0 })).items, []],
    ['increment existing', () => cartReducer(cartState([{ id: 1, quantity: 1, stock: 5 }]), addToCart({ id: 1, quantity: 2, stock: 5 })).items[0].quantity, 3],
    ['increment clamps stock', () => cartReducer(cartState([{ id: 1, quantity: 4, stock: 5 }]), addToCart({ id: 1, quantity: 3, stock: 5 })).items[0].quantity, 5],
    ['refresh existing stock', () => cartReducer(cartState([{ id: 1, quantity: 1, stock: 5 }]), addToCart({ id: 1, quantity: 1, stock: 2 })).items[0].stock, 2],
    ['remove item', () => cartReducer(cartState([{ id: 1 }, { id: 2 }]), removeFromCart(1)).items, [{ id: 2 }]],
    ['remove missing item', () => cartReducer(cartState([{ id: 1 }]), removeFromCart(2)).items, [{ id: 1 }]],
    ['update quantity', () => cartReducer(cartState([{ id: 1, quantity: 1 }]), updateQuantity({ id: 1, quantity: 4 })).items[0].quantity, 4],
    ['update clamps stock', () => cartReducer(cartState([{ id: 1, quantity: 1, stock: 3 }]), updateQuantity({ id: 1, quantity: 8 })).items[0].quantity, 3],
    ['update fractional floors', () => cartReducer(cartState([{ id: 1, quantity: 1, stock: 9 }]), updateQuantity({ id: 1, quantity: 3.8 })).items[0].quantity, 3],
    ['update zero removes', () => cartReducer(cartState([{ id: 1 }]), updateQuantity({ id: 1, quantity: 0 })).items, []],
    ['update negative removes', () => cartReducer(cartState([{ id: 1 }]), updateQuantity({ id: 1, quantity: -1 })).items, []],
    ['update invalid preserves', () => cartReducer(cartState([{ id: 1, quantity: 2 }]), updateQuantity({ id: 1, quantity: 'bad' })).items[0].quantity, 2],
    ['update missing preserves', () => cartReducer(cartState([{ id: 1, quantity: 2 }]), updateQuantity({ id: 2, quantity: 4 })).items, [{ id: 1, quantity: 2 }]],
    ['update zero stock removes', () => cartReducer(cartState([{ id: 1, quantity: 2, stock: 0 }]), updateQuantity({ id: 1, quantity: 1 })).items, []],
    ['clear items', () => cartReducer(cartState([{ id: 1 }]), clearCart()).items, []],
    ['switch guest owner', () => cartReducer(cartState([{ id: 1 }]), switchCartOwner(null)).storageKey, 'shopping-cart:guest'],
    ['switch user owner', () => cartReducer(cartState([{ id: 1 }]), switchCartOwner({ id: 7 })).storageKey, 'shopping-cart:user:7'],
    ['switch loads user cart', () => { localStorage.setItem('shopping-cart:user:7', JSON.stringify([{ id: 2, quantity: 2 }])); return cartReducer(cartState([{ id: 1 }]), switchCartOwner({ id: 7 })).items; }, [{ id: 2, quantity: 2 }]],
    ['switch missing user cart', () => cartReducer(cartState([{ id: 1 }]), switchCartOwner({ id: 7 })).items, []],
    ['add keeps extra fields', () => cartReducer(cartState([]), addToCart({ id: 1, price: 10, sellerName: 'seller' })).items[0].sellerName, 'seller'],
    ['add stock string clamps', () => cartReducer(cartState([]), addToCart({ id: 1, quantity: 4, stock: '2' })).items[0].quantity, 2],
    ['add decimal stock floors', () => cartReducer(cartState([]), addToCart({ id: 1, quantity: 4, stock: 2.9 })).items[0].quantity, 2],
    ['add decimal quantity floors on existing', () => cartReducer(cartState([{ id: 1, quantity: 1, stock: 9 }]), addToCart({ id: 1, quantity: 2.9 })).items[0].quantity, 3],
    ['remove all matching id', () => cartReducer(cartState([{ id: 1, n: 1 }, { id: 1, n: 2 }]), removeFromCart(1)).items, []],
    ['clear preserves storage key', () => cartReducer(cartState([{ id: 1 }]), clearCart()).storageKey, 'shopping-cart:guest'],
    ['add preserves loading flag', () => cartReducer({ ...cartState([]), loading: true }, addToCart({ id: 1 })).loading, true],
    ['add preserves error flag', () => cartReducer({ ...cartState([]), error: 'old' }, addToCart({ id: 1 })).error, 'old'],
    ['clear preserves error flag', () => cartReducer({ ...cartState([{ id: 1 }]), error: 'old' }, clearCart()).error, 'old'],
    ['update unknown id no resize', () => cartReducer(cartState([{ id: 1 }]), updateQuantity({ id: 2, quantity: 2 })).items.length, 1],
    ['remove empty stays empty', () => cartReducer(cartState([]), removeFromCart(1)).items, []],
    ['clear empty stays empty', () => cartReducer(cartState([]), clearCart()).items, []],
    ['switch owner replaces old items', () => { localStorage.setItem('shopping-cart:user:3', JSON.stringify([{ id: 3 }])); return cartReducer(cartState([{ id: 1 }]), switchCartOwner({ id: 3 })).items[0].id; }, 3],
    ['add to item without stock', () => cartReducer(cartState([{ id: 1, quantity: 1 }]), addToCart({ id: 1, quantity: 2 })).items[0].quantity, 3]
  ].forEach(([name, run, expected]) => add(`cart reducer ${name}`, run, expected));

  [
    ['initial products exist', () => productState().products.length > 0, true],
    ['initial recommendations exist', () => productState().recommendedProducts.length > 0, true],
    ['initial loading false', () => productState().loading, false],
    ['initial search loading false', () => productState().searchLoading, false],
    ['initial current product null', () => productState().currentProduct, null],
    ['clear search results', () => productReducer({ ...productState(), searchResults: [{ id: 1 }] }, clearSearchResults()).searchResults, []],
    ['products pending keeps nonempty loading false', () => productReducer(productState(), getProducts.pending('1')).loading, false],
    ['products pending empty loading true', () => productReducer({ ...productState(), products: [] }, getProducts.pending('1')).loading, true],
    ['products pending clears error', () => productReducer({ ...productState(), error: 'old' }, getProducts.pending('1')).error, null],
    ['products fulfilled replaces list', () => productReducer(productState(), getProducts.fulfilled([{ id: 4, name: 'new' }])).products, [{ id: 4, name: 'new', evaluationCount: 0, productType: 1 }]],
    ['products fulfilled stops loading', () => productReducer({ ...productState(), loading: true }, getProducts.fulfilled([])).loading, false],
    ['products normalized review count', () => productReducer(productState(), getProducts.fulfilled([{ id: 4, name: 'new', reviewCount: 7 }])).products[0].evaluationCount, 7],
    ['products normalized secondhand', () => productReducer(productState(), getProducts.fulfilled([{ id: 4, name: 'new', isSecondhand: true }])).products[0].productType, 2],
    ['products filters broken name', () => productReducer(productState(), getProducts.fulfilled([{ id: 1, name: '??' }, { id: 2, name: 'ok' }])).products.length, 1],
    ['products accepts array payload', () => productReducer(productState(), getProducts.fulfilled([{ id: 2, name: 'ok' }])).products[0].id, 2],
    ['products rejects object payload', () => productReducer(productState(), getProducts.rejected(new Error('x'), '1')).error, undefined],
    ['search pending flag', () => productReducer(productState(), searchProducts.pending('1')).searchLoading, true],
    ['search pending clears error', () => productReducer({ ...productState(), searchError: 'old' }, searchProducts.pending('1')).searchError, null],
    ['search fulfilled list', () => productReducer(productState(), searchProducts.fulfilled([{ id: 5, name: 'result' }])).searchResults[0].id, 5],
    ['search fulfilled stops loading', () => productReducer({ ...productState(), searchLoading: true }, searchProducts.fulfilled([])).searchLoading, false],
    ['search normalized type', () => productReducer(productState(), searchProducts.fulfilled([{ id: 5, name: 'result', isSecondhand: true }])).searchResults[0].productType, 2],
    ['search filters broken name', () => productReducer(productState(), searchProducts.fulfilled([{ id: 1, name: '??' }, { id: 2, name: 'ok' }])).searchResults.length, 1],
    ['search rejected stops loading', () => productReducer({ ...productState(), searchLoading: true }, searchProducts.rejected(new Error('x'), '1', {}, { message: 'bad' })).searchLoading, false],
    ['search rejected stores payload', () => productReducer(productState(), searchProducts.rejected(new Error('x'), '1', {}, { message: 'bad' })).searchError, { message: 'bad' }],
    ['detail pending loading', () => productReducer(productState(), getProductDetail.pending('1')).loading, true],
    ['detail pending clears error', () => productReducer({ ...productState(), error: 'old' }, getProductDetail.pending('1')).error, null],
    ['detail fulfilled current product', () => productReducer(productState(), getProductDetail.fulfilled({ id: 6, name: 'detail' })).currentProduct.id, 6],
    ['detail fulfilled stops loading', () => productReducer({ ...productState(), loading: true }, getProductDetail.fulfilled({ id: 6, name: 'detail' })).loading, false],
    ['detail normalized evaluation count', () => productReducer(productState(), getProductDetail.fulfilled({ id: 6, name: 'detail', reviewCount: 3 })).currentProduct.evaluationCount, 3],
    ['detail normalized type', () => productReducer(productState(), getProductDetail.fulfilled({ id: 6, name: 'detail', isSecondhand: true })).currentProduct.productType, 2],
    ['detail rejected stops loading', () => productReducer({ ...productState(), loading: true }, getProductDetail.rejected(new Error('x'), '1', 7, { message: 'bad' })).loading, false],
    ['detail rejected stores error', () => productReducer(productState(), getProductDetail.rejected(new Error('x'), '1', 7, { message: 'bad' })).error, { message: 'bad' }],
    ['recommended pending nonempty', () => productReducer(productState(), getRecommendedProducts.pending('1')).loading, false],
    ['recommended pending empty', () => productReducer({ ...productState(), recommendedProducts: [] }, getRecommendedProducts.pending('1')).loading, true],
    ['recommended pending clears error', () => productReducer({ ...productState(), error: 'old' }, getRecommendedProducts.pending('1')).error, null],
    ['recommended fulfilled list', () => productReducer(productState(), getRecommendedProducts.fulfilled([{ id: 8, name: 'recommended' }])).recommendedProducts[0].id, 8],
    ['recommended fulfilled stops loading', () => productReducer({ ...productState(), loading: true }, getRecommendedProducts.fulfilled([])).loading, false],
    ['recommended normalized count', () => productReducer(productState(), getRecommendedProducts.fulfilled([{ id: 8, name: 'recommended', reviewCount: 4 }])).recommendedProducts[0].evaluationCount, 4],
    ['recommended filters broken name', () => productReducer(productState(), getRecommendedProducts.fulfilled([{ id: 1, name: '??' }, { id: 2, name: 'ok' }])).recommendedProducts.length, 1],
    ['clear results retains products', () => productReducer({ ...productState(), searchResults: [{ id: 1 }] }, clearSearchResults()).products.length > 0, true],
    ['fulfilled empty products', () => productReducer(productState(), getProducts.fulfilled([])).products, []],
    ['fulfilled empty search', () => productReducer(productState(), searchProducts.fulfilled([])).searchResults, []],
    ['fulfilled empty recommendations', () => productReducer(productState(), getRecommendedProducts.fulfilled([])).recommendedProducts, []]
  ].forEach(([name, run, expected]) => add(`product reducer ${name}`, run, expected));

  expect(cases.length).toBe(100);

  cases.forEach((scenario, index) => {
    test(`REG-FE-${String(index + 1).padStart(3, '0')}: ${scenario.name}`, () => {
      expect(scenario.run()).toEqual(scenario.expected);
    });
  });
});
