import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { switchCartOwner } from '../../store/cartSlice';
import { userApi } from '../../services/api';

const AuthPage = ({ mode }) => {
  const isRegister = mode === 'register';
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = isRegister
        ? formData
        : { email: formData.email, password: formData.password };
      const response = isRegister
        ? await userApi.register(payload)
        : await userApi.login(payload);

      const user = {
        id: response.data._id,
        username: response.data.username,
        nickname: response.data.nickname,
        email: response.data.email,
        phone: response.data.phone || formData.phone || '',
        avatar: response.data.avatar,
        creditLevel: response.data.creditLevel,
        creditScore: response.data.creditScore,
        role: response.data.role
      };

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(user));
      dispatch(switchCartOwner(user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || '操作失败，请检查输入后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="container auth-container">
        <section className="auth-card">
          <span className="auth-kicker">欢迎来到摸鱼</span>
          <h2>{isRegister ? '用户注册' : '用户登录'}</h2>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <>
                <div className="auth-field">
                  <label htmlFor="auth-username">用户名</label>
                  <input
                    id="auth-username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="auth-phone">手机号</label>
                  <input
                    id="auth-phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </>
            )}

            <div className="auth-field">
              <label htmlFor="auth-email">邮箱</label>
              <input
                id="auth-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="auth-password">密码</label>
              <input
                id="auth-password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="button button-primary"
            >
              {loading ? '处理中...' : (isRegister ? '注册并登录' : '登录')}
            </button>
          </form>

          <div className="auth-switch">
            {isRegister ? (
              <>已有账号？ <Link to="/login">去登录</Link></>
            ) : (
              <>没有账号？ <Link to="/register">立即注册</Link></>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default AuthPage;
