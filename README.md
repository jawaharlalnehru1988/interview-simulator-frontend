This is a Next.js frontend for the Interview Simulator backend in [interview-simulator](../interview-simulator).

## Getting Started

First, create your frontend environment file:

```bash
cp .env.local.example .env.local
```

Set the Django API base URL if needed:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Then run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to use the routed frontend.

The page integrates these backend APIs:

- `GET /health/`
- `POST /api/interview/auth/register/`
- `POST /api/auth/token/`
- `POST /api/auth/token/refresh/`
- `POST /api/interview/start/`
- `GET /api/interview/<id>/next/`
- `POST /api/interview/answer/`
- `GET /api/interview/<id>/summary/`

## Backend Setup Notes

- Make sure the Django backend is running.
- Make sure CORS is enabled for `http://localhost:3000`.
- The frontend stores JWT tokens in local storage for local development.

## Routes

- `/` gives a lightweight product entry page.
- `/auth` handles registration, login, manual token refresh, and backend URL configuration.
- `/interview` handles protected interview APIs and automatically refreshes access tokens after a `401` response.

## Available UI Actions

- Check backend health
- Register a user
- Log in and store JWT tokens locally
- Refresh the access token manually when needed
- Auto-refresh the access token during protected API calls
- Start an interview session
- Fetch the next question
- Submit an answer
- Load interview summary output

## LLM Integration Status

- The frontend is already prepared to render real model-backed evaluation output from the backend.
- To complete real LLM evaluation, provide the purchased model API details for the Django backend configuration.
