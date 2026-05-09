import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?keyword=${encodeURIComponent(searchTerm)}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="search-container">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="搜索商品"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            height: '40px',
            padding: '0 16px',
            border: '1px solid #d9d9d9',
            borderRight: 'none',
            borderRadius: '4px 0 0 4px',
            fontSize: '14px'
          }}
        />
        <button
          type="submit"
          style={{
            height: '40px',
            padding: '0 20px',
            backgroundColor: '#1890ff',
            color: '#fff',
            border: '1px solid #1890ff',
            borderLeft: 'none',
            borderRadius: '0 4px 4px 0',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          搜索
        </button>
      </div>
    </form>
  );
};

export default SearchBar;