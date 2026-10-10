# SETU — Civic coordination for Bhopal

React, TypeScript, Vite, and React Router frontend with an Express, Node.js,
and MongoDB/Mongoose API. Existing API handlers and database models are
retained to preserve their contracts and behavior.

## Requirements

Node.js 20.19+ or 22.12+, npm, and a MongoDB database.

## Setup

```sh
npm install --legacy-peer-deps
npm install --prefix server --legacy-peer-deps
```

Copy `server/.env.example` to `server/.env`, then set `MONGODB_URI`,
`JWT_SECRET`, and any credentials for the integrations you use. Keep secrets
out of Git. The root `.env.example` shows the optional frontend API URL.

Start both services with `npm run dev`:

- Frontend: `http://localhost:5173`
- Express API and Socket.IO: `http://localhost:5000`

The Vite development proxy forwards `/api`, `/uploads`, and `/socket.io`.
For a separately hosted frontend, set `VITE_API_URL` to the backend URL ending
in `/api` and set the backend `CORS_ORIGIN` to the frontend origin.

## Checks

```sh
npm run typecheck
npm run lint
npm run build
npm run typecheck --prefix server
```

No root test script is currently configured. Existing backend test scripts are
standalone files; they may require external API credentials or a test database.

## Deployment

`vercel.json` configures the Vite SPA frontend and its route fallback. Deploy
the Express backend separately on a Node.js host. Configure `VITE_API_URL` at
frontend build time, and set `MONGODB_URI`, `JWT_SECRET`, and `CORS_ORIGIN` in
the backend environment. Never put backend secrets in `VITE_*` variables.

Existing API groups are mounted at `/api/auth`, `/api/issues`,
`/api/departments`, `/api/works`, `/api/complaints`, and `/api/assistant`.
