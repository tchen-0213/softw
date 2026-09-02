const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);
const isNonEmptyText = value => typeof value === 'string' && value.trim().length > 0;
const isPositiveInteger = value => Number.isInteger(Number(value)) && Number(value) > 0;

const validateProductPayload = (payload = {}, { partial = false } = {}) => {
  for (const [field, label] of [['name', '商品名称'], ['description', '商品描述'], ['category', '商品分类']]) {
    if ((!partial || hasOwn(payload, field)) && !isNonEmptyText(payload[field])) return `${label}不能为空`;
  }

  if ((!partial || hasOwn(payload, 'price')) && (!Number.isFinite(Number(payload.price)) || Number(payload.price) <= 0)) {
    return '商品价格必须是大于0的数字';
  }
  if (hasOwn(payload, 'stock') && (!Number.isInteger(Number(payload.stock)) || Number(payload.stock) < 0)) {
    return '商品库存必须是大于或等于0的整数';
  }
  if (hasOwn(payload, 'images') && !Array.isArray(payload.images)) return '商品图片必须是数组';
  if (hasOwn(payload, 'videos') && !Array.isArray(payload.videos)) return '商品视频必须是数组';
  if (payload.hasDefect === true && !isNonEmptyText(payload.defectDescription)) return '有瑕疵时必须填写瑕疵说明';
  return null;
};

const validateOrderItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) return '订单商品不能为空';
  for (const item of items) {
    const productId = item?.productId ?? item?.id;
    if (!isPositiveInteger(productId)) return '订单商品标识必须是正整数';
    const quantity = item?.quantity ?? 1;
    if (!isPositiveInteger(quantity)) return '商品数量必须是正整数';
  }
  return null;
};

const validateShippingAddress = (address) => {
  if (!address || typeof address !== 'object' || Array.isArray(address)) return '收货地址不能为空';
  for (const [field, label] of [['name', '收货人'], ['phone', '收货手机号'], ['address', '详细地址']]) {
    if (!isNonEmptyText(address[field])) return `${label}不能为空`;
  }
  return null;
};

const validateEvaluationPayload = (payload = {}) => {
  if (!isPositiveInteger(payload.orderId)) return '订单标识必须是正整数';
  if (!isPositiveInteger(payload.productId)) return '商品标识必须是正整数';
  const rating = Number(payload.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return '评分必须是1到5之间的整数';
  if (!isNonEmptyText(payload.content)) return '评价内容不能为空';
  if (hasOwn(payload, 'images') && !Array.isArray(payload.images)) return '评价图片必须是数组';
  return null;
};

const validateProfilePayload = (payload = {}) => {
  if (hasOwn(payload, 'email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.email || ''))) {
    return '邮箱格式不正确';
  }
  if (hasOwn(payload, 'phone') && !isNonEmptyText(String(payload.phone || ''))) return '手机号不能为空';
  if (hasOwn(payload, 'gender') && !['male', 'female', 'other'].includes(payload.gender)) return '性别选项不合法';
  if (hasOwn(payload, 'birthday') && payload.birthday && Number.isNaN(Date.parse(payload.birthday))) return '生日格式不正确';
  return null;
};

const validateNewPassword = value => (
  typeof value === 'string' && value.length >= 6 ? null : '新密码长度不能少于6位'
);

module.exports = {
  isNonEmptyText,
  isPositiveInteger,
  validateEvaluationPayload,
  validateNewPassword,
  validateOrderItems,
  validateProductPayload,
  validateProfilePayload,
  validateShippingAddress
};
