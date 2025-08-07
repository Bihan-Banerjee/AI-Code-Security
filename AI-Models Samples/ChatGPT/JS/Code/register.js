import { useState } from 'react';
import axios from 'axios';

function Register() {
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', bio: '', phone: '', profileImage: null
  });

  const handleChange = (e) => {
    if (e.target.name === 'profileImage') {
      setFormData({ ...formData, profileImage: e.target.files[0] });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.keys(formData).forEach(key => data.append(key, formData[key]));

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/register`, data);
      alert('Registration Successful!');
    } catch (err) {
      alert(err.response.data.msg || 'Error occurred');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <input type="text" name="username" placeholder="Username" onChange={handleChange} required /><br/>
      <input type="email" name="email" placeholder="Email" onChange={handleChange} required /><br/>
      <input type="password" name="password" placeholder="Password" onChange={handleChange} required /><br/>
      <input type="text" name="bio" placeholder="Bio" onChange={handleChange} /><br/>
      <input type="text" name="phone" placeholder="Phone" onChange={handleChange} /><br/>
      <input type="file" name="profileImage" onChange={handleChange} /><br/>
      <button type="submit" className="bg-blue-500 text-white p-2">Register</button>
    </form>
  );
}

export default Register;
