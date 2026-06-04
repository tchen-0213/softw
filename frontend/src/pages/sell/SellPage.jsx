import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productApi, secondhandApi, uploadApi } from '../../services/api';

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
    productType: 2, // 1: 新品, 2: 二手
    condition: 3, // 1: 全新, 2: 九成新, 3: 八成新, 4: 七成新, 5: 六成新及以下
    usageTime: '',
    location: '',
    hasDefect: false,
    defectDescription: ''
  });

  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
        isSecondhand: formData.productType === 2
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
    <div style={{ padding: '20px 0' }}>
      <div className="container">
        <h2 style={{ marginBottom: '20px' }}>发布商品</h2>
        {error && <div style={{ color: '#ff4d4f', marginBottom: '16px' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ border: '1px solid #e8e8e8', borderRadius: '4px', padding: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>商品类型</label>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="radio"
                  name="productType"
                  value="1"
                  checked={formData.productType === 1}
                  onChange={(e) => setFormData(prev => ({ ...prev, productType: parseInt(e.target.value) }))}
                  style={{ marginRight: '8px' }}
                />
                <span>新品</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="radio"
                  name="productType"
                  value="2"
                  checked={formData.productType === 2}
                  onChange={(e) => setFormData(prev => ({ ...prev, productType: parseInt(e.target.value) }))}
                  style={{ marginRight: '8px' }}
                />
                <span>二手</span>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>商品名称</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>价格</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>库存数量</label>
            <input
              type="number"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              required
              min="1"
              step="1"
              style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>商品描述</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="5"
              style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px', resize: 'vertical' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>商品图片</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploadingImages}
              style={{ marginBottom: '12px' }}
            />
            {uploadingImages && <div style={{ color: '#666', marginBottom: '12px' }}>图片上传中...</div>}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {formData.images.map((image, index) => (
                <div key={index} style={{ position: 'relative' }}>
                  <img
                    src={image}
                    alt={`预览 ${index + 1}`}
                    style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      background: '#ff4d4f',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>商品分类</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
            >
              <option value="">请选择分类</option>
              <option value="electronics">电子产品</option>
              <option value="clothing">服装</option>
              <option value="books">图书</option>
              <option value="home">家居</option>
              <option value="other">其他</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>交易/发货地点</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="例如：上海市浦东新区"
              style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
            />
          </div>

          {formData.productType === 2 && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '12px' }}>二手商品信息</h3>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px' }}>成色</label>
                <select
                  name="condition"
                  value={formData.condition}
                  onChange={(e) => setFormData(prev => ({ ...prev, condition: parseInt(e.target.value) }))}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                >
                  <option value="1">全新</option>
                  <option value="2">九成新</option>
                  <option value="3">八成新</option>
                  <option value="4">七成新</option>
                  <option value="5">六成新及以下</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px' }}>使用时间</label>
                <input
                  type="text"
                  name="usageTime"
                  value={formData.usageTime}
                  onChange={handleChange}
                  placeholder="例如：6个月"
                  style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    name="hasDefect"
                    checked={formData.hasDefect}
                    onChange={handleChange}
                    style={{ marginRight: '8px' }}
                  />
                  <label>有瑕疵</label>
                </div>
                {formData.hasDefect && (
                  <textarea
                    name="defectDescription"
                    value={formData.defectDescription}
                    onChange={handleChange}
                    placeholder="请描述瑕疵情况"
                    rows="3"
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px', resize: 'vertical' }}
                  />
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              type="submit"
              disabled={loading || uploadingImages}
              style={{
                padding: '10px 30px',
                background: '#1890ff',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: loading || uploadingImages ? 'not-allowed' : 'pointer',
                fontSize: '16px'
              }}
            >
              {loading ? '发布中...' : '发布商品'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SellPage;
