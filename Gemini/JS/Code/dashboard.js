import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/user/dashboard`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token, // Attach JWT token
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        } else if (response.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('token');
          setError('Session expired. Please log in again.');
          setTimeout(() => navigate('/login'), 1500);
        } else {
          const errorData = await response.json();
          setError(errorData.msg || 'Failed to fetch user data.');
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError('An unexpected error occurred while fetching data.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  if (loading) {
    return <div className="text-center text-lg mt-8">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="alert alert-danger mt-8">{error}</div>;
  }

  if (!userData) {
    return <div className="text-center text-lg mt-8">No user data found.</div>;
  }

  // Construct full URL for profile picture
  const profilePicUrl = userData.profilePic
    ? `${process.env.REACT_APP_API_URL.replace('/api', '')}${userData.profilePic}`
    : null;

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-2xl mx-auto mt-8">
      <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Your Dashboard</h2>
      <div className="flex flex-col items-center space-y-4">
        {profilePicUrl && (
          <img
            src={profilePicUrl}
            alt="Profile"
            className="profile-pic"
          />
        )}
        <p className="text-lg"><strong>Username:</strong> {userData.username}</p>
        <p className="text-lg"><strong>Email:</strong> {userData.email}</p>
        {userData.bio && <p className="text-lg"><strong>Bio:</strong> {userData.bio}</p>}
        {userData.phoneNumber && <p className="text-lg"><strong>Phone Number:</strong> {userData.phoneNumber}</p>}
        <p className="text-sm text-gray-500">Member since: {new Date(userData.date).toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export default Dashboard;
