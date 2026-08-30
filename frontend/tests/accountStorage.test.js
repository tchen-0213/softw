import { describe, expect, test } from 'vitest';
import {
  getStoredUser,
  getUserKey,
  getUserStorageKey,
  isLoggedIn,
  loadUserAddresses,
  normalizeAddresses,
  saveUserAddresses
} from '../src/utils/accountStorage.js';

describe('账户本地存储', () => {
  test('读取用户并按稳定标识生成隔离键', () => {
    localStorage.setItem('user', JSON.stringify({ _id: 12, email: 'x@example.com' }));
    expect(getStoredUser()).toEqual({ _id: 12, email: 'x@example.com' });
    expect(getUserKey()).toBe(12);
    expect(getUserKey({ email: 'x@example.com' })).toBe('x@example.com');
    expect(getUserStorageKey('addresses')).toBe('addresses:12');
  });

  test('损坏用户数据与匿名用户安全返回空值', () => {
    localStorage.setItem('user', '{bad');
    expect(getStoredUser()).toBeNull();
    expect(getUserStorageKey('addresses')).toBeNull();
    expect(loadUserAddresses()).toEqual([]);
  });

  test('登录态必须同时具有 token 与用户标识', () => {
    localStorage.setItem('token', 'token');
    expect(isLoggedIn()).toBe(false);
    localStorage.setItem('user', JSON.stringify({ username: 'moyu' }));
    expect(isLoggedIn()).toBe(true);
    localStorage.removeItem('token');
    expect(isLoggedIn()).toBe(false);
  });

  test('地址保存前会清洗字段并按用户隔离', () => {
    const user = { id: 'u1' };
    const addresses = [
      null,
      { id: 3, name: ' 张三 ', phone: 13800138000, address: '测试路', isDefault: 1 },
      { name: '无 id' }
    ];
    const normalized = [{
      id: '3', name: ' 张三 ', phone: 13800138000, address: '测试路', isDefault: true
    }];
    expect(normalizeAddresses(addresses)).toEqual(normalized);
    saveUserAddresses(addresses, user);
    expect(loadUserAddresses(user)).toEqual(normalized);
  });

  test('损坏地址 JSON 与非数组输入返回空数组', () => {
    localStorage.setItem('addresses:u1', '{bad');
    expect(loadUserAddresses({ id: 'u1' })).toEqual([]);
    expect(normalizeAddresses({ id: 1 })).toEqual([]);
  });
});
