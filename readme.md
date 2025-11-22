# 🔐 SecureCode AI: Analyzing and Enhancing AI-Generated Code Security

[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)\
[![Python](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/)\
[![React](https://img.shields.io/badge/react-18-blue.svg)](https://reactjs.org/)\
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green.svg)](https://www.mongodb.com/)\
[![Flask](https://img.shields.io/badge/Flask-2.x-black.svg)](https://flask.palletsprojects.com/)

------------------------------------------------------------------------

## 📌 Project Overview

This repository is part of our **research project and web application**
on\
**"The Security Implications of AI-Generated Code."**

We analyze, detect, and mitigate vulnerabilities in **AI-generated
source code** using: - **Static Analysis Tools** (Bandit, Semgrep,
SonarCloud) - **AI-Powered Enhancements** (CodeT5-based model for
auto-fixes) - **A Full-Stack Web App** (React + Flask + MongoDB) for
interactive testing.

The project has **two major components**: 1. **Research Simulation**:
Collecting AI-generated code, scanning for vulnerabilities, and
documenting results for our paper.\
2. **Web Platform**: A user-facing app where developers can: - Upload
code for scanning. - Enhance insecure code automatically. - View
detailed reports and diffs. - Share reviews and feedback.

------------------------------------------------------------------------

## 🚀 Features

✅ **AI-Powered Code Enhancer** -- Fixes insecure code (Python &
JavaScript) using CodeT5 and other models.\
✅ **Security Scanner** -- Detects vulnerabilities via Bandit (Python) &
Semgrep (JavaScript).\
✅ **Unified Diff Viewer** -- GitHub-style inline diffs showing code
improvements.\
✅ **User Authentication** -- JWT-based login, registration, and Google
Auth (optional).\
✅ **History Dashboard** -- View past scans and enhancements with
pagination.\
✅ **Review System** -- Submit and display user reviews for platform
feedback.\
✅ **Optimized Backend** -- Caching (Redis), Gzip compression, rate
limiting.\
✅ **Research Dataset** -- Scripts for collecting and analyzing
LLM-generated code.

------------------------------------------------------------------------

## ⚡ Installation & Setup

### 1️⃣ Clone Repo

``` bash
git clone https://github.com/your-username/securecode-ai.git
cd securecode-ai
```

### 2️⃣ Backend Setup (Flask + Model)

``` bash
cd backend
python -m venv venv
source venv/bin/activate   # (Linux/Mac)
venv\Scriptsctivate      # (Windows)

pip install -r requirements.txt
python app.py
```

Make sure you have: - **MongoDB Atlas URI** in `.env` - **Redis**
running locally or via Docker: `bash   docker run -d -p 6379:6379 redis`

### 3️⃣ Frontend Setup (React + Vite)

``` bash
cd frontend
npm install
npm run dev
```

### 4️⃣ Research Scripts

Generate code and run scans for the paper:

``` bash
cd research
python collect_llm_code.py
bandit -r generated_code/ -f json > scan_results/python.json
semgrep --config=p/javascript --json generated_code/ > scan_results/js.json
```

------------------------------------------------------------------------

## 🤝 Contributing

We welcome contributions!
- Fork the repo
- Create a feature branch (`git checkout -b feature/my-feature`)
- Commit changes (`git commit -m 'Add new feature'`)
- Push (`git push origin feature/my-feature`)
- Open a Pull Request 🚀

------------------------------------------------------------------------

## 📜 License

This project is licensed under the MIT License.
