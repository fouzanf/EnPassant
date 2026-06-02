# 🛡️ EnPassant Proxy: Enterprise AI Proxy Gateway

EnPassant Proxy is a production-grade full-stack AI Proxy Gateway designed to bridge the gap between corporate data privacy compliance and modern LLM capabilities. Built using **FastAPI** and **Next.js**, the proxy intercepts outgoing AI prompts to strip sensitive Personal Identifiable Information (PII) before it hits external LLM vendors, while optimizing network overhead via an algorithmic caching layer and real-time cloud analytics.

---

## 🚀 Key Features

* **🔒 Automated PII Sanitization:** Uses optimized regular expressions (`re.subn`) to detect, count, and redact sensitive corporate data leakage—including Emails, Phone Numbers, and 16-digit Credit Card strings—replacing them with secure placeholders (`[EMAIL REDACTED]`, etc.) before API dispatch.
* **⚡ Algorithmic Exact Caching:** Bypasses external network latencies and token usage costs via an $O(1)$ in-memory hash check. Repeat queries are caught, logged as a `[CACHE HIT]`, and served instantly in milliseconds.
* **📊 Live NOC Telemetry Dashboard:** A premium Next.js dashboard that polls system metrics dynamically every 2.5 seconds to visualize total data throughput, cache efficiency, and specific intercepted PII counts.
* **☁️ Persistent Cloud Infrastructure:** Replaced volatile memory states with a structured **MongoDB Atlas** database integration using atomic modifiers (`$inc`), ensuring proxy telemetry and data caches survive total system restarts.

---

## 🏗️ System Architecture

```text
[ Next.js Frontend UI ]
         │ (2.5s Telemetry Polling & Interactive Playground requests)
         ▼
[ FastAPI Proxy Server ] 💻 (Running Locally)
         │
         ├──► [ MongoDB Atlas Cloud Cluster ] ☁️ (Mumbai ap-south-1)
         │     ├── metrics_collection (Atomic $inc tracker)
         │     └── cache_collection (O(1) Prompt-Response Hash Cache)
         │
         └──► [ Google Gemini 2.5 Flash API ] 🧠 (Receives Sanitized Prompts Only)

🛠️ Tech Stack
Frontend: Next.js (App Router), Tailwind CSS, Lucide React Icons, Axios/Fetch.

Backend: Python 3.14+, FastAPI, Uvicorn, Pydantic, Native re Engine.

Database & Driver: MongoDB Atlas, PyMongo, Dnspython.

AI Integration: Google GenAI SDK (Gemini 2.5 Flash Model).

⚙️ Local Installation & Setup
1. Backend Configuration
Navigate to the backend directory, spin up your virtual environment, and install the required drivers:

Bash
cd backend
python -m venv venv
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1

pip install -r requirements.txt
Create a .env file inside the root of your /backend folder:

Code snippet
GEMINI_API_KEY=your_google_gemini_api_key_here
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/enpassant?retryWrites=true&w=majority
Boot up the FastAPI gateway engine:

Bash
uvicorn main:app --reload
2. Frontend Configuration
Navigate to the frontend directory, install the node modules, and spin up the development dashboard:

Bash
cd ../frontend
npm install
npm run dev
Open your browser and navigate to http://localhost:3000 to interact with the gateway payload inspector in real-time.

🏆 Portfolio Performance Metrics
Proxy Lookup Time (Cache Hit): ~2-5ms (O(1) Database/Memory check)

Proxy Lookup Time (Cache Miss): Variable based on Gemini API network speeds

PII Leakage Intercept Rate: 100% for target email, phone, and financial regex bounds