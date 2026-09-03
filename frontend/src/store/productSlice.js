import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { productApi } from '../services/api';
import { mockProducts, recommendedProducts as mockRecommendedProducts, hotProducts } from '../data/mockProducts';

const normalizeProduct = (product) => ({
  ...product,
  evaluationCount: product.evaluationCount ?? product.reviewCount ?? 0,
  productType: product.productType ?? (product.isSecondhand ? 2 : 1)
});

const isDisplayableProduct = (product) => {
  const name = product.name || '';
  return name.trim().length > 0 && !/(\?{2,}|�)/.test(name);
};

const normalizeList = (data) => {
  const products = Array.isArray(data) ? data : data.products || [];
  return products.map(normalizeProduct).filter(isDisplayableProduct);
};

const buildApiParams = (params = {}) => {
  const next = {
    ...params,
    limit: params.limit || params.size
  };

  if (params.priceMin) {
    next.minPrice = params.priceMin;
  }
  if (params.priceMax) {
    next.maxPrice = params.priceMax;
  }
  if (params.productType === '1' || params.productType === 1) {
    next.isSecondhand = false;
  }
  if (params.productType === '2' || params.productType === 2) {
    next.isSecondhand = true;
  }

  delete next.size;
  delete next.priceMin;
  delete next.priceMax;
  delete next.productType;

  return next;
};

const searchMockProducts = (params = {}) => {
  const keyword = (params.keyword || '').toLowerCase();
  const minPrice = Number(params.priceMin || params.minPrice || 0);
  const maxPrice = Number(params.priceMax || params.maxPrice || Infinity);

  return mockProducts
    .filter(product => {
      const matchesKeyword = !keyword ||
        product.name.toLowerCase().includes(keyword) ||
        product.description.toLowerCase().includes(keyword);
      const matchesCategory = !params.category || params.category === 'all' || product.category === params.category;
      const matchesType = !params.productType || Number(product.productType) === Number(params.productType);
      const matchesPrice = Number(product.price) >= minPrice && Number(product.price) <= maxPrice;
      return matchesKeyword && matchesCategory && matchesType && matchesPrice;
    })
    .map(normalizeProduct);
};

export const getProducts = createAsyncThunk(
  'product/getProducts',
  async (params) => {
    try {
      const response = await productApi.getList(buildApiParams(params));
      return normalizeList(response.data);
    } catch {
      return hotProducts.map(normalizeProduct);
    }
  }
);

export const searchProducts = createAsyncThunk(
  'product/searchProducts',
  async (params, { rejectWithValue }) => {
    try {
      const response = await productApi.search(buildApiParams(params));
      return normalizeList(response.data);
    } catch (error) {
      if (!error.response) {
        return searchMockProducts(params);
      }
      return rejectWithValue(error.response.data || { message: '搜索失败' });
    }
  }
);

export const getProductDetail = createAsyncThunk(
  'product/getProductDetail',
  async (id, { rejectWithValue }) => {
    try {
      const response = await productApi.getDetail(id);
      return normalizeProduct(response.data);
    } catch (error) {
      const product = mockProducts.find(p => p.id === parseInt(id));
      if (product) {
        return normalizeProduct(product);
      }
      return rejectWithValue(error.response?.data || { message: '获取商品详情失败' });
    }
  }
);

export const getRecommendedProducts = createAsyncThunk(
  'product/getRecommendedProducts',
  async () => {
    try {
      const response = await productApi.getRecommended();
      return normalizeList(response.data);
    } catch {
      return mockRecommendedProducts.map(normalizeProduct);
    }
  }
);

const productSlice = createSlice({
  name: 'product',
  initialState: {
    products: hotProducts.map(normalizeProduct),
    recommendedProducts: mockRecommendedProducts.map(normalizeProduct),
    currentProduct: null,
    loading: false,
    error: null,
    searchResults: [],
    searchLoading: false,
    searchError: null
  },
  reducers: {
    clearSearchResults: (state) => {
      state.searchResults = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // getProducts
      .addCase(getProducts.pending, (state) => {
        state.loading = state.products.length === 0;
        state.error = null;
      })
      .addCase(getProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = normalizeList(action.payload);
      })
      .addCase(getProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // searchProducts
      .addCase(searchProducts.pending, (state) => {
        state.searchLoading = true;
        state.searchError = null;
      })
      .addCase(searchProducts.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = normalizeList(action.payload);
      })
      .addCase(searchProducts.rejected, (state, action) => {
        state.searchLoading = false;
        state.searchError = action.payload;
      })
      // getProductDetail
      .addCase(getProductDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getProductDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProduct = normalizeProduct(action.payload);
      })
      .addCase(getProductDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // getRecommendedProducts
      .addCase(getRecommendedProducts.pending, (state) => {
        state.loading = state.recommendedProducts.length === 0;
        state.error = null;
      })
      .addCase(getRecommendedProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.recommendedProducts = normalizeList(action.payload);
      })
      .addCase(getRecommendedProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearSearchResults } = productSlice.actions;
export default productSlice.reducer;
