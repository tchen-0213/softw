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
  const [filters, setFilters] = useState(() => ({
    category: searchParams.get('category') || '',
    productType: searchParams.get('productType') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || ''
  }));

  const keyword = searchParams.get('keyword') || '';
  const category = searchParams.get('category') || '';
  const productType = searchParams.get('productType') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const categoryLabels = {
    electronics: '数码家电',
    clothing: '服装鞋包',
    home: '居家生活',
    sports: '运动户外',
    books: '图书教材'
  };

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      category,
      productType,
      minPrice,
      maxPrice
    }));
  }, [category, maxPrice, minPrice, productType]);

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

    const nextParams = {};
    if (keyword) {
      nextParams.keyword = keyword;
    }
    if (newFilters.category) {
      nextParams.category = newFilters.category;
    }
    if (newFilters.productType) {
      nextParams.productType = newFilters.productType;
    }
    if (newFilters.minPrice) {
      nextParams.minPrice = newFilters.minPrice;
    }
    if (newFilters.maxPrice) {
      nextParams.maxPrice = newFilters.maxPrice;
    }
    setSearchParams(nextParams);
  };

  const pageTitle = productType === '2'
    ? '二手市场'
    : (category ? categoryLabels[category] || '分类商品' : `搜索结果: ${keyword || '全部商品'}`);

  return (
    <div className="search-page">
      <div className="container">
        <div className="search-header">
          <h1>{pageTitle}</h1>
        </div>

        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ flex: '0 0 200px' }}>
            <FilterPanel filters={filters} onFilterChange={handleFilterChange} />
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
