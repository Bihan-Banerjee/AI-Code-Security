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
JavaScript) using CodeT5.\
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

## 🛠️ Tech Stack

### **Frontend**

-   React (Vite + TypeScript + TailwindCSS + ShadCN UI)
-   React Query (for caching API calls)
-   Axios
-   Lucide Icons

### **Backend**

-   Flask (REST API)
-   Flask-JWT-Extended (Authentication)
-   Flask-Limiter (Rate limiting)
-   Flask-Caching + Redis (Performance)
-   Flask-Compress (Gzip)
-   MongoDB (Atlas or local)

### **AI Model**

-   Hugging Face **Salesforce/CodeT5-base**\
-   PyTorch + Transformers
-   Secure code postprocessing & diffing

### **Static Analysis Tools**

-   Bandit (Python Security Scanning)
-   Semgrep (JavaScript Security Scanning)

------------------------------------------------------------------------

## 📂 Project Structure

    AI-Code-Security/
    │── frontend/                # React + Vite + TS Web App
    │   ├── src/
    │   │   ├── pages/           # UI Pages (Dashboard, Scanner, Enhancer, etc.)
    │   │   ├── components/      # Reusable components
    │   │   ├── lib/             # Schemas & utils
    │   │   └── main.tsx
    │   └── public/              # Static assets (favicon, logos)
    │
    │── backend/                 # Flask Backend
    │   ├── app.py               # Main server entrypoint
    │   ├── model.py             # CodeT5 enhancer logic
    │   ├── routes/              # Auth, Reviews, etc.
    │   ├── schemas.py           # Validation
    │   └── models/              # MongoDB models
    │
    │── research/                # Paper-related scripts & datasets
    │   ├── collect_llm_code.py  # Generate AI code from GPT models
    │   ├── scan_results/        # Static analysis results
    │   └── analysis.ipynb       # Vulnerability metrics
    │
    │── docs/                    # Paper drafts, notes
    │── README.md                # This file

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

## 📊 Research Goals

This project is part of a formal research study on: - 🔍 **Prevalence of
vulnerabilities in AI-generated code.** - ⚠️ **Risks of adopting AI code
blindly in production.** - 🛠️ **Enhancement strategies via ML
models.** - 📈 **Empirical evaluation of AI-assisted security fixes.**

We provide: - Raw datasets (insecure LLM outputs). - Scanning results. -
Enhanced versions & diffs. - Visual dashboards.

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
