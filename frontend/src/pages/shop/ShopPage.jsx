import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CreditBadge from '../../components/credit/CreditBadge';
import { productImages, shopImages } from '../../data/imageAssets';
import { chatApi, evaluationApi, orderApi, productApi, shopApi, uploadApi } from '../../services/api';
import { isLoggedIn } from '../../utils/accountStorage';

const defaultProducts = [
  {
    id: '1',
    name: '全新 iPhone 15 Pro',
    price: 199.99,
    stock: 10,
    sales: 5,
    image: productImages.iphone
  },
  {
    id: '2',
    name: 'MacBook Pro 2026',
    price: 599.99,
    stock: 5,
    sales: 2,
    image: productImages.macbook
  },
  {
    id: '3',
    name: 'AirPods Pro 2',
    price: 99.99,
    stock: 20,
    sales: 10,
    image: productImages.airpods
  }
];

const CUSTOM_COMPANY_VALUE = '__custom_company__';
const CUSTOM_TRACKING_VALUE = '__custom_tracking__';

const shippingCompanyOptions = [
  { value: '中通快递', label: '中通' },
  { value: '顺丰速运', label: '顺丰' },
  { value: '京东物流', label: '京东' },
  { value: '圆通速递', label: '圆通' },
  { value: '申通快递', label: '申通' },
  { value: '韵达快递', label: '韵达' },
  { value: 'EMS', label: 'EMS' },
  { value: CUSTOM_COMPANY_VALUE, label: '自定义物流' }
];

const trackingPrefixMap = {
  中通快递: 'ZT',
  顺丰速运: 'SF',
  京东物流: 'JD',
  圆通速递: 'YT',
  申通快递: 'ST',
  韵达快递: 'YD',
  EMS: 'EMS'
};

const pendingSellerOrderStatuses = ['待付款', '待发货'];

const createEmptyShippingForm = () => ({
  company: '',
  customCompany: '',
  trackingNumber: '',
  customTrackingNumber: ''
});

const getTrackingNumberOptions = (orderId, company) => {
  if (!company || company === CUSTOM_COMPANY_VALUE) {
    return [];
  }

  const prefix = trackingPrefixMap[company] || 'NO';
  const normalizedOrderId = String(orderId || '0').replace(/\D/g, '') || '0';
  const paddedOrderId = normalizedOrderId.padStart(6, '0');

  return [
    `${prefix}${paddedOrderId}01`,
    `${prefix}${paddedOrderId}02`,
    `${prefix}${paddedOrderId}03`
  ].map(value => ({
    value,
    label: value
  }));
};

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

const getUserKey = (user) => user?.id || user?._id || user?.email || user?.username;

const getShopStorageKey = (user) => `shopData:${getUserKey(user)}`;

const createDefaultShop = (user) => ({
  id: `shop-${getUserKey(user)}`,
  ownerId: getUserKey(user),
  name: `${user?.username || '我的'}的店铺`,
  description: '这是一家经营各类商品的店铺，欢迎光临！',
  logo: shopImages.logo,
  banner: shopImages.banner,
  creditLevel: user?.creditLevel || '普通',
  creditScore: user?.creditScore ?? 100,
  status: '待认证',
  verificationStatus: '未认证',
  legalName: '',
  idNumber: '',
  verificationAddress: '',
  businessLicenseImage: '',
  idCardImage: '',
  products: defaultProducts
});

const normalizeShop = (shop, user) => {
  const fallback = createDefaultShop(user);
  return {
    ...fallback,
    ...shop,
    ownerId: getUserKey(user),
    logo: shop?.logo || shop?.avatar || shopImages.logo,
    banner: shop?.banner || shopImages.banner,
    creditLevel: shop?.creditLevel || shop?.owner?.creditLevel || user?.creditLevel || fallback.creditLevel,
    creditScore: shop?.creditScore ?? shop?.owner?.creditScore ?? user?.creditScore ?? fallback.creditScore,
    status: shop?.status || fallback.status,
    verificationStatus: shop?.verificationStatus || (shop?.status === '营业中' ? '已认证' : fallback.verificationStatus),
    legalName: shop?.legalName || '',
    idNumber: shop?.idNumber || '',
    verificationAddress: shop?.verificationAddress || '',
    businessLicenseImage: shop?.businessLicenseImage || '',
    idCardImage: shop?.idCardImage || '',
    products: Array.isArray(shop?.products)
      ? shop.products.map(product => ({
          ...product,
          image: product.image || product.images?.[0] || productImages.iphone
        }))
      : fallback.products
  };
};

