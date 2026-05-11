export const getStoredUser = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return JSON.parse(window.localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

export const getUserKey = (user = getStoredUser()) => (
  user?.id || user?._id || user?.email || user?.username
);

export const isLoggedIn = () => Boolean(
  typeof window !== 'undefined' &&
  window.localStorage.getItem('token') &&
  getUserKey()
);

export const getUserStorageKey = (namespace, user = getStoredUser()) => {
  const userKey = getUserKey(user);
  return userKey ? `${namespace}:${userKey}` : null;
};

export const normalizeAddresses = (addresses) => (
  Array.isArray(addresses)
    ? addresses
        .filter(address => address && address.id)
        .map(address => ({
          id: String(address.id),
          name: address.name || '',
          phone: address.phone || '',
          address: address.address || '',
          isDefault: Boolean(address.isDefault)
        }))
    : []
);

export const loadUserAddresses = (user = getStoredUser()) => {
  const storageKey = getUserStorageKey('addresses', user);
  if (!storageKey || typeof window === 'undefined') {
    return [];
  }

  try {
    return normalizeAddresses(JSON.parse(window.localStorage.getItem(storageKey) || '[]'));
  } catch {
    return [];
  }
};

export const saveUserAddresses = (addresses, user = getStoredUser()) => {
  const storageKey = getUserStorageKey('addresses', user);
  if (!storageKey || typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(normalizeAddresses(addresses)));
};
