import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/');
          return;
        }
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/auth/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(response.data);
      } catch (err) {
        setError(err.response?.data.error || 'An error occurred');
        localStorage.removeItem('token');
        navigate('/');
      }
    };
    fetchUser();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Dashboard</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Bio:</strong> {user.bio || 'No bio provided'}</p>
        <p><strong>Phone:</strong> {user.phone || 'No phone provided'}</p>
        {user.profileImage && (
          <img
            src={`${process.env.REACT_APP_API_URL}/uploads/${user.profileImage}`}
            alt="Profile"
            className="w-32 h-32 rounded-full mx-auto mt-4"
          />
        )}
        <button
          onClick={handleLogout}
          className="w-full bg-red-500 text-white p-2 rounded mt-6 hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
