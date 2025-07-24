import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] text-center">
      <h1 className="text-5xl font-extrabold text-gray-900 mb-6">
        Welcome to the Auth System
      </h1>
      <p className="text-lg text-gray-700 mb-8 max-w-2xl">
        This is a full-stack authentication application built with React, Tailwind CSS, and Node.js/Express.
        It features user registration, login, JWT-protected routes, and profile management.
      </p>
      <div className="flex space-x-4">
        <Link to="/login" className="btn-primary px-6 py-3 text-lg">
          Login
        </Link>
        <Link to="/register" className="btn-primary px-6 py-3 text-lg">
          Register
        </Link>
      </div>
    </div>
  );
};

export default Home;
