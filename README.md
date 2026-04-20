# Nyaya-Setu ⚖️

Nyaya-Setu is an AI-assisted legal workflow platform built to make complaint handling faster, clearer, and safer for everyone involved.

Instead of scattered forms and manual back-and-forth, it brings victims, officers, and admins into one connected system where statements can be analyzed, tracked, and converted into actionable legal workflows.

## ✨ What This Project Does

- 🧑‍💼 Helps officers draft, update, and submit FIR workflows
- 🙋 Supports victims with complaint intake and case tracking
- 🤖 Uses ML to classify statements (text or audio) into legal sections
- 📚 Gives BNS or IPC guidance and comparison utilities
- 🛡️ Uses confidence gating to avoid unsafe or forced legal mapping
- 🏢 Enables admin-side station and officer verification management

## 🧩 Architecture (Simple View)

Think of Nyaya-Setu as a 4-part system:

- 🎨 Frontend (React + Vite): role-based UI for victim, officer, and admin journeys
- 🛠️ Backend API (Node.js + TypeScript): auth, case logic, FIR operations, workflow orchestration
- 🧠 ML Service (Python + FastAPI): Whisper transcription + RAG-based legal classification
- 🗄️ Database (PostgreSQL + Prisma): persistent storage for users, statements, FIRs, and metadata

Flow:

Frontend ↔ Backend ↔ (Database + ML Service)

## 🚦 How It Works (In Brief)

1. 👤 User logs in with role-based access (victim, officer, or admin).
2. 📝 Victim submits complaint as text or voice.
3. 🔁 Backend forwards ML-required tasks to the ML service.
4. 🎙️ If audio is present, Whisper transcribes it to text.
5. 🔍 RAG pipeline maps complaint context to BNS or IPC candidates.
6. 📉 If confidence is low, system marks it for manual review (no forced output).
7. 💾 Backend stores records and workflow context in PostgreSQL using Prisma.
8. 👮 Officer reviews, edits, and progresses FIR actions.
9. 🧾 Output like summaries and PDFs can be generated for official workflow.
10. 📊 Admin monitors system-level activity and verification actions.

## 🗂️ Project Map

- 📁 frontend: React app and UI workflows
- 📁 backend: TypeScript API, routes, controllers, and business logic
- 📁 ml-service: FastAPI service for ASR + legal classification
- 📁 prisma: database schema and Prisma setup
- 📄 docker-compose.yml: full multi-service local stack

## 🌐 Service Endpoints (Default Ports)

- 🎨 Frontend: http://localhost:5173
- 🛠️ Backend API: http://localhost:5000
- 🧠 ML Service: http://localhost:8000
- 🗄️ PostgreSQL: localhost:5432

## 🔌 API Groups

Backend API groups:

- 🔐 Auth: /api/auth/\*
- 📚 Public legal tools: /api/bns/_ and /api/classify/_
- 🙋 Victim flows: /api/victim/\*
- 👮 Officer workflows: /api/officer/\*
- 🏢 Admin management: /api/admin/\*

ML service key endpoints:

- GET /health
- GET /v1/catalog
- GET /v1/bnss-catalog
- POST /v1/pipeline
- POST /v1/pipeline/json
- POST /v1/classify
- POST /v1/rag
- POST /v1/transcribe

## 🚀 Quick Start (Docker Recommended)

```bash
docker compose up --build
```

Then open:

- Frontend UI: http://localhost:5173
- Backend health: http://localhost:5000/api/health
- ML health: http://localhost:8000/health

## ☁️ Render Deployment

- Blueprint file: `render.yaml`
- Stepwise deployment guide: `DEPLOY_RENDER.md`
- Production env template: `.env.render.example`

## 🧪 Local Dev (Without Docker)

Install dependencies:

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ../ml-service && pip install -r requirements.txt
```

Run services:

```bash
cd backend && npm run dev
cd frontend && npm run dev
cd ml-service && uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## 🛡️ Important Notes

- Low-confidence legal mapping is intentionally routed for review.
- Replace default secrets and dev credentials before production deployment.
- Keep DB schema changes synced through Prisma workflows.
