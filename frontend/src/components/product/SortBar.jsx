import React from 'react';

const SortBar = ({ sortBy, onSortChange }) => {
  const sortOptions = [
    { value: 'default', label: '综合排序' },
    { value: 'price_asc', label: '价格从低到高' },
    { value: 'price_desc', label: '价格从高到低' },
    { value: 'sales', label: '销量优先' },
    { value: 'newest', label: '最新上架' }
  ];

  return (
    <div className="sort-bar">
      {sortOptions.map((option) => (
        <div
          key={option.value}
          className={`sort-option ${sortBy === option.value ? 'active' : ''}`}
          onClick={() => onSortChange(option.value)}
        >
          {option.label}
        </div>
      ))}
    </div>
  );
};

export default SortBar;