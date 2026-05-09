import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { mockProducts, recommendedProducts, hotProducts } from '../data/mockProducts';

export const getProducts = createAsyncThunk(
  'product/getProducts',
  async (params, { rejectWithValue }) => {
    try {
      // 模拟 API 延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      return hotProducts;
    } catch (error) {
      return rejectWithValue({ message: '获取商品失败' });
    }
  }
);

export const searchProducts = createAsyncThunk(
  'product/searchProducts',
  async (params, { rejectWithValue }) => {
    try {
      // 模拟 API 延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      // 模拟搜索结果
      const results = mockProducts.filter(product => 
        product.name.toLowerCase().includes(params.keyword.toLowerCase()) ||
        product.description.toLowerCase().includes(params.keyword.toLowerCase())
      );
      return results;
    } catch (error) {
      return rejectWithValue({ message: '搜索失败' });
    }
  }
);

export const getProductDetail = createAsyncThunk(
  'product/getProductDetail',
  async (id, { rejectWithValue }) => {
    try {
      // 模拟 API 延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      // 模拟商品详情
      const product = mockProducts.find(p => p.id === parseInt(id));
      if (!product) {
        throw new Error('商品不存在');
      }
      return product;
    } catch (error) {
      return rejectWithValue({ message: '获取商品详情失败' });
    }
  }
);

export const getRecommendedProducts = createAsyncThunk(
  'product/getRecommendedProducts',
  async (_, { rejectWithValue }) => {
    try {
      // 模拟 API 延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      return recommendedProducts;
    } catch (error) {
      return rejectWithValue({ message: '获取推荐商品失败' });
    }
  }
);

const productSlice = createSlice({
  name: 'product',
  initialState: {
    products: [],
    recommendedProducts: [],
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
        state.loading = true;
        state.error = null;
      })
      .addCase(getProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
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
        state.searchResults = action.payload;
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
        state.currentProduct = action.payload;
      })
      .addCase(getProductDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // getRecommendedProducts
      .addCase(getRecommendedProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getRecommendedProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.recommendedProducts = action.payload;
      })
      .addCase(getRecommendedProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearSearchResults } = productSlice.actions;
export default productSlice.reducer;