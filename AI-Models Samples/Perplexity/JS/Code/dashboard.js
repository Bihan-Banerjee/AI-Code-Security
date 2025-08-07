import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Dashboard = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) return window.location.href = '/login';
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/user/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(res.data);
      } catch {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    };
    fetchUser();
  }, []);

  if (!user) return null;

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded">
      <h2 className="text-2xl mb-4">Dashboard</h2>
      <p><strong>Username:</strong> {user.username}</p>
      <p><strong>Bio:</strong> {user.bio || '-'}</p>
      <p><strong>Phone:</strong> {user.phone || '-'}</p>
      {user.profileImage && (
        <img src={`http://localhost:5000/${user.profileImage}`} alt="Profile" className="w-32 h-32 mt-4 rounded-full object-cover" />
      )}
    </div>
  );
};

export default Dashboard;
