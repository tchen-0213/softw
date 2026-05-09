import React, { useState } from 'react';

const FilterPanel = ({ onFilterChange }) => {
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [category, setCategory] = useState('');
  const [productType, setProductType] = useState('');

  const categories = [
    { value: '', label: '全部分类' },
    { value: '1', label: '电子产品' },
    { value: '2', label: '服装鞋包' },
    { value: '3', label: '家居生活' },
    { value: '4', label: '运动户外' },
    { value: '5', label: '图书音像' }
  ];

  const productTypes = [
    { value: '', label: '全部类型' },
    { value: '1', label: '新品' },
    { value: '2', label: '二手' }
  ];

  const handleFilterChange = () => {
    onFilterChange({
      priceMin: priceRange.min,
      priceMax: priceRange.max,
      category,
      productType
    });
  };

  return (
    <div className="filter-panel">
      <div className="filter-section">
        <div className="filter-title">价格范围</div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="number"
            placeholder="最低"
            value={priceRange.min}
            onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
            style={{
              width: '100px',
              padding: '8px',
              border: '1px solid #d9d9d9',
              borderRadius: '4px'
            }}
          />
          <span>-</span>
          <input
            type="number"
            placeholder="最高"
            value={priceRange.max}
            onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
            style={{
              width: '100px',
              padding: '8px',
              border: '1px solid #d9d9d9',
              borderRadius: '4px'
            }}
          />
          <span>元</span>
        </div>
      </div>

      <div className="filter-section">
        <div className="filter-title">商品分类</div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          {categories.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-section">
        <div className="filter-title">商品类型</div>
        <select
          value={productType}
          onChange={(e) => setProductType(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          {productTypes.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleFilterChange}
        className="button button-primary"
        style={{ width: '100%' }}
      >
        应用筛选
      </button>
    </div>
  );
};

export default FilterPanel;