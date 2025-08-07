import React, { useState } from 'react';
import axios from 'axios';

const Login = ({ history }) => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/auth/login`, form);
      localStorage.setItem('token', res.data.token);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto mt-10 p-6 border rounded">
      <h2 className="text-2xl mb-4">Login</h2>
      <input name="username" placeholder="Username" onChange={handleChange} required className="input" />
      <input name="password" type="password" placeholder="Password" onChange={handleChange} required className="input" />
      <button type="submit" className="btn">Login</button>
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </form>
  );
};

export default Login;