const loadShop = (user) => {
  if (!user) {
    return null;
  }

  try {
    const saved = JSON.parse(localStorage.getItem(getShopStorageKey(user)) || 'null');
    return normalizeShop(saved, user);
  } catch {
    return createDefaultShop(user);
  }
};

const toEditableImageValue = (value, fallback) => (value && value !== fallback ? value : '');

const resolveImageValue = (value, fallback) => {
  const nextValue = String(value || '').trim();
  return nextValue || fallback;
};

const getStoredImageValue = (value) => String(value || '').trim();

const formatReplyTime = (value) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
};

const normalizeReply = (reply, index) => ({
  ...reply,
  id: reply.id || `${reply.role || 'reply'}-${index}`,
  role: reply.role === 'seller' ? 'seller' : 'buyer',
  username: reply.username || (reply.role === 'seller' ? '卖家' : '买家'),
  content: reply.content || '',
  createTime: reply.createTime || formatReplyTime(reply.createdAt)
});

const normalizeSellerEvaluation = (evaluation) => ({
  ...evaluation,
  username: evaluation.user?.nickname || evaluation.user?.username || '匿名用户',
  avatar: evaluation.user?.avatar || '/images/moyu-logo.png',
  productName: evaluation.product?.name || '未知商品',
  productImage: evaluation.product?.images?.[0] || productImages.iphone,
  createTime: evaluation.createTime || new Date(evaluation.createdAt).toLocaleString(),
  pendingSellerReply: Boolean(evaluation.pendingSellerReply),
  replies: Array.isArray(evaluation.replies)
    ? evaluation.replies.map(normalizeReply)
    : (evaluation.reply ? [normalizeReply({ role: 'seller', username: '卖家', content: evaluation.reply, createdAt: evaluation.updatedAt }, 0)] : [])
});

const renderStars = (rating) => (
  Array(5).fill(0).map((_, index) => (
    <span key={index} style={{ color: index < Number(rating || 0) ? '#ffd700' : '#ddd' }}>
      ★
    </span>
  ))
);

