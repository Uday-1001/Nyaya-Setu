# Render Deployment Guide (Nyaya-Setu)

This repository is now configured for Render via `render.yaml`.

## 1. Prerequisites

- Push this repository to GitHub.
- Create a Render account and connect your GitHub repository.

## 2. Deploy Using Blueprint

1. In Render, click **New +** -> **Blueprint**.
2. Select this repository.
3. Render detects `render.yaml` and proposes:
   - `nyaya-setu-db` (PostgreSQL)
   - `nyaya-setu-ml` (Python Web Service)
   - `nyaya-setu-backend` (Node Web Service)
   - `nyaya-setu-frontend` (Static Site)
4. Confirm deploy.

## 3. Required Post-Deploy Env Updates

After first deploy, replace the default placeholder frontend/backend URLs with the actual generated service URLs if they differ.

Update these values in Render dashboard:

- Backend `APP_URL` -> your frontend URL
- Frontend `VITE_API_URL` -> your backend URL + `/api`
- Frontend `VITE_ML_SERVICE_URL` -> your ML service URL

Then redeploy frontend/backend.

## 4. Health Checks

- Backend: `/api/health`
- ML: `/health`

## 5. Notes

- Backend build runs Prisma generate + migrations automatically.
- CORS supports wildcard origins like `https://*.onrender.com`.
- SPA routing is handled with a rewrite to `/index.html`.
- Keep `.env` local only; production values should be managed in Render.

## 6. Troubleshooting

- If backend fails with DB errors, confirm `DATABASE_URL` points to Render internal database connection string.
- If frontend API calls fail, confirm `VITE_API_URL` includes `/api`.
- If transcription fails from browser, verify `VITE_ML_SERVICE_URL` and ML `/health` endpoint.
