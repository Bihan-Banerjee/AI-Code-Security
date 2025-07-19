import React, { useState } from 'react';
import axios from 'axios';

const Register = () => {
  const [form, setForm] = useState({ username: '', password: '', bio: '', phone: '', profileImage: null });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    if (e.target.name === 'profileImage') {
      setForm({ ...form, profileImage: e.target.files[0] });
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => value && data.append(key, value));
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/auth/register`, data);
      setSuccess('Registration successful! You can now login.');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto mt-10 p-6 border rounded">
      <h2 className="text-2xl mb-4">Register</h2>
      <input name="username" placeholder="Username" onChange={handleChange} required className="input" />
      <input name="password" type="password" placeholder="Password" onChange={handleChange} required className="input" />
      <input name="bio" placeholder="Bio" onChange={handleChange} className="input" />
      <input name="phone" placeholder="Phone" onChange={handleChange} className="input" />
      <input name="profileImage" type="file" accept="image/*" onChange={handleChange} className="input" />
      <button type="submit" className="btn">Register</button>
      {error && <div className="text-red-500 mt-2">{error}</div>}
      {success && <div className="text-green-500 mt-2">{success}</div>}
    </form>
  );
};

export default Register;
