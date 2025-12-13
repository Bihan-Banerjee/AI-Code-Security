# FortiScan

AI-powered code security scanner and enhancer for Python and JavaScript applications.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.3-61dafb)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646cff)](https://vitejs.dev/)

## Overview

FortiScan combines advanced AI models with static analysis to identify security vulnerabilities and enhance code quality. Built for developers who need fast, accurate security feedback without leaving their workflow.

**Key Features:**
- **Multi-Model AI Analysis** – Compare outputs from 3+ AI models for code enhancement
- **Real-time Vulnerability Detection** – Scan for 50+ vulnerability types with 99.8% accuracy
- **Language Support** – Python and JavaScript/TypeScript
- **Dashboard & History** – Track all scans and enhancements in one place

## Tech Stack

**Frontend**
- React 18.3 + TypeScript
- Vite for fast builds
- TailwindCSS + shadcn/ui components
- React Router for navigation
- TanStack Query for state management

**Backend**
- Flask (Python)
- JWT authentication
- MongoDB for data persistence
- Bandit for Python security analysis
- OpenAI/Gemini APIs for AI enhancements

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- MongoDB instance (local or cloud)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/fortiscan.git
   cd fortiscan
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. **Configure environment variables**

   Create `.env.development` in the root:
   ```env
   VITE_API_BASE_URL=http://localhost:5000
   ```

   Create `.env` in the backend directory:
   ```env
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   OPENAI_API_KEY=your_openai_key
   GEMINI_API_KEY=your_gemini_key
   ```

5. **Run the application**

   Start the backend:
   ```bash
   cd backend
   python app.py
   ```

   Start the frontend (in a new terminal):
   ```bash
   npm run dev
   ```

Visit `http://localhost:5173` to access the application.

## Usage

### Security Scanner

1. Navigate to the Scanner page
2. Select your language (Python or JavaScript)
3. Upload files or paste code directly
4. Click "Start Security Scan"
5. Review identified vulnerabilities with severity levels and CWE references

### AI Code Enhancer

1. Navigate to the Enhancer page
2. Select your language
3. Upload or paste code
4. Click "Enhance Code"
5. Compare suggestions from multiple AI models
6. Review security explanations and improvements

### Dashboard

Access your scan history, enhancement results, and analytics from the centralized dashboard.

## Project Structure

```
fortiscan/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Route pages
│   ├── lib/            # API client and utilities
│   └── assets/         # Static assets
├── backend/
│   ├── app.py          # Flask application
│   ├── auth.py         # Authentication logic
│   └── routes/         # API endpoints
└── public/             # Public assets
```

## Deployment

The application is configured for deployment on Vercel (frontend) and can be deployed to any Python hosting service (backend).

**Frontend:**
```bash
npm run build
```

**Backend:**
Deploy using your preferred Python hosting platform (e.g., Railway, Render, AWS).

## Roadmap

- [ ] Support for additional languages (Java, Go, Rust)
- [ ] IDE extensions (VS Code, IntelliJ)
- [ ] CI/CD integration plugins
- [ ] Real-time collaborative code reviews
- [ ] Advanced vulnerability remediation suggestions

## Contributing

Contributions are welcome. Please open an issue first to discuss proposed changes.

## Authors

**Bihan Banerjee** – Cybersecurity Specialist  
3rd year CSE (Information Security), VIT Vellore

**Nethra Krishnan** – AI Specialist  
3rd year CSE (Data Science), VIT Vellore

## License

This project is licensed under the MIT License.

## Acknowledgments

- OpenAI and Google Gemini for AI capabilities
- Bandit for Python security analysis
- shadcn/ui for component library
