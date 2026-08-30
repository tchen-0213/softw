import { beforeEach, describe, expect, test, vi } from 'vitest';

const axiosState = vi.hoisted(() => {
  const state = { config: null, requestHandler: null, responseHandler: null };
  const instance = {
    get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn(handler => { state.requestHandler = handler; }) },
      response: { use: vi.fn(handler => { state.responseHandler = handler; }) }
    }
  };
  return {
    ...state,
    state,
    instance,
    create: vi.fn(config => {
      state.config = config;
      return instance;
    })
  };
});

vi.mock('axios', () => ({ default: { create: axiosState.create } }));

import api, {
  addressApi, chatApi, evaluationApi, orderApi, productApi,
  resolveBackendAssetUrl, secondhandApi, shopApi, uploadApi, userApi
} from '../src/services/api.js';

describe('前端 API 客户端', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  test('创建客户端并由请求拦截器注入 token', () => {
    expect(axiosState.state.config).toEqual(expect.objectContaining({ baseURL: '/api', timeout: 3000 }));
    const requestHandler = axiosState.state.requestHandler;
    localStorage.setItem('token', 'abc');
    expect(requestHandler({ headers: {} }).headers.Authorization).toBe('Bearer abc');
    localStorage.clear();
    expect(requestHandler({ headers: {} }).headers.Authorization).toBeUndefined();
  });

  test('响应拦截器递归补全上传资源地址', () => {
    expect(resolveBackendAssetUrl('/uploads/a.png')).toBe(`${location.origin}/uploads/a.png`);
    expect(resolveBackendAssetUrl('/images/a.png')).toBe('/images/a.png');
    const responseHandler = axiosState.state.responseHandler;
    const response = responseHandler({ data: { avatar: '/uploads/a.png', rows: [{ image: '/uploads/b.png' }] } });
    expect(response.data).toEqual({
      avatar: `${location.origin}/uploads/a.png`,
      rows: [{ image: `${location.origin}/uploads/b.png` }]
    });
  });

  test('所有资源 API 使用约定的方法、路径和参数', () => {
    productApi.getList({ page: 1 }); productApi.getMine({ page: 1 }); productApi.getDetail(1); productApi.search({ q: 'x' });
    productApi.getRecommended(); productApi.create({}); productApi.update(1, {}); productApi.delete(1);
    userApi.register({}); userApi.login({}); userApi.getProfile(); userApi.updateProfile({}); userApi.updatePassword({});
    orderApi.create({}); orderApi.getList({}); orderApi.getSellerList({}); orderApi.getDetail(1); orderApi.update(1, {});
    orderApi.cancel(1); orderApi.pay(1); orderApi.ship(1, {}); orderApi.confirm(1);
    secondhandApi.getList({}); secondhandApi.getDetail(1); secondhandApi.search({}); secondhandApi.create({}); secondhandApi.update(1, {}); secondhandApi.delete(1);
    evaluationApi.create({}); evaluationApi.getProductEvaluations({}); evaluationApi.getUserEvaluations({}); evaluationApi.getSellerEvaluations({}); evaluationApi.reply(1, {}); evaluationApi.approve(1);
    addressApi.getList(); addressApi.replaceAll([{ id: 1 }]);
    shopApi.getMine(); shopApi.updateMine({}); shopApi.submitVerification({}); shopApi.getByUser(2); shopApi.getDetail(3);
    chatApi.createConversation({}); chatApi.getConversations({}); chatApi.getMessages(1); chatApi.sendMessage(1, {}); chatApi.decideRequest(2, {});

    expect(api.get).toHaveBeenCalledWith('/products', { params: { page: 1 } });
    expect(api.post).toHaveBeenCalledWith('/orders/1/ship', {});
    expect(api.put).toHaveBeenCalledWith('/addresses', { addresses: [{ id: 1 }] });
    expect(api.delete).toHaveBeenCalledWith('/secondhand/1');
  });

  test('上传 API 构造多文件 FormData 和专用超时', () => {
    const files = [new File(['a'], 'a.png'), new File(['b'], 'b.png')];
    uploadApi.uploadImages(files);
    const [path, body, config] = api.post.mock.calls.at(-1);
    expect(path).toBe('/uploads/images');
    expect(body.getAll('images')).toEqual(files);
    expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' }, timeout: 15000 });
  });
});
