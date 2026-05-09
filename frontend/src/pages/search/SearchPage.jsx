import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { searchProducts } from '../../store/productSlice';
import SearchResults from '../../components/product/SearchResults';
import FilterPanel from '../../components/product/FilterPanel';
import SortBar from '../../components/product/SortBar';

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();
  const { searchResults, searchLoading, searchError } = useSelector((state) => state.product);
  
  const [sortBy, setSortBy] = useState('default');
  const [filters, setFilters] = useState({});

  const keyword = searchParams.get('keyword') || '';

  useEffect(() => {
    dispatch(searchProducts({
      keyword,
      sortBy,
      ...filters
    }));
  }, [dispatch, keyword, sortBy, filters]);

  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="search-page">
      <div className="container">
        <div className="search-header">
          <h1>搜索结果: {keyword}</h1>
        </div>

        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ flex: '0 0 200px' }}>
            <FilterPanel onFilterChange={handleFilterChange} />
          </div>
          <div style={{ flex: 1 }}>
            <SortBar sortBy={sortBy} onSortChange={handleSortChange} />
            <SearchResults 
              results={searchResults} 
              loading={searchLoading} 
              error={searchError} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;