const ShopPage = () => {
  const [user] = useState(getCurrentUser);
  const [shop, setShop] = useState(() => loadShop(getCurrentUser()));
  const [editingShop, setEditingShop] = useState(false);
  const [shopForm, setShopForm] = useState({
    name: '',
    description: '',
    logo: '',
    banner: ''
  });
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    stock: '',
    sales: '',
    image: '',
    status: '在售',
    bargainEnabled: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingBusinessLicense, setUploadingBusinessLicense] = useState(false);
  const [uploadingIdCard, setUploadingIdCard] = useState(false);
  const [verifyingShop, setVerifyingShop] = useState(false);
  const [verificationForm, setVerificationForm] = useState({
    legalName: '',
    idNumber: '',
    verificationAddress: '',
    businessLicenseImage: '',
    idCardImage: ''
  });
  const [sellerOrders, setSellerOrders] = useState([]);
  const [sellerEvaluations, setSellerEvaluations] = useState([]);
  const [sellerConversations, setSellerConversations] = useState([]);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyingEvaluationId, setReplyingEvaluationId] = useState(null);
  const [shippingOrderId, setShippingOrderId] = useState(null);
  const [shippingForm, setShippingForm] = useState(createEmptyShippingForm);
  const navigate = useNavigate();
  const isShopVerified = shop?.verificationStatus === '已认证' || shop?.status === '营业中';

  const pendingSellerOrders = useMemo(() => (
    sellerOrders.filter(order => pendingSellerOrderStatuses.includes(order.status))
  ), [sellerOrders]);

  const waitingShipCount = useMemo(() => (
    sellerOrders.filter(order => order.status === '待发货').length
  ), [sellerOrders]);

  const pendingReplyEvaluations = useMemo(() => (
    sellerEvaluations.filter(evaluation => evaluation.pendingSellerReply)
  ), [sellerEvaluations]);

  useEffect(() => {
    if (!user || !isLoggedIn()) {
      return;
    }

    setLoading(true);
    shopApi.getMine()
      .then((response) => {
        setShop(normalizeShop(response.data, user));
        setError('');
      })
      .catch((err) => {
        setError(err.response?.data?.message || '店铺加载失败，已显示本地演示数据');
        setShop(loadShop(user) || createDefaultShop(user));
      })
      .finally(() => setLoading(false));

    orderApi.getSellerList()
      .then((response) => {
        setSellerOrders(response.data.orders || []);
      })
      .catch(() => {});

    evaluationApi.getSellerEvaluations({ limit: 100 })
      .then((response) => {
        setSellerEvaluations((response.data.evaluations || []).map(normalizeSellerEvaluation));
      })
      .catch(() => {});

    chatApi.getConversations({ role: 'seller' })
      .then((response) => {
        setSellerConversations(response.data.conversations || []);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!shop || isShopVerified) {
      return;
    }

    setVerificationForm(prev => ({
      legalName: prev.legalName || shop.legalName || '',
      idNumber: prev.idNumber || shop.idNumber || '',
      verificationAddress: prev.verificationAddress || shop.verificationAddress || '',
      businessLicenseImage: prev.businessLicenseImage || shop.businessLicenseImage || '',
      idCardImage: prev.idCardImage || shop.idCardImage || ''
    }));
  }, [isShopVerified, shop]);

  const handleEditShop = () => {
    setShopForm({
      name: shop.name,
      description: shop.description,
      logo: toEditableImageValue(shop.logo, shopImages.logo),
      banner: toEditableImageValue(shop.banner, shopImages.banner)
    });
    setEditingShop(true);
  };

  const handleShopFormChange = (event) => {
    const { name, value } = event.target;
    setShopForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadingLogo(true);
    setError('');
    try {
      const response = await uploadApi.uploadImages([file]);
      const logoUrl = response.data.urls?.[0];
      if (logoUrl) {
        setShopForm(prev => ({
          ...prev,
          logo: logoUrl
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Logo 上传失败，请稍后重试');
    } finally {
      setUploadingLogo(false);
      event.target.value = '';
    }
  };

  const handleBannerUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadingBanner(true);
    setError('');
    try {
      const response = await uploadApi.uploadImages([file]);
      const bannerUrl = response.data.urls?.[0];
      if (bannerUrl) {
        setShopForm(prev => ({
          ...prev,
          banner: bannerUrl
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || '横幅上传失败，请稍后重试');
    } finally {
      setUploadingBanner(false);
      event.target.value = '';
    }
  };

  const handleRestoreDefaultImage = (field) => {
    setShopForm(prev => ({
      ...prev,
      [field]: ''
    }));
    setError('');
  };

  const handleVerificationChange = (event) => {
    const { name, value } = event.target;
    setVerificationForm(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const uploadVerificationImage = async (event, field, setUploading) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    setError('');
    try {
      const response = await uploadApi.uploadImages([file]);
      const imageUrl = response.data.urls?.[0];
      if (imageUrl) {
        setVerificationForm(prev => ({
          ...prev,
          [field]: imageUrl
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || '认证图片上传失败，请稍后重试');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleSubmitVerification = async (event) => {
    event.preventDefault();
    const requiredValues = [
      verificationForm.legalName,
      verificationForm.idNumber,
      verificationForm.verificationAddress,
      verificationForm.businessLicenseImage,
      verificationForm.idCardImage
    ];

    if (requiredValues.some(value => !String(value || '').trim())) {
      setError('请完整填写经营者姓名、身份证号、经营地址，并上传营业执照和身份证照片');
      return;
    }

    setVerifyingShop(true);
    setError('');
    try {
      const response = await shopApi.submitVerification(verificationForm);
      const verifiedShop = normalizeShop(response.data, user);
      setShop(verifiedShop);
      localStorage.setItem(getShopStorageKey(user), JSON.stringify(verifiedShop));
      setVerificationForm({
        legalName: '',
        idNumber: '',
        verificationAddress: '',
        businessLicenseImage: '',
        idCardImage: ''
      });
    } catch (err) {
      setError(err.response?.data?.message || '店铺验证提交失败');
    } finally {
      setVerifyingShop(false);
    }
  };

  const handleSaveShop = async (event) => {
    event.preventDefault();
    const nextLogo = getStoredImageValue(shopForm.logo);
    const nextBanner = getStoredImageValue(shopForm.banner);

    try {
      const response = await shopApi.updateMine({
        name: shopForm.name,
        description: shopForm.description,
        avatar: nextLogo,
        logo: nextLogo,
        banner: nextBanner
      });
      const savedShop = normalizeShop({
        ...(response.data || {}),
        name: shopForm.name,
        description: shopForm.description,
        logo: nextLogo,
        avatar: nextLogo,
        banner: nextBanner
      }, user);
      setShop(savedShop);
      localStorage.setItem(getShopStorageKey(user), JSON.stringify(savedShop));
      setEditingShop(false);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || '店铺保存失败');
    }
  };

  const handleAddProduct = () => {
    navigate('/sell');
  };

  const handleEditProduct = (product) => {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      price: product.price,
      stock: product.stock,
      sales: product.sales,
      image: product.image || product.images?.[0] || '',
      status: product.status || '在售',
      bargainEnabled: product.bargainEnabled !== false
    });
  };

  const handleProductFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setProductForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveProduct = async (event) => {
    event.preventDefault();
    const currentProduct = shop.products.find(product => product.id === editingProductId);
    try {
      const response = await productApi.update(editingProductId, {
        name: productForm.name,
        price: Number(productForm.price),
        stock: Number(productForm.stock),
        status: productForm.status,
        bargainEnabled: productForm.bargainEnabled,
        images: productForm.image ? [productForm.image] : currentProduct?.images || []
      });
      const updatedProduct = {
        ...response.data,
        image: response.data.images?.[0] || productForm.image || productImages.iphone
      };
      setShop(prev => ({
        ...prev,
        products: prev.products.map(product => (
          product.id === editingProductId ? updatedProduct : product
        ))
      }));
      setEditingProductId(null);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || '商品保存失败');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('确定要删除该商品吗？')) {
      try {
        await productApi.delete(id);
        setShop(prev => ({
          ...prev,
          products: prev.products.filter(product => product.id !== id)
        }));
        if (editingProductId === id) {
          setEditingProductId(null);
        }
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || '商品删除失败');
      }
    }
  };

  const handleShippingChange = (event) => {
    const { name, value } = event.target;
    setShippingForm(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'company'
        ? {
            customCompany: value === CUSTOM_COMPANY_VALUE ? prev.customCompany : '',
            trackingNumber: '',
            customTrackingNumber: ''
          }
        : {}),
      ...(name === 'trackingNumber' && value !== CUSTOM_TRACKING_VALUE
        ? { customTrackingNumber: '' }
        : {})
    }));
    setError('');
  };

  const handleStartShipping = (orderId) => {
    setShippingOrderId(orderId);
    setShippingForm(createEmptyShippingForm());
    setError('');
  };

  const handleCancelShipping = () => {
    setShippingOrderId(null);
    setShippingForm(createEmptyShippingForm());
    setError('');
  };

  const getShippingPayload = () => {
    const company = shippingForm.company === CUSTOM_COMPANY_VALUE
      ? shippingForm.customCompany.trim()
      : shippingForm.company.trim();
    const trackingNumber = shippingForm.trackingNumber === CUSTOM_TRACKING_VALUE
      ? shippingForm.customTrackingNumber.trim()
      : shippingForm.trackingNumber.trim();

    return { company, trackingNumber };
  };

  const handleShipOrder = async (orderId) => {
    const payload = getShippingPayload();

    if (!payload.company || !payload.trackingNumber) {
      setError('物流公司和物流单号不能为空，请填写完整后再发货');
      return;
    }

    try {
      const response = await orderApi.ship(orderId, payload);
      setSellerOrders(prev => prev.map(order => (
        Number(order.id) === Number(orderId) ? response.data : order
      )));
      setShippingOrderId(null);
      setShippingForm(createEmptyShippingForm());
      window.dispatchEvent(new Event('seller-alerts-refresh'));
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || '发货失败');
    }
  };

  const handleReplyDraftChange = (evaluationId, value) => {
    setReplyDrafts(prev => ({
      ...prev,
      [evaluationId]: value
    }));
    setError('');
  };

  const handleReplyEvaluation = async (evaluationId) => {
    const reply = String(replyDrafts[evaluationId] || '').trim();

    if (!reply) {
      setError('回复内容不能为空');
      return;
    }

    setReplyingEvaluationId(evaluationId);
    try {
      const response = await evaluationApi.reply(evaluationId, { reply });
      const updatedEvaluation = normalizeSellerEvaluation(response.data);
      setSellerEvaluations(prev => prev.map(evaluation => (
        Number(evaluation.id) === Number(evaluationId) ? updatedEvaluation : evaluation
      )));
      setReplyDrafts(prev => ({
        ...prev,
        [evaluationId]: ''
      }));
      window.dispatchEvent(new Event('seller-alerts-refresh'));
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || '回复评价失败');
    } finally {
      setReplyingEvaluationId(null);
    }
  };

  if (!user || !isLoggedIn()) {
    return (
      <div style={{ padding: '20px 0' }}>
        <div className="container">
          <h2 style={{ marginBottom: '20px' }}>店铺管理</h2>
          <div className="shop-empty-panel">
            <h3>请先登录后管理店铺</h3>
            <button className="button button-primary" onClick={() => navigate('/login')}>
              去登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (shop && !isShopVerified) {
    const verificationBusy = uploadingBusinessLicense || uploadingIdCard || verifyingShop;

    return (
      <div style={{ padding: '20px 0' }}>
        <div className="container">
          <h2 style={{ marginBottom: '20px' }}>店铺管理</h2>
          {loading && <div className="loading">加载中...</div>}
          {error && <div style={{ color: '#ff4d4f', marginBottom: '16px' }}>{error}</div>}

          <div className="shop-owner-note">
            当前店铺归属：<strong>{user.username || user.email}</strong>
          </div>

          <div className="shop-verification-panel">
            <div className="shop-verification-header">
              <div>
                <h3>店铺验证</h3>
                <p>开启个人店铺前，需要提交营业执照、身份证和经营地址等资料。</p>
              </div>
              <span>{shop.verificationStatus || '未认证'}</span>
            </div>

            <form onSubmit={handleSubmitVerification}>
              <div className="shop-verification-grid">
                <label>
                  <span>经营者姓名</span>
                  <input
                    name="legalName"
                    value={verificationForm.legalName}
                    onChange={handleVerificationChange}
                    placeholder="请输入营业执照或身份证上的姓名"
                    required
                  />
                </label>
                <label>
                  <span>身份证号</span>
                  <input
                    name="idNumber"
                    value={verificationForm.idNumber}
                    onChange={handleVerificationChange}
                    placeholder="请输入身份证号码"
                    required
                  />
                </label>
              </div>

              <label className="shop-verification-address">
                <span>经营地址</span>
                <textarea
                  name="verificationAddress"
                  value={verificationForm.verificationAddress}
                  onChange={handleVerificationChange}
                  rows="3"
                  placeholder="请输入详细经营地址"
                  required
                />
              </label>

              <div className="shop-verification-upload-grid">
                <label className="shop-verification-upload">
                  <span>营业执照</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => uploadVerificationImage(event, 'businessLicenseImage', setUploadingBusinessLicense)}
                    disabled={verificationBusy}
                  />
                  {verificationForm.businessLicenseImage ? (
                    <img src={verificationForm.businessLicenseImage} alt="营业执照预览" />
                  ) : (
                    <em>{uploadingBusinessLicense ? '上传中...' : '上传营业执照照片'}</em>
                  )}
                </label>
                <label className="shop-verification-upload">
                  <span>身份证照片</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => uploadVerificationImage(event, 'idCardImage', setUploadingIdCard)}
                    disabled={verificationBusy}
                  />
                  {verificationForm.idCardImage ? (
                    <img src={verificationForm.idCardImage} alt="身份证预览" />
                  ) : (
                    <em>{uploadingIdCard ? '上传中...' : '上传身份证正面照片'}</em>
                  )}
                </label>
              </div>

              <div className="shop-verification-actions">
                <button type="submit" className="button button-primary" disabled={verificationBusy}>
                  {verifyingShop ? '提交中...' : '提交验证并开启店铺'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0' }}>
      <div className="container">
        <h2 style={{ marginBottom: '20px' }}>店铺管理</h2>
        {loading && <div className="loading">加载中...</div>}
        {error && <div style={{ color: '#ff4d4f', marginBottom: '16px' }}>{error}</div>}

        <div className="shop-owner-note">
          当前店铺归属：<strong>{user.username || user.email}</strong>
        </div>

        <div style={{ marginBottom: '30px', border: '1px solid #e8e8e8', borderRadius: '4px', padding: '20px' }}>
          <h3 style={{ marginBottom: '16px' }}>店铺信息</h3>

          {editingShop ? (
            <form onSubmit={handleSaveShop} style={{ marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>店铺名称</label>
                  <input
                    name="name"
                    value={shopForm.name}
                    onChange={handleShopFormChange}
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    店铺 Logo 图片（可选）
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  />
                  <div className="shop-field-hint">
                    {uploadingLogo ? 'Logo 上传中...' : '选择图片后会自动上传，Logo 会显示在店铺信息左侧。'}
                  </div>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => handleRestoreDefaultImage('logo')}
                    disabled={uploadingLogo}
                    style={{ marginTop: '10px', padding: '8px 14px', fontSize: '14px' }}
                  >
                    恢复默认 Logo
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>店铺简介</label>
                <textarea
                  name="description"
                  value={shopForm.description}
                  onChange={handleShopFormChange}
                  rows="3"
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px', resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  店铺横幅图片（可选）
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  disabled={uploadingBanner}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                />
                <div className="shop-field-hint">
                  {uploadingBanner ? '横幅上传中...' : '选择图片后会自动上传，横幅会显示在店铺顶部。'}
                </div>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => handleRestoreDefaultImage('banner')}
                  disabled={uploadingBanner}
                  style={{ marginTop: '10px', padding: '8px 14px', fontSize: '14px' }}
                >
                  恢复默认横幅
                </button>
              </div>

              <div className="shop-image-preview">
                <div>
                  <span>Logo 预览</span>
                  <img
                    src={resolveImageValue(shopForm.logo, shopImages.logo)}
                    alt="店铺 Logo 预览"
                    onError={(event) => {
                      event.currentTarget.src = shopImages.logo;
                    }}
                  />
                </div>
                <div>
                  <span>横幅预览</span>
                  <img
                    src={resolveImageValue(shopForm.banner, shopImages.banner)}
                    alt="店铺横幅预览"
                    onError={(event) => {
                      event.currentTarget.src = shopImages.banner;
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="button button-primary" disabled={uploadingLogo || uploadingBanner}>
                  保存
                </button>
                <button type="button" className="button button-secondary" onClick={() => setEditingShop(false)}>取消</button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', marginBottom: '20px' }}>
              <img
                src={shop.logo || shopImages.logo}
                alt={shop.name}
                onError={(event) => {
                  event.currentTarget.src = shopImages.logo;
                }}
                style={{ width: '100px', height: '100px', objectFit: 'cover', marginRight: '20px', borderRadius: '8px' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: '8px', fontSize: '18px', fontWeight: 'bold' }}>{shop.name}</div>
                <div style={{ marginBottom: '16px' }}>{shop.description}</div>
                <div style={{ marginBottom: '16px' }}>
                  <CreditBadge
                    compact
                    level={shop.creditLevel || user.creditLevel}
                    score={shop.creditScore ?? user.creditScore}
                  />
                </div>
                <button onClick={handleEditShop} className="button button-primary" style={{ padding: '8px 16px' }}>
                  编辑店铺信息
                </button>
              </div>
            </div>
          )}

          <img
            src={shop.banner || shopImages.banner}
            alt="店铺横幅"
            onError={(event) => {
              event.currentTarget.src = shopImages.banner;
            }}
            style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>商品管理</h3>
            <button onClick={handleAddProduct} className="button button-primary" style={{ padding: '8px 16px' }}>
              添加商品
            </button>
          </div>

          {editingProductId && (
            <form onSubmit={handleSaveProduct} style={{ border: '1px solid #e8e8e8', borderRadius: '4px', padding: '16px', marginBottom: '16px', background: '#fafafa' }}>
              <h4 style={{ marginBottom: '16px' }}>编辑商品</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <label>
                  <div style={{ marginBottom: '8px', color: '#666' }}>商品名称</div>
                  <input
                    name="name"
                    value={productForm.name}
                    onChange={handleProductFormChange}
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  />
                </label>
                <label>
                  <div style={{ marginBottom: '8px', color: '#666' }}>价格</div>
                  <input
                    type="number"
                    name="price"
                    value={productForm.price}
                    onChange={handleProductFormChange}
                    min="0"
                    step="0.01"
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  />
                </label>
                <label>
                  <div style={{ marginBottom: '8px', color: '#666' }}>库存</div>
                  <input
                    type="number"
                    name="stock"
                    value={productForm.stock}
                    onChange={handleProductFormChange}
                    min="0"
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  />
                </label>
                <label>
                  <div style={{ marginBottom: '8px', color: '#666' }}>销量</div>
                  <input
                    type="number"
                    name="sales"
                    value={productForm.sales}
                    onChange={handleProductFormChange}
                    min="0"
                    disabled
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  />
                </label>
                <label>
                  <div style={{ marginBottom: '8px', color: '#666' }}>状态</div>
                  <select
                    name="status"
                    value={productForm.status}
                    onChange={handleProductFormChange}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  >
                    <option value="在售">在售</option>
                    <option value="下架">下架</option>
                    <option value="已预订">已预订</option>
                    <option value="已售出">已售出</option>
                  </select>
                </label>
              </div>
              <label>
                <div style={{ marginBottom: '8px', color: '#666' }}>商品图片链接（可选）</div>
                <input
                  name="image"
                  value={productForm.image}
                  onChange={handleProductFormChange}
                  placeholder="留空保留当前图片，也可以粘贴图片 URL"
                  style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px', marginBottom: '12px' }}
                />
              </label>
              <label className="shop-product-bargain-toggle">
                <input
                  type="checkbox"
                  name="bargainEnabled"
                  checked={productForm.bargainEnabled}
                  onChange={handleProductFormChange}
                />
                <span>允许买家在私聊中发起议价</span>
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="button button-primary">保存商品</button>
                <button type="button" className="button button-secondary" onClick={() => setEditingProductId(null)}>取消</button>
              </div>
            </form>
          )}

          <div style={{ border: '1px solid #e8e8e8', borderRadius: '4px', overflowX: 'auto' }}>
            <table className="shop-product-table">
              <colgroup>
                <col style={{ width: '120px' }} />
                <col />
                <col style={{ width: '120px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '90px' }} />
                <col style={{ width: '170px' }} />
              </colgroup>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th>商品图片</th>
                  <th>商品名称</th>
                  <th>价格</th>
                  <th>库存</th>
                  <th>销量</th>
                  <th>状态</th>
                  <th>议价</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {shop.products.map(product => (
                  <tr key={product.id}>
                    <td>
                      <img
                        src={product.image || productImages.iphone}
                        alt={product.name}
                        onError={(event) => {
                          event.currentTarget.src = productImages.iphone;
                        }}
                        className="shop-product-image"
                      />
                    </td>
                    <td className="shop-product-name">{product.name}</td>
                    <td>¥{Number(product.price).toFixed(2)}</td>
                    <td>{product.stock}</td>
                    <td>{product.sales}</td>
                    <td>{product.status || '在售'}</td>
                    <td>{product.bargainEnabled === false ? '关闭' : '开启'}</td>
                    <td>
                      <div className="shop-product-actions">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="button button-primary"
                        style={{ marginRight: '8px', padding: '6px 12px', fontSize: '14px' }}
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#ff4d4f',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        删除
                      </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '16px' }}>私聊与议价</h3>
          {sellerConversations.length === 0 ? (
            <div style={{ border: '1px solid #e8e8e8', borderRadius: '4px', padding: '20px', color: '#666' }}>
              暂无买家私聊
            </div>
          ) : (
            <div className="shop-chat-list">
              {sellerConversations.map(conversation => {
                const buyerName = conversation.buyer?.nickname || conversation.buyer?.username || '买家';
                const latestMessage = conversation.latestMessage;
                const pendingRequestCount = Number(conversation.pendingRequestCount || 0);

                return (
                  <div key={conversation.id} className={`shop-chat-card${pendingRequestCount > 0 ? ' has-pending-request' : ''}`}>
                    <img
                      src={conversation.product?.images?.[0] || productImages.iphone}
                      alt={conversation.product?.name || '商品'}
                      onError={(event) => {
                        event.currentTarget.src = productImages.iphone;
                      }}
                    />
                    <div className="shop-chat-main">
                      <div className="shop-chat-title-row">
                        <strong>{conversation.product?.name || '商品私聊'}</strong>
                        {pendingRequestCount > 0 && <span>{pendingRequestCount} 个待处理申请</span>}
                      </div>
                      <div className="shop-chat-meta">
                        {buyerName} · {formatReplyTime(conversation.lastMessageAt)}
                      </div>
                      <div className="shop-chat-preview">
                        {latestMessage?.content || '买家已打开私聊，还没有发送消息。'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={() => navigate(`/chat/${conversation.id}`)}
                    >
                      进入私聊
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '16px' }}>收到的评价</h3>
          {pendingReplyEvaluations.length > 0 && (
            <div className="shop-order-alert">
              <strong>有 {pendingReplyEvaluations.length} 条新评价待回复</strong>
              <span>及时回复买家评论，可以让商品详情页展示更完整的售后沟通。</span>
            </div>
          )}
          {sellerEvaluations.length === 0 ? (
            <div style={{ border: '1px solid #e8e8e8', borderRadius: '4px', padding: '20px', color: '#666' }}>
              暂无收到的评价
            </div>
          ) : (
            sellerEvaluations.map(evaluation => {
              const needsReply = evaluation.pendingSellerReply;

              return (
                <div
                  key={evaluation.id}
                  className={`shop-order-card${needsReply ? ' is-pending is-awaiting-shipment' : ''}`}
                >
                  <div className="shop-order-header">
                    <strong>{evaluation.productName}</strong>
                    <span>{needsReply ? '待回复' : '可继续回复'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <img
                      src={evaluation.avatar}
                      alt={evaluation.username}
                      onError={(event) => {
                        event.currentTarget.src = '/images/moyu-logo.png';
                      }}
                      style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <strong>{evaluation.username}</strong>
                        <span>{renderStars(evaluation.rating)}</span>
                        <span style={{ color: '#8c8c8c', fontSize: '14px' }}>{evaluation.createTime}</span>
                      </div>
                      <div style={{ marginBottom: '12px', lineHeight: 1.6 }}>{evaluation.content}</div>
                      {evaluation.replies.length > 0 && (
                        <div className="evaluation-reply-list">
                          {evaluation.replies.map((reply) => (
                            <div key={reply.id} className={`evaluation-reply evaluation-reply-${reply.role}`}>
                              <div className="evaluation-reply-meta">
                                <strong>{reply.role === 'seller' ? '卖家' : reply.username}：</strong>
                                <span>{reply.createTime}</span>
                              </div>
                              <div className="evaluation-reply-content">{reply.content}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div>
                        <textarea
                          value={replyDrafts[evaluation.id] || ''}
                          onChange={(event) => handleReplyDraftChange(evaluation.id, event.target.value)}
                          rows="3"
                          placeholder="继续回复这条评价"
                          style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px', resize: 'vertical', marginBottom: '10px' }}
                        />
                        <button
                          type="button"
                          className="button button-primary"
                          onClick={() => handleReplyEvaluation(evaluation.id)}
                          disabled={replyingEvaluationId === evaluation.id}
                          style={{ padding: '7px 14px', fontSize: '14px' }}
                        >
                          {replyingEvaluationId === evaluation.id ? '回复中...' : '回复评价'}
                        </button>
                      </div>
                    </div>
                    <img
                      src={evaluation.productImage}
                      alt={evaluation.productName}
                      onError={(event) => {
                        event.currentTarget.src = productImages.iphone;
                      }}
                      style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '16px' }}>卖家订单与物流</h3>
          {pendingSellerOrders.length > 0 && (
            <div className="shop-order-alert">
              <strong>有 {pendingSellerOrders.length} 笔卖家订单需要关注</strong>
              <span>
                {waitingShipCount > 0
                  ? `其中 ${waitingShipCount} 笔待发货，请及时填写物流信息。`
                  : '买家已下单，支付完成后即可安排发货。'}
              </span>
            </div>
          )}
          {sellerOrders.length === 0 ? (
            <div style={{ border: '1px solid #e8e8e8', borderRadius: '4px', padding: '20px', color: '#666' }}>
              暂无卖家订单
            </div>
          ) : (
            sellerOrders.map(order => {
              const isAwaitingShipment = order.status === '待发货';
              const isPendingOrder = pendingSellerOrderStatuses.includes(order.status);
              const trackingOptions = getTrackingNumberOptions(order.id, shippingForm.company);

              return (
                <div
                  key={order.id}
                  className={`shop-order-card${isPendingOrder ? ' is-pending' : ''}${isAwaitingShipment ? ' is-awaiting-shipment' : ''}`}
                >
                  <div className="shop-order-header">
                    <strong>订单号：{order.id}</strong>
                    <span>{order.status}</span>
                  </div>
                  {(order.items || []).map(item => (
                    <div key={item.productId} className="shop-order-item">
                      <span>{item.name} x {item.quantity}</span>
                      <span>¥{Number(item.price).toFixed(2)}</span>
                    </div>
                  ))}
                  {order.shippingAddress && (
                    <div className="shop-order-address">
                      收货信息：{order.shippingAddress.name}，{order.shippingAddress.phone}，{order.shippingAddress.address}
                    </div>
                  )}
                  {isAwaitingShipment && (
                    shippingOrderId === order.id ? (
                      <div className="shipping-form-grid">
                        <select
                          name="company"
                          value={shippingForm.company}
                          onChange={handleShippingChange}
                          required
                        >
                          <option value="">选择物流公司</option>
                          {shippingCompanyOptions.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        {shippingForm.company === CUSTOM_COMPANY_VALUE && (
                          <input
                            name="customCompany"
                            value={shippingForm.customCompany}
                            onChange={handleShippingChange}
                            placeholder="填写物流公司"
                            required
                          />
                        )}
                        <select
                          name="trackingNumber"
                          value={shippingForm.trackingNumber}
                          onChange={handleShippingChange}
                          disabled={!shippingForm.company}
                          required
                        >
                          <option value="">选择物流单号</option>
                          {trackingOptions.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                          <option value={CUSTOM_TRACKING_VALUE}>自定义单号</option>
                        </select>
                        {shippingForm.trackingNumber === CUSTOM_TRACKING_VALUE && (
                          <input
                            name="customTrackingNumber"
                            value={shippingForm.customTrackingNumber}
                            onChange={handleShippingChange}
                            placeholder="填写物流单号"
                            required
                          />
                        )}
                        <button className="button button-primary" type="button" onClick={() => handleShipOrder(order.id)}>确认发货</button>
                        <button className="button button-secondary" type="button" onClick={handleCancelShipping}>取消</button>
                      </div>
                    ) : (
                      <button className="button button-primary" type="button" onClick={() => handleStartShipping(order.id)}>
                        填写物流并发货
                      </button>
                    )
                  )}
                  {order.logistics && (
                    <div className="shop-order-logistics">
                      物流：{order.logistics.company || '商家配送'} {order.logistics.trackingNumber || ''}，
                      {order.logistics.status || '运输中'}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopPage;
