import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    bio: '',
    phoneNumber: '',
  });
  const [profilePic, setProfilePic] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'danger'
  const navigate = useNavigate();

  const { username, email, password, confirmPassword, bio, phoneNumber } = formData;

  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const onFileChange = (e) => setProfilePic(e.target.files[0]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); // Clear previous messages
    setMessageType('');

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      setMessageType('danger');
      return;
    }

    const data = new FormData();
    data.append('username', username);
    data.append('email', email);
    data.append('password', password);
    if (bio) data.append('bio', bio);
    if (phoneNumber) data.append('phoneNumber', phoneNumber);
    if (profilePic) data.append('profilePic', profilePic); // 'profilePic' must match backend's upload.single() field name

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/register`, {
        method: 'POST',
        body: data, // FormData sets 'Content-Type' header automatically to multipart/form-data
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(result.msg || 'Registration successful!');
        setMessageType('success');
        setTimeout(() => navigate('/login'), 1500); // Redirect to login after a short delay
      } else {
        setMessage(result.msg || result.errors?.[0]?.msg || 'Registration failed.');
        setMessageType('danger');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setMessage('An unexpected error occurred. Please try again.');
      setMessageType('danger');
    }
  };

  return (
    <div className="flex justify-center items-center py-8">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-lg">
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Register</h2>
        {message && (
          <div className={`alert alert-${messageType} mb-4`}>
            {message}
          </div>
        )}
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username:</label>
            <input
              type="text"
              id="username"
              name="username"
              value={username}
              onChange={onChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={onChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={onChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password:</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={onChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="profilePic">Profile Picture (Optional):</label>
            <input
              type="file"
              id="profilePic"
              name="profilePic"
              accept="image/*"
              onChange={onFileChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="bio">Bio (Optional):</label>
            <textarea
              id="bio"
              name="bio"
              value={bio}
              onChange={onChange}
              rows="3"
            ></textarea>
          </div>
          <div className="form-group">
            <label htmlFor="phoneNumber">Phone Number (Optional):</label>
            <input
              type="text"
              id="phoneNumber"
              name="phoneNumber"
              value={phoneNumber}
              onChange={onChange}
            />
          </div>
          <button type="submit" className="btn-primary w-full">
            Register
          </button>
        </form>
        <p className="mt-4 text-center text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
