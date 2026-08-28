import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productApi, secondhandApi, shopApi, uploadApi } from '../../services/api';

const conditionMap = {
  1: '全新',
  2: '9成新',
  3: '8成新',
  4: '7成新',
  5: '6成新及以下'
};

const SellPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: 1,
    description: '',
    images: [],
    category: '',
    productType: 2,
    condition: 3,
    usageTime: '',
    location: '',
    hasDefect: false,
    defectDescription: '',
    bargainEnabled: true
  });

  const [loading, setLoading] = useState(false);
  const [checkingShop, setCheckingShop] = useState(true);
  const [shopVerified, setShopVerified] = useState(false);
  const [shopCheckError, setShopCheckError] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkShopVerification = async () => {
      if (!localStorage.getItem('token')) {
        setCheckingShop(false);
        setShopVerified(false);
        return;
      }

      setCheckingShop(true);
      try {
        const response = await shopApi.getMine();
        const shop = response.data || {};
        setShopVerified(shop.verificationStatus === '已认证' || shop.status === '营业中');
        setShopCheckError('');
      } catch (err) {
        setShopVerified(false);
        setShopCheckError(err.response?.data?.message || '店铺验证状态加载失败');
      } finally {
        setCheckingShop(false);
      }
    };

    checkShopVerification();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) {
      return;
    }

    if (!localStorage.getItem('token')) {
      setError('请先登录后再上传图片');
      navigate('/login');
      return;
    }

    setUploadingImages(true);
    setError('');
    try {
      const response = await uploadApi.uploadImages(files);
      const imageUrls = response.data.urls || [];
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...imageUrls]
      }));
    } catch (err) {
      setError(err.response?.data?.message || '图片上传失败，请稍后重试');
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!localStorage.getItem('token')) {
      alert('请先登录后再发布商品');
      navigate('/login');
      return;
    }

    if (!shopVerified) {
      setError('请先完成店铺验证后再发布商品');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        name: formData.name,
        price: Number(formData.price),
        stock: Number(formData.stock),
        description: formData.description,
        images: formData.images,
        category: formData.category,
        productType: formData.productType,
        condition: conditionMap[formData.condition],
        usageTime: formData.usageTime,
        hasDefect: formData.hasDefect,
        defectDescription: formData.hasDefect ? formData.defectDescription : '',
        location: formData.location,
        isSecondhand: formData.productType === 2,
        bargainEnabled: formData.bargainEnabled
      };

      const response = formData.productType === 2
        ? await secondhandApi.create(payload)
        : await productApi.create(payload);

      alert('商品发布成功！');
      navigate(`/product/${response.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || '商品发布失败，请检查信息后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`page-shell${!shopVerified ? ' page-shell-empty' : ''}`}>
      <div className="container">
        <h2 className="page-title">发布商品</h2>
        {checkingShop ? (
          <div className="shop-empty-panel page-empty-state">
            <h3>正在检查店铺验证状态</h3>
            <p>请稍候，马上就好。</p>
          </div>
        ) : !localStorage.getItem('token') ? (
          <div className="shop-empty-panel page-empty-state">
            <h3>请先登录后再发布商品</h3>
            <p>登录后可完成店铺验证并发布商品。</p>
            <button className="button button-primary" onClick={() => navigate('/login')}>
              去登录
            </button>
          </div>
        ) : !shopVerified ? (
          <div className="shop-empty-panel page-empty-state">
            <h3>请先完成店铺验证</h3>
            <p>{shopCheckError || '发布商品前需要先提交营业执照、身份证和经营地址等资料。'}</p>
            <button className="button button-primary" onClick={() => navigate('/shop')}>
              去验证店铺
            </button>
          </div>
        ) : (
          <>
            {error && <div className="biz-error">{error}</div>}
            <form className="biz-card biz-form" onSubmit={handleSubmit}>
              <div className="biz-field">
                <span className="biz-field-label">商品类型</span>
                <div className="biz-radio-row">
                  <label>
                    <input
                      type="radio"
                      name="productType"
                      value="1"
                      checked={formData.productType === 1}
                      onChange={(e) => setFormData(prev => ({ ...prev, productType: parseInt(e.target.value) }))}
                    />
                    <span>新品</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="productType"
                      value="2"
                      checked={formData.productType === 2}
                      onChange={(e) => setFormData(prev => ({ ...prev, productType: parseInt(e.target.value) }))}
                    />
                    <span>二手</span>
                  </label>
                </div>
              </div>

              <div className="biz-field">
                <label>商品名称</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required />
              </div>

              <div className="biz-field">
                <label>价格</label>
                <input type="number" name="price" value={formData.price} onChange={handleChange} required min="0" step="0.01" />
              </div>

              <div className="biz-check-card">
                <label>
                  <input
                    type="checkbox"
                    name="bargainEnabled"
                    checked={formData.bargainEnabled}
                    onChange={handleChange}
                  />
                  开启议价功能
                </label>
                <p>开启后买家可以在私聊中提交期望金额，由商家同意或拒绝。</p>
              </div>

              <div className="biz-field">
                <label>库存数量</label>
                <input type="number" name="stock" value={formData.stock} onChange={handleChange} required min="1" step="1" />
              </div>

              <div className="biz-field">
                <label>商品描述</label>
                <textarea name="description" value={formData.description} onChange={handleChange} required rows="5" />
              </div>

              <div className="biz-field">
                <label>商品图片</label>
                <input type="file" multiple accept="image/*" onChange={handleImageUpload} disabled={uploadingImages} />
                {uploadingImages && <div className="eval-hint">图片上传中...</div>}
                <div className="eval-images">
                  {formData.images.map((image, index) => (
                    <div key={index} className="eval-image">
                      <img src={image} alt={`预览 ${index + 1}`} />
                      <button type="button" className="eval-image-remove" onClick={() => handleRemoveImage(index)}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="biz-field">
                <label>商品分类</label>
                <select name="category" value={formData.category} onChange={handleChange} required>
                  <option value="">请选择分类</option>
                  <option value="electronics">电子产品</option>
                  <option value="clothing">服装</option>
                  <option value="books">图书</option>
                  <option value="home">家居</option>
                  <option value="other">其他</option>
                </select>
              </div>

              <div className="biz-field">
                <label>交易/发货地点</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="例如：上海市浦东新区"
                />
              </div>

              {formData.productType === 2 && (
                <div className="biz-section">
                  <h3 className="biz-section-title">二手商品信息</h3>
                  <div className="biz-field">
                    <label>成色</label>
                    <select
                      name="condition"
                      value={formData.condition}
                      onChange={(e) => setFormData(prev => ({ ...prev, condition: parseInt(e.target.value) }))}
                    >
                      <option value="1">全新</option>
                      <option value="2">九成新</option>
                      <option value="3">八成新</option>
                      <option value="4">七成新</option>
                      <option value="5">六成新及以下</option>
                    </select>
                  </div>
                  <div className="biz-field">
                    <label>使用时间</label>
                    <input
                      type="text"
                      name="usageTime"
                      value={formData.usageTime}
                      onChange={handleChange}
                      placeholder="例如：6个月"
                    />
                  </div>
                  <div className="biz-field">
                    <label className="biz-radio-row">
                      <input
                        type="checkbox"
                        name="hasDefect"
                        checked={formData.hasDefect}
                        onChange={handleChange}
                      />
                      <span>有瑕疵</span>
                    </label>
                    {formData.hasDefect && (
                      <textarea
                        name="defectDescription"
                        value={formData.defectDescription}
                        onChange={handleChange}
                        placeholder="请描述瑕疵情况"
                        rows="3"
                      />
                    )}
                  </div>
                </div>
              )}

              <div className="biz-form-actions">
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={loading || uploadingImages}
                >
                  {loading ? '发布中...' : '发布商品'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default SellPage;
