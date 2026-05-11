import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { userApi } from '../../services/api';

const AuthPage = ({ mode }) => {
  const isRegister = mode === 'register';
  const navigate = useNavigate();
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

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify({
        id: response.data._id,
        username: response.data.username,
        email: response.data.email
      }));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || '操作失败，请检查输入后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px 0' }}>
      <div className="container" style={{ maxWidth: '460px' }}>
        <div style={{ background: '#fff', padding: '28px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h2 style={{ marginBottom: '24px' }}>{isRegister ? '用户注册' : '用户登录'}</h2>

          {error && (
            <div style={{ color: '#ff4d4f', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px' }}>用户名</label>
                  <input
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px' }}>手机号</label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  />
                </div>
              </>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px' }}>邮箱</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '10px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px' }}>密码</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                style={{ width: '100%', padding: '10px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="button button-primary"
              style={{ width: '100%' }}
            >
              {loading ? '处理中...' : (isRegister ? '注册并登录' : '登录')}
            </button>
          </form>

          <div style={{ marginTop: '18px', textAlign: 'center', color: '#666' }}>
            {isRegister ? (
              <>已有账号？ <Link to="/login">去登录</Link></>
            ) : (
              <>还没有账号？ <Link to="/register">去注册</Link></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
