import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT || 3000);
const pageOrigin = globalThis.location?.origin || 'http://localhost';

const apiOrigin = (() => {
  try {
    return new URL(API_BASE_URL, pageOrigin).origin;
  } catch {
    return pageOrigin;
  }
})();

export const resolveBackendAssetUrl = (value) => (
  typeof value === 'string' && value.startsWith('/uploads/')
    ? `${apiOrigin}${value}`
    : value
);

const resolveResponseAssets = (value) => {
  if (Array.isArray(value)) {
    return value.map(resolveResponseAssets);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveResponseAssets(item)])
    );
  }
  return resolveBackendAssetUrl(value);
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: Number.isFinite(API_TIMEOUT) ? API_TIMEOUT : 3000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(response => {
  response.data = resolveResponseAssets(response.data);
  return response;
});

// 商品相关API
export const productApi = {
  getList: (params) => api.get('/products', { params }),
  getMine: (params) => api.get('/products/mine', { params }),
  getDetail: (id) => api.get(`/products/${id}`),
  search: (params) => api.get('/products/search', { params }),
  getRecommended: () => api.get('/products/recommended'),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`)
};

// 用户相关API
export const userApi = {
  register: (data) => api.post('/users/register', data),
  login: (data) => api.post('/users/login', data),
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  updatePassword: (data) => api.put('/users/password', data)
};

// 订单相关API
export const orderApi = {
  create: (data) => api.post('/orders', data),
  getList: (params) => api.get('/orders', { params }),
  getSellerList: (params) => api.get('/orders/seller', { params }),
  getDetail: (id) => api.get(`/orders/${id}`),
  update: (id, data) => api.put(`/orders/${id}`, data),
  cancel: (id) => api.post(`/orders/${id}/cancel`),
  pay: (id) => api.post(`/orders/${id}/pay`),
  ship: (id, data) => api.post(`/orders/${id}/ship`, data),
  confirm: (id) => api.post(`/orders/${id}/confirm`)
};

// 二手商品相关API
export const secondhandApi = {
  getList: (params) => api.get('/secondhand', { params }),
  getDetail: (id) => api.get(`/secondhand/${id}`),
  search: (params) => api.get('/secondhand/search', { params }),
  create: (data) => api.post('/secondhand', data),
  update: (id, data) => api.put(`/secondhand/${id}`, data),
  delete: (id) => api.delete(`/secondhand/${id}`)
};

// 评价相关API
export const evaluationApi = {
  create: (data) => api.post('/evaluations', data),
  getProductEvaluations: (params) => api.get('/evaluations/product', { params }),
  getUserEvaluations: (params) => api.get('/evaluations/user', { params }),
  getSellerEvaluations: (params) => api.get('/evaluations/seller', { params }),
  reply: (id, data) => api.put(`/evaluations/${id}/reply`, data),
  approve: (id) => api.put(`/evaluations/${id}/approve`)
};

// 地址相关API
export const addressApi = {
  getList: () => api.get('/addresses'),
  replaceAll: (addresses) => api.put('/addresses', { addresses })
};

// 店铺相关API
export const shopApi = {
  getMine: () => api.get('/shops/mine'),
  updateMine: (data) => api.put('/shops/mine', data),
  submitVerification: (data) => api.post('/shops/mine/verification', data),
  getByUser: (userId) => api.get(`/shops/user/${userId}`),
  getDetail: (id) => api.get(`/shops/${id}`)
};

// 私聊与议价相关API
export const chatApi = {
  createConversation: (data) => api.post('/chats/conversations', data),
  getConversations: (params) => api.get('/chats/conversations', { params }),
  getMessages: (id) => api.get(`/chats/conversations/${id}`),
  sendMessage: (id, data) => api.post(`/chats/conversations/${id}/messages`, data),
  decideRequest: (messageId, data) => api.put(`/chats/messages/${messageId}/decision`, data)
};

// 上传相关API
export const uploadApi = {
  uploadImages: (files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    return api.post('/uploads/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 15000
    });
  }
};

export default api;
