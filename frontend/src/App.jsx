import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import SearchPage from './pages/search/SearchPage'
import ProductDetailPage from './pages/product/ProductDetailPage'
import HomePage from './pages/home/HomePage'
import CartPage from './pages/cart/CartPage'
import CheckoutPage from './pages/checkout/CheckoutPage'
import OrderPage from './pages/order/OrderPage'
import SellPage from './pages/sell/SellPage'
import EvaluationPage from './pages/evaluation/EvaluationPage'
import ShopPage from './pages/shop/ShopPage'
import PublicShopPage from './pages/shop/PublicShopPage'
import UserPage from './pages/user/UserPage'
import AuthPage from './pages/auth/AuthPage'
import AboutPage from './pages/legal/AboutPage'
import PrivacyPolicyPage from './pages/legal/PrivacyPolicyPage'
import UserAgreementPage from './pages/legal/UserAgreementPage'
import Header from './components/Header'
import Footer from './components/Footer'
import FloatingCart from './components/cart/FloatingCart'

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
        <Route path="/shop/user/:userId" element={<PublicShopPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/user" element={<UserPage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<Navigate to="/about" replace />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<UserAgreementPage />} />
      </Routes>
      <FloatingCart />
      <Footer />
    </Router>
  )
}

export default App
