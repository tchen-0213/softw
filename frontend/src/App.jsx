import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import SearchPage from './pages/search/SearchPage'
import ProductDetailPage from './pages/product/ProductDetailPage'
import HomePage from './pages/home/HomePage'
import CartPage from './pages/cart/CartPage'
import CheckoutPage from './pages/checkout/CheckoutPage'
import OrderPage from './pages/order/OrderPage'
import SellPage from './pages/sell/SellPage'
import EvaluationPage from './pages/evaluation/EvaluationPage'
import ShopPage from './pages/shop/ShopPage'
import UserPage from './pages/user/UserPage'
import Header from './components/Header'
import Footer from './components/Footer'

function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order" element={<OrderPage />} />
        <Route path="/sell" element={<SellPage />} />
        <Route path="/evaluation/:orderId" element={<EvaluationPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/user" element={<UserPage />} />
      </Routes>
      <Footer />
    </Router>
  )
}

export default App